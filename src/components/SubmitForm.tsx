import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import GlowButton from "./GlowButton";
import { Shield, CheckCircle2, XCircle, Wallet, Globe, ExternalLink, X, Tag, Image as ImageIcon, Upload } from "lucide-react";
import VerifiedBadge from "./VerifiedBadge";

const categories = ["Finance", "Tools", "Social", "Airdrops", "Games", "Memecoins", "Utilities", "Education", "Entertainment", "News", "Art"];

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

// Valid app tags for search and categorization (max 5 per app)
const validAppTags = [
  "airdrop",
  "airdrops",
  "analytics",
  "apy",
  "articles",
  "badges",
  "base",
  "collectibles",
  "contracts",
  "crypto",
  "debug",
  "defi",
  "developer",
  "dex",
  "ens",
  "explorer",
  "gifts",
  "giveaway",
  "identity",
  "liquidity",
  "nft",
  "payment",
  "social",
  "swap",
  "tools",
  "trading",
  "wallet",
  "web3",
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
    headerImageUrl: "", // Header/OG image URL (optional)
    category: "",
    reviewMessage: "", // Optional message for manual review
    developerTags: [] as string[], // Developer tags
    tags: [] as string[], // App tags for search (e.g., "business", "payment", "airdrops")
    contractAddress: "", // Contract address
    notesToAdmin: "", // Notes to admin
    screenshots: [] as string[], // Screenshot URLs
  });
  
  const [screenshotInput, setScreenshotInput] = useState("");
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const screenshotFileInputRef = useRef<HTMLInputElement>(null);

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
            // Extract screenshots from metadata
            const metadataScreenshots = data.metadata.screenshotUrls || data.metadata.screenshots || [];
            
            setFormData((prev) => ({
              ...prev,
              name: prev.name || data.metadata.name || "",
              description: prev.description || data.metadata.description || "",
              iconUrl: prev.iconUrl || data.metadata.icon || data.metadata.iconUrl || "",
              headerImageUrl: prev.headerImageUrl || data.metadata.ogImage || "",
              category: prev.category || data.metadata.category || "",
              url: data.metadata.url || url,
              // Auto-populate screenshots if they exist in metadata and form is empty
              screenshots: prev.screenshots.length === 0 && Array.isArray(metadataScreenshots) && metadataScreenshots.length > 0
                ? metadataScreenshots
                : prev.screenshots,
            }));
            toast({
              title: "Metadata Loaded",
              description: `Auto-filled from farcaster.json${metadataScreenshots.length > 0 ? ` (${metadataScreenshots.length} screenshot${metadataScreenshots.length > 1 ? 's' : ''} found)` : ''}`,
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

  const handleScreenshotUpload = async (file: File) => {
    if (!file) return;

    setUploadingScreenshot(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "screenshot");

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to upload screenshot");
      }

      const data = await res.json();
      
      // Add the screenshot URL to the form data
      setFormData((prev) => ({
        ...prev,
        screenshots: [...prev.screenshots, data.url],
      }));

      toast({
        title: "Success",
        description: "Screenshot uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Upload Error",
        description: error.message || "Failed to upload screenshot",
        variant: "destructive",
      });
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const handleAddScreenshotUrl = () => {
    if (screenshotInput.trim() && !formData.screenshots.includes(screenshotInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        screenshots: [...prev.screenshots, screenshotInput.trim()],
      }));
      setScreenshotInput("");
    }
  };

  const handleRemoveScreenshot = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      screenshots: prev.screenshots.filter((_, i) => i !== index),
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

    // Validate tags: max 5 and must be from valid list
    if (formData.tags.length > 5) {
      toast({
        title: "Error",
        description: "Maximum 5 tags allowed. Please remove some tags.",
        variant: "destructive",
      });
      return;
    }

    // Validate all tags are from valid list
    const invalidTags = formData.tags.filter((tag) => !validAppTags.includes(tag));
    if (invalidTags.length > 0) {
      toast({
        title: "Error",
        description: `Invalid tags: ${invalidTags.join(", ")}. Please use only valid tags.`,
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

      let data;
      try {
        data = await res.json();
      } catch (jsonError) {
        // If response is not JSON, get text
        const text = await res.text();
        throw new Error(text || `Server error: ${res.status} ${res.statusText}`);
      }

      if (!res.ok) {
        // Show detailed validation errors if available
        const errorMessage = data.message || data.error || `Failed to submit app (${res.status})`;
        throw new Error(errorMessage);
      }

      toast({
        title: data.updated ? "App Updated!" : (data.status === "approved" ? "Success!" : "Submitted for Review"),
        description: data.message || (data.updated 
          ? "Your app has been updated successfully!"
          : data.status === "approved" 
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
        headerImageUrl: "",
        category: "",
        reviewMessage: "",
        developerTags: [],
        tags: [],
        contractAddress: "",
        notesToAdmin: "",
        screenshots: [],
      });
      setScreenshotInput("");

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
                  Verify your wallet to submit apps. Apps with your wallet in farcaster.json owners will be auto-approved.
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
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 <strong>Tip:</strong> Add your wallet to the "owner" or "owners" field in your app's farcaster.json to enable auto-approval for that domain.
                  </p>
                </div>
                
                {verificationStatus?.verificationStatus !== "wallet_verified" && verificationStatus?.verificationStatus !== "verified" && (
                  <Link href="/verify">
                    <GlowButton size="sm" className="w-full mt-2">
                      <Shield className="w-4 h-4 mr-2" />
                      Verify Wallet
                    </GlowButton>
                  </Link>
                )}
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
            <Label htmlFor="headerImageUrl">Header Image URL (Optional)</Label>
            <Input
              id="headerImageUrl"
              type="url"
              placeholder="https://myapp.example.com/header.png or og-image from farcaster.json"
              value={formData.headerImageUrl}
              onChange={(e) => setFormData({ ...formData, headerImageUrl: e.target.value })}
              className="glass-card focus-visible:ring-base-blue"
            />
            <p className="text-xs text-muted-foreground">
              Header image for app banner and detail page (like Twitter header). Will be auto-filled from farcaster.json og-image if available.
            </p>
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
            <Label htmlFor="tags">
              Tags (Optional) - Select up to 5 tags
              {formData.tags.length > 0 && (
                <span className="text-xs text-muted-foreground ml-2">
                  ({formData.tags.length}/5)
                </span>
              )}
            </Label>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Click tags below to add them. Selected tags help users find your app when searching.
              </p>
              <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-white/5 border border-white/10 max-h-48 overflow-y-auto">
                {validAppTags.map((tag) => {
                  const isSelected = formData.tags.includes(tag);
                  const isDisabled = !isSelected && formData.tags.length >= 5;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          // Remove tag
                          setFormData({
                            ...formData,
                            tags: formData.tags.filter((t) => t !== tag),
                          });
                        } else if (!isDisabled) {
                          // Add tag (only if under limit)
                          setFormData({
                            ...formData,
                            tags: [...formData.tags, tag],
                          });
                        }
                      }}
                      disabled={isDisabled}
                      className={`
                        inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                        ${
                          isSelected
                            ? "bg-base-blue text-white border border-base-blue shadow-lg"
                            : isDisabled
                            ? "bg-white/5 text-muted-foreground/50 border border-white/5 cursor-not-allowed"
                            : "bg-white/5 text-foreground border border-white/10 hover:bg-white/10 hover:border-base-blue/50 cursor-pointer"
                        }
                      `}
                    >
                      {tag}
                      {isSelected && <X className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <p className="text-xs text-muted-foreground w-full">Selected tags:</p>
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
              {formData.tags.length >= 5 && (
                <p className="text-xs text-yellow-500">
                  Maximum 5 tags selected. Remove a tag to add another.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="screenshots">Screenshots (Optional)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Add screenshots to showcase your app, similar to Play Store. You can upload images or add URLs.
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
                  className="glass-card focus-visible:ring-base-blue flex-1"
                />
                <input
                  ref={screenshotFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleScreenshotUpload(file);
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
              {formData.screenshots.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {formData.screenshots.map((screenshot, index) => (
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
              Leave empty if your wallet is in the farcaster.json "owner" or "owners" field. Otherwise, provide details for manual review.
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
