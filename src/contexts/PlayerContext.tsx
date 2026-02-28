import { createContext, useContext, useState, ReactNode } from "react";

import artist1 from "@/assets/artist-1.jpg";
import artist2 from "@/assets/artist-2.jpg";
import artist3 from "@/assets/artist-3.jpg";

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  artwork: string;
  duration: number;
}

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
}

interface PlayerContextType extends PlayerState {
  playTrack: (track: Track) => void;
  togglePlayPause: () => void;
  setCurrentTime: (time: number) => void;
  setVolume: (volume: number) => void;
  stopPlayback: () => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

// Mock tracks library
export const tracksLibrary: Record<string, Track> = {
  "1": {
    id: "1",
    title: "Midnight Protocol",
    artist: "NOVA",
    album: "Digital Dreams",
    artwork: artist1,
    duration: 234,
  },
  "2": {
    id: "2",
    title: "Velvet Skies",
    artist: "AURA",
    album: "Ethereal",
    artwork: artist2,
    duration: 198,
  },
  "3": {
    id: "3",
    title: "Lost Frequency",
    artist: "ECHO",
    album: "Signals",
    artwork: artist3,
    duration: 267,
  },
};

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<PlayerState>({
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    volume: 75,
  });

  const playTrack = (track: Track) => {
    setState((prev) => ({
      ...prev,
      currentTrack: track,
      isPlaying: true,
      currentTime: 0,
    }));
  };

  const togglePlayPause = () => {
    setState((prev) => ({
      ...prev,
      isPlaying: !prev.isPlaying,
    }));
  };

  const setCurrentTime = (time: number) => {
    setState((prev) => ({
      ...prev,
      currentTime: time,
    }));
  };

  const setVolume = (volume: number) => {
    setState((prev) => ({
      ...prev,
      volume,
    }));
  };

  const stopPlayback = () => {
    setState((prev) => ({
      ...prev,
      currentTrack: null,
      isPlaying: false,
      currentTime: 0,
    }));
  };

  return (
    <PlayerContext.Provider
      value={{
        ...state,
        playTrack,
        togglePlayPause,
        setCurrentTime,
        setVolume,
        stopPlayback,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
};
