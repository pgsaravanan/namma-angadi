import ui from "./ui.module.scss";

export type FormState = { error?: string; success?: string } | undefined;

export function FormMessage({ state }: { state: FormState }) {
  if (state?.error) return <p role="alert" className={`${ui.message} ${ui.error}`}>{state.error}</p>;
  if (state?.success) return <p role="status" className={`${ui.message} ${ui.success}`}>{state.success}</p>;
  return null;
}
