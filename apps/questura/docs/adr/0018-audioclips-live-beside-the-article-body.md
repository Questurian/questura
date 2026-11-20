# AudioClips live beside the article body, behind expiring links

*2026-11-19. Owner-approved in a grilling session (Q1–Q31). First use: the
Lima guide (article 54), Intro section, three sentences.*

## Context

Members can listen to an Article section read aloud, with the sentence being
read highlighted. The audio is made with ElevenLabs in the studio (AI Blog
Writer), whose key never reaches the site. Three facts about the site shaped
where it lives:

- The studio's sync replaces `contentBlocks` wholesale and Payload gives every
  block a new id each time, so anything stored inside the body, or keyed to a
  block id, is wiped by the next sync.
- `media-assets` sit on one public Bunny pull zone. An MP3 there is a link any
  member could share.
- The sync PATCH sends a fixed list of top-level fields; anything else on the
  article survives it.

## Decision

- **AudioClip is its own collection**, not a block or an article field: each
  row points at an Article and names its **Article section** by the section's
  heading slug (`intro` for the text before the first main heading). It holds
  the script that was read, per-sentence timings, the Narrator's voice id and
  model, and the private storage key of the MP3. Section order comes from the
  article body at render time, which is what lets the clips play as one
  playlist later.
- **The site never calls ElevenLabs.** The studio makes the MP3 and writes the
  AudioClip straight to the live API, separately from the article sync, so a
  sync cannot remove or change it.
- **Files live in a private Bunny storage zone** behind a token-authenticated
  pull zone. The API hands an active member a link that expires within
  minutes; nobody else gets a link. Everyone sees the player; only members get
  sound.
- **A heading that no longer exists hides its clip** on the site; the studio
  shows it as "Not attached". Text edited after recording keeps playing; the
  sentences that no longer match just stop highlighting.
- **Listens are stored per member** (who, when, seconds heard, the stretches
  heard, speed), owner's choice: the listening data is the point. Staff
  Listens are stored and marked, and left out of the numbers. The privacy page
  says so, and `erase-visitor-account` deletes a member's Listens.

## Considered options

- *An `audio` array on the article*: survives the sync, but it ties clips to
  articles only and puts large timing data on every article read. Rejected so
  listicles and itineraries can use the same collection later.
- *Streaming the MP3 through the API after a membership check*: no new Bunny
  resource, but every second of audio passes through Railway. Rejected for
  expiring links on Bunny.

## Amendment, 2026-11-19: one recording per standard article

After the first live test the owner asked for one recording, not one per
section. A standard article now has a single AudioClip with section key
`article`: the Narrator reads the title, "By" and every author, the dek
(`seoSection.metaDescription`), then the whole body (same p/h2/h3/li reading).
The player sits directly above the article's text in every layout: a blue
outlined play button, "Listen" and the length ("69 minutes"). Pressed, it opens
into one row: play/pause, time heard, a thin progress line with a dot, the
length, back and forward 15 seconds, and speed. The sentence highlight, the
narrated-paragraph rule and Follow along are switched off for now
(`TEXT_FOLLOW_ENABLED` in the client controller); the code stays.
The per-section players and the
Intro slot are gone from standard articles. Section keys stay in the collection
for listicles and itinerary stops later. Older per-section clips stay in the
studio as "Not attached" and are not drawn.

Follow-up, 2026-11-20: the card badge became a larger black box with glowing
blue headphones and "Audio", the same on every kind of card. A second, quiet
Listen box in the dark-hero header was tried the same day and removed: two
Listen buttons looked odd. The line above the text is the only one.
