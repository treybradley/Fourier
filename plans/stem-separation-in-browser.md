Overview
This pipeline runs 4-stem music source separation (Vocals / Drums / Bass / Other) entirely in the browser using:

Open-Unmix UMXL models — state-of-the-art LSTM-based separation, pre-exported to ONNX
onnxruntime-web — runs ONNX models in the browser via WASM
Web Audio API — resampling (OfflineAudioContext) and playback (AudioBuffer)
Hand-rolled STFT/ISTFT — no dependency on a DSP library
Total model weight: ~430 MB across 4 files (~108 MB each). Downloaded once and persisted in the Cache API.

Dependencies
npm install onnxruntime-web@1.27.0
No other DSP library is needed. The WASM runtime files are loaded from CDN at runtime.

Model source
https://huggingface.co/chinedudave06/demucs-onnx
Four files, one per stem:

umxl_vocals.onnx
umxl_drums.onnx
umxl_bass.onnx
umxl_other.onnx
Access pattern: https://huggingface.co/chinedudave06/demucs-onnx/resolve/main/<filename>

Critical model facts (hard-won)
These took iteration to discover. Violating any of them produces an ONNX Runtime error.

1. Input tensor shape: [1, 2, 2049, 100]
   [batch=1, channels=2, bins=2049, frames=100]
   Rank 4 — the input node is named spectrogram. Sending a 2D or 3D tensor gives: Invalid rank for input: spectrogram Got: N Expected: 4
   Stereo — both L and R channels go in together. You cannot pass a mono signal.
   bins = 2049 — this is n_fft / 2 + 1 for n_fft = 4096. Do not truncate.
   frames = 100 exactly — the model was ONNX-traced with a fixed sequence length of 100. The internal LSTM reshape is [T, 1, 1024] → {100, 1, 1024}. Sending any other T fails with: input_shape_size == requested_shape_size was false. Input shape:{T,1024}, requested shape:{100,1,1024}
2. Output tensor shape: [1, 2, 2049, 100]
   Same layout as the input. The model outputs the separated magnitude spectrogram for that stem (not a mask). You reconstruct audio by combining this magnitude with the original phase from the input STFT.

3. Memory layout (C-order / row-major)
   index = channel _ NB_BINS _ CHUNK_T + bin \* CHUNK_T + frame
   This is standard row-major order with the fastest-changing axis being frame.

4. Process one model at a time — load, run, release
   Each model is ~108 MB when loaded into WASM memory. Loading all 4 simultaneously will OOM most browsers. Load → infer → session.release() → next model.

STFT/ISTFT parameters
n_fft = 4096
n_hop = 1024
n_bins = n_fft / 2 + 1 = 2049
window = Hann
sample_rate = 44100
Why these specific values
The model was trained with these exact parameters. n_fft=4096 at sr=44100 gives ~23ms frequency resolution per frame, good for separating instruments with overlapping harmonics. n_hop=1024 gives 75% overlap.

Audio requirements
Input must be at 44100 Hz. Use OfflineAudioContext to resample if needed — it's the simplest correct approach and handles any sample rate the browser can decode.

The pipeline, step by step
Step 1: Resample to 44100 Hz
async function resampleBuffer(buf: AudioBuffer, targetSr: number): Promise<AudioBuffer> {
if (buf.sampleRate === targetSr) return buf;
const offline = new OfflineAudioContext(
buf.numberOfChannels,
Math.ceil(buf.duration \* targetSr),
targetSr,
);
const src = offline.createBufferSource();
src.buffer = buf;
src.connect(offline.destination);
src.start(0);
return offline.startRendering();
}
Step 2: STFT both channels
Run STFT on the left and right channels independently. You need:

Magnitude arrays → model input
Phase arrays → saved for ISTFT reconstruction later
STFT output layout: flat Float32Array of size numFrames × NB_BINS, indexed as [frame * NB_BINS + bin].

Hann window formula:

w[i] = 0.5 _ (1 - cos(2π _ i / (n - 1)))
Use a standard radix-2 Cooley-Tukey in-place FFT. Only the positive-frequency half (bins 0..NB_BINS-1) is stored since the signal is real-valued.

Step 3: Chunk the spectrogram
Split the full spectrogram into segments of exactly CHUNK_T=100 frames. The last chunk is zero-padded.

Pack each chunk into the 4D tensor layout [1, 2, NB_BINS, CHUNK_T]:

function buildChunk(leftMag, rightMag, numFrames, frameStart) {
const data = new Float32Array(2 _ NB_BINS _ CHUNK*T);
for (let c = 0; c < 2; c++) {
const src = c === 0 ? leftMag : rightMag;
const cBase = c * NB*BINS * CHUNK*T;
for (let b = 0; b < NB_BINS; b++) {
const bBase = cBase + b * CHUNK*T;
for (let t = 0; t < CHUNK_T; t++) {
const f = frameStart + t;
data[bBase + t] = f < numFrames ? src[f * NB_BINS + b] : 0;
}
}
}
return data;
}
Step 4: Model setup
import \* as ort from 'onnxruntime-web';

// Point the WASM runtime at the CDN — must happen before any session creation
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/';
Download with streaming so you can show a progress bar:

