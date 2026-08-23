import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { EditScreen } from './screens/EditScreen';
import { ViewScreen } from './screens/ViewScreen';

/** `/` redirects to `/edit` by default, but a `?d=` (a share link's story URL) means to `/view` instead. */
function RootRedirect() {
  const { search } = useLocation();
  const hasDataUrl = new URLSearchParams(search).has('d');
  return <Navigate to={hasDataUrl ? `/view${search}` : '/edit'} replace />;
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
