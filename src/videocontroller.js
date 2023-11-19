function OnSessionUpdate(session) {
  const videoElement = document.querySelector('video');

  let delta = Date.now() - session.updated_at;
  let deltaTime = session.current_time + delta / 1000;
  if (session.is_paused) {
    deltaTime = session.current_time;
  }

  if (Math.abs(deltaTime - videoElement.currentTime) > 1) {
    videoElement.currentTime = deltaTime;
  }

  if (session.is_paused !== videoElement.paused) {
    if (session.is_paused) {
      videoElement.pause();
    } else {
      videoElement.currentTime = deltaTime;
      videoElement.play();
    }
  }
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "session-update") {
    OnSessionUpdate(request.session);
  }
});
