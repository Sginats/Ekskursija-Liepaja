import React, {
  createContext,
  useContext,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { useTheme } from './ThemeContext.jsx';

const AudioContext = createContext(null);

export function AudioProvider({ children }) {
  const { musicVolume, sfxVolume } = useTheme();

  const musicRef = useRef(null);
  const hoverRef = useRef(null);
  const userInteractedRef = useRef(false);

  // Create audio elements once
  useEffect(() => {
    const music = new Audio('/skana/music.mp3');
    music.loop = true;
    music.volume = musicVolume / 100;
    musicRef.current = music;

    const hover = new Audio('/skana/hover.mp3');
    hover.volume = sfxVolume / 100;
    hover.preload = 'auto';
    hoverRef.current = hover;

    return () => {
      music.pause();
      music.src = '';
      hover.src = '';
    };
  }, []);

  // Sync music volume
  useEffect(() => {
    if (musicRef.current) {
      musicRef.current.volume = musicVolume / 100;
    }
  }, [musicVolume]);

  // Sync SFX volume
  useEffect(() => {
    if (hoverRef.current) {
      hoverRef.current.volume = sfxVolume / 100;
    }
  }, [sfxVolume]);

  // Start music on first user interaction (autoplay policy)
  useEffect(() => {
    const startMusic = () => {
      if (!userInteractedRef.current && musicRef.current) {
        userInteractedRef.current = true;
        musicRef.current.play().catch(() => {});
      }
    };
    document.addEventListener('click', startMusic, { once: true });
    document.addEventListener('keydown', startMusic, { once: true });
    return () => {
      document.removeEventListener('click', startMusic);
      document.removeEventListener('keydown', startMusic);
    };
  }, []);

  const playHover = useCallback(() => {
    if (hoverRef.current && sfxVolume > 0) {
      hoverRef.current.currentTime = 0;
      hoverRef.current.play().catch(() => {});
    }
  }, [sfxVolume]);

  const setMusicRate = useCallback((rate) => {
    if (musicRef.current) {
      musicRef.current.playbackRate = Math.max(0.5, Math.min(4, rate));
    }
  }, []);

  return (
    <AudioContext.Provider value={{ playHover, setMusicRate }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error('useAudio must be used inside AudioProvider');
  return ctx;
}
