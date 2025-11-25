import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ButtonProps } from "@/components/ui/button";

interface GlowButtonProps extends ButtonProps {
  glowColor?: "blue" | "cyan";
}

const GlowButton = ({ className, glowColor = "blue", ...props }: GlowButtonProps) => {
  const glowClass = glowColor === "blue" ? "glow-base-blue" : "glow-base-cyan";
  
  return (
    <Button
      className={cn(
        "bg-base-blue hover:bg-base-blue/90 transition-all duration-300",
        glowClass,
        className
      )}
      {...props}
    />
  );
};

export default GlowButton;
