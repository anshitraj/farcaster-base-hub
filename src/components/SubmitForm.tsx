"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import GlowButton from "./GlowButton";
import { Shield } from "lucide-react";
import VerifiedBadge from "./VerifiedBadge";
import { Button } from "@/components/ui/button";
import AppDetailsSection from "./submit-form/AppDetailsSection";
import AppMediaSection from "./submit-form/AppMediaSection";
import AppUrlsSection from "./submit-form/AppUrlsSection";
import dynamic from "next/dynamic";
import DescriptionSection from "./submit-form/DescriptionSection";
import ScreenshotsSection from "./submit-form/ScreenshotsSection";
import DeveloperNotesSection from "./submit-form/DeveloperNotesSection";
import AdditionalMetadataSection from "./submit-form/AdditionalMetadataSection";
import SuccessModal from "./submit-form/SuccessModal";

// Dynamically import CategoryTagsSection to avoid SSR issues with Select component
const CategoryTagsSection = dynamic(() => import("./submit-form/CategoryTagsSection"), {
  ssr: false,
  loading: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <span>🏷️</span> CATEGORIES & TAGS
        </h3>
        <p className="text-xs text-white/50 mb-4">Help users discover your app</p>
      </div>
      <div className="h-32 bg-[#0f0f15] rounded-xl animate-pulse" />
    </div>
  ),
});

