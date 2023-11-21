let sendInProgress = false;
const bufferTime = 300;

// when seeking while playing fires a pause, play and then seeked events 
// requiring a buffer to prevent multiple messages being sent to the background.js
function OnVideoEvent(event) {
  if (event.type === 'pause' || event.type === 'play') {
    if (sendInProgress || !document.location.href.includes("watch?v=")) {
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

document.addEventListener('seeked', OnVideoEvent, true);
document.addEventListener('pause', OnVideoEvent, true);
document.addEventListener('play', OnVideoEvent, true);
