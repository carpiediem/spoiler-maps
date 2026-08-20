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

/**
 * A span of chapters, boundaries inclusive, ordered by (book.sortOrder,
 * chapter.sortOrder) — so a range's boundaries can fall in different
 * books (e.g. book 1 chapter 10 through book 2 chapter 5). A null
 * startChapterId/endChapterId leaves the range open on that end ("from
 * the beginning of the story" / "through the end of the story").
 */
export interface ChapterRange {
  startChapterId: number | null;
  endChapterId: number | null;
}

/** The tv-season equivalent of ChapterRange, ordered by (season.sortOrder, episode.sortOrder). */
export interface EpisodeRange {
  startEpisodeId: number | null;
  endEpisodeId: number | null;
}

/**
 * A pin on the map. chapterRange and episodeRange say when it should
 * appear — once the reader/viewer has reached a given point in the story —
 * and are independent of each other, so a marker resolves regardless of
 * whether progress is tracked via books or the show. Both null means the
 * marker is always shown.
 */
export interface Marker {
  id: number;
  markerSetId: number;
  label: string;
  icon: string | null;
  lat: number;
  lng: number;
  chapterRange: ChapterRange | null;
  episodeRange: EpisodeRange | null;
}

export interface Character {
  id: number;
  storyId: number;
  name: string;
  group: string | null;
  icon: string | null;
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
