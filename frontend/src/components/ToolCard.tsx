import { Link } from "react-router-dom";
import type { ToolDefinition } from "../types/tool";

export function ToolCard({ tool }: { tool: ToolDefinition }) {
  const Icon = tool.icon;

  return (
    <Link
      to={`/tool/${tool.id}`}
      className="group flex h-full flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm"
    >
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-lg ${tool.theme.bg} ${tool.theme.text}`}
      >
        <Icon size={22} />
      </span>
      <div>
        <h3 className="font-semibold text-neutral-900">{tool.title}</h3>
        <p className="mt-1 text-sm text-neutral-500">{tool.description}</p>
      </div>
    </Link>
  );
}
