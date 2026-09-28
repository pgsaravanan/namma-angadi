"use client";

import ui from "./ui.module.scss";

type Props = { action: () => Promise<void>; message: string; children: React.ReactNode };

export function ConfirmButton({ action, message, children }: Props) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      <button type="submit" className={`${ui.button} ${ui.secondary} ${ui.small}`}>
        {children}
      </button>
    </form>
  );
}
