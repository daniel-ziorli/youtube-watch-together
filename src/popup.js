function seek() {
  chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { "action": "seek", "time": document.getElementById("timeInput").value });
  });
}

function join() {
  let id = document.getElementById("joinInput").value
  if (id.length < 36) {
    alert("Please enter a valid session ID");
    return;
  }
  chrome.runtime.sendMessage({ "action": "join", id });
}

function create() {
  chrome.runtime.sendMessage({ "action": "create" });
}

function leave() {
  chrome.runtime.sendMessage({ "action": "leave" });
  document.getElementById("sessionId").innerHTML = "";
  document.getElementById("session").classList.add("hidden");
  document.getElementById("joinCreate").classList.remove("hidden");
}

async function copy() {
  const text = document.getElementById("sessionId").innerHTML
  await navigator.clipboard.writeText(text);
}

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("join").addEventListener("click", join);
  document.getElementById("create").addEventListener("click", create);
  document.getElementById("leave").addEventListener("click", leave);
  document.getElementById("copy").addEventListener("click", copy);
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "session-joined") {
    document.getElementById("sessionId").innerHTML = request.uuid;
    document.getElementById("joinCreate").classList.add("hidden");
    document.getElementById("session").classList.remove("hidden");
  }
});

async function Start() {
  const response = await chrome.runtime.sendMessage({ "action": "get-session" });
  if (response.uuid) {
    document.getElementById("sessionId").innerHTML = response.uuid;
    document.getElementById("joinCreate").classList.add("hidden");
    document.getElementById("session").classList.remove("hidden");
  } else {
    const result = await chrome.storage.sync.get(["session_id"]);
    if (result.session_id) {
      document.getElementById("joinInput").value = result.session_id;
    }
  }
}

Start();