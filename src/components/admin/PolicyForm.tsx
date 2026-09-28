"use client";

import { useActionState } from "react";
import { FormMessage, type FormState } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import ui from "@/components/ui/ui.module.scss";
import styles from "./AdminShell.module.scss";

type Props = { action: (state: FormState, formData: FormData) => Promise<FormState>; title: string; body: string };

export function PolicyForm({ action, title, body }: Props) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={ui.form}>
      <label className={ui.field}>
        <span className={ui.label}>Title</span>
        <input className={ui.input} name="title" required defaultValue={title} />
      </label>
      <label className={ui.field}>
        <span className={ui.label}>Text</span>
        <textarea className={`${ui.input} ${styles.policyText}`} name="body" required defaultValue={body} />
        <span className={ui.hint}>Leave a blank line between paragraphs. Start a line with “- ” for a bullet point.</span>
      </label>
      <FormMessage state={state} />
      <div>
        <SubmitButton>Save</SubmitButton>
      </div>
    </form>
  );
}
