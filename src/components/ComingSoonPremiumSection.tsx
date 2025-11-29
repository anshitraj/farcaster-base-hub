"use client";

import { motion } from "framer-motion";
import { Lock, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const placeholderApps = [
  {
    name: "Pro Analytics Tool",
    description: "Advanced developer analytics with real-time insights. Launching soon.",
  },
  {
    name: "Contract Automation Suite",
    description: "Auto-deploy & manage smart contracts effortlessly. Coming soon.",
  },
  {
    name: "AI Generator for Mini Apps",
    description: "Instant AI-powered app builder for developers. Coming soon.",
  },
];

export default function ComingSoonPremiumSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {placeholderApps.map((app, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
        >
          <Card className="glass-card border-white/10 relative overflow-hidden group cursor-not-allowed opacity-60">
            {/* Blurred/Locked Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-blue-900/20 backdrop-blur-[1px] z-10" />
            
            <CardContent className="p-6 relative z-0">
              {/* Lock Icon */}
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 mb-4 mx-auto">
                <Lock className="w-8 h-8 text-purple-400" />
              </div>

              {/* Launching Soon Badge */}
              <div className="flex justify-center mb-3">
                <div className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-purple-600/20 text-purple-300 border border-purple-500/40">
                  Launching Soon
                </div>
              </div>

              {/* App Title */}
              <h3 className="text-lg font-semibold text-white mb-2 text-center">
                {app.name}
              </h3>

              {/* Description */}
              <p className="text-sm text-muted-foreground text-center mb-4 leading-relaxed">
                {app.description}
              </p>

              {/* Disabled Button */}
              <button
                disabled
                className="w-full px-4 py-2 rounded-full bg-gray-700/50 text-gray-400 border border-gray-600/50 font-medium text-sm cursor-not-allowed opacity-50 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Coming Soon
              </button>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

