import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SearchBar from "@/components/SearchBar";
import CategoryChips from "@/components/CategoryChips";
import AppGrid from "@/components/AppGrid";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import appsData from "@/data/apps.json";

const categories = ["Finance", "Tools", "Social", "Airdrops", "Games", "Memecoins", "Utilities"];

const Apps = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("featured");

  let filteredApps = appsData.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Apply sorting
  filteredApps = [...filteredApps].sort((a, b) => {
    switch (sortBy) {
      case "rating":
        return b.stats.rating - a.stats.rating;
      case "popular":
        return parseInt(b.stats.users.replace(/\D/g, '')) - parseInt(a.stats.users.replace(/\D/g, ''));
      case "newest":
        return parseInt(b.id) - parseInt(a.id);
      default:
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">
              <span className="text-gradient-base">Explore Mini Apps</span>
            </h1>
            <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
              Discover {appsData.length} amazing mini apps built on Farcaster and Base
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-8"
          >
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mb-8"
          >
            <CategoryChips
              categories={categories}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mb-8 flex justify-end"
          >
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] glass-card focus:ring-base-blue">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="glass-card border-white/10">
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          {filteredApps.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <AppGrid apps={filteredApps} />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="text-center py-20"
            >
              <p className="text-muted-foreground text-lg">No apps found matching your criteria</p>
            </motion.div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Apps;
