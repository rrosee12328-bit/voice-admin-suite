import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { deliverPasswordResetEmail, updatePasswordWithResetToken } from "@/lib/password-reset-email";

const InputSchema = z.object({
  email: z.string().email().max(320),
  redirectTo: z.string().url().max(2048),
});

export const sendPasswordResetEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => deliverPasswordResetEmail(data));

const SetPasswordSchema = z.object({
  resetToken: z.string().min(20).max(4096),
  password: z.string().min(8).max(128),
});

export const setPasswordWithResetToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SetPasswordSchema.parse(input))
  .handler(async ({ data }) => updatePasswordWithResetToken(data));
