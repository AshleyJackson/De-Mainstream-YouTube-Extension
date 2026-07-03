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
      const enabledCount = groups.filter((g) => g.enabled).length;
      log.info('Received groups', { total: groups.length, enabled: enabledCount });

      blockedChannelIds = groups
        .filter((g) => g.enabled)
        .flatMap((g) => g.channelIds)
        .map((id) => id.toLowerCase());

      log.debug('Blocked channel IDs', { count: blockedChannelIds.length });
      callback?.();
    });
  }

  getGroups();

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

    const btn = document.createElement('a');
    btn.href =
      'https://www.youtube.com/results?search_query=youtube&sp=CAMSBAgCEAE%253D';
    Object.assign(btn.style, {
      display: 'block',
      height: '40px',
      width: '100%',
      lineHeight: '40px',
      padding: '0 28px',
      cursor: 'pointer',
      boxSizing: 'border-box',
      textDecoration: 'none',
      backgroundColor: isActive ? '#d9d9d9' : '',
    });

    btn.addEventListener('mouseover', () => {
      btn.style.backgroundColor = '#E7E7E7';
    });
    btn.addEventListener('mouseout', () => {
      if (!isActive) btn.style.removeProperty('background-color');
    });

    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.setAttribute('viewBox', '0 0 24 24');
    svgEl.setAttribute('fill', 'none');
    svgEl.setAttribute('stroke', isActive ? '#fc0d1b' : '#909090');
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
      color: isActive ? '#000' : 'rgba(17,17,17,0.8)',
      fontSize: '14px',
      lineHeight: '40px',
      textDecoration: 'none',
      verticalAlign: 'middle',
      fontWeight: isActive ? '500' : '',
    });

    btn.appendChild(svgEl);
    btn.appendChild(text);
    sidebarList.appendChild(btn);
    addedDailyTopLink = true;
    return true;
  }

  // ── Block videos from enabled groups' channelIds ─────────────

  function waitForVideoResults(): void {
    const links = document.querySelectorAll<HTMLAnchorElement>(
      'ytd-video-renderer a.yt-formatted-string.yt-simple-endpoint, yt-formatted-string.ytd-channel-name',
    );
    let removedCount = 0;

    for (const el of links) {
      const txt = el.getAttribute('href') ?? el.getAttribute('title') ?? '';
      const found = txt
        .replace('/user/', '')
        .replace('/channel/', '')
        .toLowerCase();

      if (blockedChannelIds.indexOf(found) > -1) {
        const parent = el.closest('ytd-video-renderer, ytd-compact-video-renderer');
        if (parent) {
          parent.remove();
          removedCount++;
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

    if (addedDailyTopLink && targets.length) {
      clearInterval(interval);
      log.info('Bootstrap complete', { attempt: attempts });
    }

    waitForVideoResults();

    if (attempts > 20 && !addedDailyTopLink) {
      log.warn('Could not find sidebar after 20 attempts, giving up on daily link');
    }
  }, 100);

  setTimeout(() => {
    clearInterval(interval);
    log.debug('Bootstrap timeout reached (10s), clearing interval');
  }, 10_000);
})();
