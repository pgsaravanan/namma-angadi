"use client";

import { useActionState } from "react";
import { FormMessage, type FormState } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import ui from "@/components/ui/ui.module.scss";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

export function ChangePasswordForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={ui.form}>
      <label className={ui.field}>
        <span className={ui.label}>Current password</span>
        <input className={ui.input} name="current" type="password" required autoComplete="current-password" />
      </label>
      <label className={ui.field}>
        <span className={ui.label}>New password</span>
        <input className={ui.input} name="next" type="password" required minLength={10} autoComplete="new-password" />
      </label>
      <label className={ui.field}>
        <span className={ui.label}>New password again</span>
        <input className={ui.input} name="confirm" type="password" required minLength={10} autoComplete="new-password" />
      </label>
      <FormMessage state={state} />
      <div>
        <SubmitButton>Change password</SubmitButton>
      </div>
    </form>
  );
}
