import { Volume2, VolumeX, Pause, Play } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

interface PlaybackControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  volume: number;
  onVolumeChange: (value: number) => void;
}

export function PlaybackControls({
  isPlaying,
  onPlayPause,
  volume,
  onVolumeChange,
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center gap-4 bg-card/50 backdrop-blur-sm p-4 rounded-lg">
      <Button
        variant="ghost"
        size="icon"
        onClick={onPlayPause}
        className="h-12 w-12"
      >
        {isPlaying ? (
          <Pause className="h-6 w-6" />
        ) : (
          <Play className="h-6 w-6" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onVolumeChange(volume === 0 ? 1 : 0)}
      >
        {volume === 0 ? (
          <VolumeX className="h-5 w-5" />
        ) : (
          <Volume2 className="h-5 w-5" />
        )}
      </Button>

      <Slider
        value={[volume * 100]}
        onValueChange={([value]) => onVolumeChange(value / 100)}
        max={100}
        step={1}
        className="w-32"
      />
    </div>
  );
}
