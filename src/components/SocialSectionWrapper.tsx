"use client";

import { TwitterReel } from "./TwitterReel";
import { FarcasterReel } from "./FarcasterReel";
import { SectionTitle } from "./SectionTitle";

export function SocialSectionWrapper() {
  return (
    <div className="mb-16 mt-10">
      <SectionTitle 
        title="Base Social Feed" 
        subtitle="Latest updates from the Base ecosystem" 
      />
      
      {/* Row 1: Twitter Tweets */}
      <div className="mb-12">
        <TwitterReel />
      </div>

      {/* Row 2: Farcaster/Base Social Feed */}
      <div>
        <FarcasterReel />
      </div>
    </div>
  );
}

