import { Box, Paper } from '@mui/material';
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { useForm } from 'react-hook-form';
import type { LatLng, Story } from '../db';
import { BooksSection } from './editor-sidebar/BooksSection';
import { CharactersSection } from './editor-sidebar/CharactersSection';
import { storyToFormValues, type FormValues } from './editor-sidebar/formValues';
import { MapSection } from './editor-sidebar/MapSection';
import { MarkersSection } from './editor-sidebar/MarkersSection';
import { SidebarSection } from './editor-sidebar/SidebarSection';
import { TelevisionSection } from './editor-sidebar/TelevisionSection';
import { resolveTileUrlTemplate } from '../lib/tileUrl';
import { StorySelector } from './StorySelector';

type SectionId = 'map' | 'books' | 'television' | 'characters' | 'markers';

const HASH_PATTERN = /^#(map|books|television|characters|markers)(?:-(\d+))?$/;

interface HashTarget {
  section: SectionId;
  bookIndex: number | null;
}

// Reads a #section or #section-N fragment (e.g. #books, #books-1). A
// section other than Map only exists once a story has been saved, so the
// fragment is ignored (rather than left pending) while selectedStoryId is
// still null.
function parseHash(hash: string, selectedStoryId: number | null): HashTarget | null {
  const match = hash.match(HASH_PATTERN);
  if (!match) return null;
  const [, section, indexStr] = match;
  if (section !== 'map' && selectedStoryId === null) return null;

  return {
    section: section as SectionId,
    bookIndex: section === 'books' && indexStr ? Number(indexStr) : null,
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
}

export function EditorSidebar({
  stories,
  selectedStoryId,
  onSelectStory,
  onSave,
  onCaptureMapPosition,
  mapPosition,
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
  const [hashBookIndex, setHashBookIndex] = useState<number | null>(
    () => parseHash(window.location.hash, selectedStoryId)?.bookIndex ?? null,
  );

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
      setHashBookIndex(target.bookIndex);
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
        overflowY: 'auto',
        p: 2,
      }}
    >
      <StorySelector stories={stories} selectedStoryId={selectedStoryId} onSelect={onSelectStory} />

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
              expanded={expandedSection === 'books'}
              onChange={handleAccordionChange('books')}
            >
              <BooksSection storyId={selectedStoryId} initialExpandedIndex={hashBookIndex} />
            </SidebarSection>

            <SidebarSection
              id="television-section"
              title="Television"
              expanded={expandedSection === 'television'}
              onChange={handleAccordionChange('television')}
            >
              <TelevisionSection />
            </SidebarSection>

            <SidebarSection
              id="characters-section"
              title="Characters"
              expanded={expandedSection === 'characters'}
              onChange={handleAccordionChange('characters')}
            >
              <CharactersSection />
            </SidebarSection>

            <SidebarSection
              id="markers-section"
              title="Markers"
              expanded={expandedSection === 'markers'}
              onChange={handleAccordionChange('markers')}
            >
              <MarkersSection />
            </SidebarSection>
          </>
        )}
      </Box>
    </Paper>
  );
}
