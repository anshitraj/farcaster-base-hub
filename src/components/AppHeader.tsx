"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Bell, Search, Plus, Menu, Wallet, Copy, Shield, CheckCircle2, LogOut } from "lucide-react";
import PointsDisplay from "@/components/PointsDisplay";
import NotificationSidebar from "@/components/NotificationSidebar";
import BaseLoginButton from "@/components/BaseLoginButton";
import { useState, useEffect, Suspense } from "react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { useMiniApp } from "@/components/MiniAppProvider";
import { useAccount, useConnect, useSignMessage, useDisconnect } from "wagmi";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface AppHeaderProps {
  onMenuClick?: () => void;
}

function AppHeaderContent({ onMenuClick }: AppHeaderProps) {
  const [notificationSidebarOpen, setNotificationSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [isBaseApp, setIsBaseApp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasAuthenticated, setHasAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string | null; avatar: string | null; isAdmin: boolean; wallet: string } | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isInMiniApp, loaded } = useMiniApp();
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const { toast } = useToast();
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  
  // Detect if we're in Base app specifically
  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkBaseApp = () => {
        const ethereum = (window as any).ethereum;
        if (ethereum && (ethereum.isBase || ethereum.isCoinbaseWallet || ethereum.isCoinbaseBrowser)) {
          setIsBaseApp(true);
        } else {
          setIsBaseApp(false);
        }
      };
      checkBaseApp();
      // Re-check periodically in case provider loads later
      const interval = setInterval(checkBaseApp, 1000);
      return () => clearInterval(interval);
    }
  }, []);
  
  // Initialize search query from URL
  useEffect(() => {
    try {
      const urlSearch = searchParams?.get("search") || "";
      setSearchQuery(urlSearch);
    } catch (error) {
      // Ignore errors during SSR
    }
  }, [searchParams]);

  // Fetch unread notification count - don't wait for Mini App
  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/notifications?unread=true&limit=1", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const count = data.unreadCount || 0;
        setUnreadCount(count > 0 ? count : null);
      } else {
        setUnreadCount(null);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []); // Fetch immediately, no dependencies

  // Debounce search query for real-time search (500ms delay)
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Handle real-time search - update URL when debounced value changes
  useEffect(() => {
    try {
      if (!searchParams) return;
      const params = new URLSearchParams(searchParams.toString());
      
      if (debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
        params.delete("page"); // Reset to page 1 on new search
      } else {
        params.delete("search");
      }
      
      const newUrl = `/apps?${params.toString()}`;
      
      // Only update URL if we're on apps page or home page
      if (pathname === "/apps") {
        router.replace(newUrl, { scroll: false });
      } else if (pathname === "/" && debouncedSearch.trim()) {
        // If on home page and user types, navigate to apps page
        router.push(newUrl);
      }
    } catch (error) {
      // Ignore errors during SSR
    }
  }, [debouncedSearch, pathname, router, searchParams]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Navigate to apps page if not already there
      if (pathname !== "/apps") {
        const params = new URLSearchParams();
        if (searchQuery.trim()) {
          params.set("search", searchQuery.trim());
        }
        router.push(`/apps?${params.toString()}`);
      }
    }
  };

  const handleConnectWallet = async () => {
    if (isConnecting) return;

    try {
      // Desktop only - use MetaMask/injected connector
      const metaMaskConnector = connectors.find(c => c.id === 'injected' || c.name?.includes('MetaMask'));
      const connector = metaMaskConnector;
      
      if (!connector) {
        toast({
          title: "No Wallet Available",
          description: "Please install MetaMask or another Web3 wallet",
          variant: "destructive",
        });
        return;
      }

      // Connect using Wagmi
      connect({ connector });
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
    // Prevent multiple authentication attempts - check both local state and global lock
    if (hasAuthenticated) return;
    
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
          // Already authenticated, just set local flag
          setHasAuthenticated(true);
          sessionStorage.removeItem(authLockKey);
          return;
        }
      }
      
      const message = "Login to Mini App Store";
      let signature = "";

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
        setHasAuthenticated(true);
        // Don't reload - let components update naturally
        // The profile will update when user navigates or opens profile modal
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
    } finally {
      // Always remove lock after authentication attempt completes
      sessionStorage.removeItem(authLockKey);
    }
  };

  // Fetch user profile for admin check and display
  useEffect(() => {
    if (isConnected && address) {
      async function fetchUserProfile() {
        try {
          if (!address) return;
          const walletAddress = address.toLowerCase();
          const res = await fetch(`/api/auth/user?wallet=${encodeURIComponent(walletAddress)}`, {
            credentials: "include",
            cache: "no-store",
          });
          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              setUserProfile({
                name: data.user.name || null,
                avatar: data.user.avatar || null,
                isAdmin: data.user.isAdmin || false,
                wallet: walletAddress,
              });
            }
          }
        } catch (error) {
          // Silently fail
        }
      }
      fetchUserProfile();
    } else {
      setUserProfile(null);
    }
  }, [isConnected, address]);

  const copyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Wallet address copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy address",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      // Disconnect Wagmi wallet first
      if (isConnected) {
        disconnect();
      }
      
      // Clear local state
      setHasAuthenticated(false);
      setUserProfile(null);
      
      // Call logout API
      const res = await fetch("/api/auth/logout", { 
        method: "GET",
        credentials: "include",
        redirect: "manual", // Don't follow redirects automatically
      });
      
      // Even if the response is a redirect (status 3xx), consider it success
      // The cookies are cleared by the server
      if (res.ok || res.status >= 300) {
        toast({
          title: "Disconnected",
          description: "Logged out successfully.",
        });
        // Reload the page to clear all state
        window.location.href = "/";
      } else {
        throw new Error("Failed to logout");
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Even if API call fails, try to clear local state and disconnect
      if (isConnected) {
        disconnect();
      }
      setHasAuthenticated(false);
      setUserProfile(null);
      
      toast({
        title: "Logout Failed",
        description: "Failed to disconnect. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Auto-authenticate when wallet connects (desktop only, once)
  useEffect(() => {
    if (isConnected && address && !isInMiniApp && !hasAuthenticated) {
      // Add a small delay to prevent race conditions with other components
      const timer = setTimeout(() => {
        authenticateWallet(address);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isConnected, address, isInMiniApp, hasAuthenticated]);

  // Don't block header rendering - show immediately with loading states
  // Components will handle their own loading states

  return (
    <>
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-2xl border-b border-gray-800/50 shadow-lg">
        <div className="px-2 sm:px-3 md:px-6 py-3 sm:py-4 md:py-6 flex items-center gap-1.5 sm:gap-2 md:gap-4">
          {/* Left Side: Menu Button + Logo */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0 min-w-0">
            {/* Mobile Menu Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onMenuClick}
              className="lg:hidden p-1.5 sm:p-2 hover:bg-gray-800 rounded-xl transition-all duration-300 flex-shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-gray-300" />
            </motion.button>

            <Link 
              href="/" 
              className="flex-shrink-0 hover:opacity-80 transition-opacity min-w-0"
            >
              <Image
                src="/logo.webp"
                alt="Mini App Store"
                width={300}
                height={100}
                className="h-12 sm:h-14 md:h-16 lg:h-20 w-auto max-w-[160px] sm:max-w-none"
                priority
                quality={90}
                sizes="(max-width: 640px) 160px, (max-width: 1024px) 280px, 300px"
              />
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-3 flex-shrink-0 ml-auto min-w-0">
            {/* List a Project Button - Show on mobile instead of profile */}
            <Link href="/submit" className="flex-shrink-0">
              <motion.button
                whileHover={isMobile ? {} : { scale: 1.05 }}
                whileTap={isMobile ? {} : { scale: 0.95 }}
                className="flex items-center gap-1 sm:gap-1.5 md:gap-2 px-2 py-1 sm:px-2.5 sm:py-1.5 md:px-4 md:py-2 rounded-lg bg-[#1E3A5F] border border-[#2A5F8F] text-white hover:bg-[#2A5F8F] active:bg-[#3A5F9F] transition-all duration-100 text-[10px] sm:text-xs md:text-sm font-semibold touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 flex-shrink-0" />
                <span className="hidden sm:inline">List your mini app</span>
                <span className="sm:hidden">List</span>
              </motion.button>
            </Link>

            <motion.button 
              whileHover={isMobile ? {} : { scale: 1.1 }}
              whileTap={isMobile ? {} : { scale: 0.9 }}
              className="relative p-1 sm:p-1.5 md:p-2 hover:bg-gray-800 active:bg-gray-700 rounded-xl transition-all duration-100 touch-manipulation flex-shrink-0"
              onClick={() => setNotificationSidebarOpen(true)}
              aria-label="Notifications"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-gray-300" />
              {unreadCount !== null && unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[12px] h-[12px] sm:min-w-[14px] sm:h-[14px] md:min-w-[18px] md:h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[7px] sm:text-[8px] md:text-[10px] font-bold text-white px-0.5 sm:px-0.5 md:px-1.5 border-2 border-black shadow-lg">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </motion.button>
            {/* Points Display - Show in all contexts including Base/Farcaster */}
            <div className="flex-shrink-0 min-w-0">
              {loaded && <PointsDisplay />}
            </div>
            
            {/* Connect Wallet Button/Dropdown - Desktop only, hide in Mini Apps */}
            {loaded && !isInMiniApp && (
              <div className="hidden md:flex items-center gap-2">
                {!isConnected ? (
                  <>
                    <Button
                      onClick={handleConnectWallet}
                      disabled={isConnecting}
                      className="bg-base-blue hover:bg-base-blue/90 text-white text-xs px-3 py-1.5 h-8"
                      size="sm"
                    >
                      <Wallet className="w-3 h-3 mr-1.5" />
                      {isConnecting ? "Connecting..." : "Connect Wallet"}
                    </Button>
                    {/* Only show Base login button if not already connected */}
                    {/* BaseLoginButton component handles its own visibility logic */}
                    <BaseLoginButton />
                  </>
                ) : address ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="text-xs px-3 py-1.5 h-8 font-mono"
                        size="sm"
                      >
                        {address.slice(0, 6)}...{address.slice(-4)}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass-card border-white/10 w-56">
                      <div className="px-3 py-2 border-b border-white/10">
                        <p className="text-xs text-muted-foreground mb-1">Wallet Address</p>
                        <p className="text-sm font-mono">{address}</p>
                      </div>
                      <DropdownMenuItem
                        onClick={copyAddress}
                        className="cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2 text-green-400" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Address
                          </>
                        )}
                      </DropdownMenuItem>
                      {userProfile?.isAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild className="cursor-pointer">
                            <Link href="/admin">
                              <Shield className="w-4 h-4 mr-2" />
                              Admin Portal
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="cursor-pointer text-red-400 focus:text-red-300 focus:bg-red-500/10"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </header>

      <NotificationSidebar 
        isOpen={notificationSidebarOpen} 
        onClose={() => setNotificationSidebarOpen(false)}
        onNotificationRead={fetchUnreadCount}
      />
    </>
  );
}

export default function AppHeader({ onMenuClick }: AppHeaderProps) {
  return (
    <Suspense fallback={
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-2xl border-b border-gray-800/50 shadow-lg">
        <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 flex items-center gap-2 sm:gap-3 md:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Link href="/" className="flex-shrink-0">
              <Image
                src="/logo.webp"
                alt="Mini App Store"
                width={300}
                height={100}
                className="h-12 sm:h-14 md:h-16 lg:h-20 w-auto"
                priority
                quality={90}
                sizes="(max-width: 640px) 200px, (max-width: 1024px) 280px, 300px"
              />
            </Link>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            <div className="h-10 w-32 bg-gray-800 rounded animate-pulse" />
            <div className="h-10 w-10 bg-gray-800 rounded animate-pulse" />
          </div>
        </div>
      </header>
    }>
      <AppHeaderContent onMenuClick={onMenuClick} />
    </Suspense>
  );
}

