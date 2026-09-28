"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormMessage, type FormState } from "@/components/ui/FormMessage";
import { ImageInput } from "@/components/ui/ImageInput";
import { SubmitButton } from "@/components/ui/SubmitButton";
import ui from "@/components/ui/ui.module.scss";
import { FOOD_TYPES, GST_RATES } from "@/lib/food";
import styles from "./AdminShell.module.scss";
import { VariantsEditor, type VariantRow } from "./VariantsEditor";

type Props = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  categories: { id: string; name: string }[];
  defaultGstRate: number;
  product?: {
    name: string;
    description: string;
    imageUrl: string | null;
    price: string;
    stock: number;
    isActive: boolean;
    categoryId: string | null;
    foodType: string | null;
    hsnCode: string | null;
    gstRate: number | null;
    variants: VariantRow[];
  };
};

export function ProductForm({ action, categories, defaultGstRate, product }: Props) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className={`${ui.card} ${ui.form}`}>
      <label className={ui.field}>
        <span className={ui.label}>Name</span>
        <input className={ui.input} name="name" required defaultValue={product?.name} />
      </label>
      <div className={ui.row}>
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
          <span className={ui.label}>Veg / non-veg</span>
          <select className={ui.input} name="foodType" defaultValue={product?.foodType ?? ""}>
            <option value="">Not food / not shown</option>
            {FOOD_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
          <span className={ui.hint}>Shows the green or red mark customers expect.</span>
        </label>
      </div>
      <label className={ui.field}>
        <span className={ui.label}>Description</span>
        <textarea className={ui.input} name="description" defaultValue={product?.description} />
      </label>

      <VariantsEditor initial={product?.variants ?? []} />

      <div className={ui.row}>
        <label className={ui.field}>
          <span className={ui.label}>Price (₹)</span>
          <input className={ui.input} name="price" type="number" min="0" step="0.01" defaultValue={product?.price} />
          <span className={ui.hint}>Used when there are no pack sizes.</span>
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Stock</span>
          <input className={ui.input} name="stock" type="number" min="0" step="1" defaultValue={product?.stock ?? 10} />
          <span className={ui.hint}>Used when there are no pack sizes.</span>
        </label>
      </div>

      <ImageInput name="photo" label="Photo" currentUrl={product?.imageUrl} allowLink pasteAnywhere />

      <details className={styles.moreOptions}>
        <summary>Tax details for bills (optional)</summary>
        <div className={ui.row}>
          <label className={ui.field}>
            <span className={ui.label}>GST rate</span>
            <select className={ui.input} name="gstRate" defaultValue={product?.gstRate?.toString() ?? ""}>
              <option value="">Shop default ({defaultGstRate}%)</option>
              {GST_RATES.map((rate) => (
                <option key={rate} value={rate}>
                  {rate}%
                </option>
              ))}
            </select>
          </label>
          <label className={ui.field}>
            <span className={ui.label}>HSN / SAC code</span>
            <input className={ui.input} name="hsnCode" inputMode="numeric" maxLength={8} defaultValue={product?.hsnCode ?? ""} />
          </label>
        </div>
      </details>

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
