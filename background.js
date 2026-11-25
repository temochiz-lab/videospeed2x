const playbackRates = [2.0, 1.5, 1.0];

function nextPlaybackRate(rate) {
  const index = playbackRates.indexOf(rate);
  return playbackRates[(index + 1) % playbackRates.length];
}

function setNextSpeedIcon(rate) {
  const suffix = rate === 1.5 ? '-15' : (rate === 1.0 ? '-1' : '');

  browser.browserAction.setIcon({
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
  browser.browserAction.setTitle({ title: `次に押すと${rate}倍` });
}

function applyRateToTab(tabId, rate) {
  browser.tabs.executeScript(tabId, {
    code: `
      (() => {
        const rate = ${rate};
        let state = window.__videoSpeedBooster;

        if (!state) {
          state = {
            rate,
            observedVideos: new WeakSet(),
            applyRate(video) {
              if (!state.observedVideos.has(video)) {
                state.observedVideos.add(video);
                const enforceRate = () => {
                  if (video.playbackRate !== state.rate) video.playbackRate = state.rate;
                };
                video.addEventListener('ratechange', enforceRate);
                video.addEventListener('loadedmetadata', enforceRate);
              }
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
}

function togglePlayback(tab) {
  browser.storage.local.get('playbackRate').then(({ playbackRate }) => {
    const target = playbackRate === undefined ? playbackRates[0] : nextPlaybackRate(playbackRate);

    browser.storage.local.set({ playbackRate: target }).then(() => {
      applyRateToTab(tab.id, target);
      setNextSpeedIcon(nextPlaybackRate(target));
    });
  });
}

browser.browserAction.onClicked.addListener(togglePlayback);

browser.commands.onCommand.addListener((command) => {
  if (command !== 'toggle-speed') return;

  browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
    if (tab) togglePlayback(tab);
  });
});

browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.playbackRate) {
    setNextSpeedIcon(nextPlaybackRate(changes.playbackRate.newValue));
  }
});

browser.storage.local.get('playbackRate').then(({ playbackRate }) => {
  setNextSpeedIcon(playbackRate === undefined ? playbackRates[0] : nextPlaybackRate(playbackRate));
});
