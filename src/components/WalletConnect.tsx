"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function WalletConnect() {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [wallet, setWallet] = useState<string | null>(null);
  const { toast } = useToast();

  const connectWallet = async () => {
    if (connecting) return;

    try {
      setConnecting(true);

      // Check if MetaMask or other wallet is available
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const ethereum = (window as any).ethereum;
        
        // Request account access
        const accounts = await ethereum.request({
          method: "eth_requestAccounts",
        });

        if (accounts && accounts.length > 0) {
          const address = accounts[0];
          setWallet(address);
          setConnected(true);

          // Authenticate with backend
          const message = "Mini App Store login";
          // personal_sign expects: [message, address] but some wallets expect [address, message]
          // Try the standard format first
          let signature;
          try {
            signature = await ethereum.request({
              method: "personal_sign",
              params: [message, address],
            });
          } catch (e) {
            // Fallback for wallets that expect [address, message]
            signature = await ethereum.request({
              method: "personal_sign",
              params: [address, message],
            });
          }

          const res = await fetch("/api/auth/wallet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              wallet: address,
              signature,
              message,
            }),
          });

          if (res.ok) {
            toast({
              title: "Wallet Connected",
              description: `Connected as ${address.slice(0, 6)}...${address.slice(-4)}`,
            });
          } else {
            throw new Error("Authentication failed");
          }
        }
      } else {
        toast({
          title: "No Wallet Found",
          description: "Please install MetaMask or another Web3 wallet",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Wallet connection error:", error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const connectFarcaster = async () => {
    try {
      // Redirect to Farcaster OAuth login
      window.location.href = "/api/auth/farcaster/login";
    } catch (error: any) {
      console.error("Farcaster connection error:", error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect with Farcaster",
        variant: "destructive",
      });
    }
  };

  if (connected && wallet) {
    return (
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="border-base-blue/50 text-base-blue hover:bg-base-blue/10"
          onClick={connectFarcaster}
        >
          Login with Farcaster
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="bg-base-blue/20 hover:bg-base-blue/30 text-base-blue border-base-blue/50"
        >
          {wallet.slice(0, 6)}...{wallet.slice(-4)}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        className="border-base-blue/50 text-base-blue hover:bg-base-blue/10"
        onClick={connectFarcaster}
      >
        Login with Farcaster
      </Button>
      <Button
        size="sm"
        className="bg-base-blue hover:bg-base-blue/90 glow-base-blue"
        onClick={connectWallet}
        disabled={connecting}
      >
        {connecting ? "Connecting..." : "Connect Wallet"}
      </Button>
    </div>
  );
}

