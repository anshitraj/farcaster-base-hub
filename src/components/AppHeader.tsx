"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Bell, Search, Plus, Menu, Wallet, Copy, Shield, CheckCircle2 } from "lucide-react";
import PointsDisplay from "@/components/PointsDisplay";
import XPSDisplay from "@/components/XPSDisplay";
import NotificationSidebar from "@/components/NotificationSidebar";
import { useState, useEffect, Suspense } from "react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { useMiniApp } from "@/components/MiniAppProvider";
import { useAccount, useConnect, useSignMessage } from "wagmi";
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
  const { toast } = useToast();
  
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
  useEffect(() => {
    // Fetch immediately - don't block on Mini App identity
    async function fetchUnreadCount() {
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
    }

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
    // Prevent multiple authentication attempts
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
        // Don't reload - let components update naturally
        // The profile will update when user navigates or opens profile modal
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
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

  // Auto-authenticate when wallet connects (desktop only, once)
  useEffect(() => {
    if (isConnected && address && !isInMiniApp && !hasAuthenticated) {
      authenticateWallet(address);
    }
  }, [isConnected, address, isInMiniApp, hasAuthenticated]);

  // Don't block header rendering - show immediately with loading states
  // Components will handle their own loading states

  return (
    <>
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-2xl border-b border-gray-800/50 shadow-lg">
        <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-5 flex items-center gap-2 sm:gap-3 md:gap-4">
          {/* Left Side: Menu Button + Logo */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Mobile Menu Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onMenuClick}
              className="lg:hidden p-2 sm:p-2.5 hover:bg-gray-800 rounded-xl transition-all duration-300"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" />
            </motion.button>

            <Link 
              href="/" 
              className="flex-shrink-0 hover:opacity-80 transition-opacity"
            >
              <Image
                src="/logo.png"
                alt="Mini App Store"
                width={300}
                height={100}
                className="h-14 sm:h-12 md:h-14 lg:h-16 w-auto"
                priority
              />
            </Link>
          </div>

          {/* Search Bar - Center */}
          <div className="flex-1 max-w-2xl mx-2 sm:mx-4 hidden md:block">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
              <Input
                type="text"
                placeholder="Search mini apps..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-12 pr-4 h-11 rounded-full bg-gray-900 border border-gray-800 text-white placeholder:text-gray-500 focus-visible:ring-blue-500 focus-visible:ring-2 focus-visible:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-3 flex-shrink-0">
            {/* List a Project Button - Show on mobile instead of profile */}
            <Link href="/submit">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-[#1E3A5F] border border-[#2A5F8F] text-white hover:bg-[#2A5F8F] transition-all duration-300 text-xs md:text-sm font-semibold"
              >
                <Plus className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">List your mini app</span>
                <span className="sm:hidden">List App</span>
              </motion.button>
            </Link>

            {/* Mobile Search Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="md:hidden p-1.5 sm:p-2 hover:bg-gray-800 rounded-xl transition-all duration-300"
              onClick={() => router.push("/search")}
              aria-label="Search"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" />
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="relative p-1.5 sm:p-2 hover:bg-gray-800 rounded-xl transition-all duration-300"
              onClick={() => setNotificationSidebarOpen(true)}
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" />
              {unreadCount !== null && unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] sm:min-w-[18px] sm:h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[8px] sm:text-[10px] font-bold text-white px-0.5 sm:px-1.5 border-2 border-black shadow-lg">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </motion.button>
            {/* XPS Display - Always visible */}
            <XPSDisplay />
            {/* Points Display - Hide in Mini Apps (Farcaster/Base) to save space, show in regular browsers */}
            {loaded && !isInMiniApp && <PointsDisplay />}
            
            {/* Connect Wallet Button/Dropdown - Desktop only, hide in Mini Apps */}
            {loaded && !isInMiniApp && (
              <div className="hidden md:flex">
                {!isConnected ? (
                  <Button
                    onClick={handleConnectWallet}
                    disabled={isConnecting}
                    className="bg-base-blue hover:bg-base-blue/90 text-white text-xs px-3 py-1.5 h-8"
                    size="sm"
                  >
                    <Wallet className="w-3 h-3 mr-1.5" />
                    {isConnecting ? "Connecting..." : "Connect Wallet"}
                  </Button>
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
      />
    </>
  );
}

export default function AppHeader({ onMenuClick }: AppHeaderProps) {
  return (
    <Suspense fallback={
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-2xl border-b border-gray-800/50 shadow-lg">
        <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-5 flex items-center gap-2 sm:gap-3 md:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Link href="/" className="flex-shrink-0">
              <Image
                src="/logo.png"
                alt="Mini App Store"
                width={300}
                height={100}
                className="h-10 sm:h-12 md:h-14 lg:h-16 w-auto"
                priority
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

