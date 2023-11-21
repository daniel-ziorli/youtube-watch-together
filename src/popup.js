function GenerateId(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

function join() {
  let id = document.getElementById("joinInput").value
  if (id.length !== 32) {
    alert("Please enter a valid session ID");
    return;
  }
  chrome.runtime.sendMessage({ "action": "join", sessionId: id });
}

async function create() {
  let id = GenerateId(32);
  const storage = await chrome.storage.sync.get({ "copyOnCreate": true });
  if (storage.copyOnCreate) {
    await navigator.clipboard.writeText(id);
  }
  chrome.runtime.sendMessage({ "action": "create", sessionId: id });
}

function leave() {
  chrome.runtime.sendMessage({ "action": "leave" });
  document.getElementById("session").classList.add("hidden");
  document.getElementById("joinCreate").classList.remove("hidden");
}

async function copy() {
  const text = document.getElementById("sessionId").innerHTML
  navigator.clipboard.writeText(text);
}

function togglecopy() {
  chrome.storage.sync.set({ "copyOnCreate": document.getElementById("copyCheckbox").checked });
}

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("join").addEventListener("click", join);
  document.getElementById("create").addEventListener("click", create);
  document.getElementById("leave").addEventListener("click", leave);
  document.getElementById("copy").addEventListener("click", copy);
  document.getElementById("copyCheckbox").addEventListener("click", togglecopy);
});

async function Start() {
  const response = await chrome.runtime.sendMessage({ "action": "get-session" });
  if (response.sessionId) {
    document.getElementById("sessionId").innerHTML = response.sessionId;
    document.getElementById("joinCreate").classList.add("hidden");
    document.getElementById("session").classList.remove("hidden");
  }

  const storage = await chrome.storage.sync.get({ "copyOnCreate": true });
  if (storage.copyOnCreate) {
    document.getElementById("copyCheckbox").checked = storage.copyOnCreate;
  }
}

Start();