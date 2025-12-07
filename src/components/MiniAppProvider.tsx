"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

interface MiniAppContextType {
  context: any;
  user: {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  } | null;
  isInMiniApp: boolean;
  loaded: boolean;
}

export const MiniAppContext = createContext<MiniAppContextType | null>(null);

export function MiniAppProvider({ children }: { children: ReactNode }) {
  const [contextVal, setContextVal] = useState<any>(null);
  const [user, setUser] = useState<MiniAppContextType["user"]>(null);
  const [isInMiniApp, setIsInMiniApp] = useState<boolean>(false);
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    // Mark as loaded immediately - don't block UI rendering
    setLoaded(true);
    
    // Initialize SDK in background (non-blocking)
    let mounted = true;

    // Fire and forget - don't await, let it run in background
    (async () => {
      try {
        // Check if in Mini App (non-blocking, runs in background)
        const inMini = await sdk.isInMiniApp();
        if (!mounted) return;
        
        setIsInMiniApp(inMini);

        if (inMini) {
          // Call ready ASAP (non-blocking)
          sdk.actions.ready().catch((err: any) => {
            // Suppress harmless SDK errors
            if (process.env.NODE_ENV === 'development') {
              console.debug("SDK ready error (non-critical):", err?.message || err);
            }
          });

          // Load context asynchronously (don't block)
          sdk.context
            .then((ctx) => {
              if (!mounted) return;
              setContextVal(ctx);

              // Extract user data
              if (ctx?.user) {
                const u = ctx.user;
                setUser({
                  fid: u.fid,
                  username: u.username,
                  displayName: u.displayName,
                  pfpUrl: u.pfpUrl,
                });
              }
            })
            .catch((err: any) => {
              // Only log in development - suppress in production
              if (process.env.NODE_ENV === 'development') {
                console.debug("Context load error (non-critical):", err?.message || err);
              }
            });
        }
      } catch (err: any) {
        // Silently handle errors - don't spam console in development
        if (process.env.NODE_ENV === 'development') {
          console.debug("MiniApp Init Error (non-critical):", err?.message || err);
        }
      }
    })();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Don't block UI - render immediately and let components handle loading states

  return (
    <MiniAppContext.Provider
      value={{
        context: contextVal,
        user,
        isInMiniApp,
        loaded,
      }}
    >
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
