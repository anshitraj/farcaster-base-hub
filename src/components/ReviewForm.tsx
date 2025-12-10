import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import GlowButton from "./GlowButton";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface ReviewFormProps {
  appId: string;
  onReviewSubmitted?: () => void;
}

const ReviewForm = ({ appId, onReviewSubmitted }: ReviewFormProps) => {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast({
        title: "Error",
        description: "Please select a rating",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          miniAppId: appId,
          rating,
          comment: comment.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle specific error messages
        const errorMessage = data.error || "Failed to submit review";
        throw new Error(errorMessage);
      }

      // Double-check for errors in response even if status is ok
      if (data.error) {
        throw new Error(data.error);
      }

      // Show success message with points if awarded
      if (data.pointsAwarded && data.pointsAwarded > 0) {
        toast({
          title: "Review Submitted! 🎉",
          description: `You earned ${data.pointsAwarded} points for this review!`,
        });
      } else {
        toast({
          title: "Success!",
          description: "Your review has been submitted.",
        });
      }

      setRating(0);
      setComment("");

      // Dispatch event to refresh points display
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("pointsUpdated"));
      }

      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="glass-card">
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Write a Review</CardTitle>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-base-cyan/10 border border-base-cyan/30">
              <Star className="w-3 h-3 text-base-cyan fill-base-cyan" />
              <span className="text-xs font-semibold text-base-cyan">+100</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Rate this app and earn 100 points! 🎁
          </p>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1.5">Your Rating</label>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setRating(i + 1)}
                    onMouseEnter={() => setHoveredRating(i + 1)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        i < (hoveredRating || rating)
                          ? "fill-base-cyan text-base-cyan"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5">Your Review</label>
              <Textarea
                placeholder="Share your experience with this app..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="glass-card focus-visible:ring-base-blue min-h-[80px] text-sm"
              />
            </div>

            <GlowButton type="submit" className="w-full text-sm py-2" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Review"}
            </GlowButton>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ReviewForm;
