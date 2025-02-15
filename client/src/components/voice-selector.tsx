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

// Group voices by accent
function groupVoicesByAccent(voices: SpeechSynthesisVoice[]) {
  const groups: { [key: string]: SpeechSynthesisVoice[] } = {
    'British Accent': [],
    'Irish Accent': [],
    'Australian Accent': [],
    'Scottish Accent': [],
    'Other Voices': []
  };

  voices.forEach(voice => {
    const name = voice.name.toLowerCase();
    if (name.includes('british') || name.includes('uk')) {
      groups['British Accent'].push(voice);
    } else if (name.includes('irish')) {
      groups['Irish Accent'].push(voice);
    } else if (name.includes('australian') || name.includes('au')) {
      groups['Australian Accent'].push(voice);
    } else if (name.includes('scottish') || name.includes('scotland')) {
      groups['Scottish Accent'].push(voice);
    } else {
      groups['Other Voices'].push(voice);
    }
  });

  return Object.entries(groups).filter(([_, voices]) => voices.length > 0);
}

interface VoiceSelectorProps {
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  onVoiceChange: (voice: SpeechSynthesisVoice) => void;
}

export function VoiceSelector({ voices, selectedVoice, onVoiceChange }: VoiceSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const groupedVoices = groupVoicesByAccent(voices);

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
          {groupedVoices.map(([group, voices]) => (
            <CommandGroup key={group} heading={group}>
              {voices.map((voice) => (
                <CommandItem
                  key={voice.name}
                  onSelect={() => {
                    onVoiceChange(voice);
                    setOpen(false);
                  }}
                  className="flex items-center"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedVoice?.name === voice.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div>
                    <div>{voice.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {voice.lang} - {voice.localService ? "Local" : "Network"}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </Command>
      </PopoverContent>
    </Popover>
  );
}