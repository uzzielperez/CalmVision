import { useState, useEffect, useCallback } from "react";

export function useAudio() {
  const [audioContext, setAudioContext] = useState<AudioContext>();
  const [gainNode, setGainNode] = useState<GainNode>();
  const [oscillator, setOscillator] = useState<OscillatorNode>();
  const [volume, setVolume] = useState(0.5);

  useEffect(() => {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.value = volume;

    setAudioContext(ctx);
    setGainNode(gain);

    return () => {
      if (oscillator) {
        oscillator.stop();
      }
      ctx.close();
    };
  }, []);

  useEffect(() => {
    if (gainNode) {
      gainNode.gain.value = volume;
    }
  }, [volume, gainNode]);

  const play = useCallback(() => {
    if (audioContext && gainNode && !oscillator) {
      const osc = audioContext.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 432;
      osc.connect(gainNode);
      osc.start();
      setOscillator(osc);
    }
  }, [audioContext, gainNode, oscillator]);

  const stop = useCallback(() => {
    if (oscillator) {
      oscillator.stop();
      setOscillator(undefined);
    }
  }, [oscillator]);

  return { play, stop, volume, setVolume };
}