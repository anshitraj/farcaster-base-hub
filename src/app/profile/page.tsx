"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import Sidebar from "@/components/Sidebar";
import { useMiniApp } from "@/components/MiniAppProvider";
import { useAccount, useDisconnect, useSignMessage, useConnect } from "wagmi";
import { useToast } from "@/hooks/use-toast";
import { 
  Copy, 
  LogOut, 
  Shield, 
  Wallet, 
  ExternalLink,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface UserProfileData {
  wallet: string;
  name: string | null;
  avatar: string | null;
  isBaseWallet: boolean;
  isAdmin?: boolean;
  developerName?: string | null;
  fid?: number | null;
  isFarcaster?: boolean;
}

function getCurrentUser() {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("fc_user");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error reading fc_user:", e);
  }
  return null;
}

function clearCurrentUser() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("fc_user");
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hasAuthenticated, setHasAuthenticated] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { user: miniAppUser, context: miniAppContext, isInMiniApp, loaded: miniAppLoaded } = useMiniApp();
  
  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { connect, connectors, isPending: isConnecting } = useConnect();

  // Check if mobile - must be before any conditional returns
  // Use useEffect to avoid hydration mismatch (window not available during SSR)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 1024);
      };
      checkMobile();
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
    }
  }, []);

  // On desktop, sidebar should always be visible
  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleSidebarChange = (collapsed: boolean, hidden: boolean) => {
    setSidebarCollapsed(collapsed);
    setSidebarHidden(hidden);
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    
    timeoutId = setTimeout(() => {
      if (mounted && loading) {
        setLoading(false);
      }
    }, 2000);
    
    async function fetchProfile() {
      try {
        // If in Mini App and context is loaded, use Mini App user first
        if (isInMiniApp && miniAppLoaded && miniAppContext?.user && miniAppUser) {
          const userCtx = miniAppContext.user as any;
          const address = userCtx.address || userCtx.custodyAddress;
          if (address) {
            const normalizedWallet = address.toLowerCase().trim();
            await loadProfile(normalizedWallet, miniAppUser, miniAppUser.fid);
            if (mounted) setLoading(false);
            if (timeoutId) clearTimeout(timeoutId);
            return;
          }
        }

        // Check for Farcaster user from localStorage (FIP-11)
        const fcUser = getCurrentUser();
        if (fcUser && fcUser.fid) {
          const farcasterWallet = `farcaster:${fcUser.fid}`;
          await loadProfile(farcasterWallet, {
            username: fcUser.username,
            displayName: fcUser.displayName,
            pfpUrl: fcUser.pfpUrl,
          }, fcUser.fid);
          if (mounted) setLoading(false);
          if (timeoutId) clearTimeout(timeoutId);
          return;
        }

        // Check Wagmi connection
        if (isConnected && address) {
          const normalizedWallet = address.toLowerCase().trim();
          const userInfo = miniAppUser ? {
            username: miniAppUser.username,
            displayName: miniAppUser.displayName,
            pfpUrl: miniAppUser.pfpUrl,
          } : undefined;
          await loadProfile(normalizedWallet, userInfo, miniAppUser?.fid);
          if (mounted) setLoading(false);
          if (timeoutId) clearTimeout(timeoutId);
          return;
        }

        // Check wallet auth from session
        const res = await fetch("/api/auth/wallet", { 
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.wallet) {
            const normalizedWallet = data.wallet.toLowerCase().trim();
            const fidMatch = normalizedWallet.match(/^farcaster:(\d+)$/);
            if (fidMatch) {
              await loadProfile(normalizedWallet, undefined, parseInt(fidMatch[1]));
            } else {
              await loadProfile(normalizedWallet);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        if (mounted) setLoading(false);
        if (timeoutId) clearTimeout(timeoutId);
      }
    }

    fetchProfile();
    
    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [miniAppLoaded, miniAppUser, isConnected, address, isInMiniApp, miniAppContext]);

  async function loadProfile(wallet: string, miniAppUser?: { username?: string; displayName?: string; pfpUrl?: string }, fid?: number) {
    const normalizedWallet = wallet.toLowerCase().trim();
    const isFarcaster = normalizedWallet.startsWith("farcaster:") || !!fid;
    let extractedFid: number | null = null;
    
    if (isFarcaster) {
      if (fid) {
        extractedFid = fid;
      } else {
        const fidMatch = normalizedWallet.match(/^farcaster:(\d+)$/);
        if (fidMatch) {
          extractedFid = parseInt(fidMatch[1]);
        }
      }
    }
    
    try {
      // Check if Base wallet
      const isBaseWallet = !isFarcaster && await checkIfBaseWallet(normalizedWallet);
      
      let name: string | null = null;
      let avatar: string | null = null;
      let isAdmin = false;
      
      // Use MiniApp user data if available
      if (miniAppUser) {
        name = miniAppUser.displayName || miniAppUser.username || null;
        avatar = miniAppUser.pfpUrl || null;
      }
      
      // Fetch from API
      try {
        const res = await fetch(`/api/auth/user?wallet=${encodeURIComponent(normalizedWallet)}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            name = data.user.name || name;
            avatar = data.user.avatar || avatar;
            isAdmin = data.user.isAdmin || false;
          }
        }
      } catch (e) {
        // Continue with existing data
      }
      
      // Use FID for Farcaster users if no name
      if (isFarcaster && extractedFid && !name) {
        name = `FID: ${extractedFid}`;
      }
      
      // Use Base .minicast name if available
      if (isBaseWallet && !name) {
        try {
          const baseRes = await fetch(`/api/base/name?address=${normalizedWallet}`);
          if (baseRes.ok) {
            const baseData = await baseRes.json();
            if (baseData.name) {
              name = baseData.name;
            }
          }
        } catch (e) {
          // Ignore
        }
      }
      
      // Fallback avatar
      if (!avatar) {
        avatar = isBaseWallet
          ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${normalizedWallet}&backgroundColor=b6e3f4,c0aede,d1d4f9&hairColor=77311d,4a312c`
          : `https://api.dicebear.com/7.x/avataaars/svg?seed=${normalizedWallet}&backgroundColor=ffffff&hairColor=77311d`;
      }
      
      setProfile({
        wallet: normalizedWallet,
        name,
        avatar,
        isBaseWallet,
        isAdmin,
        fid: extractedFid,
        isFarcaster,
      });
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  }

  async function checkIfBaseWallet(address: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/base/check?address=${address}`);
      if (res.ok) {
        const data = await res.json();
        return data.isBase || false;
      }
    } catch (e) {
      // Ignore
    }
    return false;
  }

  const copyAddress = async () => {
    if (!profile) return;
    
    try {
      await navigator.clipboard.writeText(profile.wallet);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Wallet address copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy error:", error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy address",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      clearCurrentUser();
      
      if (isConnected) {
        disconnect();
      }
      
      const res = await fetch("/api/auth/logout", { 
        method: "GET",
        credentials: "include",
      });
      
      if (res.ok) {
        setProfile(null);
        toast({
          title: "Disconnected",
          description: "Logged out successfully.",
        });
        router.push("/");
      } else {
        throw new Error("Failed to logout");
      }
    } catch (error) {
      console.error("Disconnect error:", error);
      toast({
        title: "Logout Failed",
        description: "Failed to disconnect. Please try again.",
        variant: "destructive",
      });
    }
  };

  const connectWallet = async () => {
    if (isConnecting) return;

    try {
      // In Base/Farcaster Mini Apps, wallet should auto-connect via farcasterMiniApp/baseAccount
      if (isInMiniApp) {
        toast({
          title: "Already Connected",
          description: "Your wallet is automatically connected in Base/Farcaster App",
        });
        return;
      }

      // Mobile: Use farcasterMiniApp or baseAccount connectors (auto-connect in Base/Farcaster)
      // Desktop: Use MetaMask/injected connector
      if (isMobile) {
        // Try farcasterMiniApp first, then baseAccount
        const farcasterConnector = connectors.find(c => c.id === 'farcasterMiniApp');
        const baseConnector = connectors.find(c => c.id === 'baseAccount');
        const connector = farcasterConnector || baseConnector;
        
        if (connector) {
          connect({ connector });
        } else {
          toast({
            title: "No Wallet Available",
            description: "Please open in Farcaster or Base App for automatic connection",
            variant: "destructive",
          });
        }
      } else {
        // Desktop: Use MetaMask/injected connector
        const metaMaskConnector = connectors.find(c => c.id === 'injected' || c.name?.includes('MetaMask'));
        if (metaMaskConnector) {
          connect({ connector: metaMaskConnector });
        } else {
          toast({
            title: "No Wallet Available",
            description: "Please install MetaMask",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error("Wallet connection error:", error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
    }
  };

  const authenticateWallet = async (walletAddress: string) => {
    // Prevent multiple authentication attempts
    if (hasAuthenticated) return;
    
    try {
      const message = "Login to Mini App Store";
      let signature = "";

      // Try to sign message if possible
      try {
        signature = await signMessageAsync({ message });
      } catch (signError: any) {
        console.warn("Message signing failed (non-critical):", signError.message);
        // Continue without signature - backend will accept it
      }

      const res = await fetch("/api/auth/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: walletAddress,
          signature,
          message,
        }),
        credentials: "include",
      });

      if (res.ok) {
        setHasAuthenticated(true);
        toast({
          title: "Wallet Connected",
          description: `Connected as ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
        });
        // Reload profile
        setTimeout(() => window.location.reload(), 500);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Authentication failed");
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      toast({
        title: "Authentication Failed",
        description: error.message || "Failed to authenticate wallet",
        variant: "destructive",
      });
    }
  };

  // Auto-authenticate when wallet connects via Wagmi (only if not already authenticated)
  useEffect(() => {
    if (isConnected && address && !profile && !loading && !hasAuthenticated) {
      authenticateWallet(address);
    }
  }, [isConnected, address, profile, loading, hasAuthenticated]);

  // Display name priority: .minicast name > FID > display name > wallet address
  const displayName = profile?.name && profile.name.endsWith('.minicast') 
    ? profile.name.replace('.minicast', '')
    : profile?.isFarcaster && profile.fid
    ? `FID: ${profile.fid}`
    : profile?.name || (profile ? `${profile.wallet.slice(0, 6)}...${profile.wallet.slice(-4)}` : "");
  
  const displayAddress = profile?.isFarcaster && profile.fid
    ? `FID: ${profile.fid}`
    : profile?.name && profile.name.endsWith('.minicast')
    ? profile.name
    : profile ? `${profile.wallet.slice(0, 6)}...${profile.wallet.slice(-4)}` : "";

  if (loading) {
    return (
      <div className="flex min-h-screen bg-black">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-base-blue" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen bg-black">
        <Sidebar
          onCollapseChange={handleSidebarChange}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed && !sidebarHidden ? "lg:ml-20" : sidebarHidden ? "lg:ml-0" : "lg:ml-64"}`}>
          <AppHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          
          {/* Desktop: Show login in sidebar area, Mobile: Show at bottom of profile */}
          {!isMobile ? (
            // Desktop: Login options in main content area
            <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-[calc(100vh-80px)]">
              <div className="text-center space-y-4 max-w-md">
                <Wallet className="w-16 h-16 mx-auto text-gray-600" />
                <h2 className="text-2xl font-bold text-white">Connect Your Wallet</h2>
                <p className="text-gray-400">Connect your wallet to view your profile</p>
                <div className="space-y-3 pt-4">
                  <Button 
                    asChild 
                    className="bg-purple-600 hover:bg-purple-700 w-full"
                  >
                    <a href="/login">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Sign In With Farcaster
                    </a>
                  </Button>
                  {isConnected && address ? (
                    <Button 
                      onClick={() => authenticateWallet(address)} 
                      className="bg-base-blue hover:bg-base-blue/90 w-full"
                      disabled={isConnecting}
                    >
                      {isConnecting ? "Connecting..." : "Authenticate Wallet"}
                    </Button>
                  ) : (
                    <Button 
                      onClick={connectWallet} 
                      className="bg-base-blue hover:bg-base-blue/90 w-full"
                      disabled={isConnecting}
                    >
                      {isConnecting ? "Connecting..." : "Connect Wallet"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Mobile: Login at bottom of profile page
            <div className="flex-1 flex flex-col justify-between p-4 pb-32 min-h-[calc(100vh-80px)]">
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="text-center space-y-4 max-w-md">
                  <Wallet className="w-16 h-16 mx-auto text-gray-600" />
                  <h2 className="text-2xl font-bold text-white">Connect Your Wallet</h2>
                  <p className="text-gray-400">Connect your wallet to view your profile</p>
                </div>
              </div>
              
              {/* Mobile: Login buttons at bottom */}
              <div className="space-y-3 pt-4 border-t border-gray-800">
                <Button 
                  asChild 
                  className="bg-purple-600 hover:bg-purple-700 w-full"
                >
                  <a href="/login">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Sign In With Farcaster
                  </a>
                </Button>
                {isConnected && address ? (
                  <Button 
                    onClick={() => authenticateWallet(address)} 
                    className="bg-base-blue hover:bg-base-blue/90 w-full"
                    disabled={isConnecting}
                  >
                    {isConnecting ? "Connecting..." : "Authenticate Wallet"}
                  </Button>
                ) : (
                  <Button 
                    onClick={connectWallet} 
                    className="bg-base-blue hover:bg-base-blue/90 w-full"
                    disabled={isConnecting}
                  >
                    {isConnecting ? "Connecting..." : "Connect Wallet"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar
        onCollapseChange={handleSidebarChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed && !sidebarHidden ? "lg:ml-20" : sidebarHidden ? "lg:ml-0" : "lg:ml-64"}`}>
        <AppHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        <div className="max-w-2xl mx-auto px-4 py-8 pb-24 lg:pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-6 space-y-6"
          >
            {/* Profile Header */}
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <Image
                  src={profile.avatar || "/default-avatar.png"}
                  alt={displayName}
                  width={80}
                  height={80}
                  className="rounded-full border-2 border-base-blue object-cover"
                  onError={(e) => {
                    // Fallback to default avatar if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.wallet}&backgroundColor=b6e3f4,c0aede,d1d4f9&hairColor=77311d,4a312c`;
                  }}
                />
                {profile.isBaseWallet && (
                  <div className="absolute -bottom-1 -right-1 bg-base-blue rounded-full p-1">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-white truncate">{displayName}</h1>
                {profile.name && profile.name.endsWith('.minicast') && (
                  <p className="text-gray-400 truncate">{profile.name}</p>
                )}
                {profile.isFarcaster && profile.fid && (
                  <p className="text-gray-400">FID: {profile.fid}</p>
                )}
              </div>
            </div>

            {/* Wallet Address */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Wallet Address</label>
              <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-3">
                <code className="flex-1 text-sm text-gray-300 font-mono">{displayAddress}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyAddress}
                  className="h-8 w-8 p-0"
                >
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-4 border-t border-gray-800">
              {profile.isAdmin && (
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Link href="/admin">
                    <Shield className="w-4 h-4 mr-2" />
                    Admin Portal
                  </Link>
                </Button>
              )}
              
              <Button
                variant="destructive"
                className="w-full justify-start"
                onClick={handleDisconnect}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

