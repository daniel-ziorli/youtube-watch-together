function OnStateUpdate(state) {
  const videoElement = document.querySelector('video');

  let delta = Date.now() - state.updated_at;
  let deltaTime = state.current_time + delta / 1000;
  if (state.is_paused) {
    deltaTime = state.current_time;
  }

  if (state.is_paused !== videoElement.paused) {
    videoElement.currentTime = deltaTime;
    if (state.is_paused) {
      videoElement.pause();
    } else {
      videoElement.play();
    }
  } else if (Math.abs(deltaTime - videoElement.currentTime) > 0.5) {
    videoElement.currentTime = deltaTime;
  }
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "state-update") {
    OnStateUpdate(request.state);
  }
});
