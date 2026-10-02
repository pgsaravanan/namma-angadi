import type { ShopRole } from "@/generated/prisma/enums";

export const PERMISSIONS = {
  "dashboard:view": ["SUPER_ADMIN", "ADMIN"],
  "products:manage": ["SUPER_ADMIN", "ADMIN"],
  "orders:manage": ["SUPER_ADMIN", "ADMIN"],
  "orders:refund": ["SUPER_ADMIN"],
  "coupons:manage": ["SUPER_ADMIN"],
  "marketing:manage": ["SUPER_ADMIN", "ADMIN"],
  "reviews:manage": ["SUPER_ADMIN", "ADMIN"],
  "messages:manage": ["SUPER_ADMIN", "ADMIN"],
  "team:manage": ["SUPER_ADMIN"],
  "settings:manage": ["SUPER_ADMIN"],
} as const satisfies Record<string, readonly ShopRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: ShopRole, permission: Permission) {
  return (PERMISSIONS[permission] as readonly ShopRole[]).includes(role);
}

export const ROLE_LABELS: Record<ShopRole, string> = {
  SUPER_ADMIN: "Super admin",
  ADMIN: "Admin",
};
