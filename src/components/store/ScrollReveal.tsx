"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal], [data-reveal-group] > *"));
    const below = targets.filter((element) => element.getBoundingClientRect().top > window.innerHeight * 0.92);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.removeAttribute("data-reveal-pending");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    for (const element of below) {
      element.setAttribute("data-reveal-pending", "");
      observer.observe(element);
    }
    return () => {
      observer.disconnect();
      for (const element of below) element.removeAttribute("data-reveal-pending");
    };
  }, [pathname]);

  return null;
}
