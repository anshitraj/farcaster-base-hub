"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

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

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { user: miniAppUser, context: miniAppContext, isInMiniApp, loaded: miniAppLoaded } = useMiniApp();
  
  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const [hasAuthenticated, setHasAuthenticated] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMobile(window.innerWidth < 1024);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      // Reset states when modal closes to prevent stale data
      setProfile(null);
      setLoading(true);
      setHasAuthenticated(false);
      return;
    }
    
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
  }, [isOpen, miniAppLoaded, miniAppUser, isConnected, address, isInMiniApp, miniAppContext]);

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
      const isBaseWallet = !isFarcaster && await checkIfBaseWallet(normalizedWallet);
      
      let name: string | null = null;
      let avatar: string | null = null;
      let isAdmin = false;
      
      if (miniAppUser) {
        name = miniAppUser.displayName || miniAppUser.username || null;
        avatar = miniAppUser.pfpUrl || null;
      }
      
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
      
      if (isFarcaster && extractedFid && !name) {
        name = `FID: ${extractedFid}`;
      }
      
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
        onClose();
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
    if (hasAuthenticated) return;
    
    try {
      const message = "Login to Mini App Store";
      let signature = "";

      try {
        signature = await signMessageAsync({ message });
      } catch (signError: any) {
        console.warn("Message signing failed (non-critical):", signError.message);
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
        // Refresh profile data without full page reload
        // Re-fetch profile after authentication
        const walletRes = await fetch("/api/auth/wallet", { 
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        if (walletRes.ok) {
          const walletData = await walletRes.json();
          if (walletData.wallet) {
            const normalizedWallet = walletData.wallet.toLowerCase().trim();
            const fidMatch = normalizedWallet.match(/^farcaster:(\d+)$/);
            if (fidMatch) {
              await loadProfile(normalizedWallet, undefined, parseInt(fidMatch[1]));
            } else {
              await loadProfile(normalizedWallet);
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
    }
  };

  // Auto-authenticate when wallet connects via Wagmi (only if not already authenticated and modal is open)
  // Only run on desktop - Mini Apps auto-connect
  useEffect(() => {
    if (isOpen && isConnected && address && !profile && !loading && !hasAuthenticated && !isInMiniApp) {
      authenticateWallet(address);
    }
  }, [isOpen, isConnected, address, profile, loading, hasAuthenticated, isInMiniApp]);

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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className={`fixed inset-0 z-[200] ${isMobile ? 'flex items-end' : 'flex items-center justify-center'} p-4`}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        
        {/* Modal - Bottom-up on mobile, centered on desktop */}
        <motion.div
          initial={isMobile ? { opacity: 0, y: "100%" } : { opacity: 0, scale: 0.95, y: 20 }}
          animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1, y: 0 }}
          exit={isMobile ? { opacity: 0, y: "100%" } : { opacity: 0, scale: 0.95, y: 20 }}
          transition={isMobile ? { type: "spring", damping: 25, stiffness: 200 } : {}}
          className={`relative bg-gray-900 border border-gray-800 w-full ${isMobile ? 'rounded-t-3xl border-b-0' : 'rounded-2xl max-w-md'} p-6 space-y-6 ${isMobile ? 'max-h-[85vh]' : 'max-h-[90vh]'} overflow-y-auto`}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-base-blue border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !profile ? (
            <div className="text-center space-y-4 py-8">
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
          ) : (
            <>
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
                    <a href="/admin" onClick={onClose}>
                      <Shield className="w-4 h-4 mr-2" />
                      Admin Portal
                    </a>
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
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

