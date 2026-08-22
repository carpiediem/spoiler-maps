import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createBook,
  createCharacter,
  createCharacterPosition,
  createStory,
  type CharacterPosition,
  type LatLng,
  type Story,
} from '../db';
import { resetDatabaseForTests } from '../db/client';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../lib/mapDefaults';
import { EditorSidebar } from './EditorSidebar';

async function deleteStoredDatabase(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('spoiler-maps');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

beforeEach(() => {
  resetDatabaseForTests();
});

afterEach(async () => {
  resetDatabaseForTests();
  await deleteStoredDatabase();
  window.location.hash = '';
});

function makeStory(overrides: Partial<Story>): Story {
  return {
    id: 1,
    name: 'A Song of Ice and Fire',
    tileUrlTemplate: 'https://tile.example.com/{z}/{x}/{y}.png',
    tileLayerAuthor: null,
    tileLayerAttributionUrl: null,
    initialCenter: { lat: 51.5, lng: -0.1278 },
    initialZoom: 6,
    minZoom: 0,
    maxZoom: 19,
    ...overrides,
  };
}

/** Stands in for App: owns draftPosition/activePosition and drives them the way a real marker drag or position click would. */
function DraggableEditorSidebar({
  stories,
  selectedStoryId,
}: {
  stories: Story[];
  selectedStoryId: number;
}) {
  const [draftPosition, setDraftPosition] = useState<LatLng | null>(null);
  const [activePosition, setActivePosition] = useState<{
    characterId: number;
    index: number;
    existing: CharacterPosition | null;
  } | null>(null);
  const [positionsVersion, setPositionsVersion] = useState(0);

  function handleAddPosition(characterId: number, index: number) {
    setActivePosition({ characterId, index, existing: null });
    setDraftPosition({ lat: 39.8283, lng: -98.5795 });
  }

  function handleEditPosition(characterId: number, index: number, existing: CharacterPosition) {
    setActivePosition({ characterId, index, existing });
    setDraftPosition(existing.position);
  }

  function handleBackFromPosition() {
    setActivePosition(null);
    setDraftPosition(null);
    setPositionsVersion((previous) => previous + 1);
  }

  return (
    <>
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={stories}
          selectedStoryId={selectedStoryId}
          onSelectStory={vi.fn()}
          onSave={vi.fn()}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={{ center: { lat: 39.8283, lng: -98.5795 }, zoom: 4 }}
          draftPosition={draftPosition}
          activePosition={activePosition}
          onAddPosition={handleAddPosition}
          onEditPosition={handleEditPosition}
          onBackFromPosition={handleBackFromPosition}
          positionsVersion={positionsVersion}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>
      <button onClick={() => setDraftPosition({ lat: 51.5, lng: -0.1278 })}>Simulate drag</button>
    </>
  );
}

describe('EditorSidebar', () => {
  it('disables Save until the form has unsaved changes, then disables it again after saving', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    const story = makeStory({ id: 1 });
    render(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={[story]}
          selectedStoryId={1}
          onSelectStory={vi.fn()}
          onSave={onSave}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();

    await user.type(screen.getByLabelText(/map name/i), '!');
    expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(onSave).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('starts with Save disabled for a brand new map', () => {
    render(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={[]}
          selectedStoryId={null}
          onSelectStory={vi.fn()}
          onSave={vi.fn()}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('calls onSave with a valid name, tile URL template, and default initial position', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={[]}
          selectedStoryId={null}
          onSelectStory={vi.fn()}
          onSave={onSave}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/map name/i), 'A Song of Ice and Fire');
    fireEvent.change(screen.getByLabelText(/tile layer url template/i), {
      target: { value: 'https://tile.example.com/{z}/{x}/{y}.png' },
    });
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(onSave).toHaveBeenCalledWith({
      name: 'A Song of Ice and Fire',
      tileUrlTemplate: 'https://tile.example.com/{z}/{x}/{y}.png',
      tileLayerAuthor: null,
      tileLayerAttributionUrl: null,
      initialCenter: DEFAULT_CENTER,
      initialZoom: DEFAULT_ZOOM,
      minZoom: 0,
      maxZoom: 19,
    });
  });

  it('extrapolates a {q} template from a real example tile URL', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={[]}
          selectedStoryId={null}
          onSelectStory={vi.fn()}
          onSave={onSave}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/map name/i), 'A Song of Ice and Fire');
    fireEvent.change(screen.getByLabelText(/tile layer url template/i), {
      target: { value: 'https://carpiediem.github.io/game-of-thrones-map/fsm/tqtqr.jpg' },
    });
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        tileUrlTemplate: 'https://carpiediem.github.io/game-of-thrones-map/fsm/{q}.jpg',
      }),
    );
  });

  it('shows an error and does not call onSave when the name is blank', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={[]}
          selectedStoryId={null}
          onSelectStory={vi.fn()}
          onSave={onSave}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/tile layer url template/i), {
      target: { value: 'https://tile.example.com/{z}/{x}/{y}.png' },
    });
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/enter a name/i);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows an error and does not call onSave for an invalid tile URL', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={[]}
          selectedStoryId={null}
          onSelectStory={vi.fn()}
          onSave={onSave}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/map name/i), 'A Song of Ice and Fire');
    await user.type(screen.getByLabelText(/tile layer url template/i), 'not-a-valid-url');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('prefills the form from the selected story', () => {
    const story = makeStory({
      id: 1,
      tileLayerAuthor: 'Jane Cartographer',
      tileLayerAttributionUrl: 'https://example.com',
    });
    render(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={[story]}
          selectedStoryId={1}
          onSelectStory={vi.fn()}
          onSave={vi.fn()}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/map name/i)).toHaveValue(story.name);
    expect(screen.getByLabelText(/tile layer url template/i)).toHaveValue(story.tileUrlTemplate);
    expect(screen.getByLabelText(/tile layer author/i)).toHaveValue('Jane Cartographer');
    expect(screen.getByLabelText(/tile layer attribution url/i)).toHaveValue('https://example.com');
    expect(screen.getByText(/51\.5000, -0\.1278 · Zoom 6/)).toBeInTheDocument();
  });

  it('saves the tile layer author and attribution URL when both are provided', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={[]}
          selectedStoryId={null}
          onSelectStory={vi.fn()}
          onSave={onSave}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/map name/i), 'A Song of Ice and Fire');
    fireEvent.change(screen.getByLabelText(/tile layer url template/i), {
      target: { value: 'https://tile.example.com/{z}/{x}/{y}.png' },
    });
    await user.type(screen.getByLabelText(/tile layer author/i), '  Jane Cartographer  ');
    await user.type(
      screen.getByLabelText(/tile layer attribution url/i),
      '  https://example.com  ',
    );
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        tileLayerAuthor: 'Jane Cartographer',
        tileLayerAttributionUrl: 'https://example.com',
      }),
    );
  });

  it('saves an updated zoom range', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={[]}
          selectedStoryId={null}
          onSelectStory={vi.fn()}
          onSave={onSave}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/map name/i), 'A Song of Ice and Fire');
    fireEvent.change(screen.getByLabelText(/tile layer url template/i), {
      target: { value: 'https://tile.example.com/{z}/{x}/{y}.png' },
    });
    fireEvent.change(screen.getByLabelText(/minimum zoom/i), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/maximum zoom/i), { target: { value: '15' } });
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ minZoom: 2, maxZoom: 15 }));
  });

  it('rejects a zoom range whose maximum is below its minimum', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={[]}
          selectedStoryId={null}
          onSelectStory={vi.fn()}
          onSave={onSave}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/map name/i), 'A Song of Ice and Fire');
    fireEvent.change(screen.getByLabelText(/tile layer url template/i), {
      target: { value: 'https://tile.example.com/{z}/{x}/{y}.png' },
    });
    fireEvent.change(screen.getByLabelText(/minimum zoom/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/maximum zoom/i), { target: { value: '5' } });
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/must not be less than/i);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('auto-detects the max zoom by probing the tile URL once the field settles', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((url: string) => {
      const zoom = Number(String(url).split('/')[3]);
      return Promise.resolve({ ok: zoom <= 9 } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      render(
        <MemoryRouter initialEntries={['/edit']}>
          <EditorSidebar
            stories={[]}
            selectedStoryId={null}
            onSelectStory={vi.fn()}
            onSave={vi.fn()}
            onDeleteStory={vi.fn()}
            onCaptureMapPosition={() => null}
            mapPosition={null}
            draftPosition={null}
            activePosition={null}
            onAddPosition={vi.fn()}
            onEditPosition={vi.fn()}
            onBackFromPosition={vi.fn()}
            positionsVersion={0}
            onVisiblePositionsChange={vi.fn()}
            onVisibleTailsChange={vi.fn()}
            isDrawingTail={false}
            tailDraftPoints={[]}
            onStartDrawingTail={vi.fn()}
            onFinishDrawingTail={vi.fn()}
            onExportStory={vi.fn()}
            onImportFile={vi.fn()}
            timelineMode="book"
            timelineIndex={1}
          />
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText(/tile layer url template/i), {
        target: { value: 'https://tile.example.com/{z}/{x}/{y}.png' },
      });
      expect(fetchMock).not.toHaveBeenCalled();

      await act(() => vi.advanceTimersByTimeAsync(600));

      expect(screen.getByLabelText(/maximum zoom/i)).toHaveValue(9);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'HEAD',
        }),
      );
    } finally {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });

  it('leaves the zoom range alone when auto-detection is inconclusive', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(() => Promise.reject(new Error('CORS-blocked')));
    vi.stubGlobal('fetch', fetchMock);

    try {
      render(
        <MemoryRouter initialEntries={['/edit']}>
          <EditorSidebar
            stories={[]}
            selectedStoryId={null}
            onSelectStory={vi.fn()}
            onSave={vi.fn()}
            onDeleteStory={vi.fn()}
            onCaptureMapPosition={() => null}
            mapPosition={null}
            draftPosition={null}
            activePosition={null}
            onAddPosition={vi.fn()}
            onEditPosition={vi.fn()}
            onBackFromPosition={vi.fn()}
            positionsVersion={0}
            onVisiblePositionsChange={vi.fn()}
            onVisibleTailsChange={vi.fn()}
            isDrawingTail={false}
            tailDraftPoints={[]}
            onStartDrawingTail={vi.fn()}
            onFinishDrawingTail={vi.fn()}
            onExportStory={vi.fn()}
            onImportFile={vi.fn()}
            timelineMode="book"
            timelineIndex={1}
          />
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText(/tile layer url template/i), {
        target: { value: 'https://tile.example.com/{z}/{x}/{y}.png' },
      });
      await act(() => vi.advanceTimersByTimeAsync(600));

      expect(screen.getByLabelText(/maximum zoom/i)).toHaveValue(19);
    } finally {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });

  it('debounces detection, only probing the URL the user settled on', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((url: string) => {
      const zoom = Number(String(url).split('/')[3]);
      return Promise.resolve({ ok: zoom <= 4 } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      render(
        <MemoryRouter initialEntries={['/edit']}>
          <EditorSidebar
            stories={[]}
            selectedStoryId={null}
            onSelectStory={vi.fn()}
            onSave={vi.fn()}
            onDeleteStory={vi.fn()}
            onCaptureMapPosition={() => null}
            mapPosition={null}
            draftPosition={null}
            activePosition={null}
            onAddPosition={vi.fn()}
            onEditPosition={vi.fn()}
            onBackFromPosition={vi.fn()}
            positionsVersion={0}
            onVisiblePositionsChange={vi.fn()}
            onVisibleTailsChange={vi.fn()}
            isDrawingTail={false}
            tailDraftPoints={[]}
            onStartDrawingTail={vi.fn()}
            onFinishDrawingTail={vi.fn()}
            onExportStory={vi.fn()}
            onImportFile={vi.fn()}
            timelineMode="book"
            timelineIndex={1}
          />
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText(/tile layer url template/i), {
        target: { value: 'https://tile.example.com/{z}/{x}/{y}.png' },
      });
      await act(() => vi.advanceTimersByTimeAsync(200));
      fireEvent.change(screen.getByLabelText(/tile layer url template/i), {
        target: { value: 'https://tile2.example.com/{z}/{x}/{y}.png' },
      });
      await act(() => vi.advanceTimersByTimeAsync(600));

      expect(screen.getByLabelText(/maximum zoom/i)).toHaveValue(4);
      expect(fetchMock.mock.calls.every(([url]) => String(url).includes('tile2.'))).toBe(true);
    } finally {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });

  it('cancels an in-flight probe on unmount, without warning about a state update after unmount', async () => {
    vi.useFakeTimers();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchMock = vi.fn(
      (_url: string, opts?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          opts?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    try {
      const { unmount } = render(
        <MemoryRouter initialEntries={['/edit']}>
          <EditorSidebar
            stories={[]}
            selectedStoryId={null}
            onSelectStory={vi.fn()}
            onSave={vi.fn()}
            onDeleteStory={vi.fn()}
            onCaptureMapPosition={() => null}
            mapPosition={null}
            draftPosition={null}
            activePosition={null}
            onAddPosition={vi.fn()}
            onEditPosition={vi.fn()}
            onBackFromPosition={vi.fn()}
            positionsVersion={0}
            onVisiblePositionsChange={vi.fn()}
            onVisibleTailsChange={vi.fn()}
            isDrawingTail={false}
            tailDraftPoints={[]}
            onStartDrawingTail={vi.fn()}
            onFinishDrawingTail={vi.fn()}
            onExportStory={vi.fn()}
            onImportFile={vi.fn()}
            timelineMode="book"
            timelineIndex={1}
          />
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText(/tile layer url template/i), {
        target: { value: 'https://tile.example.com/{z}/{x}/{y}.png' },
      });
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);

      unmount();
      await act(() => vi.advanceTimersByTimeAsync(0));

      expect(consoleError).not.toHaveBeenCalledWith(
        expect.stringContaining("Can't perform a React state update"),
        expect.anything(),
      );
    } finally {
      consoleError.mockRestore();
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });

  it('clears the form when switching to "New Map"', () => {
    const story = makeStory({ id: 1 });
    const { rerender } = render(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={[story]}
          selectedStoryId={1}
          onSelectStory={vi.fn()}
          onSave={vi.fn()}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    rerender(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={[story]}
          selectedStoryId={null}
          onSelectStory={vi.fn()}
          onSave={vi.fn()}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/map name/i)).toHaveValue('');
    expect(screen.getByLabelText(/tile layer url template/i)).toHaveValue('');
    expect(
      screen.getByText(
        new RegExp(`${DEFAULT_CENTER.lat.toFixed(4)}, ${DEFAULT_CENTER.lng.toFixed(4)}`),
      ),
    ).toBeInTheDocument();
  });

  it('forwards story selection from the story selector', async () => {
    const onSelectStory = vi.fn();
    const user = userEvent.setup();
    const stories = [makeStory({ id: 1 }), makeStory({ id: 2, name: 'The Wheel of Time' })];
    render(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={stories}
          selectedStoryId={1}
          onSelectStory={onSelectStory}
          onSave={vi.fn()}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /a song of ice and fire/i }));
    await user.click(screen.getByRole('option', { name: /the wheel of time/i }));

    expect(onSelectStory).toHaveBeenCalledWith(2);
  });

  it('disables the Export menu item until a story is selected, and calls onExportStory when clicked', async () => {
    const onExportStory = vi.fn();
    const user = userEvent.setup();
    const stories = [makeStory({ id: 1 })];
    const { rerender } = render(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={stories}
          selectedStoryId={null}
          onSelectStory={vi.fn()}
          onExportStory={onExportStory}
          onImportFile={vi.fn()}
          onSave={vi.fn()}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /new map/i }));
    expect(screen.getByRole('button', { name: /export as yaml/i })).toBeDisabled();
    await user.keyboard('{Escape}');

    rerender(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={stories}
          selectedStoryId={1}
          onSelectStory={vi.fn()}
          onExportStory={onExportStory}
          onImportFile={vi.fn()}
          onSave={vi.fn()}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /a song of ice and fire/i }));
    await user.click(screen.getByRole('button', { name: /export as yaml/i }));
    expect(onExportStory).toHaveBeenCalled();
  });

  it('shows a Delete Story button only once a story is selected', () => {
    render(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={[]}
          selectedStoryId={null}
          onSelectStory={vi.fn()}
          onSave={vi.fn()}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: /delete story/i })).not.toBeInTheDocument();
  });

  it('asks for confirmation before deleting, and only calls onDeleteStory once confirmed', async () => {
    const onDeleteStory = vi.fn();
    const user = userEvent.setup();
    const story = makeStory({ id: 1, name: 'A Song of Ice and Fire' });
    render(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={[story]}
          selectedStoryId={1}
          onSelectStory={vi.fn()}
          onSave={vi.fn()}
          onDeleteStory={onDeleteStory}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /delete story/i }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent(/delete “A Song of Ice and Fire”\?/i);
    expect(onDeleteStory).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(onDeleteStory).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /delete story/i }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(onDeleteStory).toHaveBeenCalled();
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
  });

  it('captures the current map position and reflects it in the display and on save', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    const story = makeStory({ id: 1 });
    render(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={[story]}
          selectedStoryId={1}
          onSelectStory={vi.fn()}
          onSave={onSave}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => ({ center: { lat: 40.7128, lng: -74.006 }, zoom: 10 })}
          mapPosition={{ center: { lat: 40.7128, lng: -74.006 }, zoom: 10 }}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /use current map position/i }));

    expect(screen.getByText(/40\.7128, -74\.0060 · Zoom 10/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        initialCenter: { lat: 40.7128, lng: -74.006 },
        initialZoom: 10,
        minZoom: 0,
        maxZoom: 19,
      }),
    );
  });

  it('leaves the displayed position unchanged when the map is not ready', async () => {
    const user = userEvent.setup();
    const story = makeStory({ id: 1 });
    render(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={[story]}
          selectedStoryId={1}
          onSelectStory={vi.fn()}
          onSave={vi.fn()}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={{ center: { lat: 10, lng: 10 }, zoom: 3 }}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /use current map position/i }));

    expect(screen.getByText(/51\.5000, -0\.1278 · Zoom 6/)).toBeInTheDocument();
  });

  it('hides the tile layer author/attribution fields until the tile URL template is valid', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={[]}
          selectedStoryId={null}
          onSelectStory={vi.fn()}
          onSave={vi.fn()}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByLabelText(/tile layer author/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/tile layer attribution url/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/tile layer url template/i), 'not-a-valid-url');
    expect(screen.queryByLabelText(/tile layer author/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/tile layer url template/i), {
      target: { value: 'https://tile.example.com/{z}/{x}/{y}.png' },
    });
    expect(screen.getByLabelText(/tile layer author/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tile layer attribution url/i)).toBeInTheDocument();
  });

  it('opens and closes the tile URL template help dialog', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={[]}
          selectedStoryId={null}
          onSelectStory={vi.fn()}
          onSave={vi.fn()}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /explain how to fill in this field/i }));
    await screen.findByRole('dialog');

    // TileUrlHelpDialog's own content and interactions are covered in
    // TileUrlHelpDialog.test.tsx; this just proves the button opens it.
    await user.click(screen.getByRole('button', { name: /close/i }));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
  });

  it('shows one section at a time, collapsing the previous one when another is opened', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={[]}
          selectedStoryId={1}
          onSelectStory={vi.fn()}
          onSave={vi.fn()}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/map name/i)).toBeVisible();
    expect(await screen.findByText(/no books yet/i)).not.toBeVisible();

    await user.click(screen.getByRole('button', { name: /^books/i }));

    expect(screen.getByText(/no books yet/i)).toBeVisible();
    expect(screen.getByLabelText(/map name/i)).not.toBeVisible();

    await user.click(screen.getByRole('button', { name: /^books/i }));

    expect(screen.getByText(/no books yet/i)).not.toBeVisible();
  });

  it('renders the Television, Characters, and Markers sections', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={[]}
          selectedStoryId={1}
          onSelectStory={vi.fn()}
          onSave={vi.fn()}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /^television/i }));
    expect(screen.getByText(/no television seasons yet/i)).toBeVisible();

    await user.click(screen.getByRole('button', { name: /^characters/i }));
    expect(screen.getByText(/no characters yet/i)).toBeVisible();

    await user.click(screen.getByRole('button', { name: /^markers/i }));
    expect(screen.getByText(/no markers yet/i)).toBeVisible();
  });

  it('hides the Books/Television/Characters/Markers sections for a brand new, unsaved map', () => {
    render(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={[]}
          selectedStoryId={null}
          onSelectStory={vi.fn()}
          onSave={vi.fn()}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: /^books/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^television/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^characters/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^markers/i })).not.toBeInTheDocument();
  });

  it('re-collapses to the Map section when switching stories', async () => {
    const user = userEvent.setup();
    const stories = [makeStory({ id: 1 }), makeStory({ id: 2, name: 'The Wheel of Time' })];
    const { rerender } = render(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={stories}
          selectedStoryId={1}
          onSelectStory={vi.fn()}
          onSave={vi.fn()}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /^books/i }));
    expect(await screen.findByText(/no books yet/i)).toBeVisible();

    rerender(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={stories}
          selectedStoryId={2}
          onSelectStory={vi.fn()}
          onSave={vi.fn()}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/map name/i)).toBeVisible();
  });

  it('opens the Books section from a #books URL hash', async () => {
    window.location.hash = '#books';
    render(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={[]}
          selectedStoryId={1}
          onSelectStory={vi.fn()}
          onSave={vi.fn()}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/no books yet/i)).toBeVisible();
    expect(screen.getByLabelText(/map name/i)).not.toBeVisible();
  });

  it('expands the Nth book from a #books-N URL hash', async () => {
    const story = await createStory({
      name: 'A Song of Ice and Fire',
      tileUrlTemplate: null,
      tileLayerAuthor: null,
      tileLayerAttributionUrl: null,
      initialCenter: { lat: 0, lng: 0 },
      initialZoom: 4,
      minZoom: 0,
      maxZoom: 19,
    });
    await createBook({
      storyId: story.id,
      name: 'A Game of Thrones',
      author: null,
      url: null,
      sortOrder: 0,
    });
    await createBook({
      storyId: story.id,
      name: 'A Clash of Kings',
      author: null,
      url: null,
      sortOrder: 1,
    });
    window.location.hash = '#books-2';

    render(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={[story]}
          selectedStoryId={story.id}
          onSelectStory={vi.fn()}
          onSave={vi.fn()}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    expect(await screen.findByDisplayValue('A Clash of Kings')).toBeVisible();
    expect(screen.getByDisplayValue('A Game of Thrones')).not.toBeVisible();
  });

  it('expands the Nth character from a #characters-N URL hash', async () => {
    const story = await createStory({
      name: 'A Song of Ice and Fire',
      tileUrlTemplate: null,
      tileLayerAuthor: null,
      tileLayerAttributionUrl: null,
      initialCenter: { lat: 0, lng: 0 },
      initialZoom: 4,
      minZoom: 0,
      maxZoom: 19,
    });
    await createCharacter({
      storyId: story.id,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 0,
      url: null,
    });
    await createCharacter({
      storyId: story.id,
      name: 'Daenerys Targaryen',
      group: null,
      icon: null,
      color: null,
      sortOrder: 1,
      url: null,
    });
    window.location.hash = '#characters-2';

    render(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={[story]}
          selectedStoryId={story.id}
          onSelectStory={vi.fn()}
          onSave={vi.fn()}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    await screen.findByText('Jon Snow');
    await waitFor(() => {
      const visibleNameField = screen
        .getAllByLabelText(/^name$/i)
        .find(
          (field) =>
            window.getComputedStyle(field.closest('.MuiCollapse-root')!).visibility !== 'hidden',
        );
      expect(visibleNameField).toHaveValue('Daenerys Targaryen');
    });
  });

  it('ignores a #books hash for a brand new, unsaved map', () => {
    window.location.hash = '#books';
    render(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={[]}
          selectedStoryId={null}
          onSelectStory={vi.fn()}
          onSave={vi.fn()}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/map name/i)).toBeVisible();
  });

  it('ignores a hash that does not name a known section', () => {
    window.location.hash = '#not-a-real-section';
    render(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={[]}
          selectedStoryId={1}
          onSelectStory={vi.fn()}
          onSave={vi.fn()}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/map name/i)).toBeVisible();
  });

  it('responds to the hash changing while already open', async () => {
    render(
      <MemoryRouter initialEntries={['/edit']}>
        <EditorSidebar
          stories={[]}
          selectedStoryId={1}
          onSelectStory={vi.fn()}
          onSave={vi.fn()}
          onDeleteStory={vi.fn()}
          onCaptureMapPosition={() => null}
          mapPosition={null}
          draftPosition={null}
          activePosition={null}
          onAddPosition={vi.fn()}
          onEditPosition={vi.fn()}
          onBackFromPosition={vi.fn()}
          positionsVersion={0}
          onVisiblePositionsChange={vi.fn()}
          onVisibleTailsChange={vi.fn()}
          isDrawingTail={false}
          tailDraftPoints={[]}
          onStartDrawingTail={vi.fn()}
          onFinishDrawingTail={vi.fn()}
          onExportStory={vi.fn()}
          onImportFile={vi.fn()}
          timelineMode="book"
          timelineIndex={1}
        />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/no television seasons yet/i)).not.toBeVisible();

    window.location.hash = '#television';

    expect(await screen.findByText(/no television seasons yet/i)).toBeVisible();
  });

  it('lists a newly saved position once the user returns from editing it', async () => {
    const story = await createStory({
      name: 'A Song of Ice and Fire',
      tileUrlTemplate: null,
      tileLayerAuthor: null,
      tileLayerAttributionUrl: null,
      initialCenter: { lat: 39.8283, lng: -98.5795 },
      initialZoom: 4,
      minZoom: 0,
      maxZoom: 19,
    });
    await createCharacter({
      storyId: story.id,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 2,
      url: null,
    });
    const user = userEvent.setup();
    render(<DraggableEditorSidebar stories={[story]} selectedStoryId={story.id} />);

    await user.click(screen.getByRole('button', { name: /^characters$/i }));
    await user.click(await screen.findByText('Jon Snow'));
    await user.click(screen.getByRole('button', { name: /^position$/i }));

    await user.click(screen.getByRole('button', { name: /simulate drag/i }));
    await waitFor(() => expect(screen.getByText('51.5000, -0.1278')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /back to sidebar/i }));

    expect(await screen.findByText('Always visible')).toBeInTheDocument();
  });

  it('reopens an existing position, prefilled, when it is clicked in the list', async () => {
    const story = await createStory({
      name: 'A Song of Ice and Fire',
      tileUrlTemplate: null,
      tileLayerAuthor: null,
      tileLayerAttributionUrl: null,
      initialCenter: { lat: 39.8283, lng: -98.5795 },
      initialZoom: 4,
      minZoom: 0,
      maxZoom: 19,
    });
    const character = await createCharacter({
      storyId: story.id,
      name: 'Jon Snow',
      group: null,
      icon: null,
      color: null,
      sortOrder: 3,
      url: null,
    });
    await createCharacterPosition({
      characterId: character.id,
      position: { lat: 51.5, lng: -0.1278 },
      dead: true,
      note: null,
      tail: null,
      chapterRange: null,
      episodeRange: null,
    });
    const user = userEvent.setup();
    render(<DraggableEditorSidebar stories={[story]} selectedStoryId={story.id} />);

    await user.click(screen.getByRole('button', { name: /^characters$/i }));
    await user.click(await screen.findByText('Jon Snow'));
    await user.click(await screen.findByText('Always visible'));

    expect(await screen.findByText('Position 1')).toBeInTheDocument();
    // Matches both the panel's own lat/lng caption and the (now offscreen)
    // list item's primary text for the same position.
    expect(screen.getAllByText('51.5000, -0.1278')).toHaveLength(2);
    expect(screen.getByRole('checkbox', { name: /dead/i })).toBeChecked();
  });
});
