"use client";

import { useActionState } from "react";
import { FormMessage, type FormState } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import styles from "./AdminShell.module.scss";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

const STATUS_LABELS: Record<string, string> = { SHIPPED: "Mark as shipped", DELIVERED: "Mark as delivered" };

type Props = {
  nextStatuses: string[];
  updateStatus: Action;
  cancel?: Action;
  refund?: Action;
  refundLabel?: string;
};

function ActionForm({ action, children, confirm }: { action: Action; children: React.ReactNode; confirm?: string }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form
      action={formAction}
      className={styles.inlineForm}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {children}
      <FormMessage state={state} />
    </form>
  );
}

export function OrderActions({ nextStatuses, updateStatus, cancel, refund, refundLabel }: Props) {
  return (
    <div className={styles.actions}>
      {nextStatuses.map((status) => (
        <ActionForm key={status} action={updateStatus}>
          <input type="hidden" name="status" value={status} />
          <SubmitButton>{STATUS_LABELS[status] ?? status}</SubmitButton>
        </ActionForm>
      ))}
      {cancel && (
        <ActionForm action={cancel} confirm="Cancel this unpaid order and return the stock?">
          <SubmitButton variant="secondary">Cancel order</SubmitButton>
        </ActionForm>
      )}
      {refund && (
        <ActionForm action={refund} confirm={`${refundLabel}? This cannot be undone.`}>
          <SubmitButton variant="danger" pendingText="Refunding…">
            {refundLabel}
          </SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
