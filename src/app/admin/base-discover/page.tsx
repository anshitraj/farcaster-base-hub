"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import PageLoader from "@/components/PageLoader";
import AppHeader from "@/components/AppHeader";
import { useToast } from "@/hooks/use-toast";
import { Image as ImageIcon, Plus, Trash2, Loader2, Upload } from "lucide-react";
import Image from "next/image";
import { trackPageView } from "@/lib/analytics";
import { formatDistanceToNow } from "date-fns";

interface BaseDiscoverPost {
  id: string;
  imageUrl: string;
  redirectUrl: string;
  createdAt: string;
}

export default function AdminBaseDiscoverPage() {
  const [posts, setPosts] = useState<BaseDiscoverPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    imageUrl: "",
    redirectUrl: "",
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    trackPageView("/admin/base-discover");
    fetchPosts();
  }, []);

  async function fetchPosts() {
    try {
      const res = await fetch("/api/base-discover/list", {
        credentials: "include",
        cache: "no-store", // Force fresh data
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Failed to fetch posts:", res.status, errorData);
        throw new Error(errorData.error || "Failed to fetch posts");
      }

      const data = await res.json();
      console.log("Fetched posts:", data);
      setPosts(data.posts || []);
      
      if (data.error) {
        console.warn("API returned error but posts:", data.error);
      }
    } catch (error: any) {
      console.error("Error fetching Base Discover posts:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch Base Discover posts. Make sure the database table exists.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleImageUpload(file: File) {
    setUploadingImage(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData({ ...formData, imageUrl: base64String });
        setImagePreview(base64String);
        setUploadingImage(false);
      };
      reader.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to read image file",
          variant: "destructive",
        });
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
      setUploadingImage(false);
    }
  }

  async function handleCreatePost() {
    if (!formData.imageUrl.trim()) {
      toast({
        title: "Validation Error",
        description: "Image is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.redirectUrl.trim()) {
      toast({
        title: "Validation Error",
        description: "Redirect URL is required",
        variant: "destructive",
      });
      return;
    }

    // Validate URL format
    try {
      new URL(formData.redirectUrl);
    } catch {
      toast({
        title: "Validation Error",
        description: "Redirect URL must be a valid URL",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/base-discover/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          imageUrl: formData.imageUrl,
          redirectUrl: formData.redirectUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error("Create post failed:", data);
        
        // Show helpful error message if table doesn't exist
        if (data.details?.includes("does not exist") || data.hint) {
          throw new Error(data.details || data.hint || "Database table not found. Run 'npm run drizzle:push' first.");
        }
        
        throw new Error(data.error || data.details || "Failed to create post");
      }

      const result = await res.json();
      console.log("Create post response:", result);
      
      toast({
        title: "Success",
        description: "Base Discover post created successfully! It will appear on the homepage immediately.",
      });

      setShowCreateDialog(false);
      setFormData({
        imageUrl: "",
        redirectUrl: "",
      });
      setImagePreview(null);
      
      // Wait a bit then refresh
      setTimeout(() => {
        fetchPosts();
      }, 500);
    } catch (error: any) {
      console.error("Error creating post:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create Base Discover post",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleDeletePost(postId: string) {
    if (!confirm("Are you sure you want to delete this post?")) {
      return;
    }

    try {
      const res = await fetch(`/api/base-discover/${postId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete post");
      }

      toast({
        title: "Success",
        description: "Post deleted successfully",
      });

      await fetchPosts();
    } catch (error: any) {
      console.error("Error deleting post:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete post",
        variant: "destructive",
      });
    }
  }

  if (loading) {
    return <PageLoader message="Loading Base Discover posts..." />;
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] pb-24">
      <AppHeader />
      <div className="pt-8 pb-8">
        <div className="max-w-screen-xl mx-auto px-4">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
                <ImageIcon className="w-6 h-6 text-base-blue" />
                Base Discover Posts
              </h1>
              <p className="text-muted-foreground text-sm">
                Manage Base Discover posts (admin-uploaded image posts for homepage)
              </p>
            </div>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Base Post
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((post) => (
              <Card key={post.id} className="glass-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Base Discover</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePost(post.id)}
                      className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-900">
                      <Image
                        src={post.imageUrl}
                        alt="Base Discover post"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Redirect URL:</p>
                      <a
                        href={post.redirectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-base-blue hover:text-base-cyan break-all"
                      >
                        {post.redirectUrl}
                      </a>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {posts.length === 0 && (
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No Base Discover posts yet</p>
                  <Button
                    onClick={() => setShowCreateDialog(true)}
                    className="mt-4"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Post
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Post Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Base Discover Post</DialogTitle>
            <DialogDescription>
              Add a new post to the Base Discover section. This will appear on the homepage below the Base Social Feed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="image">
                Image *
                {uploadingImage && (
                  <Loader2 className="w-3 h-3 inline-block ml-2 animate-spin" />
                )}
              </Label>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImageUpload(file);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingImage ? "Uploading..." : "Upload Image"}
                </Button>
                {imagePreview && (
                  <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-900 mt-2">
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Upload an image or paste an image URL below
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL (alternative to upload)</Label>
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={formData.imageUrl.startsWith("data:") ? "" : formData.imageUrl}
                onChange={(e) => {
                  setFormData({ ...formData, imageUrl: e.target.value });
                  if (e.target.value && !e.target.value.startsWith("data:")) {
                    setImagePreview(e.target.value);
                  }
                }}
                disabled={uploadingImage || formData.imageUrl.startsWith("data:")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="redirectUrl">Redirect URL *</Label>
              <Input
                id="redirectUrl"
                type="url"
                placeholder="https://example.com"
                value={formData.redirectUrl}
                onChange={(e) => setFormData({ ...formData, redirectUrl: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                URL to redirect to when the image is clicked
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setFormData({ imageUrl: "", redirectUrl: "" });
                setImagePreview(null);
              }}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreatePost} disabled={creating || uploadingImage}>
              {creating ? "Creating..." : "Create Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

