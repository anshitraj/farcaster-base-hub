import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SearchBar from "@/components/SearchBar";
import CategoryChips from "@/components/CategoryChips";
import AppGrid from "@/components/AppGrid";
import appsData from "@/data/apps.json";

const categories = ["Finance", "Tools", "Social", "Airdrops", "Games", "Memecoins", "Utilities"];

const Apps = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredApps = appsData.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">
            <span className="text-gradient-base">Explore Mini Apps</span>
          </h1>
          <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
            Discover {appsData.length} amazing mini apps built on Farcaster and Base
          </p>

          <div className="mb-8">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>

          <div className="mb-12">
            <CategoryChips
              categories={categories}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </div>

          {filteredApps.length > 0 ? (
            <AppGrid apps={filteredApps} />
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No apps found matching your criteria</p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Apps;
