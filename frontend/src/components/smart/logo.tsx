import { Zap } from "lucide-react";

interface LogoProps {
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

const MARK_SIZES = { sm: "size-7 text-sm", md: "size-9 text-base", lg: "size-11 text-lg" };

/** The lightning tile without the word. */
export function LogoMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <div className={`grid ${MARK_SIZES[size]} place-items-center rounded-xl bg-primary text-primary-foreground`}>
      <Zap className="size-[55%] fill-current" />
    </div>
  );
}

export function Logo({ showText = true, size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: "size-7 text-sm",
    md: "size-9 text-base",
    lg: "size-11 text-lg",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`grid ${sizeClasses[size]} place-items-center rounded-xl bg-primary text-primary-foreground`}
      >
        <Zap className="size-[55%] fill-current" />
      </div>
      {showText && (
        <span
          className={`font-semibold tracking-tight ${textSizes[size]} text-foreground`}
        >
          Smart
        </span>
      )}
    </div>
  );
}
