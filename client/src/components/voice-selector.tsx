import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Voice {
  id: string;
  name: string;
}

interface VoiceSelectorProps {
  voices: Voice[];
  selectedVoiceId?: string;
  onVoiceChange: (voiceId: string) => void;
}

export function VoiceSelector({
  voices,
  selectedVoiceId,
  onVoiceChange,
}: VoiceSelectorProps) {
  return (
    <Select value={selectedVoiceId} onValueChange={onVoiceChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a voice" />
      </SelectTrigger>
      <SelectContent className="max-h-[300px] overflow-y-auto">
        {voices.map((voice) => (
          <SelectItem key={voice.id} value={voice.id}>
            {voice.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}