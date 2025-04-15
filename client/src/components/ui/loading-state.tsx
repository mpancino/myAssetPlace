/**
 * Loading State Components
 * 
 * This file provides standardized loading state components based on the design guide.
 */

import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  /** Loading message */
  message?: string;
  /** Size of the loading spinner (small, medium, large) */
  size?: "sm" | "md" | "lg";
  /** Whether to center the loading state */
  centered?: boolean;
  /** Optional classname for additional styling */
  className?: string;
}

/**
 * Get size class for the loading spinner
 */
const getSizeClass = (size: "sm" | "md" | "lg") => {
  switch (size) {
    case "sm": return "h-4 w-4";
    case "md": return "h-8 w-8";
    case "lg": return "h-12 w-12";
    default: return "h-8 w-8";
  }
};

/**
 * Standard Loading State Component
 */
export function LoadingState({
  message = "Loading...",
  size = "md",
  centered = true,
  className = "",
}: LoadingStateProps) {
  const containerClass = centered 
    ? `flex items-center justify-center ${className}`
    : `flex items-center ${className}`;
  
  const spinnerSizeClass = getSizeClass(size);
  
  return (
    <div className={containerClass}>
      <Loader2 className={`${spinnerSizeClass} animate-spin text-primary mr-2`} />
      <span className="text-muted-foreground">{message}</span>
    </div>
  );
}

/**
 * Loading Button Component
 */
export function LoadingButton({
  size = "sm",
}: Pick<LoadingStateProps, "size">) {
  const spinnerSizeClass = getSizeClass(size);
  
  return <Loader2 className={`${spinnerSizeClass} animate-spin`} />;
}

/**
 * Fullscreen Loading Overlay Component
 */
export function FullscreenLoading({
  message = "Loading...",
  size = "lg",
}: Pick<LoadingStateProps, "message" | "size">) {
  return (
    <div className="fixed inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card p-6 rounded-lg shadow-lg flex flex-col items-center">
        <Loader2 className={`${getSizeClass(size)} animate-spin text-primary mb-4`} />
        <span className="text-lg font-medium">{message}</span>
      </div>
    </div>
  );
}

/**
 * Card Loading State Component
 */
export function CardLoading({
  message = "Loading content...",
  size = "md",
}: Pick<LoadingStateProps, "message" | "size">) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <Loader2 className={`${getSizeClass(size)} animate-spin text-primary mb-4`} />
      <span className="text-muted-foreground">{message}</span>
    </div>
  );
}