# YAML export format

A story can be exported to a single human-editable YAML file (via the download button next to the story picker) and later imported back in (via "Import from file…" in the story picker). This document describes the shape of that file.

Importing always creates a **brand-new** story — it never edits or overwrites an existing one, even if you re-import the same file. The imported story's name gets " v2" appended, so you can tell it apart from wherever it came from.

This same file also drives the read-only viewer at `/view?d=<url>` (see the [README](../README.md#routes)) — a hosted export is the whole map, ready to render, with no server or database on the other end.

## Why not just dump the database?

The underlying SQLite tables reference each other by numeric id (a chapter range is stored as `chapter_range_start_chapter_id: 47`), which means nothing to someone hand-editing a file. The export format instead:

- Nests chapters under their book and episodes under their season, in the order they should appear.
- Never mentions a database id. A chapter/episode range is written as a `[start, end]` pair of **flat, 0-based positions** into the file's own `books[].chapters` (or `television[].episodes`) list — see [Chapter/episode ranges](#chapterepisode-ranges) below.
- Omits fields that are unset/blank, so a simple position or marker doesn't carry a wall of `null`s.

## Top-level shape

```yaml
name: A Song of Ice and Fire
tileUrlTemplate: https://tile.example.com/{z}/{x}/{y}.png
tileLayerAuthor: Some Cartographer
tileLayerAttributionUrl: https://example.com
initialCenter: { lat: 39.8283, lng: -98.5795 }
initialZoom: 4
minZoom: 0
maxZoom: 19

books: [...] # see Books & chapters
television: [...] # see Television
characters: [...] # see Characters & positions
markerSets: [...] # see Marker sets & markers
```

`name`, `initialCenter`, `initialZoom`, `minZoom`, and `maxZoom` are required. Everything else — including all four top-level lists — is optional and may be omitted entirely (an omitted list is treated as empty).

## Books & chapters

```yaml
books:
  - name: A Game of Thrones
    author: George R. R. Martin
    url: https://example.com/agot
    chapters:
      - name: Prologue
      - name: Bran
        url: https://example.com/agot/bran
```

`author` and `url` are optional on a book; `url` is optional on a chapter. `books` may be omitted or empty for a story with no books.

## Television

```yaml
television:
  - url: https://example.com/season1
    episodes:
      - name: Winter Is Coming
        url: https://example.com/s1e1
      - name: The Kingsroad
```

A season has no name of its own (only chapters/books do) — just an optional `url` and its list of episodes. `url` is optional on an episode too.

## Chapter/episode ranges

Anywhere a position or marker can be scoped to a range of the story (`chapters` / `episodes`), it's written as a two-element array `[start, end]`:

- Each side is a **0-based index** into this same document's flattened chapter or episode list — book 1's chapters first, in order, then book 2's, and so on (same idea for `television[].episodes`). The first chapter in the file is index `0`, the second is `1`, etc. — completely independent of which book it's nested under.
- Either side may be `null` for an open boundary: `[3, null]` means "from chapter 3 onward," `[null, 5]` means "up through chapter 5."
- The whole `chapters`/`episodes` key is omitted entirely when there's no restriction for that medium (i.e. always visible with respect to it).

```yaml
books:
  - name: A Game of Thrones
    chapters:
      - name: Prologue # index 0
      - name: Bran # index 1
  - name: A Clash of Kings
    chapters:
      - name: Prologue # index 2

characters:
  - name: Jon Snow
    positions:
      - lat: 39.8
        lng: -98.5
        chapters: [1, 2] # visible from AGOT: Bran through ACOK: Prologue
```

## Characters & positions

```yaml
characters:
  - name: Jon Snow
    group: Night's Watch
    icon: https://example.com/jon.png
    color: '#1976d2'
    positions:
      - lat: 39.8283
        lng: -98.5795
        dead: false
        note: At the Wall
        tail: [{ lat: 39.5, lng: -98.9 }]
        chapters: [1, null]
        episodes: [0, 0]
```

`group`, `icon`, and `color` are optional on a character. On a position, `lat`/`lng` are required; `dead` (defaults to `false`), `note`, `tail` (a path of `{lat, lng}` points leading away from the position), `chapters`, and `episodes` are all optional and omitted when unset/default.

## Marker sets & markers

```yaml
markerSets:
  - name: Cities
    markers:
      - label: Winterfell
        icon: https://example.com/castle.png
        color: '#00ff00'
        lat: 54.368
        lng: -5.918
        polygon: [{ lat: 54.4, lng: -5.9 }, { lat: 54.3, lng: -5.95 }]
        chapters: [0, null]
```

A marker's `label`, `lat`, and `lng` are required; `icon`, `color`, `polygon` (an outline in addition to the position pin), `chapters`, and `episodes` are optional.

## Validation on import

The importer checks the document's structure (required fields, correct types) before writing anything, and reports the exact path of the first problem it finds, e.g. `characters[2].positions[0].chapters must be a two-element [start, end] list.` A `chapters`/`episodes` index that's out of range for the file's own chapter/episode list is also rejected, e.g. `characters[0].positions[0].chapters[1] references index 5, but the story only has 3 entries.`

If anything fails partway through import, the partially created story is deleted — an import either fully succeeds or leaves nothing behind.
