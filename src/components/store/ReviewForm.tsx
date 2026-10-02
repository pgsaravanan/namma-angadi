"use client";

import { useActionState } from "react";
import { FormMessage, type FormState } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import ui from "@/components/ui/ui.module.scss";
import styles from "./ReviewForm.module.scss";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

const LABELS = ["Poor", "Okay", "Good", "Very good", "Loved it"];

type ReviewFormProps = {
  action: Action;
  question: string;
  defaultName: string;
  placeholder: string;
  notice: string;
  commentOptional?: boolean;
  askToPublish?: boolean;
  maxLength?: number;
};

export function ReviewForm({
  action,
  question,
  defaultName,
  placeholder,
  notice,
  commentOptional,
  askToPublish,
  maxLength = 600,
}: ReviewFormProps) {
  const [state, formAction] = useActionState(action, undefined);

  if (state?.success) return <FormMessage state={state} />;

  return (
    <form action={formAction} className={ui.form}>
      <fieldset className={styles.picker}>
        <legend className={ui.label}>{question}</legend>
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
        <span className={ui.label}>{commentOptional ? "Anything to add? (optional)" : "Your review"}</span>
        <textarea className={ui.input} name="comment" required={!commentOptional} maxLength={maxLength} placeholder={placeholder} />
      </label>
      <label className={ui.field}>
        <span className={ui.label}>Your name</span>
        <input className={ui.input} name="customerName" required maxLength={60} defaultValue={defaultName} />
      </label>
      {askToPublish && (
        <label className={ui.checkbox}>
          <input type="checkbox" name="canPublish" />
          You can show my feedback and name on the shop
        </label>
      )}
      <span className={ui.hint}>{notice}</span>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingText="Sending…">Send</SubmitButton>
      </div>
    </form>
  );
}
