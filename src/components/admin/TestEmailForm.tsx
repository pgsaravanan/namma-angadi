"use client";

import { useActionState } from "react";
import { FormMessage, type FormState } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import ui from "@/components/ui/ui.module.scss";
import styles from "./AdminShell.module.scss";

export function TestEmailForm({ action }: { action: (state: FormState, formData: FormData) => Promise<FormState> }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={ui.form}>
      <div className={styles.actions}>
        <input className={`${ui.input} ${styles.testEmailInput}`} name="to" type="email" required placeholder="you@example.com" aria-label="Send a test email to" />
        <SubmitButton pendingText="Sending…">Send test email</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
