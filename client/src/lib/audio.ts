import { useState, useEffect, useCallback } from "react";

export function useAudio() {
  const [audioContext, setAudioContext] = useState<AudioContext>();
  const [gainNode, setGainNode] = useState<GainNode>();
  const [oscillators, setOscillators] = useState<OscillatorNode[]>([]);
  const [volume, setVolume] = useState(0.5);

  useEffect(() => {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.value = volume;

    setAudioContext(ctx);
    setGainNode(gain);

    return () => {
      oscillators.forEach(osc => {
        try {
          osc.stop();
        } catch (e) {
          // Ignore if already stopped
        }
      });
      ctx.close();
    };
  }, []);

  useEffect(() => {
    if (gainNode) {
      gainNode.gain.value = volume;
    }
  }, [volume, gainNode]);

  const play = useCallback(() => {
    if (audioContext && gainNode) {
      // Clean up any existing oscillators
      oscillators.forEach(osc => {
        try {
          osc.stop();
        } catch (e) {
          // Ignore if already stopped
        }
      });

      // Create filter for smoother sound
      const filter = audioContext.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1000;
      filter.Q.value = 0.5;
      filter.connect(gainNode);

      // Create multiple oscillators for a richer ambient sound
      const newOscillators: OscillatorNode[] = [];

      // Base frequency oscillator (432 Hz - known for its calming properties)
      const baseOsc = audioContext.createOscillator();
      baseOsc.type = "sine";
      baseOsc.frequency.value = 432;
      baseOsc.connect(filter);

      // Higher harmonics for texture
      const harmonic1 = audioContext.createOscillator();
      harmonic1.type = "sine";
      harmonic1.frequency.value = 432 * 1.5;
      harmonic1.connect(filter);

      // Low drone for grounding
      const drone = audioContext.createOscillator();
      drone.type = "sine";
      drone.frequency.value = 432 / 2;
      drone.connect(filter);

      // Start all oscillators
      [baseOsc, harmonic1, drone].forEach(osc => {
        osc.start();
        newOscillators.push(osc);
      });

      setOscillators(newOscillators);
    }
  }, [audioContext, gainNode, oscillators]);

  const stop = useCallback(() => {
    oscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {
        // Ignore if already stopped
      }
    });
    setOscillators([]);
  }, [oscillators]);

  return { play, stop, volume, setVolume };
}