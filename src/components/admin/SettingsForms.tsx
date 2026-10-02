"use client";

import { useActionState, useState } from "react";
import { FormMessage, type FormState } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ImageInput } from "@/components/ui/ImageInput";
import ui from "@/components/ui/ui.module.scss";
import { StateSelect } from "@/components/ui/StateSelect";
import { GST_RATES } from "@/lib/food";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/payment-methods";
import { WEEK_DAYS } from "@/lib/shop-hours";
import styles from "./AdminShell.module.scss";
import type { ProviderId, ProviderInfo } from "@/lib/payments/catalog";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

export function ShopDetailsForm({
  action,
  shop,
}: {
  action: Action;
  shop: {
    name: string;
    contactName: string | null;
    supportEmail: string | null;
    supportPhone: string | null;
    whatsappNumber: string | null;
  };
}) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className={ui.form}>
      <label className={ui.field}>
        <span className={ui.label}>Shop name</span>
        <input className={ui.input} name="name" required defaultValue={shop.name} />
      </label>
      <label className={ui.field}>
        <span className={ui.label}>Contact person</span>
        <input className={ui.input} name="contactName" maxLength={80} defaultValue={shop.contactName ?? ""} placeholder="Shown to customers" />
      </label>
      <div className={ui.row}>
        <label className={ui.field}>
          <span className={ui.label}>Support email</span>
          <input className={ui.input} name="supportEmail" type="email" defaultValue={shop.supportEmail ?? ""} />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Support phone</span>
          <input className={ui.input} name="supportPhone" inputMode="numeric" maxLength={10} defaultValue={shop.supportPhone ?? ""} />
        </label>
      </div>
      <label className={ui.field}>
        <span className={ui.label}>WhatsApp number</span>
        <input
          className={ui.input}
          name="whatsappNumber"
          inputMode="numeric"
          maxLength={10}
          defaultValue={shop.whatsappNumber ?? ""}
          placeholder="Leave empty to use the support phone"
        />
        <span className={ui.hint}>Customers see a WhatsApp button on every page that opens a chat with this number.</span>
      </label>
      <FormMessage state={state} />
      <div>
        <SubmitButton>Save details</SubmitButton>
      </div>
    </form>
  );
}

export type SavedCredentials = Partial<Record<ProviderId, { values: Record<string, string>; secretsSaved: string[] }>>;

type PaymentProps = {
  action: Action;
  providers: ProviderInfo[];
  current: ProviderId | null;
  saved: SavedCredentials;
  webhookBaseUrl: string;
  methods: PaymentMethod[];
};

function RazorpayGuide({ webhookUrl }: { webhookUrl: string }) {
  return (
    <ol className={ui.muted}>
      <li>Sign in to the Razorpay Dashboard with the shop&apos;s own account. Payments go straight to its bank.</li>
      <li>Under Account &amp; Settings → API Keys, generate a key and paste the Key ID and Key secret below.</li>
      <li>
        Under Webhooks, add <code>{webhookUrl}</code> with the events payment.captured, order.paid and
        refund.processed, choose a secret, and paste the same secret below.
      </li>
      <li>Under Payment Capture, turn on automatic capture.</li>
    </ol>
  );
}

function StripeGuide({ webhookUrl }: { webhookUrl: string }) {
  return (
    <ol className={ui.muted}>
      <li>Sign in to the Stripe Dashboard and make sure Test mode is on.</li>
      <li>Under Developers → API keys, copy the Secret key (sk_test_…) and paste it below.</li>
      <li>
        For webhooks while developing, run <code>stripe listen --forward-to {webhookUrl}</code> with the Stripe CLI and
        paste the whsec_… secret it prints. After deploying, add <code>{webhookUrl}</code> as a webhook endpoint with
        the checkout.session.* and refund.* events instead.
      </li>
      <li>Test card: 4242 4242 4242 4242, any future date, any CVC.</li>
    </ol>
  );
}

