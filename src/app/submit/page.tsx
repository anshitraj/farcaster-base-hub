"use client";

import SubmitForm from "@/components/SubmitForm";
import AppHeader from "@/components/AppHeader";

export const dynamic = 'force-dynamic';

export default function SubmitPage() {
  return (
    <div className="min-h-screen bg-[#0B0F19] pb-24">
      <AppHeader />
      <div className="pt-6 pb-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Submit Your Mini App
              </span>
            </h1>
            
            <p className="text-white/70 text-sm max-w-2xl mx-auto">
              Share your creation with the Farcaster and Base community. Get discovered by thousands of users.
            </p>
          </div>

          <SubmitForm />
        </div>
      </div>
    </div>
  );
}
