"use client";

import { useMiniApp } from "@/components/MiniAppProvider";
import UserProfile from "@/components/UserProfile";

export default function MiniAppUserProfile() {
  const { user, isInMiniApp, loaded } = useMiniApp();

  // Always use UserProfile - it will handle MiniApp context internally
  // This ensures we get the full dropdown menu with all options
  return <UserProfile />;
}

