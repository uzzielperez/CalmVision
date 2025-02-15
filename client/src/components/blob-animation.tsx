import { motion } from "framer-motion";

interface BlobAnimationProps {
  isPlaying: boolean;
}

export function BlobAnimation({ isPlaying }: BlobAnimationProps) {
  return (
    <motion.div
      animate={isPlaying ? {
        scale: [1, 1.1, 1],
        opacity: [0.8, 1, 0.8],
      } : { scale: 1, opacity: 0.8 }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className="w-64 h-64 rounded-full bg-gradient-to-r from-purple-500/30 to-blue-500/30 backdrop-blur-xl"
    />
  );
}
