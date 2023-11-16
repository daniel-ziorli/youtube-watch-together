function isYoutube() {
  const url = window.location.href;
  return url.includes("youtube.com");
}

function seekToTime(time) {
  const videoElement = document.querySelector('video');
  if (!videoElement) {
    alert('No YouTube video element found on the page.');
    return;
  }

  videoElement.currentTime = time;
}

function play() {
  const videoElement = document.querySelector('video');
  if (!videoElement) {
    alert('No YouTube video element found on the page.');
    return;
  }

  videoElement.play();
}

function pause() {
  const videoElement = document.querySelector('video');
  if (!videoElement) {
    alert('No YouTube video element found on the page.');
    return;
  }

  videoElement.pause();
}

function OnVideoChange() {
  if (video) {
    setTimeout(async () => {
      chrome.runtime.sendMessage({
        action: "update", packet: {
          current_time: video.currentTime,
          is_paused: video.paused
        }
      });
    }, 3000);
    return;
  }
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "seek") {
    seekToTime(request.time);
  } else if (request.action === "play") {
    play();
  } else if (request.action === "pause") {
    pause();
  } else if (request.action === "video-change") {
    OnVideoChange();
  } else if (request.action === "title-change") {
    if (document.title.includes("[YTWT]")) {
      return;
    }
    document.title = "[YTWT] " + request.title
  } else if (request.action === "get-state") {
    if (!video) {
      video = document.querySelector("video");
    }
    if (!video) {
      sendResponse({
        current_time: 0,
        is_paused: true
      });
      return;
    }
    sendResponse({
      current_time: video.currentTime,
      is_paused: video.paused,
    })
  }
});

function AddListeners() {
  if (!video) {
    return;
  }
  video.addEventListener("seeked", (event) => {
    console.log("Seeked");

    chrome.runtime.sendMessage({
      action: "update", packet: {
        current_time: video.currentTime,
      }
    });
  });

  video.addEventListener("play", (event) => {
    console.log("Play");
    chrome.runtime.sendMessage({
      action: "update",
      packet: {
        current_time: video.currentTime,
        is_paused: false
      }
    })
  });

  video.addEventListener("pause", (event) => {
    console.log("Pause");
    chrome.runtime.sendMessage({
      action: "update",
      packet: {
        current_time: video.currentTime,
        is_paused: true
      }
    })
  });
}

if (!isYoutube()) {
  return;
}

video = document.querySelector("video");

while (!video) {
  setTimeout(() => {
    video = document.querySelector("video");
  }, 1000);
}

AddListeners();