async function fetchModel(url, cacheKey, onPct) {
const cache = await caches.open('umxl-models-v1');
const hit = await cache.match(cacheKey);
if (hit) { onPct(1); return hit.arrayBuffer(); }

const response = await fetch(url);
const total = Number(response.headers.get('content-length') ?? 0);
const reader = response.body.getReader();
const parts = [];
let loaded = 0;

while (true) {
const { done, value } = await reader.read();
if (done) break;
parts.push(value);
loaded += value.length;
onPct(total ? loaded / total : 0);
}

const combined = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
let off = 0;
for (const p of parts) { combined.set(p, off); off += p.length; }

await cache.put(cacheKey, new Response(combined.slice()));
return combined.buffer;
}
Create a session from the raw ArrayBuffer:

const session = await ort.InferenceSession.create(modelBytes, {
executionProviders: ['wasm'],
});
// session.inputNames[0] → 'spectrogram'
// session.outputNames[0] → the separated magnitude output
Step 5: Run inference per chunk
const tensor = new ort.Tensor('float32', chunkData, [1, 2, NB_BINS, CHUNK_T]);
const feeds = { [session.inputNames[0]]: tensor };
const result = await session.run(feeds);
const outData = result[session.outputNames[0]].data; // Float32Array
Yield to the event loop every ~10 chunks to keep the UI responsive:

if (ci % 10 === 0) await new Promise(r => setTimeout(r, 0));
Step 6: Unpack output chunks
The output has the same [1, 2, NB_BINS, CHUNK_T] layout. Unpack into per-channel running magnitude arrays:

for (let c = 0; c < 2; c++) {
const out = c === 0 ? outLeft : outRight;
const cBase = c _ NB_BINS _ CHUNK*T;
const validT = Math.min(CHUNK_T, numFrames - frameStart);
for (let t = 0; t < validT; t++) {
const dstBase = (frameStart + t) * NB*BINS;
for (let b = 0; b < NB_BINS; b++) {
out[dstBase + b] = outData[cBase + b * CHUNK_T + t];
}
}
}
Step 7: ISTFT reconstruction
Combine the separated magnitude (from the model) with the original phase (from your Step 2 STFT). This is the phase vocoder trick — the model learns which frequencies belong to each stem, and you borrow the phase to reconstruct a proper waveform.

// For each frame f:
for (let b = 0; b < NB*BINS; b++) {
const mag = outMag[f * NB_BINS + b];
const phi = originalPhase[f * NB_BINS + b];
re[b] = mag * Math.cos(phi);
im[b] = mag \_ Math.sin(phi);
}
// Mirror conjugate for bins NB_BINS..N_FFT-1 (required for real IFFT output)
for (let b = 1; b < N_FFT >> 1; b++) {
re[N_FFT - b] = re[b];
im[N_FFT - b] = -im[b];
}
// IFFT → overlap-add with Hann window
Overlap-add normalization: accumulate window[i]^2 into a separate norm array and divide at the end. This perfectly inverts the analysis window for any overlap ratio.

Step 8: Release the session
try { await session.release(); } catch {}
Do this before loading the next model to free WASM memory.

Complete call signature
const results = await separateStems(audioBuffer, (progress) => {
// progress.stemIdx → 0–3
// progress.stemName → 'Vocals' | 'Drums' | 'Bass' | 'Other'
// progress.stage → 'downloading' | 'loading' | 'inferring' | 'done'
// progress.downloadPct → 0.0–1.0
updateUI(progress);
});

// results: Array<{ name: string, color: string, buffer: AudioBuffer }>
// buffer: stereo AudioBuffer at 44100 Hz, same duration as input
Performance characteristics
Audio length STFT frames Chunks per model Approx. wall time (WASM)
1 min ~2,579 26 ~2–4 min
3 min ~7,738 78 ~6–12 min
5 min ~12,890 129 ~10–20 min
WASM is single-threaded. The LSTM processes one chunk at a time. Expect roughly 2–4× real-time on a modern desktop. The Cache API means models are only downloaded once (across page refreshes).

Common errors and what they mean
Error Cause Fix
Invalid rank for input: spectrogram Got: N Expected: 4 Tensor has wrong number of dimensions Always use shape [1, 2, NB_BINS, CHUNK_T]
input_shape_size == requested_shape_size was false … requested shape:{100,1,1024} Sent wrong number of frames Chunk to exactly CHUNK_T=100 frames; zero-pad the last chunk
HTTP 401 on model URL Wrong URL or HuggingFace auth Use the /resolve/main/ URL pattern, not /blob/main/
Silent no output after processing Height animation measuring bug (React specific) Don't animate height: 0 → auto in a parent that's also animating; use opacity-only on the outer wrapper
OOM / tab crash All 4 models loaded simultaneously Sequential: load → infer → session.release() → repeat

Adapter checklist for a new project
npm install onnxruntime-web@1.27.0
Set ort.env.wasm.wasmPaths before first session creation
STFT parameters match exactly: n_fft=4096, n_hop=1024, sr=44100
Resample input audio to 44100 Hz before STFT
Chunk tensor shape is [1, 2, 2049, 100] — not [1, 2, 2049, T]
Last chunk is zero-padded, not skipped
Output unpacking mirrors the input packing loop (same c _ NB_BINS _ CHUNK_T + b \* CHUNK_T + t index)
ISTFT uses original phase from input STFT (not the output)
session.release() after each of the 4 models
Cache key versioned (e.g. umxl-vocals-v1) so stale cached models can be busted