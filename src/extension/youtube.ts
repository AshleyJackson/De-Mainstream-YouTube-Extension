// Content script — runs on YouTube pages to remove mainstream-media results

import { log } from './logger';

interface ChannelGroup {
  id: string;
  name: string;
  icon: string;
  channelIds: string[];
  enabled: boolean;
}

(function () {
  const searchForm = document.querySelector<HTMLFormElement>('#search-form');
  const searchFormInput = searchForm?.querySelector<HTMLInputElement>('#search');

  let blockedChannelIds: string[] = [];
  let blockedDisplayNames: string[] = [];
  let addedDailyTopLink = false;
  let observingTargetNode = false;

  log.info('Content script injected', { url: window.location.href });

  function getGroups(callback?: () => void): void {
    log.debug('Fetching groups from background...');
    chrome.runtime.sendMessage({ action: 'get_all' }, (values: unknown) => {
      if (!Array.isArray(values)) {
        log.warn('Received non-array response from background', { type: typeof values });
        return;
      }

      const groups = values as ChannelGroup[];
      const enabledGroups = groups.filter((g) => g.enabled);
      log.info('Received groups', { total: groups.length, enabled: enabledGroups.length });

      blockedChannelIds = enabledGroups
        .flatMap((g) => g.channelIds)
        .map((id) => id.toLowerCase());

      blockedDisplayNames = enabledGroups
        .map((g) => g.name.toLowerCase());

      log.info('Blocked IDs and names', { idCount: blockedChannelIds.length, nameCount: blockedDisplayNames.length });
      log.debug('Blocked channel IDs sample', { ids: blockedChannelIds.slice(0, 20) });
      log.debug('Blocked display names sample', { names: blockedDisplayNames.slice(0, 20) });
      callback?.();
    });
  }

  getGroups(() => {
    log.info('Initial groups loaded, filtering');
    waitForVideoResults();
  });

  searchForm?.addEventListener('submit', () => {
    log.debug('Search form submitted, filtering results');
    waitForVideoResults();
  }, false);

  searchFormInput?.addEventListener(
    'keyup',
    (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        log.debug('Enter key on search, filtering results');
        waitForVideoResults();
      }
    },
  );

  chrome.runtime.onMessage.addListener((msg: unknown) => {
    log.debug('Content script received update message', msg);
    getGroups(() => waitForVideoResults());
    return true;
  });

  // ── "Daily Popular Videos" sidebar link ────────────────────────

  function addDailyTopLink(): boolean {
    const curSearch = window.location.search;
    const isActive =
      curSearch === '?search_query=youtube&sp=CAMSBAgCEAE%253D';

    const sidebarList = document.querySelector<HTMLDivElement>(
      'div#items.style-scope.ytd-guide-section-renderer',
    );
    if (!sidebarList) {
      log.debug('Sidebar list not found, skipping daily top link');
      return false;
    }

    log.info('Adding "Daily Popular Videos" sidebar link', { isActive });

    // Detect dark mode via YouTube's [dark] attribute on <html>
    const isDark = document.documentElement.hasAttribute('dark');

    const btn = document.createElement('a');
    btn.href =
      'https://www.youtube.com/results?search_query=youtube&sp=CAMSBAgCEAE%253D';
    btn.title = 'Daily Popular Videos';
    Object.assign(btn.style, {
      display: 'flex',
      alignItems: 'center',
      height: '40px',
      width: '100%',
      padding: '0 28px',
      cursor: 'pointer',
      boxSizing: 'border-box',
      textDecoration: 'none',
      backgroundColor: isActive
        ? (isDark ? '#3a3a3a' : '#d9d9d9')
        : 'transparent',
    });

    btn.addEventListener('mouseover', () => {
      btn.style.backgroundColor = isDark ? '#3f3f3f' : '#e7e7e7';
    });
    btn.addEventListener('mouseout', () => {
      if (isActive) {
        btn.style.backgroundColor = isDark ? '#3a3a3a' : '#d9d9d9';
      } else {
        btn.style.backgroundColor = 'transparent';
      }
    });

    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.setAttribute('viewBox', '0 0 24 24');
    svgEl.setAttribute('fill', 'none');
    svgEl.setAttribute('stroke', isActive ? '#fc0d1b' : (isDark ? '#aaa' : '#909090'));
    svgEl.setAttribute('stroke-width', '2');
    svgEl.setAttribute('stroke-linecap', 'round');
    svgEl.setAttribute('stroke-linejoin', 'round');
    Object.assign(svgEl.style, {
      display: 'inline-block',
      height: '20px',
      width: '20px',
      verticalAlign: 'middle',
      margin: '0 24px 0 0',
    });

    const poly1 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    poly1.setAttribute('points', '22 7 13.5 15.5 8.5 10.5 2 17');
    const poly2 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    poly2.setAttribute('points', '16 7 22 7 22 13');
    svgEl.appendChild(poly1);
    svgEl.appendChild(poly2);

    const text = document.createElement('span');
    text.innerHTML = 'Daily Popular Videos';
    Object.assign(text.style, {
      display: 'inline-block',
      color: isActive
        ? (isDark ? '#fff' : '#000')
        : (isDark ? 'rgba(255,255,255,0.8)' : 'rgba(17,17,17,0.8)'),
      fontSize: '14px',
      textDecoration: 'none',
      verticalAlign: 'middle',
      fontWeight: isActive ? '500' : '',
    });

    btn.appendChild(svgEl);
    btn.appendChild(text);
    // Insert two links below Shorts (Home → Shorts → Subs → You → DPV)
    const sidebarItems = sidebarList.children;
    // Target index 4 (0=Home, 1=Shorts, 2=Subs heading, 3=Subs, 4=insert after)
    const insertAfter = sidebarItems.length > 3 ? sidebarItems[3] : null;
    sidebarList.insertBefore(btn, insertAfter?.nextSibling ?? null);
    addedDailyTopLink = true;
    return true;
  }

  // ── Block videos from enabled groups' channelIds ─────────────

  function waitForVideoResults(): void {
    let removedCount = 0;

    // Strategy 1: Match channel links by href (covers /@handle, /channel/, /user/ formats)
    const channelLinks = document.querySelectorAll<HTMLAnchorElement>(
      'ytd-video-renderer ytd-channel-name a.yt-simple-endpoint, ' +
      'ytd-compact-video-renderer ytd-channel-name a.yt-simple-endpoint, ' +
      'ytd-video-renderer #channel-info a.yt-simple-endpoint',
    );

    for (const el of channelLinks) {
      const href = el.getAttribute('href') ?? '';
      const found = href
        .replace('/user/', '')
        .replace('/channel/', '')
        .replace('/@', '')
        .toLowerCase();

      log.debug('Checking channel link', { href, found });

      if (found && blockedChannelIds.indexOf(found) > -1) {
        const parent = el.closest('ytd-video-renderer, ytd-compact-video-renderer');
        if (parent) {
          parent.remove();
          removedCount++;
          log.debug('Removed by href match', { found });
        }
      }
    }

    // Strategy 2: Match by channel name text content (fallback for layout changes)
    const channelNameEls = document.querySelectorAll<HTMLElement>(
      'ytd-video-renderer yt-formatted-string.ytd-channel-name, ' +
      'ytd-compact-video-renderer yt-formatted-string.ytd-channel-name',
    );

    for (const el of channelNameEls) {
      const text = (el.textContent ?? '').trim().toLowerCase();
      if (!text) continue;

      // Match against both channel IDs and display names
      if (blockedChannelIds.indexOf(text) > -1 || blockedDisplayNames.indexOf(text) > -1) {
        const parent = el.closest('ytd-video-renderer, ytd-compact-video-renderer');
        if (parent && parent.isConnected) {
          parent.remove();
          removedCount++;
          log.debug('Removed by name match', { name: text });
        }
      }
    }

    if (removedCount > 0) {
      log.info('Removed mainstream videos', { count: removedCount });
    }
  }

  // ── DOM observer ──────────────────────────────────────────────

  function observeDOM(obj: HTMLElement, callback: () => void): void {
    const MutationObserver =
      window.MutationObserver || (window as any).WebKitMutationObserver;

    if (MutationObserver) {
      const obs = new MutationObserver((mutations) => {
        if (mutations.some((m) => m.type === 'childList')) callback();
      });
      obs.observe(obj, { childList: true, subtree: true });
      log.debug('MutationObserver attached', { target: obj.id || obj.tagName });
    } else if (window.addEventListener) {
      obj.addEventListener('DOMNodeInserted', callback as EventListener, false);
      obj.addEventListener('DOMNodeRemoved', callback as EventListener, false);
      log.debug('Fallback DOM event listeners attached');
    }
  }

  // ── Bootstrap ─────────────────────────────────────────────────

  let attempts = 0;
  let bootstrapDone = false;
  const interval = window.setInterval(() => {
    attempts++;

    if (!addedDailyTopLink) addDailyTopLink();

    const targets = document.querySelectorAll<HTMLElement>('#content.style-scope.ytd-app');
    if (targets.length && !observingTargetNode) {
      observingTargetNode = true;
      log.info('YouTube app content element found, setting up observer', { attempt: attempts });
      for (const tn of targets) {
        observeDOM(tn, waitForVideoResults);
      }
    }

    // Run filter each tick — safe no-op until getGroups populates the arrays
    waitForVideoResults();

    // Only stop polling once we've confirmed a non-empty blocked list
    // AND found the sidebar + ytd-app content elements
    if (!bootstrapDone && addedDailyTopLink && targets.length && blockedChannelIds.length > 0) {
      bootstrapDone = true;
      clearInterval(interval);
      log.info('Bootstrap complete', { attempt: attempts });
    }

    if (attempts > 20 && !addedDailyTopLink) {
      log.warn('Could not find sidebar after 20 attempts, giving up on daily link');
    }
  }, 100);

  setTimeout(() => {
    if (!bootstrapDone) {
      clearInterval(interval);
      log.warn('Bootstrap timeout reached (10s), clearing interval');
    }
  }, 10_000);
})();
