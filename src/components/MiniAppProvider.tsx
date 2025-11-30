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
    async function init() {
      try {
        const inMini = await sdk.isInMiniApp();
        setIsInMiniApp(inMini);

        if (inMini) {
          // 1️⃣ CALL READY ASAP
          sdk.actions.ready();

          // 2️⃣ LOAD CONTEXT
          const ctx = await sdk.context;
          setContextVal(ctx);

          // 3️⃣ EXTRACT USER (correct fields!)
          if (ctx?.user) {
            const u = ctx.user;
            setUser({
              fid: u.fid,
              username: u.username,
              displayName: u.displayName,
              pfpUrl: u.pfpUrl,
            });
          }
        }
      } catch (err) {
        console.error("MiniApp Init Error:", err);
      } finally {
        setLoaded(true);
      }
    }

    init();
  }, []);

  // Prevent initial UI before identity loads (very important)
  if (!loaded && isInMiniApp) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white/70">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-3">Loading Mini App...</p>
        </div>
      </div>
    );
  }

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
  return useContext(MiniAppContext);
}
