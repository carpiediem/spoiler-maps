import { Navigate, Route, Routes } from 'react-router-dom';
import { EditScreen } from './screens/EditScreen';
import { ViewScreen } from './screens/ViewScreen';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/edit" replace />} />
      <Route path="/edit/:storyId?" element={<EditScreen />} />
      <Route path="/view/:storyId?" element={<ViewScreen />} />
    </Routes>
  );
}

export default App;
