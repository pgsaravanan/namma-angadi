"use client";

import { useActionState } from "react";
import { FormMessage, type FormState } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import ui from "@/components/ui/ui.module.scss";
import { StateSelect } from "@/components/ui/StateSelect";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

export function SignInForm({ action, next }: { action: Action; next: string }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={ui.form}>
      <input type="hidden" name="next" value={next} />
      <label className={ui.field}>
        <span className={ui.label}>Email</span>
        <input className={ui.input} name="email" type="email" required autoComplete="email" />
      </label>
      <label className={ui.field}>
        <span className={ui.label}>Password</span>
        <input className={ui.input} name="password" type="password" required autoComplete="current-password" />
      </label>
      <FormMessage state={state} />
      <SubmitButton pendingText="Signing in…" block>
        Sign in
      </SubmitButton>
    </form>
  );
}

export function RegisterForm({ action, next }: { action: Action; next: string }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={ui.form}>
      <input type="hidden" name="next" value={next} />
      <label className={ui.field}>
        <span className={ui.label}>Full name</span>
        <input className={ui.input} name="name" required minLength={2} autoComplete="name" />
      </label>
      <label className={ui.field}>
        <span className={ui.label}>Email</span>
        <input className={ui.input} name="email" type="email" required autoComplete="email" />
      </label>
      <label className={ui.field}>
        <span className={ui.label}>Mobile number</span>
        <input className={ui.input} name="phone" required inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} autoComplete="tel-national" />
      </label>
      <label className={ui.field}>
        <span className={ui.label}>Password</span>
        <input className={ui.input} name="password" type="password" required minLength={8} autoComplete="new-password" />
      </label>
      <FormMessage state={state} />
      <SubmitButton pendingText="Creating account…" block>
        Create account
      </SubmitButton>
    </form>
  );
}

export function EmailOnlyForm({ action, button }: { action: Action; button: string }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={ui.form}>
      <label className={ui.field}>
        <span className={ui.label}>Email</span>
        <input className={ui.input} name="email" type="email" required autoComplete="email" />
      </label>
      <FormMessage state={state} />
      <SubmitButton block>{button}</SubmitButton>
    </form>
  );
}

export function NewPasswordForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={ui.form}>
      <label className={ui.field}>
        <span className={ui.label}>New password</span>
        <input className={ui.input} name="password" type="password" required minLength={8} autoComplete="new-password" />
      </label>
      <FormMessage state={state} />
      <SubmitButton block>Save new password</SubmitButton>
    </form>
  );
}

type Profile = {
  name: string;
  phone: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
};

export function ProfileForm({ action, profile }: { action: Action; profile: Profile }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={ui.form}>
      <div className={ui.row}>
        <label className={ui.field}>
          <span className={ui.label}>Full name</span>
          <input className={ui.input} name="name" required defaultValue={profile.name} autoComplete="name" />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Mobile number</span>
          <input className={ui.input} name="phone" required inputMode="numeric" maxLength={10} defaultValue={profile.phone} />
        </label>
      </div>
      <label className={ui.field}>
        <span className={ui.label}>House / flat number, building, street</span>
        <input className={ui.input} name="line1" defaultValue={profile.addressLine1 ?? ""} autoComplete="address-line1" />
      </label>
      <label className={ui.field}>
        <span className={ui.label}>Area, locality or landmark</span>
        <input className={ui.input} name="line2" defaultValue={profile.addressLine2 ?? ""} autoComplete="address-line2" />
      </label>
      <div className={ui.row}>
        <label className={ui.field}>
          <span className={ui.label}>Town / city</span>
          <input className={ui.input} name="city" defaultValue={profile.city ?? ""} autoComplete="address-level2" />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>PIN code</span>
          <input className={ui.input} name="pincode" inputMode="numeric" maxLength={6} defaultValue={profile.pincode ?? ""} />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>State</span>
          <StateSelect name="state" defaultValue={profile.state} />
        </label>
      </div>
      <FormMessage state={state} />
      <div>
        <SubmitButton>Save details</SubmitButton>
      </div>
    </form>
  );
}
