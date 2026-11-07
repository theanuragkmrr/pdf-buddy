import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

export function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="animate-toast-in fixed bottom-20 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm text-white shadow-lg">
      <CheckCircle2 size={16} />
      {message}
    </div>
  );
}
