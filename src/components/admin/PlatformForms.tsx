"use client";

import { useActionState } from "react";
import { FormMessage, type FormState } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import ui from "@/components/ui/ui.module.scss";
import styles from "./AdminShell.module.scss";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

export function CreateShopForm({ action, rootDomain }: { action: Action; rootDomain: string }) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className={ui.form}>
      <div className={ui.row}>
        <label className={ui.field}>
          <span className={ui.label}>Shop name</span>
          <input className={ui.input} name="name" required placeholder="Lakshmi Stores" />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Shop address</span>
          <input className={ui.input} name="slug" required placeholder="lakshmi-stores" pattern="[a-z0-9-]{3,40}" />
          <span className={ui.hint}>Becomes lakshmi-stores.{rootDomain}</span>
        </label>
      </div>
      <div className={ui.row}>
        <label className={ui.field}>
          <span className={ui.label}>Owner name</span>
          <input className={ui.input} name="ownerName" required />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Owner email</span>
          <input className={ui.input} name="ownerEmail" type="email" required autoComplete="off" />
        </label>
      </div>
      <p className={ui.hint}>The owner gets an email invite to choose their own password.</p>
      <FormMessage state={state} />
      <div>
        <SubmitButton>Create shop</SubmitButton>
      </div>
    </form>
  );
}

export function SenderEmailForm({ action, senderEmail }: { action: Action; senderEmail: string | null }) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className={styles.actions}>
      <input
        className={`${ui.input} ${styles.domainInput}`}
        name="senderEmail"
        type="email"
        defaultValue={senderEmail ?? ""}
        placeholder="Default sender"
        aria-label="Sends email from"
      />
      <SubmitButton variant="secondary" size="small">
        Save
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function CustomDomainForm({ action, domain }: { action: Action; domain: string | null }) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className={styles.actions}>
      <input
        className={`${ui.input} ${styles.domainInput}`}
        name="domain"
        defaultValue={domain ?? ""}
        placeholder="www.shopname.com"
        aria-label="Custom domain"
      />
      <SubmitButton variant="secondary" size="small">
        Save
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
