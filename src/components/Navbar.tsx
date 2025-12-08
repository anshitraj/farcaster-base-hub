"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import UserProfile from "./UserProfile";

const Navbar = () => {

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[hsl(var(--background))]/95 backdrop-blur-xl border-b border-[hsl(var(--border))]">
      <div className="max-w-screen-md mx-auto container-padding h-14 md:h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group hover:opacity-80 transition-opacity">
          <Image
            src="/logo.webp"
            alt="Mini App Store"
            width={200}
            height={60}
            className="h-10 md:h-12 w-auto"
            priority
          />
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link 
            href="/" 
            className="text-sm font-medium text-foreground/80 hover:text-base-blue transition-colors relative group"
          >
            Home
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-base-blue group-hover:w-full transition-all duration-100" />
          </Link>
          <Link 
            href="/apps" 
            className="text-sm font-medium text-foreground/80 hover:text-base-blue transition-colors relative group"
          >
            Explore
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-base-blue group-hover:w-full transition-all duration-100" />
          </Link>
          <Link 
            href="/premium" 
            className="text-sm font-medium text-white transition-all bg-gradient-to-r from-purple/20 to-base-blue/20 px-3 py-1.5 rounded-full border border-purple/30 hover:border-purple/50 hover:from-purple/30 hover:to-base-blue/30"
          >
            Premium
          </Link>
          <Link 
            href="/developers" 
            className="text-sm font-medium text-foreground/80 hover:text-base-blue transition-colors relative group"
          >
            Developers
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-base-blue group-hover:w-full transition-all duration-100" />
          </Link>
          <Link 
            href="/submit" 
            className="text-sm font-medium text-foreground/80 hover:text-base-blue transition-colors relative group"
          >
            Submit
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-base-blue group-hover:w-full transition-all duration-100" />
          </Link>
        </div>

        {/* User Profile - Clean design */}
        <div className="flex items-center gap-2">
          <UserProfile />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
