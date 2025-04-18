import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { History } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { type Meditation } from "@shared/schema";
import { ModelSelector } from "@/components/model-selector";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState("llama3-70b-8192");

  const { data: models } = useQuery<string[]>({
    queryKey: ['/api/models'],
  });

  const createMeditation = useMutation({
    mutationFn: async ({ prompt }: { prompt: string }) => {
      return apiRequest('/api/meditations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model: selectedModel }),
      });
    },
    onSuccess: (meditation) => {
      // Redirect to the meditation page after creation
      setLocation(`/meditation/${meditation.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create meditation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async () => {
    if (!prompt) {
      toast({
        title: "Error",
        description: "Please enter a meditation prompt.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createMeditation.mutateAsync({ prompt });
    } catch (error) {
      console.error("Failed to create meditation:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center justify-between">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent"
            >
              Mindful Moments
            </motion.h1>
            <Button variant="outline" size="icon" asChild>
              <Link href="/history">
                <History className="h-5 w-5" />
              </Link>
            </Button>
          </div>

          {/* Removed the emotion tracker and directly proceed to meditation generation */}
          <>
            <p className="text-center text-muted-foreground">
              Enter your intention or desired focus for meditation
            </p>

            <div className="space-y-4">
              <Input
                placeholder="e.g., Finding inner peace and clarity..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="text-lg"
              />

              {models && models.length > 0 && (
                <ModelSelector
                  models={models}
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                />
              )}

              <Button
                onClick={handleSubmit}
                disabled={!prompt || createMeditation.isPending}
                className="w-full"
              >
                {createMeditation.isPending ? "Creating..." : "Start Meditation"}
              </Button>
            </div>
          </>
        </CardContent>
      </Card>
    </div>
  );
}