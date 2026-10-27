"use client";

import { useActionState } from "react";
import { FormMessage, type FormState } from "@/components/ui/FormMessage";
import { KeepForm } from "@/components/ui/KeepForm";
import { PendingButton } from "@/components/ui/PendingButton";
import ui from "@/components/ui/ui.module.scss";
import styles from "./AdminShell.module.scss";

export function DeleteProduct({ action, name }: { action: () => Promise<FormState>; name: string }) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <section className={`${ui.card} ${styles.dangerZone}`}>
      <div>
        <h2 className={styles.cardTitle}>Delete this product</h2>
        <p className={ui.muted}>Removes it from your shop for good. To take it off sale for a while, hide it instead.</p>
      </div>
      <KeepForm
        action={formAction}
        onSubmit={(event) => {
          if (!window.confirm(`Delete "${name}" for good? This cannot be undone.`)) event.preventDefault();
        }}
      >
        <PendingButton className={`${ui.button} ${ui.danger}`} pendingText="Deleting…">
          Delete product
        </PendingButton>
      </KeepForm>
      <FormMessage state={state} />
    </section>
  );
}
