import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Star, Trash2, Play } from "lucide-react";
import { motion } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { type Meditation } from "@shared/schema";

export default function History() {
  const { toast } = useToast();
  const { data: meditations, isLoading } = useQuery<Meditation[]>({
    queryKey: ["/api/meditations"],
  });

  const deleteMeditation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/meditations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meditations"] });
      toast({
        title: "Success",
        description: "Meditation deleted successfully",
      });
    },
  });

  const rateMeditation = useMutation({
    mutationFn: async ({ id, rating }: { id: number; rating: number }) => {
      await apiRequest("PATCH", `/api/meditations/${id}/rate`, { rating });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meditations"] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <Card className="p-8">
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            Loading your meditation history...
          </motion.div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            Your Meditation History
          </h1>
          <Button variant="outline" asChild>
            <Link href="/">New Meditation</Link>
          </Button>
        </div>

        {meditations?.map((meditation) => (
          <Card key={meditation.id} className="w-full">
            <CardHeader className="pb-3">
              <h2 className="text-xl font-semibold">{meditation.prompt}</h2>
              <p className="text-sm text-muted-foreground">
                {new Date(meditation.createdAt!).toLocaleDateString()}
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Button
                    key={rating}
                    variant="ghost"
                    size="sm"
                    onClick={() => rateMeditation.mutate({ id: meditation.id, rating })}
                  >
                    <Star
                      className={`h-5 w-5 ${
                        meditation.rating && rating <= meditation.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  </Button>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMeditation.mutate(meditation.id)}
                disabled={deleteMeditation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button variant="default" size="sm" asChild>
                <Link href={`/meditation/${meditation.id}`}>
                  <Play className="h-4 w-4 mr-2" />
                  Play
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}

        {(!meditations || meditations.length === 0) && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              You haven't created any meditations yet.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/">Create Your First Meditation</Link>
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
