"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
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
import { TrendingUp, Users, Star, Award, ExternalLink, Shield, CheckCircle2, XCircle, Smartphone, Trophy, DollarSign, Loader2 } from "lucide-react";
import { trackPageView } from "@/lib/analytics";
import VerifiedBadge from "@/components/VerifiedBadge";
import WalletBalance from "@/components/WalletBalance";
import AppHeader from "@/components/AppHeader";
import Sidebar from "@/components/Sidebar";
import { useToast } from "@/hooks/use-toast";
import { getInjectedProvider } from "@/lib/wallet";
import { MiniAppListItem } from "@/components/MiniAppListItem";
import { Switch } from "@/components/ui/switch";
import { useMiniApp } from "@/components/MiniAppProvider";
import { useAccount } from "wagmi";

// Dynamically import framer-motion to reduce initial bundle size
const MotionDiv = dynamic(
  () => import("framer-motion").then((mod) => mod.motion.div),
  { ssr: false }
);

// Dynamically import heavy components
const PremiumToolsPanel = dynamic(() => import("@/components/PremiumToolsPanel"), {
  loading: () => <div className="h-32 bg-gray-900 rounded-xl animate-pulse" />,
});

const DashboardBadgesSection = dynamic(() => import("./DashboardBadgesSection"), {
  loading: () => <div className="h-48 bg-gray-900 rounded-xl animate-pulse" />,
});


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

