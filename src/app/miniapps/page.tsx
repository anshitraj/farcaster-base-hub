"use client";

import { useState, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import { motion } from "framer-motion";
import { Zap, RefreshCw, ExternalLink, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import Link from "next/link";
import GlowButton from "@/components/GlowButton";
import PageLoader from "@/components/PageLoader";

export default function MiniappsPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSyncedApps();
  }, []);

  async function fetchSyncedApps() {
    setLoading(true);
    try {
      // Fetch apps - we'll get all approved apps and filter for auto-updated ones
      const res = await fetch("/api/apps?limit=200&sort=newest");
      if (res.ok) {
        const data = await res.json();
        // Filter for auto-updated apps (synced from Neynar)
        // Also include apps that have farcasterJson (indicates they came from external sources)
        const syncedApps = (data.apps || []).filter((app: any) => 
          app.autoUpdated === true || 
          (app.farcasterJson && app.status === "approved")
        );
        setApps(syncedApps);
      } else {
        throw new Error("Failed to fetch apps");
      }
    } catch (error) {
      console.error("Error fetching synced apps:", error);
      toast({
        title: "Error",
        description: "Failed to fetch synced mini-apps",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/miniapps/fetch", {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to sync mini-apps");
      }

      toast({
        title: "Sync Complete!",
        description: `Synced ${data.synced} apps (${data.created} new, ${data.updated} updated)`,
      });

      // Refresh apps
      await fetchSyncedApps();
    } catch (error: any) {
      console.error("Error syncing:", error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync from Neynar API",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return <PageLoader message="Loading mini-apps..." />;
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] pb-24">
      <AppHeader />
      <div className="pt-8 px-4">
        <div className="max-w-screen-2xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
                <Zap className="w-8 h-8 text-base-blue" />
                Featured Mini Apps
              </h1>
              <p className="text-muted-foreground">
                Curated list of Farcaster + Base mini-apps from Neynar
              </p>
            </div>
            <GlowButton
              onClick={handleSync}
              disabled={syncing}
              className="gap-2"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Sync Featured Mini Apps
                </>
              )}
            </GlowButton>
          </div>

          {/* Apps Grid */}
          {apps.length === 0 ? (
            <div className="text-center py-20">
              <Zap className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h2 className="text-2xl font-bold mb-2">No synced apps yet</h2>
              <p className="text-muted-foreground mb-6">
                Click "Sync Featured Mini Apps" to fetch apps from Neynar
              </p>
              <GlowButton onClick={handleSync} disabled={syncing}>
                {syncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Sync Now
                  </>
                )}
              </GlowButton>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {apps.map((app, index) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="glass-card border-[#1F2733] hover:border-[#2A2A2A] transition-colors h-full">
                    <CardContent className="p-6">
                      <div className="flex flex-col h-full">
                        {/* Header */}
                        <div className="flex items-start gap-4 mb-4">
                          <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 border-[#1F2733]">
                            <Image
                              src={app.iconUrl || "/placeholder.svg"}
                              alt={app.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg mb-1 truncate">
                              {app.name}
                            </h3>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant="secondary"
                                className="bg-base-blue/20 text-base-blue border-base-blue/30"
                              >
                                {app.category}
                              </Badge>
                              {app.tags && app.tags.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {app.tags[0]}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
                          {app.description || "No description available"}
                        </p>

                        {/* Developer */}
                        {app.developer && (
                          <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
                            <span>by {app.developer.name || "Unknown"}</span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 mt-auto">
                          <GlowButton
                            asChild
                            variant="solid"
                            className="flex-1 gap-2"
                          >
                            <a
                              href={app.farcasterUrl || app.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => {
                                // Track click
                                fetch(`/api/apps/${app.id}/click`, {
                                  method: "POST",
                                  credentials: "include",
                                }).catch(() => {});
                              }}
                            >
                              <Globe className="w-4 h-4" />
                              View App
                            </a>
                          </GlowButton>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="border-[#1F2733] hover:bg-[#141A24]"
                          >
                            <Link href={`/apps/${app.id}`}>
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Info */}
          {apps.length > 0 && (
            <div className="mt-8 text-center text-sm text-muted-foreground">
              Showing {apps.length} featured mini-apps synced from{" "}
              <a
                href="https://docs.neynar.com/reference/fetch-frame-catalog"
                target="_blank"
                rel="noopener noreferrer"
                className="text-base-blue hover:underline"
              >
                Neynar API
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
