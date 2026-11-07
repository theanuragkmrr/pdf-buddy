import { useState } from "react";
import { Search } from "lucide-react";
import { tools } from "../config/tools";
import { ToolCard } from "../components/ToolCard";

export function Home() {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = tools.filter(
    (tool) => !q || tool.title.toLowerCase().includes(q) || tool.description.toLowerCase().includes(q),
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-neutral-900">Every PDF tool you need, in one place</h1>
        <p className="mt-4 text-neutral-500">
          Merge, split, compress and more — fast, free, and it runs on your own backend.
        </p>

        <div className="relative mt-8">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            size={18}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools — try “compress” or “password”"
            className="w-full rounded-lg border border-neutral-300 py-2.5 pl-10 pr-4 text-sm shadow-sm transition focus:border-neutral-900 focus:shadow-md focus:outline-none"
          />
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tool, index) => (
            <div key={tool.id} className="animate-fade-up" style={{ animationDelay: `${index * 25}ms` }}>
              <ToolCard tool={tool} />
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-12 text-center text-neutral-400">No tools match &ldquo;{query}&rdquo;.</p>
      )}
    </div>
  );
}
