"use client";

import { usePathname } from "next/navigation";
import { GlassPanel } from "./ui/glass-panel";
import { SidebarItem } from "./ui/sidebar-item";
import { Bot, Image as ImageIcon, Settings, Library } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

export function Sidebar() {
  const pathname = usePathname();

  const verifyActive = (href: string) => {
    if (href === "/" && pathname === "/") return true;
    if (href !== "/" && pathname?.startsWith(href)) return true;
    return false;
  };

  return (
    <GlassPanel
      intensity="high"
      border={true}
      className="w-64 h-full flex flex-col p-4 m-0 rounded-none border-r border-y-0 border-l-0"
    >
      {/* Logo Area */}
      <div className="flex items-center gap-2 px-2 py-4 mb-6">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-neon-blue to-neon-purple flex items-center justify-center font-bold text-background border border-border molten-glow">
          HF
        </div>
        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-wider">
          HYPERFORGE
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-2">
        <SidebarItem
          icon={<Bot className="w-5 h-5" />}
          label="Studio (Agent)"
          href="/"
          isActive={verifyActive("/")}
        />
        <SidebarItem
          icon={<Library className="w-5 h-5" />}
          label="Asset Gallery"
          href="/gallery"
          isActive={verifyActive("/gallery")}
        />
        <SidebarItem
          icon={<ImageIcon className="w-5 h-5" />}
          label="Texture Lab"
          href="/textures"
          isActive={verifyActive("/textures")}
        />
      </nav>

      <div className="mt-auto border-t border-glass-border pt-4 flex gap-2">
        <SidebarItem
          icon={<Settings className="w-5 h-5" />}
          label="Settings"
          href="/settings"
          isActive={verifyActive("/settings")}
        />
        <div className="ml-auto pr-2">
          <ThemeToggle />
        </div>
      </div>
    </GlassPanel>
  );
}
