import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import GlowButton from "./GlowButton";

const categories = ["Finance", "Tools", "Social", "Airdrops", "Games", "Memecoins", "Utilities"];

const SubmitForm = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    url: "",
    iconUrl: "",
    category: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.description || !formData.url || !formData.category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success!",
      description: "Your mini app has been submitted for review.",
    });

    // Reset form
    setFormData({
      name: "",
      description: "",
      url: "",
      iconUrl: "",
      category: "",
    });
  };

  return (
    <Card className="glass-card max-w-2xl mx-auto glow-base-blue/30">
      <CardHeader>
        <CardTitle className="text-2xl text-gradient-base">Submit Your Mini App</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">App Name *</Label>
            <Input
              id="name"
              placeholder="My Awesome App"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="glass-card focus-visible:ring-base-blue"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe what your app does..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="glass-card focus-visible:ring-base-blue min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">App URL *</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://myapp.example.com"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="glass-card focus-visible:ring-base-blue"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="iconUrl">Icon URL</Label>
            <Input
              id="iconUrl"
              type="url"
              placeholder="https://myapp.example.com/icon.png"
              value={formData.iconUrl}
              onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
              className="glass-card focus-visible:ring-base-blue"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger className="glass-card focus:ring-base-blue">
                <SelectValue placeholder="Select a category" />
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

          <GlowButton type="submit" className="w-full" size="lg">
            Submit Mini App
          </GlowButton>
        </form>
      </CardContent>
    </Card>
  );
};

export default SubmitForm;
