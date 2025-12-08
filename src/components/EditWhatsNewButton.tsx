"use client";

import { useState } from "react";
import { Edit2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface EditWhatsNewButtonProps {
  appId: string;
  currentWhatsNew?: string | null;
  onUpdated?: () => void;
}

export default function EditWhatsNewButton({
  appId,
  currentWhatsNew,
  onUpdated,
}: EditWhatsNewButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [whatsNew, setWhatsNew] = useState(currentWhatsNew || "");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/apps/${appId}/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          whatsNew: whatsNew.trim() || "",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update What's new");
      }

      toast({
        title: "Success",
        description: "What's new section updated successfully!",
      });

      setIsOpen(false);
      if (onUpdated) {
        onUpdated();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update What's new section",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Edit2 className="w-4 h-4" />
        Edit What's New
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit What's New</DialogTitle>
            <DialogDescription>
              Update the "What's new" section that appears on your app's detail page. This will show users what's new in your latest update.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="whatsNew">What's New</Label>
              <Textarea
                id="whatsNew"
                placeholder="Tell users about your latest updates, bug fixes, and new features..."
                value={whatsNew}
                onChange={(e) => setWhatsNew(e.target.value)}
                className="min-h-[200px]"
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {whatsNew.length}/2000 characters
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setWhatsNew(currentWhatsNew || "");
              }}
              disabled={isSaving}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

