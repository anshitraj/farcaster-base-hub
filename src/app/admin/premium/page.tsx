"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Crown, Plus, Trash2, Download, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PageLoader from "@/components/PageLoader";

export default function AdminPremiumPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<"ADMIN" | "MODERATOR" | null>(null);
  const [premiumApps, setPremiumApps] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [boostRequests, setBoostRequests] = useState<any[]>([]);
  const [newAppId, setNewAppId] = useState("");
  const { toast } = useToast();

  useEffect(() => {
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
            fetchData();
          } else {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("Error checking admin:", error);
        setLoading(false);
      }
    }
    checkAdmin();
  }, []);

  async function fetchData() {
    try {
      const [appsRes, subsRes, boostsRes] = await Promise.all([
        fetch("/api/admin/premium/apps", { credentials: "include" }),
        fetch("/api/admin/premium/subscribers", { credentials: "include" }),
        fetch("/api/admin/premium/boosts", { credentials: "include" }),
      ]);

      if (appsRes.ok) {
        const appsData = await appsRes.json();
        setPremiumApps(appsData.apps || []);
      }
      if (subsRes.ok) {
        const subsData = await subsRes.json();
        setSubscribers(subsData.subscribers || []);
      }
      if (boostsRes.ok) {
        const boostsData = await boostsRes.json();
        setBoostRequests(boostsData.requests || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }

  const addPremiumApp = async () => {
    if (!newAppId.trim()) {
      toast({
        title: "Error",
        description: "Please enter an app ID",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await fetch("/api/admin/premium/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ appId: newAppId }),
      });

      const data = await res.json();
      if (res.ok) {
        toast({
          title: "Success",
          description: "App added to premium list",
        });
        setNewAppId("");
        fetchData();
      } else {
        throw new Error(data.error || "Failed to add app");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removePremiumApp = async (appId: string) => {
    try {
      const res = await fetch(`/api/admin/premium/apps/${appId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "App removed from premium list",
        });
        fetchData();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const approveBoost = async (requestId: string) => {
    try {
      const res = await fetch(`/api/admin/premium/boosts/${requestId}/approve`, {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Boost request approved",
        });
        fetchData();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const exportSubscribers = () => {
    const csv = [
      ["Wallet", "Status", "Started At", "Expires At", "Renewal Count"],
      ...subscribers.map((sub) => [
        sub.wallet,
        sub.status,
        new Date(sub.startedAt).toLocaleDateString(),
        new Date(sub.expiresAt).toLocaleDateString(),
        sub.renewalCount.toString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `premium-subscribers-${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <PageLoader message="Loading..." />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0B0F19] pt-20 px-4">
        <div className="max-w-screen-md mx-auto text-center py-20">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You must be an admin to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] pt-20 pb-24 px-4">
      <div className="max-w-screen-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Crown className="w-6 h-6 text-purple-400" />
            Premium Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage premium apps, subscriptions, and boost requests
          </p>
        </div>

        {/* Add Premium App */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle>Add Premium App</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter App ID"
                value={newAppId}
                onChange={(e) => setNewAppId(e.target.value)}
              />
              <Button onClick={addPremiumApp}>
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Premium Apps List */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle>Premium Apps ({premiumApps.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {premiumApps.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-3 bg-background-secondary rounded-lg"
                >
                  <div>
                    <div className="font-semibold">{app.miniApp?.name || app.id}</div>
                    <div className="text-xs text-muted-foreground">
                      {app.miniApp?.category || "N/A"}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removePremiumApp(app.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Boost Requests */}
        <Card className="glass-card mb-6">
          <CardHeader>
            <CardTitle>Boost Requests ({boostRequests.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {boostRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 bg-background-secondary rounded-lg"
                >
                  <div>
                    <div className="font-semibold">
                      {request.miniApp?.name || request.appId}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Requested by: {request.developer?.name || request.developerId}
                    </div>
                    <Badge variant={request.status === "approved" ? "default" : "secondary"}>
                      {request.status}
                    </Badge>
                  </div>
                  {request.status === "pending" && (
                    <Button
                      size="sm"
                      onClick={() => approveBoost(request.id)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Subscribers */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Subscribers ({subscribers.length})</CardTitle>
              <Button size="sm" variant="outline" onClick={exportSubscribers}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {subscribers.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-3 bg-background-secondary rounded-lg"
                >
                  <div>
                    <div className="font-semibold">{sub.wallet}</div>
                    <div className="text-xs text-muted-foreground">
                      Expires: {new Date(sub.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge
                    variant={
                      sub.status === "active" ? "default" : "secondary"
                    }
                  >
                    {sub.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

