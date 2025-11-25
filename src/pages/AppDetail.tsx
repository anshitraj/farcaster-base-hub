import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GlowButton from "@/components/GlowButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Users, ExternalLink, User } from "lucide-react";
import appsData from "@/data/apps.json";
import developersData from "@/data/developers.json";

const AppDetail = () => {
  const { id } = useParams();
  const app = appsData.find(a => a.id === id);
  const developer = app ? developersData.find(d => d.id === app.developer) : null;

  if (!app) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 px-4">
          <div className="container mx-auto text-center py-20">
            <h1 className="text-4xl font-bold mb-4">App Not Found</h1>
            <Link to="/apps" className="text-base-blue hover:underline">
              Back to Apps
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const farcasterDeepLink = `farcaster://miniapp?url=${encodeURIComponent(app.url)}`;
  const baseDeepLink = `base://app?url=${encodeURIComponent(app.url)}`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* App Header */}
          <div className="glass-card p-8 mb-8 glow-base-blue/20">
            <div className="flex flex-col md:flex-row gap-8">
              <img
                src={app.iconUrl}
                alt={app.name}
                className="w-32 h-32 rounded-2xl bg-background-secondary p-4"
              />

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold">{app.name}</h1>
                  {app.featured && (
                    <Badge className="bg-base-blue/20 text-base-blue border-none">
                      Featured
                    </Badge>
                  )}
                </div>

                <Badge variant="secondary" className="mb-4">
                  {app.category}
                </Badge>

                <p className="text-muted-foreground mb-6 text-lg">
                  {app.description}
                </p>

                <div className="flex items-center gap-6 mb-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 fill-base-cyan text-base-cyan" />
                    <span className="font-semibold">{app.stats.rating}</span>
                    <span className="text-muted-foreground">({app.stats.reviews} reviews)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <span>{app.stats.users} users</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <GlowButton asChild size="lg" className="gap-2">
                    <a href={farcasterDeepLink}>
                      Open in Farcaster
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </GlowButton>
                  <GlowButton asChild size="lg" glowColor="cyan" className="gap-2 bg-base-cyan hover:bg-base-cyan/90">
                    <a href={baseDeepLink}>
                      Open in Base
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </GlowButton>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Screenshots */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold mb-4">Screenshots</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {app.screenshots.map((screenshot, index) => (
                  <Card key={index} className="glass-card overflow-hidden">
                    <img
                      src={screenshot}
                      alt={`Screenshot ${index + 1}`}
                      className="w-full h-64 object-cover"
                    />
                  </Card>
                ))}
              </div>
            </div>

            {/* Developer Info */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Developer</h2>
              {developer && (
                <Link to={`/developers/${developer.id}`}>
                  <Card className="glass-card hover:bg-white/10 transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <img
                          src={developer.avatar}
                          alt={developer.name}
                          className="w-16 h-16 rounded-full bg-background-secondary p-1 ring-2 ring-base-blue/50"
                        />
                        <div>
                          <h3 className="font-semibold text-lg">{developer.name}</h3>
                          <p className="text-xs text-muted-foreground font-mono">
                            {developer.wallet}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        {developer.bio}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>{developer.apps.length} apps</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AppDetail;
