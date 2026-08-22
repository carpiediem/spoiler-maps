import { stringify } from 'yaml';
import {
  getStory,
  listBooksForStory,
  listChaptersForBook,
  listCharacterPositionsForCharacter,
  listCharactersForStory,
  listEpisodesForSeason,
  listMarkerSetsForStory,
  listMarkersForMarkerSet,
  listTvSeasonsForStory,
  type ChapterRange,
  type EpisodeRange,
} from '../db';
import type {
  StoryDocument,
  StoryDocumentCharacter,
  StoryDocumentMarker,
  StoryDocumentMarkerSet,
  StoryDocumentPosition,
  StoryDocumentRangeTuple,
} from './storyDocument';

// A range's start/end ids are guaranteed to resolve: indexById is built from
// this same story's own chapters/episodes before any range is read, and the
// chapters(id)/episodes(id) ON DELETE SET NULL foreign key means a deleted
// chapter's/episode's id can never linger in a range either.
function resolveIndex(id: number | null, indexById: Map<number, number>): number | null {
  if (id === null) return null;
  /* v8 ignore next -- see the function comment above; a stored id always has an entry. */
  return indexById.get(id) ?? null;
}

function chapterRangeToTuple(
  range: ChapterRange | null,
  chapterIndexById: Map<number, number>,
): StoryDocumentRangeTuple | undefined {
  if (!range) return undefined;
  const start = resolveIndex(range.startChapterId, chapterIndexById);
  const end = resolveIndex(range.endChapterId, chapterIndexById);
  /* v8 ignore next -- both resolving to null would require normalizeChapterRange's null-collapsing (see repository.ts) to have missed a fully-open range, which it doesn't. */
  return start === null && end === null ? undefined : [start, end];
}

function episodeRangeToTuple(
  range: EpisodeRange | null,
  episodeIndexById: Map<number, number>,
): StoryDocumentRangeTuple | undefined {
  if (!range) return undefined;
  const start = resolveIndex(range.startEpisodeId, episodeIndexById);
  const end = resolveIndex(range.endEpisodeId, episodeIndexById);
  /* v8 ignore next -- see chapterRangeToTuple's identical case above. */
  return start === null && end === null ? undefined : [start, end];
}

/**
 * Fetches a story and everything under it, and builds the human-editable
 * document shape used for YAML export/import. Chapter/episode ranges are
 * resolved to flat 0-based indices into this same document's `books[].chapters`
 * / `television[].episodes` arrays (see StoryDocumentRangeTuple), so the file
 * never carries raw database ids.
 */
export async function buildStoryDocument(storyId: number): Promise<StoryDocument> {
  const story = await getStory(storyId);
  if (!story) throw new Error(`Story ${storyId} does not exist.`);

  const books = await listBooksForStory(storyId);
  const chapterIndexById = new Map<number, number>();
  let chapterFlatIndex = 0;
  const bookDocs = await Promise.all(
    books.map(async (book) => {
      const chapters = await listChaptersForBook(book.id);
      const chapterDocs = chapters.map((chapter) => {
        chapterIndexById.set(chapter.id, chapterFlatIndex);
        chapterFlatIndex += 1;
        return {
          name: chapter.name,
          ...(chapter.url ? { url: chapter.url } : {}),
        };
      });
      return {
        name: book.name,
        ...(book.author ? { author: book.author } : {}),
        ...(book.url ? { url: book.url } : {}),
        chapters: chapterDocs,
      };
    }),
  );

  const seasons = await listTvSeasonsForStory(storyId);
  const episodeIndexById = new Map<number, number>();
  let episodeFlatIndex = 0;
  const seasonDocs = await Promise.all(
    seasons.map(async (season) => {
      const episodes = await listEpisodesForSeason(season.id);
      const episodeDocs = episodes.map((episode) => {
        episodeIndexById.set(episode.id, episodeFlatIndex);
        episodeFlatIndex += 1;
        return {
          name: episode.name,
          ...(episode.url ? { url: episode.url } : {}),
        };
      });
      return {
        ...(season.url ? { url: season.url } : {}),
        episodes: episodeDocs,
      };
    }),
  );

  const characters = await listCharactersForStory(storyId);
  const characterDocs: StoryDocumentCharacter[] = await Promise.all(
    characters.map(async (character) => {
      const positions = await listCharacterPositionsForCharacter(character.id);
      const positionDocs: StoryDocumentPosition[] = positions.map((position) => {
        const chapters = chapterRangeToTuple(position.chapterRange, chapterIndexById);
        const episodes = episodeRangeToTuple(position.episodeRange, episodeIndexById);
        return {
          lat: position.position.lat,
          lng: position.position.lng,
          ...(position.dead ? { dead: true } : {}),
          ...(position.note ? { note: position.note } : {}),
          ...(position.tail ? { tail: position.tail } : {}),
          ...(chapters ? { chapters } : {}),
          ...(episodes ? { episodes } : {}),
        };
      });
      return {
        name: character.name,
        ...(character.group ? { group: character.group } : {}),
        ...(character.icon ? { icon: character.icon } : {}),
        ...(character.color ? { color: character.color } : {}),
        ...(character.url ? { url: character.url } : {}),
        positions: positionDocs,
      };
    }),
  );

  const markerSets = await listMarkerSetsForStory(storyId);
  const markerSetDocs: StoryDocumentMarkerSet[] = await Promise.all(
    markerSets.map(async (markerSet) => {
      const markers = await listMarkersForMarkerSet(markerSet.id);
      const markerDocs: StoryDocumentMarker[] = markers.map((marker) => {
        const chapters = chapterRangeToTuple(marker.chapterRange, chapterIndexById);
        const episodes = episodeRangeToTuple(marker.episodeRange, episodeIndexById);
        return {
          label: marker.label,
          ...(marker.icon ? { icon: marker.icon } : {}),
          ...(marker.color ? { color: marker.color } : {}),
          lat: marker.position.lat,
          lng: marker.position.lng,
          ...(marker.polygon ? { polygon: marker.polygon } : {}),
          ...(chapters ? { chapters } : {}),
          ...(episodes ? { episodes } : {}),
        };
      });
      return { name: markerSet.name, markers: markerDocs };
    }),
  );

  return {
    name: story.name,
    ...(story.tileUrlTemplate ? { tileUrlTemplate: story.tileUrlTemplate } : {}),
    ...(story.tileLayerAuthor ? { tileLayerAuthor: story.tileLayerAuthor } : {}),
    ...(story.tileLayerAttributionUrl
      ? { tileLayerAttributionUrl: story.tileLayerAttributionUrl }
      : {}),
    initialCenter: story.initialCenter,
    initialZoom: story.initialZoom,
    minZoom: story.minZoom,
    maxZoom: story.maxZoom,
    books: bookDocs,
    television: seasonDocs,
    characters: characterDocs,
    markerSets: markerSetDocs,
  };
}

/** Builds and serializes a story to a YAML string, ready to write to a file. */
export async function exportStoryToYaml(storyId: number): Promise<string> {
  const document = await buildStoryDocument(storyId);
  return stringify(document);
}
