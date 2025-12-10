"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AddMiniAppButtonProps {
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

function useNeynarMiniApp() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useMiniApp } = require("@neynar/react");
    return useMiniApp();
  } catch (error) {
    // Return default values if hook is not available
    return { isSDKLoaded: false, addMiniApp: null };
  }
}

export function AddMiniAppButton({ 
  className, 
  variant = "default",
  size = "default" 
}: AddMiniAppButtonProps) {
  const { isSDKLoaded, addMiniApp } = useNeynarMiniApp();
  const [loading, setLoading] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const { toast } = useToast();

  const handleAddMiniApp = async () => {
    if (!isSDKLoaded || !addMiniApp) {
      toast({
        title: "SDK not loaded",
        description: "Please wait for the SDK to load, or open this app in Base App.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await addMiniApp();

      if (result.added && result.notificationDetails) {
        // Mini app was added and notifications were enabled
        setNotificationEnabled(true);
        toast({
          title: "Notifications enabled! 🔔",
          description: `You'll now receive updates from Mini Cast Store. Token: ${result.notificationDetails.token?.substring(0, 20)}...`,
        });
      } else if (result.added) {
        // Mini app was added but notifications might not be enabled
        setNotificationEnabled(true);
        toast({
          title: "Mini App added!",
          description: "You've added Mini Cast Store to your Base App.",
        });
      } else {
        // User cancelled or error
        toast({
          title: "Action cancelled",
          description: "You can enable notifications later from your settings.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error adding mini app:", error);
      toast({
        title: "Failed to enable notifications",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Only show button if SDK is loaded (user is in Base App)
  if (!isSDKLoaded) {
    return null;
  }

  return (
    <Button
      onClick={handleAddMiniApp}
      disabled={loading || notificationEnabled}
      variant={notificationEnabled ? "outline" : variant}
      size={size}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Enabling...
        </>
      ) : notificationEnabled ? (
        <>
          <Bell className="w-4 h-4 mr-2" />
          Notifications Enabled
        </>
      ) : (
        <>
          <BellOff className="w-4 h-4 mr-2" />
          Enable Notifications
        </>
      )}
    </Button>
  );
}

