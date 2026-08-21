import DownloadIcon from '@mui/icons-material/Download';
import { Box, Button, IconButton, Paper, Stack, Tooltip } from '@mui/material';
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { useForm } from 'react-hook-form';
import type { CharacterPosition, LatLng, Story } from '../db';
import type { CharacterPositionPin, CharacterTailOverlay } from '../lib/characterPositionPins';
import { BooksSection } from './editor-sidebar/BooksSection';
import { CharactersSection } from './editor-sidebar/CharactersSection';
import type { TimelineMode } from './MapTimelineControl';
import { DeleteConfirmDialog } from './editor-sidebar/DeleteConfirmDialog';
import { storyToFormValues, type FormValues } from './editor-sidebar/formValues';
import { MapSection } from './editor-sidebar/MapSection';
import { MarkersSection } from './editor-sidebar/MarkersSection';
import { PositionPanel } from './editor-sidebar/PositionPanel';
import { SidebarSection } from './editor-sidebar/SidebarSection';
import { TelevisionSection } from './editor-sidebar/TelevisionSection';
import { resolveTileUrlTemplate } from '../lib/tileUrl';
import { StorySelector } from './StorySelector';

const SIDEBAR_HEIGHT_SX = { maxHeight: 'calc(100vh - 32px)', overflowY: 'auto' } as const;

type SectionId = 'map' | 'books' | 'television' | 'characters' | 'markers';

const HASH_PATTERN = /^#(map|books|television|characters|markers)(?:-(\d+))?$/;

interface HashTarget {
  section: SectionId;
  /** 1-based index of the book/season/character named by a #books-N, #television-N, or #characters-N fragment. */
  itemIndex: number | null;
}

// Reads a #section or #section-N fragment (e.g. #books, #books-1,
// #television-2, #characters-1). A section other than Map only exists once
// a story has been saved, so the fragment is ignored (rather than left
// pending) while selectedStoryId is still null.
function parseHash(hash: string, selectedStoryId: number | null): HashTarget | null {
  const match = hash.match(HASH_PATTERN);
  if (!match) return null;
  const [, section, indexStr] = match;
  if (section !== 'map' && selectedStoryId === null) return null;

  return {
    section: section as SectionId,
    itemIndex:
      (section === 'books' || section === 'television' || section === 'characters') && indexStr
        ? Number(indexStr)
        : null,
  };
}

interface EditorSidebarProps {
  stories: Story[];
  selectedStoryId: number | null;
  onSelectStory: (storyId: number | null) => void;
  /** Downloads the currently selected story as a YAML file. */
  onExportStory: () => void;
  /** Reads and imports a YAML export as a brand-new story; rejects with a user-facing message on failure. */
  onImportFile: (file: File) => Promise<void>;
  /** Permanently deletes the currently selected story. */
  onDeleteStory: () => void;
  onSave: (input: {
    name: string;
    tileUrlTemplate: string;
    tileLayerAuthor: string | null;
    tileLayerAttributionUrl: string | null;
    initialCenter: LatLng;
    initialZoom: number;
    minZoom: number;
    maxZoom: number;
  }) => void;
  onCaptureMapPosition: () => { center: LatLng; zoom: number } | null;
  /** The map's current live position, to tell whether it has moved from what's stored in the form. */
  mapPosition: { center: LatLng; zoom: number } | null;
  /** The draggable pin's current lat/lng while editing a character position. */
  draftPosition: LatLng | null;
  /** Which character/position is currently open in the Position panel, if any. */
  activePosition: {
    characterId: number;
    index: number;
    existing: CharacterPosition | null;
  } | null;
  /** Called with (characterId, 1-based new position index, character color) when "+ Position" is clicked. */
  onAddPosition: (characterId: number, index: number, color: string | null) => void;
  /** Called with (characterId, 1-based index, position, character color) when an existing position is clicked. */
  onEditPosition: (
    characterId: number,
    index: number,
    position: CharacterPosition,
    color: string | null,
  ) => void;
  /** Called when the Position panel's back arrow is clicked. */
  onBackFromPosition: () => void;
  /** Bumped whenever a position editing session ends, so each CharacterItem re-fetches its list. */
  positionsVersion: number;
  /** Called with the expanded character's numbered position pins, or null once collapsed. */
  onVisiblePositionsChange: (pins: CharacterPositionPin[] | null) => void;
  /** Called with the tails to draw for every character toggled visible on the map. */
  onVisibleTailsChange: (tails: CharacterTailOverlay[]) => void;
  /** Whether the map is currently in tail-drawing mode. */
  isDrawingTail: boolean;
  /** Points clicked so far while drawing a tail. */
  tailDraftPoints: LatLng[];
  onStartDrawingTail: () => void;
  /** Called when Save or Cancel is clicked, to leave drawing mode either way. */
  onFinishDrawingTail: () => void;
  /** The map timeline control's current mode, used to filter which character positions show as map pins. */
  timelineMode: TimelineMode;
  /** The map timeline control's current scrub position (a flat 1-based chapter/episode index). */
  timelineIndex: number;
}

