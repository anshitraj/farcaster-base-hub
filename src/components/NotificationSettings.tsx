"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddMiniAppButton } from "./AddMiniAppButton";
import { Bell, BellOff, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function useNeynarMiniApp() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useMiniApp } = require("@neynar/react");
    return useMiniApp();
  } catch (error) {
    // Return default values if hook is not available
    return { isSDKLoaded: false, user: null };
  }
}

export function NotificationSettings() {
  const { isSDKLoaded } = useNeynarMiniApp();
  const [notificationStatus, setNotificationStatus] = useState<"enabled" | "disabled" | "unknown">("unknown");

  useEffect(() => {
    // Check if notifications are enabled
    // This would typically be done by checking the notificationDetails from addMiniApp
    // For now, we'll rely on the user's interaction with the button
  }, []);

  if (!isSDKLoaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Enable notifications to stay updated with Mini Cast Store
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Open in Base App</AlertTitle>
            <AlertDescription>
              To enable notifications, please open this app in the Base App. Notifications are only available when using the app through Base App.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {notificationStatus === "enabled" ? (
            <Bell className="w-5 h-5 text-green-400" />
          ) : (
            <BellOff className="w-5 h-5" />
          )}
          Notifications
        </CardTitle>
        <CardDescription>
          Get notified about new apps, updates, and important announcements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {notificationStatus === "enabled" ? (
          <div className="flex items-center gap-2 text-green-400">
            <Bell className="w-4 h-4" />
            <span>Notifications are enabled</span>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enable notifications to receive updates about:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
              <li>New featured apps</li>
              <li>App updates and announcements</li>
              <li>Developer badges and achievements</li>
              <li>Important platform updates</li>
            </ul>
            <div className="pt-4">
              <AddMiniAppButton />
            </div>
          </div>
        )}

        <Alert className="mt-4">
          <Info className="h-4 w-4" />
          <AlertTitle>How it works</AlertTitle>
          <AlertDescription className="text-xs">
            When you enable notifications, you'll be prompted to add Mini Cast Store to your Base App. 
            Once added, you can manage notifications from your Base App settings. 
            Notifications are sent through Neynar and can be managed from the Neynar developer portal.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

