"use client";

import { SectionTitle } from "./SectionTitle";

export function PromotedEventsSection() {
  return (
    <div className="mb-16 mt-10">
      <SectionTitle 
        title="Promoted Events" 
        subtitle="Featured events and activities from the Base ecosystem" 
      />
      
      {/* Promoted Events Content - To be filled in */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Placeholder for events - will be replaced with actual content */}
        <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <p className="text-gray-400 text-sm">Event content will be added here</p>
        </div>
      </div>
    </div>
  );
}

