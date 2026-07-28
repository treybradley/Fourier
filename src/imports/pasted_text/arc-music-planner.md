Build a browser-native music planning application called "Arc" for the Fourier music platform.

Arc helps DJs, producers, and mashup artists design the musical journey of a set before they perform or produce it.

Arc is not a DJ application, music player, or DAW. It is a creative planning workspace where users organize tracks, understand how songs relate to one another, and visualize the overall story of a project.

Projects can be either:

- DJ Set
- Mashup

Both project types share the same interface and data model. A mashup is simply a smaller project focused on the relationship between a few songs.

The application should feel like a creative workspace rather than traditional DJ software.

The goal is to help users answer questions like:

- Which songs work well together?
- Where should the energy peak?
- How does this set evolve?
- Does this mashup idea make sense?
- Which transitions deserve more attention?

------------------------------------
CORE WORKSPACES
------------------------------------

Arc contains two primary workspaces.

PLAN

This is the primary workspace where users organize their projects.

Tracks are displayed as vertically stacked cards.

Cards should be draggable to reorder the project.

Each track card displays:

- title
- artist
- duration
- BPM
- musical key
- Camelot key

Clicking a card expands it.

Expanded cards contain:

- personal notes
- cue reminders
- optional comments

Between every pair of tracks is a Bridge.

Bridge represents the creative connection between two adjacent songs.

Each Bridge automatically displays:

- compatibility score
- BPM compatibility
- harmonic compatibility
- energy compatibility

Bridge also contains editable fields for:

- transition notes
- loop ideas
- FX ideas
- cue reminders
- mashup ideas

Automatic analysis should support creative decision making rather than replace it.

------------------------------------

STORY

Story is a zoomed-out visualization of the entire project.

Instead of focusing on individual songs, Story visualizes how the music evolves across the complete project.

Story should feel exploratory and expressive rather than analytical.

Users should immediately understand the overall pacing and emotional flow of the music.

Story visualizes attributes such as:

- energy
- tempo
- harmonic progression
- brightness
- spectral balance
- vocal density

These layers should be toggleable.

Users can enable or disable layers to explore different aspects of the project.

Clicking any point in Story navigates directly to the associated track within Plan.

Story should automatically update whenever tracks are:

- added
- removed
- reordered

Story should help users identify:

- peaks
- valleys
- pacing
- abrupt changes
- harmonic shifts
- opportunities where transitions may deserve additional attention

Story should not feel like a traditional graph or analytics dashboard.

It should feel like a visual representation of the musical narrative.

------------------------------------
IMPORTING MUSIC
------------------------------------

Users should import local audio files.

Supported methods:

- drag and drop
- file picker

Upon import Arc automatically analyzes each track and extracts:

- title (when available)
- artist (when available)
- duration
- BPM
- musical key
- Camelot key
- energy
- spectral balance
- brightness
- vocal density estimate

This analysis powers Story and Bridge throughout the application.

Future versions will support importing directly from the Fourier Audio Library.

------------------------------------
PROJECT TYPES
------------------------------------

DJ Set

Optimized for planning an entire performance.

Focuses on ordering tracks, pacing, transitions and overall musical journey.

Mashup

Optimized for planning relationships between a small number of tracks.

Uses the same workflow while emphasizing compatibility and creative notes between songs.

------------------------------------
PROJECT DATA
------------------------------------

Each Arc project stores:

- project title
- project type
- ordered track list
- imported audio references
- extracted analysis metadata
- personal notes
- bridge notes

Projects should be represented as lightweight JSON so they can later sync with Fourier Accounts.

------------------------------------
FOURIER INTEGRATION
------------------------------------

Arc is one application within the larger Fourier platform.

Future integrations include:

- Open tracks from Audio Library
- Open stems from Stem Separator
- Open loops from Grid
- Send ideas into Loop Station

Arc serves as the planning layer connecting the rest of the Fourier ecosystem.

------------------------------------
PRODUCT PHILOSOPHY
------------------------------------

Arc is not trying to replace rekordbox, Serato or Mixed In Key.

Those applications optimize for preparing and performing music.

Arc optimizes for designing musical experiences.

Analysis exists to support creativity.

Bridge helps users think about the relationship between songs.

Story helps users understand the emotional arc of an entire project.

The application should encourage experimentation, planning and exploration while remaining lightweight, immediate and enjoyable to use.

A user should be able to import tracks, arrange a project, understand its overall musical journey, and begin planning transitions within minutes.