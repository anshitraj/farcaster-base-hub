"use client";

import { useMiniApp } from "@/components/MiniAppProvider";
import Image from "next/image";
import UserProfile from "@/components/UserProfile";

export default function MiniAppUserProfile() {
  const { user, isInMiniApp, loaded } = useMiniApp();

  // If not in Mini App or Mini App not loaded yet, use regular UserProfile
  if (!isInMiniApp || !loaded) {
    return <UserProfile />;
  }

  // If in Mini App but no user, show loading state
  if (!user) {
    return (
      <div className="h-9 w-9 rounded-full bg-gray-800 animate-pulse" />
    );
  }

  // Show Mini App user profile
  return (
    <div className="flex items-center gap-2 cursor-pointer">
      <Image
        src={user.pfpUrl || "/logo.png"}
        alt={user.displayName || user.username || "User"}
        width={36}
        height={36}
        className="rounded-full border border-gray-700 object-cover"
        unoptimized
      />
    </div>
  );
}

