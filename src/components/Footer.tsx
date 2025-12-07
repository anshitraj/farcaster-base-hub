import Image from "next/image";

const Footer = () => {
  return (
    <footer className="glass-card border-t mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Image
                src="/logo.webp"
                alt="Mini App Store"
                width={200}
                height={60}
                className="h-8 w-auto"
                priority
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Discover the best Mini Apps across Farcaster & Base ecosystem.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Platform</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/apps" className="hover:text-base-blue transition-colors">Explore Apps</a></li>
              <li><a href="/developers" className="hover:text-base-blue transition-colors">Developers</a></li>
              <li><a href="/submit" className="hover:text-base-blue transition-colors">Submit App</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-base-blue transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-base-blue transition-colors">API</a></li>
              <li><a href="#" className="hover:text-base-blue transition-colors">Support</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Community</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-base-blue transition-colors">Discord</a></li>
              <li><a href="#" className="hover:text-base-blue transition-colors">Twitter</a></li>
              <li><a href="#" className="hover:text-base-blue transition-colors">Farcaster</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>© 2024 Mini App Store. Built on Base & Farcaster.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
