"use client";

import { useActionState, useState } from "react";
import { FormMessage, type FormState } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import ui from "@/components/ui/ui.module.scss";

type Props = { action: (state: FormState, formData: FormData) => Promise<FormState> };

export function CouponForm({ action }: Props) {
  const [state, formAction] = useActionState(action, undefined);
  const [type, setType] = useState<"PERCENT" | "FLAT">("PERCENT");

  return (
    <form action={formAction} className={ui.form}>
      <div className={ui.row}>
        <label className={ui.field}>
          <span className={ui.label}>Code</span>
          <input className={ui.input} name="code" required placeholder="DIWALI20" />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Type</span>
          <select
            className={ui.input}
            name="type"
            value={type}
            onChange={(event) => setType(event.target.value as "PERCENT" | "FLAT")}
          >
            <option value="PERCENT">Percentage off</option>
            <option value="FLAT">Flat amount off</option>
          </select>
        </label>
        <label className={ui.field}>
          <span className={ui.label}>{type === "PERCENT" ? "Discount (%)" : "Discount (₹)"}</span>
          <input className={ui.input} name="value" type="number" min="1" step="1" required />
        </label>
      </div>
      <div className={ui.row}>
        <label className={ui.field}>
          <span className={ui.label}>Minimum order (₹)</span>
          <input className={ui.input} name="minOrder" type="number" min="0" step="1" />
        </label>
        {type === "PERCENT" && (
          <label className={ui.field}>
            <span className={ui.label}>Maximum discount (₹)</span>
            <input className={ui.input} name="maxDiscount" type="number" min="0" step="1" />
          </label>
        )}
        <label className={ui.field}>
          <span className={ui.label}>Total uses allowed</span>
          <input className={ui.input} name="usageLimit" type="number" min="1" step="1" placeholder="Unlimited" />
        </label>
      </div>
      <div className={ui.row}>
        <label className={ui.field}>
          <span className={ui.label}>Starts</span>
          <input className={ui.input} name="startsAt" type="datetime-local" />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Ends</span>
          <input className={ui.input} name="endsAt" type="datetime-local" />
        </label>
      </div>
      <FormMessage state={state} />
      <div>
        <SubmitButton>Create coupon</SubmitButton>
      </div>
    </form>
  );
}
