# Content System

## Overview

Content is organized around **days** (what users see) and **activity types** (what devs build).

Days are lightweight playlists that reference content by ID. Actual content lives in separate files by type so day files never get bloated.

## Structure

```
src/content/
  days/
    day-001.json          Playlist: ordered list of activity references
    day-002.json
  flashcards/
    fc001.json            Content: actual flashcard questions
    fc002.json
  index.js                Barrel: loads everything, exports lookup helpers
```

## Day files

A day is a playlist of nodes. Each node has a `type`, `id`, and `label`:

```json
{
  "day": 1,
  "title": "First Steps",
  "nodes": [
    { "type": "flashcard", "id": "fc001", "label": "Quick Math" },
    { "type": "placeholder", "id": "ph001", "label": "Coming Soon" }
  ]
}
```

- `type` determines which renderer component handles it
- `id` is used to look up the content payload from the type's folder
- `label` is displayed on the track and activity page

## Content files

Each activity type has its own folder. Files hold the actual payload:

```json
{
  "id": "fc001",
  "questions": [
    { "q": "12 x 15", "a": "180" }
  ]
}
```

The shape of each content file depends on the activity type.

## Adding a new activity type

1. Create a folder: `src/content/<type>/`
2. Add content JSON files in that folder
3. Build a renderer: `src/renderers/<Type>Renderer.jsx`
4. Register it in `src/renderers/ActivityDispatcher.jsx` (one case in the switch)
5. Import content files in `src/content/index.js` and add them to the `content` map
6. Reference the new type in day files

## Adding a new day

1. Create `src/content/days/day-NNN.json`
2. Import it in `src/content/index.js` and add to the `days` array

## How it renders

1. Home page reads day data via `getDay()` to get node labels for the track
2. Clicking an unlocked node navigates to `/activity/:dayId/:nodeIndex`
3. Activity page calls `getDay()` + `getContent()` to resolve the node and its payload
4. `ActivityDispatcher` picks the right renderer based on `type`

## Content helpers (src/content/index.js)

- `getDay(dayNumber)` — returns a day object by number
- `getDayCount()` — total number of days
- `getContent(type, id)` — returns content payload for a given type and ID
- `getDayNodes(dayNumber)` — shorthand for getting just the nodes array
