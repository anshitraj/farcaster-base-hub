"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import GlowButton from "@/components/GlowButton";
import PageLoader from "@/components/PageLoader";
import AppHeader from "@/components/AppHeader";
import { Shield, Users, Package, Settings } from "lucide-react";
import { trackPageView } from "@/lib/analytics";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    trackPageView("/admin");
    checkAdmin();
  }, []);

  async function checkAdmin() {
    try {
      // First check if user is authenticated
      const authRes = await fetch("/api/auth/wallet", {
        method: "GET",
        credentials: "include",
      });

      if (!authRes.ok) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Then check admin status
      const res = await fetch("/api/admin/check", {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setIsAdmin(data.isAdmin || false);
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error("Error checking admin:", error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <PageLoader message="Loading admin panel..." />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0B0F19] pb-24">
        <AppHeader />
        <div className="pt-8 pb-8">
          <div className="max-w-screen-md mx-auto px-4">
            <Card className="glass-card border-red-500/30">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h2 className="text-xl font-bold mb-2">Access Denied</h2>
                  <p className="text-muted-foreground text-sm mb-4">
                    You need admin access to view this page.
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    If you believe this is an error, make sure:
                    <br />
                    1. Your wallet is connected
                    <br />
                    2. Your wallet has been granted admin access
                    <br />
                    3. You're using the correct wallet address
                  </p>
                  <div className="flex gap-2 justify-center">
                    <GlowButton asChild>
                      <Link href="/">Go Home</Link>
                    </GlowButton>
                    <GlowButton asChild variant="outline">
                      <Link href="/dashboard">Dashboard</Link>
                    </GlowButton>
                  </div>
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
      <AppHeader />
      <div className="pt-8 pb-8">
        <div className="max-w-screen-md mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
              <Shield className="w-6 h-6 text-base-blue" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground text-sm">
              Manage developers, apps, and verifications
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/admin/developers">
              <Card className="glass-card hover:bg-white/10 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-base-blue" />
                    Developers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Manage developer accounts, verifications, and admin access
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/apps">
              <Card className="glass-card hover:bg-white/10 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-base-cyan" />
                    Apps
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Review pending apps, approve/reject submissions
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/premium">
              <Card className="glass-card hover:bg-white/10 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-purple-400" />
                    Premium
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Manage premium apps, subscriptions, and boosts
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/settings">
              <Card className="glass-card hover:bg-white/10 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-yellow-400" />
                    Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Configure feature flags and system settings
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

