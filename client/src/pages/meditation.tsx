import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { BlobAnimation } from "@/components/blob-animation";
import { PlaybackControls } from "@/components/playback-controls";
import { EmotionTracker } from "@/components/emotion-tracker";
import { useAudio } from "@/lib/audio";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type Meditation } from "@shared/schema";

interface MeditationResponse extends Meditation {
  duration: number;
}

export default function Meditation() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showEmotionTracker, setShowEmotionTracker] = useState(false);

  const { data: meditation, isLoading } = useQuery<MeditationResponse>({
    queryKey: ["/api/meditations/" + id],
  });

  const audio = useAudio(id ? `/api/meditations/${id}/audio` : undefined);

  const updateJournalEntry = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PATCH", `/api/meditations/${id}/journal`, {
        emotionAfter: data.emotionBefore,
        notes: data.notes,
        emotions: data.emotions,
      });
    },
    onSuccess: () => {
      setLocation("/history");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save your emotions. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle audio ended event
  useEffect(() => {
    const audioElement = audio.audioRef.current;
    if (audioElement) {
      const handleEnded = () => {
        setShowEmotionTracker(true);
      };
      audioElement.addEventListener('ended', handleEnded);
      return () => {
        audioElement.removeEventListener('ended', handleEnded);
      };
    }
  }, [audio.audioRef.current]);

  // Handle audio error
  useEffect(() => {
    const audioElement = audio.audioRef.current;
    if (audioElement) {
      const handleError = (e: ErrorEvent) => {
        toast({
          title: "Audio Error",
          description: "Failed to play meditation audio. Please try again.",
          variant: "destructive",
        });
      };
      audioElement.addEventListener('error', handleError);
      return () => {
        audioElement.removeEventListener('error', handleError);
      };
    }
  }, [audio.audioRef.current]);

  useEffect(() => {
    if (meditation) {
      audio.play();
    }
    return () => {
      audio.stop();
    };
  }, [meditation]);


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

  if (showEmotionTracker) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <EmotionTracker
            meditationId={parseInt(id!)}
            onSubmit={updateJournalEntry.mutate}
          />
          <Button
            variant="link"
            className="mt-4 w-full"
            onClick={() => setLocation("/history")}
          >
            Skip for now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex flex-col items-center justify-center p-4">
      <BlobAnimation isPlaying={audio.isPlaying} />

      <div className="mt-8 w-full max-w-md space-y-4">
        {/* Playback Controls */}
        <PlaybackControls
          isPlaying={audio.isPlaying}
          onPlayPause={() => audio.isPlaying ? audio.pause() : audio.play()}
          volume={audio.volume}
          onVolumeChange={audio.setVolume}
        />
      </div>
    </div>
  );
}