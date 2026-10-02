import styles from "./WhatsAppButton.module.scss";

export function WhatsAppButton({ number, shopName }: { number: string; shopName: string }) {
  const text = encodeURIComponent(`Hi ${shopName}, I have a question.`);
  return (
    <a
      href={`https://wa.me/91${number}?text=${text}`}
      className={styles.button}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Chat with ${shopName} on WhatsApp`}
    >
      <svg viewBox="0 0 32 32" aria-hidden className={styles.icon}>
        <path
          fill="currentColor"
          d="M16.04 3C8.86 3 3.02 8.83 3.02 16c0 2.3.6 4.54 1.75 6.52L3 29l6.66-1.74A13 13 0 0 0 16.04 29C23.2 29 29.04 23.17 29.04 16S23.2 3 16.04 3Zm0 23.62c-2.01 0-3.98-.54-5.7-1.56l-.41-.24-3.95 1.03 1.05-3.85-.27-.4A10.6 10.6 0 0 1 5.4 16c0-5.86 4.77-10.62 10.64-10.62 5.86 0 10.63 4.76 10.63 10.62 0 5.86-4.77 10.62-10.63 10.62Zm5.83-7.95c-.32-.16-1.89-.93-2.18-1.04-.3-.1-.51-.16-.72.16-.21.32-.83 1.04-1.02 1.25-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59a9.64 9.64 0 0 1-1.78-2.2c-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.18.21-.32.32-.53.1-.21.05-.4-.03-.56-.08-.16-.72-1.73-.99-2.37-.26-.62-.52-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.12 1.09-1.12 2.66 0 1.57 1.15 3.09 1.3 3.3.16.21 2.25 3.43 5.45 4.81.76.33 1.36.53 1.82.67.77.24 1.46.21 2.01.13.61-.09 1.89-.77 2.15-1.52.27-.75.27-1.39.19-1.52-.08-.13-.29-.21-.61-.37Z"
        />
      </svg>
    </a>
  );
}
