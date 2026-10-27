"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import styles from "./AdminShell.module.scss";

export function AdminSidebar({
  header,
  badge,
  children,
}: {
  header: React.ReactNode;
  badge: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [shownFor, setShownFor] = useState(pathname);
  if (shownFor !== pathname) {
    setShownFor(pathname);
    setOpen(false);
  }

  return (
    <aside className={open ? `${styles.sidebar} ${styles.sidebarOpen}` : styles.sidebar}>
      <div className={styles.sidebarTop}>
        <div>{header}</div>
        <button
          type="button"
          className={styles.menuButton}
          aria-expanded={open}
          aria-controls="admin-menu"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? "Close" : "Menu"}
          {badge > 0 && !open && (
            <span className={styles.navBadge} aria-label={`${badge} waiting`}>
              {badge}
            </span>
          )}
        </button>
      </div>
      <div id="admin-menu" className={styles.sidebarBody}>
        {children}
      </div>
    </aside>
  );
}
