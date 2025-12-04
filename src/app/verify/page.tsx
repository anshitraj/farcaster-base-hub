"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GlowButton from "@/components/GlowButton";
import PageLoader from "@/components/PageLoader";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Loader2, Copy, Wallet, Globe, Shield } from "lucide-react";
import { getInjectedProvider } from "@/lib/wallet";
import { trackPageView } from "@/lib/analytics";
import { useAccount, useSignMessage } from "wagmi";
import { useMiniApp } from "@/components/MiniAppProvider";

const VERIFICATION_MESSAGE = "Verify your developer account for Mini App Store";

export default function VerifyPage() {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<string>("unverified");
  const [walletVerified, setWalletVerified] = useState(false);
  const [domainVerified, setDomainVerified] = useState(false);
  const [domain, setDomain] = useState("");
  const [verificationContent, setVerificationContent] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const { toast } = useToast();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { isInMiniApp } = useMiniApp();

  useEffect(() => {
    trackPageView("/verify");
    checkStatus();
  }, []);

  async function checkStatus() {
    try {
      const res = await fetch("/api/auth/wallet", {
        method: "GET",
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.wallet) {
          // Fetch developer status
          try {
            const devRes = await fetch(`/api/developers/${data.wallet}`, {
              credentials: "include",
            });
            if (devRes.ok) {
              const devData = await devRes.json();
              const status = devData.developer?.verificationStatus || "unverified";
              const verified = devData.developer?.verified || false;
              
              setVerificationStatus(status);
              setWalletVerified(status === "wallet_verified" || status === "verified" || verified);
              setDomainVerified(status === "domain_verified" || status === "verified" || verified);
              setIsVerified(verified || status === "verified");
              
              if (verified || status === "verified") {
                setStep(5);
              } else if (status === "wallet_verified") {
                // Wallet verified but domain not - show domain verification
                setStep(3);
              } else if (status === "domain_verified") {
                // Domain verified but wallet not - show wallet verification
                setStep(2);
              }
            }
          } catch (devError) {
            console.error("Error fetching developer status:", devError);
            // Developer might not exist yet, that's okay
          }
        }
      }
    } catch (error) {
      console.error("Error checking status:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleWalletVerification = async () => {
    try {
      setVerifying(true);
      
      let walletAddress: string;
      let signature: string;

      // Use Wagmi for Mini Apps (Base/Farcaster) or if already connected
      if (isInMiniApp || (isConnected && address)) {
        if (!address) {
          toast({
            title: "No Wallet Connected",
            description: "Please connect your wallet first",
            variant: "destructive",
          });
          setVerifying(false);
          return;
        }
        walletAddress = address;

        // Use Wagmi's signMessageAsync for Mini Apps
        try {
          signature = await signMessageAsync({ message: VERIFICATION_MESSAGE });
        } catch (e: any) {
          if (e.code === 4001 || e.message?.includes("reject") || e.message?.includes("User rejected")) {
            throw new Error("Signature request rejected");
          }
          throw new Error(e.message || "Failed to get signature");
        }
      } else {
        // Fallback to injected provider for desktop/regular browsers
        const provider = getInjectedProvider();

        if (!provider) {
          toast({
            title: "No Wallet Found",
            description: "Please install MetaMask or open in Base App",
            variant: "destructive",
          });
          setVerifying(false);
          return;
        }

        const accounts = await provider.request({
          method: "eth_requestAccounts",
        });

        if (!accounts || accounts.length === 0) {
          throw new Error("No account selected");
        }

        walletAddress = accounts[0];

        // Request signature using injected provider
        try {
          signature = await provider.request({
            method: "personal_sign",
            params: [VERIFICATION_MESSAGE, walletAddress],
          });
        } catch (e: any) {
          if (e.code === 4001 || e.message?.includes("reject")) {
            throw new Error("Signature request rejected");
          }
          throw new Error(e.message || "Failed to get signature");
        }
      }

      // Verify wallet
      const res = await fetch("/api/developer/verify-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ signature }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }

      setWalletVerified(true);
      setVerificationStatus(data.status);
      
      if (data.verified) {
        setIsVerified(true);
        setStep(5);
        toast({
          title: "Verification Complete! 🎉",
          description: "Your developer account is now fully verified.",
        });
      } else {
        setStep(3);
        toast({
          title: "Wallet Verified",
          description: "Now verify your domain to complete verification.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify wallet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleStartDomainVerification = async () => {
    if (!domain) {
      toast({
        title: "Domain Required",
        description: "Please enter your domain",
        variant: "destructive",
      });
      return;
    }

    try {
      setVerifying(true);
      const res = await fetch("/api/developer/verify-domain/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ domain }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to start verification");
      }

      setVerificationContent(data.instructions.fileContent);
      setStep(4);
      toast({
        title: "Verification Started",
        description: "Please upload the verification file to your domain.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start domain verification",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleConfirmDomainVerification = async () => {
    try {
      setVerifying(true);
      const res = await fetch("/api/developer/verify-domain/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to confirm verification");
      }

      setDomainVerified(true);
      setVerificationStatus(data.status);
      
      if (data.verified) {
        setIsVerified(true);
        setStep(5);
        toast({
          title: "Verification Complete! 🎉",
          description: "Your developer account is now fully verified.",
        });
      } else {
        toast({
          title: "Domain Verified",
          description: "Now verify your wallet to complete verification.",
        });
        setStep(2);
      }
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to confirm domain verification",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Content copied to clipboard",
    });
  };

  if (loading) {
    return <PageLoader message="Loading verification status..." />;
  }

  // If already verified, show completion message with option to go to dashboard
  if (isVerified && step === 5) {
    return (
      <div className="min-h-screen bg-[#0B0F19] pb-24">
        <div className="pt-20 pb-8">
          <div className="max-w-screen-md mx-auto px-4">
            <Card className="glass-card mb-6 border-green-500/30">
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-xl font-bold mb-2">Already Verified! ✅</h2>
                  <p className="text-muted-foreground text-sm mb-4">
                    Your developer account is already verified. You can submit apps and access all features.
                  </p>
                  <div className="flex gap-2 justify-center flex-wrap">
                    <GlowButton asChild>
                      <a href="/submit">Submit an App</a>
                    </GlowButton>
                    <GlowButton asChild variant="solid">
                      <a href="/dashboard">Go to Dashboard</a>
                    </GlowButton>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] pb-24">
      <div className="pt-20 pb-8">
        <div className="max-w-screen-md mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Developer Verification</h1>
            <p className="text-muted-foreground text-sm">
              Verify your wallet to submit mini apps. Domain ownership is checked via farcaster.json per app.
            </p>
          </div>

          {/* Status Card */}
          <Card className="glass-card mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-base-blue" />
                Verification Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                {verificationStatus === "verified" ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="font-semibold text-green-500">VERIFIED</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-yellow-500" />
                    <span className="font-semibold text-yellow-500">
                      {verificationStatus.toUpperCase().replace("_", " ")}
                    </span>
                  </>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  {walletVerified ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span>Wallet Verification {walletVerified ? "(Required ✓)" : "(Required)"}</span>
                </div>
                <div className="flex items-center gap-2">
                  {domainVerified ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span>Domain Verification (Optional)</span>
                </div>
                {walletVerified && !domainVerified && (
                  <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-white/10">
                    💡 <strong>Note:</strong> Domain ownership is checked per-app via farcaster.json. Add your wallet to the "owner" or "owners" field in your app's farcaster.json for auto-approval.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Step 1: Wallet Verification - Show if not verified yet */}
          {!walletVerified && step <= 2 && (
            <Card className="glass-card mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-base-blue" />
                  Step 1: Verify Wallet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Sign a message with your wallet to verify ownership
                </p>
                {isInMiniApp && !address && (
                  <p className="text-xs text-yellow-500 mb-2">
                    ⚠️ Please wait for wallet to connect...
                  </p>
                )}
                <GlowButton
                  onClick={handleWalletVerification}
                  disabled={verifying || walletVerified || (isInMiniApp && !address)}
                  className="w-full"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : walletVerified ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Wallet Verified
                    </>
                  ) : (
                    "Verify Wallet"
                  )}
                </GlowButton>
              </CardContent>
            </Card>
          )}
          
          {/* Show wallet verified status if verified but domain not */}
          {walletVerified && !domainVerified && (
            <Card className="glass-card mb-6 border-green-500/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="font-semibold text-green-500">Wallet Verified ✓</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Your wallet is verified! You can now submit apps.
                </p>
                <p className="text-xs text-muted-foreground">
                  💡 <strong>Tip:</strong> Domain ownership is checked per-app via farcaster.json. Add your wallet to the "owner" or "owners" field in your app's farcaster.json file for auto-approval. Domain verification below is optional.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Domain Verification - Optional, shown if wallet is verified but domain is not, OR if wallet is not verified */}
          {((walletVerified && !domainVerified) || (!walletVerified && step <= 3)) && (
            <Card className="glass-card mb-6 border-base-cyan/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-base-cyan" />
                  {walletVerified ? "Optional: Verify Domain" : "Step 2: Verify Domain (Optional)"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {walletVerified && !domainVerified && (
                    <div className="bg-base-cyan/10 border border-base-cyan/30 rounded-lg p-3 mb-4">
                      <p className="text-xs text-muted-foreground">
                        <strong>Note:</strong> Domain verification is optional. Domain ownership is checked per-app via farcaster.json when you submit. This step is only needed if you want to verify a domain separately.
                      </p>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="domain">Your Domain</Label>
                    <Input
                      id="domain"
                      type="url"
                      placeholder="https://yourdomain.com"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      className="glass-card mt-2"
                      disabled={domainVerified}
                    />
                  </div>
                  {!domainVerified && (
                    <GlowButton
                      onClick={handleStartDomainVerification}
                      disabled={verifying || !domain}
                      className="w-full"
                    >
                      {verifying ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        "Start Domain Verification"
                      )}
                    </GlowButton>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Upload Verification File */}
          {step === 4 && (
            <Card className="glass-card mb-6">
              <CardHeader>
                <CardTitle>Step 3: Upload Verification File</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>File Path</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="flex-1 p-2 bg-background-secondary rounded text-sm">
                        /.well-known/miniapp-verification.txt
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard("/.well-known/miniapp-verification.txt")}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>File Content</Label>
                    <div className="flex items-start gap-2 mt-2">
                      <code className="flex-1 p-2 bg-background-secondary rounded text-sm whitespace-pre-wrap">
                        {verificationContent}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(verificationContent)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="bg-base-blue/10 border border-base-blue/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">
                      <strong>Instructions:</strong>
                      <br />
                      1. Create the file at the path shown above on your domain
                      <br />
                      2. Paste the content exactly as shown
                      <br />
                      3. Make sure the file is publicly accessible
                      <br />
                      4. Click "Verify Domain" below
                    </p>
                  </div>
                  <GlowButton
                    onClick={handleConfirmDomainVerification}
                    disabled={verifying}
                    className="w-full"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify Domain"
                    )}
                  </GlowButton>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Complete */}
          {step === 5 && (
            <Card className="glass-card mb-6 border-green-500/30">
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-xl font-bold mb-2">Verification Complete! 🎉</h2>
                  <p className="text-muted-foreground text-sm mb-4">
                    Your developer account is now verified. You can now submit mini apps.
                  </p>
                  <div className="flex gap-2 justify-center flex-wrap">
                    <GlowButton asChild>
                      <a href="/submit">Submit Your First App</a>
                    </GlowButton>
                    <GlowButton asChild variant="solid">
                      <a href="/dashboard">Go to Dashboard</a>
                    </GlowButton>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    You can close this page. You won't need to verify again.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

