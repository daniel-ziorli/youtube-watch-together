import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pnaucateowesxjdqlpeo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuYXVjYXRlb3dlc3hqZHFscGVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTk5NDIzNjAsImV4cCI6MjAxNTUxODM2MH0.sRRe6zzqjjXPMhYg36oclp9Ebe7u2hv3qXnK_W2kOjs'
const supabase = createClient(supabaseUrl, supabaseKey)

let session_uuid;
let subscription;
let current_time = undefined;
let current_video = undefined;
let is_paused = undefined;
let global_tab = undefined;

let updated_at = undefined;


async function GetTab() {
  if (global_tab !== undefined) {
    return global_tab;
  }
  global_tab = await chrome.tabs.create({ url: "https://www.youtube.com" });
  return global_tab;
}

async function CreateSession() {
  if (session_uuid) {
    return;
  }

  const { data, error } = await supabase
    .from('session')
    .insert([
      { current_video },
    ])
    .select()

  if (error) {
    console.log(error);
    return;
  }

  session_uuid = data[0].uuid;
  JoinSession();
}

async function JoinSession() {
  subscription = await supabase.channel('custom-filter-channel')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'session', filter: 'uuid=eq.' + session_uuid },
      (payload) => OnUpdateReceived(payload.new)
    )
    .subscribe();

  const { data: session, error } = await supabase
    .from('session')
    .select()
    .eq('uuid', session_uuid)

  if (error) {
    console.log(error);
    return;
  }

  console.log("Joined session");
  console.log(session);

  let url = 'https://www.youtube.com';
  if (session[0].current_video !== null) {
    url = 'https://www.youtube.com/watch?v=' + session[0].current_video;
  }

  chrome.runtime.sendMessage({ "action": "session-joined", uuid: session_uuid });
  OnUpdateReceived(session[0]);
}

async function OnUpdateReceived(payload) {
  if (payload.updated_at <= updated_at && updated_at !== undefined) {
    return;
  }

  updated_at = payload.updated_at;
  const tab = await GetTab();

  let url = 'https://www.youtube.com';
  if (payload.current_video !== null) {
    url = 'https://www.youtube.com/watch?v=' + payload.current_video;
  }

  if (payload.current_video !== current_video) {
    await chrome.tabs.update(tab.id, { url });
    current_video = payload.current_video;
  }

  if (is_paused === undefined || payload.is_paused !== is_paused) {
    if (payload.is_paused) {
      chrome.tabs.sendMessage(tab.id, { action: "pause" });
      is_paused = true;
    } else {
      chrome.tabs.sendMessage(tab.id, { action: "play" });
      is_paused = false;
    }
  }

  let delta = Date.now() - payload.updated_at;
  let delta_time = payload.current_time + delta / 1000;

  if (current_time === undefined || Math.abs(delta_time - current_time) > 1) {
    chrome.tabs.sendMessage(tab.id, { action: "seek", time: delta_time });
    current_time = delta_time;
  }
}

async function LeaveSession() {
  if (!session_uuid) {
    return;
  }
  session_uuid = undefined;
  current_video = undefined;
  current_time = undefined;
  is_paused = undefined;
  global_tab = undefined;
  subscription.unsubscribe();
  chrome.runtime.sendMessage({ "action": "session-left" });
}

async function PushUpdate(update) {
  if (!session_uuid) {
    return;
  }

  let body = {}

  if (Math.abs(update.current_time - current_time) > 1) {
    body.current_time = update.current_time;
  }
  current_time = update.current_time;

  if (update.is_paused !== is_paused) {
    body.is_paused = update.is_paused;
  }
  is_paused = update.is_paused;


  if (Object.keys(body).length === 0 && body.constructor === Object) {
    return;
  }

  updated_at = Date.now();
  body.updated_at = updated_at;

  const { data, error } = await supabase
    .from('session')
    .update(body)
    .eq('uuid', session_uuid)
    .select()

  if (error) {
    console.log(error);
  }

  console.log(data);
}

chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, currentTab) {
  if (!session_uuid || !global_tab) {
    return;
  }

  if (global_tab.id !== tabId) {
    return;
  }

  if (changeInfo.title) {
    chrome.tabs.sendMessage(global_tab.id, {
      action: 'title-change',
      title: changeInfo.title
    })
  }

  if (changeInfo.url && changeInfo.url.includes('youtube.com/watch?v=')) {
    const new_video = changeInfo.url.split("v=")[1].split("&")[0];
    if (new_video === current_video) {
      return;
    }

    current_video = new_video;
    const { error } = await supabase
      .from('session')
      .update({
        current_video,
      })
      .eq('uuid', session_uuid)
      .select()

    if (error) {
      console.log(error);
    }

    chrome.tabs.sendMessage(global_tab.id, {
      action: 'video-change',
    })
  }
});

chrome.tabs.onRemoved.addListener(function (tabid, removed) {
  if (!session_uuid) {
    return;
  }
  if (global_tab.id === tabid) {
    LeaveSession();
  }
})

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "join") {
    console.log("Joining session: " + request.id);
    session_uuid = request.id;
    JoinSession();
  } else if (request.action === "create") {
    CreateSession();
  } else if (request.action === "leave") {
    LeaveSession();
  } else if (request.action === "update") {
    PushUpdate(request.packet);
  } else if (request.action === "get-session") {
    sendResponse({ uuid: session_uuid });
  }
});
