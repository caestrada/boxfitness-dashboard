import { z } from "zod/v3";

export const emailAuthSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(72, "Passwords must be 72 characters or less."),
});
