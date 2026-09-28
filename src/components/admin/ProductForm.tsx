"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormMessage, type FormState } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ImageInput } from "@/components/ui/ImageInput";
import ui from "@/components/ui/ui.module.scss";
import styles from "./AdminShell.module.scss";

type Props = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  categories: { id: string; name: string }[];
  product?: {
    name: string;
    description: string;
    imageUrl: string | null;
    price: string;
    stock: number;
    isActive: boolean;
    categoryId: string | null;
  };
};

export function ProductForm({ action, categories, product }: Props) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className={`${ui.card} ${ui.form}`}>
      <label className={ui.field}>
        <span className={ui.label}>Name</span>
        <input className={ui.input} name="name" required defaultValue={product?.name} />
      </label>
      <label className={ui.field}>
        <span className={ui.label}>Category</span>
        <select className={ui.input} name="categoryId" defaultValue={product?.categoryId ?? ""}>
          <option value="">No category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <span className={ui.hint}>
          <Link href="/admin/categories">Add or rename categories</Link>
        </span>
      </label>
      <label className={ui.field}>
        <span className={ui.label}>Description</span>
        <textarea className={ui.input} name="description" defaultValue={product?.description} />
      </label>
      <div className={ui.row}>
        <label className={ui.field}>
          <span className={ui.label}>Price (₹)</span>
          <input
            className={ui.input}
            name="price"
            type="number"
            min="1"
            step="0.01"
            required
            defaultValue={product?.price}
          />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Stock</span>
          <input
            className={ui.input}
            name="stock"
            type="number"
            min="0"
            step="1"
            required
            defaultValue={product?.stock ?? 0}
          />
        </label>
      </div>
      <ImageInput name="photo" label="Photo" currentUrl={product?.imageUrl} allowLink pasteAnywhere />
      <label className={ui.checkbox}>
        <input type="checkbox" name="isActive" defaultChecked={product?.isActive ?? true} />
        Show this product in the store
      </label>
      <FormMessage state={state} />
      <div className={styles.actions}>
        <SubmitButton>Save product</SubmitButton>
        <Link href="/admin/products" className={`${ui.button} ${ui.secondary}`}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
