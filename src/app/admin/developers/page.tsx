"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageLoader from "@/components/PageLoader";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Shield, User, Plus } from "lucide-react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { trackPageView } from "@/lib/analytics";

export default function AdminDevelopersPage() {
  const [developers, setDevelopers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [newAdminWallet, setNewAdminWallet] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    trackPageView("/admin/developers");
    fetchDevelopers();
  }, []);

  async function fetchDevelopers() {
    try {
      const res = await fetch("/api/admin/developers", {
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 403) {
          toast({
            title: "Access Denied",
            description: "Admin access required",
            variant: "destructive",
          });
          return;
        }
        throw new Error("Failed to fetch developers");
      }

      const data = await res.json();
      setDevelopers(data.developers || []);
    } catch (error: any) {
      console.error("Error fetching developers:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch developers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleAddAdmin() {
    if (!newAdminWallet || !newAdminWallet.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast({
        title: "Invalid Wallet",
        description: "Please enter a valid Ethereum wallet address",
        variant: "destructive",
      });
      return;
    }

    setAddingAdmin(true);
    try {
      // First, find or create the developer
      let developer = await fetch(`/api/developers/${newAdminWallet}`, {
        credentials: "include",
      }).then((res) => res.json());

      if (!developer.developer) {
        // Developer doesn't exist, we need to create them first
        // This will be handled by the makeAdmin action
      }

      // Make them admin
      const res = await fetch("/api/admin/developers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          developerId: developer.developer?.id || newAdminWallet.toLowerCase(),
          wallet: newAdminWallet.toLowerCase(), // Pass wallet if developer doesn't exist yet
          isAdmin: true,
          verified: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add admin");
      }

      toast({
        title: "Success",
        description: "Admin added successfully",
      });

      setNewAdminWallet("");
      fetchDevelopers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add admin",
        variant: "destructive",
      });
    } finally {
      setAddingAdmin(false);
    }
  }

  async function handleDeveloperAction(
    developerId: string,
    action: "verify" | "unverify" | "makeAdmin" | "removeAdmin"
  ) {
    setProcessing(developerId);
    try {
      const updateData: any = {};
      if (action === "verify") {
        updateData.verified = true;
      } else if (action === "unverify") {
        updateData.verified = false;
      } else if (action === "makeAdmin") {
        updateData.isAdmin = true;
      } else if (action === "removeAdmin") {
        updateData.isAdmin = false;
      }

      const res = await fetch("/api/admin/developers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ developerId, ...updateData }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update developer");
      }

      const actionMessages: Record<string, string> = {
        verify: "Developer verified successfully",
        unverify: "Developer unverified successfully",
        makeAdmin: "Developer granted admin access successfully",
        removeAdmin: "Admin access removed successfully",
      };

      toast({
        title: "Success",
        description: actionMessages[action] || "Developer updated successfully",
      });

      fetchDevelopers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update developer",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  }

  if (loading) {
    return <PageLoader message="Loading admin panel..." />;
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] pb-24">
      <div className="pt-20 pb-8">
        <div className="max-w-screen-lg mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
              <Shield className="w-6 h-6 text-base-blue" />
              Admin - Developer Management
            </h1>
            <p className="text-muted-foreground text-sm">
              Manage developer accounts and verifications
            </p>
          </div>

          {/* Add Admin Section */}
          <Card className="glass-card mb-6 border-purple-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-400" />
                Add New Admin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="0x..."
                  value={newAdminWallet}
                  onChange={(e) => setNewAdminWallet(e.target.value)}
                  className="glass-card flex-1"
                />
                <Button
                  onClick={handleAddAdmin}
                  disabled={addingAdmin || !newAdminWallet}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {addingAdmin ? "Adding..." : "Add Admin"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Enter a wallet address to grant admin access
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>All Developers ({developers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {developers.map((dev) => (
                  <div
                    key={dev.id}
                    className="p-4 rounded-lg bg-background-secondary border border-white/10 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {dev.avatar ? (
                        <Image
                          src={dev.avatar}
                          alt={dev.name || "Developer"}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-full flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-background-secondary flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold truncate">
                            {dev.name || "Anonymous"}
                          </h4>
                          {dev.isAdmin && (
                            <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded-full">
                              Admin
                            </span>
                          )}
                          {dev.verified && (
                            <span className="text-xs bg-green-600/20 text-green-400 px-2 py-0.5 rounded-full">
                              Verified
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {dev.wallet}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>Status: {dev.verificationStatus}</span>
                          <span>{dev._count?.apps || 0} apps</span>
                          <span>{dev._count?.badges || 0} badges</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {!dev.verified && (
                        <Button
                          onClick={() => handleDeveloperAction(dev.id, "verify")}
                          disabled={processing === dev.id}
                          variant="outline"
                          size="sm"
                          className="border-green-600/50 text-green-400 hover:bg-green-600/10"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Verify
                        </Button>
                      )}
                      {dev.verified && (
                        <Button
                          onClick={() => handleDeveloperAction(dev.id, "unverify")}
                          disabled={processing === dev.id}
                          variant="outline"
                          size="sm"
                          className="border-yellow-600/50 text-yellow-400 hover:bg-yellow-600/10"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Unverify
                        </Button>
                      )}
                      {!dev.isAdmin && (
                        <Button
                          onClick={() => handleDeveloperAction(dev.id, "makeAdmin")}
                          disabled={processing === dev.id}
                          variant="outline"
                          size="sm"
                          className="border-purple-600/50 text-purple-400 hover:bg-purple-600/10"
                        >
                          Make Admin
                        </Button>
                      )}
                      {dev.isAdmin && (
                        <Button
                          onClick={() => handleDeveloperAction(dev.id, "removeAdmin")}
                          disabled={processing === dev.id}
                          variant="outline"
                          size="sm"
                          className="border-red-600/50 text-red-400 hover:bg-red-600/10"
                        >
                          Remove Admin
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

