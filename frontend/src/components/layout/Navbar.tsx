import { Link, NavLink } from "react-router-dom";
import { FileStack } from "lucide-react";

export function Navbar() {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-neutral-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-white">
            <FileStack size={18} />
          </span>
          <span className="text-lg">PDF Buddy</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-neutral-500">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? "text-neutral-900" : "transition hover:text-neutral-900"
            }
          >
            Tools
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
