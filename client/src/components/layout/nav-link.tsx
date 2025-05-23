import { ReactNode } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
}

export function NavLink({ href, children, icon }: NavLinkProps) {
  const [location, navigate] = useLocation();
  const isActive = location === href;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(href);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer",
        isActive 
          ? "bg-primary-50 text-primary-700" 
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      {icon && <span className={cn(isActive ? "text-primary-500" : "text-slate-500")}>{icon}</span>}
      {children}
    </div>
  );
}
