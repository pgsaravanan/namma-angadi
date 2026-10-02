"use client";

import { useActionState } from "react";
import { FormMessage, type FormState } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import ui from "@/components/ui/ui.module.scss";
import { CONTACT_TOPICS } from "@/lib/contact";
import styles from "./ContactForm.module.scss";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

export function ContactForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, undefined);

  if (state?.success) return <FormMessage state={state} />;

  return (
    <form action={formAction} className={ui.form}>
      <div className={ui.row}>
        <label className={ui.field}>
          <span className={ui.label}>Your name</span>
          <input className={ui.input} name="name" required maxLength={80} autoComplete="name" />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Mobile number</span>
          <input
            className={ui.input}
            name="phone"
            required
            inputMode="numeric"
            maxLength={10}
            autoComplete="tel-national"
            placeholder="10-digit mobile"
          />
        </label>
      </div>
      <div className={ui.row}>
        <label className={ui.field}>
          <span className={ui.label}>Email (optional)</span>
          <input className={ui.input} name="email" type="email" autoComplete="email" />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>What is it about?</span>
          <select className={ui.input} name="topic" required defaultValue="">
            <option value="" disabled>
              Choose one
            </option>
            {CONTACT_TOPICS.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={ui.field}>
        <span className={ui.label}>Order number (if you have one)</span>
        <input className={ui.input} name="orderNumber" inputMode="numeric" maxLength={8} placeholder="e.g. 1024" />
      </label>
      <label className={ui.field}>
        <span className={ui.label}>Your message</span>
        <textarea className={ui.input} name="message" required maxLength={1500} rows={5} />
      </label>
      <label className={styles.trap} aria-hidden>
        Leave this empty
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingText="Sending…">Send message</SubmitButton>
      </div>
    </form>
  );
}
