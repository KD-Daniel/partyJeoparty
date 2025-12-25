import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home, Setup, Lobby, Game, GameMaster, Results, Guide } from './pages';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/guide" element={<Guide />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/room/:code" element={<Lobby />} />
        <Route path="/game/:code" element={<Game />} />
        <Route path="/master/:code" element={<GameMaster />} />
        <Route path="/results/:code" element={<Results />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
