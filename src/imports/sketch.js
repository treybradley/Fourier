let videoCanvas, uiCanvas;
let video;
let handPose;
let hands = [];
let selectedStem = 0;
let stems = [];
let volumeSliders = [];
let ffts = [];
let trackNames = ["stem1.mp3", "stem2.mp3", "stem3.mp3", "stem4.mp3"];
let lastPinchTime = 0;
let lastHandState = "open";
let currentPitch = 1.0; // Default pitch (100%)

function preload() {
    for (let i = 0; i < trackNames.length; i++) {
        stems[i] = loadSound(trackNames[i]);
    }
}

function setup() {
    createGui(); 

    videoCanvas = createGraphics(500, 300);
    uiCanvas = createGraphics(500, 500);
    createCanvas(500, 800);

    for (let i = 0; i < stems.length; i++) {
        ffts[i] = new p5.FFT();
        ffts[i].setInput(stems[i]);

        volumeSliders[i] = createSlider("Volume " + (i + 1), 50, 400 + i * 100, 100, 10);
        volumeSliders[i].min = 0;
        volumeSliders[i].max = 2;
        volumeSliders[i].val = 0.5;
    }

    video = createCapture(VIDEO);
    video.size(500, 300);
    video.hide();

    handPose = ml5.handPose(video, modelReady);
    handPose.detectStart(video, gotHands);
}

function draw() {
    background(30);
    
    drawVideoCanvas();
    drawUICanvas();

    drawGui();
}

function drawVideoCanvas() {
    videoCanvas.clear();

    // **1️⃣ Draw Mirrored Video**
    videoCanvas.push();
    videoCanvas.translate(videoCanvas.width, 0);
    videoCanvas.scale(-1, 1);
    videoCanvas.image(video, 0, 0, 500, 400);
    videoCanvas.pop();

    // **2️⃣ Get Audio Level & Apply More Intense Mapping**
    let audioLevel = ffts[selectedStem].getEnergy(20, 20000); // Get energy from full spectrum
    let dynamicNoiseLevel = map(audioLevel, 0, 255, 0.1, 200); // 🔥 Increase max noise

    // **3️⃣ Exponential Mapping for More Dramatic Effect**
    //dynamicNoiseLevel = pow(dynamicNoiseLevel, 1.5); // Boost effect

    // **4️⃣ Add "Pulsing" Flicker Effect**
    dynamicNoiseLevel *= random(dynamicNoiseLevel*0.8, dynamicNoiseLevel*30); // Adds slight variation for chaotic feel

    // **5️⃣ Apply Noise Effect**
    applyNoise(videoCanvas, dynamicNoiseLevel);

    // **6️⃣ Draw Hand UI AFTER the video**
    drawHandTracking(videoCanvas);
    drawHandTrackingFeedback(videoCanvas);

    // **7️⃣ Render the video canvas**
    image(videoCanvas, 0, 0);
}

function applyNoise(pg, intensity) {
    pg.loadPixels();
    for (let i = 0; i < pg.pixels.length; i += 4) {
        let noiseValue = random(-intensity * 255, intensity * 255);
        pg.pixels[i] += noiseValue;     // Red
        pg.pixels[i + 1] += noiseValue; // Green
        pg.pixels[i + 2] += noiseValue; // Blue
    }
    pg.updatePixels();
}

// **Draw UI for Stems**
function drawUICanvas() {
    uiCanvas.clear();
    uiCanvas.fill(0);
    uiCanvas.rect(0, 0, uiCanvas.width, uiCanvas.height);

    for (let i = 0; i < stems.length; i++) {
        stems[i].setVolume(volumeSliders[i].val);
        drawWaveform(uiCanvas, stems[i], ffts[i], 50, 100 + i * 100, i === selectedStem);
    }

    image(uiCanvas, 0, 300);
}

// **Hand Pose Detection**
function gotHands(results) {
    hands = results;
}

