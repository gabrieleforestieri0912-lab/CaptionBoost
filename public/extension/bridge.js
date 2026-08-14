// Bridge content script - runs on the web app to relay captions from YouTube via the extension

let pendingRequests = new Map();
let requestIdCounter = 0;

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== 'captionboost-webapp') return;

  if (data.action === 'fetchCaptions') {
    const requestId = ++requestIdCounter;
    pendingRequests.set(requestId, data);

    chrome.runtime.sendMessage(
      {
        action: 'fetchCaptionsFromTab',
        requestId,
        videoId: data.videoId,
        lang: data.lang,
        sourceLang: data.sourceLang,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          window.postMessage(
            {
              source: 'captionboost-extension',
              action: 'captionsResult',
              requestId,
              success: false,
              error: chrome.runtime.lastError.message,
            },
            '*'
          );
          return;
        }
        window.postMessage(
          {
            source: 'captionboost-extension',
            action: 'captionsResult',
            requestId,
            ...response,
          },
          '*'
        );
      }
    );
  }
});

// Notify the web app that bridge is ready
window.postMessage({ source: 'captionboost-extension', action: 'bridgeReady' }, '*');
