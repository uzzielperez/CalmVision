import * as React from "react";
import { SmilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const emotions = [
  "Calm",
  "Relaxed",
  "Peaceful",
  "Anxious",
  "Stressed",
  "Tired",
  "Energized",
  "Happy",
  "Content",
  "Grateful",
] as const;

const formSchema = z.object({
  emotionBefore: z.number().min(1).max(5),
  emotionAfter: z.number().optional(),
  notes: z.string().optional(),
  emotions: z.array(z.string()).optional(),
});

type Props = {
  meditationId: number;
  onSubmit: (data: z.infer<typeof formSchema>) => void;
  defaultValues?: z.infer<typeof formSchema>;
};

export function EmotionTracker({ meditationId, onSubmit, defaultValues }: Props) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || {
      emotionBefore: 3,
      emotions: [],
    },
  });

  const [selectedEmotions, setSelectedEmotions] = React.useState<string[]>(
    defaultValues?.emotions || []
  );

  const toggleEmotion = (emotion: string) => {
    setSelectedEmotions((prev) => {
      const newEmotions = prev.includes(emotion)
        ? prev.filter((e) => e !== emotion)
        : [...prev, emotion];
      form.setValue("emotions", newEmotions);
      return newEmotions;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SmilePlus className="h-5 w-5" />
          Emotion Tracker
        </CardTitle>
        <CardDescription>
          Track how you feel before and after meditation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="emotionBefore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How do you feel right now? (1-5)</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((number) => (
                        <Button
                          key={number}
                          type="button"
                          variant={field.value === number ? "default" : "outline"}
                          className="w-10 h-10"
                          onClick={() => field.onChange(number)}
                        >
                          {number}
                        </Button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Select emotions you're experiencing:</FormLabel>
              <div className="flex flex-wrap gap-2">
                {emotions.map((emotion) => (
                  <Button
                    key={emotion}
                    type="button"
                    variant={selectedEmotions.includes(emotion) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleEmotion(emotion)}
                  >
                    {emotion}
                  </Button>
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="How are you feeling? What brought you to meditation today?"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              Start Meditation
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
