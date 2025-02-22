import { useState, useCallback, useEffect, useRef } from "react";

export function useAudio(audioUrl?: string) {
  const [volume, setVolume] = useState(0.5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioLoadingRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (audioUrl) {
      console.log('Creating new audio with URL:', audioUrl);
      setIsLoading(true);
      const audio = new Audio();
      audio.volume = volume;

      // Create a promise that resolves when the audio is ready
      audioLoadingRef.current = new Promise((resolve, reject) => {
        fetch(audioUrl)
          .then(response => {
            if (!response.ok) {
              throw new Error('Network response was not ok');
            }
            return response.blob();
          })
          .then(blob => {
            const url = URL.createObjectURL(blob);
            audio.src = url;
            audio.load(); // Explicitly load the audio
            audioRef.current = audio;
            setIsLoading(false);
            resolve();
          })
          .catch(error => {
            console.error('Error loading audio:', error);
            setIsLoading(false);
            reject(error);
          });
      });
    }

    return () => {
      if (audioRef.current) {
        const src = audioRef.current.src;
        if (src.startsWith('blob:')) {
          URL.revokeObjectURL(src);
        }
        audioRef.current.pause();
        audioRef.current = null;
      }
      audioLoadingRef.current = null;
      setIsLoading(false);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const play = useCallback(async () => {
    try {
      // Wait for audio to be ready if it's still loading
      if (audioLoadingRef.current) {
        await audioLoadingRef.current;
      }

      if (audioRef.current) {
        console.log('Attempting to play audio...');
        await audioRef.current.play();
        console.log('Audio playing successfully');
        setIsPlaying(true);
      } else {
        console.warn('No audio element available to play');
        throw new Error('No audio element available');
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
      throw error;
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

  return { 
    play, 
    pause, 
    stop, 
    isPlaying,
    isLoading, 
    volume, 
    setVolume, 
    audioRef 
  };
}