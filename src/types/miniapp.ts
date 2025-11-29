export type MiniAppCategory =
  | "game"
  | "music"
  | "social"
  | "productivity"
  | "finance"
  | "utility";

export interface MiniAppSeed {
  name: string;
  slug: string; // kebab-case unique id
  category: MiniAppCategory;
  frameUrl: string; // frames_url from Neynar
  homeUrl: string | null; // manifest.miniapp.home_url or frame.home_url
  iconUrl: string | null; // manifest.miniapp.icon_url or frame.icon_url or metadata favicon
  bannerUrl: string | null; // hero image or first screenshot
  shortDescription: string; // 1–2 lines
  seoDescription: string; // 2–3 lines, keyword rich
  primaryNetwork: "base" | "ethereum" | "solana" | "other";
  networks: string[]; // raw networks from Neynar if available, else []
  tags: string[]; // manifest tags + derived tags
  isFeatured: boolean; // default true for these 60
}