export function PaymentSettingsForm({ action, providers, current, saved, webhookBaseUrl, methods }: PaymentProps) {
  const [state, formAction] = useActionState(action, undefined);
  const [providerId, setProviderId] = useState<ProviderId | "">(current ?? "");
  const provider = providers.find((candidate) => candidate.id === providerId);
  const savedForProvider = provider ? saved[provider.id] : undefined;

  return (
    <form action={formAction} className={ui.form} autoComplete="off">
      <label className={ui.field}>
        <span className={ui.label}>Payment provider</span>
        <select
          className={ui.input}
          name="provider"
          required
          value={providerId}
          onChange={(event) => setProviderId(event.target.value as ProviderId)}
        >
          <option value="" disabled>
            Choose a provider
          </option>
          {providers.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.label}
            </option>
          ))}
        </select>
        {provider && <span className={ui.hint}>{provider.description}</span>}
      </label>

      {provider?.id === "razorpay" && <RazorpayGuide webhookUrl={`${webhookBaseUrl}/razorpay`} />}
      {provider?.id === "stripe" && <StripeGuide webhookUrl={`${webhookBaseUrl}/stripe`} />}

      {provider?.fields.map((field) => {
        const secretSaved = savedForProvider?.secretsSaved.includes(field.name) ?? false;
        return (
          <label key={`${provider.id}-${field.name}`} className={ui.field}>
            <span className={ui.label}>{field.label}</span>
            <input
              className={ui.input}
              name={field.name}
              type={field.secret ? "password" : "text"}
              autoComplete={field.secret ? "new-password" : "off"}
              defaultValue={field.secret ? "" : savedForProvider?.values[field.name]}
              placeholder={secretSaved ? "Saved. Leave blank to keep it." : field.placeholder}
              required={field.required && !secretSaved}
            />
          </label>
        );
      })}

      <fieldset className={ui.form}>
        <legend className={ui.label}>Payment methods customers can use</legend>
        {PAYMENT_METHODS.map((method) => (
          <label key={method.id} className={ui.checkbox}>
            <input type="checkbox" name="methods" value={method.id} defaultChecked={methods.includes(method.id)} />
            {method.label}
          </label>
        ))}
      </fieldset>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingText="Checking…">Save payment settings</SubmitButton>
      </div>
    </form>
  );
}

type StorefrontProps = {
  action: Action;
  shop: {
    logoUrl: string | null;
    iconUrl: string | null;
    heroImageUrl: string | null;
    heroArtUrl: string | null;
    heroTitle: string | null;
    heroSubtitle: string | null;
    about: string | null;
    address: string | null;
  };
};

export function StorefrontForm({ action, shop }: StorefrontProps) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className={ui.form}>
      <div className={ui.row}>
        <ImageInput name="logo" label="Logo" currentUrl={shop.logoUrl} />
        <ImageInput name="icon" label="Browser tab icon (square)" currentUrl={shop.iconUrl} />
        <ImageInput name="hero" label="Banner photo (wide)" currentUrl={shop.heroImageUrl} shape="wide" />
        <ImageInput name="heroArt" label="Banner animation (beside the headline)" currentUrl={shop.heroArtUrl} />
      </div>
      <label className={ui.field}>
        <span className={ui.label}>Banner headline</span>
        <input className={ui.input} name="heroTitle" maxLength={80} defaultValue={shop.heroTitle ?? ""} placeholder="Home-made food, made with love" />
      </label>
      <label className={ui.field}>
        <span className={ui.label}>Banner text</span>
        <input
          className={ui.input}
          name="heroSubtitle"
          maxLength={160}
          defaultValue={shop.heroSubtitle ?? ""}
          placeholder="Fresh meals and traditional podi from our kitchen in Madurai"
        />
      </label>
      <label className={ui.field}>
        <span className={ui.label}>About the shop</span>
        <textarea className={ui.input} name="about" maxLength={600} defaultValue={shop.about ?? ""} />
      </label>
      <label className={ui.field}>
        <span className={ui.label}>Shop address</span>
        <input className={ui.input} name="address" maxLength={200} defaultValue={shop.address ?? ""} />
      </label>
      <FormMessage state={state} />
      <div>
        <SubmitButton>Save storefront</SubmitButton>
      </div>
    </form>
  );
}

type OrderingProps = {
  action: Action;
  shop: {
    isAcceptingOrders: boolean;
    openTime: string | null;
    closeTime: string | null;
    openDays: string;
    deliveryEnabled: boolean;
    pickupEnabled: boolean;
    deliveryFee: string;
    freeDeliveryAbove: string;
    minOrder: string;
    deliveryPincodes: string | null;
    deliveryNote: string | null;
    notifyEmail: string | null;
  };
};

