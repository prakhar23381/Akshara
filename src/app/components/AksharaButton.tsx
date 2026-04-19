import { motion } from "motion/react";

interface AksharaButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  size?: "small" | "large";
  disabled?: boolean;
}

export function AksharaButton({
  children,
  onClick,
  variant = "primary",
  size = "large",
  disabled = false,
}: AksharaButtonProps) {
  const baseClasses = "rounded-3xl font-medium transition-all duration-150 cursor-pointer";
  
  const variantClasses = {
    primary: "bg-[#4A90E2] text-white hover:bg-[#357ABD] active:bg-[#2B6399]",
    secondary: "bg-white text-[#4A90E2] border-2 border-[#4A90E2] hover:bg-[#F0F7FF]",
  };
  
  const sizeClasses = {
    small: "px-8 py-3 text-lg tracking-wide",
    large: "px-16 py-6 text-2xl tracking-wide",
  };

  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {children}
    </motion.button>
  );
}
