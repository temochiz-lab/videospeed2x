const tabPlaybackRateMap = new Map();

browser.browserAction.onClicked.addListener((tab) => {
  const current = tabPlaybackRateMap.get(tab.id);
  const target = current === undefined ? 2.0 : (current === 2.0 ? 1.5 : 2.0);

  browser.tabs.executeScript(tab.id, {
    code: `
      (() => {
        const rate = ${target};
        const applyRate = (video) => {
          if (video.playbackRate !== rate) video.playbackRate = rate;
        };

        document.querySelectorAll('video').forEach(applyRate);

        if (!window.__videoSpeedBooster) {
          const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
              for (const node of mutation.addedNodes) {
                if (node instanceof HTMLVideoElement) applyRate(node);
                else if (node.querySelectorAll) node.querySelectorAll('video').forEach(applyRate);
              }
            }
          });
          observer.observe(document.documentElement, { childList: true, subtree: true });
          window.__videoSpeedBooster = { observer, rate };
        } else {
          window.__videoSpeedBooster.rate = rate;
        }

        const state = window.__videoSpeedBooster;
        state.applyRate = applyRate;
        state.observer.disconnect();
        state.observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
              if (node instanceof HTMLVideoElement) applyRate(node);
              else if (node.querySelectorAll) node.querySelectorAll('video').forEach(applyRate);
            }
          }
        });
        state.observer.observe(document.documentElement, { childList: true, subtree: true });
        document.querySelectorAll('video').forEach(applyRate);
      })();
    `,
    allFrames: true
  });

  tabPlaybackRateMap.set(tab.id, target);
});

browser.tabs.onRemoved.addListener((tabId) => {
  tabPlaybackRateMap.delete(tabId);
});

browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    tabPlaybackRateMap.delete(tabId);
  }
});
