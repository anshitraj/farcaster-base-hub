"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import { Award } from "lucide-react";
import { optimizeDevImage } from "@/utils/optimizeDevImage";

interface DashboardBadgesSectionProps {
  badges: any[];
}

export default function DashboardBadgesSection({ badges }: DashboardBadgesSectionProps) {
  if (!badges || badges.length === 0) return null;

  return (
    <Card className="card-surface">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-500" />
          Your Badges ({badges.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {badges
            .filter((badge: any) => badge.imageUrl)
            .map((badge: any) => (
              <Link
                key={badge.id}
                href={`/apps/${badge.appId || '#'}`}
                className="block"
              >
                <div className="p-4 rounded-lg bg-[#141A24] border border-[#1F2733] hover:border-[#2A2A2A] transition-colors text-center">
                  {badge.imageUrl && (
                    <Image
                      src={optimizeDevImage(badge.imageUrl)}
                      alt={badge.name}
                      width={64}
                      height={64}
                      className="w-16 h-16 mx-auto mb-2 rounded-lg"
                      sizes="(max-width: 768px) 50vw, 25vw"
                      priority={false}
                    />
                  )}
                  <p className="text-sm font-medium">{badge.name}</p>
                  {badge.appName && (
                    <p className="text-xs text-muted-foreground mt-1">{badge.appName}</p>
                  )}
                </div>
              </Link>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

