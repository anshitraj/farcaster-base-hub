import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import GlowButton from "@/components/GlowButton";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, Edit, Trash2, Plus, Eye } from "lucide-react";
import appsData from "@/data/apps.json";
import { motion } from "framer-motion";

const categories = ["Finance", "Tools", "Social", "Airdrops", "Games", "Memecoins", "Utilities"];

const DeveloperDashboard = () => {
  const { toast } = useToast();
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  
  // Mock developer apps - in real app, filter by logged-in developer
  const myApps = appsData.slice(0, 3);

  const handleDelete = (appId: string) => {
    toast({
      title: "App Deleted",
      description: "Your app has been removed from the store.",
    });
  };

  const handleUpdate = () => {
    toast({
      title: "Success!",
      description: "Your app has been updated.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  <span className="text-gradient-base">Developer Dashboard</span>
                </h1>
                <p className="text-muted-foreground">Manage your mini apps and track performance</p>
              </div>
              <Link to="/submit">
                <GlowButton className="gap-2">
                  <Plus className="w-4 h-4" />
                  New App
                </GlowButton>
              </Link>
            </div>
          </motion.div>

          <Tabs defaultValue="apps" className="space-y-6">
            <TabsList className="glass-card">
              <TabsTrigger value="apps">My Apps</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="apps" className="space-y-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {myApps.map((app, index) => (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card className="glass-card">
                      <CardContent className="p-6">
                        <img
                          src={app.iconUrl}
                          alt={app.name}
                          className="w-16 h-16 rounded-xl bg-background-secondary p-2 mb-4"
                        />
                        <h3 className="font-semibold text-lg mb-2">{app.name}</h3>
                        <Badge variant="secondary" className="mb-3">
                          {app.category}
                        </Badge>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {app.description}
                        </p>
                        
                        <div className="flex items-center gap-4 mb-4 text-sm">
                          <div>
                            <span className="font-bold text-base-blue">{app.stats.rating}</span>
                            <span className="text-muted-foreground ml-1">rating</span>
                          </div>
                          <div>
                            <span className="font-bold text-base-cyan">{app.stats.users}</span>
                            <span className="text-muted-foreground ml-1">users</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-base-blue/50"
                            onClick={() => setSelectedApp(app.id)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Link to={`/apps/${app.id}`} className="flex-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full border-base-cyan/50"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-destructive/50 text-destructive"
                            onClick={() => handleDelete(app.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>

              {selectedApp && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Card className="glass-card glow-base-blue/30">
                    <CardHeader>
                      <CardTitle>Edit App</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-name">App Name</Label>
                          <Input
                            id="edit-name"
                            defaultValue={myApps.find(a => a.id === selectedApp)?.name}
                            className="glass-card focus-visible:ring-base-blue"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="edit-description">Description</Label>
                          <Textarea
                            id="edit-description"
                            defaultValue={myApps.find(a => a.id === selectedApp)?.description}
                            className="glass-card focus-visible:ring-base-blue min-h-[100px]"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="edit-category">Category</Label>
                          <Select defaultValue={myApps.find(a => a.id === selectedApp)?.category}>
                            <SelectTrigger className="glass-card focus:ring-base-blue">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="glass-card border-white/10">
                              {categories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex gap-3">
                          <GlowButton type="submit" className="flex-1">
                            Save Changes
                          </GlowButton>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setSelectedApp(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="analytics">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-base-blue" />
                      Analytics Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center p-6 glass-card rounded-lg">
                        <div className="text-4xl font-bold text-gradient-base mb-2">125K</div>
                        <div className="text-sm text-muted-foreground">Total Users</div>
                      </div>
                      <div className="text-center p-6 glass-card rounded-lg">
                        <div className="text-4xl font-bold text-gradient-base mb-2">4.7</div>
                        <div className="text-sm text-muted-foreground">Average Rating</div>
                      </div>
                      <div className="text-center p-6 glass-card rounded-lg">
                        <div className="text-4xl font-bold text-gradient-base mb-2">3</div>
                        <div className="text-sm text-muted-foreground">Active Apps</div>
                      </div>
                    </div>
                    <div className="mt-6 text-center text-muted-foreground">
                      <p>Detailed analytics coming soon...</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="settings">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Developer Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="dev-name">Developer Name</Label>
                      <Input
                        id="dev-name"
                        defaultValue="Alice Chen"
                        className="glass-card focus-visible:ring-base-blue"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dev-bio">Bio</Label>
                      <Textarea
                        id="dev-bio"
                        defaultValue="Full-stack developer passionate about DeFi and Web3."
                        className="glass-card focus-visible:ring-base-blue min-h-[100px]"
                      />
                    </div>

                    <GlowButton>Save Settings</GlowButton>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default DeveloperDashboard;
