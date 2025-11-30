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
import { getInjectedProvider } from "@/lib/wallet";
import { sdk } from "@farcaster/miniapp-sdk";

interface UserProfileData {
  wallet: string;
  name: string | null;
  avatar: string | null;
  isBaseWallet: boolean;
  isAdmin?: boolean;
  developerName?: string | null; // Developer profile name
}

export default function UserProfile() {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    let isLoggingOut = false;
    
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
    
    async function initAuth() {
      await checkAuth();
    }
    
    initAuth();
    
    // Listen for wallet connected event to refresh profile
    const handleWalletConnected = () => {
      if (mounted) {
        checkAuth();
      }
    };
    
    // Listen for wallet changes (but only if user is logged in)
    let handleAccountsChanged: (() => void) | null = null;
    let handleChainChanged: (() => void) | null = null;
    let provider: any = null;
    
    if (typeof window !== "undefined") {
      window.addEventListener("walletConnected", handleWalletConnected);
      
      provider = getInjectedProvider();
      if (provider && profile) {
        // Only listen to wallet changes if user is already connected
        handleAccountsChanged = () => {
          if (mounted && !isLoggingOut) {
            checkAuth();
          }
        };
        
        handleChainChanged = () => {
          if (mounted && !isLoggingOut) {
            checkAuth();
          }
        };
        
        provider.on("accountsChanged", handleAccountsChanged);
        provider.on("chainChanged", handleChainChanged);
      }
    }
    
    return () => {
      mounted = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("walletConnected", handleWalletConnected);
      }
      if (provider) {
        if (handleAccountsChanged) {
          provider.removeListener("accountsChanged", handleAccountsChanged);
        }
        if (handleChainChanged) {
          provider.removeListener("chainChanged", handleChainChanged);
        }
      }
    };
  }, [profile]);

  async function checkAuth() {
    try {
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
          await fetchProfile(normalizedWallet);
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

  async function fetchProfile(wallet: string) {
      // Normalize wallet address to ensure consistency (declare outside try-catch)
    const normalizedWallet = wallet.toLowerCase().trim();
    
    try {
      const isBaseWallet = await checkIfBaseWallet(normalizedWallet);
      
      let name: string | null = null;
      let avatar: string | null = null;
      let isAdmin = false;

      if (isBaseWallet) {
        name = await resolveBaseName(wallet);
        avatar = await fetchBaseAvatar(wallet, name);
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
      });
    } catch (error) {
      console.error("Profile fetch error:", error);
      setProfile({
        wallet: normalizedWallet,
        name: null,
        avatar: null,
        isBaseWallet: false,
        isAdmin: false,
      });
    }
  }

  async function checkIfBaseWallet(wallet: string): Promise<boolean> {
    if (typeof window !== "undefined") {
      try {
        const provider = getInjectedProvider();
        if (!provider) return false;
        
        if (provider.isBase || provider.isCoinbaseWallet || provider.isCoinbaseBrowser) {
          return true;
        }
        
        const chainId = await provider.request({
          method: "eth_chainId",
        });
        if (chainId === "0x2105" || chainId === "0x14a34") {
          return true;
        }
      } catch (e) {
        console.error("Chain check error:", e);
      }
    }
    return false;
  }

  async function resolveBaseName(wallet: string): Promise<string | null> {
    // Skip ENS resolution to avoid CORS errors - not critical for app functionality
    // If needed, implement server-side proxy for ENS lookups
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
    if (connecting) return;

    try {
      setConnecting(true);
      
      // Check for Farcaster Mini App SDK first (Base App uses this)
      const win = window as any;
      let address: string = "";
      let signature: string = "";
      const message = "Login to Mini App Store";

      // Try Farcaster Mini App SDK first
      let useFarcasterSDK = false;
      try {
        const isMini = await sdk.isInMiniApp();
        if (isMini) {
          console.log("Detected Farcaster Mini App, checking for wallet provider");
          // In Farcaster Mini App, use the standard provider from window
          // The SDK doesn't provide getSigner, but window.ethereum should be available
          const win = window as any;
          if (win.ethereum || win.wallet) {
            // Use the provider that's available in the Mini App context
            const provider = win.ethereum || win.wallet;
            try {
              const accounts = await provider.request({
                method: "eth_requestAccounts",
              });
              if (accounts && accounts.length > 0) {
                address = accounts[0];
                useFarcasterSDK = true;
                console.log("Farcaster Mini App wallet obtained:", address);
                
                // Try to sign message (optional - some environments don't require it)
                try {
                  signature = await provider.request({
                    method: "personal_sign",
                    params: [message, address],
                  });
                  console.log("Message signed via Farcaster Mini App provider");
                } catch (signError: any) {
                  console.warn("Farcaster Mini App sign failed (non-critical):", signError.message);
                  // Continue without signature - backend will accept it
                  signature = "";
                }
              } else {
                throw new Error("No account available in Farcaster Mini App");
              }
            } catch (providerError: any) {
              console.log("Farcaster Mini App provider error, falling back:", providerError.message);
              throw providerError;
            }
          } else {
            throw new Error("No wallet provider in Farcaster Mini App");
          }
        } else {
          throw new Error("Not in Mini App context");
        }
      } catch (fcError: any) {
        console.log("Farcaster SDK not available, using standard provider:", fcError.message);
        useFarcasterSDK = false;
      }

      // Use standard Web3 provider if Farcaster SDK didn't work
      if (!useFarcasterSDK) {
        // Use standard Web3 provider
        const provider = getInjectedProvider();

        if (!provider) {
          toast({
            title: "No Wallet Found",
            description: "Please install MetaMask or open in Base App",
            variant: "destructive",
          });
          setConnecting(false);
          return;
        }

        // Request accounts - this will trigger wallet popup
        let accounts: string[];
        try {
          accounts = await provider.request({
            method: "eth_requestAccounts",
          });
        } catch (requestError: any) {
          if (requestError.code === 4001 || requestError.message?.includes("reject") || requestError.message?.includes("not authorized")) {
            throw new Error("Wallet connection request was rejected");
          }
          throw new Error(requestError.message || "Failed to request accounts");
        }

        if (!accounts || accounts.length === 0) {
          throw new Error("No account selected");
        }

        address = accounts[0];

        // Request signature - try different parameter formats
        try {
          // Standard format for MetaMask: [message, address]
          signature = await provider.request({
            method: "personal_sign",
            params: [message, address],
          });
        } catch (e: any) {
          // If user rejected
          if (e.code === 4001 || e.message?.includes("reject") || e.message?.includes("not authorized")) {
            throw new Error("Signature request was rejected");
          }
          // Try alternative format [address, message] for some wallets
          try {
            signature = await provider.request({
              method: "personal_sign",
              params: [address, message],
            });
          } catch (e2: any) {
            if (e2.code === 4001 || e2.message?.includes("reject") || e2.message?.includes("not authorized")) {
              throw new Error("Signature request was rejected");
            }
            // For Base App, try without signature (some environments don't require it)
            console.warn("Signature failed, attempting connection without signature:", e2.message);
            signature = "";
          }
        }
      }

      // Call backend auth
      const res = await fetch("/api/auth/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          wallet: address,
          signature: signature || undefined,
          message: signature ? message : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        await fetchProfile(data.wallet || address);
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new Event("walletConnected"));
        
        toast({
          title: "Wallet Connected",
          description: "Successfully connected your wallet",
        });
        
        // Refresh to update all components
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Authentication failed");
      }
    } catch (error: any) {
      console.error("Connection error:", error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

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

  const disconnect = async () => {
    try {
      // Set logout flag to prevent auto-reconnection
      if (typeof window !== "undefined") {
        sessionStorage.setItem("logoutInProgress", "true");
      }
      
      const res = await fetch("/api/auth/wallet", { 
        method: "DELETE",
        credentials: "include", // Important: include cookies
      });
      
      if (res.ok) {
        // Clear profile state immediately
        setProfile(null);
        
        // Clear any local storage or session storage if used
        if (typeof window !== "undefined") {
          // Clear any wallet-related data
          try {
            localStorage.removeItem("walletAddress");
            // Don't clear sessionStorage yet - we'll do it after reload
          } catch (e) {
            // Ignore storage errors
          }
        }
        
        toast({
          title: "Disconnected",
          description: "Wallet disconnected successfully. You can now connect a different wallet.",
        });
        
        // Dispatch wallet disconnected event to notify other components
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("walletDisconnected"));
        }
        
        // Small delay before reload to ensure cookies are cleared
        setTimeout(() => {
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("logoutInProgress");
          }
          window.location.reload();
        }, 500);
      } else {
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("logoutInProgress");
        }
        throw new Error("Failed to logout");
      }
    } catch (error) {
      console.error("Disconnect error:", error);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("logoutInProgress");
      }
      toast({
        title: "Logout Failed",
        description: "Failed to disconnect. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
    );
  }

  if (!profile) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            disabled={connecting}
            className="bg-base-blue hover:bg-base-blue/90 text-white shadow-lg shadow-base-blue/30 text-xs px-2 py-1 h-7"
            size="sm"
          >
            <Wallet className="w-3 h-3 mr-1" />
            <span className="hidden sm:inline">{connecting ? "Connecting..." : "Connect"}</span>
            <span className="sm:hidden">{connecting ? "..." : "Connect"}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="glass-card border-white/10 w-56">
          <DropdownMenuItem asChild>
            <a
              href="/api/auth/farcaster/login"
              className="cursor-pointer flex items-center gap-2 w-full"
            >
              <ExternalLink className="w-4 h-4 text-purple-400" />
              <div className="flex flex-col">
                <span className="font-medium">Farcaster</span>
                <span className="text-xs text-muted-foreground">Login with Farcaster</span>
              </div>
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={connectWallet}
            disabled={connecting}
            className="cursor-pointer flex items-center gap-2"
          >
            <Wallet className="w-4 h-4 text-base-blue" />
            <div className="flex flex-col">
              <span className="font-medium">Base Wallet</span>
              <span className="text-xs text-muted-foreground">Connect MetaMask or other wallet</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const displayName = profile.name || `${profile.wallet.slice(0, 6)}...${profile.wallet.slice(-4)}`;
  const displayAddress = `${profile.wallet.slice(0, 6)}...${profile.wallet.slice(-4)}`;
  
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
                src={avatarUrl}
                alt={displayName}
                width={36}
                height={36}
                className="w-9 h-9 rounded-full border-2 border-white/20 shadow-lg"
                unoptimized
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
                src={avatarUrl}
                alt={displayName}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full border-2 border-base-blue/50"
                unoptimized
              />
              <div className="flex-1 min-w-0">
                {profile.name && (
                  <p className="text-sm font-semibold truncate">{profile.name}</p>
                )}
                {profile.isBaseWallet && (
                  <p className="text-xs text-base-blue mt-0.5">Base Wallet</p>
                )}
                <p className="text-xs text-muted-foreground font-mono mt-1 truncate">
                  {profile.wallet}
                </p>
              </div>
            </div>
          </div>
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
              <DropdownMenuItem
                onClick={disconnect}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
