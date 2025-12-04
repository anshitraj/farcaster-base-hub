"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Home, Search, Trophy, LayoutDashboard, User } from "lucide-react";
import { useMiniApp } from "@/components/MiniAppProvider";
import { useState, useEffect } from "react";
import ProfileModal from "@/components/ProfileModal";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "/quests", icon: Trophy, label: "Quests" },
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/profile", icon: User, label: "Profile", isProfile: true },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useMiniApp();
  const [profileData, setProfileData] = useState<{ avatar: string | null; name: string | null } | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Fetch profile data for bottom nav - prioritize MiniApp user (Base/Farcaster)
  useEffect(() => {
    async function fetchProfile() {
      try {
        // Priority 1: Use MiniApp user if available (Base/Farcaster auto-detection)
        if (user?.pfpUrl) {
          setProfileData({
            avatar: user.pfpUrl,
            name: user.displayName || user.username || null,
          });
          return;
        }

        // Priority 2: Check if Base wallet is connected via window.ethereum
        if (typeof window !== "undefined" && (window as any).ethereum) {
          const ethereum = (window as any).ethereum;
          if (ethereum.isBase || ethereum.isCoinbaseWallet || ethereum.isCoinbaseBrowser) {
            // Base wallet detected - try to get address and fetch profile
            try {
              const accounts = await ethereum.request({ method: "eth_accounts" });
              if (accounts && accounts.length > 0) {
                const address = accounts[0].toLowerCase();
                const userRes = await fetch(`/api/auth/user?wallet=${encodeURIComponent(address)}`, {
                  credentials: "include",
                  cache: "no-store",
                });
                if (userRes.ok) {
                  const userData = await userRes.json();
                  if (userData.user?.avatar) {
                    setProfileData({
                      avatar: userData.user.avatar,
                      name: userData.user.name || null,
                    });
                    return;
                  }
                }
              }
            } catch (e) {
              // Continue to API check
            }
          }
        }

        // Priority 3: Fetch from API session
        const res = await fetch("/api/auth/wallet", {
          credentials: "include",
          cache: "no-store",
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.wallet) {
            const userRes = await fetch(`/api/auth/user?wallet=${encodeURIComponent(data.wallet)}`, {
              credentials: "include",
              cache: "no-store",
            });
            if (userRes.ok) {
              const userData = await userRes.json();
              if (userData.user) {
                setProfileData({
                  avatar: userData.user.avatar || null,
                  name: userData.user.name || null,
                });
              }
            }
          }
        }
      } catch (error) {
        // Silently fail - will show default icon
        console.error("Error fetching profile for bottom nav:", error);
      }
    }

    fetchProfile();
    
    // Only poll if we don't have profile data yet (initial load)
    // Once we have profile data, stop polling to prevent excessive API calls
    if (!profileData) {
      const interval = setInterval(() => {
        fetchProfile();
      }, 10000); // Poll every 10 seconds only if no profile data
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-[#0B0F19]/95 backdrop-blur-xl border-t border-[#1F2733]" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}>
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || 
            (item.href !== "/" && pathname?.startsWith(item.href));
          
            // Special handling for Profile item - show profile image and open modal
            if (item.isProfile) {
              return (
                <button
                  key={item.href}
                  onClick={() => setProfileModalOpen(true)}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? "text-base-blue"
                      : "text-[#A0A4AA] hover:text-white"
                  }`}
                >
                  {/* Always render both, but show/hide to avoid hydration mismatch */}
                  <div className="relative">
                    {profileData?.avatar ? (
                      <div className={`${isActive ? "ring-2 ring-base-blue rounded-full" : ""}`}>
                        <Image
                          src={profileData.avatar}
                          alt={profileData.name || "Profile"}
                          width={24}
                          height={24}
                          className="rounded-full border border-gray-700"
                        />
                      </div>
                    ) : (
                      <Icon className={`w-5 h-5 ${isActive ? "text-base-blue" : ""}`} />
                    )}
                  </div>
                  <span className={`text-[10px] font-medium ${isActive ? "text-base-blue" : ""}`}>
                    {item.label}
                  </span>
                </button>
              );
            }
            
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? "text-base-blue"
                  : "text-[#A0A4AA] hover:text-white"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-base-blue" : ""}`} />
              <span className={`text-[10px] font-medium ${isActive ? "text-base-blue" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
      {/* Profile Modal - Render outside map to avoid re-renders */}
      <ProfileModal 
        isOpen={profileModalOpen} 
        onClose={() => setProfileModalOpen(false)} 
      />
    </>
  );
}

