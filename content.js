browser.runtime.sendMessage({ type: 'getPlaybackRate' }).then((response) => {
  if (!response || response.rate === undefined) return;

  const state = {
    rate: response.rate,
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
  document.querySelectorAll('video').forEach(state.applyRate);
});
