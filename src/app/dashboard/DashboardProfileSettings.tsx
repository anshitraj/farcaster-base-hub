"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GlowButton from "@/components/GlowButton";
import { Settings, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DashboardProfileSettingsProps {
  initialName: string;
  onUpdate: (name: string) => void;
}

export default function DashboardProfileSettings({ 
  initialName, 
  onUpdate 
}: DashboardProfileSettingsProps) {
  const [profileName, setProfileName] = useState(initialName);
  const [savingProfile, setSavingProfile] = useState(false);
  const { toast } = useToast();

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-base-blue" />
          Profile Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="developer-name">Developer Name</Label>
          <Input
            id="developer-name"
            placeholder="Enter your developer name"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            className="bg-[#141A24] border border-[#1F2733] focus-visible:ring-base-blue focus-visible:border-base-blue"
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground">
            This name will be displayed on your developer profile and app listings
          </p>
        </div>

        <GlowButton
          onClick={async () => {
            setSavingProfile(true);
            try {
              const res = await fetch("/api/developer/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  name: profileName.trim() || null,
                }),
              });

              if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to update profile");
              }

              const data = await res.json();
              onUpdate(data.developer.name || "");
              
              toast({
                title: "Success",
                description: "Profile updated successfully",
              });
            } catch (error: any) {
              toast({
                title: "Error",
                description: error.message || "Failed to update profile",
                variant: "destructive",
              });
            } finally {
              setSavingProfile(false);
            }
          }}
          disabled={savingProfile}
          className="w-full md:w-auto"
        >
          <Save className="w-4 h-4 mr-2" />
          {savingProfile ? "Saving..." : "Save Profile"}
        </GlowButton>
      </CardContent>
    </Card>
  );
}

