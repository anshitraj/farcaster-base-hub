"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import PageLoader from "@/components/PageLoader";
import AppHeader from "@/components/AppHeader";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Plus, Trash2, Twitter, User, Loader2 } from "lucide-react";
import Image from "next/image";
import { trackPageView } from "@/lib/analytics";
import { formatDistanceToNow } from "date-fns";

interface SocialPost {
  id: string;
  castId?: string;
  authorName?: string;
  authorHandle?: string;
  authorAvatar?: string;
  content: string;
  mediaUrl?: string;
  createdAt: string;
}

export default function AdminSocialPostsPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    content: "",
    mediaUrl: "",
    authorName: "",
    authorHandle: "",
    authorAvatar: "",
  });
  const [fetchingTweet, setFetchingTweet] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    trackPageView("/admin/social-posts");
    fetchPosts();
  }, []);

  async function fetchPosts() {
    try {
      const res = await fetch("/api/admin/social-posts", {
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          toast({
            title: "Access Denied",
            description: "You need admin access to view this page.",
            variant: "destructive",
          });
          return;
        }
        throw new Error("Failed to fetch posts");
      }

      const data = await res.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast({
        title: "Error",
        description: "Failed to fetch social posts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePost() {
    if (!formData.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Content is required",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/admin/social-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content: formData.content,
          mediaUrl: formData.mediaUrl || undefined,
          authorName: formData.authorName || undefined,
          authorHandle: formData.authorHandle || undefined,
          authorAvatar: formData.authorAvatar || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create post");
      }

      toast({
        title: "Success",
        description: "Social post created successfully! It will appear in the feed immediately.",
      });

      setShowCreateDialog(false);
      setFormData({
        content: "",
        mediaUrl: "",
        authorName: "",
        authorHandle: "",
        authorAvatar: "",
      });
      await fetchPosts();
    } catch (error: any) {
      console.error("Error creating post:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create social post",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  // Extract tweet ID from Twitter URL
  function extractTweetId(url: string): boolean {
    const patterns = [
      /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/i,
      /status\/(\d+)/i,
    ];
    return patterns.some(pattern => pattern.test(url));
  }

  // Check if URL is a Farcaster cast URL (including Base.app)
  // Must match: base.app/post/<hash>, warpcast.com/~/casts/<hash>, farcaster.xyz/dwr/<hash>
  // Or direct hash: 0x followed by at least 8 hex chars (minimum 10 total)
  function isFarcasterUrl(url: string): boolean {
    return /base\.app\/post\/0x[a-fA-F0-9]{8,}|warpcast\.com\/~\/casts\/0x[a-fA-F0-9]{8,}|farcaster\.xyz\/dwr\/0x[a-fA-F0-9]{8,}|^0x[a-fA-F0-9]{8,}$/i.test(url);
  }

  // Fetch tweet data from Twitter API
  async function fetchTweetData(url: string) {
    setFetchingTweet(true);
    try {
      const res = await fetch("/api/admin/fetch-tweet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const data = await res.json();
        const errorMessage = data.error || "Failed to fetch tweet";
        
        // For rate limit errors, provide more helpful message
        if (res.status === 429 || data.rateLimitError) {
          throw new Error("Twitter API rate limit exceeded. You can still create the post manually by filling in the fields below.");
        }
        
        throw new Error(errorMessage);
      }

      const data = await res.json();
      
      if (data.success && data.tweet) {
        // Auto-populate form fields
        setFormData({
          content: data.tweet.content || formData.content,
          mediaUrl: data.tweet.mediaUrl || formData.mediaUrl, // Use fetched media or keep existing
          authorName: data.tweet.authorName || formData.authorName,
          authorHandle: data.tweet.authorHandle || formData.authorHandle,
          authorAvatar: data.tweet.authorAvatar || formData.authorAvatar,
        });

        const source = data.source === "cdn" ? " (using public CDN)" : "";
        toast({
          title: "Tweet fetched!",
          description: `Tweet data has been auto-populated${source}.`,
        });
      }
    } catch (error: any) {
      console.error("Error fetching tweet:", error);
      toast({
        title: "Could not fetch tweet",
        description: error.message || "Please fill in the fields manually.",
        variant: "destructive",
      });
    } finally {
      setFetchingTweet(false);
    }
  }

  // Fetch Farcaster cast data from Neynar API
  async function fetchCastData(url: string) {
    setFetchingTweet(true);
    try {
      const res = await fetch("/api/admin/fetch-cast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch cast");
      }

      const data = await res.json();
      
      if (data.success && data.cast) {
        // Auto-populate form fields
        setFormData({
          content: data.cast.content || formData.content,
          mediaUrl: data.cast.mediaUrl || formData.mediaUrl,
          authorName: data.cast.authorName || formData.authorName,
          authorHandle: data.cast.authorHandle ? (data.cast.authorHandle.startsWith('@') ? data.cast.authorHandle : `@${data.cast.authorHandle}`) : formData.authorHandle,
          authorAvatar: data.cast.authorAvatar || formData.authorAvatar,
        });

        toast({
          title: "Cast fetched!",
          description: "Farcaster cast data has been auto-populated.",
        });
      }
    } catch (error: any) {
      console.error("Error fetching cast:", error);
      toast({
        title: "Could not fetch cast",
        description: error.message || "Please fill in the fields manually.",
        variant: "destructive",
      });
    } finally {
      setFetchingTweet(false);
    }
  }

  // Auto-fetch data when URL is detected in Media URL
  async function handleMediaUrlChange(url: string) {
    setFormData({ ...formData, mediaUrl: url });

    if (!url) return;

    // Check if it's a Twitter URL
    if (url.includes('twitter.com') || url.includes('x.com')) {
      if (extractTweetId(url)) {
        await fetchTweetData(url);
      }
    }
    // Check if it's a Farcaster cast URL
    else if (isFarcasterUrl(url)) {
      await fetchCastData(url);
    }
  }

  // Auto-fetch data when URL is detected in Content
  async function handleContentChange(content: string) {
    setFormData({ ...formData, content });

    if (!content || fetchingTweet) return;

    // Check if content contains a Twitter URL
    const twitterUrlMatch = content.match(/https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/\w+\/status\/\d+/i);
    if (twitterUrlMatch) {
      const twitterUrl = twitterUrlMatch[0];
      if (extractTweetId(twitterUrl)) {
        await fetchTweetData(twitterUrl);
        return;
      }
    }

    // Check if content contains a Farcaster cast URL
    // Match: base.app/post/0x..., warpcast.com/~/casts/0x..., farcaster.xyz/dwr/0x...
    const farcasterUrlMatch = content.match(/https?:\/\/(?:www\.)?(?:base\.app\/post\/0x[a-fA-F0-9]{8,}|warpcast\.com\/~\/casts\/0x[a-fA-F0-9]{8,}|farcaster\.xyz\/dwr\/0x[a-fA-F0-9]{8,})\b/i);
    if (farcasterUrlMatch) {
      const farcasterUrl = farcasterUrlMatch[0];
      await fetchCastData(farcasterUrl);
      return;
    }
    
    // Also check for direct cast hash in content (0x + at least 8 hex chars)
    const castHashMatch = content.match(/\b(0x[a-fA-F0-9]{8,})\b/i);
    if (castHashMatch && !fetchingTweet && castHashMatch[0].length >= 10) {
      await fetchCastData(castHashMatch[0]);
    }
  }

  async function handleDeletePost(postId: string) {
    if (!confirm("Are you sure you want to delete this post?")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/social-posts/${postId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to delete post");
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
    return <PageLoader message="Loading social posts..." />;
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] pb-24">
      <AppHeader />
      <div className="pt-8 pb-8">
        <div className="max-w-screen-xl mx-auto px-4">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-base-blue" />
                Social Posts
              </h1>
              <p className="text-muted-foreground text-sm">
                Manage Base Social Feed posts (Farcaster casts and admin-created posts)
              </p>
            </div>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Post
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((post) => (
              <Card key={post.id} className="glass-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-base-blue" />
                      <span className="text-xs text-muted-foreground">
                        {post.castId ? "Farcaster" : "Admin"}
                      </span>
                    </div>
                    {!post.castId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePost(post.id)}
                        className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(post.authorName || post.authorHandle) && (
                      <div className="flex items-center gap-2">
                        {post.authorAvatar && (
                          <Image
                            src={post.authorAvatar}
                            alt={post.authorName || post.authorHandle || "Author"}
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        )}
                        <div>
                          {post.authorName && (
                            <p className="text-sm font-semibold">{post.authorName}</p>
                          )}
                          {post.authorHandle && (
                            <p className="text-xs text-muted-foreground">{post.authorHandle}</p>
                          )}
                        </div>
                      </div>
                    )}
                    <p className="text-sm text-foreground">{post.content}</p>
                    {post.mediaUrl && (
                      <div className="relative w-full h-48 rounded-lg overflow-hidden">
                        <Image
                          src={post.mediaUrl}
                          alt="Post media"
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
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
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No social posts yet</p>
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
            <DialogTitle>Create Social Post</DialogTitle>
            <DialogDescription>
              Add a new post to the Base Social Feed. This will appear immediately on the homepage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="content">
                Content * 
                {fetchingTweet && (
                  <Loader2 className="w-3 h-3 inline-block ml-2 animate-spin" />
                )}
              </Label>
              <Textarea
                id="content"
                placeholder="Enter post content or paste a Twitter/X, Farcaster cast, or Base.app URL to auto-fetch (max 500 characters, will be truncated to 220 for display)..."
                value={formData.content}
                onChange={(e) => handleContentChange(e.target.value)}
                rows={4}
                maxLength={500}
                disabled={fetchingTweet}
              />
              <p className="text-xs text-muted-foreground">
                {formData.content.length}/500 characters • Paste a Twitter/X, Farcaster cast, or Base.app URL to auto-fetch data
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mediaUrl">
                Media URL, Twitter Link, or Farcaster Cast (optional)
                {fetchingTweet && (
                  <Loader2 className="w-3 h-3 inline-block ml-2 animate-spin" />
                )}
              </Label>
              <Input
                id="mediaUrl"
                type="url"
                placeholder="https://x.com/username/status/1234567890 or https://base.app/post/0x... or https://warpcast.com/username/0x... or https://example.com/image.jpg"
                value={formData.mediaUrl}
                onChange={(e) => handleMediaUrlChange(e.target.value)}
                disabled={fetchingTweet}
              />
              <p className="text-xs text-muted-foreground">
                Paste a Twitter/X, Farcaster cast, or Base.app URL to auto-fetch data (content, author, media)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="authorName">Author Name (optional)</Label>
                <Input
                  id="authorName"
                  placeholder="John Doe"
                  value={formData.authorName}
                  onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="authorHandle">Author Handle (optional)</Label>
                <Input
                  id="authorHandle"
                  placeholder="@johndoe"
                  value={formData.authorHandle}
                  onChange={(e) => setFormData({ ...formData, authorHandle: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="authorAvatar">Author Avatar URL (optional)</Label>
              <Input
                id="authorAvatar"
                type="url"
                placeholder="https://example.com/avatar.jpg"
                value={formData.authorAvatar}
                onChange={(e) => setFormData({ ...formData, authorAvatar: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreatePost} disabled={creating}>
              {creating ? "Creating..." : "Create Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

