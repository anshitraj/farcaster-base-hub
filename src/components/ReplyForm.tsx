"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Send, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ReplyFormProps {
  reviewId: string;
  onReplySubmitted?: () => void;
}

const ReplyForm = ({ reviewId, onReplySubmitted }: ReplyFormProps) => {
  const { toast } = useToast();
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reply.trim()) {
      toast({
        title: "Error",
        description: "Please enter a reply",
        variant: "destructive",
      });
      return;
    }

    if (reply.trim().length > 1000) {
      toast({
        title: "Error",
        description: "Reply must be less than 1000 characters",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId,
          reply: reply.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit reply");
      }

      toast({
        title: "Success!",
        description: "Your reply has been posted.",
      });

      setReply("");
      setIsExpanded(false);

      if (onReplySubmitted) {
        onReplySubmitted();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit reply",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="text-sm text-base-blue hover:text-base-cyan transition-colors flex items-center gap-1 mt-2"
      >
        <Send className="w-4 h-4" />
        Reply
      </button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="mt-3 space-y-2"
      >
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            placeholder="Write a reply to this review..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            className="glass-card focus-visible:ring-base-blue min-h-[80px] text-sm resize-none"
            disabled={submitting}
            maxLength={1000}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {reply.length}/1000 characters
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsExpanded(false);
                  setReply("");
                }}
                disabled={submitting}
                className="h-8"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting || !reply.trim()}
                className="h-8 bg-base-blue hover:bg-base-blue/90"
              >
                <Send className="w-4 h-4 mr-1" />
                {submitting ? "Posting..." : "Post Reply"}
              </Button>
            </div>
          </div>
        </form>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReplyForm;






