let sendInProgress = false;
const bufferTime = 300;

// when seeking while playing fires a pause, play and then seeked events 
// requiring a buffer to prevent multiple messages being sent to the background.js
function OnVideoEvent(event) {
  if (event.type === 'pause' || event.type === 'play') {
    if (sendInProgress) {
      return;
    }
    sendInProgress = true;
    setTimeout(() => {
      chrome.runtime.sendMessage({
        "action": "video-state",
        "state": {
          "current_time": event.srcElement.currentTime,
          "is_paused": event.srcElement.paused
        }
      });
      sendInProgress = false;
    }, bufferTime);
  } else if (event.type === 'seeked') {
    if (sendInProgress) {
      return;
    }
    chrome.runtime.sendMessage({
      "action": "video-state",
      "state": {
        "current_time": event.srcElement.currentTime,
        "is_paused": event.srcElement.paused
      }
    });
  }
}

function OnUrlChange(url) {
  console.log('url change to', url);
  if (url.includes('www.youtube.com/watch?v=')) {
    chrome.runtime.sendMessage({
      "action": "video-state",
      "state": {
        "current_video": url,
        "current_time": 0,
        "is_paused": true
      }
    });
  }
}
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.action === "get-state") {
    sendResponse({
      "current_video": document.location.href,
      "current_time": document.querySelector("video").currentTime,
      "is_paused": document.querySelector("video").paused
    });
  }
});

document.addEventListener('seeked', OnVideoEvent, true);
document.addEventListener('pause', OnVideoEvent, true);
document.addEventListener('play', OnVideoEvent, true);

const ObserveUrlChange = () => {
  let oldHref = document.location.href;
  const body = document.querySelector("body");
  const observer = new MutationObserver(mutations => {
    if (oldHref !== document.location.href) {
      oldHref = document.location.href;
      OnUrlChange(oldHref);
    }
  });
  observer.observe(body, { childList: true, subtree: true });
};

window.onload = ObserveUrlChange;

console.log('test');