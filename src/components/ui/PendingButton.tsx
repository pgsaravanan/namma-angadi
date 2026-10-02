"use client";

import Link, { useLinkStatus } from "next/link";
import { useFormStatus } from "react-dom";
import ui from "./ui.module.scss";

export function PendingButton({
  className,
  children,
  pendingText,
  disabled,
  label,
}: {
  className: string;
  children: React.ReactNode;
  pendingText?: string;
  disabled?: boolean;
  label?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`${className} ${ui.busy}`} disabled={pending || disabled} aria-label={label} aria-busy={pending}>
      {pending && <span className={ui.spinner} aria-hidden />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

function LinkLabel({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <>
      {pending && <span className={ui.spinner} aria-hidden />}
      {children}
    </>
  );
}

export function PendingLink({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={`${className} ${ui.busy}`}>
      <LinkLabel>{children}</LinkLabel>
    </Link>
  );
}
