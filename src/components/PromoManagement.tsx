"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, X, Save, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Promo {
  id: string;
  title: string;
  imageUrl: string;
  redirectUrl: string;
  appId?: string | null;
  status: "active" | "inactive" | "expired";
  startDate: string;
  endDate?: string | null;
  clicks: number;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export default function PromoManagement() {
  const router = useRouter();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [durationError, setDurationError] = useState<string>("");
  const { toast } = useToast();

  // Constants
  const MIN_DURATION_MS = 30 * 60 * 1000; // 30 minutes
  const MAX_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

  const [formData, setFormData] = useState({
    title: "",
    imageUrl: "",
    redirectUrl: "",
    appId: "",
    status: "active" as "active" | "inactive" | "expired",
    startDate: "",
    endDate: "",
    priority: 0,
  });

  useEffect(() => {
    fetchPromos();
  }, []);

  const fetchPromos = async () => {
    try {
      const res = await fetch("/api/promos?all=true");
      if (res.ok) {
        const data = await res.json();
        setPromos(data.promos || []);
      } else if (res.status === 403) {
        // User doesn't have access
        setPromos([]);
      }
    } catch (error) {
      console.error("Error fetching promos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingPromo(null);
    setFormData({
      title: "",
      imageUrl: "",
      redirectUrl: "",
      appId: "",
      status: "active",
      startDate: "",
      endDate: "",
      priority: 0,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (promo: Promo) => {
    setEditingPromo(promo);
    setFormData({
      title: promo.title,
      imageUrl: promo.imageUrl,
      redirectUrl: promo.redirectUrl,
      appId: promo.appId || "",
      status: promo.status,
      startDate: promo.startDate ? new Date(promo.startDate).toISOString().slice(0, 16) : "",
      endDate: promo.endDate ? new Date(promo.endDate).toISOString().slice(0, 16) : "",
      priority: promo.priority,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this promo?")) {
      return;
    }

    try {
      const res = await fetch(`/api/promos/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Promo deleted successfully",
        });
        fetchPromos();
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete promo");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete promo",
        variant: "destructive",
      });
    }
  };

  // Validate duration on date changes
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const duration = end.getTime() - start.getTime();

      if (duration < MIN_DURATION_MS) {
        const minutes = Math.round(duration / 60000);
        setDurationError(`Duration must be at least 30 minutes. Current: ${minutes} minutes`);
      } else if (duration > MAX_DURATION_MS) {
        setDurationError("Duration exceeds 2 hours. Premium subscription required for longer durations.");
      } else {
        setDurationError("");
      }
    } else {
      setDurationError("");
    }
  }, [formData.startDate, formData.endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setDurationError("");

    // Validate dates are provided
    if (!formData.startDate || !formData.endDate) {
      toast({
        title: "Validation Error",
        description: "Start date and end date are required",
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    const duration = endDate.getTime() - startDate.getTime();

    // Validate duration
    if (duration < MIN_DURATION_MS) {
      const minutes = Math.round(duration / 60000);
      toast({
        title: "Validation Error",
        description: `Promo duration must be at least 30 minutes. Current duration: ${minutes} minutes`,
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    if (duration > MAX_DURATION_MS) {
      toast({
        title: "Premium Required",
        description: "Promo duration exceeds 2 hours. Redirecting to premium...",
        variant: "destructive",
      });
      setTimeout(() => {
        router.push("/premium");
      }, 1500);
      setSaving(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        appId: formData.appId || null,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        priority: parseInt(formData.priority.toString()) || 0,
      };

      const url = editingPromo ? `/api/promos/${editingPromo.id}` : "/api/promos";
      const method = editingPromo ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: editingPromo ? "Promo updated successfully" : "Promo created successfully",
        });
        setIsDialogOpen(false);
        fetchPromos();
      } else {
        const data = await res.json();
        
        // Handle premium redirect
        if (data.premiumRequired && data.redirectTo) {
          toast({
            title: "Premium Required",
            description: data.error || "Redirecting to premium...",
            variant: "destructive",
          });
          setTimeout(() => {
            router.push(data.redirectTo);
          }, 1500);
        } else {
          throw new Error(data.error || "Failed to save promo");
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save promo",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="card-surface">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-surface">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Promo Management</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreate} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create Promo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPromo ? "Edit Promo" : "Create New Promo"}
                </DialogTitle>
                <DialogDescription>
                  {editingPromo
                    ? "Update the promo details below."
                    : "Create a new promotional banner that will be displayed on the homepage."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Promo title"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="redirectUrl">Redirect URL</Label>
                  <Input
                    id="redirectUrl"
                    type="url"
                    value={formData.redirectUrl}
                    onChange={(e) => setFormData({ ...formData, redirectUrl: e.target.value })}
                    placeholder="https://example.com/app"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    URL to redirect when promo is clicked (can be app URL or external)
                  </p>
                </div>
                <div>
                  <Label htmlFor="appId">App ID (Optional)</Label>
                  <Input
                    id="appId"
                    value={formData.appId}
                    onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                    placeholder="UUID of the app (optional)"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: "active" | "inactive" | "expired") =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })
                      }
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Higher priority = shown first
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
                {durationError && (
                  <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    {durationError}
                    {durationError.includes("exceeds 2 hours") && (
                      <div className="mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => router.push("/premium")}
                          className="text-xs"
                        >
                          Go to Premium
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                <div className="text-xs text-muted-foreground bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="font-medium mb-1">Promo Duration Limits:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Minimum duration: 30 minutes</li>
                    <li>Maximum duration: 2 hours (free tier)</li>
                    <li>Weekly limit: 2 hours per week (resets every Monday)</li>
                    <li>Premium subscription required for longer durations</li>
                  </ul>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {editingPromo ? "Update" : "Create"}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {promos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No promos yet. Create your first promo to get started!
          </div>
        ) : (
          <div className="space-y-4">
            {promos.map((promo) => (
              <div
                key={promo.id}
                className="p-4 rounded-lg bg-[#141A24] border border-[#1F2733]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{promo.title}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          promo.status === "active"
                            ? "bg-green-500/20 text-green-400"
                            : promo.status === "inactive"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {promo.status}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        <span className="font-medium">Redirect:</span> {promo.redirectUrl}
                      </p>
                      <p>
                        <span className="font-medium">Clicks:</span> {promo.clicks} |{" "}
                        <span className="font-medium">Priority:</span> {promo.priority}
                      </p>
                      {promo.startDate && (
                        <p>
                          <span className="font-medium">Start:</span>{" "}
                          {new Date(promo.startDate).toLocaleString()}
                        </p>
                      )}
                      {promo.endDate && (
                        <p>
                          <span className="font-medium">End:</span>{" "}
                          {new Date(promo.endDate).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(promo)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(promo.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

