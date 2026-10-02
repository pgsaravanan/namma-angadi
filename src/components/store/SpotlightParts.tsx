"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Spotlight.module.scss";

export function Reveal({ className, children }: { className: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className={visible ? `${className} ${styles.visible}` : className}>
      {children}
    </section>
  );
}

function timeLeft(endsAt: number) {
  const ms = endsAt - Date.now();
  if (ms <= 0) return null;
  const minutes = Math.floor(ms / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${Math.max(1, minutes)}m`;
}

export function Countdown({ endsAt }: { endsAt: string }) {
  const end = new Date(endsAt).getTime();
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setLabel(timeLeft(end));
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, [end]);

  if (!label) return null;
  return <span className={styles.countdown}>Ends in {label}</span>;
}

export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={styles.code}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
    >
      Use code <strong>{code}</strong>
      <span className={styles.copyHint}>{copied ? "Copied!" : "Tap to copy"}</span>
    </button>
  );
}

const AUTO_SCROLL_MS = 4000;
const GLIDE_MS = 1400;
const RESUME_AFTER_TOUCH_MS = 6000;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

type Edges = { start: boolean; end: boolean };

export function AutoScrollTrack({
  className,
  children,
  axis = "x",
}: {
  className: string;
  children: React.ReactNode;
  axis?: "x" | "y";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<Edges>({ start: false, end: false });
  const [gliding, setGliding] = useState(false);

  useEffect(() => {
    const track = ref.current;
    if (!track) return;

    const vertical = axis === "y";
    const position = () => (vertical ? track.scrollTop : track.scrollLeft);
    const setPosition = (value: number) => {
      if (vertical) track.scrollTop = value;
      else track.scrollLeft = value;
    };
    const roomLeft = () => (vertical ? track.scrollHeight - track.clientHeight : track.scrollWidth - track.clientWidth);

    const updateEdges = () => {
      const room = roomLeft();
      const next = { start: position() > 4, end: position() < room - 4 };
      setEdges((current) => (current.start === next.start && current.end === next.end ? current : next));
    };
    updateEdges();
    track.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let pausedUntil = 0;
    let hovering = false;
    let frame = 0;

    const stopGlide = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      setGliding(false);
    };
    const pause = () => {
      pausedUntil = Date.now() + RESUME_AFTER_TOUCH_MS;
      stopGlide();
    };
    const enter = () => {
      hovering = true;
    };
    const leave = () => {
      hovering = false;
    };

    const glideTo = (target: number) => {
      const from = position();
      const startedAt = performance.now();
      track.classList.add(styles.gliding);
      setGliding(true);
      const step = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / GLIDE_MS);
        setPosition(from + (target - from) * easeInOut(progress));
        if (progress < 1) frame = requestAnimationFrame(step);
        else stopGlide();
      };
      frame = requestAnimationFrame(step);
    };

    const timer = reduceMotion
      ? 0
      : window.setInterval(() => {
          if (frame || hovering || document.hidden || Date.now() < pausedUntil) return;
          const room = roomLeft();
          if (room <= 4) return;
          const first = track.firstElementChild as HTMLElement | null;
          const card = (vertical ? first?.offsetHeight : first?.offsetWidth) ?? room / 2;
          const style = getComputedStyle(track);
          const gap = parseFloat(vertical ? style.rowGap : style.columnGap) || 0;
          const atEnd = position() >= room - 4;
          glideTo(atEnd ? 0 : Math.min(room, position() + card + gap));
        }, AUTO_SCROLL_MS);

    track.addEventListener("pointerdown", pause);
    track.addEventListener("touchstart", pause, { passive: true });
    track.addEventListener("wheel", pause, { passive: true });
    track.addEventListener("mouseenter", enter);
    track.addEventListener("mouseleave", leave);
    return () => {
      window.clearInterval(timer);
      stopGlide();
      track.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
      track.removeEventListener("pointerdown", pause);
      track.removeEventListener("touchstart", pause);
      track.removeEventListener("wheel", pause);
      track.removeEventListener("mouseenter", enter);
      track.removeEventListener("mouseleave", leave);
    };
  }, [axis]);

  const [both, start, end] =
    axis === "y" ? [styles.fadeBothY, styles.fadeTop, styles.fadeBottom] : [styles.fadeBoth, styles.fadeStart, styles.fadeEnd];
  const fade = edges.start && edges.end ? both : edges.start ? start : edges.end ? end : "";

  return (
    <div ref={ref} className={[className, fade, gliding && styles.gliding].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

const TICKER_SPEED = { x: 28, y: 16 };

export function TickerTrack({
  className,
  children,
  axis = "y",
}: {
  className: string;
  children: React.ReactNode;
  axis?: "x" | "y";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [looping, setLooping] = useState(false);
  const vertical = axis === "y";

  useEffect(() => {
    const track = ref.current;
    if (!track) return;
    const check = () => {
      const room = vertical ? track.scrollHeight - track.clientHeight : track.scrollWidth - track.clientWidth;
      if (!looping) setLooping(room > 4);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [looping, vertical]);

  useEffect(() => {
    const track = ref.current;
    if (!track || !looping || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const read = () => (vertical ? track.scrollTop : track.scrollLeft);
    const write = (value: number) => {
      if (vertical) track.scrollTop = value;
      else track.scrollLeft = value;
    };
    const loopLength = () => {
      const copy = track.querySelector<HTMLElement>("[data-loop-copy] > *");
      const first = track.firstElementChild as HTMLElement | null;
      if (!copy || !first) return 0;
      return vertical ? copy.offsetTop - first.offsetTop : copy.offsetLeft - first.offsetLeft;
    };

    let hovering = false;
    let pausedUntil = 0;
    let last = performance.now();
    let position = read();
    let frame = 0;

    const step = (now: number) => {
      const elapsed = Math.min(64, now - last);
      last = now;
      if (hovering || document.hidden || Date.now() < pausedUntil) {
        position = read();
      } else {
        const length = loopLength();
        position += (TICKER_SPEED[axis] * elapsed) / 1000;
        if (length > 0 && position >= length) position -= length;
        write(position);
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);

    const pause = () => {
      pausedUntil = Date.now() + RESUME_AFTER_TOUCH_MS;
    };
    const enter = () => {
      hovering = true;
    };
    const leave = () => {
      hovering = false;
    };
    track.addEventListener("pointerdown", pause);
    track.addEventListener("touchstart", pause, { passive: true });
    track.addEventListener("wheel", pause, { passive: true });
    track.addEventListener("mouseenter", enter);
    track.addEventListener("mouseleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      track.removeEventListener("pointerdown", pause);
      track.removeEventListener("touchstart", pause);
      track.removeEventListener("wheel", pause);
      track.removeEventListener("mouseenter", enter);
      track.removeEventListener("mouseleave", leave);
    };
  }, [looping, vertical, axis]);

  return (
    <div ref={ref} className={className} data-ticking={looping ? axis : undefined}>
      {children}
      {looping && (
        <div data-loop-copy aria-hidden className={styles.loopCopy}>
          {children}
        </div>
      )}
    </div>
  );
}
