import { useState, useCallback, useEffect, useRef } from "react";

export function useAudio(audioUrl?: string) {
  const [volume, setVolume] = useState(0.5);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioUrl) {
      console.log('Creating new audio with URL:', audioUrl);
      audioRef.current = new Audio(audioUrl);
      audioRef.current.volume = volume;
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const play = useCallback(async () => {
    if (audioRef.current) {
      console.log('Attempting to play audio...');
      try {
        await audioRef.current.play();
        console.log('Audio playing successfully');
        setIsPlaying(true);
      } catch (error) {
        console.error('Error playing audio:', error);
        setIsPlaying(false);
        throw error;
      }
    } else {
      console.warn('No audio element available to play');
      throw new Error('No audio element available');
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  return { play, pause, stop, isPlaying, volume, setVolume, audioRef };
}