"use client";

import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface DeleteAppButtonProps {
  appId: string;
  appName: string;
  onDeleted?: () => void;
}

export default function DeleteAppButton({ appId, appName, onDeleted }: DeleteAppButtonProps) {
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/apps/${appId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete app");
      }

      toast({
        title: "App Deleted",
        description: `${appName} has been deleted successfully.`,
      });

      setOpen(false);
      
      if (onDeleted) {
        onDeleted();
      } else {
        // Redirect to dashboard or apps page
        router.push("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete app. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          className="gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete App
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="glass-card border-white/10">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Delete App?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 pt-2">
            <p className="font-semibold text-foreground">
              Are you sure you want to delete "{appName}"?
            </p>
            <div className="bg-destructive/10 border-2 border-destructive/50 rounded-lg p-4 mt-3">
              <p className="text-sm font-bold text-destructive mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                ⚠️ WARNING: This action cannot be undone!
              </p>
              <div className="bg-destructive/20 border border-destructive/40 rounded-md p-3 mb-3">
                <p className="text-sm font-semibold text-destructive mb-2">
                  🚨 All your XP and data will be lost!
                </p>
                <p className="text-xs text-destructive/90">
                  Deleting this app will permanently remove all XP earned from this app, along with all associated data, statistics, and earnings.
                </p>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>All ratings and reviews will be permanently deleted</li>
                <li className="font-semibold text-destructive">All XP earned from this app will be lost</li>
                <li className="font-semibold text-destructive">All earnings and statistics will be deleted</li>
                <li>All click and install statistics will be deleted</li>
                <li>This app will be removed from the store</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {deleting ? "Deleting..." : "Delete App"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

