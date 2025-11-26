"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Mic, Gamepad2, Grid3x3, Zap, Users, CheckSquare, MessageSquare, Music, Camera, ShoppingBag, GraduationCap, Swords, Flag, Puzzle, Compass, Trophy, Target } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { trackPageView } from "@/lib/analytics";
import Sidebar from "@/components/Sidebar";
import { useDebounce } from "@/hooks/use-debounce";

// Game categories with icons
const gameCategories = [
  { name: "Action", icon: Zap, color: "from-red-500 to-red-600", href: "/apps?category=Games&tag=action" },
  { name: "Simulation", icon: Users, color: "from-green-500 to-green-600", href: "/apps?category=Games&tag=simulation" },
  { name: "Puzzle", icon: Puzzle, color: "from-blue-500 to-blue-600", href: "/apps?category=Games&tag=puzzle" },
  { name: "Adventure", icon: Compass, color: "from-yellow-500 to-yellow-600", href: "/apps?category=Games&tag=adventure" },
  { name: "Racing", icon: Flag, color: "from-purple-500 to-purple-600", href: "/apps?category=Games&tag=racing" },
  { name: "Role Playing", icon: Swords, color: "from-cyan-500 to-cyan-600", href: "/apps?category=Games&tag=rpg" },
  { name: "Strategy", icon: Target, color: "from-emerald-500 to-emerald-600", href: "/apps?category=Games&tag=strategy" },
  { name: "Sports", icon: Trophy, color: "from-pink-500 to-pink-600", href: "/apps?category=Games&tag=sports" },
];

// App categories with icons
const appCategories = [
  { name: "Entertainment", icon: Grid3x3, color: "from-purple-500 to-purple-600", href: "/apps?category=Social&tag=entertainment" },
  { name: "Social", icon: Users, color: "from-red-500 to-red-600", href: "/apps?category=Social" },
  { name: "Productivity", icon: CheckSquare, color: "from-blue-500 to-blue-600", href: "/apps?category=Tools&tag=productivity" },
  { name: "Communication", icon: MessageSquare, color: "from-green-500 to-green-600", href: "/apps?category=Social&tag=communication" },
  { name: "Music & Audio", icon: Music, color: "from-yellow-500 to-yellow-600", href: "/apps?category=Social&tag=music" },
  { name: "Photography", icon: Camera, color: "from-pink-500 to-pink-600", href: "/apps?category=Tools&tag=photography" },
  { name: "Shopping", icon: ShoppingBag, color: "from-emerald-500 to-emerald-600", href: "/apps?category=Finance&tag=shopping" },
  { name: "Education", icon: GraduationCap, color: "from-indigo-500 to-indigo-600", href: "/apps?category=Tools&tag=education" },
];

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

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
      <Sidebar onCollapseChange={handleSidebarChange} />

      {/* Main Content */}
      <main className={`flex-1 min-h-screen w-full pb-20 lg:pb-0 transition-all duration-300 ${
        sidebarHidden ? "ml-0" : sidebarCollapsed ? "ml-16" : "ml-64"
      }`}>
        <AppHeader />

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
            className="mb-10"
          >
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 px-1">Explore games</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 md:gap-4">
              {gameCategories.map((category, index) => {
                const Icon = category.icon;
                return (
                  <Link
                    key={category.name}
                    href={category.href}
                    className="group"
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                      className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-5 hover:border-gray-700 transition-all duration-300 hover:scale-105 cursor-pointer"
                    >
                      <div className={`w-12 h-12 md:w-14 md:h-14 mx-auto mb-3 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                      </div>
                      <p className="text-white text-sm md:text-base font-medium text-center">{category.name}</p>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </motion.section>

          {/* Explore Apps Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mb-10"
          >
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 px-1">Explore apps</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 md:gap-4">
              {appCategories.map((category, index) => {
                const Icon = category.icon;
                return (
                  <Link
                    key={category.name}
                    href={category.href}
                    className="group"
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.2 + index * 0.05 }}
                      className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-5 hover:border-gray-700 transition-all duration-300 hover:scale-105 cursor-pointer"
                    >
                      <div className={`w-12 h-12 md:w-14 md:h-14 mx-auto mb-3 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                      </div>
                      <p className="text-white text-sm md:text-base font-medium text-center">{category.name}</p>
                    </motion.div>
                  </Link>
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

