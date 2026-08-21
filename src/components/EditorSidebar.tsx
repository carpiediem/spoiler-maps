import { Box, Paper } from '@mui/material';
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { useForm } from 'react-hook-form';
import type { LatLng, Story } from '../db';
import { BooksSection } from './editor-sidebar/BooksSection';
import { CharactersSection } from './editor-sidebar/CharactersSection';
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
  /** 1-based index of the book/season named by a #books-N or #television-N fragment. */
  itemIndex: number | null;
}

// Reads a #section or #section-N fragment (e.g. #books, #books-1,
// #television-2). A section other than Map only exists once a story has
// been saved, so the fragment is ignored (rather than left pending) while
// selectedStoryId is still null.
function parseHash(hash: string, selectedStoryId: number | null): HashTarget | null {
  const match = hash.match(HASH_PATTERN);
  if (!match) return null;
  const [, section, indexStr] = match;
  if (section !== 'map' && selectedStoryId === null) return null;

  return {
    section: section as SectionId,
    itemIndex:
      (section === 'books' || section === 'television') && indexStr ? Number(indexStr) : null,
  };
}

interface EditorSidebarProps {
  stories: Story[];
  selectedStoryId: number | null;
  onSelectStory: (storyId: number | null) => void;
  onSave: (input: {
    name: string;
    tileUrlTemplate: string;
    tileLayerAuthor: string | null;
    tileLayerAttributionUrl: string | null;
    initialCenter: LatLng;
    initialZoom: number;
  }) => void;
  onCaptureMapPosition: () => { center: LatLng; zoom: number } | null;
  /** The map's current live position, to tell whether it has moved from what's stored in the form. */
  mapPosition: { center: LatLng; zoom: number } | null;
  /** The draggable pin's current lat/lng while editing a character position. */
  draftPosition: LatLng | null;
  onStartEditingPosition: () => void;
  onEndEditingPosition: () => void;
}

export function EditorSidebar({
  stories,
  selectedStoryId,
  onSelectStory,
  onSave,
  onCaptureMapPosition,
  mapPosition,
  draftPosition,
  onStartEditingPosition,
  onEndEditingPosition,
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

  // When set, the sidebar slides its main content out to the left and
  // slides a Position form in from the right, in place of the accordion
  // list — rather than opening a nested dialog like chapters/episodes,
  // since a position is edited less like "one more row in a list" and
  // more like a small dedicated screen of its own.
  const [activePosition, setActivePosition] = useState<{
    characterId: number;
    index: number;
  } | null>(null);
  const [positionsVersion, setPositionsVersion] = useState(0);

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
    setActivePosition(null);
    onEndEditingPosition();
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

  function handleAddPosition(characterId: number, index: number) {
    setActivePosition({ characterId, index });
    onStartEditingPosition();
  }

  function handleBackFromPosition() {
    setActivePosition(null);
    onEndEditingPosition();
    // Bumps a value each character's CharacterItem depends on when
    // re-fetching its positions list, so the list picks up whatever was
    // just created/updated while its accordion stayed mounted (and
    // silently stale) behind the Position panel.
    setPositionsVersion((previous) => previous + 1);
  }

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
          <StorySelector
            stories={stories}
            selectedStoryId={selectedStoryId}
            onSelect={onSelectStory}
          />

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
                    onCountChange={setCharactersCount}
                    onAddPosition={handleAddPosition}
                    positionsVersion={positionsVersion}
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
              </>
            )}
          </Box>
        </Box>

        <Box
          sx={{ width: '50%', flexShrink: 0, boxSizing: 'border-box', p: 2, ...SIDEBAR_HEIGHT_SX }}
        >
          {activePosition && selectedStoryId !== null && (
            <PositionPanel
              storyId={selectedStoryId}
              characterId={activePosition.characterId}
              index={activePosition.index}
              position={draftPosition}
              onBack={handleBackFromPosition}
            />
          )}
        </Box>
      </Box>
    </Paper>
  );
}
