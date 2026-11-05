import ui from "./ui.module.scss";

export function PageLoading() {
  return (
    <div className={ui.pageLoading} role="status">
      <span className={ui.spinner} aria-hidden />
      Loading…
    </div>
  );
}
