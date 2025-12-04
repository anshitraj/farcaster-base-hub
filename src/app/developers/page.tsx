"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DevelopersPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to user ranking page
    router.replace("/ranking");
  }, [router]);

  return null;
}
