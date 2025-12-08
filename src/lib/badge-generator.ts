/**
 * Badge Generator - Creates unique badge designs for each app
 * Each badge is visually unique based on app metadata
 */

interface BadgeDesign {
  backgroundColor: string;
  accentColor: string;
  pattern: string;
  shape: "circle" | "square" | "hexagon";
  borderStyle: "solid" | "dashed" | "gradient";
}

/**
 * Generate a unique badge design based on app metadata
 */
export function generateBadgeDesign(
  appName: string,
  category: string,
  iconUrl?: string
): BadgeDesign {
  // Create a hash from app name for consistent design
  const hash = simpleHash(appName + category);
  
  // Color palettes inspired by Base/Guild.xyz style
  const colorPalettes = [
    { bg: "#0052FF", accent: "#FFFFFF", name: "Base Blue" },
    { bg: "#1A1A1A", accent: "#0052FF", name: "Dark Blue" },
    { bg: "#0A0A0A", accent: "#00D4FF", name: "Cyan" },
    { bg: "#1A0033", accent: "#B347FF", name: "Purple" },
    { bg: "#00332A", accent: "#00FFB3", name: "Green" },
    { bg: "#331A00", accent: "#FFB347", name: "Orange" },
    { bg: "#33001A", accent: "#FF4785", name: "Pink" },
    { bg: "#1A1A33", accent: "#7B7BFF", name: "Indigo" },
  ];
  
  const palette = colorPalettes[hash % colorPalettes.length];
  
  // Patterns
  const patterns = ["none", "dots", "lines", "grid", "waves"];
  const pattern = patterns[hash % patterns.length];
  
  // Shapes
  const shapes: ("circle" | "square" | "hexagon")[] = ["circle", "square", "hexagon"];
  const shape = shapes[hash % shapes.length];
  
  // Border styles
  const borderStyles: ("solid" | "dashed" | "gradient")[] = ["solid", "dashed", "gradient"];
  const borderStyle = borderStyles[(hash >> 8) % borderStyles.length];
  
  return {
    backgroundColor: palette.bg,
    accentColor: palette.accent,
    pattern,
    shape,
    borderStyle,
  };
}

/**
 * Generate SVG badge image
 */
export function generateBadgeSVG(
  appName: string,
  category: string,
  design: BadgeDesign,
  iconUrl?: string
): string {
  const { backgroundColor, accentColor, pattern, shape, borderStyle } = design;
  const size = 400;
  const center = size / 2;
  
  // Create pattern definition
  let patternDef = "";
  if (pattern === "dots") {
    patternDef = `
      <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="10" cy="10" r="2" fill="${accentColor}" opacity="0.3"/>
      </pattern>
    `;
  } else if (pattern === "lines") {
    patternDef = `
      <pattern id="lines" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="40" y2="40" stroke="${accentColor}" stroke-width="1" opacity="0.2"/>
      </pattern>
    `;
  } else if (pattern === "grid") {
    patternDef = `
      <pattern id="grid" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
        <rect width="30" height="30" fill="none" stroke="${accentColor}" stroke-width="1" opacity="0.15"/>
      </pattern>
    `;
  } else if (pattern === "waves") {
    patternDef = `
      <pattern id="waves" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
        <path d="M0,30 Q15,20 30,30 T60,30" stroke="${accentColor}" stroke-width="2" fill="none" opacity="0.2"/>
      </pattern>
    `;
  }
  
  // Create shape path
  let shapePath = "";
  let clipPath = "";
  
  if (shape === "circle") {
    shapePath = `<circle cx="${center}" cy="${center}" r="${center - 20}"/>`;
    clipPath = `<circle cx="${center}" cy="${center}" r="${center - 20}"/>`;
  } else if (shape === "square") {
    const radius = 20;
    shapePath = `<rect x="${radius}" y="${radius}" width="${size - radius * 2}" height="${size - radius * 2}" rx="30"/>`;
    clipPath = `<rect x="${radius}" y="${radius}" width="${size - radius * 2}" height="${size - radius * 2}" rx="30"/>`;
  } else if (shape === "hexagon") {
    const r = center - 20;
    const points = [
      [center, 20],
      [size - 20, center * 0.5],
      [size - 20, center * 1.5],
      [center, size - 20],
      [20, center * 1.5],
      [20, center * 0.5],
    ].map(([x, y]) => `${x},${y}`).join(" ");
    shapePath = `<polygon points="${points}"/>`;
    clipPath = `<polygon points="${points}"/>`;
  }
  
  // Border style
  let borderDef = "";
  if (borderStyle === "dashed") {
    borderDef = `stroke-dasharray="10,5"`;
  } else if (borderStyle === "gradient") {
    borderDef = `stroke="url(#borderGradient)"`;
  }
  
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        ${patternDef}
        <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${accentColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${backgroundColor};stop-opacity:1" />
        </linearGradient>
        <clipPath id="badgeClip">
          ${clipPath}
        </clipPath>
      </defs>
      
      <!-- Background -->
      <g clip-path="url(#badgeClip)">
        <rect width="${size}" height="${size}" fill="${backgroundColor}"/>
        ${pattern !== "none" ? `<rect width="${size}" height="${size}" fill="url(#${pattern})"/>` : ""}
        
        <!-- Icon or App Initial -->
        ${iconUrl 
          ? `<image href="${iconUrl}" x="${center - 80}" y="${center - 80}" width="160" height="160" clip-path="url(#badgeClip)"/>`
          : `<text x="${center}" y="${center + 20}" font-family="Arial, sans-serif" font-size="120" font-weight="bold" fill="${accentColor}" text-anchor="middle" opacity="0.8">${appName.charAt(0).toUpperCase()}</text>`
        }
        
        <!-- Category text at bottom -->
        <text x="${center}" y="${size - 40}" font-family="Arial, sans-serif" font-size="24" font-weight="600" fill="${accentColor}" text-anchor="middle" opacity="0.9">${category}</text>
      </g>
      
      <!-- Border -->
      <g fill="none" stroke="${borderStyle === "gradient" ? "url(#borderGradient)" : accentColor}" stroke-width="4" ${borderDef}>
        ${shapePath}
      </g>
      
      <!-- App name (small, at top) -->
      <text x="${center}" y="50" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="${accentColor}" text-anchor="middle" opacity="0.95">${truncateText(appName, 15)}</text>
    </svg>
  `.trim();
  
  return svg;
}

/**
 * Generate badge metadata JSON
 */
export function generateBadgeMetadata(
  appName: string,
  category: string,
  appUrl: string,
  developerWallet: string,
  imageUrl: string,
  appId: string
) {
  const design = generateBadgeDesign(appName, category);
  
  return {
    name: `${appName} Builder Badge`,
    description: `Soulbound token badge for building ${appName} on Base. This badge is non-transferable and represents your achievement as a developer.`,
    image: imageUrl,
    external_url: appUrl,
    attributes: [
      { trait_type: "App Name", value: appName },
      { trait_type: "Category", value: category },
      { trait_type: "Developer", value: developerWallet },
      { trait_type: "App URL", value: appUrl },
      { trait_type: "Badge Type", value: "SBT" },
      { trait_type: "Network", value: "Base" },
      { trait_type: "Shape", value: design.shape },
      { trait_type: "Pattern", value: design.pattern },
      { trait_type: "Border Style", value: design.borderStyle },
    ],
  };
}

// Helper functions
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

