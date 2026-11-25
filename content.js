function setPlaybackRate(rate) {
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
}

browser.storage.local.get('playbackRate').then(({ playbackRate }) => {
  if (playbackRate !== undefined) setPlaybackRate(playbackRate);
});

browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.playbackRate?.newValue !== undefined) {
    setPlaybackRate(changes.playbackRate.newValue);
  }
});
