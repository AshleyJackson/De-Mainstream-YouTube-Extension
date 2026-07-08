export interface ChannelGroup {
  id: string;
  name: string;
  icon: string;
  channelIds: string[];
  enabled: boolean;
}

// ── Custom channel messages ──────────────────────────────────

export interface AddCustomMessage {
  action: "add_custom";
  channelId: string;
}

export interface RemoveCustomMessage {
  action: "remove_custom";
  channelId: string;
}

export interface GetCustomMessage {
  action: "get_custom";
}

// ── Tab update payloads ──────────────────────────────────────

export interface RefreshUpdate {
  type: "refresh";
}
