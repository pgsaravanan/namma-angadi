"use client";

import { useActionState, useRef, useState } from "react";
import { FormMessage, type FormState } from "@/components/ui/FormMessage";
import { PendingButton } from "@/components/ui/PendingButton";
import { SubmitButton } from "@/components/ui/SubmitButton";
import ui from "@/components/ui/ui.module.scss";
import { MAX_PROMOTION_PRODUCTS, PROMOTION_KINDS } from "@/lib/promotions";
import styles from "./AdminShell.module.scss";
import { MediaInput } from "./MediaInput";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

export function AnnouncementForm({ action, disabled }: { action: Action; disabled: boolean }) {
  const form = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(async (previous: FormState, formData: FormData) => {
    const result = await action(previous, formData);
    if (result?.success) form.current?.reset();
    return result;
  }, undefined);

  return (
    <form ref={form} action={formAction} className={ui.form}>
      <div className={ui.row}>
        <label className={ui.field}>
          <span className={ui.label}>Message</span>
          <input
            className={ui.input}
            name="message"
            required
            maxLength={120}
            placeholder="Free delivery in Madurai on orders above ₹500"
            disabled={disabled}
          />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Link (optional)</span>
          <input className={ui.input} name="link" maxLength={300} placeholder="/products" disabled={disabled} />
        </label>
      </div>
      <FormMessage state={state} />
      <div>
        <SubmitButton disabled={disabled}>Add message</SubmitButton>
      </div>
    </form>
  );
}

type PickerProduct = { id: string; name: string; imageUrl: string | null };
type PickerCoupon = { id: string; code: string };

export type PromotionValues = {
  kind: string;
  title: string;
  subtitle: string;
  couponId: string;
  endsAt: string;
  mediaUrl: string | null;
  productIds: string[];
};

export function PromotionForm({
  action,
  products,
  coupons,
  initial,
}: {
  action: Action;
  products: PickerProduct[];
  coupons: PickerCoupon[];
  initial?: PromotionValues;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [picked, setPicked] = useState<string[]>(initial?.productIds ?? []);
  const [mediaKey, setMediaKey] = useState(0);
  const [state, formAction] = useActionState(async (previous: FormState, formData: FormData) => {
    const result = await action(previous, formData);
    if (result?.success && !initial) {
      form.current?.reset();
      setPicked([]);
      setMediaKey((key) => key + 1);
    }
    return result;
  }, undefined);

  const toggle = (id: string) =>
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  return (
    <form ref={form} action={formAction} className={ui.form}>
      <div className={ui.row}>
        <label className={ui.field}>
          <span className={ui.label}>Type</span>
          <select className={ui.input} name="kind" defaultValue={initial?.kind ?? "launch"}>
            {Object.entries(PROMOTION_KINDS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Headline</span>
          <input
            className={ui.input}
            name="title"
            required
            maxLength={80}
            defaultValue={initial?.title}
            placeholder="Just launched: Millet laddu"
          />
        </label>
      </div>
      <label className={ui.field}>
        <span className={ui.label}>Short text (optional)</span>
        <input
          className={ui.input}
          name="subtitle"
          maxLength={160}
          defaultValue={initial?.subtitle}
          placeholder="Made fresh with jaggery and ghee. Try it this week."
        />
      </label>
      <div className={ui.row}>
        <label className={ui.field}>
          <span className={ui.label}>Show a coupon code (optional)</span>
          <select className={ui.input} name="couponId" defaultValue={initial?.couponId ?? ""}>
            <option value="">No coupon</option>
            {coupons.map((coupon) => (
              <option key={coupon.id} value={coupon.id}>
                {coupon.code}
              </option>
            ))}
          </select>
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Ends (optional)</span>
          <input className={ui.input} name="endsAt" type="datetime-local" defaultValue={initial?.endsAt} />
          <span className={ui.hint}>The promotion hides itself after this time and shows a countdown.</span>
        </label>
      </div>

      <MediaInput
        key={mediaKey}
        name="media"
        label="Banner picture or video (optional)"
        kind="promotions"
        currentUrl={initial?.mediaUrl}
      />

      <fieldset className={styles.picker}>
        <legend className={ui.label}>
          Products to show ({picked.length}/{MAX_PROMOTION_PRODUCTS})
        </legend>
        {products.length === 0 ? (
          <p className={ui.empty}>Add some products first.</p>
        ) : (
          <div className={styles.pickerGrid}>
            {products.map((product) => {
              const checked = picked.includes(product.id);
              return (
                <label key={product.id} className={checked ? `${styles.pickerItem} ${styles.picked}` : styles.pickerItem}>
                  <input
                    type="checkbox"
                    name="productIds"
                    value={product.id}
                    checked={checked}
                    disabled={!checked && picked.length >= MAX_PROMOTION_PRODUCTS}
                    onChange={() => toggle(product.id)}
                  />
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.imageUrl} alt="" className={styles.thumb} />
                  ) : (
                    <span className={styles.thumb} aria-hidden />
                  )}
                  <span>{product.name}</span>
                </label>
              );
            })}
          </div>
        )}
      </fieldset>

      <FormMessage state={state} />
      <div>
        <SubmitButton>{initial ? "Save changes" : "Publish promotion"}</SubmitButton>
      </div>
    </form>
  );
}

export function ConfirmButton({
  action,
  message,
  className,
  children,
}: {
  action: () => Promise<void>;
  message: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      <PendingButton className={className}>{children}</PendingButton>
    </form>
  );
}

export type StoryValues = { caption: string; customerName: string; place: string; mediaUrl: string | null };

export function StoryForm({ action, initial }: { action: Action; initial?: StoryValues }) {
  const form = useRef<HTMLFormElement>(null);
  const [formKey, setFormKey] = useState(0);
  const [state, formAction] = useActionState(async (previous: FormState, formData: FormData) => {
    const result = await action(previous, formData);
    if (result?.success && !initial) {
      form.current?.reset();
      setFormKey((key) => key + 1);
    }
    return result;
  }, undefined);

  return (
    <form ref={form} action={formAction} className={ui.form}>
      <MediaInput
        key={formKey}
        name="media"
        label="Photo, GIF or video (optional, your logo shows if you skip it)"
        kind="stories"
        currentUrl={initial?.mediaUrl}
      />
      <label className={ui.field}>
        <span className={ui.label}>What would you like to say?</span>
        <textarea
          className={ui.input}
          name="caption"
          required
          maxLength={200}
          defaultValue={initial?.caption}
          placeholder="Fresh idly podi delivered for a family function in Anna Nagar. Thank you for trusting us!"
        />
      </label>
      <div className={ui.row}>
        <label className={ui.field}>
          <span className={ui.label}>Customer name (optional)</span>
          <input className={ui.input} name="customerName" maxLength={60} defaultValue={initial?.customerName} placeholder="Lakshmi" />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Place (optional)</span>
          <input className={ui.input} name="place" maxLength={60} defaultValue={initial?.place} placeholder="Anna Nagar, Madurai" />
        </label>
      </div>
      <FormMessage state={state} />
      <div>
        <SubmitButton>{initial ? "Save changes" : "Add to home page"}</SubmitButton>
      </div>
    </form>
  );
}