const SubmitForm = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    url: "",
    baseMiniAppUrl: "",
    farcasterUrl: "",
    iconUrl: "",
    headerImageUrl: "",
    category: "",
    reviewMessage: "",
    developerTags: [] as string[],
    tags: [] as string[],
    contractAddress: "",
    notesToAdmin: "",
    screenshots: [] as string[],
    // New fields
    githubUrl: "",
    twitterUrl: "",
    supportEmail: "",
    isOpenSource: false,
  });
  
  const [screenshotInput, setScreenshotInput] = useState("");
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<any>(null);
  const [loadingVerification, setLoadingVerification] = useState(true);
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedAppId, setSubmittedAppId] = useState<string | undefined>();

  const checkVerification = async () => {
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
            cache: 'no-store', // Ensure fresh data
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
  };

  useEffect(() => {
    checkVerification();
    
    // Refresh verification status when page gains focus (user might have verified in another tab)
    const handleFocus = () => {
      checkVerification();
    };
    
    // Listen for verification completion events
    const handleVerificationComplete = () => {
      checkVerification();
    };
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('verificationComplete', handleVerificationComplete);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('verificationComplete', handleVerificationComplete);
    };
  }, []);

  const handleFetchDetails = async () => {
    if (!formData.url || !formData.url.startsWith("https://")) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid HTTPS URL",
        variant: "destructive",
      });
      return;
    }

    setFetchingMetadata(true);
    try {
      // Use the API endpoint to avoid CORS issues
      const res = await fetch(`/api/apps/fetch-metadata?url=${encodeURIComponent(formData.url)}`);
      
      if (!res.ok) {
        throw new Error("Failed to fetch metadata");
      }

      const data = await res.json();
      const manifest = data.metadata;
      
      if (!manifest) {
        toast({
          title: "Unable to fetch farcaster.json",
          description: "Please check the URL and ensure /.well-known/farcaster.json exists",
          variant: "destructive",
        });
        return;
      }

      // Auto-fill fields from manifest
      setFormData((prev) => ({
        ...prev,
        name: prev.name || manifest.name || "",
        description: prev.description || manifest.description || "",
        iconUrl: prev.iconUrl || manifest.iconUrl || manifest.icon || "",
        headerImageUrl: prev.headerImageUrl || manifest.ogImage || manifest.heroImageUrl || manifest.imageUrl || "",
        baseMiniAppUrl: prev.baseMiniAppUrl || manifest.baseMiniAppUrl || "",
        farcasterUrl: prev.farcasterUrl || manifest.farcasterUrl || manifest.frameUrl || "",
        category: prev.category || manifest.category || manifest.primaryCategory || "",
        tags: prev.tags.length === 0 && manifest.tags ? manifest.tags.slice(0, 5) : prev.tags,
        screenshots: prev.screenshots.length === 0 && manifest.screenshots ? manifest.screenshots : prev.screenshots,
      }));

      toast({
        title: "Farcaster manifest loaded successfully",
        description: "All fields updated.",
      });
    } catch (error) {
      console.error("Error fetching manifest:", error);
      toast({
        title: "Unable to fetch farcaster.json",
        description: "Please check the URL and ensure /.well-known/farcaster.json exists",
        variant: "destructive",
      });
    } finally {
      setFetchingMetadata(false);
    }
  };

  const handleScreenshotUpload = async (file: File) => {
    if (!file) return;

    setUploadingScreenshot(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append("file", file);
      formDataObj.append("type", "screenshot");

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        credentials: "include",
        body: formDataObj,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to upload screenshot");
      }

      const data = await res.json();
      
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

    // Validate tags: max 5
    if (formData.tags.length > 5) {
      toast({
        title: "Error",
        description: "Maximum 5 tags allowed. Please remove some tags.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/apps/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonError) {
        const text = await res.text();
        throw new Error(text || `Server error: ${res.status} ${res.statusText}`);
      }

      if (!res.ok) {
        const errorMessage = data.message || data.error || `Failed to submit app (${res.status})`;
        throw new Error(errorMessage);
      }

      setSubmittedAppId(data.app?.id);
      setShowSuccessModal(true);

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
        githubUrl: "",
        twitterUrl: "",
        supportEmail: "",
        isOpenSource: false,
      });
      setScreenshotInput("");
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
    <div className="max-w-5xl mx-auto">
      {/* Verification Status Section */}
      {!loadingVerification && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 border border-purple-500/20 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Shield className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-white">Developer Verification</h3>
                {verificationStatus?.verified ? (
                  <p className="text-xs text-green-400 mt-0.5">✓ Verified • All apps require admin approval</p>
                ) : (
                  <p className="text-xs text-yellow-400 mt-0.5">Not verified • Verify wallet to submit apps</p>
                )}
              </div>
            </div>
            {verificationStatus?.verified ? (
              <VerifiedBadge type="developer" />
            ) : (
              <Link href="/verify">
                <Button size="sm" className="bg-purple-500 hover:bg-purple-600 text-white">
                  <Shield className="w-4 h-4 mr-2" />
                  Verify
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Main Form Card */}
      <Card className="glass-card backdrop-blur-xl bg-white/5 border-white/10 shadow-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl text-gradient-base">Submit Your Mini App</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* App Details */}
            <div className="border-b border-white/10 pb-6">
              <AppDetailsSection
                name={formData.name}
                onNameChange={(value) => setFormData({ ...formData, name: value })}
              />
            </div>

            {/* App URLs */}
            <div className="border-b border-white/10 pb-6">
              <AppUrlsSection
                url={formData.url}
                baseMiniAppUrl={formData.baseMiniAppUrl}
                farcasterUrl={formData.farcasterUrl}
                onUrlChange={(value) => setFormData({ ...formData, url: value })}
                onBaseMiniAppUrlChange={(value) => setFormData({ ...formData, baseMiniAppUrl: value })}
                onFarcasterUrlChange={(value) => setFormData({ ...formData, farcasterUrl: value })}
                onFetchDetails={handleFetchDetails}
                fetching={fetchingMetadata}
              />
            </div>

            {/* App Media */}
            <div className="border-b border-white/10 pb-6">
              <AppMediaSection
                iconUrl={formData.iconUrl}
                headerImageUrl={formData.headerImageUrl}
                onIconUrlChange={(value) => setFormData({ ...formData, iconUrl: value })}
                onHeaderImageUrlChange={(value) => setFormData({ ...formData, headerImageUrl: value })}
              />
            </div>

            {/* Categories & Tags */}
            <div className="border-b border-white/10 pb-6">
              <CategoryTagsSection
                category={formData.category}
                tags={formData.tags}
                onCategoryChange={(value) => setFormData({ ...formData, category: value })}
                onTagsChange={(tags) => setFormData({ ...formData, tags })}
              />
            </div>

            {/* Description */}
            <div className="border-b border-white/10 pb-6">
              <DescriptionSection
                description={formData.description}
                onDescriptionChange={(value) => setFormData({ ...formData, description: value })}
              />
            </div>

            {/* Screenshots */}
            <div className="border-b border-white/10 pb-6">
              <ScreenshotsSection
                screenshots={formData.screenshots}
                screenshotInput={screenshotInput}
                onScreenshotInputChange={setScreenshotInput}
                onAddScreenshot={handleAddScreenshotUrl}
                onRemoveScreenshot={handleRemoveScreenshot}
                onUploadScreenshot={handleScreenshotUpload}
                uploading={uploadingScreenshot}
              />
            </div>

            {/* Additional Metadata */}
            <div className="border-b border-white/10 pb-6">
              <AdditionalMetadataSection
                githubUrl={formData.githubUrl}
                twitterUrl={formData.twitterUrl}
                supportEmail={formData.supportEmail}
                isOpenSource={formData.isOpenSource}
                onGithubUrlChange={(value) => setFormData({ ...formData, githubUrl: value })}
                onTwitterUrlChange={(value) => setFormData({ ...formData, twitterUrl: value })}
                onSupportEmailChange={(value) => setFormData({ ...formData, supportEmail: value })}
                onIsOpenSourceChange={(value) => setFormData({ ...formData, isOpenSource: value })}
              />
            </div>

            {/* Developer Notes */}
            <div className="pb-6">
              <DeveloperNotesSection
                notesToAdmin={formData.notesToAdmin}
                onNotesToAdminChange={(value) => setFormData({ ...formData, notesToAdmin: value })}
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <GlowButton 
                type="submit" 
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold py-6 rounded-xl shadow-lg shadow-purple-500/30" 
                size="lg" 
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit →"}
              </GlowButton>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Success Modal */}
      <SuccessModal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        isVerified={verificationStatus?.verified || false}
        appId={submittedAppId}
      />
    </div>
  );
};

export default SubmitForm;
