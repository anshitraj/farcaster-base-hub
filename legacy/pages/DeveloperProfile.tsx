import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BadgeCard from "@/components/BadgeCard";
import AppGrid from "@/components/AppGrid";
import { Card, CardContent } from "@/components/ui/card";
import developersData from "@/data/developers.json";
import appsData from "@/data/apps.json";
import badgesData from "@/data/badges.json";

const DeveloperProfile = () => {
  const { id } = useParams();
  const developer = developersData.find(d => d.id === id);
  const developerApps = developer ? appsData.filter(app => developer.apps.includes(app.id)) : [];
  const developerBadges = developer ? badgesData.filter(badge => developer.badges.includes(badge.name)) : [];

  if (!developer) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 px-4">
          <div className="container mx-auto text-center py-20">
            <h1 className="text-4xl font-bold mb-4">Developer Not Found</h1>
            <Link to="/developers" className="text-base-blue hover:underline">
              Back to Developers
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Profile Header */}
          <Card className="glass-card p-8 mb-12 glow-base-blue/20">
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                <img
                  src={developer.avatar}
                  alt={developer.name}
                  className="w-32 h-32 rounded-full bg-background-secondary p-2 ring-4 ring-base-blue/50"
                />

                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-4xl font-bold mb-2">{developer.name}</h1>
                  <p className="text-muted-foreground font-mono mb-4">
                    {developer.wallet}
                  </p>
                  <p className="text-lg text-muted-foreground mb-6 max-w-2xl">
                    {developer.bio}
                  </p>
                  <div className="flex items-center gap-4 justify-center md:justify-start text-sm">
                    <div>
                      <span className="font-bold text-base-blue text-xl">{developer.apps.length}</span>
                      <span className="text-muted-foreground ml-2">Apps</span>
                    </div>
                    <div>
                      <span className="font-bold text-base-cyan text-xl">{developer.badges.length}</span>
                      <span className="text-muted-foreground ml-2">Badges</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Badges */}
          {developerBadges.length > 0 && (
            <section className="mb-12">
              <h2 className="text-3xl font-bold mb-6">Badges</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {developerBadges.map((badge) => (
                  <BadgeCard
                    key={badge.id}
                    name={badge.name}
                    description={badge.description}
                    icon={badge.icon}
                    rarity={badge.rarity}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Developer's Apps */}
          {developerApps.length > 0 && (
            <section>
              <h2 className="text-3xl font-bold mb-6">Apps by {developer.name}</h2>
              <AppGrid apps={developerApps} />
            </section>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default DeveloperProfile;
