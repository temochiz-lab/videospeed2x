const tabPlaybackRateMap = new Map();
const playbackRates = [2.0, 1.5, 1.0];

function nextPlaybackRate(rate) {
  const index = playbackRates.indexOf(rate);
  return playbackRates[(index + 1) % playbackRates.length];
}

function setNextSpeedIcon(tabId, rate) {
  const suffix = rate === 1.5 ? '-15' : (rate === 1.0 ? '-1' : '');

  browser.browserAction.setIcon({
    tabId,
    path: {
      16: `icon-16${suffix}.png`,
      32: `icon-32${suffix}.png`,
      48: `icon-48${suffix}.png`,
      64: `icon-64${suffix}.png`,
      96: `icon-96${suffix}.png`,
      128: `icon-128${suffix}.png`,
      256: `icon-256${suffix}.png`
    }
  });
  browser.browserAction.setTitle({
    tabId,
    title: `次に押すと${rate}倍`
  });
}

function togglePlayback(tab) {
  const current = tabPlaybackRateMap.get(tab.id);
  const target = current === undefined ? playbackRates[0] : nextPlaybackRate(current);

  browser.tabs.executeScript(tab.id, {
    code: `
      (() => {
        const rate = ${target};
        let state = window.__videoSpeedBooster;

        if (!state) {
          state = {
            rate,
            applyRate(video) {
              if (video.playbackRate !== state.rate) video.playbackRate = state.rate;
            }
          };
          state.observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
              for (const node of mutation.addedNodes) {
                if (node instanceof HTMLVideoElement) state.applyRate(node);
                else if (node.querySelectorAll) node.querySelectorAll('video').forEach(state.applyRate);
              }
            }
          });
          state.observer.observe(document.documentElement, { childList: true, subtree: true });
          window.__videoSpeedBooster = state;
        } else {
          state.rate = rate;
        }

        document.querySelectorAll('video').forEach(state.applyRate);
      })();
    `,
    allFrames: true
  });

  tabPlaybackRateMap.set(tab.id, target);
  setNextSpeedIcon(tab.id, nextPlaybackRate(target));
}

browser.browserAction.onClicked.addListener(togglePlayback);

browser.commands.onCommand.addListener((command) => {
  if (command !== 'toggle-speed') return;

  browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
    if (tab) togglePlayback(tab);
  });
});

browser.tabs.onRemoved.addListener((tabId) => {
  tabPlaybackRateMap.delete(tabId);
});

browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    tabPlaybackRateMap.delete(tabId);
    setNextSpeedIcon(tabId, 2.0);
  }
});
