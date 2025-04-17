import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { History, PlusCircle } from "lucide-react";
import { BlobAnimation } from "@/components/blob-animation";
import { PlaybackControls } from "@/components/playback-controls";
import { VoiceSelector } from "@/components/voice-selector";
import { useAudio } from "@/lib/audio";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type Meditation } from "@shared/schema";

interface MeditationResponse extends Meditation {
  duration: number;
}

interface Voice {
  voice_id: string;
  name: string;
}

interface VoicesResponse {
  voices: Voice[];
}

export default function Meditation() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>();
  const [retryCount, setRetryCount] = useState(0);
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  // Fetch meditation data
  const { data: meditation, isLoading: meditationLoading } = useQuery<MeditationResponse>({
    queryKey: [`/api/meditations/${id}`],
  });

  // Fetch available voices
  const { data: voicesResponse, isLoading: voicesLoading } = useQuery<VoicesResponse>({
    queryKey: ['/api/voices'],
  });

  const voices = voicesResponse?.voices || [];

  // Initialize audio
  const audio = useAudio(
    id && selectedVoiceId
      ? `/api/meditations/${id}/audio?voice_id=${selectedVoiceId}`
      : undefined
  );

  // Handle audio playback errors with retry logic
  useEffect(() => {
    const audioElement = audio.audioRef.current;
    if (!audioElement) return;

    const handleError = async (e: any) => {
      console.error('Audio playback error:', e);

      // Retry logic (up to 3 times)
      if (retryCount < 3) {
        setTimeout(() => {
          setRetryCount((prev) => prev + 1);
          audio.play();
        }, 2000 * (retryCount + 1)); // Exponential backoff

        toast({
          title: "Retrying playback",
          description: "Please wait a moment while we retry...",
        });
      } else {
        // Fetch error details from the server
        try {
          const errorResponse = await fetch(`/api/meditations/${id}/audio?voice_id=${selectedVoiceId}`);
          const errorData = await errorResponse.json();

          toast({
            title: "Audio Generation Failed",
            description:
              errorData.error ||
              "Failed to generate audio. Please try selecting a different voice or using a shorter meditation.",
            variant: "destructive",
          });
        } catch {
          toast({
            title: "Audio Error",
            description: "Failed to play meditation audio. Please try selecting a different voice.",
            variant: "destructive",
          });
        }
      }
    };

    audioElement.addEventListener('error', handleError);
    return () => {
      audioElement.removeEventListener('error', handleError);
    };
  }, [audio.audioRef.current, retryCount, id, selectedVoiceId]);

  // Play audio when meditation and voice are selected
  useEffect(() => {
    if (meditation && selectedVoiceId) {
      setRetryCount(0); // Reset retry count when voice changes
      setIsAudioLoading(true);

      // Wait a brief moment to ensure audio is initialized
      setTimeout(() => {
        audio
          .play()
          .then(() => setIsAudioLoading(false))
          .catch((error) => {
            console.error('Failed to play audio:', error);
            setIsAudioLoading(false);
          });
      }, 1000);
    }

    return () => {
      audio.stop();
    };
  }, [meditation, selectedVoiceId]);

  // Loading state
  if (meditationLoading || voicesLoading) {
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

  // Render the meditation page
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex flex-col items-center justify-center p-4">
      {/* Navigation Buttons */}
      <div className="fixed top-4 right-4 flex gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link href="/history">
            <History className="h-5 w-5" />
          </Link>
        </Button>
        <Button variant="outline" size="icon" asChild>
          <Link href="/">
            <PlusCircle className="h-5 w-5" />
          </Link>
        </Button>
      </div>

      {/* Blob Animation */}
      <BlobAnimation isPlaying={audio.isPlaying} />

      {/* Meditation Content */}
      <div className="mt-8 w-full max-w-md space-y-4">
        {/* Meditation Description */}
        <Card>
          <CardHeader>
            <CardTitle>Your Meditation Journey</CardTitle>
            <CardDescription className="text-lg">
              {meditation?.prompt}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Voice Selection */}
        <Card className="p-4">
          <CardContent className="p-0">
            <VoiceSelector
              voices={voices}
              selectedVoiceId={selectedVoiceId}
              onVoiceChange={(voiceId) => {
                audio.stop();
                setSelectedVoiceId(voiceId);
              }}
            />
          </CardContent>
        </Card>

        {/* Playback Controls */}
        <PlaybackControls
          isPlaying={audio.isPlaying || isAudioLoading || audio.isLoading}
          onPlayPause={() => (audio.isPlaying ? audio.pause() : audio.play())}
          volume={audio.volume}
          onVolumeChange={audio.setVolume}
        />
      </div>
    </div>
  );
}