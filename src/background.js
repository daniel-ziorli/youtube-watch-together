import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pnaucateowesxjdqlpeo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuYXVjYXRlb3dlc3hqZHFscGVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTk5NDIzNjAsImV4cCI6MjAxNTUxODM2MH0.sRRe6zzqjjXPMhYg36oclp9Ebe7u2hv3qXnK_W2kOjs'
const supabase = createClient(supabaseUrl, supabaseKey)

let sessionId = undefined;
let globalTab = undefined;
let lastUpdateAt = 0;

async function CreateTab() {
  globalTab = await chrome.tabs.create({ url: "https://www.youtube.com/watch?v=qeATgEWCB0Y" });
  return globalTab;
}

async function CreateSession() {
  if (sessionId) {
    return;
  }
  console.log("Creating session");

  const { data, error } = await supabase
    .from('session')
    .insert({
      current_time: 0,
      is_paused: true,
    })
    .select()

  if (error) {
    console.log(error);
    return;
  }

  JoinSession(data[0].uuid);
}

async function JoinSession(id) {
  console.log("Joining session");

  sessionId = id;
  chrome.storage.sync.set({ "sessionId": sessionId });

  supabase.channel('session-update-channel')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'session', filter: 'uuid=eq.' + sessionId },
      (payload) => OnStateUpdate(payload.new)
    )
    .subscribe();

  const { data: session, error } = await supabase
    .from('session')
    .select()
    .eq('uuid', sessionId)
    .single()

  if (error) {
    console.log(error);
    return;
  }

  await CreateTab();
  OnStateUpdate(session);
}

function LeaveSession() {
  if (!sessionId || !globalTab) {
    return;
  }
  console.log("Leaving session");
  supabase.removeAllChannels()
  sessionId = undefined;
  globalTab = undefined;
  lastUpdateAt = 0;
  currentVideo = undefined;
}

async function OnNewVideoState(state) {
  if (!sessionId || !globalTab) {
    return;
  }

  console.log("OnNewVideoState:" + JSON.stringify(state));

  lastUpdateAt = Date.now();
  state.updated_at = lastUpdateAt;

  const { data, error } = await supabase
    .from('session')
    .update(state)
    .eq('uuid', sessionId)
    .select()

  if (error) {
    console.error(error);
  }

  console.log(data);
}

let currentVideo = undefined;
async function OnStateUpdate(state) {
  if (!sessionId || !globalTab || state.updated_at <= lastUpdateAt) {
    return;
  }

  console.log("OnStateUpdate:" + JSON.stringify(state));

  lastUpdateAt = state.updated_at;

  if (state.current_video !== null && currentVideo !== state.current_video) {
    currentVideo = state.current_video;
    await chrome.tabs.update(globalTab.id, { url: state.current_video });
  }

  chrome.tabs.sendMessage(globalTab.id, { action: "state-update", state });
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "create") {
    CreateSession();
  }
  if (request.action === "join") {
    JoinSession(request.sessionId);
  }
  if (request.action === "leave") {
    LeaveSession();
  }
  if (request.action === "get-session") {
    sendResponse({ sessionId });
  }
  if (request.action === "video-state") {
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
