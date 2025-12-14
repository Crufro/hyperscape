"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cuboid, MessageSquare, Settings } from "lucide-react";

interface StudioLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: "/", label: "3D Assets", icon: Cuboid },
  { href: "/content", label: "Content", icon: MessageSquare },
];

export function StudioLayout({ children }: StudioLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="h-screen w-full overflow-hidden bg-background flex flex-col">
      {/* Top Navigation Bar */}
      <header className="h-12 border-b border-glass-border flex items-center px-4 bg-glass-bg/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2 mr-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <span className="text-white font-bold text-sm">H</span>
          </div>
          <span className="font-semibold text-lg tracking-tight">
            HyperForge
          </span>
        </div>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-md text-sm
                  transition-colors
                  ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-glass-bg"
                  }
                `}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/settings"
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-glass-bg"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
