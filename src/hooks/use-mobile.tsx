import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false);
  const [isHydrated, setIsHydrated] = React.useState<boolean>(false);

  React.useEffect(() => {
    // Set hydrated flag
    setIsHydrated(true);
    
    // Check initial mobile state
    const checkMobile = () => {
      if (typeof window !== "undefined") {
        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
      }
    };
    
    // Initial check
    checkMobile();
    
    // Set up media query listener for better performance
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      checkMobile();
    };
    
    // Use modern media query listener if available
    if (mql.addEventListener) {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    } else {
      // Fallback for older browsers
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
    }
  }, []);

  // Return false during SSR to prevent hydration mismatch
  if (!isHydrated) {
    return false;
  }

  return isMobile;
}
