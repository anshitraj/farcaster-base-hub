"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Loader2 } from "lucide-react";
import { useMiniApp } from "@/components/MiniAppProvider";
import { sdk } from "@farcaster/miniapp-sdk";

export default function LoginPage() {
  const [channelToken, setChannelToken] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("pending");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isInFarcasterApp, setIsInFarcasterApp] = useState<boolean>(false);
  const router = useRouter();
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { isInMiniApp, loaded: miniAppLoaded, user: miniAppUser } = useMiniApp();

  // Detect mobile and Farcaster app
  useEffect(() => {
    // Check if mobile device
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth < 768;
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    // Check if in Farcaster Mini App
    async function checkFarcasterApp() {
      try {
        const inMini = await sdk.isInMiniApp();
        setIsInFarcasterApp(inMini);
        
        // If in Farcaster app and user is already loaded, auto-login
        if (inMini && miniAppLoaded && miniAppUser) {
          (async () => {
            try {
              setLoading(true);
              
              if (!miniAppUser || !miniAppUser.fid) {
                throw new Error("No Farcaster user data available");
              }

              // Save user data to localStorage
              const userData = {
                fid: miniAppUser.fid,
                username: miniAppUser.username,
                displayName: miniAppUser.displayName,
                pfpUrl: miniAppUser.pfpUrl,
              };

              localStorage.setItem("fc_user", JSON.stringify(userData));

              // Save to database via API
              try {
                await fetch("/api/auth/fip11-callback", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(userData),
                });
              } catch (err) {
                console.error("Failed to save user to database:", err);
              }

              // Redirect to dashboard
              router.push("/dashboard");
            } catch (err: any) {
              console.error("Direct login error:", err);
              setError(err.message || "Failed to login");
              setLoading(false);
            }
          })();
        }
      } catch (err) {
        console.error("Error checking Farcaster app:", err);
      }
    }

    checkFarcasterApp();

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, [miniAppLoaded, miniAppUser, router]);


  // Create channel on mount (only for desktop)
  useEffect(() => {
    // Skip QR code flow if mobile or in Farcaster app
    if (isMobile || isInFarcasterApp) {
      // If in Farcaster app, wait for user data
      if (isInFarcasterApp && miniAppLoaded) {
        if (miniAppUser) {
          // Handle direct login
          (async () => {
            try {
              setLoading(true);
              
              if (!miniAppUser || !miniAppUser.fid) {
                throw new Error("No Farcaster user data available");
              }

              // Save user data to localStorage
              const userData = {
                fid: miniAppUser.fid,
                username: miniAppUser.username,
                displayName: miniAppUser.displayName,
                pfpUrl: miniAppUser.pfpUrl,
              };

              localStorage.setItem("fc_user", JSON.stringify(userData));

              // Save to database via API
              try {
                await fetch("/api/auth/fip11-callback", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(userData),
                });
              } catch (err) {
                console.error("Failed to save user to database:", err);
              }

              // Redirect to dashboard
              router.push("/dashboard");
            } catch (err: any) {
              console.error("Direct login error:", err);
              setError(err.message || "Failed to login");
              setLoading(false);
            }
          })();
        } else {
          // In Farcaster app but no user yet - wait a bit
          const timer = setTimeout(() => {
            if (!miniAppUser) {
              setError("Unable to get Farcaster user data. Please try again.");
              setLoading(false);
            }
          }, 3000);
          return () => clearTimeout(timer);
        }
      } else if (isMobile && !isInFarcasterApp) {
        // Mobile but not in Farcaster app - show message to open in Farcaster/Base App
        setError("Please open this app in Farcaster or Base App to connect your wallet");
        setLoading(false);
      }
      return;
    }

    // Desktop: Try FIP-11 QR code first
    async function createChannel() {
      try {
        setLoading(true);
        const res = await fetch("/api/auth/create-channel", {
          method: "POST",
        });

        if (!res.ok) {
          // If FIP-11 fails, check if it's a network/DNS error
          const errorData = await res.json();
          const errorMessage = errorData.details || errorData.error || errorData.message || "Failed to create login channel";
          
          // Check if it's a network connectivity issue or if Farcaster is not available
          if (errorData.networkError || 
              errorMessage.includes("ENOTFOUND") || 
              errorMessage.includes("fetch failed") || 
              errorMessage.includes("network") ||
              errorMessage.includes("connectivity")) {
            setError("Farcaster login is not available in this browser. Please open this app in Farcaster or Base App to connect your wallet, or use the wallet connection option.");
          } else {
            setError(errorMessage);
          }
          setLoading(false);
          return;
        }

        const data = await res.json();
        setChannelToken(data.channelToken);
        setQrUrl(data.url);
        setLoading(false);
      } catch (err: any) {
        console.error("Channel creation error:", err);
        
        // Check if it's a network error
        if (err.message?.includes("fetch failed") || 
            err.message?.includes("ENOTFOUND") || 
            err.cause?.code === "ENOTFOUND" ||
            err.cause?.errno === -3008) {
          setError("Farcaster login is not available in this browser. Please open this app in Farcaster or Base App to connect your wallet, or use the wallet connection option.");
        } else {
          setError(err.message || "Failed to create login channel. Please try connecting your wallet directly.");
        }
        setLoading(false);
      }
    }

    createChannel();
  }, [isMobile, isInFarcasterApp, miniAppLoaded, miniAppUser, router]);

  // Poll for status
  useEffect(() => {
    if (!channelToken || status === "completed") {
      return;
    }

    async function pollStatus() {
      if (!channelToken) return;
      
      try {
        const res = await fetch(`/api/auth/status?channelToken=${encodeURIComponent(channelToken)}`);
        
        if (!res.ok) {
          return; // Continue polling on error
        }

        const data = await res.json();
        setStatus(data.state || "pending");

        if (data.state === "completed") {
          // Save user data to localStorage
          const userData = {
            fid: data.fid,
            username: data.username,
            displayName: data.displayName,
            pfpUrl: data.pfpUrl,
            bio: data.bio,
            signature: data.signature,
            message: data.message,
          };

          localStorage.setItem("fc_user", JSON.stringify(userData));

          // Save to database via API
          try {
            await fetch("/api/auth/fip11-callback", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(userData),
            });
          } catch (err) {
            console.error("Failed to save user to database:", err);
            // Continue anyway - user is in localStorage
          }

          // Stop polling
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }

          // Redirect to dashboard
          router.push("/dashboard");
        } else if (data.state === "expired") {
          setError("Login session expired. Please try again.");
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
        }
      } catch (err) {
        console.error("Status poll error:", err);
        // Continue polling on error
      }
    }

    // Poll every 2 seconds
    pollIntervalRef.current = setInterval(pollStatus, 2000);
    
    // Initial poll
    pollStatus();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [channelToken, status, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-base-blue mx-auto mb-4" />
          <p className="text-white/70">
            {isInFarcasterApp ? "Signing in with Farcaster..." : "Preparing login..."}
          </p>
        </div>
      </div>
    );
  }

  // Mobile but not in Farcaster app - should redirect to OAuth (handled in useEffect)
  if (isMobile && !isInFarcasterApp) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-base-blue mx-auto mb-4" />
          <p className="text-white/70">Redirecting to Farcaster login...</p>
        </div>
      </div>
    );
  }

  // In Farcaster app - show direct login UI or redirect
  if (isInFarcasterApp) {
    if (miniAppUser) {
      // User data available, should be redirecting
      return (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-base-blue mx-auto mb-4" />
            <p className="text-white/70">Signing in...</p>
          </div>
        </div>
      );
    }
    
    // In Farcaster app but no user - show error or retry
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-4">
            {error || "Unable to get Farcaster user data"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-base-blue text-white rounded-lg hover:bg-base-blue/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (error && !qrUrl) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-[#0B0F19] border border-white/10 rounded-2xl p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-white mb-2">Farcaster Login</h1>
          <p className="text-red-400 mb-4">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-base-blue text-white rounded-lg hover:bg-base-blue/90"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
            >
              Go Back Home
            </button>
          </div>
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-white/50 text-xs mb-2">
              Farcaster login works best when opened in:
            </p>
            <ul className="text-white/70 text-xs space-y-1">
              <li>• Farcaster app (Warpcast)</li>
              <li>• Base App</li>
              <li>• Or use wallet connection on desktop</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Desktop: Show QR code
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#0B0F19] border border-white/10 rounded-2xl p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Sign In With Farcaster</h1>
          <p className="text-white/70 mb-6">Scan with Warpcast to sign in</p>
          <p className="text-white/50 text-xs mb-4">Desktop only - Use mobile app for direct login</p>

          {qrUrl && (
            <div className="mb-6 flex justify-center">
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG value={qrUrl} size={256} />
              </div>
            </div>
          )}

          {status === "pending" && (
            <div className="space-y-2">
              <Loader2 className="w-5 h-5 animate-spin text-base-blue mx-auto" />
              <p className="text-white/70 text-sm">Waiting for scan...</p>
            </div>
          )}

          {status === "completed" && (
            <div className="space-y-2">
              <p className="text-green-400 text-sm">✓ Authentication successful!</p>
              <p className="text-white/70 text-sm">Redirecting...</p>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm mt-4">{error}</p>
          )}

          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-white/50 text-xs">
              Don't have Warpcast?{" "}
              <a
                href="https://warpcast.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-base-blue hover:underline"
              >
                Download it here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

