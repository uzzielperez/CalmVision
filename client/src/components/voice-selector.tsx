import { Check, ChevronsUpDown } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Voice {
  voice_id: string;
  name: string;
}

interface VoiceSelectorProps {
  voices: Voice[];
  selectedVoiceId?: string;
  onVoiceChange: (voiceId: string) => void;
}

export function VoiceSelector({ voices, selectedVoiceId, onVoiceChange }: VoiceSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const selectedVoice = voices.find(voice => voice.voice_id === selectedVoiceId);

  // Auto-select first voice if none selected
  React.useEffect(() => {
    if (!selectedVoiceId && voices.length > 0) {
      onVoiceChange(voices[0].voice_id);
    }
  }, [voices, selectedVoiceId]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedVoice?.name || "Select a voice..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search voices..." />
          <CommandEmpty>No voice found.</CommandEmpty>
          <CommandGroup>
            {voices.map((voice) => (
              <CommandItem
                key={voice.voice_id}
                onSelect={() => {
                  onVoiceChange(voice.voice_id);
                  setOpen(false);
                }}
                className="flex items-center"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedVoiceId === voice.voice_id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div>{voice.name}</div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}