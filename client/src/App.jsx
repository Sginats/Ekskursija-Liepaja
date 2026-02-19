import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GameProvider } from './context/GameContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import MainMenu from './components/MainMenu/index.jsx';
import GameMap from './components/GameMap/index.jsx';

export default function App() {
  return (
    <ThemeProvider>
      <GameProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/"      element={<MainMenu />} />
            <Route path="/play"  element={<GameMap />} />
            <Route path="*"      element={<MainMenu />} />
          </Routes>
        </BrowserRouter>
      </GameProvider>
    </ThemeProvider>
  );
}
