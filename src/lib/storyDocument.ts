import type { LatLng } from '../db';

/**
 * A chapter/episode range, serialized as a flat 0-based [start, end] index
 * into the document's own `books[].chapters` (or `television[].episodes`)
 * arrays, in the order they're written — rather than referencing a
 * database id, which would mean nothing to someone hand-editing the file.
 * Either side may be null for an open boundary. Omitted entirely when the
 * range is unset.
 */
export type StoryDocumentRangeTuple = [number | null, number | null];

export interface StoryDocumentChapter {
  name: string;
  url?: string;
}

export interface StoryDocumentBook {
  name: string;
  author?: string;
  url?: string;
  chapters: StoryDocumentChapter[];
}

export interface StoryDocumentEpisode {
  name: string;
  url?: string;
}

export interface StoryDocumentSeason {
  url?: string;
  episodes: StoryDocumentEpisode[];
}

export interface StoryDocumentPosition {
  lat: number;
  lng: number;
  dead?: boolean;
  note?: string;
  tail?: LatLng[];
  chapters?: StoryDocumentRangeTuple;
  episodes?: StoryDocumentRangeTuple;
}

export interface StoryDocumentCharacter {
  name: string;
  group?: string;
  icon?: string;
  color?: string;
  /** The character's own wiki page, if any — their name links here in the view screen. */
  url?: string;
  positions: StoryDocumentPosition[];
}

export interface StoryDocumentMarker {
  label: string;
  icon?: string;
  color?: string;
  lat: number;
  lng: number;
  polygon?: LatLng[];
  chapters?: StoryDocumentRangeTuple;
  episodes?: StoryDocumentRangeTuple;
}

export interface StoryDocumentMarkerSet {
  name: string;
  markers: StoryDocumentMarker[];
}

/** The full human-editable shape of a story, as exported to / imported from YAML. */
export interface StoryDocument {
  name: string;
  tileUrlTemplate?: string;
  tileLayerAuthor?: string;
  tileLayerAttributionUrl?: string;
  initialCenter: LatLng;
  initialZoom: number;
  minZoom: number;
  maxZoom: number;
  books: StoryDocumentBook[];
  television: StoryDocumentSeason[];
  characters: StoryDocumentCharacter[];
  markerSets: StoryDocumentMarkerSet[];
}
