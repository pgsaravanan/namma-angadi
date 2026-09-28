import "server-only";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const env = {
  get rootDomain() {
    return required("ROOT_DOMAIN");
  },
  get encryptionKey() {
    const key = Buffer.from(required("ENCRYPTION_KEY"), "base64");
    if (key.length !== 32) throw new Error("ENCRYPTION_KEY must be 32 bytes, base64 encoded");
    return key;
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
};
