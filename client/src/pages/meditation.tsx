import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { motion } from "framer-motion";
import { BlobAnimation } from "@/components/blob-animation";
import { PlaybackControls } from "@/components/playback-controls";
import { VoiceSelector } from "@/components/voice-selector";
import { useAudio } from "@/lib/audio";
import { useSpeech } from "@/lib/speech";
import { Card, CardContent } from "@/components/ui/card";
import { type Meditation } from "@shared/schema";

interface MeditationResponse extends Meditation {
  duration: number;
}

export default function Meditation() {
  const { id } = useParams();
  const audio = useAudio();
  const speech = useSpeech();

  const { data: meditation, isLoading } = useQuery<MeditationResponse>({
    queryKey: ["/api/meditations/" + id],
  });

  useEffect(() => {
    if (meditation) {
      speech.speak(meditation.content);
      audio.play();
    }
    return () => {
      speech.stop();
      audio.stop();
    };
  }, [meditation, speech.selectedVoice]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <Card className="p-8">
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            Preparing your meditation...
          </motion.div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex flex-col items-center justify-center p-4">
      <BlobAnimation isPlaying={speech.isPlaying} />

      <div className="mt-8 w-full max-w-md space-y-4">
        {/* Voice Selection */}
        <Card className="p-4">
          <CardContent className="p-0">
            <VoiceSelector
              voices={speech.voices}
              selectedVoice={speech.selectedVoice}
              onVoiceChange={(voice) => {
                speech.stop();
                speech.setSelectedVoice(voice);
              }}
            />
          </CardContent>
        </Card>

        {/* Playback Controls */}
        <PlaybackControls
          isPlaying={speech.isPlaying}
          onPlayPause={() => speech.isPlaying ? speech.pause() : speech.resume()}
          volume={audio.volume}
          onVolumeChange={audio.setVolume}
        />
      </div>
    </div>
  );
}