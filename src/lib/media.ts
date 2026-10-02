export const VIDEO_TYPES = { "video/mp4": "mp4", "video/webm": "webm" } as const;

export type VideoType = keyof typeof VIDEO_TYPES;

export const MAX_VIDEO_BYTES = 30 * 1024 * 1024;

export function isVideoType(value: string): value is VideoType {
  return value in VIDEO_TYPES;
}

export function isVideoUrl(url: string | null | undefined) {
  return Boolean(url && /\.(mp4|webm)(\?|$)/i.test(url));
}
