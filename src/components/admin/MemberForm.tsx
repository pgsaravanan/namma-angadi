"use client";

import { useActionState } from "react";
import { FormMessage, type FormState } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import ui from "@/components/ui/ui.module.scss";

type Props = { action: (state: FormState, formData: FormData) => Promise<FormState> };

export function MemberForm({ action }: Props) {
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
      </div>
      <div className={ui.row}>
        <label className={ui.field}>
          <span className={ui.label}>Temporary password</span>
          <input className={ui.input} name="password" type="password" required minLength={10} autoComplete="new-password" />
          <span className={ui.hint}>Only used if this person does not have an account yet.</span>
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Role</span>
          <select className={ui.input} name="role" defaultValue="ADMIN">
            <option value="ADMIN">Admin: products and orders</option>
            <option value="SUPER_ADMIN">Super admin: everything, including discounts, team and payments</option>
          </select>
        </label>
      </div>
      <FormMessage state={state} />
      <div>
        <SubmitButton>Add to team</SubmitButton>
      </div>
    </form>
  );
}
