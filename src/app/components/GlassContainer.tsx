import { motion } from "motion/react";
import { ReactNode } from "react";

interface GlassContainerProps {
  children: ReactNode;
  className?: string;
  isSelected?: boolean;
}

export function GlassContainer({
  children,
  className = "",
  isSelected = false
}: GlassContainerProps) {
  return (
    <motion.div
      className={`relative rounded-sm backdrop-blur-md ${className}`}
      style={{
        borderWidth: "1px",
        borderStyle: "solid",
      }}
      initial={{
        opacity: 0,
        y: 20,
        borderColor: "rgba(255, 255, 255, 0.1)",
        backgroundColor: "rgba(255, 255, 255, 0.05)",
      }}
      animate={{
        opacity: 1,
        y: 0,
        borderColor: isSelected ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.1)",
        backgroundColor: isSelected ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.05)",
        boxShadow: isSelected
          ? "0 8px 32px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
          : "0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
      }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    >
      {children}
    </motion.div>
  );
}
