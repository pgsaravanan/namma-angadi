"use client";

import { useActionState } from "react";
import { FormMessage, type FormState } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import ui from "@/components/ui/ui.module.scss";

export function WelcomeForm({ action }: { action: (state: FormState, formData: FormData) => Promise<FormState> }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={ui.form}>
      <label className={ui.field}>
        <span className={ui.label}>New password</span>
        <input className={ui.input} name="password" type="password" required minLength={10} autoComplete="new-password" />
        <span className={ui.hint}>At least 10 characters.</span>
      </label>
      <label className={ui.field}>
        <span className={ui.label}>Type it again</span>
        <input className={ui.input} name="confirm" type="password" required minLength={10} autoComplete="new-password" />
      </label>
      <FormMessage state={state} />
      <SubmitButton pendingText="Setting up…" block>
        Set password and open my shop
      </SubmitButton>
    </form>
  );
}