export default function DashboardPageContent() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [developerStatus, setDeveloperStatus] = useState<any>(null);
  const [xpData, setXpData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [displayAvatar, setDisplayAvatar] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const { toast } = useToast();
  const { user: miniAppUser } = useMiniApp();
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // On desktop, sidebar should always be visible (isOpen = true)
  // On mobile, it starts closed
  useEffect(() => {
    const savedSidebarState = typeof window !== 'undefined' 
      ? localStorage.getItem('sidebarOpen')
      : null;
    
    const checkMobile = () => {
      if (window.innerWidth >= 1024) {
        if (savedSidebarState === null) {
          setSidebarOpen(true);
        } else {
          setSidebarOpen(savedSidebarState === 'true');
        }
      } else {
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
  }, []);

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

  // Helper functions for Base wallet (defined before useEffect)
  const checkIfBaseWallet = async (wallet: string): Promise<boolean> => {
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
  };

  const resolveBaseName = async (wallet: string): Promise<string | null> => {
    return null;
  };

  const fetchBaseAvatar = async (wallet: string, name: string | null): Promise<string | null> => {
    return null;
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
            
            // Fetch dashboard data FIRST (critical) - show page immediately
            try {
              const dashRes = await fetch(`/api/developers/${data.wallet}/dashboard`, { 
                credentials: "include",
                cache: 'no-store', // Always get fresh data
              });
              
              if (dashRes.ok) {
                const dashData = await dashRes.json();
                if (mounted) {
                  setDashboard(dashData);
                  setLoading(false); // Show page IMMEDIATELY after dashboard loads
                }
              } else if (mounted) {
                setDashboard({ totalApps: 0, totalClicks: 0, totalInstalls: 0, averageRating: 0, apps: [] });
                setLoading(false); // Show page even if dashboard fails
              }
            } catch (dashError) {
              console.error("Error fetching dashboard:", dashError);
              if (mounted) {
                setDashboard({ totalApps: 0, totalClicks: 0, totalInstalls: 0, averageRating: 0, apps: [] });
                setLoading(false);
              }
            }
            
            // Fetch other data in background (non-blocking, fire and forget)
            // Don't wait for these - they'll populate when ready
            Promise.allSettled([
              fetch(`/api/developers/${data.wallet}`, { credentials: "include" }).then(res => res.ok ? res.json() : null).then(devData => {
                if (mounted && devData) {
                  setDeveloperStatus(devData);
                }
              }).catch(() => {}),
              
              fetch(`/api/xp/claim`, { credentials: "include" }).then(res => res.ok ? res.json() : null).then(xpData => {
                if (mounted && xpData) setXpData(xpData);
              }).catch(() => {}),
              
              fetch(`/api/developer/profile`, { credentials: "include" }).then(res => res.ok ? res.json() : null).then(data => {
                if (mounted && data?.developer) {
                  setProfile(data.developer);
                }
              }).catch(() => {}),
              
              fetch("/api/auth/farcaster/me", { credentials: "include" }).then(res => res.ok ? res.json() : null).then(farcasterData => {
                if (mounted && farcasterData?.farcaster) {
                  // Update display name/avatar if not already set
                  if (!displayName && farcasterData.farcaster.name) {
                    setDisplayName(farcasterData.farcaster.name);
                  }
                  if (!displayAvatar && farcasterData.farcaster.avatar) {
                    setDisplayAvatar(farcasterData.farcaster.avatar);
                  }
                }
              }).catch(() => {}),
            ]).catch(() => {}); // Ignore all errors for background fetches
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

    checkAuth();
    
    const handleStorageChange = () => {
      if (mounted) {
        checkAuth();
      }
    };
    
    window.addEventListener("storage", handleStorageChange);
    
    const handleWalletConnect = () => {
      if (mounted) {
        setTimeout(checkAuth, 1000);
      }
    };
    
    window.addEventListener("walletConnected", handleWalletConnect);
    
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
    
    const interval = setInterval(() => {
      if (mounted) {
        checkAuth();
      }
    }, 60000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("walletConnected", handleWalletConnect);
      window.removeEventListener("walletDisconnected", handleWalletDisconnect);
    };
  }, []);

  useEffect(() => {
    if (wagmiAddress && wagmiConnected && !wallet) {
      const timer = setTimeout(() => {
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('walletConnected'));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (!wagmiConnected && wallet) {
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

  useEffect(() => {
    if (miniAppUser?.pfpUrl) {
      setDisplayAvatar(miniAppUser.pfpUrl);
    }
    if (miniAppUser?.displayName || miniAppUser?.username) {
      setDisplayName(miniAppUser.displayName || miniAppUser.username || null);
    }
  }, [miniAppUser]);

  if (loading) {
    return <PageLoader message="Hold on, making your dashboard more smooth... Fetching dashboard details" />;
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

  const handleClaimSuccess = async () => {
    if (wallet) {
      try {
        const xpRes = await fetch("/api/xp/claim", {
          credentials: "include",
        });
        if (xpRes.ok) {
          const xpData = await xpRes.json();
          setXpData(xpData);
        }
        
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

  const HeaderCard = prefersReducedMotion ? "div" : MotionDiv;
  const headerProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: -20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4 },
      };

  const AppsCard = prefersReducedMotion ? "div" : MotionDiv;
  const appsProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, delay: 0.1 },
      };

  return (
    <div className="flex min-h-screen bg-[#0B0F19]">
      <Sidebar 
        onCollapseChange={handleSidebarChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

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
            {wallet && (() => {
              let finalAvatar = miniAppUser?.pfpUrl || displayAvatar || developerStatus?.developer?.avatar || null;
              
              if (!finalAvatar) {
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

            {xpData && (
              <XPProgressBar
                currentXP={xpData.totalXP || 0}
                developerLevel={xpData.developerLevel || 1}
              />
            )}

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

            <HeaderCard {...headerProps} className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold mb-2">Developer Dashboard</h1>
                  <p className="text-muted-foreground text-sm">Track your apps and stats</p>
                </div>
                {developerStatus?.developer?.verified && (
                  <VerifiedBadge type="developer" iconOnly size="lg" />
                )}
              </div>
              
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
            </HeaderCard>

            {wallet && (
              <WalletBalance wallet={wallet} />
            )}

            {dashboard && (
              <StatsCard
                totalApps={dashboard.totalApps || 0}
                totalInstalls={dashboard.totalInstalls || 0}
                totalClicks={dashboard.totalClicks || 0}
                totalRatings={dashboard.apps?.reduce((sum: number, app: any) => sum + (app.ratingCount || 0), 0) || 0}
                totalBadges={dashboard.badgesCount || 0}
              />
            )}

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

            <AppsCard {...appsProps} id="apps-section" className="mt-6">
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
                                <MonetizationToggle
                                  appId={app.id}
                                  enabled={app.monetizationEnabled || false}
                                  onToggle={() => {
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
            </AppsCard>

            {(developerStatus?.developer?.apps && developerStatus.developer.apps.length > 0) && (
              <div id="badges-section" className="mt-6">
                <DashboardBadgesSection 
                  badges={developerStatus.developer.badges || []} 
                  apps={developerStatus.developer.apps || []}
                  wallet={wallet}
                />
              </div>
            )}

            {dashboard?.apps && (
              <div className="mt-6">
                <PremiumToolsPanel
                  wallet={wallet || ""}
                  apps={dashboard.apps || []}
                />
              </div>
            )}

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

