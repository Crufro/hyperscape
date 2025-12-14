import Link from "next/link";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SidebarItemProps {
  icon: ReactNode;
  label: string;
  href: string;
  isActive?: boolean;
}

export function SidebarItem({ icon, label, href, isActive }: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
        "hover:bg-foreground/5",
        isActive
          ? "text-foreground bg-accent/10 border-l-2 border-accent font-semibold"
          : "text-muted border-l-2 border-transparent hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "transition-colors",
          isActive
            ? "text-foreground"
            : "text-muted group-hover:text-foreground",
        )}
      >
        {icon}
      </span>
      <span className="text-sm font-medium tracking-wide group-hover:text-foreground">
        {label}
      </span>
      {/* Glow effect on hover */}
      {isActive && (
        <div className="absolute left-0 w-1 h-8 bg-accent molten-glow rounded-r-full" />
      )}
    </Link>
  );
}
