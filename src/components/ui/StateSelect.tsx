import { INDIAN_STATES } from "@/lib/india";
import ui from "./ui.module.scss";

type Props = { name: string; defaultValue?: string | null; required?: boolean; autoComplete?: string };

export function StateSelect({ name, defaultValue, required, autoComplete }: Props) {
  return (
    <select className={ui.input} name={name} required={required} defaultValue={defaultValue ?? ""} autoComplete={autoComplete}>
      <option value="" disabled={required}>
        Choose your state
      </option>
      {INDIAN_STATES.map((state) => (
        <option key={state} value={state}>
          {state}
        </option>
      ))}
    </select>
  );
}
