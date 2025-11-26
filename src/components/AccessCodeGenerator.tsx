"use client";

import { useState } from "react";
import { Copy, Check, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface AccessCodeGeneratorProps {
  appId: string;
}

export default function AccessCodeGenerator({ appId }: AccessCodeGeneratorProps) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateCode = async () => {
    if (!appId) {
      toast({
        title: "Error",
        description: "App ID is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/premium/code/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          appId,
          expiresInDays: 30, // 30 days expiration
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setCode(data.code);
        toast({
          title: "Access Code Created",
          description: "Code generated successfully",
        });
      } else {
        throw new Error(data.error || "Failed to create code");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create access code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Access code copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5 text-purple-400" />
          Access Code Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Generate access codes for your app. These codes can be used for premium analytics, private beta access, and developer-to-tester flows.
        </p>
        
        {code ? (
          <div className="space-y-3">
            <div className="bg-background-secondary p-4 rounded-lg border border-purple-500/20">
              <div className="flex items-center justify-between">
                <code className="text-sm font-mono text-purple-300">{code}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyToClipboard}
                  className="text-purple-400 hover:text-purple-300"
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setCode(null)}
              className="w-full"
            >
              Generate New Code
            </Button>
          </div>
        ) : (
          <Button
            onClick={generateCode}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-base-blue hover:from-purple-700 hover:to-base-blue/90"
          >
            {loading ? "Generating..." : "Generate Access Code"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

