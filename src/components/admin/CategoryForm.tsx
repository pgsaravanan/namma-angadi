"use client";

import { useActionState } from "react";
import { FormMessage, type FormState } from "@/components/ui/FormMessage";
import { ImageInput } from "@/components/ui/ImageInput";
import { SubmitButton } from "@/components/ui/SubmitButton";
import ui from "@/components/ui/ui.module.scss";
import styles from "./AdminShell.module.scss";

type Props = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  category?: { name: string; imageUrl: string | null };
};

export function CategoryForm({ action, category }: Props) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className={`${ui.form} ${styles.categoryForm}`}>
      <ImageInput name="image" label="Tile photo" currentUrl={category?.imageUrl} />
      <div className={ui.form}>
        <label className={ui.field}>
          <span className={ui.label}>Name</span>
          <input className={ui.input} name="name" required maxLength={60} defaultValue={category?.name} />
        </label>
        <FormMessage state={state} />
        <div>
          <SubmitButton>{category ? "Save category" : "Add category"}</SubmitButton>
        </div>
      </div>
    </form>
  );
}
