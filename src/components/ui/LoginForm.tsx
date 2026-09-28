"use client";

import { useActionState } from "react";
import { FormMessage, type FormState } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";
import ui from "./ui.module.scss";

type Props = { action: (state: FormState, formData: FormData) => Promise<FormState> };

export function LoginForm({ action }: Props) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className={ui.form}>
      <label className={ui.field}>
        <span className={ui.label}>Email</span>
        <input className={ui.input} name="email" type="email" required autoComplete="username" />
      </label>
      <label className={ui.field}>
        <span className={ui.label}>Password</span>
        <input className={ui.input} name="password" type="password" required autoComplete="current-password" />
      </label>
      <FormMessage state={state} />
      <SubmitButton pendingText="Signing in…" block>
        Sign in
      </SubmitButton>
    </form>
  );
}
