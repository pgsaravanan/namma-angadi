"use client";

import { createContext, useContext, useTransition, type ComponentProps } from "react";
import { useFormStatus } from "react-dom";

const SavingContext = createContext(false);

export function useFormSaving() {
  const { pending } = useFormStatus();
  const saving = useContext(SavingContext);
  return pending || saving;
}

type Props = Omit<ComponentProps<"form">, "action"> & { action: (formData: FormData) => void };

export function KeepForm({ action, onSubmit, children, ...props }: Props) {
  const [saving, startSaving] = useTransition();
  return (
    <SavingContext.Provider value={saving}>
      <form
        {...props}
        onSubmit={(event) => {
          onSubmit?.(event);
          if (event.defaultPrevented) return;
          event.preventDefault();
          const submitter = (event.nativeEvent as SubmitEvent).submitter;
          const formData = new FormData(event.currentTarget, submitter);
          startSaving(() => action(formData));
        }}
      >
        {children}
      </form>
    </SavingContext.Provider>
  );
}
