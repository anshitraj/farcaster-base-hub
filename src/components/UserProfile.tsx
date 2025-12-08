"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { User, LogOut, Copy, Check, Wallet, Shield, ExternalLink, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useSignMessage } from "wagmi";
import { useMiniApp } from "@/components/MiniAppProvider";
import { getCurrentUser, clearCurrentUser } from "@/lib/auth-helpers";
import Link from "next/link";
import { optimizeDevImage } from "@/utils/optimizeDevImage";

interface UserProfileData {
  wallet: string;
  name: string | null;
  avatar: string | null;
  isBaseWallet: boolean;
  isAdmin?: boolean;
  developerName?: string | null; // Developer profile name
  fid?: number | null; // Farcaster ID
  isFarcaster?: boolean; // Whether this is a Farcaster login
}

export default function UserProfile() {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { user: miniAppUser, context: miniAppContext, isInMiniApp, loaded: miniAppLoaded } = useMiniApp();
  
  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  useEffect(() => {
    let mounted = true;
    let isLoggingOut = false;
    let timeoutId: NodeJS.Timeout | null = null;
    
    // Check if we're in a logout state (check for a flag in sessionStorage)
    if (typeof window !== "undefined") {
      const logoutFlag = sessionStorage.getItem("logoutInProgress");
      if (logoutFlag === "true") {
        // Don't auto-reconnect if logout is in progress
        sessionStorage.removeItem("logoutInProgress");
        setLoading(false);
        return () => {
          mounted = false;
        };
      }
    }
    
    // Set a timeout to ensure loading is always set to false after max 2 seconds
    // This prevents the app from getting stuck if auth check hangs
    timeoutId = setTimeout(() => {
      if (mounted) {
        console.log("Auth check timeout - setting loading to false");
        setLoading(false);
      }
    }, 2000);
    
    async function initAuth() {
      // Don't wait for Mini App - check auth immediately
      // Wagmi will handle auto-connection, MiniApp context loads in background
      if (mounted) {
        await checkAuth();
      }
      // Clear timeout if auth check completes
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
    
    initAuth();
    
    // Listen for wallet connected event to refresh profile
    const handleWalletConnected = () => {
      if (mounted) {
        checkAuth();
      }
    };
    
    // Wagmi handles account/chain changes automatically, so we don't need manual listeners
    if (typeof window !== "undefined") {
      window.addEventListener("walletConnected", handleWalletConnected);
    }
    
    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("walletConnected", handleWalletConnected);
      }
    };
  }, [miniAppLoaded, miniAppUser, isConnected, address]); // Re-check when MiniApp or Wagmi state changes

  async function checkAuth() {
    try {
      // If in Mini App and context is loaded, use Mini App user first
      if (isInMiniApp && miniAppLoaded && miniAppContext?.user && miniAppUser) {
        const userCtx = miniAppContext.user as any;
        const address = userCtx.address || userCtx.custodyAddress;
        if (address) {
          const normalizedWallet = address.toLowerCase().trim();
          // Pass FID if available from MiniApp user
          await fetchProfile(normalizedWallet, miniAppUser, miniAppUser.fid);
          setLoading(false);
          return;
        }
      }

      // Check for Farcaster user from localStorage (FIP-11)
      const fcUser = getCurrentUser();
      if (fcUser && fcUser.fid) {
        const farcasterWallet = `farcaster:${fcUser.fid}`;
        await fetchProfile(farcasterWallet, {
          username: fcUser.username,
          displayName: fcUser.displayName,
          pfpUrl: fcUser.pfpUrl,
        }, fcUser.fid);
        setLoading(false);
        return;
      }

      // Check for Farcaster session (fid cookie) - fallback
      try {
        const fidRes = await fetch("/api/auth/farcaster/me", {
          credentials: "include",
          cache: "no-store",
        });
        if (fidRes.ok) {
          const farcasterData = await fidRes.json();
          if (farcasterData.farcaster) {
            const fid = farcasterData.farcaster.fid;
            const farcasterWallet = `farcaster:${fid}`;
            await fetchProfile(farcasterWallet, undefined, fid);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        // Continue to wallet check if Farcaster check fails
      }

      // Check Wagmi connection first (for Farcaster Mini App wallet or Base Account)
      if (isConnected && address) {
        const normalizedWallet = address.toLowerCase().trim();
        // If we have MiniApp user info, pass it along with FID
        const userInfo = miniAppUser ? {
          username: miniAppUser.username,
          displayName: miniAppUser.displayName,
          pfpUrl: miniAppUser.pfpUrl,
        } : undefined;
        await fetchProfile(normalizedWallet, userInfo, miniAppUser?.fid);
        setLoading(false);
        return;
      }

      // Otherwise, check wallet auth from session
      const res = await fetch("/api/auth/wallet", { 
        method: "GET",
        credentials: "include", // Important: include cookies
        cache: "no-store", // Force fresh data
      });
      if (res.ok) {
        const data = await res.json();
        if (data.wallet) {
          // Normalize wallet address (lowercase, no extra characters)
          const normalizedWallet = data.wallet.toLowerCase().trim();
          // Check if it's a Farcaster wallet format
          const fidMatch = normalizedWallet.match(/^farcaster:(\d+)$/);
          if (fidMatch) {
            await fetchProfile(normalizedWallet, undefined, parseInt(fidMatch[1]));
          } else {
            await fetchProfile(normalizedWallet);
          }
        } else {
          setProfile(null);
        }
      } else if (res.status === 401) {
        setProfile(null);
      } else {
        setProfile(null);
      }
    } catch (error) {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProfile(wallet: string, miniAppUser?: { username?: string; displayName?: string; pfpUrl?: string }, fid?: number) {
      // Normalize wallet address to ensure consistency (declare outside try-catch)
    const normalizedWallet = wallet.toLowerCase().trim();
    
    // Check if this is a Farcaster wallet
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

      // Use Mini App user info if available (highest priority for avatar and name)
      if (miniAppUser) {
        avatar = miniAppUser.pfpUrl || null;
        // For Farcaster users, use displayName/username
        // For Base users, we'll try to get .minicast name below
        if (isFarcaster) {
          name = miniAppUser.displayName || miniAppUser.username || name;
        } else if (!name) {
          // For Base, try MiniApp name but .minicast takes priority
          name = miniAppUser.displayName || miniAppUser.username || null;
        }
      }

      // Always try to resolve .minicast name for Base wallets (even if MiniApp has a name)
      if (isBaseWallet) {
        const baseName = await resolveBaseName(wallet);
        if (baseName) {
          name = baseName; // .minicast name takes priority
        }
        if (!avatar) {
          avatar = await fetchBaseAvatar(wallet, name);
        }
      }

      // Get developer profile for name, avatar, and admin status
      // This is the PRIMARY source of truth for admin status
      try {
        const devRes = await fetch(`/api/developers/${normalizedWallet}`, {
          credentials: "include",
          cache: "no-store", // Force fresh data
        });
        if (devRes.ok) {
          const devData = await devRes.json();
          // Check adminRole field - this is the most reliable way to determine admin status
          if (devData.developer?.adminRole) {
            isAdmin = devData.developer.adminRole === "ADMIN" || devData.developer.adminRole === "MODERATOR";
          }
          // Use developer name if available
          if (devData.developer?.name) {
            name = devData.developer.name;
          }
          // Use developer avatar if available
          if (devData.developer?.avatar && !avatar) {
            avatar = devData.developer.avatar;
          }
        }
      } catch (e) {
        // Ignore errors checking developer profile
      }
      
      // Fallback: Check admin API if developer check didn't find admin role
      // (This is a secondary check in case developer record doesn't have adminRole set)
      if (!isAdmin) {
        try {
          const adminRes = await fetch(`/api/admin/check`, {
            credentials: "include",
          });
          if (adminRes.ok) {
            const adminData = await adminRes.json();
            // hasAccess returns true for both ADMIN and MODERATOR
            isAdmin = adminData.hasAccess === true || adminData.isAdmin === true || adminData.isModerator === true;
          }
        } catch (e) {
          // Ignore errors checking admin status
        }
      }

      // Also try to get from profile API
      try {
        const profileRes = await fetch(`/api/developer/profile`, {
          credentials: "include",
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData.developer?.name && !name) {
            name = profileData.developer.name;
          }
        }
      } catch (e) {
        // Ignore errors
      }

      setProfile({
        wallet: normalizedWallet,
        name,
        avatar,
        isBaseWallet,
        isAdmin,
        fid: extractedFid,
        isFarcaster: isFarcaster,
      });
    } catch (error) {
      console.error("Profile fetch error:", error);
      setProfile({
        wallet: normalizedWallet,
        name: null,
        avatar: null,
        isBaseWallet: false,
        isAdmin: false,
        fid: extractedFid,
        isFarcaster: isFarcaster,
      });
    }
  }

  async function checkIfBaseWallet(wallet: string): Promise<boolean> {
    // With Wagmi, we can check if we're on Base chain
    // For now, we'll assume Base wallets are EVM addresses (not Farcaster format)
    // In a Mini App context, Wagmi will handle chain detection
    return !wallet.startsWith("farcaster:");
  }

  async function resolveBaseName(wallet: string): Promise<string | null> {
    try {
      // Use our API endpoint to resolve .minicast names
      const res = await fetch(`/api/base/profile?wallet=${encodeURIComponent(wallet)}`, {
        credentials: "include",
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.name && data.name.endsWith('.minicast')) {
          return data.name;
        }
      }
    } catch (error) {
      console.error("Error resolving base name:", error);
    }
    return null;
  }

  async function fetchBaseAvatar(wallet: string, name: string | null): Promise<string | null> {
    // Try to fetch Base profile photo via our API
    try {
      const res = await fetch(`/api/base/profile?wallet=${encodeURIComponent(wallet)}`, {
        credentials: "include",
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.avatar) {
          return data.avatar;
        }
      }
    } catch (error) {
      // Fall through to fallback
    }
    
    // Fallback: Use a consistent generated avatar based on wallet
    // This ensures the same wallet always gets the same avatar
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${wallet}&backgroundColor=b6e3f4,c0aede,d1d4f9&hairColor=77311d,4a312c`;
  }

  const connectWallet = async () => {
    if (isConnecting) return;

    try {
      // In Base/Farcaster Mini Apps, wallet should auto-connect
      // This is only for regular browsers
      if (isInMiniApp) {
        toast({
          title: "Already Connected",
          description: "Your wallet is automatically connected in Base/Farcaster App",
        });
        return;
      }

      // Use Wagmi to connect - baseAccount connector for regular browsers
      if (connectors.length > 0) {
        // Try baseAccount connector first (for regular browsers)
        const connector = connectors.find(c => c.id === 'baseAccount') || connectors[0];
        
        // Connect using Wagmi (connection success will be handled by useEffect watching isConnected)
        connect({ connector });
      } else {
        toast({
          title: "No Wallet Available",
          description: "Please open in Farcaster or Base App for automatic connection",
          variant: "destructive",
        });
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
    // Check global authentication lock to prevent multiple components from authenticating simultaneously
    const authLockKey = `auth_lock_${walletAddress.toLowerCase()}`;
    const authLock = sessionStorage.getItem(authLockKey);
    if (authLock === "true") {
      // Another component is already authenticating, wait and check again
      return;
    }
    
    // Set global lock
    sessionStorage.setItem(authLockKey, "true");
    
    try {
      // Check if already authenticated by checking session
      const sessionCheck = await fetch("/api/auth/wallet", {
        method: "GET",
        credentials: "include",
      });
      if (sessionCheck.ok) {
        const sessionData = await sessionCheck.json();
        if (sessionData.wallet && sessionData.wallet.toLowerCase() === walletAddress.toLowerCase()) {
          // Already authenticated, just refresh profile
          sessionStorage.removeItem(authLockKey);
          checkAuth();
          return;
        }
      }
      
      const message = "Login to Mini App Store";
      let signature = "";

      // Try to sign message if possible
      try {
        signature = await signMessageAsync({ message });
      } catch (signError: any) {
        console.warn("Message signing failed (non-critical):", signError.message);
        // Remove lock on error
        sessionStorage.removeItem(authLockKey);
        return;
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
        toast({
          title: "Wallet Connected",
          description: `Connected as ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
        });
        checkAuth(); // Re-fetch profile after successful connection
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
    } finally {
      // Always remove lock after authentication attempt completes
      sessionStorage.removeItem(authLockKey);
    }
  };

  // Auto-authenticate when wallet connects via Wagmi (only if not already authenticated)
  // In Base/Farcaster Mini Apps, this happens automatically on load via farcasterMiniApp/baseAccount
  useEffect(() => {
    if (isConnected && address && !profile && !loading) {
      // Immediate authentication - no delay needed as Wagmi handles connection
      authenticateWallet(address);
    }
  }, [isConnected, address, profile, loading]);


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
      // Clear Farcaster user data
      clearCurrentUser();
      
      // Disconnect Wagmi wallet
      if (isConnected) {
        disconnect();
      }
      
      // Clear server-side session
      const res = await fetch("/api/auth/logout", { 
        method: "GET",
        credentials: "include",
      });
      
      if (res.ok) {
        // Clear profile state
        setProfile(null);
        
        toast({
          title: "Disconnected",
          description: "Logged out successfully.",
        });
        
        // Reload to ensure all state is reset
        window.location.reload();
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

  // In Base/Farcaster Mini Apps, don't show connect button - auto-connects
  // Only show connect button in regular browsers
  if (!profile) {
    // If in Mini App and still loading, show loading state (auto-connecting)
    // But only for a short time - don't block forever
    if (isInMiniApp && loading) {
      return (
        <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
      );
    }

    // Regular browser - show connect options immediately (don't wait for loading)
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            disabled={isConnecting}
            onClick={connectWallet}
            className="bg-base-blue hover:bg-base-blue/90 text-white shadow-lg shadow-base-blue/30 text-xs px-2 py-1 h-7"
            size="sm"
          >
            <Wallet className="w-3 h-3 mr-1" />
            <span className="hidden sm:inline">{isConnecting ? "Connecting..." : "Connect"}</span>
            <span className="sm:hidden">{isConnecting ? "..." : "Connect"}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="glass-card border-white/10 w-56">
          {/* Farcaster login option - only show if not in Mini App */}
          <DropdownMenuItem asChild>
            <a
              href="/login"
              className="cursor-pointer flex items-center gap-2 w-full"
            >
              <ExternalLink className="w-4 h-4 text-purple-400" />
              <div className="flex flex-col">
                <span className="font-medium">Farcaster</span>
                <span className="text-xs text-muted-foreground">Sign In With Farcaster</span>
              </div>
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={connectWallet}
            disabled={isConnecting}
            className="cursor-pointer flex items-center gap-2"
          >
            <Wallet className="w-4 h-4 text-base-blue" />
            <div className="flex flex-col">
              <span className="font-medium">Connect Wallet</span>
              <span className="text-xs text-muted-foreground">Connect Web3 wallet</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Display name priority: .minicast name > FID > display name > wallet address
  const displayName = profile.name && profile.name.endsWith('.minicast') 
    ? profile.name.replace('.minicast', '') // Remove .minicast suffix for display
    : profile.isFarcaster && profile.fid
    ? `FID: ${profile.fid}`
    : profile.name || `${profile.wallet.slice(0, 6)}...${profile.wallet.slice(-4)}`;
  
  const displayAddress = profile.isFarcaster && profile.fid
    ? `FID: ${profile.fid}`
    : profile.name && profile.name.endsWith('.minicast')
    ? profile.name
    : `${profile.wallet.slice(0, 6)}...${profile.wallet.slice(-4)}`;
  
  const avatarUrl = profile.avatar || 
    (profile.isBaseWallet 
      ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.wallet}&backgroundColor=b6e3f4,c0aede,d1d4f9&hairColor=77311d,4a312c`
      : `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.wallet}&backgroundColor=ffffff&hairColor=77311d`);

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-base-blue/50 rounded-full p-1">
            <div className="relative">
              <Image
                src={optimizeDevImage(avatarUrl)}
                alt={displayName}
                width={36}
                height={36}
                className="w-9 h-9 rounded-full border-2 border-white/20 shadow-lg"
              />
              {profile.isBaseWallet && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-base-blue rounded-full flex items-center justify-center border-2 border-[#0B0F19] shadow-md">
                  <span className="text-[8px] text-white font-bold">B</span>
                </div>
              )}
            </div>
            <span className="hidden lg:block text-sm font-medium text-foreground max-w-[120px] truncate font-mono">
              {displayAddress}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="glass-card border-white/10 w-64">
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <Image
                src={optimizeDevImage(avatarUrl)}
                alt={displayName}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full border-2 border-base-blue/50"
              />
              <div className="flex-1 min-w-0">
                {profile.name && (
                  <p className="text-sm font-semibold truncate">
                    {profile.name}
                  </p>
                )}
                {!profile.name && (
                  <p className="text-sm font-semibold truncate text-muted-foreground">
                    {displayAddress}
                  </p>
                )}
                {/* Show Base .minicast name if available */}
                {profile.isBaseWallet && profile.name && profile.name.endsWith('.minicast') && (
                  <p className="text-xs text-base-blue mt-0.5">{profile.name}</p>
                )}
                {/* Show FID for Farcaster users */}
                {profile.isFarcaster && profile.fid && (
                  <p className="text-xs text-purple-400 mt-0.5">FID: {profile.fid}</p>
                )}
                {profile.isBaseWallet && !profile.name?.endsWith('.minicast') && (
                  <p className="text-xs text-base-blue mt-0.5">Base Wallet</p>
                )}
                <p className="text-xs text-muted-foreground font-mono mt-1 truncate">
                  {profile.wallet}
                </p>
              </div>
            </div>
          </div>
          {/* First option: Name with .minicast or FID (if available) */}
          {profile.name && profile.name.endsWith('.minicast') && (
            <DropdownMenuItem className="cursor-default">
              <User className="w-4 h-4 mr-2" />
              <span className="font-medium">{profile.name}</span>
            </DropdownMenuItem>
          )}
          {/* Show FID for Farcaster users */}
          {profile.isFarcaster && profile.fid && (
            <DropdownMenuItem className="cursor-default">
              <User className="w-4 h-4 mr-2" />
              <span className="font-medium">FID: {profile.fid}</span>
            </DropdownMenuItem>
          )}
          {/* Second option: Copy Address */}
          <DropdownMenuItem
            onClick={copyAddress}
            className="cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Address
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* Logout */}
          <DropdownMenuItem
            onClick={handleDisconnect}
            className="text-destructive focus:text-destructive cursor-pointer"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* Additional options */}
          <DropdownMenuItem asChild>
            <a href="/dashboard" className="cursor-pointer">
              <User className="w-4 h-4 mr-2" />
              Dashboard
            </a>
          </DropdownMenuItem>
          {!profile.isAdmin && (
            <DropdownMenuItem asChild>
              <a href="/verify" className="cursor-pointer">
                <Shield className="w-4 h-4 mr-2" />
                {profile.isBaseWallet ? "Verify Developer" : "Verify Account"}
              </a>
            </DropdownMenuItem>
          )}
          {/* Admin Portal option */}
          {profile.isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/admin" className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  Admin Portal
                </a>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
