import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

const THEMES = {
  default: {
    '--bg-primary': '#332222',
    '--bg-secondary': '#2a1a1a',
    '--bg-tertiary': '#1a1010',
    '--accent-primary': '#ffaa00',
    '--accent-secondary': '#ff8800',
    '--border-color': '#553333',
    '--text-primary': '#ffffff',
    '--text-secondary': '#cccccc',
  },
  dark: {
    '--bg-primary': '#2d1b4e',
    '--bg-secondary': '#1a0f30',
    '--bg-tertiary': '#0f0820',
    '--accent-primary': '#bb86fc',
    '--accent-secondary': '#9c5cff',
    '--border-color': '#5a3d8a',
    '--text-primary': '#ffffff',
    '--text-secondary': '#d0b8ff',
  },
  light: {
    '--bg-primary': '#4a0f0f',
    '--bg-secondary': '#3a0a0a',
    '--bg-tertiary': '#2a0505',
    '--accent-primary': '#ff4444',
    '--accent-secondary': '#cc2222',
    '--border-color': '#8a3333',
    '--text-primary': '#ffffff',
    '--text-secondary': '#ffcccc',
  },
  blue: {
    '--bg-primary': '#1e3a5f',
    '--bg-secondary': '#2c5f8d',
    '--bg-tertiary': '#1a2f4a',
    '--accent-primary': '#ffd700',
    '--accent-secondary': '#ffed4e',
    '--border-color': '#4a7ba7',
    '--text-primary': '#ffffff',
    '--text-secondary': '#d0e8ff',
  },
};

export const THEME_LABELS = {
  default: 'Noklusejuma',
  dark: 'Violeta',
  light: 'Tumsi sarkana',
  blue: 'Zila',
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(
    () => localStorage.getItem('theme') || 'default'
  );

  const [animationsEnabled, setAnimationsEnabled] = useState(
    () => localStorage.getItem('animationsEnabled') !== '0'
  );

  const [musicVolume, setMusicVolumeState] = useState(
    () => parseInt(localStorage.getItem('musicVolume') || '30', 10)
  );

  const [sfxVolume, setSfxVolumeState] = useState(
    () => parseInt(localStorage.getItem('sfxVolume') || '50', 10)
  );

  useEffect(() => {
    const vars = THEMES[theme] || THEMES.default;
    Object.entries(vars).forEach(([k, v]) => {
      document.documentElement.style.setProperty(k, v);
    });
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (animationsEnabled) {
      document.body.classList.remove('no-animations');
    } else {
      document.body.classList.add('no-animations');
    }
  }, [animationsEnabled]);

  function setTheme(name) {
    setThemeState(name);
    localStorage.setItem('theme', name);
  }

  function toggleAnimations(enabled) {
    setAnimationsEnabled(enabled);
    localStorage.setItem('animationsEnabled', enabled ? '1' : '0');
  }

  function setMusicVolume(v) {
    setMusicVolumeState(v);
    localStorage.setItem('musicVolume', v);
  }

  function setSfxVolume(v) {
    setSfxVolumeState(v);
    localStorage.setItem('sfxVolume', v);
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        animationsEnabled,
        toggleAnimations,
        musicVolume,
        setMusicVolume,
        sfxVolume,
        setSfxVolume,
        themeKeys: Object.keys(THEMES),
        THEME_LABELS,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
