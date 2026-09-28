"use client";

import { useActionState } from "react";
import { FormMessage, type FormState } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import ui from "@/components/ui/ui.module.scss";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

export function MemberForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className={ui.form}>
      <div className={ui.row}>
        <label className={ui.field}>
          <span className={ui.label}>Name</span>
          <input className={ui.input} name="name" required />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Email</span>
          <input className={ui.input} name="email" type="email" required autoComplete="off" />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Role</span>
          <select className={ui.input} name="role" defaultValue="ADMIN">
            <option value="ADMIN">Admin: products and orders</option>
            <option value="SUPER_ADMIN">Super admin: everything, including discounts, team and payments</option>
          </select>
        </label>
      </div>
      <p className={ui.hint}>They get an email with a link to choose their own password. You&apos;ll also see the link here.</p>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingText="Sending invite…">Send invite</SubmitButton>
      </div>
    </form>
  );
}

export function NewInviteButton({ action }: { action: () => Promise<FormState> }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction}>
      <SubmitButton variant="secondary" size="small" pendingText="Creating…">
        New invite link
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
