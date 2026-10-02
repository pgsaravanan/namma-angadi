"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CloseIcon, MenuIcon } from "./icons";
import styles from "./StoreHeader.module.scss";

type Props = { shopName: string; items: { href: string; label: string }[] };

export function MobileMenu({ shopName, items }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => dialog.current?.close();

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 900px)");
    const closeOnDesktop = () => {
      if (!mobile.matches) dialog.current?.close();
    };
    mobile.addEventListener("change", closeOnDesktop);
    return () => mobile.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <div className={styles.mobileMenu}>
      <button type="button" className={styles.iconLink} aria-label="Menu" onClick={() => dialog.current?.showModal()}>
        <MenuIcon className={styles.icon} />
      </button>
      <dialog
        ref={dialog}
        className={styles.drawer}
        aria-label="Menu"
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className={styles.drawerPanel}>
          <div className={styles.drawerHead}>
            <span className={styles.drawerTitle}>{shopName}</span>
            <button type="button" className={styles.iconLink} aria-label="Close menu" onClick={close}>
              <CloseIcon className={styles.icon} />
            </button>
          </div>
          <nav className={styles.drawerLinks} aria-label="Shop categories">
            {[{ href: "/", label: "Home" }, ...items, { href: "/contact", label: "Contact us" }, { href: "/account", label: "My account" }, { href: "/cart", label: "Bag" }].map((item) => (
              <Link key={item.href} href={item.href} onClick={close}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </dialog>
    </div>
  );
}
