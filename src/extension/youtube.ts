// Content script — runs on YouTube pages to remove mainstream-media results

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

  function getGroups(callback?: () => void): void {
    chrome.runtime.sendMessage({ action: 'get_all' }, (values: unknown) => {
      if (!Array.isArray(values)) return;

      const groups = values as ChannelGroup[];
      blockedChannelIds = groups
        .filter((g) => g.enabled)
        .flatMap((g) => g.channelIds)
        .map((id) => id.toLowerCase());

      callback?.();
    });
  }

  getGroups();

  searchForm?.addEventListener('submit', () => waitForVideoResults(), false);

  searchFormInput?.addEventListener(
    'keyup',
    (event: KeyboardEvent) => {
      if (event.key === 'Enter') waitForVideoResults();
    },
  );

  chrome.runtime.onMessage.addListener(() => {
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
    if (!sidebarList) return false;

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

    text.insertAdjacentHTML(
      'beforebegin',
      `<svg style="display:inline-block;height:20px;width:20px;vertical-align:middle;margin:0 24px 0 0" viewBox="0 0 24 24" fill="none" stroke="${isActive ? '#fc0d1b' : '#909090'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
    );

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
    for (const el of links) {
      const txt = el.getAttribute('href') ?? el.getAttribute('title') ?? '';
      const found = txt
        .replace('/user/', '')
        .replace('/channel/', '')
        .toLowerCase();

      if (blockedChannelIds.indexOf(found) > -1) {
        const parent = el.closest('ytd-video-renderer, ytd-compact-video-renderer');
        parent?.remove();
      }
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
    } else if (window.addEventListener) {
      obj.addEventListener('DOMNodeInserted', callback as EventListener, false);
      obj.addEventListener('DOMNodeRemoved', callback as EventListener, false);
    }
  }

  // ── Bootstrap ─────────────────────────────────────────────────

  const interval = window.setInterval(() => {
    if (!addedDailyTopLink) addDailyTopLink();

    const targets = document.querySelectorAll<HTMLElement>('#content.style-scope.ytd-app');
    if (targets.length && !observingTargetNode) {
      observingTargetNode = true;
      for (const tn of targets) {
        observeDOM(tn, waitForVideoResults);
      }
    }

    if (addedDailyTopLink && targets.length) {
      clearInterval(interval);
    }

    waitForVideoResults();
  }, 100);

  setTimeout(() => clearInterval(interval), 10_000);
})();
