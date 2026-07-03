import { describe, it, expect } from 'vitest';
import { CHANNEL_DEFINITIONS } from '$lib/data/channels';
import { ChannelGroupSchema } from '$lib/types';

const GROUP_COUNT = 52;

describe('CHANNEL_DEFINITIONS', () => {
  it(`has exactly ${GROUP_COUNT} entries`, () => {
    expect(CHANNEL_DEFINITIONS.length).toBe(GROUP_COUNT);
  });

  it('every entry has a unique id', () => {
    const ids = CHANNEL_DEFINITIONS.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry has a unique name', () => {
    const names = CHANNEL_DEFINITIONS.map(c => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('every entry passes ChannelGroupSchema (with enabled added)', () => {
    for (const entry of CHANNEL_DEFINITIONS) {
      const result = ChannelGroupSchema.safeParse({ ...entry, enabled: true });
      expect(result.success).toBe(true);
    }
  });

  it('every icon path starts with img/channels/', () => {
    for (const entry of CHANNEL_DEFINITIONS) {
      expect(entry.icon).toMatch(/^img\/channels\//);
    }
  });

  it('every icon ends with .jpg', () => {
    for (const entry of CHANNEL_DEFINITIONS) {
      expect(entry.icon).toMatch(/\.jpg$/);
    }
  });

  it('every channelIds array has at least one entry', () => {
    for (const entry of CHANNEL_DEFINITIONS) {
      expect(entry.channelIds.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('no duplicate channelIds across groups', () => {
    const allIds = CHANNEL_DEFINITIONS.flatMap(c => c.channelIds);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('includes expected groups', () => {
    const names = CHANNEL_DEFINITIONS.map(c => c.name);
    expect(names).toContain('CNN');
    expect(names).toContain('BBC');
    expect(names).toContain('Fox News');
    expect(names).toContain('MSNBC');
    expect(names).toContain('VICE');
    expect(names).toContain('Bloomberg');
  });

  it('groups correctly consolidate related channels', () => {
    const cbs = CHANNEL_DEFINITIONS.find(c => c.id === 'cbs');
    expect(cbs).toBeDefined();
    expect(cbs!.channelIds.length).toBeGreaterThan(1);
    expect(cbs!.channelIds).toContain('CBS');

    const bbc = CHANNEL_DEFINITIONS.find(c => c.id === 'bbc');
    expect(bbc).toBeDefined();
    expect(bbc!.channelIds).toContain('BBC');
    expect(bbc!.channelIds).toContain('bbcnews');
  });
});
