function join() {
  let id = document.getElementById("joinInput").value
  if (id.length !== 32) {
    alert("Please enter a valid session ID");
    return;
  }
  chrome.runtime.sendMessage({ "action": "join", sessionId: id });
}

function create(e) {
  e.preventDefault();
  chrome.runtime.sendMessage({ "action": "create" });
}

function leave() {
  chrome.runtime.sendMessage({ "action": "leave" });
  document.getElementById("session").classList.add("hidden");
  document.getElementById("joinCreate").classList.remove("hidden");
  AddStoredSessionId();
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

async function Start() {
  const response = await chrome.runtime.sendMessage({ "action": "get-session" });
  if (response.sessionId) {
    document.getElementById("sessionId").innerHTML = response.sessionId;
    document.getElementById("joinCreate").classList.add("hidden");
    document.getElementById("session").classList.remove("hidden");
  }
}

Start();