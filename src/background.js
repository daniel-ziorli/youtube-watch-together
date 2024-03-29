import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pnaucateowesxjdqlpeo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuYXVjYXRlb3dlc3hqZHFscGVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTk5NDIzNjAsImV4cCI6MjAxNTUxODM2MH0.sRRe6zzqjjXPMhYg36oclp9Ebe7u2hv3qXnK_W2kOjs'
const supabase = createClient(supabaseUrl, supabaseKey)

let sessionId = undefined;
let globalTab = undefined;
let lastUpdateAt = 0;
let channel = undefined;

async function CreateTab() {
  globalTab = await chrome.tabs.create({ url: "https://www.youtube.com/watch?v=qeATgEWCB0Y" });
  return globalTab;
}

async function CreateSession(id, username) {
  if (sessionId) {
    return;
  }
  console.log("Creating session");

  JoinSession(id, username);
}

async function JoinSession(id, username) {
  // console.log("Joining session");

  sessionId = id;
  await CreateTab();

  channel = supabase.channel(sessionId);
  chrome.storage.sync.set({ "username": username });

  channel
    .on('broadcast', { event: 'state-update' }, (e) => {
      // console.log("Broadcast:" + JSON.stringify(e));
      OnStateUpdate(e.payload);
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      if (newPresences[0].username === username) {
        return;
      }
      const message = newPresences[0].username + " joined";
      chrome.notifications.create({
        title: 'YouTube Watch Together',
        message: message,
        type: 'basic',
        iconUrl: 'icons/icon_128.png',
        silent: true
      })
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      if (leftPresences[0].username === username) {
        return;
      }
      const message = leftPresences[0].username + " left";
      chrome.notifications.create({
        title: 'YouTube Watch Together',
        message: message,
        type: 'basic',
        iconUrl: 'icons/icon_128.png',
        silent: true
      })
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.track({ username });
      }
    });
}

function LeaveSession() {
  if (!sessionId || !globalTab) {
    return;
  }
  // console.log("Leaving session");
  supabase.removeAllChannels()
  sessionId = undefined;
  globalTab = undefined;
  channel = undefined;
  lastUpdateAt = 0;
  currentVideoId = undefined;
}

async function OnNewVideoState(state) {
  if (!sessionId || !globalTab) {
    return;
  }

  // console.log("OnNewVideoState:" + JSON.stringify(state));

  lastUpdateAt = await GetDateNow();
  state.updated_at = lastUpdateAt;

  channel.send(
    {
      type: 'broadcast',
      event: 'state-update',
      payload: state
    }
  )
}

let currentVideoId = undefined;
async function OnStateUpdate(state) {
  if (!sessionId || !globalTab || state.updated_at <= lastUpdateAt) {
    return;
  }

  // console.log("OnStateUpdate:" + JSON.stringify(state));

  lastUpdateAt = state.updated_at;

  if (state.current_video !== null && currentVideoId !== state.current_video) {
    currentVideoId = state.current_video;
    await chrome.tabs.update(globalTab.id, { url: state.current_video });
  }

  chrome.tabs.sendMessage(globalTab.id, { action: "state-update", state });
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "create") {
    CreateSession(request.sessionId, request.username);
  }
  if (request.action === "join") {
    JoinSession(request.sessionId, request.username);
  }
  if (request.action === "leave") {
    LeaveSession();
  }
  if (request.action === "get-session") {
    sendResponse({ sessionId });
  }
  if (request.action === "video-state") {
    if (!globalTab || sender.tab.id !== globalTab.id) {
      return;
    }
    OnNewVideoState(request.state);
  }
});

chrome.tabs.onRemoved.addListener(function (tabid, removed) {
  if (!sessionId || !globalTab) {
    return;
  }
  if (globalTab.id === tabid) {
    LeaveSession();
  }
});

chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, currentTab) {
  if (!sessionId || !globalTab || globalTab.id !== tabId) {
    return;
  }

  if (changeInfo.url) {
    let videoId = undefined;
    if (changeInfo.url.includes('youtube.com/watch?v=')) {
      videoId = changeInfo.url.split("v=")[1].split("&")[0]
    }

    if (videoId === undefined || videoId === currentVideoId) {
      return;
    }

    currentVideoId = videoId;

    channel.send({
      type: 'broadcast',
      event: 'state-update',
      payload: {
        current_video: changeInfo.url,
        current_time: 0,
        is_paused: false
      }
    })
  }
});

async function GetDateNow() {
  try {
    let response = await fetch('https://pnaucateowesxjdqlpeo.supabase.co/functions/v1/get-date-now');
    let json = await response.json();
    return json;
  } catch (error) {
    return Date.now();
  }
}