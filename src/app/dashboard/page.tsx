"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import GlowButton from "@/components/GlowButton";
import UserProfile from "@/components/UserProfile";
import PageLoader from "@/components/PageLoader";
import DeleteAppButton from "@/components/DeleteAppButton";
import DashboardHeader from "@/components/DashboardHeader";
import XPProgressBar from "@/components/XPProgressBar";
import DailyClaimCard from "@/components/DailyClaimCard";
import StatsCard from "@/components/StatsCard";
import QuickShortcuts from "@/components/QuickShortcuts";
import { TrendingUp, Users, Star, Award, ExternalLink, Shield, CheckCircle2, XCircle, Settings, Save, Smartphone, Trophy, DollarSign, Loader2 } from "lucide-react";
import { trackPageView } from "@/lib/analytics";
import { motion } from "framer-motion";
import VerifiedBadge from "@/components/VerifiedBadge";
import PremiumToolsPanel from "@/components/PremiumToolsPanel";
import WalletBalance from "@/components/WalletBalance";
import AppHeader from "@/components/AppHeader";
import Sidebar from "@/components/Sidebar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getInjectedProvider } from "@/lib/wallet";
import { MiniAppListItem } from "@/components/MiniAppListItem";
import { Switch } from "@/components/ui/switch";
import { useMiniApp } from "@/components/MiniAppProvider";
import { useAccount } from "wagmi";

