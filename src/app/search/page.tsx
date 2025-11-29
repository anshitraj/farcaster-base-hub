"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Mic, Gamepad2, Grid3x3, Zap, Users, CheckSquare, MessageSquare, Music, GraduationCap, Puzzle, Gift, TrendingUp, Coins, Newspaper } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { trackPageView } from "@/lib/analytics";
import Sidebar from "@/components/Sidebar";
import { useDebounce } from "@/hooks/use-debounce";
import CategoryCard from "@/components/CategoryCard";

// Game categories with icons
const gameCategories = [
  { name: "Action", icon: Zap, color: "from-red-500 to-red-600", href: "/apps?category=Games&tag=action" },
  { name: "Puzzle", icon: Puzzle, color: "from-blue-500 to-blue-600", href: "/apps?category=Games&tag=puzzle" },
];

// App categories with icons
const appCategories = [
  { name: "News", icon: Newspaper, color: "from-purple-500 to-purple-600", href: "/apps?category=Social&tag=news" },
  { name: "Social", icon: Users, color: "from-red-500 to-red-600", href: "/apps?category=Social" },
  { name: "Productivity", icon: CheckSquare, color: "from-blue-500 to-blue-600", href: "/apps?category=Tools&tag=productivity" },
  { name: "Communication", icon: MessageSquare, color: "from-green-500 to-green-600", href: "/apps?category=Social&tag=communication" },
  { name: "Music & Audio", icon: Music, color: "from-yellow-500 to-yellow-600", href: "/apps?category=Social&tag=music" },
  { name: "Education", icon: GraduationCap, color: "from-indigo-500 to-indigo-600", href: "/apps?category=Tools&tag=education" },
  { name: "Airdrop", icon: Gift, color: "from-cyan-500 to-cyan-600", href: "/apps?category=Airdrops" },
  { name: "Prediction", icon: TrendingUp, color: "from-orange-500 to-orange-600", href: "/apps?category=Finance&tag=prediction" },
  { name: "Crowdfunding", icon: Coins, color: "from-amber-500 to-amber-600", href: "/apps?category=Finance&tag=crowdfunding" },
];

export const dynamic = 'force-dynamic';

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  // On desktop, sidebar should always be visible (isOpen = true)
  // On mobile, it starts closed
  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true); // Always open on desktop
      } else {
        setSidebarOpen(false); // Closed by default on mobile
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Check if speech recognition is supported
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsSpeechSupported(true);
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = false;
        recognitionInstance.lang = "en-US";

        recognitionInstance.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setSearchQuery(transcript);
          setIsListening(false);
          // Auto-search after voice input
          if (transcript.trim()) {
            router.push(`/apps?search=${encodeURIComponent(transcript.trim())}`);
          }
        };

        recognitionInstance.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
        };

        recognitionInstance.onend = () => {
          setIsListening(false);
        };

        setRecognition(recognitionInstance);
      }
    }
  }, [router]);

  useEffect(() => {
    trackPageView("/search");
    // Initialize from URL if coming from another page with search query
    const urlSearch = searchParams.get("search") || "";
    if (urlSearch) {
      setSearchQuery(urlSearch);
    }
  }, [searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/apps?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (searchQuery.trim()) {
        router.push(`/apps?search=${encodeURIComponent(searchQuery.trim())}`);
      }
    }
  };

  const handleVoiceSearch = () => {
    if (!isSpeechSupported || !recognition) {
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      try {
        recognition.start();
        setIsListening(true);
      } catch (error) {
        console.error("Error starting speech recognition:", error);
        setIsListening(false);
      }
    }
  };

  const handleSidebarChange = (collapsed: boolean, hidden: boolean) => {
    setSidebarCollapsed(collapsed);
    setSidebarHidden(hidden);
  };

  return (
    <div className="flex min-h-screen bg-black">
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

        {/* Search Section */}
        <div className="px-4 md:px-6 lg:px-8 py-6">
          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="relative flex items-center">
                <Search className="absolute left-4 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Search apps & games..."
                  className="w-full pl-12 pr-12 py-4 bg-gray-900 border border-gray-800 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base md:text-lg"
                  autoFocus
                />
                {isSpeechSupported ? (
                  <button
                    type="button"
                    onClick={handleVoiceSearch}
                    className={`absolute right-4 p-2 rounded-full transition-all ${
                      isListening
                        ? "bg-red-500 hover:bg-red-600 animate-pulse"
                        : "hover:bg-gray-800"
                    }`}
                    aria-label="Voice search"
                  >
                    <Mic className={`w-5 h-5 ${isListening ? "text-white" : "text-gray-400"}`} />
                  </button>
                ) : null}
              </div>
            </form>
          </motion.div>

          {/* Explore Games Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-16 mt-10"
          >
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-1 bg-gradient-to-b from-[#0052FF] to-[#7C3AED] rounded-full"></div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">Explore games</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 md:gap-6">
              {gameCategories.map((category) => {
                const patternMap: Record<string, "action" | "puzzle" | "entertainment" | "social" | "productivity" | "communication" | "music" | "education"> = {
                  "Action": "action",
                  "Puzzle": "puzzle",
                };
                
                return (
                  <CategoryCard
                    key={category.name}
                    name={category.name}
                    icon={category.icon}
                    color={category.color}
                    href={category.href}
                    backgroundPattern={patternMap[category.name]}
                  />
                );
              })}
            </div>
          </motion.section>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#1a1f2e] to-transparent my-12"></div>

          {/* Explore Apps Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mb-16 mt-10"
          >
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-1 bg-gradient-to-b from-[#0052FF] to-[#7C3AED] rounded-full"></div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">Explore apps</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 md:gap-6">
              {appCategories.map((category) => {
                const patternMap: Record<string, "action" | "puzzle" | "entertainment" | "social" | "productivity" | "communication" | "music" | "education"> = {
                  "News": "entertainment",
                  "Social": "social",
                  "Productivity": "productivity",
                  "Communication": "communication",
                  "Music & Audio": "music",
                  "Education": "education",
                  "Airdrop": "action",
                  "Prediction": "entertainment",
                  "Crowdfunding": "social",
                };
                
                return (
                  <CategoryCard
                    key={category.name}
                    name={category.name}
                    icon={category.icon}
                    color={category.color}
                    href={category.href}
                    backgroundPattern={patternMap[category.name]}
                  />
                );
              })}
            </div>
          </motion.section>

          {/* Discover Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mb-10"
          >
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 px-1">Discover</h2>
            <div className="text-gray-400 text-sm md:text-base px-1">
              {/* Can add trending apps or featured content here later */}
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-black">
        <div className="flex-1 min-h-screen w-full pb-20 lg:pb-0">
          <AppHeader />
          <div className="px-4 md:px-6 lg:px-8 py-6">
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-900 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}

