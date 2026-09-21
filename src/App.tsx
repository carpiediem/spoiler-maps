import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

// Each screen is its own chunk, so opening a share link to /view doesn't
// download the editor (Tiptap, the sidebar, the form library) and vice versa.
const EditScreen = lazy(() =>
  import('./screens/EditScreen').then((m) => ({ default: m.EditScreen })),
);
const ViewScreen = lazy(() =>
  import('./screens/ViewScreen').then((m) => ({ default: m.ViewScreen })),
);

/** `/` redirects to `/edit` by default, but a `?d=` (a share link's story URL) means to `/view` instead. */
function RootRedirect() {
  const { search } = useLocation();
  const hasDataUrl = new URLSearchParams(search).has('d');
  return (
    <>
      {/* <Navigate> triggers the redirect from an effect, not during this
          render — so this render commits (and can be observed, e.g. by an
          accessibility scanner) before it happens. An empty page here would
          have no main landmark for that instant; this keeps one present the
          whole time, matching every route it redirects to. */}
      <main />
      <Navigate to={hasDataUrl ? `/view${search}` : '/edit'} replace />
    </>
  );
}

function App() {
  return (
    // The fallback is an empty <main> for the same reason RootRedirect renders
    // one: there's always a main landmark, even while a screen's chunk loads.
    <Suspense fallback={<main />}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/edit/:storyId?" element={<EditScreen />} />
        <Route path="/view/:storyId?" element={<ViewScreen />} />
      </Routes>
    </Suspense>
  );
}

export default App;
