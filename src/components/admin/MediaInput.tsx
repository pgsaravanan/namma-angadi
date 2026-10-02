"use client";

import { useEffect, useRef, useState } from "react";
import imageStyles from "@/components/ui/ImageInput.module.scss";
import ui from "@/components/ui/ui.module.scss";
import { isVideoType, isVideoUrl, MAX_VIDEO_BYTES } from "@/lib/media";
import { startVideoUpload, uploadVideoToServer } from "@/app/s/[shop]/admin/(panel)/promotions/media-actions";
import styles from "./AdminShell.module.scss";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

type Kind = "promotions" | "stories";
type Upload = { state: "idle" } | { state: "uploading"; percent: number } | { state: "done"; url: string };

function putWithProgress(url: string, file: File, onProgress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("Content-Type", file.type);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => (request.status < 300 ? resolve() : reject(new Error(String(request.status))));
    request.onerror = () => reject(new Error("network"));
    request.send(file);
  });
}

export function MediaInput({
  name,
  label,
  kind,
  currentUrl,
  required,
}: {
  name: string;
  label: string;
  kind: Kind;
  currentUrl?: string | null;
  required?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const guardRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ url: string; video: boolean } | null>(null);
  const [upload, setUpload] = useState<Upload>({ state: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);

  const uploading = upload.state === "uploading";
  const shownUrl = preview?.url ?? (removed ? null : (currentUrl ?? null));
  const shownIsVideo = preview ? preview.video : isVideoUrl(currentUrl);
  const missing = required && !shownUrl;

  useEffect(() => {
    guardRef.current?.setCustomValidity(
      uploading ? "Please wait for the video to finish uploading" : missing ? "Add a photo or video" : "",
    );
  }, [uploading, missing]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview.url);
  }, [preview]);

  const acceptRef = useRef<(file: File) => void>(() => {});
  useEffect(() => {
    const form = fileRef.current?.form;
    if (!form) return;
    let hovering = false;
    const enter = () => {
      hovering = true;
    };
    const leave = () => {
      hovering = false;
    };
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target instanceof Node ? event.target : null;
      const inForm = target ? form.contains(target) : false;
      if (!inForm && !(hovering && (target === document.body || target === null))) return;
      const typing = target instanceof HTMLElement && target.closest("input, textarea, [contenteditable='true']");
      if (typing && event.clipboardData?.types.includes("text/plain")) return;
      const item = Array.from(event.clipboardData?.items ?? []).find(
        (entry) => entry.kind === "file" && (entry.type.startsWith("image/") || entry.type.startsWith("video/")),
      );
      const file = item?.getAsFile();
      if (!file) return;
      event.preventDefault();
      acceptRef.current(file);
    };
    form.addEventListener("pointerenter", enter);
    form.addEventListener("pointerleave", leave);
    document.addEventListener("paste", onPaste);
    return () => {
      form.removeEventListener("pointerenter", enter);
      form.removeEventListener("pointerleave", leave);
      document.removeEventListener("paste", onPaste);
    };
  }, []);

  async function uploadVideo(file: File) {
    setUpload({ state: "uploading", percent: 0 });
    try {
      const target = await startVideoUpload(kind, file.type, file.size);
      if ("error" in target) throw new Error(target.error);
      if (target.uploadUrl) {
        await putWithProgress(target.uploadUrl, file, (percent) => setUpload({ state: "uploading", percent }));
        setUpload({ state: "done", url: target.mediaUrl });
      } else {
        const body = new FormData();
        body.append("video", file);
        const saved = await uploadVideoToServer(kind, body);
        if ("error" in saved) throw new Error(saved.error);
        setUpload({ state: "done", url: saved.mediaUrl });
      }
    } catch (uploadError) {
      setUpload({ state: "idle" });
      setPreview(null);
      setError(
        uploadError instanceof Error && uploadError.message.length > 12
          ? uploadError.message
          : "The video couldn't be uploaded. Please try again.",
      );
    }
  }

  function accept(file: File) {
    setError(null);
    const video = isVideoType(file.type);
    if (!video && !IMAGE_TYPES.includes(file.type)) {
      setError("Use a JPG, PNG, WebP or GIF image, or an MP4 / WebM video");
      return;
    }
    if (!video && file.size > MAX_IMAGE_BYTES) {
      setError("Images must be 4 MB or smaller");
      return;
    }
    if (video && file.size > MAX_VIDEO_BYTES) {
      setError("Videos must be 30 MB or smaller. Try a shorter clip.");
      return;
    }

    setRemoved(false);
    setPreview({ url: URL.createObjectURL(file), video });
    if (video) {
      if (fileRef.current) fileRef.current.value = "";
      void uploadVideo(file);
    } else {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      if (fileRef.current) fileRef.current.files = transfer.files;
      setUpload({ state: "idle" });
    }
  }

  useEffect(() => {
    acceptRef.current = (file: File) => {
      if (!uploading) accept(file);
    };
  });

  function undo() {
    if (fileRef.current) fileRef.current.value = "";
    setPreview(null);
    setUpload({ state: "idle" });
  }

  return (
    <fieldset className={imageStyles.field}>
      <legend className={ui.label}>{label}</legend>
      <div
        role="button"
        tabIndex={0}
        className={`${imageStyles.zone} ${imageStyles.wide}`}
        onClick={() => !uploading && fileRef.current?.click()}
        onKeyDown={(event) => {
          if ((event.key === "Enter" || event.key === " ") && !uploading) {
            event.preventDefault();
            fileRef.current?.click();
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          if (file && !uploading) accept(file);
        }}
      >
        {shownUrl ? (
          shownIsVideo ? (
            <video src={shownUrl} className={imageStyles.preview} muted loop autoPlay playsInline />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shownUrl} alt="" className={imageStyles.preview} />
          )
        ) : (
          <div className={imageStyles.prompt}>
            <strong>Paste a photo (⌘V / Ctrl+V)</strong>
            <span>or drop a photo, GIF or video here, or click to choose a file</span>
          </div>
        )}
        {uploading && (
          <div className={styles.uploadOverlay} role="status">
            <span className={styles.spinner} aria-hidden />
            Uploading video…{upload.percent > 0 && ` ${upload.percent}%`}
            {upload.percent > 0 && (
              <span className={styles.progress}>
                <progress max={100} value={upload.percent} />
              </span>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        className={imageStyles.hidden}
        type="file"
        name={name}
        accept={[...IMAGE_TYPES, "video/mp4", "video/webm"].join(",")}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) accept(file);
        }}
      />
      <input type="hidden" name={`${name}Video`} value={upload.state === "done" ? upload.url : ""} />
      <input ref={guardRef} className={styles.validityGuard} tabIndex={-1} aria-hidden value="" onChange={() => {}} required={uploading || missing} />

      <div className={imageStyles.actions}>
        {preview && !uploading && (
          <button type="button" className={`${ui.button} ${ui.secondary} ${ui.small}`} onClick={undo}>
            Undo
          </button>
        )}
        {currentUrl && !preview && !required && (
          <label className={ui.checkbox}>
            <input type="checkbox" name={`${name}Remove`} checked={removed} onChange={(event) => setRemoved(event.target.checked)} />
            Remove it
          </label>
        )}
        <span className={ui.hint}>
          Photos and GIFs up to 4 MB · MP4 or WebM videos up to 30 MB (short clips work best). You can paste anywhere in
          this form.
        </span>
      </div>
      {error && <p className={`${ui.message} ${ui.error}`}>{error}</p>}
    </fieldset>
  );
}
