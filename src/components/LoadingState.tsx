import { Heart } from "lucide-react";

export default function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="relative flex items-center justify-center">
        <Heart className="absolute h-12 w-12 text-primary/20 animate-ping" />
        <Heart className="relative h-10 w-10 text-primary animate-pulse drop-shadow-lg" fill="currentColor" />
      </div>
    </div>
  );
}
