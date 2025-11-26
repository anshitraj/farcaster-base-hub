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
        throw new Error(data.error || "Failed to submit review");
      }

      // Check for specific error about rating own app
      if (data.error && data.error.includes("cannot rate your own")) {
        throw new Error("You cannot rate your own app");
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
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Write a Review</CardTitle>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-base-cyan/10 border border-base-cyan/30">
              <Star className="w-4 h-4 text-base-cyan fill-base-cyan" />
              <span className="text-sm font-semibold text-base-cyan">+100 Points</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Rate this app and earn 100 points! 🎁
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Your Rating</label>
              <div className="flex gap-2">
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
                      className={`w-8 h-8 ${
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
              <label className="block text-sm font-medium mb-2">Your Review</label>
              <Textarea
                placeholder="Share your experience with this app..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="glass-card focus-visible:ring-base-blue min-h-[120px]"
              />
            </div>

            <GlowButton type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Review"}
            </GlowButton>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ReviewForm;
