import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { History } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { type Meditation } from "@shared/schema";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const createMeditation = useMutation({
    mutationFn: async (prompt: string) => {
      const res = await apiRequest("POST", "/api/meditations", { prompt });
      return res.json() as Promise<Meditation & { duration: number }>;
    },
    onSuccess: (data) => {
      setLocation(`/meditation/${data.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate meditation. Please try again.",
        variant: "destructive",
      });
    },
  });

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

            <Button
              onClick={() => createMeditation.mutate(prompt)}
              disabled={!prompt || createMeditation.isPending}
              className="w-full"
            >
              {createMeditation.isPending ? "Generating..." : "Begin Meditation"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}