import { z } from "zod";
import { providerHostKey } from "@/lib/dedupe-providers";

export const websiteStatusSchema = z.enum([
  "ok",
  "broken",
  "redirect",
  "blocked",
]);

export const websiteCheckSchema = z
  .object({
    input_url: z.string().optional(),
    checked_at: z.string().optional(),
    http_status: z.number().optional(),
    final_url: z.string().optional(),
    method: z.string().optional(),
    error: z.string().optional(),
  })
  .catchall(z.unknown());

export const sandboxProviderSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  website: z.url(),
  profile: z.string().nullable().optional(),
  category_guess: z.string().optional(),
  sources: z.array(z.string()).optional(),
  extra: z.boolean().optional(),
  website_status: websiteStatusSchema.optional(),
  website_check: websiteCheckSchema.optional(),
  logo_url: z.url().optional(),
  display_name: z.string().min(1).optional(),
  discovery: z.array(z.string()).optional(),
  isolation: z.array(z.string()).optional(),
  funding: z.array(z.string()).optional(),
});

export const sandboxProvidersSchema = z
  .array(sandboxProviderSchema)
  .superRefine((rows, ctx) => {
    const hosts = new Map<string, number>();
    const slugs = new Map<string, number>();

    rows.forEach((row, index) => {
      const host = providerHostKey(row);
      if (host) {
        const other = hosts.get(host);
        if (other !== undefined) {
          ctx.addIssue({
            code: "custom",
            message: `duplicate provider host ${host} (rows ${other} and ${index})`,
            path: [index, "website"],
          });
        } else {
          hosts.set(host, index);
        }
      }

      const slug = row.slug.toLowerCase();
      const slugIdx = slugs.get(slug);
      if (slugIdx !== undefined) {
        ctx.addIssue({
          code: "custom",
          message: `duplicate slug ${slug} (rows ${slugIdx} and ${index})`,
          path: [index, "slug"],
        });
      } else {
        slugs.set(slug, index);
      }
    });
  });

export type WebsiteStatus = z.infer<typeof websiteStatusSchema>;
export type SandboxProvider = z.infer<typeof sandboxProviderSchema>;

export function formatProviderParseError(error: z.ZodError): string {
  const first = error.issues[0];
  if (!first) return "unknown validation error";
  const where = first.path.length ? ` at ${first.path.join(".")}` : "";
  return `${first.message}${where}`;
}
