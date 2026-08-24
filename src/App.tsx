import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { EditScreen } from './screens/EditScreen';
import { ViewScreen } from './screens/ViewScreen';

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
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/edit/:storyId?" element={<EditScreen />} />
      <Route path="/view/:storyId?" element={<ViewScreen />} />
    </Routes>
  );
}

export default App;
