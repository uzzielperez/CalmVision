import { useState, useCallback } from "react";

export function useSpeech() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance>();

  const speak = useCallback((text: string) => {
    const newUtterance = new SpeechSynthesisUtterance(text);
    newUtterance.rate = 0.9;
    newUtterance.pitch = 1;
    
    newUtterance.onstart = () => setIsPlaying(true);
    newUtterance.onend = () => setIsPlaying(false);
    newUtterance.onpause = () => setIsPlaying(false);
    newUtterance.onresume = () => setIsPlaying(true);
    
    setUtterance(newUtterance);
    speechSynthesis.speak(newUtterance);
    setIsPlaying(true);
  }, []);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setIsPlaying(false);
  }, []);

  const pause = useCallback(() => {
    speechSynthesis.pause();
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    speechSynthesis.resume();
    setIsPlaying(true);
  }, []);

  return { speak, stop, pause, resume, isPlaying };
}
