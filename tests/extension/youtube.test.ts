/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';

// Simulates the content script's filtering logic
function filterVideos(blockedChannelIds: string[]) {
  const lowerBlocked = blockedChannelIds.map(id => id.toLowerCase());
  const links = document.querySelectorAll<HTMLAnchorElement>(
    'ytd-video-renderer a.yt-formatted-string.yt-simple-endpoint, yt-formatted-string.ytd-channel-name',
  );

  for (const el of links) {
    const txt = el.getAttribute('href') ?? el.getAttribute('title') ?? '';
    const found = txt.replace('/user/', '').replace('/channel/', '').replace('/@', '').toLowerCase();
    if (lowerBlocked.indexOf(found) > -1) {
      const parent = el.closest('ytd-video-renderer, ytd-compact-video-renderer');
      parent?.remove();
    }
  }
}

describe('youtube content script — video filtering (group-based)', () => {
  it('removes video renderers matching a channelId from a group', () => {
    document.body.innerHTML = `
      <ytd-video-renderer>
        <a class="yt-formatted-string yt-simple-endpoint" href="/user/CNN">CNN</a>
      </ytd-video-renderer>
    `;

    filterVideos(['CNN']);

    expect(document.querySelector('ytd-video-renderer')).toBeNull();
  });

  it('removes all videos matching any channelId from a multi-id group', () => {
    document.body.innerHTML = `
      <ytd-video-renderer>
        <a class="yt-formatted-string yt-simple-endpoint" href="/channel/CBS">CBS</a>
      </ytd-video-renderer>
      <ytd-video-renderer>
        <a class="yt-formatted-string yt-simple-endpoint" href="/channel/CBSNewsOnline">CBS News</a>
      </ytd-video-renderer>
      <ytd-video-renderer>
        <a class="yt-formatted-string yt-simple-endpoint" href="/channel/Cbsfacethenation1">Face the Nation</a>
      </ytd-video-renderer>
    `;

    // CBS group has multiple channelIds
    filterVideos(['CBS', 'CBSNewsOnline', 'CBSEveningNews', 'CBSThisMorning', 'Cbsfacethenation1', 'cbstvdinsideedition']);

    expect(document.querySelectorAll('ytd-video-renderer').length).toBe(0);
  });

  it('does not remove video renderers not in any group', () => {
    document.body.innerHTML = `
      <ytd-video-renderer>
        <a class="yt-formatted-string yt-simple-endpoint" href="/user/SmallCreator">Small Creator</a>
      </ytd-video-renderer>
    `;

    filterVideos(['CNN']);

    expect(document.querySelector('ytd-video-renderer')).not.toBeNull();
  });

  it('handles case-insensitive matching', () => {
    document.body.innerHTML = `
      <ytd-video-renderer>
        <a class="yt-formatted-string yt-simple-endpoint" href="/user/CNN">CNN</a>
      </ytd-video-renderer>
    `;

    filterVideos(['cnn']);

    expect(document.querySelector('ytd-video-renderer')).toBeNull();
  });

  it('removes videos matching @handle format', () => {
    document.body.innerHTML = `
      <ytd-video-renderer>
        <a class="yt-formatted-string yt-simple-endpoint" href="/@cnn">CNN</a>
      </ytd-video-renderer>
    `;

    filterVideos(['cnn']);

    expect(document.querySelector('ytd-video-renderer')).toBeNull();
  });

  it('removes videos matching on title attribute', () => {
    document.body.innerHTML = `
      <ytd-video-renderer>
        <yt-formatted-string class="ytd-channel-name" title="FoxNewsChannel">Fox News</yt-formatted-string>
      </ytd-video-renderer>
    `;

    filterVideos(['FoxNewsChannel']);

    expect(document.querySelector('ytd-video-renderer')).toBeNull();
  });

  it('removes mixed matching — some from group A, some from group B', () => {
    document.body.innerHTML = `
      <ytd-video-renderer>
        <a class="yt-formatted-string yt-simple-endpoint" href="/user/BBC">BBC</a>
      </ytd-video-renderer>
      <ytd-video-renderer>
        <a class="yt-formatted-string yt-simple-endpoint" href="/user/bbcnews">BBC News</a>
      </ytd-video-renderer>
      <ytd-video-renderer>
        <a class="yt-formatted-string yt-simple-endpoint" href="/user/IndieCreator">Indie</a>
      </ytd-video-renderer>
      <ytd-video-renderer>
        <a class="yt-formatted-string yt-simple-endpoint" href="/channel/FoxNewsChannel">Fox</a>
      </ytd-video-renderer>
    `;

    // BBC group + Fox group
    filterVideos(['BBC', 'bbcnews', 'FoxNewsChannel', 'FoxBusinessNetwork']);

    expect(document.querySelectorAll('ytd-video-renderer').length).toBe(1);
  });

  it('does nothing when there are no video results on the page', () => {
    document.body.innerHTML = '<div id="page">No results</div>';

    filterVideos(['CNN']);

    expect(document.body.innerHTML).toBe('<div id="page">No results</div>');
  });
});
