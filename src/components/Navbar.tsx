import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold">
          <Zap className="w-6 h-6 text-base-blue" />
          <span className="text-gradient-base">Mini App Store</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm font-medium hover:text-base-blue transition-colors">
            Home
          </Link>
          <Link to="/apps" className="text-sm font-medium hover:text-base-blue transition-colors">
            Explore
          </Link>
          <Link to="/developers" className="text-sm font-medium hover:text-base-blue transition-colors">
            Developers
          </Link>
          <Link to="/submit" className="text-sm font-medium hover:text-base-blue transition-colors">
            Submit App
          </Link>
          <Link to="/dashboard" className="text-sm font-medium hover:text-base-blue transition-colors">
            Dashboard
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="border-base-blue/50 text-base-blue hover:bg-base-blue/10">
            Login with Farcaster
          </Button>
          <Button size="sm" className="bg-base-blue hover:bg-base-blue/90 glow-base-blue">
            Connect Wallet
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
