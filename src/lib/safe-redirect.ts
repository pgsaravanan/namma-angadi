const LOCAL_PATH = /^\/(?![\/\\])[^\\\s]*$/;

export function safeLocalPath(value: unknown, fallback = "/account") {
  return typeof value === "string" && LOCAL_PATH.test(value) ? value : fallback;
}
