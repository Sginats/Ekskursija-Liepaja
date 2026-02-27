import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GameProvider } from './context/GameContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AudioProvider } from './context/AudioContext.jsx';
import { AdminProvider } from './context/AdminContext.jsx';
import AdminPanel from './components/AdminPanel/AdminPanel.jsx';
import MainMenu from './components/MainMenu/index.jsx';
import GameMap from './components/GameMap/index.jsx';
import Leaderboard from './components/Leaderboard/index.jsx';

export default function App() {
  return (
    <ThemeProvider>
      <GameProvider>
        <AdminProvider>
          <AudioProvider>
            <BrowserRouter>
              {/* AdminPanel is outside Routes so it persists on every page */}
              <AdminPanel />
              <Routes>
                <Route path="/"            element={<MainMenu />} />
                <Route path="/play"        element={<GameMap />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="*"            element={<MainMenu />} />
              </Routes>
            </BrowserRouter>
          </AudioProvider>
        </AdminProvider>
      </GameProvider>
    </ThemeProvider>
  );
}
