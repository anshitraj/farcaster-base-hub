import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SearchBar from "@/components/SearchBar";
import CategoryChips from "@/components/CategoryChips";
import AppGrid from "@/components/AppGrid";
import DeveloperCard from "@/components/DeveloperCard";
import GlowButton from "@/components/GlowButton";
import { ArrowRight, Sparkles, TrendingUp, Award } from "lucide-react";
import appsData from "@/data/apps.json";
import developersData from "@/data/developers.json";
import heroBackground from "@/assets/hero-bg.jpg";

const categories = ["Finance", "Tools", "Social", "Airdrops", "Games", "Memecoins", "Utilities"];

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const featuredApps = appsData.filter(app => app.featured).slice(0, 3);
  const newApps = appsData.slice(0, 4);
  const topDevelopers = developersData.slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section 
        className="relative pt-32 pb-20 px-4 overflow-hidden"
        style={{
          backgroundImage: `url(${heroBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/50 to-background" />
        <div className="relative container mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
            <Sparkles className="w-4 h-4 text-base-cyan" />
            <span className="text-sm">Powered by Base & Farcaster</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Discover Mini Apps Across
            <br />
            <span className="text-gradient-base">Farcaster & Base</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Explore, submit, and earn developer badges in the ultimate hub for decentralized mini applications.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link to="/apps">
              <GlowButton size="lg" className="gap-2">
                Explore Apps
                <ArrowRight className="w-5 h-5" />
              </GlowButton>
            </Link>
            <Link to="/submit">
              <GlowButton size="lg" glowColor="cyan" className="gap-2 bg-base-cyan hover:bg-base-cyan/90">
                Submit Mini App
                <Sparkles className="w-5 h-5" />
              </GlowButton>
            </Link>
          </div>

          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          <CategoryChips
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </div>
      </section>

      {/* Trending Apps */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <TrendingUp className="w-6 h-6 text-base-blue" />
            <h2 className="text-3xl font-bold">Trending Apps</h2>
          </div>
          <AppGrid apps={featuredApps} />
        </div>
      </section>

      {/* New Apps */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Sparkles className="w-6 h-6 text-base-cyan" />
            <h2 className="text-3xl font-bold">New Apps</h2>
          </div>
          <AppGrid apps={newApps} />
        </div>
      </section>

      {/* Top Developers */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Award className="w-6 h-6 text-base-blue" />
            <h2 className="text-3xl font-bold">Top Developers</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {topDevelopers.map((dev) => (
              <DeveloperCard
                key={dev.id}
                id={dev.id}
                name={dev.name}
                avatar={dev.avatar}
                wallet={dev.wallet}
                badges={dev.badges}
                appCount={dev.apps.length}
              />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
