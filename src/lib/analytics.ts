/**
 * Analytics tracking utility
 * Supports multiple analytics providers
 */

interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
}

// Track page views
export function trackPageView(path: string) {
  if (typeof window === "undefined") return;

  // Google Analytics 4
  if ((window as any).gtag) {
    (window as any).gtag("config", process.env.NEXT_PUBLIC_GA_ID, {
      page_path: path,
    });
  }

  // Plausible Analytics
  if ((window as any).plausible) {
    (window as any).plausible("pageview");
  }

  // Custom analytics endpoint
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
    fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "pageview",
        path,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {
      // Silently fail
    });
  }
}

// Track custom events
export function trackEvent({ action, category, label, value }: AnalyticsEvent) {
  if (typeof window === "undefined") return;

  // Google Analytics 4
  if ((window as any).gtag) {
    (window as any).gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }

  // Plausible Analytics
  if ((window as any).plausible) {
    (window as any).plausible(action, {
      props: { category, label, value },
    });
  }

  // Custom analytics endpoint
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
    fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "event",
        action,
        category,
        label,
        value,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {
      // Silently fail
    });
  }
}

// Track app interactions
export function trackAppInteraction(
  appId: string,
  action: "view" | "click" | "open" | "install"
) {
  trackEvent({
    action,
    category: "app",
    label: appId,
  });
}

// Track wallet connection
export function trackWalletConnect(provider: string) {
  trackEvent({
    action: "wallet_connect",
    category: "auth",
    label: provider,
  });
}

// Track Farcaster login
export function trackFarcasterLogin() {
  trackEvent({
    action: "farcaster_login",
    category: "auth",
  });
}