// **Draw Hand UI Overlay**
function drawHandTracking(pg) {
    if (hands.length > 0) {
        let rightHand = null;
        let leftHand = null;

        for (let hand of hands) {
            if (hand.index_finger_tip.x > hand.wrist.x) {
                rightHand = hand;
            } else {
                leftHand = hand;
            }
        }

        let now = millis();

        // **1️⃣ Select Stem (Right Hand Pinch)**
        if (rightHand) {
            let indexFinger = rightHand.index_finger_tip;
            let thumb = rightHand.thumb_tip;

            let pinchDistance = dist(indexFinger.x, indexFinger.y, thumb.x, thumb.y);
            if (pinchDistance < 40 && now - lastPinchTime > 800) {
                selectedStem = (selectedStem + 1) % stems.length;
                lastPinchTime = now;
            }

            // **Fix Hand UI Alignment**
            let mappedIndexX2 = pg.width - map(indexFinger.x, 0, pg.width + 145, 0, pg.width);
            let mappedThumbX2 = pg.width - map(thumb.x, 0, pg.width + 150, 0, pg.width);
            let mappedIndexY2 = map(indexFinger.y, 0, video.height + 55, 0, pg.height);
            let mappedThumbY2 = map(thumb.y, 0, video.height + 60, 0, pg.height);

            // **Draw UI Overlays**
            pg.fill(255, 255, 0);
            pg.noStroke();
            pg.square(mappedIndexX2, mappedIndexY2, 15);
            pg.square(mappedThumbX2, mappedThumbY2, 15);
        }

        // **2️⃣ Adjust Volume & Pitch (Left Hand Pinch)**
        if (leftHand) {
            let indexFinger = leftHand.index_finger_tip;
            let thumb = leftHand.thumb_tip;

            let pinchDistance = dist(indexFinger.x, indexFinger.y, thumb.x, thumb.y);
            let volume = map(pinchDistance, 0, 100, 0, 1);
            volumeSliders[selectedStem].val = constrain(volume, 0, 2);

            // **Only Adjust Pitch When Pinching (Threshold: 40px)**
            if (pinchDistance < 40) {  
                let minPitch = 0.5; // 50% speed (lower pitch)
                let maxPitch = 2.0; // 200% speed (higher pitch)
                let pitch = map(indexFinger.y, 0, video.height, maxPitch, minPitch); // Invert Y axis mapping
                pitch = constrain(pitch, minPitch, maxPitch);

                stems[selectedStem].rate(pitch); // Apply pitch change
                currentPitch = pitch; // Store for UI feedback
            }

            // **Fix Hand UI Alignment**
            let mappedIndexX = pg.width - map(indexFinger.x, 0, pg.width + 145, 0, pg.width);
            let mappedThumbX = pg.width - map(thumb.x, 0, pg.width + 150, 0, pg.width);
            let mappedIndexY = map(indexFinger.y, 0, video.height + 55, 0, pg.height);
            let mappedThumbY = map(thumb.y, 0, video.height + 60, 0, pg.height);

            // **Draw UI Overlays**
            pg.fill(255, 0, 0);
            pg.noStroke();
            pg.circle(mappedIndexX, mappedIndexY, 10);
            pg.circle(mappedThumbX, mappedThumbY, 10);

            pg.stroke(255, 0, 0);
            pg.strokeWeight(2);
            pg.line(mappedIndexX, mappedIndexY, mappedThumbX, mappedThumbY);
        }

        // **3️⃣ Play/Pause (Left Hand Open/Close)**
        if (leftHand) {
            let fingertips = [
                leftHand.index_finger_tip,
                leftHand.middle_finger_tip,
                leftHand.ring_finger_tip,
                leftHand.pinky_finger_tip
            ];

            let fingersExtended = 0;
            for (let fingertip of fingertips) {
                if (fingertip.y < leftHand.index_finger_mcp.y) {
                    fingersExtended++;
                }
            }

            let handOpen = fingersExtended >= 3;

            if (handOpen && lastHandState !== "open") {
                stems[selectedStem].stop();
                lastHandState = "open";
            } else if (!handOpen && lastHandState !== "closed") {
                stems[selectedStem].loop();
                lastHandState = "closed";
            }
        }
    }
}

// **Draw Hand Gesture Feedback**
function drawHandTrackingFeedback(pg) {
    pg.fill(255, 255, 0);
    pg.textSize(12);
    pg.textAlign(LEFT, TOP);

    pg.noStroke();
    pg.text(`🎵 Selected Stem: ${selectedStem + 1}`, 20, 20);
    pg.text("🤏 R-Hand: Pinch = Select Stem", 20, 41);
    pg.text("✋ L-Hand: Open/Close = Stop/Play", 20, 62);
    pg.text("🎚️ L-Hand: Pinch = Volume", 20, 83);

    // **Only Show Pitch Adjustment When Pinching**
    if (hands.length > 0) {
        let leftHand = hands.find(h => h.index_finger_tip.x < h.wrist.x);
        if (leftHand) {
            let indexFinger = leftHand.index_finger_tip;
            let thumb = leftHand.thumb_tip;
            let pinchDistance = dist(indexFinger.x, indexFinger.y, thumb.x, thumb.y);

            if (pinchDistance < 40) {
                let pitchPercent = Math.round(currentPitch * 100); // Convert to percentage
                pg.text(`🎵 Pitch: ${pitchPercent}%`, 20, 104);
            }
        }
    }
}

function drawWaveform(pg, track, fft, size, center, isSelected) {
    if (!track.isLoaded()) return;

    let waveform = fft.waveform();
    pg.noFill();

    // **⬇️ Selected = Red, Non-Selected = Blue**
    pg.stroke(isSelected ? 255 : 0, 0, isSelected ? 0 : 255); 
    pg.strokeWeight(1);

    pg.beginShape();
    for (let i = 0; i < waveform.length; i++) {
        let x = map(i, 180, waveform.length, 100, pg.width);
        let y = center + waveform[i] * size;
        pg.vertex(x, y);
    }
    pg.endShape();

    if (isSelected) {
        pg.stroke(255, 255, 0);
        pg.strokeWeight(2);
        pg.rect(1, center - size, width - 2, size * 2);
    }
}


// **Hand Pose Model Ready**
function modelReady() {
    console.log("Handpose model ready!");
}