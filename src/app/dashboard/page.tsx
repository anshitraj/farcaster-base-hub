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
import { TrendingUp, Users, Star, Award, ExternalLink, Shield, CheckCircle2, XCircle, Settings, Save } from "lucide-react";
import { trackPageView } from "@/lib/analytics";
import { motion } from "framer-motion";
import VerifiedBadge from "@/components/VerifiedBadge";
import PremiumToolsPanel from "@/components/PremiumToolsPanel";
import WalletBalance from "@/components/WalletBalance";
import AppHeader from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getInjectedProvider } from "@/lib/wallet";

export default function DashboardPage() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [developerStatus, setDeveloperStatus] = useState<any>(null);
  const [xpData, setXpData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [profileName, setProfileName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [displayAvatar, setDisplayAvatar] = useState<string | null>(null);
  const { toast } = useToast();

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
            
            // Fetch dashboard data
            try {
              const [dashRes, devRes, xpRes, profileRes] = await Promise.all([
                fetch(`/api/developers/${data.wallet}/dashboard`, {
                  credentials: "include",
                }),
                fetch(`/api/developers/${data.wallet}`, {
                  credentials: "include",
                }),
                fetch(`/api/xp/claim`, {
                  credentials: "include",
                }),
                fetch(`/api/developer/profile`, {
                  credentials: "include",
                }),
              ]);
              if (dashRes.ok) {
                const dashData = await dashRes.json();
                if (mounted) {
                  setDashboard(dashData);
                }
              }
              if (devRes.ok) {
                const devData = await devRes.json();
                if (mounted) {
                  setDeveloperStatus(devData);
                }
              }
              if (xpRes.ok) {
                const xpData = await xpRes.json();
                if (mounted) {
                  setXpData(xpData);
                }
              }
              let profileData: any = null;
              if (profileRes.ok) {
                profileData = await profileRes.json();
                if (mounted && profileData.developer) {
                  setProfile(profileData.developer);
                  setProfileName(profileData.developer.name || "");
                  setProfileBio(profileData.developer.bio || "");
                }
              }

              // Fetch Base wallet name and avatar if it's a Base wallet
              try {
                const isBaseWallet = await checkIfBaseWallet(data.wallet);
                if (isBaseWallet) {
                  const baseName = await resolveBaseName(data.wallet);
                  const baseAvatar = await fetchBaseAvatar(data.wallet, baseName);
                  
                  if (mounted) {
                    // Priority: developer profile name > Base name
                    if (profileData?.developer?.name) {
                      setDisplayName(profileData.developer.name);
                    } else if (baseName) {
                      setDisplayName(baseName);
                    }
                    
                    // Priority: developer avatar > Base avatar
                    if (profileData?.developer?.avatar) {
                      setDisplayAvatar(profileData.developer.avatar);
                    } else if (baseAvatar) {
                      setDisplayAvatar(baseAvatar);
                    }
                  }
                } else if (mounted) {
                  // Not a Base wallet, use developer profile data
                  if (profileData?.developer?.name) {
                    setDisplayName(profileData.developer.name);
                  }
                  if (profileData?.developer?.avatar) {
                    setDisplayAvatar(profileData.developer.avatar);
                  }
                }
              } catch (e) {
                console.error("Error fetching Base wallet info:", e);
                // Fallback to developer profile data
                if (mounted && profileData?.developer) {
                  if (profileData.developer.name) {
                    setDisplayName(profileData.developer.name);
                  }
                  if (profileData.developer.avatar) {
                    setDisplayAvatar(profileData.developer.avatar);
                  }
                }
              }
            } catch (dashError) {
              console.error("Error fetching dashboard:", dashError);
              // Set empty dashboard if fetch fails
              if (mounted) {
                setDashboard({ totalApps: 0, totalClicks: 0, totalInstalls: 0, averageRating: 0, apps: [] });
              }
            }
          } else if (mounted) {
            setWallet(null);
          }
        } else if (res.status === 401) {
          if (mounted) {
            setWallet(null);
          }
        }
      } catch (error) {
        if (mounted) {
          console.error("Error checking auth:", error);
          setWallet(null);
        }
      } finally {
        if (mounted) {
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
    };
  }, []); // Empty deps - only run once on mount

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
    try {
      try {
        const baseResponse = await fetch(
          `https://api.base.org/ens/reverse/${wallet}`,
          { method: "GET" }
        );
        if (baseResponse.ok) {
          const baseData = await baseResponse.json();
          if (baseData.name && baseData.name.endsWith(".base.eth")) {
            return baseData.name;
          }
        }
      } catch (e) {
        // Continue to fallback
      }
      
      try {
        const response = await fetch(
          `https://api.ensideas.com/ens/resolve/${wallet}?chainId=8453`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.name && (data.name.endsWith(".base.eth") || data.name.endsWith(".eth"))) {
            return data.name;
          }
        }
      } catch (e) {
        // Continue
      }
    } catch (error) {
      console.error("ENS resolution error:", error);
    }
    return null;
  }

  async function fetchBaseAvatar(wallet: string, name: string | null): Promise<string | null> {
    try {
      if (name) {
        try {
          const baseAvatarResponse = await fetch(
            `https://api.base.org/ens/avatar/${name}`,
            { method: "GET" }
          );
          if (baseAvatarResponse.ok) {
            const baseAvatarData = await baseAvatarResponse.json();
            if (baseAvatarData.avatar) {
              return baseAvatarData.avatar;
            }
          }
        } catch (e) {
          // Continue
        }
      }
      
      return null;
    } catch (error) {
      console.error("Avatar fetch error:", error);
      return null;
    }
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
    <div className="min-h-screen bg-[#0B0F19] pb-24">
      <AppHeader />
      <div className="pt-8 pb-8">
        <div className="max-w-screen-md mx-auto px-4 md:px-6">
          {/* User Header */}
          {wallet && (
            <DashboardHeader
              name={displayName || developerStatus?.developer?.name || null}
              avatar={displayAvatar || developerStatus?.developer?.avatar || null}
              wallet={wallet}
              developerLevel={xpData?.developerLevel || dashboard?.developerLevel || 1}
              totalXP={xpData?.totalXP || dashboard?.totalXP || 0}
            />
          )}

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
                          Verify your wallet and domain to submit apps
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

          {/* Apps List */}
          {dashboard?.apps && dashboard.apps.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              id="apps-section"
            >
              <Card className="card-surface">
                <CardHeader>
                  <CardTitle className="text-lg">Your Apps</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dashboard.apps && dashboard.apps.length > 0 ? (
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
                                <h3 className="font-semibold mb-1 truncate">{app.name}</h3>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span>{app.clicks || 0} clicks</span>
                                  <span>{app.installs || 0} installs</span>
                                  <span>
                                    {(app.ratingAverage || 0).toFixed(1)} ⭐ (
                                    {app.ratingCount || 0})
                                  </span>
                                </div>
                              </Link>
                              <div className="flex items-center gap-2 ml-4">
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
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No apps yet. Submit your first app to get started!
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

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

                <div className="space-y-2">
                  <Label htmlFor="developer-bio">Bio (Optional)</Label>
                  <Textarea
                    id="developer-bio"
                    placeholder="Tell us about yourself..."
                    value={profileBio}
                    onChange={(e) => setProfileBio(e.target.value)}
                    className="glass-card focus-visible:ring-base-blue min-h-[100px]"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {profileBio.length}/500 characters
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
                          bio: profileBio.trim() || null,
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
                Submit New App
              </GlowButton>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
