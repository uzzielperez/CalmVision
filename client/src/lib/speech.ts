import { useState, useCallback, useEffect } from "react";

interface VoiceWithAccent extends SpeechSynthesisVoice {
  accent?: string;
}

export function useSpeech() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance>();
  const [voices, setVoices] = useState<VoiceWithAccent[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceWithAccent | null>(null);

  useEffect(() => {
    function loadVoices() {
      const availableVoices = speechSynthesis.getVoices();

      // Process voices to identify accents
      const processedVoices = availableVoices.map(voice => {
        const voiceWithAccent: VoiceWithAccent = voice;
        const name = voice.name.toLowerCase();

        if (name.includes('british') || name.includes('uk')) {
          voiceWithAccent.accent = 'British';
        } else if (name.includes('irish')) {
          voiceWithAccent.accent = 'Irish';
        } else if (name.includes('australian') || name.includes('au')) {
          voiceWithAccent.accent = 'Australian';
        } else if (name.includes('scottish') || name.includes('scotland')) {
          voiceWithAccent.accent = 'Scottish';
        }

        return voiceWithAccent;
      });

      setVoices(processedVoices);

      // Try to find a preferred accent voice as default
      const defaultVoice = processedVoices.find(voice => 
        voice.accent === 'British' || 
        voice.accent === 'Irish' ||
        voice.accent === 'Australian' ||
        voice.accent === 'Scottish'
      ) || processedVoices.find(voice => 
        voice.name.toLowerCase().includes('female') || 
        voice.name.toLowerCase().includes('samantha')
      ) || processedVoices[0];

      setSelectedVoice(defaultVoice);
    }

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = useCallback((text: string) => {
    const sentences = text
      .replace(/\.\s+/g, '.|')  // Split on periods
      .replace(/\?\s+/g, '?|')  // Split on question marks
      .replace(/!\s+/g, '!|')   // Split on exclamation marks
      .split('|')               // Split into array
      .filter(sentence => sentence.trim().length > 0);

    let currentIndex = 0;

    function speakNextSentence() {
      if (currentIndex < sentences.length) {
        const newUtterance = new SpeechSynthesisUtterance(sentences[currentIndex]);

        if (selectedVoice) {
          newUtterance.voice = selectedVoice;
        }

        // Adjust speech parameters for a more calming, relaxed effect
        newUtterance.rate = 0.7;  // Slower for meditation
        newUtterance.pitch = 0.9; // Slightly lower pitch for a calmer tone
        newUtterance.volume = 0.8;

        newUtterance.onend = () => {
          currentIndex++;
          // Add a pause between sentences
          setTimeout(speakNextSentence, 800);
        };

        newUtterance.onstart = () => setIsPlaying(true);
        newUtterance.onpause = () => setIsPlaying(false);
        newUtterance.onresume = () => setIsPlaying(true);

        setUtterance(newUtterance);
        speechSynthesis.speak(newUtterance);
      } else {
        setIsPlaying(false);
      }
    }

    // Start speaking
    stop(); // Stop any current speech
    speakNextSentence();
    setIsPlaying(true);
  }, [selectedVoice]);

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

  return { 
    speak, 
    stop, 
    pause, 
    resume, 
    isPlaying,
    voices,
    selectedVoice,
    setSelectedVoice
  };
}