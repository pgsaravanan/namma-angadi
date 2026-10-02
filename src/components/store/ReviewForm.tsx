"use client";

import { useActionState } from "react";
import { FormMessage, type FormState } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import ui from "@/components/ui/ui.module.scss";
import styles from "./ReviewForm.module.scss";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

const LABELS = ["Poor", "Okay", "Good", "Very good", "Loved it"];

export function ReviewForm({ action, productName, defaultName }: { action: Action; productName: string; defaultName: string }) {
  const [state, formAction] = useActionState(action, undefined);

  if (state?.success) return <FormMessage state={state} />;

  return (
    <form action={formAction} className={ui.form}>
      <fieldset className={styles.picker}>
        <legend className={ui.label}>How was {productName}?</legend>
        <div className={styles.starInputs}>
          {[5, 4, 3, 2, 1].map((star) => (
            <label key={star} title={LABELS[star - 1]}>
              <input type="radio" name="rating" value={star} required />
              <span aria-hidden>★</span>
              <span className={styles.visuallyHidden}>
                {star} star{star === 1 ? "" : "s"}, {LABELS[star - 1]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className={ui.field}>
        <span className={ui.label}>Your review</span>
        <textarea
          className={ui.input}
          name="comment"
          required
          maxLength={600}
          placeholder="What did you like? How was the taste and freshness?"
        />
      </label>
      <label className={ui.field}>
        <span className={ui.label}>Name shown with your review</span>
        <input className={ui.input} name="customerName" required maxLength={60} defaultValue={defaultName} />
      </label>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingText="Sending…">Submit review</SubmitButton>
      </div>
    </form>
  );
}
