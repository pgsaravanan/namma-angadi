export const FOOD_TYPES = [
  { id: "veg", label: "Veg" },
  { id: "nonveg", label: "Non-veg" },
  { id: "egg", label: "Contains egg" },
] as const;

export type FoodType = (typeof FOOD_TYPES)[number]["id"];

export function isFoodType(value: unknown): value is FoodType {
  return FOOD_TYPES.some((type) => type.id === value);
}

export const GST_RATES = [0, 5, 12, 18, 28] as const;
