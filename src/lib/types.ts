import { z } from 'zod';

// ── Channel schema ──────────────────────────────────────────

export const ChannelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().min(1),
  enabled: z.boolean(),
});
export type Channel = z.infer<typeof ChannelSchema>;
export const ChannelArraySchema = z.array(ChannelSchema);

// ── Runtime message schemas ─────────────────────────────────

export const GetAllMessageSchema = z.object({ action: z.literal('get_all') });

export const SetMessageSchema = z.object({
  action: z.literal('set'),
  channelId: z.string().min(1),
  enabled: z.boolean(),
});

export const SetAllMessageSchema = z.object({
  action: z.literal('set_all'),
  enabled: z.boolean(),
});

export const ExtensionMessageSchema = z.discriminatedUnion('action', [
  GetAllMessageSchema,
  SetMessageSchema,
  SetAllMessageSchema,
]);
export type ExtensionMessage = z.infer<typeof ExtensionMessageSchema>;

// ── Tab update payloads (sent to content script) ────────────

export const SetAllUpdateSchema = z.object({
  type: z.literal('set_all'),
  enabled: z.boolean(),
});

export const SetUpdateSchema = z.object({
  type: z.literal('set'),
  channelId: z.string().min(1),
});

export const TabUpdateSchema = z.discriminatedUnion('type', [
  SetAllUpdateSchema,
  SetUpdateSchema,
]);
export type TabUpdate = z.infer<typeof TabUpdateSchema>;
