"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import AppHeader from "@/components/AppHeader";
import Sidebar from "@/components/Sidebar";
import PageLoader from "@/components/PageLoader";
import { useToast } from "@/hooks/use-toast";
import { 
  Trash2, 
  Edit, 
  Share2, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MessageSquare,
  Loader2,
  Plus,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { trackPageView } from "@/lib/analytics";

interface App {
  id: string;
  name: string;
  description: string;
  url: string;
  baseMiniAppUrl?: string;
  farcasterUrl?: string;
  iconUrl: string;
  headerImageUrl?: string;
  category: string;
  status: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
  clicks: number;
  installs: number;
  launchCount: number;
  ratingAverage: number;
  ratingCount: number;
  favoriteCount: number;
  tags: string[];
}

export default function DeveloperDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appToDelete, setAppToDelete] = useState<App | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Modification request dialog
  const [modDialogOpen, setModDialogOpen] = useState(false);
  const [appToModify, setAppToModify] = useState<App | null>(null);
  const [modMessage, setModMessage] = useState("");
  const [modChanges, setModChanges] = useState("");
  const [requestingMod, setRequestingMod] = useState(false);
  
  // Notification dialog
  const [notifDialogOpen, setNotifDialogOpen] = useState(false);
  const [appToNotify, setAppToNotify] = useState<App | null>(null);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifLink, setNotifLink] = useState("");
  const [sendingNotif, setSendingNotif] = useState(false);

  useEffect(() => {
    trackPageView("/developer-dashboard");
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleSidebarChange = (collapsed: boolean, hidden: boolean) => {
    setSidebarCollapsed(collapsed);
    setSidebarHidden(hidden);
  };

  useEffect(() => {
    async function fetchApps() {
      try {
        const res = await fetch("/api/developer/apps", {
          credentials: "include",
        });
        
        if (res.status === 401) {
          router.push("/");
          return;
        }
        
        if (!res.ok) {
          throw new Error("Failed to fetch apps");
        }
        
        const data = await res.json();
        setApps(data.apps || []);
      } catch (error) {
        console.error("Error fetching apps:", error);
        toast({
          title: "Error",
          description: "Failed to load your apps. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchApps();
  }, [router, toast]);

  const handleDelete = (app: App) => {
    setAppToDelete(app);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!appToDelete) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`/api/developer/apps/${appToDelete.id}/delete`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete app");
      }
      
      toast({
        title: "App Deleted",
        description: `${appToDelete.name} has been deleted successfully.`,
      });
      
      // Remove from list
      setApps(apps.filter(app => app.id !== appToDelete.id));
      setDeleteDialogOpen(false);
      setAppToDelete(null);
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete app. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleRequestModification = (app: App) => {
    setAppToModify(app);
    setModMessage("");
    setModChanges("");
    setModDialogOpen(true);
  };

  const submitModificationRequest = async () => {
    if (!appToModify || !modMessage.trim()) return;
    
    setRequestingMod(true);
    try {
      const res = await fetch(`/api/developer/apps/${appToModify.id}/request-modification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: modMessage,
          changes: modChanges || undefined,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit modification request");
      }
      
      toast({
        title: "Request Submitted",
        description: "Your modification request has been submitted. Admin will review it soon.",
      });
      
      setModDialogOpen(false);
      setAppToModify(null);
      setModMessage("");
      setModChanges("");
    } catch (error: any) {
      toast({
        title: "Request Failed",
        description: error.message || "Failed to submit modification request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRequestingMod(false);
    }
  };

  const handleSendNotification = (app: App) => {
    setAppToNotify(app);
    setNotifTitle(`${app.name} Update`);
    setNotifMessage(`Check out the latest updates to ${app.name}!`);
    setNotifLink(`/apps/${app.id}`);
    setNotifDialogOpen(true);
  };

  const sendNotification = async () => {
    if (!appToNotify || !notifTitle.trim() || !notifMessage.trim()) return;
    
    setSendingNotif(true);
    try {
      const res = await fetch(`/api/developer/apps/${appToNotify.id}/send-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: notifTitle,
          message: notifMessage,
          link: notifLink || undefined,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send notification");
      }
      
      const data = await res.json();
      toast({
        title: "Notification Sent",
        description: data.message || `Notification sent to ${data.sentCount || 0} user(s).`,
      });
      
      setNotifDialogOpen(false);
      setAppToNotify(null);
      setNotifTitle("");
      setNotifMessage("");
      setNotifLink("");
    } catch (error: any) {
      toast({
        title: "Send Failed",
        description: error.message || "Failed to send notification. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingNotif(false);
    }
  };

  const getStatusBadge = (status: string, verified: boolean) => {
    if (verified) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
          <CheckCircle2 className="w-3 h-3" />
          Verified
        </span>
      );
    }
    
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </span>
        );
      case "pending":
      case "pending_review":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            <Clock className="w-3 h-3" />
            {status === "pending_review" ? "Pending Review" : "Pending"}
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return <PageLoader message="Loading your apps..." />;
  }

  return (
    <div className="flex min-h-screen bg-[#0B0F19]">
      <Sidebar 
        onCollapseChange={handleSidebarChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className={`flex-1 min-h-screen w-full pb-20 lg:pb-0 transition-all duration-300 ${
        sidebarHidden 
          ? "ml-0" 
          : sidebarCollapsed 
            ? "lg:ml-16 ml-0" 
            : "lg:ml-64 ml-0"
      }`}>
        <AppHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        <div className="pt-8 pb-8">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Developer Dashboard</h1>
                  <p className="text-gray-400">Manage all your listed applications</p>
                </div>
                <Link href="/submit">
                  <Button className="bg-base-blue hover:bg-base-blue/90">
                    <Plus className="w-4 h-4 mr-2" />
                    List New App
                  </Button>
                </Link>
              </div>
            </div>

            {/* Apps List */}
            {apps.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="py-12 text-center">
                  <Package className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Apps Listed</h3>
                  <p className="text-gray-400 mb-6">You haven't listed any apps yet.</p>
                  <Link href="/submit">
                    <Button className="bg-base-blue hover:bg-base-blue/90">
                      <Plus className="w-4 h-4 mr-2" />
                      List Your First App
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {apps.map((app, index) => (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card className="glass-card hover:bg-white/5 transition-all">
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <div className="relative w-16 h-16 flex-shrink-0">
                            <Image
                              src={app.iconUrl || "/placeholder.svg"}
                              alt={app.name}
                              fill
                              className="rounded-xl object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "/placeholder.svg";
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg mb-1 truncate">{app.name}</CardTitle>
                            <p className="text-xs text-gray-400 mb-2">{app.category}</p>
                            {getStatusBadge(app.status, app.verified)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-300 mb-4 line-clamp-2">{app.description}</p>
                        
                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                          <div>
                            <div className="text-lg font-semibold text-white">{app.clicks}</div>
                            <div className="text-xs text-gray-400">Clicks</div>
                          </div>
                          <div>
                            <div className="text-lg font-semibold text-white">{app.installs}</div>
                            <div className="text-xs text-gray-400">Installs</div>
                          </div>
                          <div>
                            <div className="text-lg font-semibold text-white">{app.favoriteCount}</div>
                            <div className="text-xs text-gray-400">Favorites</div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/apps/${app.id}`} target="_blank">
                            <Button variant="outline" size="sm" className="flex-1">
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRequestModification(app)}
                          >
                            <MessageSquare className="w-3 h-3 mr-1" />
                            Modify
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendNotification(app)}
                          >
                            <Share2 className="w-3 h-3 mr-1" />
                            Notify
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(app)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete App</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{appToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modification Request Dialog */}
      <Dialog open={modDialogOpen} onOpenChange={setModDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Modification</DialogTitle>
            <DialogDescription>
              Request changes to "{appToModify?.name}". Admin will review your request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="mod-message">Message *</Label>
              <Textarea
                id="mod-message"
                value={modMessage}
                onChange={(e) => setModMessage(e.target.value)}
                placeholder="Describe what changes you want to make..."
                rows={4}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="mod-changes">Changes (Optional)</Label>
              <Textarea
                id="mod-changes"
                value={modChanges}
                onChange={(e) => setModChanges(e.target.value)}
                placeholder="List specific changes (e.g., update description, change icon, etc.)"
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitModificationRequest} disabled={requestingMod || !modMessage.trim()}>
              {requestingMod ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Notification Dialog */}
      <Dialog open={notifDialogOpen} onOpenChange={setNotifDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Notification</DialogTitle>
            <DialogDescription>
              Send a notification to all users who have favorited "{appToNotify?.name}".
              (Rate limited: 1 notification per app per 24 hours per user)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="notif-title">Title *</Label>
              <Input
                id="notif-title"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                placeholder="e.g., New Update Available!"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="notif-message">Message *</Label>
              <Textarea
                id="notif-message"
                value={notifMessage}
                onChange={(e) => setNotifMessage(e.target.value)}
                placeholder="e.g., Check out the latest features and improvements!"
                rows={4}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="notif-link">Link (Optional)</Label>
              <Input
                id="notif-link"
                value={notifLink}
                onChange={(e) => setNotifLink(e.target.value)}
                placeholder={`/apps/${appToNotify?.id}`}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={sendNotification} disabled={sendingNotif || !notifTitle.trim() || !notifMessage.trim()}>
              {sendingNotif ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Notification"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

