"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import PageLoader from "@/components/PageLoader";
import AppHeader from "@/components/AppHeader";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Clock, ExternalLink, Shield, Edit, Trash2, Download, Zap, Upload, Star, Image as ImageIcon, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { trackPageView } from "@/lib/analytics";

const categories = ["Finance", "Tools", "Social", "Airdrops", "Games", "Memecoins", "Utilities", "Education", "Entertainment", "News", "Art", "Productivity"];

export default function AdminAppsPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [pendingApps, setPendingApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [editingApp, setEditingApp] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<"ADMIN" | "MODERATOR" | null>(null);
  const [showAutoImportDialog, setShowAutoImportDialog] = useState(false);
  const [autoImportUrl, setAutoImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [showJsonImportDialog, setShowJsonImportDialog] = useState(false);
  const [jsonUrl, setJsonUrl] = useState("");
  const [jsonWallet, setJsonWallet] = useState("");
  const [importingJson, setImportingJson] = useState(false);
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [bulkJsonUrl, setBulkJsonUrl] = useState("");
  const [bulkDefaultWallet, setBulkDefaultWallet] = useState("0x0CF70E448ac98689e326bd79075a96CcBcec1665");
  const [importingBulk, setImportingBulk] = useState(false);
  const [syncingMiniapps, setSyncingMiniapps] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [screenshotInput, setScreenshotInput] = useState("");
  const iconFileInputRef = useRef<HTMLInputElement>(null);
  const headerFileInputRef = useRef<HTMLInputElement>(null);
  const screenshotFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    trackPageView("/admin/apps");
    fetchUserRole();
    fetchApps();
  }, []);

  async function fetchUserRole() {
    try {
      const res = await fetch("/api/admin/check", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUserRole(data.role || null);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  }

  async function fetchApps() {
    try {
      const [allRes, pendingRes] = await Promise.all([
        fetch("/api/admin/apps", { credentials: "include" }),
        fetch("/api/admin/apps/pending", { credentials: "include" }),
      ]);

      if (allRes.ok) {
        const allData = await allRes.json();
        setApps(allData.apps || []);
      }

      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        setPendingApps(pendingData.apps || []);
      }
    } catch (error) {
      console.error("Error fetching apps:", error);
      toast({
        title: "Error",
        description: "Failed to fetch apps",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSyncMiniapps() {
    setSyncingMiniapps(true);
    try {
      // Use the new sync-featured endpoint that uses free search API (not paid catalog)
      const res = await fetch("/api/admin/miniapps/sync-featured", {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to sync mini-apps");
      }

      // Check if sync was successful but found 0 apps
      if (data.synced === 0) {
        const errorDetails: string[] = [];
        if (data.searchErrors && data.searchErrors.length > 0) {        
          errorDetails.push(`Search errors: ${data.searchErrors.join(", ")}`);
        }
        if (data.details?.suggestion) {
          errorDetails.push(data.details.suggestion);
        }
        
        toast({
          title: "Sync Completed - No Apps Found",
          description: data.message || `No apps found. ${errorDetails.length > 0 ? errorDetails.join(". ") : "Check console logs for details."}`,
          variant: data.success === false ? "destructive" : "default",
          duration: 8000,
        });
      } else {
        toast({
          title: "Sync Complete!",
          description: `Synced ${data.synced} apps from Neynar search (${data.created} new, ${data.updated} updated)`,
        });
      }

      // Refresh apps list
      await fetchApps();
    } catch (error: any) {
      console.error("Error syncing mini-apps:", error);
      const errorMessage = error.message || "Failed to sync mini-apps from Neynar";
      const isPaymentRequired = errorMessage.includes("Payment Required") || errorMessage.includes("paid plan");
      
      toast({
        title: "Sync Failed",
        description: isPaymentRequired 
          ? "Neynar API requires a paid plan for catalog access. Use Auto Import or add apps manually instead."
          : errorMessage,
        variant: "destructive",
        duration: isPaymentRequired ? 8000 : 5000, // Show longer for payment required
      });
    } finally {
      setSyncingMiniapps(false);
    }
  }

  async function handleAppAction(appId: string, action: "approve" | "reject" | "verify" | "approve_contract" | "reject_contract" | "feature_banner" | "unfeature_banner") {
    setProcessing(appId);
    try {
      const updateData: any = {};
      if (action === "approve") {
        updateData.status = "approved";
      } else if (action === "reject") {
        updateData.status = "rejected";
      } else if (action === "verify") {
        updateData.verified = true;
      } else if (action === "approve_contract") {
        updateData.contractVerified = true;
        updateData.verified = true;
        updateData.status = "approved";
      } else if (action === "reject_contract") {
        updateData.contractVerified = false;
        updateData.status = "pending_review";
      } else if (action === "feature_banner") {
        updateData.featuredInBanner = true;
      } else if (action === "unfeature_banner") {
        updateData.featuredInBanner = false;
      }

      const res = await fetch("/api/admin/apps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ appId, ...updateData }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update app");
      }

      toast({
        title: "Success",
        description: action === "approve" 
          ? "App approved! It will now appear on the homepage."
          : `App ${action}d successfully`,
      });

      // Refresh the apps list
      await fetchApps();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update app",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  }

  function handleEditClick(app: any) {
    setEditingApp(app);
    setEditFormData({
      name: app.name,
      description: app.description,
      url: app.url,
      baseMiniAppUrl: app.baseMiniAppUrl || "",
      farcasterUrl: app.farcasterUrl || "",
      iconUrl: app.iconUrl || "",
      headerImageUrl: app.headerImageUrl || "",
      category: app.category,
      screenshots: app.screenshots || [],
    });
    setScreenshotInput("");
  }

  async function handleFileUpload(file: File, type: "icon" | "header" | "screenshot") {
    if (!file) return;

    const setUploading = type === "icon" ? setUploadingIcon : type === "header" ? setUploadingHeader : setUploadingScreenshot;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to upload file");
      }

      const data = await res.json();
      
      // Update the form data with the new URL
      if (type === "icon") {
        setEditFormData({ ...editFormData, iconUrl: data.url });
      } else if (type === "header") {
        setEditFormData({ ...editFormData, headerImageUrl: data.url });
      } else if (type === "screenshot") {
        setEditFormData({ 
          ...editFormData, 
          screenshots: [...(editFormData.screenshots || []), data.url] 
        });
      }

      toast({
        title: "Success",
        description: `${type === "icon" ? "Icon" : type === "header" ? "Header image" : "Screenshot"} uploaded successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Upload Error",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  const handleAddScreenshotUrl = () => {
    if (screenshotInput.trim() && !editFormData.screenshots?.includes(screenshotInput.trim())) {
      setEditFormData({
        ...editFormData,
        screenshots: [...(editFormData.screenshots || []), screenshotInput.trim()],
      });
      setScreenshotInput("");
    }
  };

  const handleRemoveScreenshot = (index: number) => {
    setEditFormData({
      ...editFormData,
      screenshots: editFormData.screenshots?.filter((_, i) => i !== index) || [],
    });
  };

  async function handleSaveEdit() {
    if (!editingApp) return;

    setProcessing(editingApp.id);
    try {
      const res = await fetch("/api/admin/apps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          appId: editingApp.id,
          ...editFormData,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update app");
      }

      toast({
        title: "Success",
        description: "App updated successfully",
      });

      setEditingApp(null);
      fetchApps();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update app",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  }

  async function handleDelete(appId: string) {
    setProcessing(appId);
    try {
      const res = await fetch(`/api/admin/apps?appId=${appId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete app");
      }

      toast({
        title: "Success",
        description: "App deleted successfully",
      });

      setShowDeleteDialog(null);
      fetchApps();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete app",
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
      <AppHeader />
      <div className="pt-8 pb-8">
        <div className="max-w-screen-lg mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
              <Shield className="w-6 h-6 text-base-blue" />
              Admin - App Management
            </h1>
            <p className="text-muted-foreground text-sm">
              Review and manage app submissions
            </p>
            <div className="mt-4 flex gap-2">
              <a href="/api/admin/apps/export-csv" download>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              </a>
              {userRole === "ADMIN" && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 border-base-blue/50 text-base-blue hover:bg-base-blue/10"
                    onClick={() => setShowAutoImportDialog(true)}
                  >
                    <Upload className="w-4 h-4" />
                    Auto Import
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                    onClick={() => setShowJsonImportDialog(true)}
                  >
                    <Upload className="w-4 h-4" />
                    Import from .json URL
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                    onClick={() => setShowBulkImportDialog(true)}
                  >
                    <Upload className="w-4 h-4" />
                    Bulk Import (CSV JSON)
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="gap-2 bg-gradient-to-r from-purple-500 to-base-blue hover:from-purple-600 hover:to-base-blue/90"
                    onClick={handleSyncMiniapps}
                    disabled={syncingMiniapps}
                  >
                    {syncingMiniapps ? (
                      <>
                        <Zap className="w-4 h-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Sync Featured Mini Apps
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Pending Apps */}
          {pendingApps.length > 0 && (
            <Card className="glass-card mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  Pending Review ({pendingApps.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingApps.map((app) => (
                    <div
                      key={app.id}
                      className="p-4 rounded-lg bg-background-secondary border border-white/10"
                    >
                      <div className="flex items-start gap-4">
                        {app.iconUrl && (
                          <Image
                            src={app.iconUrl}
                            alt={app.name}
                            width={64}
                            height={64}
                            className="w-16 h-16 rounded-xl flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-lg mb-1">{app.name}</h3>
                              <p className="text-sm text-muted-foreground mb-2">
                                {app.description}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                                <span>Category: {app.category}</span>
                                <span>Developer: {app.developer?.name || "Unknown"}</span>
                                {app.developer?.verified && (
                                  <span className="text-green-500">✓ Verified Dev</span>
                                )}
                              </div>
                              {app.reviewMessage && (
                                <div className="bg-base-blue/10 border border-base-blue/30 rounded p-2 mt-2">
                                  <p className="text-xs font-medium mb-1">Review Request:</p>
                                  <p className="text-xs text-muted-foreground">
                                    {app.reviewMessage}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            <Button
                              onClick={() => handleAppAction(app.id, "approve")}
                              disabled={processing === app.id}
                              className="bg-green-600 hover:bg-green-700"
                              size="sm"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              onClick={() => handleAppAction(app.id, "reject")}
                              disabled={processing === app.id}
                              variant="destructive"
                              size="sm"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                            <Link href={app.url} target="_blank">
                              <Button variant="outline" size="sm">
                                <ExternalLink className="w-4 h-4 mr-2" />
                                View App
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Apps */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>All Apps ({apps.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {apps.map((app) => (
                  <div
                    key={app.id}
                    className="p-3 rounded-lg bg-background-secondary border border-white/10 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {app.iconUrl && (
                        <Image
                          src={app.iconUrl}
                          alt={app.name}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{app.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <span>Status: {app.status}</span>
                          {app.verified && <span className="text-green-500">✓ Verified</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <p className="truncate">URL: {app.url}</p>
                          {app.baseMiniAppUrl && <p className="truncate">Base: {app.baseMiniAppUrl}</p>}
                          {app.farcasterUrl && <p className="truncate">Farcaster: {app.farcasterUrl}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Show Approve button for pending_review apps */}
                      {(app.status === "pending_review" || app.status === "pending") && (
                        <Button
                          onClick={() => handleAppAction(app.id, "approve")}
                          disabled={processing === app.id}
                          className="bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                      )}
                      {app.contractAddress && !app.contractVerified && (
                        <>
                          <Button
                            onClick={() => handleAppAction(app.id, "approve_contract")}
                            disabled={processing === app.id}
                            variant="outline"
                            size="sm"
                            className="border-green-600/50 text-green-400 hover:bg-green-600/10"
                          >
                            <Shield className="w-4 h-4 mr-1" />
                            Approve Contract
                          </Button>
                          <Button
                            onClick={() => handleAppAction(app.id, "reject_contract")}
                            disabled={processing === app.id}
                            variant="outline"
                            size="sm"
                            className="border-red-600/50 text-red-400 hover:bg-red-600/10"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject Contract
                          </Button>
                        </>
                      )}
                      {!app.verified && (
                        <Button
                          onClick={() => handleAppAction(app.id, "verify")}
                          disabled={processing === app.id}
                          variant="outline"
                          size="sm"
                          className="border-green-600/50 text-green-400 hover:bg-green-600/10"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Verify
                        </Button>
                      )}
                      {app.featuredInBanner ? (
                        <Button
                          onClick={() => handleAppAction(app.id, "unfeature_banner")}
                          disabled={processing === app.id}
                          variant="outline"
                          size="sm"
                          className="border-yellow-600/50 text-yellow-400 hover:bg-yellow-600/10"
                          title="Remove from homepage banner"
                        >
                          <Star className="w-4 h-4 mr-1 fill-yellow-400" />
                          Featured
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleAppAction(app.id, "feature_banner")}
                          disabled={processing === app.id}
                          variant="outline"
                          size="sm"
                          className="border-purple-600/50 text-purple-400 hover:bg-purple-600/10"
                          title="Add to homepage banner"
                        >
                          <Star className="w-4 h-4 mr-1" />
                          Feature
                        </Button>
                      )}
                      <Button
                        onClick={() => handleEditClick(app)}
                        disabled={processing === app.id}
                        variant="outline"
                        size="sm"
                        className="border-base-blue/50 text-base-blue hover:bg-base-blue/10"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      {userRole === "ADMIN" && (
                        <Button
                          onClick={() => setShowDeleteDialog(app.id)}
                          disabled={processing === app.id}
                          variant="outline"
                          size="sm"
                          className="border-red-600/50 text-red-400 hover:bg-red-600/10"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      )}
                      <Link href={`/apps/${app.id}`}>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Edit Dialog */}
          <Dialog open={!!editingApp} onOpenChange={(open) => !open && setEditingApp(null)}>
            <DialogContent className="glass-card border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit App: {editingApp?.name}</DialogTitle>
                <DialogDescription>
                  Update app details. All changes will be saved immediately.
                </DialogDescription>
              </DialogHeader>
              {editingApp && (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">App Name *</Label>
                    <Input
                      id="edit-name"
                      value={editFormData.name || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="glass-card"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Description *</Label>
                    <Textarea
                      id="edit-description"
                      value={editFormData.description || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                      className="glass-card min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-url">Main Website URL *</Label>
                    <Input
                      id="edit-url"
                      type="url"
                      value={editFormData.url || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, url: e.target.value })}
                      className="glass-card"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-base-url">Base Mini App URL (Optional)</Label>
                    <Input
                      id="edit-base-url"
                      type="url"
                      value={editFormData.baseMiniAppUrl || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, baseMiniAppUrl: e.target.value })}
                      className="glass-card"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-farcaster-url">Farcaster Mini App URL (Optional)</Label>
                    <Input
                      id="edit-farcaster-url"
                      type="url"
                      value={editFormData.farcasterUrl || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, farcasterUrl: e.target.value })}
                      className="glass-card"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-icon-url">Icon URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="edit-icon-url"
                        type="url"
                        value={editFormData.iconUrl || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, iconUrl: e.target.value })}
                        className="glass-card flex-1"
                        placeholder="https://example.com/icon.png"
                      />
                      <input
                        ref={iconFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, "icon");
                        }}
                        disabled={uploadingIcon}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingIcon}
                        className="whitespace-nowrap"
                        onClick={() => iconFileInputRef.current?.click()}
                      >
                        {uploadingIcon ? "Uploading..." : "Upload"}
                      </Button>
                    </div>
                    {editFormData.iconUrl && (
                      <div className="mt-2">
                        <Image
                          src={editFormData.iconUrl}
                          alt="Icon preview"
                          width={64}
                          height={64}
                          className="w-16 h-16 rounded-lg border border-gray-700"
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Enter a URL or upload a new icon image (max 5MB)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-header-image-url">Header Image URL (Optional)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="edit-header-image-url"
                        type="url"
                        placeholder="https://myapp.example.com/header.png or og-image from farcaster.json"
                        value={editFormData.headerImageUrl || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, headerImageUrl: e.target.value })}
                        className="glass-card flex-1"
                      />
                      <input
                        ref={headerFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, "header");
                        }}
                        disabled={uploadingHeader}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingHeader}
                        className="whitespace-nowrap"
                        onClick={() => headerFileInputRef.current?.click()}
                      >
                        {uploadingHeader ? "Uploading..." : "Upload"}
                      </Button>
                    </div>
                    {editFormData.headerImageUrl && (
                      <div className="mt-2">
                        <Image
                          src={editFormData.headerImageUrl}
                          alt="Header preview"
                          width={400}
                          height={200}
                          className="w-full max-w-md h-32 object-cover rounded-lg border border-gray-700"
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Header image for app banner and detail page (like Twitter header). Enter a URL or upload a new image (max 5MB)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-category">Category *</Label>
                    <Select
                      value={editFormData.category || ""}
                      onValueChange={(value) => setEditFormData({ ...editFormData, category: value })}
                    >
                      <SelectTrigger className="glass-card">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="glass-card border-white/10">
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="screenshots">Screenshots (Optional)</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Add screenshots to showcase the app, similar to Play Store. You can upload images or add URLs.
                    </p>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          id="screenshots"
                          type="url"
                          placeholder="https://example.com/screenshot.png"
                          value={screenshotInput}
                          onChange={(e) => setScreenshotInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && screenshotInput.trim()) {
                              e.preventDefault();
                              handleAddScreenshotUrl();
                            }
                          }}
                          className="glass-card flex-1"
                        />
                        <input
                          ref={screenshotFileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, "screenshot");
                          }}
                          disabled={uploadingScreenshot}
                        />
                        <Button
                          type="button"
                          onClick={handleAddScreenshotUrl}
                          disabled={!screenshotInput.trim()}
                          className="bg-base-blue hover:bg-base-blue/90"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => screenshotFileInputRef.current?.click()}
                          disabled={uploadingScreenshot}
                          className="whitespace-nowrap"
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          {uploadingScreenshot ? "Uploading..." : "Upload"}
                        </Button>
                      </div>
                      {editFormData.screenshots && editFormData.screenshots.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                          {editFormData.screenshots.map((screenshot: string, index: number) => (
                            <div key={index} className="relative group">
                              <img
                                src={screenshot}
                                alt={`Screenshot ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg border border-white/10"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "https://via.placeholder.com/400x300?text=Invalid+Image";
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveScreenshot(index)}
                                className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setEditingApp(null)}
                  disabled={!!processing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={!!processing || !editFormData.name || !editFormData.description || !editFormData.url || !editFormData.category}
                  className="bg-base-blue hover:bg-base-blue/90"
                >
                  {processing === editingApp?.id ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Auto Import Dialog */}
          <Dialog open={showAutoImportDialog} onOpenChange={setShowAutoImportDialog}>
            <DialogContent className="glass-card border-white/10 max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-base-blue" />
                  Auto Import from Farcaster.json
                </DialogTitle>
                <DialogDescription>
                  Enter the app URL. We'll automatically fetch metadata from /.well-known/farcaster.json including name, icon, description, and all app details.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="import-url">App URL *</Label>
                  <Input
                    id="import-url"
                    type="url"
                    placeholder="https://myapp.example.com"
                    value={autoImportUrl}
                    onChange={(e) => setAutoImportUrl(e.target.value)}
                    className="glass-card"
                  />
                  <p className="text-xs text-muted-foreground">
                    We'll automatically fetch farcaster.json and extract all metadata including the app icon.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAutoImportDialog(false);
                    setAutoImportUrl("");
                  }}
                  disabled={importing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!autoImportUrl) {
                      toast({
                        title: "Error",
                        description: "Please enter an app URL",
                        variant: "destructive",
                      });
                      return;
                    }

                    // Validate URL format
                    try {
                      new URL(autoImportUrl);
                    } catch {
                      toast({
                        title: "Error",
                        description: "Please enter a valid URL",
                        variant: "destructive",
                      });
                      return;
                    }

                    setImporting(true);
                    try {
                      const res = await fetch("/api/admin/apps/auto-import", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                          url: autoImportUrl,
                        }),
                      });

                      const data = await res.json();

                      if (!res.ok) {
                        throw new Error(data.error || data.message || "Failed to import app");
                      }

                      toast({
                        title: "Success",
                        description: `App "${data.app?.name || 'App'}" imported successfully from farcaster.json`,
                      });

                      setShowAutoImportDialog(false);
                      setAutoImportUrl("");
                      fetchApps();
                    } catch (error: any) {
                      toast({
                        title: "Error",
                        description: error.message || "Failed to import app",
                        variant: "destructive",
                      });
                    } finally {
                      setImporting(false);
                    }
                  }}
                  disabled={importing || !autoImportUrl}
                  className="bg-base-blue hover:bg-base-blue/90"
                >
                  {importing ? "Importing..." : "Import App"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* JSON URL Import Dialog */}
          <Dialog open={showJsonImportDialog} onOpenChange={setShowJsonImportDialog}>
            <DialogContent className="glass-card border-white/10 max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-purple-400" />
                  Import from Farcaster.json URL
                </DialogTitle>
                <DialogDescription>
                  Enter the direct URL to a farcaster.json file and the developer wallet address. The app will be automatically created and approved.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="json-url">Farcaster.json URL *</Label>
                  <Input
                    id="json-url"
                    type="url"
                    placeholder="https://example.com/.well-known/farcaster.json"
                    value={jsonUrl}
                    onChange={(e) => setJsonUrl(e.target.value)}
                    className="glass-card"
                  />
                  <p className="text-xs text-muted-foreground">
                    Direct URL to the farcaster.json file
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="json-wallet">Developer Wallet *</Label>
                  <Input
                    id="json-wallet"
                    type="text"
                    placeholder="0x..."
                    value={jsonWallet}
                    onChange={(e) => setJsonWallet(e.target.value)}
                    className="glass-card font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Wallet address of the app developer
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowJsonImportDialog(false);
                    setJsonUrl("");
                    setJsonWallet("");
                  }}
                  disabled={importingJson}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!jsonUrl || !jsonWallet) {
                      toast({
                        title: "Error",
                        description: "Please fill in all fields",
                        variant: "destructive",
                      });
                      return;
                    }

                    // Validate wallet format
                    if (!/^0x[a-fA-F0-9]{40}$/i.test(jsonWallet)) {
                      toast({
                        title: "Error",
                        description: "Invalid wallet address format",
                        variant: "destructive",
                      });
                      return;
                    }

                    setImportingJson(true);
                    try {
                      const res = await fetch("/api/admin/apps/import-json", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                          jsonUrl: jsonUrl,
                          developerWallet: jsonWallet,
                        }),
                      });

                      const data = await res.json();

                      if (!res.ok) {
                        throw new Error(data.error || "Failed to import app");
                      }

                      toast({
                        title: "Success",
                        description: "App imported successfully from farcaster.json URL",
                      });

                      setShowJsonImportDialog(false);
                      setJsonUrl("");
                      setJsonWallet("");
                      fetchApps();
                    } catch (error: any) {
                      toast({
                        title: "Error",
                        description: error.message || "Failed to import app",
                        variant: "destructive",
                      });
                    } finally {
                      setImportingJson(false);
                    }
                  }}
                  disabled={importingJson || !jsonUrl || !jsonWallet}
                  className="bg-purple-500 hover:bg-purple-600"
                >
                  {importingJson ? "Importing..." : "Import App"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Bulk CSV-Style JSON Import Dialog */}
          <Dialog open={showBulkImportDialog} onOpenChange={setShowBulkImportDialog}>
            <DialogContent className="glass-card border-white/10 max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-cyan-400" />
                  Bulk Import from CSV-Style JSON
                </DialogTitle>
                <DialogDescription>
                  Import multiple apps from a CSV-style JSON array (matches export format). Use this for the seed file at <code className="text-xs bg-white/10 px-1 rounded">/seed/miniapps-seed.json</code>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-json-url">JSON URL *</Label>
                  <Input
                    id="bulk-json-url"
                    type="url"
                    placeholder="http://localhost:3000/seed/miniapps-seed.json"
                    value={bulkJsonUrl}
                    onChange={(e) => setBulkJsonUrl(e.target.value)}
                    className="glass-card"
                  />
                  <p className="text-xs text-muted-foreground">
                    URL to CSV-style JSON array (e.g., <code className="text-xs">/seed/miniapps-seed.json</code>)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bulk-default-wallet">Default Developer Wallet (Optional)</Label>
                  <Input
                    id="bulk-default-wallet"
                    type="text"
                    placeholder="0x0CF70E448ac98689e326bd79075a96CcBcec1665"
                    value={bulkDefaultWallet}
                    onChange={(e) => setBulkDefaultWallet(e.target.value)}
                    className="glass-card font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for apps without a Developer Wallet. Defaults to system wallet if empty.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBulkImportDialog(false);
                    setBulkJsonUrl("");
                    setBulkDefaultWallet("0x0CF70E448ac98689e326bd79075a96CcBcec1665");
                  }}
                  disabled={importingBulk}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!bulkJsonUrl) {
                      toast({
                        title: "Error",
                        description: "Please provide a JSON URL",
                        variant: "destructive",
                      });
                      return;
                    }

                    setImportingBulk(true);
                    try {
                      const res = await fetch("/api/admin/apps/import-csv-json", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                          jsonUrl: bulkJsonUrl,
                          defaultDeveloperWallet: bulkDefaultWallet || undefined,
                        }),
                      });

                      const data = await res.json();

                      if (!res.ok) {
                        throw new Error(data.error || data.message || "Failed to import apps");
                      }

                      toast({
                        title: "Success",
                        description: `Imported ${data.total || 0} apps (${data.created || 0} created, ${data.updated || 0} updated)`,
                        duration: 5000,
                      });

                      if (data.errors && data.errors.length > 0) {
                        console.warn("Import errors:", data.errors);
                        toast({
                          title: "Some errors occurred",
                          description: `${data.errors.length} apps had errors. Check console for details.`,
                          variant: "destructive",
                          duration: 8000,
                        });
                      }

                      setShowBulkImportDialog(false);
                      setBulkJsonUrl("");
                      fetchApps();
                    } catch (error: any) {
                      toast({
                        title: "Error",
                        description: error.message || "Failed to import apps",
                        variant: "destructive",
                      });
                    } finally {
                      setImportingBulk(false);
                    }
                  }}
                  disabled={importingBulk || !bulkJsonUrl}
                  className="bg-cyan-500 hover:bg-cyan-600"
                >
                  {importingBulk ? "Importing..." : "Import Apps"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={!!showDeleteDialog} onOpenChange={(open) => !open && setShowDeleteDialog(null)}>
            <DialogContent className="glass-card border-red-500/30">
              <DialogHeader>
                <DialogTitle className="text-red-400">Delete App</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this app? This action cannot be undone and will delete all associated ratings, reviews, XP, and earnings.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteDialog(null)}
                  disabled={!!processing}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => showDeleteDialog && handleDelete(showDeleteDialog)}
                  disabled={!!processing}
                >
                  {processing === showDeleteDialog ? "Deleting..." : "Delete App"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

