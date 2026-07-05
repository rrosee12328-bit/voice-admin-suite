import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { deliverPasswordResetEmail } from "@/lib/password-reset-email";

const InputSchema = z.object({
  email: z.string().email().max(320),
  redirectTo: z.string().url().max(2048),
});

export const sendPasswordResetEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => deliverPasswordResetEmail(data));