export function EditorSidebar({
  stories,
  selectedStoryId,
  onSelectStory,
  onExportStory,
  onImportFile,
  onDeleteStory,
  onSave,
  onCaptureMapPosition,
  mapPosition,
  draftPosition,
  activePosition,
  onAddPosition,
  onEditPosition,
  onBackFromPosition,
  positionsVersion,
  onVisiblePositionsChange,
  onVisibleTailsChange,
  isDrawingTail,
  tailDraftPoints,
  onStartDrawingTail,
  onFinishDrawingTail,
  timelineMode,
  timelineIndex,
}: EditorSidebarProps) {
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ defaultValues: storyToFormValues(null) });

  // Seeded synchronously from the URL hash present at first render (rather
  // than via an effect) so a hash-targeted section/book is visible on the
  // very first paint instead of flashing open a tick later.
  const [expandedSection, setExpandedSection] = useState<SectionId | false>(
    () => parseHash(window.location.hash, selectedStoryId)?.section ?? 'map',
  );
  const [hashItemIndex, setHashItemIndex] = useState<number | null>(
    () => parseHash(window.location.hash, selectedStoryId)?.itemIndex ?? null,
  );

  const [bookCount, setBookCount] = useState<number>();
  const [televisionCount, setTelevisionCount] = useState<number>();
  const [charactersCount, setCharactersCount] = useState<number>();
  const [markersCount, setMarkersCount] = useState<number>();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Tracks the selectedStoryId last synced to the form, so the list simply
  // reloading (e.g. the initial fetch resolving) doesn't reset the form out
  // from under whatever the user is typing — only an actual change of
  // *which* story is selected does.
  const syncedStoryIdRef = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    if (syncedStoryIdRef.current === selectedStoryId) return;
    syncedStoryIdRef.current = selectedStoryId;

    const story = stories.find((candidate) => candidate.id === selectedStoryId) ?? null;
    reset(storyToFormValues(story));
    setExpandedSection('map');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStoryId, stories, reset]);

  // Re-applies the hash on demand: once more when selectedStoryId
  // transitions away from null (a non-Map fragment may have been waiting
  // on a story to finish loading/saving), and again on any live
  // 'hashchange' while the sidebar is already open.
  useEffect(() => {
    function applyHash() {
      const target = parseHash(window.location.hash, selectedStoryId);
      if (!target) return;
      setExpandedSection(target.section);
      setHashItemIndex(target.itemIndex);
    }

    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [selectedStoryId]);

  function onValid(data: FormValues) {
    const resolved = resolveTileUrlTemplate(data.tileUrlValue)!;
    onSave({
      name: data.name.trim(),
      tileUrlTemplate: resolved.template,
      tileLayerAuthor: data.tileLayerAuthor.trim() || null,
      tileLayerAttributionUrl: data.tileLayerAttributionUrl.trim() || null,
      initialCenter: data.initialCenter,
      initialZoom: data.initialZoom,
      minZoom: data.minZoom,
      maxZoom: data.maxZoom,
    });
    // Marks these values (with tileUrlValue normalized to the resolved
    // template, in case a real tile URL was extrapolated) as the new clean
    // baseline, so Save — disabled while the form isn't dirty — goes back
    // to disabled until the next actual change, instead of staying enabled
    // right after saving.
    reset({ ...data, tileUrlValue: resolved.template });
  }

  function handleAccordionChange(section: SectionId) {
    return (_event: SyntheticEvent, isExpanded: boolean) => {
      setExpandedSection(isExpanded ? section : false);
    };
  }

  const selectedStory = stories.find((story) => story.id === selectedStoryId) ?? null;

  return (
    <Paper
      component="aside"
      elevation={4}
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1000,
        width: 280,
        maxHeight: 'calc(100vh - 32px)',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          width: '200%',
          transform: activePosition ? 'translateX(-50%)' : 'translateX(0%)',
          transition: 'transform 0.3s ease-in-out',
        }}
      >
        <Box
          sx={{ width: '50%', flexShrink: 0, boxSizing: 'border-box', p: 2, ...SIDEBAR_HEIGHT_SX }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <StorySelector
                stories={stories}
                selectedStoryId={selectedStoryId}
                onSelect={onSelectStory}
                onImportFile={onImportFile}
              />
            </Box>
            {selectedStoryId !== null && (
              <Tooltip title="Export as YAML" arrow>
                <IconButton size="small" aria-label="Export as YAML" onClick={onExportStory}>
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>

          <Box component="form" onSubmit={handleSubmit(onValid)} sx={{ mt: 2 }}>
            <SidebarSection
              id="map-section"
              title="Map"
              expanded={expandedSection === 'map'}
              onChange={handleAccordionChange('map')}
            >
              <MapSection
                control={control}
                setValue={setValue}
                errors={errors}
                isDirty={isDirty}
                mapPosition={mapPosition}
                onCaptureMapPosition={onCaptureMapPosition}
              />
            </SidebarSection>

            {selectedStoryId !== null && (
              <>
                <SidebarSection
                  id="books-section"
                  title="Books"
                  count={bookCount}
                  expanded={expandedSection === 'books'}
                  onChange={handleAccordionChange('books')}
                >
                  <BooksSection
                    storyId={selectedStoryId}
                    initialExpandedIndex={expandedSection === 'books' ? hashItemIndex : null}
                    onCountChange={setBookCount}
                  />
                </SidebarSection>

                <SidebarSection
                  id="television-section"
                  title="Television"
                  count={televisionCount}
                  expanded={expandedSection === 'television'}
                  onChange={handleAccordionChange('television')}
                >
                  <TelevisionSection
                    storyId={selectedStoryId}
                    initialExpandedIndex={expandedSection === 'television' ? hashItemIndex : null}
                    onCountChange={setTelevisionCount}
                  />
                </SidebarSection>

                <SidebarSection
                  id="characters-section"
                  title="Characters"
                  count={charactersCount}
                  expanded={expandedSection === 'characters'}
                  onChange={handleAccordionChange('characters')}
                >
                  <CharactersSection
                    storyId={selectedStoryId}
                    initialExpandedIndex={expandedSection === 'characters' ? hashItemIndex : null}
                    onCountChange={setCharactersCount}
                    onAddPosition={onAddPosition}
                    onEditPosition={onEditPosition}
                    positionsVersion={positionsVersion}
                    onVisiblePositionsChange={onVisiblePositionsChange}
                    onVisibleTailsChange={onVisibleTailsChange}
                    timelineMode={timelineMode}
                    timelineIndex={timelineIndex}
                    sectionExpanded={expandedSection === 'characters'}
                  />
                </SidebarSection>

                <SidebarSection
                  id="markers-section"
                  title="Markers"
                  count={markersCount}
                  expanded={expandedSection === 'markers'}
                  onChange={handleAccordionChange('markers')}
                >
                  <MarkersSection storyId={selectedStoryId} onCountChange={setMarkersCount} />
                </SidebarSection>

                <Button
                  size="small"
                  color="error"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  sx={{ mt: 2 }}
                  fullWidth
                >
                  Delete Story
                </Button>
              </>
            )}
          </Box>

          <DeleteConfirmDialog
            open={isDeleteConfirmOpen}
            onClose={() => setIsDeleteConfirmOpen(false)}
            onConfirm={() => {
              setIsDeleteConfirmOpen(false);
              onDeleteStory();
            }}
            title={`Delete “${selectedStory?.name || 'Untitled Map'}”?`}
            description="This will permanently delete the story, along with all of its books, television seasons, characters, and markers. This can’t be undone."
          />
        </Box>

        <Box
          sx={{
            width: '50%',
            flexShrink: 0,
            boxSizing: 'border-box',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            height: SIDEBAR_HEIGHT_SX.maxHeight,
            overflowY: SIDEBAR_HEIGHT_SX.overflowY,
          }}
        >
          {activePosition && selectedStoryId !== null && (
            <PositionPanel
              storyId={selectedStoryId}
              characterId={activePosition.characterId}
              index={activePosition.index}
              position={draftPosition}
              existingPosition={activePosition.existing}
              onBack={onBackFromPosition}
              isDrawingTail={isDrawingTail}
              tailDraftPoints={tailDraftPoints}
              onStartDrawingTail={onStartDrawingTail}
              onFinishDrawingTail={onFinishDrawingTail}
            />
          )}
        </Box>
      </Box>
    </Paper>
  );
}
