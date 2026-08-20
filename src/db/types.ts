export interface Story {
  id: number;
  name: string;
  tileUrlTemplate: string | null;
  initialCenterLat: number;
  initialCenterLng: number;
  initialZoom: number;
}

export interface Book {
  id: number;
  storyId: number;
  name: string;
  author: string | null;
  url: string | null;
  /** Fractional index, zero-based; see ordering.ts. Not a display number. */
  sortOrder: number;
}

export interface Chapter {
  id: number;
  bookId: number;
  name: string;
  /** Fractional index, zero-based; see ordering.ts. Not a display number. */
  sortOrder: number;
}

export interface TvSeason {
  id: number;
  storyId: number;
  url: string | null;
  /** Fractional index, zero-based; see ordering.ts. Not a display number. */
  sortOrder: number;
}

export interface Episode {
  id: number;
  seasonId: number;
  name: string;
  url: string | null;
  /** Fractional index, zero-based; see ordering.ts. Not a display number. */
  sortOrder: number;
}

export interface MarkerSet {
  id: number;
  storyId: number;
  name: string;
}

export interface Marker {
  id: number;
  markerSetId: number;
  label: string;
  icon: string | null;
  lat: number;
  lng: number;
}

export interface Character {
  id: number;
  storyId: number;
  name: string;
  group: string | null;
  icon: string | null;
}

/**
 * A span of chapters within one book, boundaries inclusive. A null
 * startChapterId/endChapterId means the range is open on that end ("from
 * the beginning of the book" / "through the end of the book").
 */
export interface ChapterRange {
  bookId: number;
  startChapterId: number | null;
  endChapterId: number | null;
}

/** The tv-season equivalent of ChapterRange. */
export interface EpisodeRange {
  seasonId: number;
  startEpisodeId: number | null;
  endEpisodeId: number | null;
}

/**
 * Where a character should appear on the map once the reader/viewer has
 * reached a given point in the story. chapterRange and episodeRange are
 * independent of each other, so a position can resolve regardless of
 * whether progress is tracked via books or the show.
 */
export interface CharacterPosition {
  id: number;
  characterId: number;
  lat: number;
  lng: number;
  chapterRange: ChapterRange | null;
  episodeRange: EpisodeRange | null;
}

export type NewStory = Omit<Story, 'id'>;
export type NewBook = Omit<Book, 'id'>;
export type NewChapter = Omit<Chapter, 'id'>;
export type NewTvSeason = Omit<TvSeason, 'id'>;
export type NewEpisode = Omit<Episode, 'id'>;
export type NewMarkerSet = Omit<MarkerSet, 'id'>;
export type NewMarker = Omit<Marker, 'id'>;
export type NewCharacter = Omit<Character, 'id'>;
export type NewCharacterPosition = Omit<CharacterPosition, 'id'>;
