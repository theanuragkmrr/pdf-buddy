import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function Layout() {
  return (
    <div>
      <Navbar />
      <main className="pb-16">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
