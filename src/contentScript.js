function isYoutube() {
  const url = window.location.href;
  return url.includes("youtube.com/watch?v=");
}

function seekToTime(time) {
  const videoElement = document.querySelector('video');
  if (!videoElement) {
    return;
  }

  videoElement.currentTime = time;
}

function play() {
  const videoElement = document.querySelector('video');
  if (!videoElement) {
    return;
  }

  videoElement.play();
}

function pause() {
  const videoElement = document.querySelector('video');
  if (!videoElement) {
    return;
  }

  videoElement.pause();
}

function OnVideoChange() {
  if (!video) {
    video = document.querySelector('video');
    AddListeners();
  }

  if (!video) {
    return;
  }

  setTimeout(async () => {
    chrome.runtime.sendMessage({
      action: "update", packet: {
        current_time: video.currentTime,
        is_paused: video.paused
      }
    });
  }, 3000);
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
    if (document.title.includes("[YTWT] ")) {
      return;
    }
    document.title = "[YTWT] " + request.title
  } else if (request.action === "get-state") {
    const videoElement = document.querySelector('video');
    if (!videoElement) {
      sendResponse({
        current_time: 0,
        is_paused: true
      });
      return;
    }
    sendResponse({
      current_time: videoElement.currentTime,
      is_paused: videoElement.paused,
    })
  } else if (request.action === "session-left") {
    if (!document.title.includes("[YTWT] ")) {
      return;
    }
    document.title = document.title.replace("[YTWT] ", "");
  }
});
let video;
let buffer = [];
let buffer_time = 300;
function SendBuffer() {
  chrome.runtime.sendMessage({
    action: "update",
    packet: {
      current_time: video.currentTime,
      is_paused: buffer[buffer.length - 1],
    }
  });
  buffer = [];
}
function Start() {
  video = document.querySelector('video');
  if (!video) {
    return;
  }
  video.addEventListener("seeked", (event) => {
    chrome.runtime.sendMessage({
      action: "update", packet: {
        current_time: video.currentTime,
      }
    });
  });

  video.addEventListener("play", (event) => {
    if (buffer.length === 0) {
      setTimeout(() => {
        SendBuffer();
      }, buffer_time);
    }
    buffer.push(false);
  });

  video.addEventListener("pause", (event) => {
    if (buffer.length === 0) {
      setTimeout(() => {
        SendBuffer();
      }, buffer_time);
    }
    buffer.push(true);
  });
}

Start();
