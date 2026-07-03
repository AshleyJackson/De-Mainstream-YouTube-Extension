import { describe, it, expect } from 'vitest';
import {
  ChannelGroupSchema,
  ChannelGroupArraySchema,
  GetAllMessageSchema,
  SetMessageSchema,
  SetAllMessageSchema,
  ExtensionMessageSchema,
  SetUpdateSchema,
  SetAllUpdateSchema,
  TabUpdateSchema,
} from '$lib/types';

describe('ChannelGroupSchema', () => {
  it('validates a valid group with single channelId', () => {
    const result = ChannelGroupSchema.safeParse({
      id: 'cnn', name: 'CNN', icon: 'img/channels/cnn.jpg', channelIds: ['CNN'], enabled: true,
    });
    expect(result.success).toBe(true);
  });

  it('validates a valid group with multiple channelIds', () => {
    const result = ChannelGroupSchema.safeParse({
      id: 'cbs', name: 'CBS', icon: 'img/channels/cbs.jpg',
      channelIds: ['CBS', 'CBSNewsOnline', 'CBSEveningNews'], enabled: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing id', () => {
    const result = ChannelGroupSchema.safeParse({
      name: 'CNN', icon: 'img/channels/cnn.jpg', channelIds: ['CNN'], enabled: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty id', () => {
    const result = ChannelGroupSchema.safeParse({
      id: '', name: 'CNN', icon: 'img/channels/cnn.jpg', channelIds: ['CNN'], enabled: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing channelIds', () => {
    const result = ChannelGroupSchema.safeParse({
      id: 'cnn', name: 'CNN', icon: 'img/channels/cnn.jpg', enabled: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty channelIds array', () => {
    const result = ChannelGroupSchema.safeParse({
      id: 'cnn', name: 'CNN', icon: 'img/channels/cnn.jpg', channelIds: [], enabled: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty string in channelIds', () => {
    const result = ChannelGroupSchema.safeParse({
      id: 'cnn', name: 'CNN', icon: 'img/channels/cnn.jpg', channelIds: [''], enabled: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-boolean enabled', () => {
    const result = ChannelGroupSchema.safeParse({
      id: 'cnn', name: 'CNN', icon: 'img/channels/cnn.jpg', channelIds: ['CNN'], enabled: 'yes',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing icon', () => {
    const result = ChannelGroupSchema.safeParse({
      id: 'cnn', name: 'CNN', channelIds: ['CNN'], enabled: true,
    });
    expect(result.success).toBe(false);
  });
});

describe('ChannelGroupArraySchema', () => {
  it('validates an array of groups', () => {
    const data = [
      { id: 'cnn', name: 'CNN', icon: 'img/channels/cnn.jpg', channelIds: ['CNN'], enabled: true },
      { id: 'bbc', name: 'BBC', icon: 'img/channels/bbc.jpg', channelIds: ['BBC', 'bbcnews'], enabled: false },
    ];
    expect(ChannelGroupArraySchema.safeParse(data).success).toBe(true);
  });

  it('rejects non-array input', () => {
    expect(ChannelGroupArraySchema.safeParse('not-an-array').success).toBe(false);
  });

  it('rejects array with invalid item', () => {
    const data = [
      { id: 'cnn', name: 'CNN', icon: 'img/channels/cnn.jpg', channelIds: ['CNN'], enabled: true },
      { id: '', name: 'BBC', icon: 'img/channels/bbc.jpg', channelIds: ['BBC'], enabled: false },
    ];
    expect(ChannelGroupArraySchema.safeParse(data).success).toBe(false);
  });
});

describe('Extension messages', () => {
  describe('GetAllMessageSchema', () => {
    it('validates get_all', () => {
      expect(GetAllMessageSchema.safeParse({ action: 'get_all' }).success).toBe(true);
    });

    it('rejects wrong action', () => {
      expect(GetAllMessageSchema.safeParse({ action: 'get' }).success).toBe(false);
    });
  });

  describe('SetMessageSchema', () => {
    it('validates set message', () => {
      expect(SetMessageSchema.safeParse({ action: 'set', groupId: 'cnn', enabled: false }).success).toBe(true);
    });

    it('rejects empty groupId', () => {
      expect(SetMessageSchema.safeParse({ action: 'set', groupId: '', enabled: false }).success).toBe(false);
    });

    it('rejects missing enabled', () => {
      expect(SetMessageSchema.safeParse({ action: 'set', groupId: 'cnn' }).success).toBe(false);
    });
  });

  describe('SetAllMessageSchema', () => {
    it('validates set_all message', () => {
      expect(SetAllMessageSchema.safeParse({ action: 'set_all', enabled: true }).success).toBe(true);
    });
  });

  describe('ExtensionMessageSchema (discriminated union)', () => {
    it('accepts get_all', () => {
      expect(ExtensionMessageSchema.safeParse({ action: 'get_all' }).success).toBe(true);
    });

    it('accepts set', () => {
      expect(ExtensionMessageSchema.safeParse({ action: 'set', groupId: 'bbc', enabled: true }).success).toBe(true);
    });

    it('accepts set_all', () => {
      expect(ExtensionMessageSchema.safeParse({ action: 'set_all', enabled: false }).success).toBe(true);
    });

    it('rejects unknown action', () => {
      expect(ExtensionMessageSchema.safeParse({ action: 'unknown' }).success).toBe(false);
    });
  });
});

describe('TabUpdate schemas', () => {
  it('validates set_all update', () => {
    expect(SetAllUpdateSchema.safeParse({ type: 'set_all', enabled: true }).success).toBe(true);
  });

  it('validates set update', () => {
    expect(SetUpdateSchema.safeParse({ type: 'set', groupId: 'cnn' }).success).toBe(true);
  });

  it('rejects set update missing groupId', () => {
    expect(SetUpdateSchema.safeParse({ type: 'set' }).success).toBe(false);
  });

  describe('TabUpdateSchema (discriminated union)', () => {
    it('accepts set_all', () => {
      expect(TabUpdateSchema.safeParse({ type: 'set_all', enabled: false }).success).toBe(true);
    });

    it('accepts set', () => {
      expect(TabUpdateSchema.safeParse({ type: 'set', groupId: 'bbc' }).success).toBe(true);
    });

    it('rejects unknown type', () => {
      expect(TabUpdateSchema.safeParse({ type: 'unknown' }).success).toBe(false);
    });
  });
});
