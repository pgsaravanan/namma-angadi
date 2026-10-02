"use client";

import { useFormStatus } from "react-dom";
import ui from "./ui.module.scss";

type Props = {
  children: React.ReactNode;
  pendingText?: string;
  variant?: "primary" | "secondary" | "danger";
  size?: "default" | "small";
  block?: boolean;
  disabled?: boolean;
};

export function SubmitButton({ children, pendingText, variant = "primary", size = "default", block, disabled }: Props) {
  const { pending } = useFormStatus();
  const className = [
    ui.button,
    variant !== "primary" && ui[variant],
    size === "small" && ui.small,
    block && ui.block,
    ui.busy,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type="submit" className={className} disabled={pending || disabled}>
      {pending && <span className={ui.spinner} aria-hidden />}
      {pending ? (pendingText ?? "Saving…") : children}
    </button>
  );
}
