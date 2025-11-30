"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageLoader from "@/components/PageLoader";
import AppHeader from "@/components/AppHeader";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Upload, Image as ImageIcon, Eye, MousePointerClick, X } from "lucide-react";
import Image from "next/image";
import { trackPageView } from "@/lib/analytics";

export default function AdminAdvertisementsPage() {
  const [advertisements, setAdvertisements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [editingAd, setEditingAd] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [userRole, setUserRole] = useState<"ADMIN" | "MODERATOR" | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    trackPageView("/admin/advertisements");
    fetchUserRole();
    fetchAdvertisements();
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

  async function fetchAdvertisements() {
    try {
      const res = await fetch("/api/admin/advertisements", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAdvertisements(data.advertisements || []);
      }
    } catch (error) {
      console.error("Error fetching advertisements:", error);
      toast({
        title: "Error",
        description: "Failed to fetch advertisements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(file: File) {
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "advertisement");

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
      setEditFormData({ ...editFormData, imageUrl: data.url });

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Upload Error",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  }

  function handleEditClick(ad: any) {
    setEditingAd(ad);
    setEditFormData({
      title: ad.title || "",
      imageUrl: ad.imageUrl || "",
      linkUrl: ad.linkUrl || "",
      position: ad.position || "sidebar",
      isActive: ad.isActive,
      order: ad.order || 0,
    });
  }

  function handleAddClick() {
    setEditingAd(null);
    setEditFormData({
      title: "",
      imageUrl: "",
      linkUrl: "",
      position: "sidebar",
      isActive: true,
      order: 0,
    });
    setShowAddDialog(true);
  }

  async function handleSave() {
    if (!editFormData.imageUrl) {
      toast({
        title: "Error",
        description: "Image URL is required",
        variant: "destructive",
      });
      return;
    }

    setProcessing(editingAd?.id || "new");
    try {
      const url = editingAd
        ? "/api/admin/advertisements"
        : "/api/admin/advertisements";
      const method = editingAd ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(
          editingAd
            ? { id: editingAd.id, ...editFormData }
            : editFormData
        ),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save advertisement");
      }

      toast({
        title: "Success",
        description: `Advertisement ${editingAd ? "updated" : "created"} successfully`,
      });

      setEditingAd(null);
      setShowAddDialog(false);
      fetchAdvertisements();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save advertisement",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  }

  async function handleDelete(id: string) {
    setProcessing(id);
    try {
      const res = await fetch(`/api/admin/advertisements?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete advertisement");
      }

      toast({
        title: "Success",
        description: "Advertisement deleted successfully",
      });

      setShowDeleteDialog(null);
      fetchAdvertisements();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete advertisement",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  }

  if (loading) {
    return <PageLoader message="Loading advertisements..." />;
  }

  if (userRole !== "ADMIN") {
    return (
      <div className="min-h-screen bg-[#0B0F19] pb-24">
        <AppHeader />
        <div className="pt-8 pb-8">
          <div className="max-w-screen-lg mx-auto px-4">
            <Card className="glass-card">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  Only admins can manage advertisements.
                </p>
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
        <div className="max-w-screen-lg mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
              <ImageIcon className="w-6 h-6 text-base-blue" />
              Admin - Advertisement Management
            </h1>
            <p className="text-muted-foreground text-sm">
              Manage advertisements displayed in the sidebar
            </p>
            <div className="mt-4">
              <Button
                onClick={handleAddClick}
                className="bg-base-blue hover:bg-base-blue/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Advertisement
              </Button>
            </div>
          </div>

          {/* Advertisements List */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>All Advertisements ({advertisements.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {advertisements.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No advertisements yet. Click "Add Advertisement" to create one.
                  </div>
                ) : (
                  advertisements.map((ad) => (
                    <div
                      key={ad.id}
                      className="p-4 rounded-lg bg-background-secondary border border-white/10 flex items-center gap-4"
                    >
                      {/* Ad Preview */}
                      <div className="flex-shrink-0">
                        {ad.imageUrl ? (
                          <Image
                            src={ad.imageUrl}
                            alt={ad.title || "Advertisement"}
                            width={120}
                            height={80}
                            className="w-30 h-20 object-cover rounded-lg border border-gray-700"
                          />
                        ) : (
                          <div className="w-30 h-20 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-gray-600" />
                          </div>
                        )}
                      </div>

                      {/* Ad Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold truncate">
                              {ad.title || "Untitled Advertisement"}
                            </h4>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                              <span>Position: {ad.position}</span>
                              <span className={`${ad.isActive ? "text-green-500" : "text-gray-500"}`}>
                                {ad.isActive ? "Active" : "Inactive"}
                              </span>
                              <span>Order: {ad.order}</span>
                            </div>
                            {ad.linkUrl && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                Link: {ad.linkUrl}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            <span>{ad.viewCount || 0} views</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MousePointerClick className="w-3 h-3" />
                            <span>{ad.clickCount || 0} clicks</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          onClick={() => handleEditClick(ad)}
                          disabled={processing === ad.id}
                          variant="outline"
                          size="sm"
                          className="border-base-blue/50 text-base-blue hover:bg-base-blue/10"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          onClick={() => setShowDeleteDialog(ad.id)}
                          disabled={processing === ad.id}
                          variant="outline"
                          size="sm"
                          className="border-red-600/50 text-red-400 hover:bg-red-600/10"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Add/Edit Dialog */}
          <Dialog open={showAddDialog || !!editingAd} onOpenChange={(open) => {
            if (!open) {
              setShowAddDialog(false);
              setEditingAd(null);
            }
          }}>
            <DialogContent className="glass-card border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingAd ? "Edit Advertisement" : "Add Advertisement"}
                </DialogTitle>
                <DialogDescription>
                  {editingAd
                    ? "Update advertisement details. All changes will be saved immediately."
                    : "Create a new advertisement to display in the sidebar."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="ad-title">Title (Optional)</Label>
                  <Input
                    id="ad-title"
                    value={editFormData.title || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    className="glass-card"
                    placeholder="Advertisement title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ad-image-url">Image URL *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="ad-image-url"
                      type="url"
                      value={editFormData.imageUrl || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, imageUrl: e.target.value })}
                      className="glass-card flex-1"
                      placeholder="https://example.com/ad-image.png"
                    />
                    <input
                      ref={imageFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      disabled={uploadingImage}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingImage}
                      className="whitespace-nowrap"
                      onClick={() => imageFileInputRef.current?.click()}
                    >
                      {uploadingImage ? "Uploading..." : <><Upload className="w-4 h-4 mr-1" />Upload</>}
                    </Button>
                  </div>
                  {editFormData.imageUrl && (
                    <div className="mt-2">
                      <Image
                        src={editFormData.imageUrl}
                        alt="Ad preview"
                        width={400}
                        height={200}
                        className="w-full max-w-md h-32 object-cover rounded-lg border border-gray-700"
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Enter a URL or upload an image (max 5MB)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ad-link-url">Link URL (Optional)</Label>
                  <Input
                    id="ad-link-url"
                    type="url"
                    value={editFormData.linkUrl || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, linkUrl: e.target.value })}
                    className="glass-card"
                    placeholder="https://example.com (where users go when clicking the ad)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ad-position">Position *</Label>
                  <Select
                    value={editFormData.position || "sidebar"}
                    onValueChange={(value) => setEditFormData({ ...editFormData, position: value })}
                  >
                    <SelectTrigger className="glass-card">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10">
                      <SelectItem value="sidebar">Sidebar</SelectItem>
                      <SelectItem value="header">Header</SelectItem>
                      <SelectItem value="footer">Footer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ad-order">Display Order *</Label>
                  <Input
                    id="ad-order"
                    type="number"
                    value={editFormData.order || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, order: parseInt(e.target.value) || 0 })}
                    className="glass-card"
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower numbers appear first. Use 0 for default order.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ad-active"
                    checked={editFormData.isActive !== false}
                    onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="ad-active" className="cursor-pointer">
                    Active (visible to users)
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddDialog(false);
                    setEditingAd(null);
                  }}
                  disabled={!!processing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!!processing || !editFormData.imageUrl}
                  className="bg-base-blue hover:bg-base-blue/90"
                >
                  {processing ? "Saving..." : editingAd ? "Save Changes" : "Create Advertisement"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={!!showDeleteDialog} onOpenChange={(open) => !open && setShowDeleteDialog(null)}>
            <DialogContent className="glass-card border-red-500/30">
              <DialogHeader>
                <DialogTitle className="text-red-400">Delete Advertisement</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this advertisement? This action cannot be undone.
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
                  {processing === showDeleteDialog ? "Deleting..." : "Delete Advertisement"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

