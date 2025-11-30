"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface MiniAppContextType {
  context: any;
  user: {
    fid?: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
    address?: string;
  } | null;
  isInMiniApp: boolean;
  loaded: boolean;
}

export const MiniAppContext = createContext<MiniAppContextType | null>(null);

export function MiniAppProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<any>(null);
  const [user, setUser] = useState<MiniAppContextType["user"]>(null);
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const inMini = await sdk.isInMiniApp();
        setIsInMiniApp(inMini);

        if (inMini) {
          // Get Base App context (contains user identity)
          const ctx = await sdk.context;
          setContext(ctx);

          // Extract user info from context
          if (ctx?.user) {
            const userCtx = ctx.user as any; // Type assertion for flexible property access
            setUser({
              fid: userCtx.fid,
              username: userCtx.username,
              displayName: userCtx.displayName || userCtx.display_name,
              pfpUrl: userCtx.pfpUrl || userCtx.pfp_url,
              address: userCtx.address || userCtx.custodyAddress,
            });
          }

          // IMPORTANT: tell Base App your app is ready
          await sdk.actions.ready();
          console.log("Mini App ready, context loaded:", ctx);
        } else {
          console.log("Not in Mini App context");
        }
      } catch (err) {
        console.error("MiniApp load error", err);
      } finally {
        setLoaded(true);
      }
    }

    init();
  }, []);

  // Block UI until Base identity is ready (if in Mini App)
  // In regular browser, show immediately
  if (!loaded && isInMiniApp) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-base-blue mx-auto mb-4"></div>
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <MiniAppContext.Provider value={{ context, user, isInMiniApp, loaded }}>
      {children}
    </MiniAppContext.Provider>
  );
}

export function useMiniApp() {
  const context = useContext(MiniAppContext);
  if (!context) {
    return { context: null, user: null, isInMiniApp: false, loaded: false };
  }
  return context;
}

