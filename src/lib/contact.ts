import { z } from "zod";

export const CONTACT_TOPICS = [
  "Question about an order",
  "Bulk or function order",
  "Product question",
  "Feedback",
  "Something else",
] as const;

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  email: z.union([z.email("Enter a valid email"), z.literal("")]),
  topic: z.enum(CONTACT_TOPICS, { error: "Choose what your message is about" }),
  orderNumber: z.string().trim().regex(/^\d{0,8}$/, "Order number should be digits only"),
  message: z.string().trim().min(5, "Write a few words about your query").max(1500, "Keep it under 1500 characters"),
});
