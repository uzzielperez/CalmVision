import { useState, useCallback, useEffect } from "react";

export function useAudio() {
  const [audio, setAudio] = useState<HTMLAudioElement>();
  const [volume, setVolume] = useState(0.5);

  useEffect(() => {
    const audioElement = document.getElementById('meditation-water') as HTMLAudioElement;
    if (audioElement) {
      audioElement.volume = volume;
      setAudio(audioElement);
    }
  }, []);

  useEffect(() => {
    if (audio) {
      audio.volume = volume;
    }
  }, [volume, audio]);

  const play = useCallback(() => {
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
      });
    }
  }, [audio]);

  const stop = useCallback(() => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [audio]);

  return { play, stop, volume, setVolume };
}