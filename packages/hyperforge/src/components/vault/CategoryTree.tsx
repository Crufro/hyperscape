"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { SpectacularButton } from "@/components/ui/spectacular-button";

interface Category {
  name: string;
  count: number;
  children?: Category[];
}

const categories: Category[] = [
  { name: "Weapons", count: 9 },
  { name: "Armors", count: 1 },
  { name: "Tools", count: 8 },
  { name: "Resources", count: 1 },
  { name: "Environments", count: 10 },
];

interface CategoryTreeProps {
  onCategorySelect?: (category: string) => void;
}

export function CategoryTree({ onCategorySelect }: CategoryTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleCategory = (name: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpanded(newExpanded);
  };

  return (
    <div className="p-4">
      <h4 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
        Categories
      </h4>
      <div className="space-y-1">
        {categories.map((category) => (
          <div key={category.name}>
            <SpectacularButton
              variant="ghost"
              size="sm"
              className="w-full justify-between text-sm"
              onClick={() => {
                toggleCategory(category.name);
                onCategorySelect?.(category.name);
              }}
            >
              <div className="flex items-center gap-2">
                <ChevronRight
                  className={`w-3 h-3 transition-transform ${
                    expanded.has(category.name) ? "rotate-90" : ""
                  }`}
                />
                <span>{category.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {category.count}
              </span>
            </SpectacularButton>
            {expanded.has(category.name) && category.children && (
              <div className="ml-4 mt-1 space-y-1">
                {category.children.map((child) => (
                  <SpectacularButton
                    key={child.name}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between text-xs"
                    onClick={() => onCategorySelect?.(child.name)}
                  >
                    <span>{child.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {child.count}
                    </span>
                  </SpectacularButton>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
