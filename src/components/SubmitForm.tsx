import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import GlowButton from "./GlowButton";
import { Shield, CheckCircle2, XCircle, Wallet, Globe, ExternalLink, X, Tag } from "lucide-react";
import VerifiedBadge from "./VerifiedBadge";

const categories = ["Finance", "Tools", "Social", "Airdrops", "Games", "Memecoins", "Utilities"];

const developerTags = [
  "Team of 1",
  "Indie Developer",
  "Open Source",
  "Startup",
  "Verified Team",
  "Official",
  "Community Project",
  "Experiment",
  "Education",
  "Hackathon Project",
];

const SubmitForm = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    url: "", // Main website URL (required for Base)
    baseMiniAppUrl: "", // Base mini app URL (optional)
    farcasterUrl: "", // Farcaster mini app URL (optional)
    iconUrl: "",
    category: "",
    reviewMessage: "", // Optional message for manual review
    developerTags: [] as string[], // Developer tags
    tags: [] as string[], // App tags for search (e.g., "business", "payment", "airdrops")
    contractAddress: "", // Contract address
    notesToAdmin: "", // Notes to admin
  });
  
  const [tagInput, setTagInput] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<any>(null);
  const [loadingVerification, setLoadingVerification] = useState(true);
  const [fetchingMetadata, setFetchingMetadata] = useState(false);

  useEffect(() => {
    async function checkVerification() {
      try {
        const authRes = await fetch("/api/auth/wallet", {
          method: "GET",
          credentials: "include",
        });

        if (authRes.ok) {
          const authData = await authRes.json();
          if (authData.wallet) {
            const devRes = await fetch(`/api/developers/${authData.wallet}`, {
              credentials: "include",
            });
            if (devRes.ok) {
              const devData = await devRes.json();
              setVerificationStatus(devData.developer);
            }
          }
        }
      } catch (error) {
        console.error("Error checking verification:", error);
      } finally {
        setLoadingVerification(false);
      }
    }

    checkVerification();
  }, []);

  const handleUrlChange = async (url: string) => {
    setFormData({ ...formData, url });
    
    // Auto-fetch farcaster.json if URL is valid
    if (url && url.startsWith("https://")) {
      setFetchingMetadata(true);
      try {
        const res = await fetch(`/api/apps/fetch-metadata?url=${encodeURIComponent(url)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.metadata) {
            setFormData((prev) => ({
              ...prev,
              name: prev.name || data.metadata.name || "",
              description: prev.description || data.metadata.description || "",
              iconUrl: prev.iconUrl || data.metadata.icon || "",
              category: prev.category || data.metadata.category || "",
              url: data.metadata.url || url,
            }));
            toast({
              title: "Metadata Loaded",
              description: "Auto-filled from farcaster.json",
            });
          }
        }
      } catch (error) {
        // Silently fail - metadata fetch is optional
      } finally {
        setFetchingMetadata(false);
      }
    }
  };

  const handleTagToggle = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      developerTags: prev.developerTags.includes(tag)
        ? prev.developerTags.filter((t) => t !== tag)
        : [...prev.developerTags, tag],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.description || !formData.url || !formData.category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/apps/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Important: include cookies for authentication
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        // Show detailed validation errors if available
        const errorMessage = data.message || data.error || "Failed to submit app";
        throw new Error(errorMessage);
      }

      toast({
        title: data.status === "approved" ? "Success!" : "Submitted for Review",
        description: data.message || (data.status === "approved" 
          ? "Your mini app has been submitted and approved!" 
          : "Your app has been submitted for review. An admin will review it shortly."),
      });

      // Reset form
      setFormData({
        name: "",
        description: "",
        url: "",
        baseMiniAppUrl: "",
        farcasterUrl: "",
        iconUrl: "",
        category: "",
        reviewMessage: "",
        developerTags: [],
        contractAddress: "",
        notesToAdmin: "",
      });

      // Redirect to app page
      if (data.app?.id) {
        window.location.href = `/apps/${data.app.id}`;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit app. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="glass-card max-w-2xl mx-auto glow-base-blue/30">
      <CardHeader>
        <CardTitle className="text-2xl text-gradient-base">Submit Your Mini App</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Verification Status Section */}
        {!loadingVerification && (
          <div className="mb-6 p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-base-blue" />
                <h3 className="font-semibold text-sm">Developer Verification</h3>
              </div>
              {verificationStatus?.verified ? (
                <VerifiedBadge type="developer" />
              ) : (
                <span className="text-xs text-yellow-500">Not Verified</span>
              )}
            </div>
            
            {verificationStatus?.verified ? (
              <p className="text-xs text-muted-foreground mb-3">
                ✓ Your developer account is verified. Apps will be auto-approved.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground mb-3">
                  Verify your developer account to get apps auto-approved, or submit for manual review.
                </p>
                
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    {verificationStatus?.verificationStatus === "wallet_verified" || verificationStatus?.verificationStatus === "verified" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-muted-foreground">Wallet Verification</span>
                    {verificationStatus?.verificationStatus !== "wallet_verified" && verificationStatus?.verificationStatus !== "verified" && (
                      <Link href="/verify" className="ml-auto text-base-blue hover:underline flex items-center gap-1">
                        <Wallet className="w-3 h-3" />
                        Verify Wallet
                      </Link>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs">
                    {verificationStatus?.verificationStatus === "domain_verified" || verificationStatus?.verificationStatus === "verified" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-muted-foreground">Domain Verification</span>
                    {verificationStatus?.verificationStatus !== "domain_verified" && verificationStatus?.verificationStatus !== "verified" && (
                      <Link href="/verify" className="ml-auto text-base-blue hover:underline flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        Verify Domain
                      </Link>
                    )}
                  </div>
                </div>
                
                <Link href="/verify">
                  <GlowButton size="sm" className="w-full mt-2">
                    <Shield className="w-4 h-4 mr-2" />
                    Complete Verification
                  </GlowButton>
                </Link>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">App Name *</Label>
            <Input
              id="name"
              placeholder="My Awesome App"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="glass-card focus-visible:ring-base-blue"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe what your app does..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="glass-card focus-visible:ring-base-blue min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">Main Website URL *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="url"
                type="url"
                placeholder="https://myapp.example.com"
                value={formData.url}
                onChange={(e) => handleUrlChange(e.target.value)}
                className="glass-card focus-visible:ring-base-blue"
                disabled={fetchingMetadata}
              />
              {fetchingMetadata && (
                <span className="text-xs text-base-blue">Fetching metadata...</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Required: Main website link for Base. We'll auto-fetch metadata from /.well-known/farcaster.json
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseMiniAppUrl">Base Mini App URL (Optional)</Label>
            <Input
              id="baseMiniAppUrl"
              type="url"
              placeholder="https://myapp.base.xyz or base://app?url=..."
              value={formData.baseMiniAppUrl}
              onChange={(e) => setFormData({ ...formData, baseMiniAppUrl: e.target.value })}
              className="glass-card focus-visible:ring-base-blue"
            />
            <p className="text-xs text-muted-foreground">
              Optional: Direct Base mini app link
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="farcasterUrl">Farcaster Mini App URL (Optional)</Label>
            <Input
              id="farcasterUrl"
              type="url"
              placeholder="https://myapp.farcaster.xyz or farcaster://miniapp?url=..."
              value={formData.farcasterUrl}
              onChange={(e) => setFormData({ ...formData, farcasterUrl: e.target.value })}
              className="glass-card focus-visible:ring-base-blue"
            />
            <p className="text-xs text-muted-foreground">
              Optional: Direct Farcaster mini app link
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="iconUrl">Icon URL</Label>
            <Input
              id="iconUrl"
              type="url"
              placeholder="https://myapp.example.com/icon.png"
              value={formData.iconUrl}
              onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
              className="glass-card focus-visible:ring-base-blue"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger className="glass-card focus:ring-base-blue">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="glass-card border-white/10">
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (Optional)</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  id="tags"
                  placeholder="e.g., business, payment, airdrops, games"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && tagInput.trim()) {
                      e.preventDefault();
                      const newTag = tagInput.trim().toLowerCase();
                      if (!formData.tags.includes(newTag) && newTag.length > 0) {
                        setFormData({
                          ...formData,
                          tags: [...formData.tags, newTag],
                        });
                        setTagInput("");
                      }
                    }
                  }}
                  className="glass-card focus-visible:ring-base-blue"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (tagInput.trim()) {
                      const newTag = tagInput.trim().toLowerCase();
                      if (!formData.tags.includes(newTag) && newTag.length > 0) {
                        setFormData({
                          ...formData,
                          tags: [...formData.tags, newTag],
                        });
                        setTagInput("");
                      }
                    }
                  }}
                  className="bg-base-blue hover:bg-base-blue/90"
                >
                  <Tag className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Add tags to help users find your app when searching (e.g., "business", "payment", "airdrops"). Press Enter or click the tag icon to add.
              </p>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-base-blue/20 text-base-blue border border-base-blue/30"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            tags: formData.tags.filter((t) => t !== tag),
                          });
                        }}
                        className="hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reviewMessage">
              Request Manual Review (Optional)
            </Label>
            <Textarea
              id="reviewMessage"
              placeholder="If you can't verify domain ownership, explain your relationship to this app (e.g., 'I am the owner/admin/team member. Proof: @twitter, website, etc.')"
              value={formData.reviewMessage}
              onChange={(e) => setFormData({ ...formData, reviewMessage: e.target.value })}
              className="glass-card focus-visible:ring-base-blue min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty if you can verify domain ownership. Otherwise, provide details for manual review.
            </p>
          </div>

          <GlowButton type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Mini App"}
          </GlowButton>
        </form>
      </CardContent>
    </Card>
  );
};

export default SubmitForm;
