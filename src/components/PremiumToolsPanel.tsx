"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown, TrendingUp, Key, BarChart3 } from "lucide-react";
import AccessCodeGenerator from "./AccessCodeGenerator";
import PremiumBadge from "./PremiumBadge";
import { Button } from "@/components/ui/button";

interface PremiumToolsPanelProps {
  wallet: string;
  apps: any[];
}

export default function PremiumToolsPanel({ wallet, apps }: PremiumToolsPanelProps) {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkPremium() {
      try {
        const res = await fetch("/api/premium/status", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setIsPremium(data.isPremium);
        }
      } catch (error) {
        console.error("Error checking premium:", error);
      } finally {
        setLoading(false);
      }
    }
    checkPremium();
  }, []);

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!isPremium) {
    return (
      <Card className="glass-card border-purple-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-purple-400" />
            Premium Tools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Crown className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Unlock Premium Tools</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Subscribe to Premium to access advanced analytics, boost management, and access code generation.
            </p>
            <Button
              className="bg-gradient-to-r from-purple-600 to-base-blue hover:from-purple-700 hover:to-base-blue/90"
              onClick={() => {
                window.location.href = "/premium?subscribe=true";
              }}
            >
              <Crown className="w-4 h-4 mr-2" />
              Subscribe to Premium
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-purple-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-purple-400" />
          Premium Tools
          <PremiumBadge size="sm" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="boosts">
              <TrendingUp className="w-4 h-4 mr-2" />
              Boosts
            </TabsTrigger>
            <TabsTrigger value="codes">
              <Key className="w-4 h-4 mr-2" />
              Access Codes
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="analytics" className="mt-4">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Premium analytics coming soon. Track detailed metrics for your apps including:
              </div>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>View counts and unique visitors</li>
                <li>Trending momentum scores</li>
                <li>FID-level social analytics</li>
                <li>Developer performance stats</li>
              </ul>
            </div>
          </TabsContent>
          
          <TabsContent value="boosts" className="mt-4">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                You have 1 monthly boost credit. Use it to increase your app's trending score.
              </div>
              {apps.length > 0 ? (
                <div className="space-y-2">
                  {apps.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between p-3 bg-background-secondary rounded-lg"
                    >
                      <div>
                        <div className="font-semibold">{app.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {app.clicks || 0} clicks • {app.installs || 0} installs
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-purple-600 to-base-blue"
                      >
                        Request Boost
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No apps available. Submit an app first to use boosts.
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="codes" className="mt-4">
            <div className="space-y-4">
              {apps.length > 0 ? (
                <Tabs defaultValue={apps[0]?.id} className="w-full">
                  <TabsList className="grid w-full grid-cols-1">
                    {apps.map((app) => (
                      <TabsTrigger key={app.id} value={app.id}>
                        {app.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {apps.map((app) => (
                    <TabsContent key={app.id} value={app.id} className="mt-4">
                      <AccessCodeGenerator appId={app.id} />
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No apps available. Submit an app first to generate access codes.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

