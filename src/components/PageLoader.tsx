"use client";

import LoadingSpinner from "./LoadingSpinner";

interface PageLoaderProps {
  message?: string;
}

export default function PageLoader({ message = "Loading..." }: PageLoaderProps) {
  return (
    <div className="min-h-screen bg-[#0B0F19] pt-20 px-4 pb-24">
      <div className="max-w-screen-md mx-auto flex items-center justify-center py-20">
        <LoadingSpinner size="lg" text={message} />
      </div>
    </div>
  );
}

