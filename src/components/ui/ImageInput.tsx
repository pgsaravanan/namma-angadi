"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./ImageInput.module.scss";
import ui from "./ui.module.scss";

type Props = {
  name: string;
  label: string;
  currentUrl?: string | null;
  allowLink?: boolean;
  pasteAnywhere?: boolean;
  shape?: "square" | "wide";
};

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

function imageFrom(items: DataTransferItemList | null | undefined) {
  for (const item of Array.from(items ?? [])) {
    if (item.kind === "file" && item.type.startsWith("image/")) return item.getAsFile();
  }
  return null;
}

export function ImageInput({ name, label, currentUrl, allowLink, pasteAnywhere, shape = "square" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [removed, setRemoved] = useState(false);

  const acceptFile = useCallback((file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      setError("Use a JPG, PNG or WebP photo");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Photos must be 5 MB or smaller");
      return;
    }
    const transfer = new DataTransfer();
    transfer.items.add(file);
    if (inputRef.current) inputRef.current.files = transfer.files;
    setError(null);
    setRemoved(false);
    setPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(file);
    });
  }, []);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => {
    if (!pasteAnywhere) return;
    function onPaste(event: ClipboardEvent) {
      const file = imageFrom(event.clipboardData?.items);
      if (!file) return;
      event.preventDefault();
      acceptFile(file);
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [pasteAnywhere, acceptFile]);

  function clearSelection() {
    if (inputRef.current) inputRef.current.value = "";
    setPreview(null);
  }

  const shown = preview ?? (removed ? null : currentUrl);

  return (
    <fieldset className={styles.field}>
      <legend className={ui.label}>{label}</legend>
      <div
        role="button"
        tabIndex={0}
        className={[styles.zone, shape === "wide" && styles.wide, dragging && styles.dragging].filter(Boolean).join(" ")}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onPaste={(event) => {
          const file = imageFrom(event.clipboardData.items);
          if (file) {
            event.preventDefault();
            event.stopPropagation();
            acceptFile(file);
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (file) acceptFile(file);
        }}
      >
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="" className={styles.preview} />
        ) : (
          <div className={styles.prompt}>
            <strong>Paste a photo (⌘V / Ctrl+V)</strong>
            <span>or drop it here, or click to choose a file</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        className={styles.hidden}
        type="file"
        name={name}
        accept={ACCEPTED.join(",")}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) acceptFile(file);
        }}
      />
      <div className={styles.actions}>
        {preview && (
          <button type="button" className={`${ui.button} ${ui.secondary} ${ui.small}`} onClick={clearSelection}>
            Undo new photo
          </button>
        )}
        {currentUrl && !preview && (
          <label className={ui.checkbox}>
            <input type="checkbox" name={`${name}Remove`} checked={removed} onChange={(event) => setRemoved(event.target.checked)} />
            Remove this photo
          </label>
        )}
        <span className={ui.hint}>JPG, PNG or WebP, up to 5 MB{pasteAnywhere ? ". You can paste anywhere on this page." : ""}</span>
      </div>
      {error && <p className={`${ui.message} ${ui.error}`}>{error}</p>}
      {allowLink && (
        <label className={ui.field}>
          <span className={ui.hint}>Or paste a link to a photo</span>
          <input
            className={ui.input}
            name={`${name}Link`}
            type="url"
            placeholder="https://…"
            defaultValue={currentUrl?.startsWith("https://") ? currentUrl : ""}
          />
        </label>
      )}
    </fieldset>
  );
}
