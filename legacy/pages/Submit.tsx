import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SubmitForm from "@/components/SubmitForm";
import { Sparkles } from "lucide-react";

const Submit = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
              <Sparkles className="w-4 h-4 text-base-cyan" />
              <span className="text-sm">Join the ecosystem</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-gradient-base">Submit Your Mini App</span>
            </h1>
            
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Share your creation with the Farcaster and Base community. Get discovered by thousands of users.
            </p>
          </div>

          <SubmitForm />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Submit;
