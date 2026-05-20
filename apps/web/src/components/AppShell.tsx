import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { UserDisplayNameButton } from "./UserDisplayNameButton";

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  const navClass = (prefix: string) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`) ? "is-active" : "";

  return (
    <div className="app app--breeze">
      <header className="app-shell__bar">
        <div className="app-shell__start">
          <Link to="/dashboard" className="app-shell__brand">
            DPE
          </Link>
          <nav className="app-shell__nav" aria-label="主导航">
            <Link to="/dashboard" className={navClass("/dashboard")}>
              总览
            </Link>
            <Link to="/connections" className={navClass("/connections")}>
              连接
            </Link>
          </nav>
        </div>
        <UserDisplayNameButton />
      </header>
      <div className="app-shell__body">{children}</div>
    </div>
  );
}