export function OrderingForm({ action, shop }: OrderingProps) {
  const [state, formAction] = useActionState(action, undefined);
  const openDays = shop.openDays.split(",");

  return (
    <form action={formAction} className={ui.form}>
      <label className={ui.checkbox}>
        <input type="checkbox" name="isAcceptingOrders" defaultChecked={shop.isAcceptingOrders} />
        <strong>Accepting orders</strong> (turn off to pause the shop, e.g. on holidays)
      </label>

      <fieldset className={ui.form}>
        <legend className={ui.label}>Opening hours (India time)</legend>
        <div className={ui.row}>
          <label className={ui.field}>
            <span className={ui.hint}>Opens</span>
            <input className={ui.input} name="openTime" type="time" defaultValue={shop.openTime ?? ""} />
          </label>
          <label className={ui.field}>
            <span className={ui.hint}>Closes (last order)</span>
            <input className={ui.input} name="closeTime" type="time" defaultValue={shop.closeTime ?? ""} />
          </label>
        </div>
        <div className={styles.days}>
          {WEEK_DAYS.map((day) => (
            <label key={day.id} className={ui.checkbox}>
              <input type="checkbox" name="openDays" value={day.id} defaultChecked={openDays.includes(day.id)} />
              {day.label}
            </label>
          ))}
        </div>
        <span className={ui.hint}>Leave the times empty to take orders at any time.</span>
      </fieldset>

      <fieldset className={ui.form}>
        <legend className={ui.label}>Delivery and pickup</legend>
        <label className={ui.checkbox}>
          <input type="checkbox" name="deliveryEnabled" defaultChecked={shop.deliveryEnabled} />
          Home delivery
        </label>
        <label className={ui.checkbox}>
          <input type="checkbox" name="pickupEnabled" defaultChecked={shop.pickupEnabled} />
          Customers can pick up from the shop
        </label>
        <div className={ui.row}>
          <label className={ui.field}>
            <span className={ui.hint}>Delivery fee (₹)</span>
            <input className={ui.input} name="deliveryFee" type="number" min="0" step="1" defaultValue={shop.deliveryFee} />
          </label>
          <label className={ui.field}>
            <span className={ui.hint}>Free delivery above (₹)</span>
            <input
              className={ui.input}
              name="freeDeliveryAbove"
              type="number"
              min="0"
              step="1"
              defaultValue={shop.freeDeliveryAbove}
              placeholder="No free delivery"
            />
          </label>
          <label className={ui.field}>
            <span className={ui.hint}>Minimum order (₹)</span>
            <input className={ui.input} name="minOrder" type="number" min="0" step="1" defaultValue={shop.minOrder} />
          </label>
        </div>
        <label className={ui.field}>
          <span className={ui.hint}>PIN codes you deliver to (leave empty to deliver anywhere)</span>
          <textarea
            className={ui.input}
            name="deliveryPincodes"
            defaultValue={shop.deliveryPincodes ?? ""}
            placeholder="625001, 625002, 625020"
          />
        </label>
        <label className={ui.field}>
          <span className={ui.hint}>Delivery note shown at checkout</span>
          <input
            className={ui.input}
            name="deliveryNote"
            maxLength={140}
            defaultValue={shop.deliveryNote ?? ""}
            placeholder="Delivered within 2 hours in Madurai"
          />
        </label>
      </fieldset>

      <label className={ui.field}>
        <span className={ui.label}>Send new-order alerts to</span>
        <input className={ui.input} name="notifyEmail" type="email" defaultValue={shop.notifyEmail ?? ""} placeholder="Your email" />
        <span className={ui.hint}>Leave empty to use the support email or the owner&apos;s login email.</span>
      </label>

      <FormMessage state={state} />
      <div>
        <SubmitButton>Save ordering settings</SubmitButton>
      </div>
    </form>
  );
}

type ComplianceProps = {
  action: Action;
  shop: {
    legalName: string | null;
    gstin: string | null;
    shopState: string | null;
    fssaiNumber: string | null;
    defaultGstRate: number;
  };
};

export function ComplianceForm({ action, shop }: ComplianceProps) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className={ui.form}>
      <div className={ui.row}>
        <label className={ui.field}>
          <span className={ui.label}>Registered business name</span>
          <input className={ui.input} name="legalName" defaultValue={shop.legalName ?? ""} placeholder="As on GST or FSSAI certificate" />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>FSSAI licence / registration no.</span>
          <input className={ui.input} name="fssaiNumber" inputMode="numeric" maxLength={14} defaultValue={shop.fssaiNumber ?? ""} />
          <span className={ui.hint}>Food businesses must show this. It appears in the store footer and on bills.</span>
        </label>
      </div>
      <div className={ui.row}>
        <label className={ui.field}>
          <span className={ui.label}>GSTIN (if registered)</span>
          <input className={ui.input} name="gstin" maxLength={15} defaultValue={shop.gstin ?? ""} placeholder="33ABCDE1234F1Z5" />
          <span className={ui.hint}>With a GSTIN, bills become tax invoices with CGST/SGST.</span>
        </label>
        <label className={ui.field}>
          <span className={ui.label}>State of registration</span>
          <StateSelect name="shopState" defaultValue={shop.shopState} />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Default GST rate</span>
          <select className={ui.input} name="defaultGstRate" defaultValue={shop.defaultGstRate}>
            {GST_RATES.map((rate) => (
              <option key={rate} value={rate}>
                {rate}%
              </option>
            ))}
          </select>
          <span className={ui.hint}>Most food items and restaurant services are 5%. Check with your accountant.</span>
        </label>
      </div>
      <FormMessage state={state} />
      <div>
        <SubmitButton>Save business details</SubmitButton>
      </div>
    </form>
  );
}
