import { CopyLink } from "./CopyLink";
import ui from "./ui.module.scss";

export type FormState = { error?: string; success?: string; link?: string } | undefined;

export function FormMessage({ state }: { state: FormState }) {
  if (state?.error) return <p role="alert" className={`${ui.message} ${ui.error}`}>{state.error}</p>;
  if (state?.success) {
    return (
      <div role="status" className={`${ui.message} ${ui.success}`}>
        <p className={ui.flush}>{state.success}</p>
        {state.link && <CopyLink link={state.link} />}
      </div>
    );
  }
  return null;
}