// Monetization Toggle Component
function MonetizationToggle({ appId, enabled, onToggle }: { appId: string; enabled: boolean; onToggle: () => void }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleToggle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/apps/${appId}/monetization`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled: !enabled }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update monetization");
      }

      toast({
        title: enabled ? "Monetization disabled" : "Monetization enabled",
        description: enabled 
          ? "Monetization has been disabled for this app" 
          : "Monetization has been enabled (Coming Soon)",
      });
      
      onToggle();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update monetization",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <Switch
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={loading}
              className="data-[state=checked]:bg-yellow-500"
            />
          )}
        </div>
        {enabled && (
          <span className="text-[10px] text-yellow-400 mt-0.5">Coming Soon</span>
        )}
      </div>
    </div>
  );
}

function DashboardPageContent() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [developerStatus, setDeveloperStatus] = useState<any>(null);
  const [xpData, setXpData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [profileName, setProfileName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [displayAvatar, setDisplayAvatar] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();
  const { user: miniAppUser } = useMiniApp();
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();

  // On desktop, sidebar should always be visible (isOpen = true)
  // On mobile, it starts closed
  // Only set initial state once, don't reset on every render
  useEffect(() => {
    // Check if sidebar state is already set (from localStorage or previous navigation)
    const savedSidebarState = typeof window !== 'undefined' 
      ? localStorage.getItem('sidebarOpen')
      : null;
    
    const checkMobile = () => {
      if (window.innerWidth >= 1024) {
        // On desktop, always open unless explicitly closed
        if (savedSidebarState === null) {
          setSidebarOpen(true);
        } else {
          setSidebarOpen(savedSidebarState === 'true');
        }
      } else {
        // On mobile, respect saved state or default to closed
        if (savedSidebarState !== null) {
          setSidebarOpen(savedSidebarState === 'true');
        } else {
          setSidebarOpen(false);
        }
      }
    };
    checkMobile();
    
    const handleResize = () => {
      if (window.innerWidth >= 1024 && !sidebarOpen) {
        setSidebarOpen(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Only run once on mount

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarOpen', String(sidebarOpen));
    }
  }, [sidebarOpen]);

  const handleSidebarChange = (collapsed: boolean, hidden: boolean) => {
    setSidebarCollapsed(collapsed);
    setSidebarHidden(hidden);
  };

  useEffect(() => {
    trackPageView("/dashboard");
  }, []);


  useEffect(() => {
    let mounted = true;
    
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/wallet", { 
          method: "GET",
          credentials: "include",
        });
        if (!mounted) return;
        
        if (res.ok) {
          const data = await res.json();
          if (mounted && data.wallet) {
            setWallet(data.wallet);
            
            // Fetch dashboard data - set loading to false early after critical data loads
            try {
              // First, fetch critical dashboard data
              const dashRes = await fetch(`/api/developers/${data.wallet}/dashboard`, {
                credentials: "include",
              });
              
              if (dashRes.ok) {
                const dashData = await dashRes.json();
                if (mounted) {
                  setDashboard(dashData);
                  // Set loading to false once we have dashboard data
                  setLoading(false);
                }
              } else if (mounted) {
                // Even if dashboard fetch fails, stop loading
                setDashboard({ totalApps: 0, totalClicks: 0, totalInstalls: 0, averageRating: 0, apps: [] });
                setLoading(false);
              }
              
              // Fetch other data in parallel (non-blocking)
              Promise.all([
                fetch(`/api/developers/${data.wallet}`, {
                  credentials: "include",
                }),
                fetch(`/api/xp/claim`, {
                  credentials: "include",
                }),
                fetch(`/api/developer/profile`, {
                  credentials: "include",
                }),
              ]).then(([devRes, xpRes, profileRes]) => {
                if (!mounted) return;
                
                if (devRes.ok) {
                  devRes.json().then((devData) => {
                    if (mounted) {
                      setDeveloperStatus(devData);
                    }
                  });
                }
                
                if (xpRes.ok) {
                  xpRes.json().then((xpData) => {
                    if (mounted) {
                      setXpData(xpData);
                    }
                  });
                }
                
                if (profileRes.ok) {
                  profileRes.json().then((profileData) => {
                    if (mounted && profileData.developer) {
                      setProfile(profileData.developer);
                      setProfileName(profileData.developer.name || "");
                    }
                  });
                }
              }).catch(() => {
                // Ignore errors for non-critical data
              });

              // Fetch Base wallet name and avatar if it's a Base wallet (non-blocking)
              // Also check for Farcaster profile
              // This runs in the background and doesn't block the UI
              (async () => {
                try {
                  // Check for Farcaster profile first
                  let farcasterData: any = null;
                  try {
                    const farcasterRes = await fetch("/api/auth/farcaster/me", {
                      credentials: "include",
                    });
                    if (farcasterRes.ok) {
                      farcasterData = await farcasterRes.json();
                    }
                  } catch (e) {
                    // Ignore Farcaster fetch errors
                  }

                  // Get profile data from the parallel fetch
                  const profileRes = await fetch(`/api/developer/profile`, {
                    credentials: "include",
                  });
                  let profileData: any = null;
                  if (profileRes.ok) {
                    profileData = await profileRes.json();
                  }

                  const isBaseWallet = await checkIfBaseWallet(data.wallet);
                  if (isBaseWallet) {
                    // Resolve Base name in background (non-blocking)
                    Promise.all([
                      resolveBaseName(data.wallet).catch(() => null),
                      fetchBaseAvatar(data.wallet, null).catch(() => null),
                    ]).then(([baseName, baseAvatar]) => {
                      if (!mounted) return;
                      
                      // Priority: MiniApp user name (Base/Farcaster) > Farcaster API name > developer profile name > Base name
                      if (miniAppUser?.displayName || miniAppUser?.username) {
                        setDisplayName(miniAppUser.displayName || miniAppUser.username || null);
                      } else if (farcasterData?.farcaster?.name) {
                        setDisplayName(farcasterData.farcaster.name);
                      } else if (profileData?.developer?.name) {
                        setDisplayName(profileData.developer.name);
                      } else if (baseName) {
                        setDisplayName(baseName);
                      }
                      
                      // Priority: MiniApp user avatar (Base/Farcaster) > Farcaster avatar > developer avatar > Base avatar
                      if (miniAppUser?.pfpUrl) {
                        setDisplayAvatar(miniAppUser.pfpUrl);
                      } else if (farcasterData?.farcaster?.avatar) {
                        setDisplayAvatar(farcasterData.farcaster.avatar);
                      } else if (profileData?.developer?.avatar) {
                        setDisplayAvatar(profileData.developer.avatar);
                      } else if (baseAvatar) {
                        setDisplayAvatar(baseAvatar);
                      }
                    });
                  } else if (mounted) {
                    // Not a Base wallet, check MiniApp user first, then Farcaster API, then developer profile
                    if (miniAppUser?.displayName || miniAppUser?.username) {
                      setDisplayName(miniAppUser.displayName || miniAppUser.username || null);
                    } else if (farcasterData?.farcaster?.name) {
                      setDisplayName(farcasterData.farcaster.name);
                    } else if (profileData?.developer?.name) {
                      setDisplayName(profileData.developer.name);
                    }
                    
                    // Priority: MiniApp user avatar (Base/Farcaster) > Farcaster avatar > developer avatar
                    if (miniAppUser?.pfpUrl) {
                      setDisplayAvatar(miniAppUser.pfpUrl);
                    } else if (farcasterData?.farcaster?.avatar) {
                      setDisplayAvatar(farcasterData.farcaster.avatar);
                    } else if (profileData?.developer?.avatar) {
                      setDisplayAvatar(profileData.developer.avatar);
                    }
                  }
                } catch (e) {
                  console.error("Error fetching wallet info:", e);
                  // Fallback to developer profile data
                  if (mounted) {
                    const profileRes = await fetch(`/api/developer/profile`, {
                      credentials: "include",
                    });
                    if (profileRes.ok) {
                      const profileData = await profileRes.json();
                      if (profileData.developer) {
                        // Priority: MiniApp user name > developer name
                        if (miniAppUser?.displayName || miniAppUser?.username) {
                          setDisplayName(miniAppUser.displayName || miniAppUser.username || null);
                        } else if (profileData.developer.name) {
                          setDisplayName(profileData.developer.name);
                        }
                        // Priority: MiniApp user avatar > developer avatar
                        if (miniAppUser?.pfpUrl) {
                          setDisplayAvatar(miniAppUser.pfpUrl);
                        } else if (profileData.developer.avatar) {
                          setDisplayAvatar(profileData.developer.avatar);
                        }
                      }
                    }
                  }
                }
              })();
            } catch (dashError) {
              console.error("Error fetching dashboard:", dashError);
              // Set empty dashboard if fetch fails
              if (mounted) {
                setDashboard({ totalApps: 0, totalClicks: 0, totalInstalls: 0, averageRating: 0, apps: [] });
                setLoading(false);
              }
            }
          } else if (mounted) {
            setWallet(null);
          }
        } else if (res.status === 401) {
          if (mounted) {
            setWallet(null);
            setLoading(false);
          }
        } else if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        if (mounted) {
          console.error("Error checking auth:", error);
          setWallet(null);
          setLoading(false);
        }
      }
    }

    // Initial check
    checkAuth();
    
    // Listen for storage events (when wallet connects in another tab/component)
    const handleStorageChange = () => {
      if (mounted) {
        checkAuth();
      }
    };
    
    window.addEventListener("storage", handleStorageChange);
    
    // Also listen for custom event when wallet connects
    const handleWalletConnect = () => {
      if (mounted) {
        setTimeout(checkAuth, 1000); // Wait a bit for cookie to be set
      }
    };
    
    window.addEventListener("walletConnected", handleWalletConnect);
    
    // Listen for wallet disconnect event
    const handleWalletDisconnect = () => {
      if (mounted) {
        setWallet(null);
        setDashboard(null);
        setDeveloperStatus(null);
        setXpData(null);
        setProfile(null);
        setDisplayName(null);
        setDisplayAvatar(null);
        setLoading(false);
      }
    };
    
    window.addEventListener("walletDisconnected", handleWalletDisconnect);
    
    // Dashboard doesn't need frequent polling - event listeners handle updates
    // Only poll occasionally as a fallback
    const interval = setInterval(() => {
      if (mounted) {
        checkAuth();
      }
    }, 60000); // Poll every 60 seconds (much less frequent)
    
    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("walletConnected", handleWalletConnect);
      window.removeEventListener("walletDisconnected", handleWalletDisconnect);
    };
  }, []); // Empty deps - only run once on mount

  // Refresh dashboard when Wagmi account changes (after logout/login)
  useEffect(() => {
    if (wagmiAddress && wagmiConnected && !wallet) {
      // Wallet reconnected but dashboard hasn't loaded - trigger auth check
      const timer = setTimeout(() => {
        // Trigger a storage event to refresh auth
        window.dispatchEvent(new Event('storage'));
        // Also trigger wallet connected event
        window.dispatchEvent(new CustomEvent('walletConnected'));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (!wagmiConnected && wallet) {
      // Wallet disconnected but we still have wallet state - clear it
      setWallet(null);
      setDashboard(null);
      setDeveloperStatus(null);
      setXpData(null);
      setProfile(null);
      setDisplayName(null);
      setDisplayAvatar(null);
      setLoading(false);
    }
  }, [wagmiAddress, wagmiConnected, wallet]);

  // Update avatar when MiniApp user changes (same priority as BottomNav)
  useEffect(() => {
    if (miniAppUser?.pfpUrl) {
      setDisplayAvatar(miniAppUser.pfpUrl);
    }
    if (miniAppUser?.displayName || miniAppUser?.username) {
      setDisplayName(miniAppUser.displayName || miniAppUser.username || null);
    }
  }, [miniAppUser]);

  if (loading) {
    return <PageLoader message="Loading dashboard..." />;
  }

  if (!wallet) {
    return (
      <div className="min-h-screen bg-[#0B0F19] pt-20 px-4 pb-24">
        <div className="max-w-screen-md mx-auto text-center py-20">
          <h1 className="text-2xl font-bold mb-4">Developer Dashboard</h1>
          <p className="text-muted-foreground mb-8 text-sm">
            Connect your wallet using the profile icon in the top right to view your developer dashboard
          </p>
          <div className="flex justify-center">
            <UserProfile />
          </div>
        </div>
      </div>
    );
  }

  // Helper functions for Base wallet
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
    return null;
  }

  async function fetchBaseAvatar(wallet: string, name: string | null): Promise<string | null> {
    // Skip avatar fetch to avoid CORS errors - not critical for app functionality
    return null;
  }

  const handleClaimSuccess = async () => {
    // Refresh XP data after claim
    if (wallet) {
      try {
        const xpRes = await fetch("/api/xp/claim", {
          credentials: "include",
        });
        if (xpRes.ok) {
          const xpData = await xpRes.json();
          setXpData(xpData);
        }
        
        // Also refresh dashboard to get updated XP
        const dashRes = await fetch(`/api/developers/${wallet}/dashboard`, {
          credentials: "include",
        });
        if (dashRes.ok) {
          const dashData = await dashRes.json();
          setDashboard(dashData);
        }
      } catch (error) {
        console.error("Error refreshing data:", error);
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0B0F19]">
      {/* Sidebar */}
      <Sidebar 
        onCollapseChange={handleSidebarChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <main className={`flex-1 min-h-screen w-full pb-20 lg:pb-0 transition-all duration-300 ${
        sidebarHidden 
          ? "ml-0" 
          : sidebarCollapsed 
            ? "lg:ml-16 ml-0" 
            : "lg:ml-64 ml-0"
      }`}>
        <AppHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div className="pt-8 pb-8">
        <div className="max-w-screen-md mx-auto px-4 md:px-6">
          {/* User Header */}
          {wallet && (() => {
            // Use the same avatar logic as BottomNav - prioritize MiniApp user avatar
            // Priority: MiniApp user avatar > displayAvatar > developer avatar > Base/Farcaster avatar > fallback dicebear
            let finalAvatar = miniAppUser?.pfpUrl || displayAvatar || developerStatus?.developer?.avatar || null;
            
            // If no avatar, use dicebear fallback (same as UserProfile)
            if (!finalAvatar) {
              // Check if it's a Base wallet (same logic as UserProfile)
              const isBaseWallet = wallet.toLowerCase().startsWith('0x') && 
                !wallet.toLowerCase().startsWith('farcaster:');
              
              if (isBaseWallet) {
                finalAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${wallet}&backgroundColor=b6e3f4,c0aede,d1d4f9&hairColor=77311d,4a312c`;
              } else {
                finalAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${wallet}&backgroundColor=ffffff&hairColor=77311d`;
              }
            }
            
            return (
              <DashboardHeader
                name={miniAppUser?.displayName || miniAppUser?.username || displayName || developerStatus?.developer?.name || null}
                avatar={finalAvatar}
                wallet={wallet}
                developerLevel={xpData?.developerLevel || dashboard?.developerLevel || 1}
                totalXP={xpData?.totalXP || dashboard?.totalXP || 0}
              />
            );
          })()}

          {/* XP Progress Bar */}
          {xpData && (
            <XPProgressBar
              currentXP={xpData.totalXP || 0}
              developerLevel={xpData.developerLevel || 1}
            />
          )}

          {/* Daily Claim Card */}
          {xpData && (
            <DailyClaimCard
              streakCount={xpData.streakCount || 0}
              lastClaimDate={xpData.lastClaimDate ? new Date(xpData.lastClaimDate) : null}
              canClaim={xpData.canClaim !== false}
              hoursRemaining={xpData.hoursRemaining || 0}
              minutesRemaining={xpData.minutesRemaining || 0}
              onClaimSuccess={handleClaimSuccess}
            />
          )}

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">Developer Dashboard</h1>
                <p className="text-muted-foreground text-sm">Track your apps and stats</p>
              </div>
              {developerStatus?.developer?.verified && (
                <VerifiedBadge type="developer" iconOnly size="lg" />
              )}
            </div>
            
            {/* Verification Status */}
            {developerStatus && developerStatus.developer && !developerStatus.developer.verified && (
              <Card className="card-surface border-yellow-500/30 mb-6">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">Verification Required</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Status: {developerStatus.developer?.verificationStatus?.replace("_", " ").toUpperCase() || "UNVERIFIED"}
                      </p>
                      {developerStatus.developer?.verificationStatus === "unverified" && (
                        <p className="text-xs text-muted-foreground mb-3">
                          Verify your wallet to submit apps. Add your wallet to farcaster.json owners for auto-approval.
                        </p>
                      )}
                      <Link href="/verify">
                        <GlowButton size="sm">
                          <Shield className="w-4 h-4 mr-2" />
                          Complete Verification
                        </GlowButton>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* Wallet Balance */}
          {wallet && (
            <WalletBalance wallet={wallet} />
          )}

          {/* Developer Stats */}
          {dashboard && (
            <StatsCard
              totalApps={dashboard.totalApps || 0}
              totalInstalls={dashboard.totalInstalls || 0}
              totalClicks={dashboard.totalClicks || 0}
              totalRatings={dashboard.apps?.reduce((sum: number, app: any) => sum + (app.ratingCount || 0), 0) || 0}
              totalBadges={dashboard.badgesCount || 0}
            />
          )}

          {/* Quick Actions */}
          <QuickShortcuts
            onScrollToApps={() => {
              const appsSection = document.getElementById("apps-section");
              if (appsSection) {
                appsSection.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
            onScrollToBadges={() => {
              const badgesSection = document.getElementById("badges-section");
              if (badgesSection) {
                badgesSection.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
          />

          {/* Apps List - Always show this section so scroll works */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            id="apps-section"
            className="mt-6"
          >
            <Card className="card-surface">
              <CardHeader>
                <CardTitle className="text-lg">Your Apps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard?.apps && dashboard.apps.length > 0 ? (
                    dashboard.apps
                      .filter((app: any) => app && app.id)
                      .map((app: any) => (
                        <div
                          key={app.id}
                          className="block p-4 rounded-lg bg-[#141A24] border border-[#1F2733] hover:border-[#2A2A2A] transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <Link
                              href={`/apps/${app.id}`}
                              className="flex-1 min-w-0"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold truncate">{app.name}</h3>
                                {app.status && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    app.status === "approved" 
                                      ? "bg-green-500/20 text-green-400" 
                                      : app.status === "pending_review" || app.status === "pending"
                                      ? "bg-yellow-500/20 text-yellow-400"
                                      : "bg-gray-500/20 text-gray-400"
                                  }`}>
                                    {app.status === "approved" ? "✓ Approved" : 
                                     app.status === "pending_review" ? "⏳ Review" :
                                     app.status === "pending" ? "⏳ Pending" :
                                     app.status}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>{app.clicks || 0} clicks</span>
                                <span>{app.installs || 0} installs</span>
                                <span>
                                  {((app.ratingAverage || 0) % 1 === 0) 
                                    ? (app.ratingAverage || 0).toString() 
                                    : (app.ratingAverage || 0).toFixed(1)} ⭐ (
                                  {app.ratingCount || 0})
                                </span>
                              </div>
                            </Link>
                            <div className="flex items-center gap-2 ml-4">
                              {/* Monetization Toggle */}
                              <MonetizationToggle
                                appId={app.id}
                                enabled={app.monetizationEnabled || false}
                                onToggle={() => {
                                  // Refresh dashboard data
                                  if (wallet) {
                                    fetch(`/api/developers/${wallet}/dashboard`, {
                                      credentials: "include",
                                    })
                                      .then((res) => res.json())
                                      .then((data) => {
                                        if (data.totalApps !== undefined) {
                                          setDashboard(data);
                                        }
                                      })
                                      .catch(console.error);
                                  }
                                }}
                              />
                              <Link href={`/apps/${app.id}`}>
                                <ExternalLink className="w-5 h-5 text-muted-foreground flex-shrink-0 hover:text-base-blue transition-colors" />
                              </Link>
                              <DeleteAppButton
                                appId={app.id}
                                appName={app.name}
                                onDeleted={() => {
                                  // Refresh dashboard data
                                  if (wallet) {
                                    fetch(`/api/developers/${wallet}/dashboard`, {
                                      credentials: "include",
                                    })
                                      .then((res) => res.json())
                                      .then((data) => {
                                        if (data.totalApps !== undefined) {
                                          setDashboard(data);
                                        }
                                      })
                                      .catch(console.error);
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground text-sm mb-4">
                        No apps yet. List your first mini app to get started!
                      </p>
                      <Link href="/submit">
                        <GlowButton size="sm">
                          <Smartphone className="w-4 h-4 mr-2" />
                          List your mini app
                        </GlowButton>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>


          {/* Badges Section */}
          {developerStatus?.developer?.badges && developerStatus.developer.badges.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              id="badges-section"
              className="mt-6"
            >
              <Card className="card-surface">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-500" />
                    Your Badges ({developerStatus.developer.badges.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {developerStatus.developer.badges
                      .filter((badge: any) => badge.imageUrl)
                      .map((badge: any) => (
                        <Link
                          key={badge.id}
                          href={`/apps/${badge.appId || '#'}`}
                          className="block"
                        >
                          <div className="p-4 rounded-lg bg-[#141A24] border border-[#1F2733] hover:border-[#2A2A2A] transition-colors text-center">
                            {badge.imageUrl && (
                              <img
                                src={badge.imageUrl}
                                alt={badge.name}
                                className="w-16 h-16 mx-auto mb-2 rounded-lg"
                              />
                            )}
                            <p className="text-sm font-medium">{badge.name}</p>
                            {badge.appName && (
                              <p className="text-xs text-muted-foreground mt-1">{badge.appName}</p>
                            )}
                          </div>
                        </Link>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Premium Tools */}
          {dashboard?.apps && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="mt-6"
            >
              <PremiumToolsPanel
                wallet={wallet || ""}
                apps={dashboard.apps || []}
              />
            </motion.div>
          )}

          {/* Profile Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-6"
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-base-blue" />
                  Profile Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="developer-name">Developer Name</Label>
                  <Input
                    id="developer-name"
                    placeholder="Enter your developer name"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="bg-[#141A24] border border-[#1F2733] focus-visible:ring-base-blue focus-visible:border-base-blue"
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    This name will be displayed on your developer profile and app listings
                  </p>
                </div>

                <GlowButton
                  onClick={async () => {
                    setSavingProfile(true);
                    try {
                      const res = await fetch("/api/developer/profile", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                          name: profileName.trim() || null,
                        }),
                      });

                      if (!res.ok) {
                        const data = await res.json();
                        throw new Error(data.error || "Failed to update profile");
                      }

                      const data = await res.json();
                      setProfile(data.developer);
                      setDisplayName(data.developer.name || null);
                      setDisplayAvatar(data.developer.avatar || null);
                      
                      toast({
                        title: "Success",
                        description: "Profile updated successfully",
                      });
                    } catch (error: any) {
                      toast({
                        title: "Error",
                        description: error.message || "Failed to update profile",
                        variant: "destructive",
                      });
                    } finally {
                      setSavingProfile(false);
                    }
                  }}
                  disabled={savingProfile}
                  className="w-full md:w-auto"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {savingProfile ? "Saving..." : "Save Profile"}
                </GlowButton>
              </CardContent>
            </Card>
          </motion.div>

          <div className="mt-6 text-center">
            <Link href="/submit">
              <GlowButton size="lg" className="w-full md:w-auto">
                List your mini app
              </GlowButton>
            </Link>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}

export default DashboardPageContent;
