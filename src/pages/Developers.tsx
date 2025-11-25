import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DeveloperCard from "@/components/DeveloperCard";
import { Award } from "lucide-react";
import developersData from "@/data/developers.json";

const Developers = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          <div className="flex items-center gap-3 mb-4 justify-center">
            <Award className="w-8 h-8 text-base-blue" />
            <h1 className="text-4xl md:text-5xl font-bold text-center">
              <span className="text-gradient-base">Top Developers</span>
            </h1>
          </div>
          
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Meet the talented developers building the future of mini apps on Farcaster and Base
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {developersData.map((dev) => (
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
      </div>

      <Footer />
    </div>
  );
};

export default Developers;
