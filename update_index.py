import re

with open('public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update loadCampaigns and submissions array
load_campaigns_old = """let submissions=JSON.parse(localStorage.getItem("clipind_submissions")||"[]");
let createdCampaigns = [];
async function loadCampaigns() {
  try {
    const res = await fetch('/api/campaigns');
    if (res.ok) campaigns = await res.json();
    if (user && user.role === 'business') {
      const bRes = await fetch('/api/campaigns/business/me');
      if (bRes.ok) createdCampaigns = await bRes.json();
    }
  } catch(e) { console.error(e); }
}"""

load_campaigns_new = """let submissions = [];
let createdCampaigns = [];
async function loadCampaigns() {
  try {
    const res = await fetch('/api/campaigns');
    if (res.ok) campaigns = await res.json();
    if (user && user.role === 'business') {
      const bRes = await fetch('/api/campaigns/business/me');
      if (bRes.ok) {
        createdCampaigns = await bRes.json();
        submissions = createdCampaigns.flatMap(c => 
          (c.submissions || []).map(s => ({
             ...s, 
             campaignId: c.id, 
             title: c.title,
             userEmail: s.clipper?.email,
             userName: s.clipper?.name,
             url: s.postUrl,
             views: s.submittedViews,
             reason: s.feedback,
             status: s.status === 'NEEDS_CHANGES' ? 'Needs Changes' : s.status === 'APPROVED' ? 'Approved' : s.status === 'REJECTED' ? 'Rejected' : 'Under Review'
          }))
        );
      }
    } else if (user && user.role === 'creator') {
      const sRes = await fetch('/api/submissions');
      if (sRes.ok) {
        const mySubs = await sRes.json();
        submissions = mySubs.map(s => ({
           ...s,
           title: s.campaign?.title,
           url: s.postUrl,
           views: s.submittedViews,
           reason: s.feedback,
           status: s.status === 'NEEDS_CHANGES' ? 'Needs Changes' : s.status === 'APPROVED' ? 'Approved' : s.status === 'REJECTED' ? 'Rejected' : 'Under Review'
        }));
      }
    }
    await loadNotifications();
  } catch(e) { console.error(e); }
}"""

content = content.replace(load_campaigns_old, load_campaigns_new)

# 2. Update notifications
notifications_old = """let notifications=JSON.parse(localStorage.getItem("clipind_notifications")||"[]"); // {id,forEmail,text,read,ts} — created only from real in-app events

function addNotification(forEmail,text){
if(!forEmail)return;
notifications.push({id:Date.now()+Math.random(),forEmail,text,read:false,ts:Date.now()});
localStorage.setItem("clipind_notifications",JSON.stringify(notifications));
}
function notifBell(){
if(!user)return "";
const mine=notifications.filter(n=>n.forEmail===user.email).sort((a,b)=>b.ts-a.ts);
const unread=mine.filter(n=>!n.read).length;
return `<div class="notif-bell" onclick="toggleNotifPanel(event)">🔔${unread>0?`<span class="notif-dot">${unread}</span>`:""}<div class="notif-panel hidden" id="notifPanel">${mine.length?mine.slice(0,10).map(n=>`<div class="notif-item">${esc(n.text)}</div>`).join(""):`<div class="notif-item" style="color:#777">No notifications yet.</div>`}</div></div>`;
}
function toggleNotifPanel(e){
e.preventDefault();e.stopPropagation();
const p=document.getElementById("notifPanel");
if(!p)return;
p.classList.toggle("hidden");
if(!p.classList.contains("hidden")){
notifications.forEach(n=>{if(n.forEmail===user.email)n.read=true});
localStorage.setItem("clipind_notifications",JSON.stringify(notifications));
}
}"""

notifications_new = """let notifications = [];
async function loadNotifications() {
  if (!user) return;
  try {
    const res = await fetch('/api/notifications');
    if (res.ok) {
      const notifs = await res.json();
      notifications = notifs.map(n => ({ ...n, text: n.message, ts: new Date(n.createdAt).getTime() }));
    }
  } catch(e) {}
}

function addNotification(forEmail,text){}

function notifBell(){
  if(!user)return "";
  const mine = notifications.sort((a,b)=>b.ts-a.ts);
  const unread=mine.filter(n=>!n.read).length;
  return `<div class="notif-bell" onclick="toggleNotifPanel(event)">🔔${unread>0?`<span class="notif-dot">${unread}</span>`:""}<div class="notif-panel hidden" id="notifPanel">${mine.length?mine.slice(0,10).map(n=>`<div class="notif-item">${esc(n.text)}</div>`).join(""):`<div class="notif-item" style="color:#777">No notifications yet.</div>`}</div></div>`;
}
async function toggleNotifPanel(e){
  e.preventDefault();e.stopPropagation();
  const p=document.getElementById("notifPanel");
  if(!p)return;
  p.classList.toggle("hidden");
  if(!p.classList.contains("hidden")){
    try {
      await fetch('/api/notifications/mark-read', { method: 'POST' });
      notifications.forEach(n => n.read = true);
      const dot = document.querySelector('.notif-dot');
      if(dot) dot.remove();
    } catch(e) {}
  }
}"""

content = content.replace(notifications_old, notifications_new)


# 3. Update submitClip
submit_clip_old = """function submitClip(id){
const c=allCampaigns().find(x=>x.id===id);
if(!campaignIsOpen(c)){toast(`This campaign isn't accepting submissions right now (${campaignStatusLabel(c)}).`);return}
const url=document.getElementById("clipUrl").value.trim(),views=Number(document.getElementById("clipViews").value);
if(!url||!views){toast("Add your clip URL and views.");return}
const earnings=Math.floor(views/1000*c.rate);
submissions.push({id:Date.now(),campaignId:c.id,businessEmail:c.email||null,userEmail:user.email,userName:user.name,title:c.title,url,views,rate:c.rate,earnings,status:"Under Review"});
localStorage.setItem("clipind_submissions",JSON.stringify(submissions));
if(c.email)addNotification(c.email,`New clip submitted to "${c.title}" by ${user.name}`);
toast("Clip submitted for review!");renderApp("submissions");
}"""

submit_clip_new = """async function submitClip(id){
  const c = allCampaigns().find(x=>x.id===id);
  if(!campaignIsOpen(c)){toast(`This campaign isn't accepting submissions right now (${campaignStatusLabel(c)}).`);return}
  const url = document.getElementById("clipUrl").value.trim();
  const views = Number(document.getElementById("clipViews").value);
  if(!url||!views){toast("Add your clip URL and views.");return}
  
  const platform = c.brief?.platforms?.[0] || c.platforms?.[0] || 'Instagram Reels';
  
  try {
    const res = await fetch(`/api/campaigns/${c.id}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, postUrl: url, submittedViews: views })
    });
    
    if (res.ok) {
      toast("Clip submitted for review!");
      await loadCampaigns();
      renderApp("submissions");
    } else {
      const err = await res.json();
      toast(err.error || "Failed to submit clip");
    }
  } catch(e) {
    toast("Error submitting clip");
  }
}"""

content = content.replace(submit_clip_old, submit_clip_new)


# 4. Update setSubmissionStatus
set_status_old = """function setSubmissionStatus(subId,status,reason){
const s=submissions.find(x=>x.id===subId);
if(!s)return;
s.status=status;
if(reason)s.reason=reason;
localStorage.setItem("clipind_submissions",JSON.stringify(submissions));
addNotification(s.userEmail,`Your clip "${s.title}" was ${status.toLowerCase()}${reason?` — ${reason}`:""}.`);
const c=createdCampaigns.find(x=>x.id===s.campaignId);
if(c&&status==="Approved"){
const remaining=remainingBudget(c);
if(remaining>0&&remaining<=c.budget*0.1)addNotification(c.email,`Your campaign "${c.title}" budget is almost exhausted — ₹${ind(remaining)} remaining.`);
}
toast(status==="Approved"?"Clip approved ✓":status==="Needs Changes"?"Changes requested":"Clip rejected");
manageCampaign(s.campaignId);
}"""

set_status_new = """async function setSubmissionStatus(subId,status,reason){
  let action = '';
  let payload = {};
  if (status === 'Approved') { action = 'approve'; payload = { verifiedViews: 10000 }; }
  else if (status === 'Needs Changes') { action = 'request-changes'; payload = { reason }; }
  else if (status === 'Rejected') { action = 'reject'; payload = { reason }; }
  
  const s = submissions.find(x=>x.id===subId);
  if (action === 'approve' && s) {
    payload.verifiedViews = s.views;
  }
  
  try {
    const res = await fetch(`/api/submissions/${subId}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      toast(status==="Approved"?"Clip approved ✓":status==="Needs Changes"?"Changes requested":"Clip rejected");
      await loadCampaigns();
      if(s) manageCampaign(s.campaignId);
    } else {
      const err = await res.json();
      toast(err.error || "Failed to update status");
    }
  } catch(e) { toast("Error updating status"); }
}"""

content = content.replace(set_status_old, set_status_new)

with open('public/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Finished updates.")
