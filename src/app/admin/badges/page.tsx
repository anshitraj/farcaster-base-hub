"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageLoader from "@/components/PageLoader";
import AppHeader from "@/components/AppHeader";
import { useToast } from "@/hooks/use-toast";
import { Upload, Image as ImageIcon, CheckCircle2, Clock, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface PendingApp {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  category: string;
  status: string;
  createdAt: string;
  developer: {
    id: string;
    wallet: string;
    name: string | null;
  } | null;
}

export default function AdminBadgesPage() {
  const [apps, setApps] = useState<PendingApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<PendingApp | null>(null);
  const [pngFile, setPngFile] = useState<File | null>(null);
  const [webpFile, setWebpFile] = useState<File | null>(null);
  const [pngPreview, setPngPreview] = useState<string | null>(null);
  const [webpPreview, setWebpPreview] = useState<string | null>(null);
  const pngInputRef = useRef<HTMLInputElement>(null);
  const webpInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingApps();
  }, []);

  async function fetchPendingApps() {
    try {
      const res = await fetch("/api/admin/badges/pending", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setApps(data.apps || []);
      } else if (res.status === 403) {
        toast({
          title: "Access Denied",
          description: "You must be an admin to access this page.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching pending apps:", error);
      toast({
        title: "Error",
        description: "Failed to fetch apps",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function handlePngFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid File",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      setPngFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPngPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleWebpFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid File",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      setWebpFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setWebpPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleUpload(appId: string) {
    if (!pngFile || !webpFile) {
      toast({
        title: "Files Required",
        description: "Please select both PNG and WEBP files",
        variant: "destructive",
      });
      return;
    }

    setUploading(appId);
    try {
      const formData = new FormData();
      formData.append("appId", appId);
      formData.append("pngFile", pngFile);
      formData.append("webpFile", webpFile);

      const res = await fetch("/api/admin/badges/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: "Success",
          description: "Badge uploaded successfully!",
        });
        // Remove app from list
        setApps(apps.filter(app => app.id !== appId));
        // Reset form
        setSelectedApp(null);
        setPngFile(null);
        setWebpFile(null);
        setPngPreview(null);
        setWebpPreview(null);
        if (pngInputRef.current) pngInputRef.current.value = "";
        if (webpInputRef.current) webpInputRef.current.value = "";
      } else {
        throw new Error(data.error || "Failed to upload badge");
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload badge",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  }

  function openUploadDialog(app: PendingApp) {
    setSelectedApp(app);
    setPngFile(null);
    setWebpFile(null);
    setPngPreview(null);
    setWebpPreview(null);
  }

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <AppHeader />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Badge Management</h1>
          <p className="text-gray-400">
            Upload developer badges for approved apps. Both PNG (for metadata) and WEBP (for UI) are required.
          </p>
        </div>

        {apps.length === 0 ? (
          <Card className="bg-[#1A1A1A] border-gray-800">
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-400">All approved apps have developer badges uploaded!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {apps.map((app) => (
              <Card key={app.id} className="bg-[#1A1A1A] border-gray-800">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={app.iconUrl || "/placeholder.svg"}
                        alt={app.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white mb-1">{app.name}</h3>
                      <p className="text-sm text-gray-400 mb-2 line-clamp-2">{app.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{app.category}</span>
                        {app.developer && (
                          <span>Developer: {app.developer.name || app.developer.wallet.slice(0, 6)}...</span>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => openUploadDialog(app)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Badge
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Upload Dialog */}
        {selectedApp && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="bg-[#1A1A1A] border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="text-white">Upload Badge for {selectedApp.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white mb-2 block">PNG File (Metadata)</Label>
                    <Input
                      ref={pngInputRef}
                      type="file"
                      accept="image/png"
                      onChange={handlePngFileSelect}
                      className="text-white"
                    />
                    {pngPreview && (
                      <div className="mt-2 relative w-full h-32 rounded-lg overflow-hidden">
                        <Image
                          src={pngPreview}
                          alt="PNG Preview"
                          fill
                          className="object-contain"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-white mb-2 block">WEBP File (UI Display)</Label>
                    <Input
                      ref={webpInputRef}
                      type="file"
                      accept="image/webp"
                      onChange={handleWebpFileSelect}
                      className="text-white"
                    />
                    {webpPreview && (
                      <div className="mt-2 relative w-full h-32 rounded-lg overflow-hidden">
                        <Image
                          src={webpPreview}
                          alt="WEBP Preview"
                          fill
                          className="object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button
                    onClick={() => handleUpload(selectedApp.id)}
                    disabled={!pngFile || !webpFile || uploading === selectedApp.id}
                    className="bg-blue-600 hover:bg-blue-700 flex-1"
                  >
                    {uploading === selectedApp.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Badge
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedApp(null);
                      setPngFile(null);
                      setWebpFile(null);
                      setPngPreview(null);
                      setWebpPreview(null);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

