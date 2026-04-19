import { cn } from "@/lib/utils";

/**
 * Airo wordmark — serif "Airo" in Playfair Display, primary blue.
 * Matches the brand reference: large, elegant serif word, no symbol.
 */
export function AiroLogo({
  className,
  size = 28,
  withTagline = false,
  tagline = "Effortless AI Travel Engineering.",
}: {
  className?: string;
  size?: number;
  withTagline?: boolean;
  tagline?: string;
}) {
  return (
    <div className={cn("inline-flex flex-col items-center", className)}>
      <span
        className="font-serif-display font-bold leading-none text-primary"
        style={{ fontSize: size, letterSpacing: "-0.02em" }}
      >
        Airo
      </span>
      {withTagline ? (
        <span className="mt-2 text-xs font-medium text-foreground/80 tracking-tight">
          {tagline}
        </span>
      ) : null}
    </div>
  );
}
