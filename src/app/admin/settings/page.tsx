"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, Crown, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PageLoader from "@/components/PageLoader";

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [premiumEnabled, setPremiumEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    try {
      const res = await fetch("/api/admin/check", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(data.isAdmin);
        if (data.isAdmin) {
          fetchSettings();
        } else {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error("Error checking admin:", error);
      setLoading(false);
    }
  }

  async function fetchSettings() {
    try {
      const res = await fetch("/api/admin/settings", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setPremiumEnabled(data.settings?.premiumEnabled ?? true);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          premiumEnabled,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save settings");
      }

      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <PageLoader message="Loading settings..." />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0B0F19] pb-24">
        <div className="pt-20 pb-8">
          <div className="max-w-screen-md mx-auto px-4">
            <Card className="glass-card border-red-500/30">
              <CardContent className="pt-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold mb-2">Access Denied</h2>
                  <p className="text-muted-foreground text-sm">
                    Admin access required
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] pb-24">
      <div className="pt-20 pb-8">
        <div className="max-w-screen-md mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
              <Settings className="w-6 h-6 text-yellow-400" />
              Admin Settings
            </h1>
            <p className="text-muted-foreground text-sm">
              Configure feature flags and system settings
            </p>
          </div>

          <Card className="glass-card mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-purple-400" />
                Premium Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-background-secondary">
                <div className="flex-1">
                  <Label htmlFor="premium-toggle" className="text-base font-semibold cursor-pointer">
                    Enable Premium Features
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    When enabled, users can subscribe to Premium and access premium features like analytics, boosts, and access codes. When disabled, all premium features are hidden.
                  </p>
                </div>
                <Switch
                  id="premium-toggle"
                  checked={premiumEnabled}
                  onCheckedChange={setPremiumEnabled}
                  className="ml-4"
                />
              </div>

              <div className="pt-4 border-t border-white/10">
                <Button
                  onClick={saveSettings}
                  disabled={saving}
                  className="w-full md:w-auto bg-base-blue hover:bg-base-blue/90"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Feature Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-background-secondary">
                  <span className="text-sm">Premium Page</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    premiumEnabled 
                      ? "bg-green-500/20 text-green-400" 
                      : "bg-gray-500/20 text-gray-400"
                  }`}>
                    {premiumEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-background-secondary">
                  <span className="text-sm">Premium Subscriptions</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    premiumEnabled 
                      ? "bg-green-500/20 text-green-400" 
                      : "bg-gray-500/20 text-gray-400"
                  }`}>
                    {premiumEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-background-secondary">
                  <span className="text-sm">Premium Analytics</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    premiumEnabled 
                      ? "bg-green-500/20 text-green-400" 
                      : "bg-gray-500/20 text-gray-400"
                  }`}>
                    {premiumEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-background-secondary">
                  <span className="text-sm">Boost Requests</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    premiumEnabled 
                      ? "bg-green-500/20 text-green-400" 
                      : "bg-gray-500/20 text-gray-400"
                  }`}>
                    {premiumEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

