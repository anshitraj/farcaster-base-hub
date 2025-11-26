import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ButtonProps } from "@/components/ui/button";

interface GlowButtonProps extends ButtonProps {
  glowColor?: "blue" | "purple" | "gradient";
  variant?: "gradient" | "solid";
}

const GlowButton = ({ 
  className, 
  glowColor = "gradient", 
  variant = "gradient",
  ...props 
}: GlowButtonProps) => {
  const baseClasses = "transition-all duration-300 font-medium";
  
  let buttonClasses = "";
  let glowClass = "";
  
  if (variant === "gradient") {
    buttonClasses = "btn-gradient";
    glowClass = "glow-gradient";
  } else {
    if (glowColor === "blue") {
      buttonClasses = "bg-base-blue hover:bg-base-blue-soft text-white";
      glowClass = "glow-base-blue";
    } else if (glowColor === "purple") {
      buttonClasses = "bg-purple hover:bg-purple/90 text-white";
      glowClass = "glow-purple";
    } else {
      buttonClasses = "btn-gradient";
      glowClass = "glow-gradient";
    }
  }
  
  return (
    <Button
      className={cn(
        baseClasses,
        buttonClasses,
        glowClass,
        "hover:scale-[1.02] active:scale-[0.98]",
        className
      )}
      {...props}
    />
  );
};

export default GlowButton;
