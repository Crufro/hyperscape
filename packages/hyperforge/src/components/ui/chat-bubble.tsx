import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
}

export function ChatBubble({ role, content }: ChatBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex w-full mb-4",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-accent/85 text-background border border-accent rounded-br-none backdrop-blur-md"
            : "bg-glass-bg/85 backdrop-blur-md border border-glass-border text-background dark:text-foreground rounded-bl-none",
        )}
      >
        {content}
      </div>
    </div>
  );
}
