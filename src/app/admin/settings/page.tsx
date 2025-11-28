"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Settings, Crown, Save, Bell, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PageLoader from "@/components/PageLoader";
import AppHeader from "@/components/AppHeader";

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<"ADMIN" | "MODERATOR" | null>(null);
  const [premiumEnabled, setPremiumEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [notificationType, setNotificationType] = useState("info");
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationLink, setNotificationLink] = useState("");
  const [sendingNotification, setSendingNotification] = useState(false);
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
        setUserRole(data.role || null);
        setIsAdmin(data.isAdmin || false);
        if (data.role === "ADMIN") {
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

  const handleSendNotification = async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      toast({
        title: "Error",
        description: "Title and message are required",
        variant: "destructive",
      });
      return;
    }

    setSendingNotification(true);
    try {
      const res = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
          link: notificationLink.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send notification");
      }

      const data = await res.json();
      toast({
        title: "Success",
        description: `Notification sent to ${data.count} users`,
      });

      // Reset form
      setNotificationTitle("");
      setNotificationMessage("");
      setNotificationLink("");
      setNotificationType("info");
      setShowNotificationDialog(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send notification",
        variant: "destructive",
      });
    } finally {
      setSendingNotification(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] pb-24">
      <AppHeader />
      <div className="pt-8 pb-8">
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

          <Card className="glass-card mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-base-blue" />
                Send Notification to All Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Send a notification to all users in the system. This will appear in their notification sidebar.
              </p>
              <Button
                onClick={() => setShowNotificationDialog(true)}
                className="w-full md:w-auto bg-base-blue hover:bg-base-blue/90"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Notification
              </Button>
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

          {/* Send Notification Dialog */}
          <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
            <DialogContent className="glass-card border-white/10 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-base-blue" />
                  Send Notification to All Users
                </DialogTitle>
                <DialogDescription>
                  This notification will be sent to all users in the system.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="notification-type">Type</Label>
                  <Select value={notificationType} onValueChange={setNotificationType}>
                    <SelectTrigger className="glass-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10">
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="new_app">New App</SelectItem>
                      <SelectItem value="trending">Trending</SelectItem>
                      <SelectItem value="app_updated">App Updated</SelectItem>
                      <SelectItem value="premium_offer">Premium Offer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notification-title">Title *</Label>
                  <Input
                    id="notification-title"
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    className="glass-card"
                    placeholder="Notification title"
                    maxLength={200}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notification-message">Message *</Label>
                  <Textarea
                    id="notification-message"
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                    className="glass-card min-h-[100px]"
                    placeholder="Notification message"
                    maxLength={1000}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notification-link">Link (Optional)</Label>
                  <Input
                    id="notification-link"
                    type="url"
                    value={notificationLink}
                    onChange={(e) => setNotificationLink(e.target.value)}
                    className="glass-card"
                    placeholder="https://example.com (optional)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional link that users can click to navigate
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNotificationDialog(false);
                    setNotificationTitle("");
                    setNotificationMessage("");
                    setNotificationLink("");
                    setNotificationType("info");
                  }}
                  disabled={sendingNotification}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendNotification}
                  disabled={sendingNotification || !notificationTitle.trim() || !notificationMessage.trim()}
                  className="bg-base-blue hover:bg-base-blue/90"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sendingNotification ? "Sending..." : "Send to All Users"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

