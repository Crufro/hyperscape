/**
 * Toast Notification System
 * Next.js compatible toast notifications using a simple DOM-based approach
 *
 * For server components or API routes, logs to console.
 * For client components, shows visual toast notifications.
 */

type ToastLevel = "info" | "success" | "warning" | "error";

interface ToastOptions {
  durationMs?: number;
}

// Toast colors by level
const TOAST_COLORS: Record<ToastLevel, string> = {
  info: "#3b82f6", // blue-500
  success: "#10b981", // emerald-500
  warning: "#f59e0b", // amber-500
  error: "#ef4444", // red-500
};

// Toast icons by level
const TOAST_ICONS: Record<ToastLevel, string> = {
  info: "ℹ️",
  success: "✓",
  warning: "⚠️",
  error: "✕",
};

/**
 * Show a toast notification
 */
function showToast(message: string, level: ToastLevel, opts?: ToastOptions) {
  // Server-side or SSR: log to console
  if (typeof document === "undefined") {
    const prefix =
      level === "error"
        ? "[ERROR]"
        : level === "warning"
          ? "[WARN]"
          : level === "success"
            ? "[SUCCESS]"
            : "[INFO]";

    console.log(prefix, message);
    return;
  }

  // Client-side: show visual toast
  const containerId = "__hyperforge_toast_container__";
  let container = document.getElementById(containerId);

  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    Object.assign(container.style, {
      position: "fixed",
      top: "16px",
      right: "16px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      zIndex: "9999",
      pointerEvents: "none",
    });
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement("div");
  toast.style.pointerEvents = "auto";

  Object.assign(toast.style, {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 16px",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "14px",
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    boxShadow:
      "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
    maxWidth: "400px",
    wordBreak: "break-word",
    background: TOAST_COLORS[level],
    opacity: "0",
    transform: "translateX(100%)",
    transition: "all 200ms ease-out",
  });

  // Add icon
  const icon = document.createElement("span");
  icon.style.fontWeight = "bold";
  icon.textContent = TOAST_ICONS[level];
  toast.appendChild(icon);

  // Add message
  const text = document.createElement("span");
  text.textContent = message;
  toast.appendChild(text);

  // Add close button
  const closeBtn = document.createElement("button");
  Object.assign(closeBtn.style, {
    marginLeft: "8px",
    background: "transparent",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    fontSize: "16px",
    opacity: "0.7",
  });
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", () => dismissToast(toast));
  toast.appendChild(closeBtn);

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateX(0)";
    });
  });

  // Auto-dismiss
  const duration = opts?.durationMs ?? 4000;
  setTimeout(() => dismissToast(toast), duration);
}

function dismissToast(toast: HTMLElement) {
  toast.style.opacity = "0";
  toast.style.transform = "translateX(100%)";
  setTimeout(() => {
    toast.remove();
  }, 200);
}

/**
 * Toast notification API
 */
export const toast = {
  /**
   * Show an info toast
   */
  info: (message: string, options?: ToastOptions) =>
    showToast(message, "info", options),

  /**
   * Show a success toast
   */
  success: (message: string, options?: ToastOptions) =>
    showToast(message, "success", options),

  /**
   * Show a warning toast
   */
  warning: (message: string, options?: ToastOptions) =>
    showToast(message, "warning", options),

  /**
   * Show an error toast
   */
  error: (message: string, options?: ToastOptions) =>
    showToast(message, "error", options),

  /**
   * Show a toast with a promise (loading -> success/error)
   */
  promise: async <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string | ((err: Error) => string);
    },
  ): Promise<T> => {
    showToast(messages.loading, "info");

    try {
      const result = await promise;
      showToast(messages.success, "success");
      return result;
    } catch (err) {
      const errorMessage =
        typeof messages.error === "function"
          ? messages.error(err as Error)
          : messages.error;
      showToast(errorMessage, "error");
      throw err;
    }
  },
};

// Also export as 'notify' for convenience
export const notify = toast;
