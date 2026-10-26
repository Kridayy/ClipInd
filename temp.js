
const campaigns=[
{id:1,title:"Podcast Growth Campaign",business:"Global Creator Network",niche:"Podcasts",rate:50,budget:150000,views:"2.8M",status:"Live",description:"Create engaging short-form clips from approved podcast episodes and publish them to Indian audiences."},
{id:2,title:"AI & Future of Work",business:"Future Labs",niche:"Technology",rate:60,budget:90000,views:"1.4M",status:"Live",description:"Turn long-form conversations about AI, startups and careers into short, high-retention videos."},
{id:3,title:"Entrepreneur Stories",business:"Founders Studio",niche:"Business",rate:45,budget:75000,views:"980K",status:"Live",description:"Clip founder interviews and business lessons for Instagram Reels and YouTube Shorts."}
];

/* =====================================================================================
 * DATA & AUTH LAYER — PROTOTYPE ONLY, NOT PRODUCTION-SAFE
 * =====================================================================================
 * Everything below (`user`, `submissions`, `createdCampaigns`, `notifications`, `reports`,
 * and the `clipind_accounts` list used for login lookups) is read from and written to
 * browser localStorage as plain JSON. This is intentional for a frontend-only demo, but
 * it means:
 *   - Passwords are stored in plaintext in this browser. NEVER carry this pattern into
 *     production — real accounts need server-side hashing (bcrypt/argon2) and the
 *     password must never round-trip to the client after signup.
 *   - There is no real session/token system — "being logged in" is just an object sitting
 *     in localStorage that anyone with access to this browser could edit directly.
 *   - There is no server-side authorization check. Every "you can only manage your own
 *     campaign" / "you can only edit your own account" check happens in this same
 *     client-side JS, which a real backend must re-enforce independently — a client check
 *     is a UX convenience here, not a security boundary.
 * When wiring up a real backend: replace every direct localStorage.getItem/setItem call
 * in this section with authenticated API requests, move password handling server-side
 * entirely, and issue real session tokens instead of storing `user` as plain JSON.
 * ===================================================================================== */
let user=JSON.parse(localStorage.getItem("clipind_user")||"null");
let selectedRole="creator";
let submissions=JSON.parse(localStorage.getItem("clipind_submissions")||"[]");
let createdCampaigns=JSON.parse(localStorage.getItem("clipind_created")||"[]");
let notifications=JSON.parse(localStorage.getItem("clipind_notifications")||"[]"); // {id,forEmail,text,read,ts} — created only from real in-app events

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
}
document.addEventListener("click",()=>{const p=document.getElementById("notifPanel");if(p)p.classList.add("hidden")});

// Which top-level view is currently on screen: "home" | "app" | "info" | "auth".
// The nav only shows the account button when navView is "app" — everywhere else shows Login/Sign Up.
let navView="home";
// Auth page state
let authTab="signup";      // "signup" | "login"
let authMethod="email";    // "email" | "mobile"
let authStep="form";       // "form" | "otp" (signup only)
let pendingSignup=null;    // holds signup details while waiting for OTP
let demoOtp="";            // the demo OTP code shown on screen (no real SMS/email exists yet)
let forgotMethod="email";  // "email" | "mobile" | "username" — how the person looks up their account
let forgotStep="request";  // "request" | "reset"
let pendingReset=null;     // {username, masked} for the account being reset

function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
function roleLabel(role){return role==="business"?"Business":"Clipper"}
function hideAllViews(){
document.querySelector("main#home").classList.add("hidden");
document.getElementById("app").classList.add("hidden");
document.getElementById("infoPage").classList.add("hidden");
document.getElementById("authPage").classList.add("hidden");
}
async function logout(){
  try { await fetch('/api/auth/logout', { method: 'POST' }); } catch(e) {}
  user=null;localStorage.removeItem("clipind_user");showHome();toast("Logged out.")
}
function initials(name){return (name||"").trim().split(/s+/).slice(0,2).map(s=>s[0]?s[0].toUpperCase():"").join("")||"?"}
function toggleAccountMenu(e){e.preventDefault();e.stopPropagation();const d=document.getElementById("accountDropdown");if(d)d.classList.toggle("hidden")}
function closeAccountMenu(){const d=document.getElementById("accountDropdown");if(d)d.classList.add("hidden")}
document.addEventListener("click",closeAccountMenu);
// Swaps the top-right nav slot between "Login / Sign Up" and the logged-in user's account button + dropdown.
// The account badge only appears while navView is "app" (the dashboard) — home, info and auth pages always show Login/Sign Up.
function updateNavAuthButton(){
const wrap=document.getElementById("accountWrap");
if(!wrap)return;
if(user&&navView==="app"){
const avatarStyle=user.avatar?`background-image:url(${user.avatar})`:"";
wrap.innerHTML=`<div class="account-btn" onclick="toggleAccountMenu(event)">
<div class="avatar-circle" style="${avatarStyle}">${user.avatar?"":initials(user.name)}</div>
<div class="account-btn-text"><strong>${esc((user.name||"").split(" ")[0]||"Account")}</strong><small>${roleLabel(user.role)}</small></div>
<span class="chevron">▾</span>
<div class="account-dropdown hidden" id="accountDropdown">
<a href="#" onclick="event.preventDefault();event.stopPropagation();closeAccountMenu();renderApp()">📊 &nbsp;Dashboard</a>
${user.role==="creator"?`<a href="#" onclick="event.preventDefault();event.stopPropagation();closeAccountMenu();viewPublicProfile()">🪪 &nbsp;Public Profile</a>`:""}
<a href="#" onclick="event.preventDefault();event.stopPropagation();closeAccountMenu();openAccountSettings()">⚙ &nbsp;Account Settings</a>
<a href="#" onclick="event.preventDefault();event.stopPropagation();closeAccountMenu();logout()">↪ &nbsp;Log out</a>
</div>
</div>`;
}else{
wrap.innerHTML=`<a href="#" class="login" onclick="openAuthPage(event)">♙ &nbsp; Login / Sign Up</a>`;
}
}
// Account Settings modal
function openAccountSettings(){
document.getElementById("settingsName").value=user.name||"";
document.getElementById("settingsUsername").value=user.username||(user.email?user.email.split("@")[0]:"");
document.getElementById("settingsEmail").value=user.email||"";
document.getElementById("settingsMobile").value=user.mobile||"";
const preview=document.getElementById("avatarPreview");
if(user.avatar){preview.style.backgroundImage=`url(${user.avatar})`;preview.textContent=""}else{preview.style.backgroundImage="";preview.textContent=initials(user.name)}
updateEmailVerifiedBadge();
document.getElementById("accountModal").classList.add("open");
}
function closeAccountSettings(){document.getElementById("accountModal").classList.remove("open")}
function updateEmailVerifiedBadge(){
const badge=document.getElementById("emailVerifiedBadge"),btn=document.getElementById("verifyEmailBtn");
if(user.emailVerified){badge.innerHTML=`<span class="verified-badge">✓ Verified</span>`;btn.classList.add("hidden")}
else{badge.innerHTML=`<span class="unverified-badge">Not verified</span>`;btn.classList.remove("hidden")}
}
function verifyEmail(){
toast("Verification link sent (demo)…");
setTimeout(()=>{user.emailVerified=true;persistUser();updateEmailVerifiedBadge();toast("Email verified ✓")},1500);
}
function handleAvatarChange(e){
const file=e.target.files[0];
if(!file)return;
if(file.size>1500000){toast("Please choose an image under 1.5MB.");return}
const reader=new FileReader();
reader.onload=function(ev){
user.avatar=ev.target.result;
const preview=document.getElementById("avatarPreview");
preview.style.backgroundImage=`url(${user.avatar})`;
preview.textContent="";
};
reader.readAsDataURL(file);
}
function saveAccountSettings(){
const name=document.getElementById("settingsName").value.trim();
const username=document.getElementById("settingsUsername").value.trim().replace(/s+/g,"");
const email=document.getElementById("settingsEmail").value.trim();
const mobile=document.getElementById("settingsMobile").value.trim();
if(!name||!email){toast("Name and email can't be empty.");return}
const oldUsername=user.username;
if(email!==user.email)user.emailVerified=false;
user.name=name;user.username=username;user.email=email;user.mobile=mobile;
localStorage.setItem("clipind_user",JSON.stringify(user));
const accounts=JSON.parse(localStorage.getItem("clipind_accounts")||"[]");
const idx=accounts.findIndex(a=>a.username===oldUsername);
if(idx>=0){accounts[idx]=user;localStorage.setItem("clipind_accounts",JSON.stringify(accounts));}
updateNavAuthButton();
closeAccountSettings();
toast("Account updated!");
}
function showHome(){hideAllViews();document.querySelector("main#home").classList.remove("hidden");navView="home";updateNavAuthButton();window.scrollTo({top:0,behavior:"smooth"})}
function openCreator(){if(!user){openAuthPage(null,"creator");return} if(user.role!=="creator"){toast("Switch to a clipper account to access clipping.");return} renderApp("campaigns")}
function openBusiness(){if(!user){openAuthPage(null,"business");return} if(user.role!=="business"){toast("Switch to a business account to launch campaigns.");return} renderApp("business")}
function renderApp(tab="dashboard"){
hideAllViews();document.getElementById("app").classList.remove("hidden");
navView="app";updateNavAuthButton();
const app=document.getElementById("app");
if(user.role==="creator") renderCreator(app,tab); else renderBusiness(app,tab);
if(user.role==="creator"&&tab==="campaigns")renderMarket();
window.scrollTo({top:0,behavior:"smooth"});
}
// Full tutorial page for clippers — reachable from the nav, not just a same-page scroll.
function showHowItWorks(e){
if(e)e.preventDefault();
hideAllViews();
const page=document.getElementById("infoPage");page.classList.remove("hidden");
navView="info";updateNavAuthButton();
page.innerHTML=`
<div class="app-head"><div class="app-title"><h1>How Clipping Works</h1><p>A complete walkthrough for Indian clippers — from sign-up to payout.</p></div><button class="btn secondary" onclick="showHome()">← Home</button></div>
<div class="grid">
<div class="card"><span class="tag">STEP 1</span><h3>Create your clipper account</h3><p>Sign up with your name and email and choose "I'm a Clipper." No experience or subscriber count required to get started.</p></div>
<div class="card"><span class="tag">STEP 2</span><h3>Browse live campaigns</h3><p>Each campaign shows the pay rate, budget, niche and a brief describing the source content and what businesses expect.</p></div>
<div class="card"><span class="tag">STEP 3</span><h3>Read the brief carefully</h3><p>Every campaign explains what content you can clip from, the tone they want, and where clips should be posted.</p></div>
<div class="card"><span class="tag">STEP 4</span><h3>Edit a strong clip</h3><p>Vertical 9:16 format, a hook in the first 2–3 seconds, captions, and a length under 60 seconds tend to perform best.</p></div>
<div class="card"><span class="tag">STEP 5</span><h3>Publish it</h3><p>Post your clip to Instagram Reels or YouTube Shorts (or another eligible platform named in the brief).</p></div>
<div class="card"><span class="tag">STEP 6</span><h3>Submit your link</h3><p>Paste your public post URL into the campaign page along with your view count so it can be reviewed.</p></div>
<div class="card"><span class="tag">STEP 7</span><h3>Get reviewed</h3><p>The business checks your clip follows their brief and approves genuine, verified views before it becomes payable.</p></div>
<div class="card"><span class="tag">STEP 8</span><h3>Get paid</h3><p>Approved earnings show up on your Payouts page. The starting example rate is ₹50 per 1,000 verified views — rates vary by campaign.</p></div>
</div>
<div class="notice" style="max-width:900px;margin:10px auto 30px">Demo note: today, verified views and payouts are entered manually for demonstration. Real automatic view verification, fraud detection and bank/UPI payouts are part of ClipInd's upcoming backend (Stage 3).</div>
<div class="buttons" style="justify-content:center;margin-bottom:40px"><button class="btn primary" onclick="openCreator()">Start Clipping →</button></div>
`;
window.scrollTo({top:0,behavior:"smooth"});
}
// Full tutorial page for businesses/creators launching campaigns.
function showForBusiness(e){
if(e)e.preventDefault();
hideAllViews();
const page=document.getElementById("infoPage");page.classList.remove("hidden");
navView="info";updateNavAuthButton();
page.innerHTML=`
<div class="app-head"><div class="app-title"><h1>Launch a Campaign on ClipInd</h1><p>Turn your content into short-form distribution across India, powered by real clippers.</p></div><button class="btn secondary" onclick="showHome()">← Home</button></div>
<div class="grid">
<div class="card"><span class="tag">STEP 1</span><h3>Create a business account</h3><p>Sign up and choose "I'm a Business." Works for brands, creators, podcasters and agencies alike.</p></div>
<div class="card"><span class="tag">STEP 2</span><h3>Write your campaign brief</h3><p>Describe your content, the tone/style you want, and which platforms clips should be posted to.</p></div>
<div class="card"><span class="tag">STEP 3</span><h3>Set your rate & budget</h3><p>Choose what you'll pay per 1,000 verified views and the total budget you want to commit to the campaign.</p></div>
<div class="card"><span class="tag">STEP 4</span><h3>Publish</h3><p>Your campaign becomes visible to Indian clippers browsing ClipInd, matched by niche.</p></div>
<div class="card"><span class="tag">STEP 5</span><h3>Review submissions</h3><p>From your dashboard, open any campaign to see every clip submitted, with the link, views and earnings.</p></div>
<div class="card"><span class="tag">STEP 6</span><h3>Approve or reject</h3><p>Only approve clips that follow your brief. Only approved clips count toward spend and clipper payouts.</p></div>
<div class="card"><span class="tag">STEP 7</span><h3>Track performance</h3><p>Watch submissions, pending reviews and approved spend against your budget in real time from the dashboard.</p></div>
<div class="card"><span class="tag">STEP 8</span><h3>Pay only for results</h3><p>You only pay for verified, approved views — not upfront production or agency fees.</p></div>
</div>
<div class="notice" style="max-width:900px;margin:10px auto 30px">Demo note: campaign publishing and submission review are fully functional in this prototype and saved in your browser. Real billing, invoicing and automated view verification are part of ClipInd's upcoming backend (Stage 3).</div>
<div class="buttons" style="justify-content:center;margin-bottom:40px"><button class="btn primary" onclick="openBusiness()">Launch a Campaign →</button></div>
`;
window.scrollTo({top:0,behavior:"smooth"});
}

// Privacy Policy, Terms of Service, and Contact Us — reachable from the footer on every page.
function showPrivacyPolicy(e){
if(e)e.preventDefault();
const cameFromAuth=navView==="auth";
hideAllViews();
const page=document.getElementById("infoPage");page.classList.remove("hidden");
navView="info";updateNavAuthButton();
page.innerHTML=`
<div class="app-head"><div class="app-title"><h1>Privacy Policy</h1><p>Last updated: ${new Date().toLocaleDateString("en-IN",{year:"numeric",month:"long",day:"numeric"})}</p></div><button class="btn secondary" onclick="${cameFromAuth?"backToAuthFromInfo()":"showHome()"}">← ${cameFromAuth?"Back to Sign Up":"Home"}</button></div>
<div class="card form" style="max-width:820px;margin:0 auto 40px">
<div class="notice">This is placeholder policy content for a prototype. Before ClipInd handles any real user data, this must be reviewed and finalized by a qualified lawyer familiar with Indian data protection law (the DPDP Act) and any other jurisdictions ClipInd operates in.</div>
<h3 class="section-sub">What we collect</h3><p style="color:#ccc">Account details you provide (name, email or mobile number, username), campaign and submission data you create, and — in this prototype — a demo password stored only in your browser. A production version would additionally collect connected social account data needed to verify views.</p>
<h3 class="section-sub">How we use it</h3><p style="color:#ccc">To operate your account, match clippers with campaigns, calculate and pay out earnings, prevent fraud, and communicate with you about your activity on ClipInd.</p>
<h3 class="section-sub">Local storage in this prototype</h3><p style="color:#ccc">This demo stores your account, campaigns, submissions, and settings in your browser's local storage — nothing is sent to a real server. Clearing your browser data will erase it. A production version would store this securely on ClipInd's servers instead.</p>
<h3 class="section-sub">Sharing</h3><p style="color:#ccc">We would not sell personal data. Campaign and performance data may be shared between a clipper and the business whose campaign they submitted to, since that's necessary for the marketplace to function.</p>
<h3 class="section-sub">Your rights</h3><p style="color:#ccc">You can review, correct, or delete your account information via Account Settings, or by contacting us.</p>
<h3 class="section-sub">Contact</h3><p style="color:#ccc">Questions about privacy can be sent via the <a href="#" onclick="event.preventDefault();showContactUs()" style="color:var(--lime)">Contact Us</a> page.</p>
</div>`;
window.scrollTo({top:0,behavior:"smooth"});
}
function backToAuthFromInfo(){
hideAllViews();
document.getElementById("authPage").classList.remove("hidden");
navView="auth";updateNavAuthButton();
renderAuthPage();
window.scrollTo({top:0,behavior:"smooth"});
}
function showTermsOfService(e){
if(e)e.preventDefault();
const cameFromAuth=navView==="auth";
hideAllViews();
const page=document.getElementById("infoPage");page.classList.remove("hidden");
navView="info";updateNavAuthButton();
page.innerHTML=`
<div class="app-head"><div class="app-title"><h1>Terms of Service</h1><p>Last updated: ${new Date().toLocaleDateString("en-IN",{year:"numeric",month:"long",day:"numeric"})}</p></div><button class="btn secondary" onclick="${cameFromAuth?"backToAuthFromInfo()":"showHome()"}">← ${cameFromAuth?"Back to Sign Up":"Home"}</button></div>
<div class="card form" style="max-width:820px;margin:0 auto 40px">
<div class="notice">This is placeholder terms content for a prototype and is not a binding legal agreement. Before launch, this must be drafted and reviewed by a qualified lawyer.</div>
<h3 class="section-sub">1. Accounts</h3><p style="color:#ccc">You must provide accurate information when creating a clipper or business account and are responsible for activity under your account.</p>
<h3 class="section-sub">2. Campaigns & content</h3><p style="color:#ccc">Businesses grant clippers a limited license to clip and distribute their supplied content solely for the purpose of that campaign, subject to the campaign's brief. Clippers may not use campaign content outside the scope of the campaign it was provided for.</p>
<h3 class="section-sub">3. Payments</h3><p style="color:#ccc">Clippers are paid based on verified, approved views at the campaign's stated rate. Businesses are only charged for approved, verified performance. In this prototype, all payments and payouts are simulated and no real money moves.</p>
<h3 class="section-sub">4. Prohibited conduct</h3><p style="color:#ccc">Fraudulent or bot-generated views, purchased engagement, duplicate or spam submissions, and misleading captions are prohibited and may result in submission rejection, account suspension, or removal from the platform.</p>
<h3 class="section-sub">5. Disputes</h3><p style="color:#ccc">Disputes over submission review decisions can be raised via the report tools in-app, or by contacting us directly.</p>
<h3 class="section-sub">6. Liability</h3><p style="color:#ccc">ClipInd is provided "as is" during this prototype phase. We make no guarantee of earnings, campaign performance, or platform availability.</p>
<h3 class="section-sub">7. Governing law</h3><p style="color:#ccc">Placeholder — to be finalized with legal counsel, expected to reference Indian law given ClipInd's primary market.</p>
</div>`;
window.scrollTo({top:0,behavior:"smooth"});
}
function submitContactForm(){
const name=document.getElementById("contactName").value.trim();
const email=document.getElementById("contactEmail").value.trim();
const message=document.getElementById("contactMessage").value.trim();
if(!name||!email||!message){toast("Please fill in every field.");return}
const messages=JSON.parse(localStorage.getItem("clipind_contact_messages")||"[]");
messages.push({id:Date.now(),name,email,message,ts:Date.now()});
localStorage.setItem("clipind_contact_messages",JSON.stringify(messages));
toast("Message received (demo) — no real email is sent yet.");
document.getElementById("contactName").value="";
document.getElementById("contactEmail").value="";
document.getElementById("contactMessage").value="";
}
function showContactUs(e){
if(e)e.preventDefault();
hideAllViews();
const page=document.getElementById("infoPage");page.classList.remove("hidden");
navView="info";updateNavAuthButton();
page.innerHTML=`
<div class="app-head"><div class="app-title"><h1>Contact Us</h1><p>Questions, feedback, or a business you'd like to bring to ClipInd?</p></div><button class="btn secondary" onclick="showHome()">← Home</button></div>
<div class="card form" style="max-width:560px;margin:0 auto 40px">
<div class="notice">Demo mode: this form doesn't send a real email yet — it's stored locally to show the intended flow. There's no live support inbox behind hello@clipind.io in this prototype.</div>
<div class="field"><label>Your name</label><input id="contactName" placeholder="Your name"></div>
<div class="field"><label>Email</label><input id="contactEmail" type="email" placeholder="you@example.com"></div>
<div class="field"><label>Message</label><textarea id="contactMessage" placeholder="How can we help?"></textarea></div>
<button class="btn primary" style="width:100%;justify-content:center" onclick="submitContactForm()">Send Message →</button>
<p style="text-align:center;margin-top:18px;color:#777;font-size:13px">Or reach us at hello@clipind.io (placeholder — not a live inbox yet).</p>
</div>`;
window.scrollTo({top:0,behavior:"smooth"});
}

/* ===== AUTH PAGE: signup (role + email/mobile + password) → OTP → dashboard, or login ===== */

function openAuthPage(e,role){
if(e&&e.preventDefault)e.preventDefault();
if(role)selectedRole=role;
authTab="signup";authMethod="email";authStep="form";pendingSignup=null;
hideAllViews();document.getElementById("authPage").classList.remove("hidden");
navView="auth";updateNavAuthButton();
renderAuthPage();
window.scrollTo({top:0,behavior:"smooth"});
}
function switchAuthTab(tab){authTab=tab;authStep="form";renderAuthPage()}
// Re-renders the auth form while preserving whatever the person already typed, so switching
// role or email/mobile doesn't wipe their name/password.
function rerenderAuthPreserving(mutator){
const vals={
name:document.getElementById("signupName")?.value,
identifier:document.getElementById("signupIdentifier")?.value||document.getElementById("loginIdentifier")?.value||document.getElementById("forgotIdentifier")?.value,
password:document.getElementById("signupPassword")?.value||document.getElementById("loginPassword")?.value,
confirm:document.getElementById("signupConfirm")?.value
};
mutator();
renderAuthPage();
if(document.getElementById("signupName")&&vals.name)document.getElementById("signupName").value=vals.name;
if(document.getElementById("signupIdentifier")&&vals.identifier)document.getElementById("signupIdentifier").value=vals.identifier;
if(document.getElementById("loginIdentifier")&&vals.identifier)document.getElementById("loginIdentifier").value=vals.identifier;
if(document.getElementById("forgotIdentifier")&&vals.identifier)document.getElementById("forgotIdentifier").value=vals.identifier;
if(document.getElementById("signupPassword")&&vals.password)document.getElementById("signupPassword").value=vals.password;
if(document.getElementById("loginPassword")&&vals.password)document.getElementById("loginPassword").value=vals.password;
if(document.getElementById("signupConfirm")&&vals.confirm)document.getElementById("signupConfirm").value=vals.confirm;
}
function setForgotMethod(method){rerenderAuthPreserving(()=>{forgotMethod=method})}
function showForgotPassword(){authTab="forgot";forgotStep="request";forgotMethod="email";renderAuthPage()}
// Hides most of an email/mobile so the demo "we sent you a message" notice doesn't leak the real value.
function maskIdentifier(str){
if(!str)return "your account";
if(str.includes("@")){const [a,b]=str.split("@");return (a.length>2?a.slice(0,2):a)+"***@"+b;}
const digits=str.replace(/\D/g,"");
return digits.length>4?"•".repeat(digits.length-4)+digits.slice(-4):str;
}
async function submitForgotRequest(){
const identifier=document.getElementById("forgotIdentifier").value.trim();
if(!identifier){toast("Enter your "+(forgotMethod==="email"?"email":forgotMethod==="mobile"?"mobile number":"username")+".");return}

try {
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier })
  });
  const data = await res.json();
  if(!res.ok) throw new Error(data.error || 'Request failed');
  
  pendingReset = { identifier };
  forgotStep = "reset";
  renderAuthPage();
  toast(data.message + " (Check backend logs)");
} catch (err) {
  toast(err.message);
}
}
async function submitPasswordReset(){
const token=document.getElementById("resetToken")?.value?.trim();
const pw=document.getElementById("newPassword").value;
const confirm=document.getElementById("confirmNewPassword").value;
if(!token||!pw||!confirm){toast("Fill in all fields.");return}
if(pw.length<6){toast("Password must be at least 6 characters.");return}
if(pw!==confirm){toast("Passwords don't match.");return}

try {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword: pw })
  });
  const data = await res.json();
  if(!res.ok) throw new Error(data.error || 'Reset failed');
  
  pendingReset = null;
  toast("Password updated — please log in.");
  switchAuthTab("login");
} catch (err) {
  toast(err.message);
}
}
function setAuthRole(role){rerenderAuthPreserving(()=>{selectedRole=role})}
function setAuthMethod(method){rerenderAuthPreserving(()=>{authMethod=method})}
function renderAuthPage(){
const page=document.getElementById("authPage");
const roleButtons=`<div class="role"><button class="${selectedRole==="creator"?"selected":""}" onclick="setAuthRole('creator')">✂️ I'm a Clipper</button><button class="${selectedRole==="business"?"selected":""}" onclick="setAuthRole('business')">🚀 I'm a Business</button></div>`;
const methodButtons=`<div class="role"><button class="${authMethod==="email"?"selected":""}" onclick="setAuthMethod('email')">✉ Email</button><button class="${authMethod==="mobile"?"selected":""}" onclick="setAuthMethod('mobile')">📱 Mobile</button></div>`;
let inner="";
if(authTab==="signup"){
if(authStep==="otp"){
inner=`<h2>Verify your account</h2><p style="color:#999;margin-top:7px">Enter the 6-digit code sent to ${esc(pendingSignup.identifier)}.</p>
<div class="notice" style="margin-top:18px">Development mode: Check backend logs for the OTP code.</div>
<div class="field"><label>OTP code</label><input id="otpInput" maxlength="6" placeholder="6-digit code"></div>
<button class="btn primary" style="width:100%;justify-content:center" onclick="verifyOtpCode()">Verify & Continue →</button>
<p style="text-align:center;margin-top:16px;font-size:13px;color:#999">Didn't get it? <a href="#" style="color:var(--lime)" onclick="event.preventDefault();resendOtp()">Resend code</a> &nbsp;·&nbsp; <a href="#" style="color:var(--lime)" onclick="event.preventDefault();authStep='form';renderAuthPage()">← Back</a></p>`;
}else{
inner=`<h2>Create your ClipInd account</h2><p style="color:#999;margin-top:7px">Choose how you'll use ClipInd.</p>
${roleButtons}
<div class="field" style="margin-top:6px"><label>Sign up with</label>${methodButtons}</div>
<div class="field"><label>Full name</label><input id="signupName" placeholder="Your name"></div>
${authMethod==="email"?`<div class="field"><label>Email</label><input id="signupIdentifier" type="email" placeholder="you@example.com"></div>`:`<div class="field"><label>Mobile number</label><input id="signupIdentifier" type="tel" placeholder="+91 XXXXX XXXXX"></div>`}
<div class="field"><label>Create password</label><input id="signupPassword" type="password" placeholder="At least 6 characters"></div>
<div class="field"><label>Confirm password</label><input id="signupConfirm" type="password" placeholder="Re-enter password"></div>
<div class="notice">Demo mode: passwords are stored only in this browser for testing. Real accounts will use secure, hashed authentication once the backend is live (Stage 3).</div>
<p style="font-size:12px;color:#777;margin-bottom:14px">By creating an account, you agree to ClipInd's <a href="#" style="color:var(--lime)" onclick="event.preventDefault();showTermsOfService()">Terms of Service</a> and <a href="#" style="color:var(--lime)" onclick="event.preventDefault();showPrivacyPolicy()">Privacy Policy</a>.</p>
<button class="btn primary" style="width:100%;justify-content:center" onclick="submitSignup()">Create Account →</button>
<p style="text-align:center;margin-top:16px;font-size:13px;color:#999">Already have an account? <a href="#" style="color:var(--lime)" onclick="event.preventDefault();switchAuthTab('login')">Log in</a></p>`;
}
}else if(authTab==="forgot"){
const forgotMethodButtons=`<div class="role" style="grid-template-columns:1fr 1fr 1fr"><button class="${forgotMethod==="email"?"selected":""}" onclick="setForgotMethod('email')">✉ Email</button><button class="${forgotMethod==="mobile"?"selected":""}" onclick="setForgotMethod('mobile')">📱 Mobile</button><button class="${forgotMethod==="username"?"selected":""}" onclick="setForgotMethod('username')">@ Username</button></div>`;
if(forgotStep==="reset"){
inner=`<h2>Set a new password</h2><p style="color:#999;margin-top:7px">A reset notification was sent to ${esc(pendingReset.identifier)}.</p>
<div class="field" style="margin-top:14px"><label>Reset Token</label><input id="resetToken" placeholder="Paste token from email/logs"></div>
<div class="field"><label>New password</label><input id="newPassword" type="password" placeholder="At least 6 characters"></div>
<div class="field"><label>Confirm new password</label><input id="confirmNewPassword" type="password" placeholder="Re-enter password"></div>
<button class="btn primary" style="width:100%;justify-content:center" onclick="submitPasswordReset()">Reset Password →</button>`;
}else{
inner=`<h2>Reset your password</h2><p style="color:#999;margin-top:7px">Tell us how to find your account.</p>
<div class="field" style="margin-top:6px"><label>Find my account by</label>${forgotMethodButtons}</div>
<div class="field"><label>${forgotMethod==="email"?"Email":forgotMethod==="mobile"?"Mobile number":"Username"}</label><input id="forgotIdentifier" placeholder="${forgotMethod==="email"?"you@example.com":forgotMethod==="mobile"?"+91 XXXXX XXXXX":"yourname"}"></div>
<button class="btn primary" style="width:100%;justify-content:center" onclick="submitForgotRequest()">Continue →</button>
<p style="text-align:center;margin-top:16px;font-size:13px;color:#999"><a href="#" style="color:var(--lime)" onclick="event.preventDefault();switchAuthTab('login')">← Back to login</a></p>`;
}
}else{
inner=`<h2>Log in to ClipInd</h2><p style="color:#999;margin-top:7px">Welcome back.</p>
<div class="field" style="margin-top:6px"><label>Log in with</label>${methodButtons}</div>
${authMethod==="email"?`<div class="field"><label>Email</label><input id="loginIdentifier" type="email" placeholder="you@example.com"></div>`:`<div class="field"><label>Mobile number</label><input id="loginIdentifier" type="tel" placeholder="+91 XXXXX XXXXX"></div>`}
<div class="field"><label>Password</label><input id="loginPassword" type="password" placeholder="Your password"></div>
<p style="text-align:right;margin:-6px 0 4px"><a href="#" style="color:var(--lime);font-size:13px" onclick="event.preventDefault();showForgotPassword()">Forgot password?</a></p>
<button class="btn primary" style="width:100%;justify-content:center" onclick="submitLogin()">Log In →</button>
<p style="text-align:center;margin-top:16px;font-size:13px;color:#999">New to ClipInd? <a href="#" style="color:var(--lime)" onclick="event.preventDefault();switchAuthTab('signup')">Create an account</a></p>`;
}
page.innerHTML=`<div style="display:flex;justify-content:flex-end;max-width:460px;margin:0 auto"><button class="btn secondary" style="padding:9px 15px;margin-top:20px" onclick="showHome()">← Home</button></div><div class="auth-card">${inner}</div>`;
}
async function submitSignup(){
const name=document.getElementById("signupName").value.trim();
const identifier=document.getElementById("signupIdentifier").value.trim();
const password=document.getElementById("signupPassword").value;
const confirm=document.getElementById("signupConfirm").value;
if(!name||!identifier||!password||!confirm){toast("Please fill in every field.");return}
if(authMethod==="email"&&!/^\S+@\S+\.\S+$/.test(identifier)){toast("Enter a valid email address.");return}
if(authMethod==="mobile"&&identifier.replace(/\D/g,"").length<10){toast("Enter a valid mobile number.");return}
if(password.length<6){toast("Password must be at least 6 characters.");return}
if(password!==confirm){toast("Passwords don't match.");return}

try {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, identifier, method: authMethod, password, role: selectedRole === 'business' ? 'BUSINESS' : 'CLIPPER' })
  });
  const data = await res.json();
  if(!res.ok) throw new Error(data.error || 'Registration failed');
  
  pendingSignup = { userId: data.userId, identifier, method: authMethod };
  authStep = "otp";
  renderAuthPage();
  toast("OTP sent! (Check backend logs)");
} catch (err) {
  toast(err.message);
}
}
function resendOtp(){
demoOtp=String(Math.floor(100000+Math.random()*900000));
toast("New OTP sent (demo).");
renderAuthPage();
}
async function verifyOtpCode(){
const code=document.getElementById("otpInput").value.trim();
if(!code){toast("Enter the OTP code.");return}
try {
  const res = await fetch('/api/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: pendingSignup.userId,
      code
    })
  });
  const data = await res.json();
  if(!res.ok) throw new Error(data.error || 'Verification failed');
  
  user = data.user;
  user.role = user.role === 'CLIPPER' ? 'creator' : user.role.toLowerCase(); // Convert enum to lowercase for frontend compatibility
  localStorage.setItem("clipind_user", JSON.stringify(user));
  pendingSignup=null;
  toast("Account verified — welcome to ClipInd!");
  renderApp();
} catch (err) {
  toast(err.message);
}
}
async function submitLogin(){
const identifier=document.getElementById("loginIdentifier").value.trim();
const password=document.getElementById("loginPassword").value;
if(!identifier||!password){toast("Enter your details to log in.");return}
try {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password })
  });
  const data = await res.json();
  if(!res.ok) throw new Error(data.error || 'Login failed');
  
  user = data.user;
  user.role = user.role === 'CLIPPER' ? 'creator' : user.role.toLowerCase();
  localStorage.setItem("clipind_user", JSON.stringify(user));
  toast("Welcome back!");
  renderApp();
} catch(err) {
  toast(err.message);
}
}
function appHeader(title,sub,extraRight=""){
return `<div class="app-head"><div class="app-title"><h1>${title}</h1><p>${sub}</p></div><div style="display:flex;align-items:center;gap:12px">${extraRight}<button class="btn secondary" onclick="showHome()">← Home</button></div></div>`;
}
// Shared nav strip for all clipper (creator) screens, plus the wallet balance chip shown next to "← Home".
function creatorNav(active){
const tabs=[["dashboard","Dashboard"],["campaigns","Campaigns"],["submissions","My Submissions"],["earnings","Earnings & Wallet"],["analytics","Analytics"]];
return `<div class="appnav">${tabs.map(([key,label])=>`<button class="tab${active===key?" active":""}" onclick="renderApp('${key}')">${label}</button>`).join("")}<button class="tab" onclick="logout()">Log out</button></div>`;
}
// Shared nav strip for all business screens — dashboard, wizard, and manage-campaign all use this now.
function businessNav(active){
const tabs=[["dashboard","Dashboard","renderApp('dashboard')"],["create","+ New Campaign","startWizard()"],["analytics","Analytics","renderApp('analytics')"]];
return `<div class="appnav">${tabs.map(([key,label,action])=>`<button class="tab${active===key?" active":""}" onclick="${action}">${label}</button>`).join("")}<button class="tab" onclick="logout()">Log out</button></div>`;
}
function walletBalance(){
if(!user)return 0;
const approved=submissions.filter(x=>x.userEmail===user.email&&x.status==="Approved").reduce((a,x)=>a+x.earnings,0);
return Math.max(0,approved+(user.bonusEarned||0)-(user.walletClaimed||0));
}
// ISO-ish week key so the mission resets every week without a backend.
function weekKey(){
const d=new Date();const onejan=new Date(d.getFullYear(),0,1);
const week=Math.ceil((((d-onejan)/86400000)+onejan.getDay()+1)/7);
return `${d.getFullYear()}-W${week}`;
}
function weekProgress(){
const weekAgoMs=Date.now()-7*24*60*60*1000;
return Math.min(3,submissions.filter(x=>x.userEmail===user.email&&x.status==="Approved"&&x.id>=weekAgoMs).length);
}
function claimMissionBonus(){
const wk=weekKey();
if(user.missionClaimedWeek===wk){toast("Already claimed this week.");return}
if(weekProgress()<3){toast("Get 3 clips approved this week to unlock the bonus.");return}
user.bonusEarned=(user.bonusEarned||0)+250;
user.missionClaimedWeek=wk;
persistUser();
toast("₹250 bonus added to your wallet!");
renderApp("dashboard");
}
// A business is shown as "Verified" once their account itself is verified (email/mobile) — a real
// verification badge (business registration, etc.) would need actual backend checks.
function isBusinessVerified(email){
if(!email)return false;
const accounts=JSON.parse(localStorage.getItem("clipind_accounts")||"[]");
const acc=accounts.find(a=>a.email===email);
return !!(acc&&(acc.emailVerified||acc.mobileVerified));
}
function viewPublicProfile(){
if(!user)return;
const mine=submissions.filter(x=>x.userEmail===user.email);
const approved=mine.filter(x=>x.status==="Approved");
const decided=mine.filter(x=>x.status==="Approved"||x.status==="Rejected");
const total=approved.reduce((a,x)=>a+x.earnings,0);
const totalViews=approved.reduce((a,x)=>a+x.views,0);
const completed=new Set(approved.map(x=>x.campaignId)).size;
const approvalRate=decided.length?Math.round((approved.length/decided.length)*100):0;
const lvl=clipperLevel();
const top=approved.slice().sort((a,b)=>b.views-a.views).slice(0,3);
const app=document.getElementById("app");
app.innerHTML=`${appHeader(`@${esc(user.username||user.name.toLowerCase().replace(/s+/g,""))}`,"Public clipper profile",creatorHeaderExtras())}
<div class="card">
<div class="avatar-edit"><div class="avatar-circle large" style="${user.avatar?`background-image:url(${user.avatar})`:""}">${user.avatar?"":initials(user.name)}</div><div><h3 style="margin:0">${esc(user.name)}</h3><div class="level-badge" style="margin-top:8px">🏅 ${lvl.name}</div></div></div>
<div class="stats" style="margin-top:20px"><div class="stat"><small>Verified views</small><strong>${ind(totalViews)}</strong></div><div class="stat"><small>Total earnings</small><strong>₹${ind(total)}</strong></div><div class="stat"><small>Campaigns completed</small><strong>${completed}</strong></div><div class="stat"><small>Approval rate</small><strong>${approvalRate}%</strong></div></div>
<div class="notice">Demo mode: this is a preview of what a public/business-facing clipper profile would show. It isn't linkable outside your own account yet.</div>
<h3 class="section-sub">Top Clips</h3>
${top.length?`<div class="grid">${top.map(x=>`<div class="card"><h3>${esc(x.title)}</h3><div class="stats"><div class="stat"><small>Views</small><strong>${ind(x.views)}</strong></div><div class="stat"><small>Earned</small><strong>₹${ind(x.earnings)}</strong></div></div></div>`).join("")}</div>`:`<div class="empty">No approved clips yet.</div>`}
<button class="btn secondary" style="margin-top:20px" onclick="renderApp('dashboard')">← Back to dashboard</button>
</div>`;
}
function walletChip(){
if(!user||user.role!=="creator")return "";
return `<div class="wallet-chip" onclick="renderApp('earnings')">💰 ₹${ind(walletBalance())}<small>Wallet</small></div>`;
}
// Level is based on real approved earnings — not vanity metrics like follower count or raw view count.
function clipperLevel(){
const approved=submissions.filter(x=>x.userEmail===user.email&&x.status==="Approved").reduce((a,x)=>a+x.earnings,0);
const tiers=[["Rookie",0,5000],["Rising",5000,25000],["Pro",25000,75000],["Elite",75000,200000],["Legend",200000,null]];
let current=tiers[0];
for(const t of tiers){if(approved>=t[1])current=t}
const [name,floor,next]=current;
const pct=next?Math.min(100,Math.round(((approved-floor)/(next-floor))*100)):100;
return {name,approved,next,pct};
}
function creatorHeaderExtras(){return notifBell()+walletChip()}
// Keeps localStorage's session AND the accounts list (used for login lookups) in sync whenever the user object changes.
function persistUser(){
localStorage.setItem("clipind_user",JSON.stringify(user));
const accounts=JSON.parse(localStorage.getItem("clipind_accounts")||"[]");
const idx=accounts.findIndex(a=>a.username===user.username);
if(idx>=0){accounts[idx]=user;localStorage.setItem("clipind_accounts",JSON.stringify(accounts));}
}
function renderCreator(app,tab){
let content="";
const mine=submissions.filter(x=>x.userEmail===user.email);
const wc=creatorHeaderExtras();
if(tab==="campaigns"){
content=`${appHeader("Find your next campaign","Clip content. Publish it. Earn in INR.",wc)}${creatorNav('campaigns')}
<div class="market-controls">
<input id="marketSearch" placeholder="Search campaigns…" oninput="renderMarket()">
<select id="marketNiche" onchange="renderMarket()"><option value="">All niches</option><option>Podcasts</option><option>Technology</option><option>Business</option><option>Gaming</option><option>Finance</option><option>Entertainment</option><option>Education</option><option>Fitness</option></select>
<select id="marketSort" onchange="renderMarket()"><option value="rate">Highest payout</option><option value="budget">Largest remaining budget</option><option value="newest">Newest</option></select>
</div>
<div class="grid" id="marketGrid"></div>`;
}else if(tab==="submissions"){
content=`${appHeader("My Submissions","Track clips you've submitted.",wc)}${creatorNav('submissions')}${mine.length?`<div class="grid">${mine.map(x=>`<div class="card"><span class="pill ${statusClass(x.status)}">${x.status}</span><h3 style="margin-top:10px">${x.title}</h3><p>${x.url}</p>${x.reason?`<p style="color:#999;font-size:12px">Reason: ${esc(x.reason)}</p>`:""}<div class="stats"><div class="stat"><small>Views</small><strong>${ind(x.views)}</strong></div><div class="stat"><small>Rate</small><strong>₹${x.rate}</strong></div><div class="stat"><small>Earned</small><strong>₹${ind(x.earnings)}</strong></div></div><button class="btn secondary" style="margin-top:14px;padding:9px 14px" onclick="viewClipDetail(${x.id})">View analytics →</button></div>`).join("")}</div>`:`<div class="empty">No submissions yet. Once you submit a clip to a campaign, it'll show up here.</div>`}`;
}else if(tab==="earnings"){
const total=mine.reduce((a,x)=>a+x.earnings,0);
const balance=walletBalance();
const methods=user.linkedMethods||[];
content=`${appHeader("Earnings & Wallet","Track what you've earned and claim it to a payout method.",wc)}${creatorNav('earnings')}
<div class="stats"><div class="stat"><small>Total earned</small><strong>₹${ind(total)}</strong></div><div class="stat"><small>Available to claim</small><strong>₹${ind(balance)}</strong></div><div class="stat"><small>Submitted clips</small><strong>${mine.length}</strong></div></div>
<div class="notice">Demo mode: a business must approve a clip before it becomes claimable. Real bank/UPI transfers require payment integration (Stage 3).</div>
${mine.length?`<table class="table"><tr><th>Clip</th><th>Views</th><th>Earned</th><th>Status</th></tr>${mine.map(x=>`<tr><td>${x.title}${x.reason?`<br><small style="color:#777">${esc(x.reason)}</small>`:""}</td><td>${ind(x.views)}</td><td>₹${ind(x.earnings)}</td><td><span class="pill ${statusClass(x.status)}">${x.status}</span></td></tr>`).join("")}</table>`:`<div class="empty">No earnings yet. Submit your first clip to get started.</div>`}
<h3 style="margin:34px 0 4px">Wallet</h3><p style="color:#999;font-size:14px;margin-bottom:16px">Claim your available balance to a linked payment method.</p>
<div class="grid">
${methods.length?methods.map((m,i)=>`<div class="card"><span class="tag">${esc(m.type)}</span><h3>${esc(m.type)}</h3><p>${esc(m.identifier)}</p><div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap"><button class="btn primary" style="padding:10px 14px" onclick="claimToMethod(${i})" ${balance<=0?"disabled":""}>Claim ₹${ind(balance)} →</button><button class="btn secondary" style="padding:10px 14px" onclick="removeWalletMethod(${i})">Remove</button></div></div>`).join(""):`<div class="card"><span class="tag">GET STARTED</span><h3>No payout method linked yet</h3><p>Link Google Pay, PhonePe, or a bank account below to start claiming your earnings.</p></div>`}
<div class="card form"><span class="tag">ADD METHOD</span><h3>Link a payout method</h3><div class="field"><label>Method type</label><select id="methodType"><option>Google Pay</option><option>PhonePe</option><option>Paytm</option><option>Bank Account</option><option>Other UPI</option></select></div><div class="field"><label>UPI ID / Account number</label><input id="methodIdentifier" placeholder="yourname@upi or account number"></div><button class="btn primary" onclick="addWalletMethod()">+ Link Method</button></div>
</div>
<div style="margin-top:6px;color:#777;font-size:12px">Total claimed so far: ₹${ind(user.walletClaimed||0)}</div>`;
}else if(tab==="analytics"){
const approved=mine.filter(x=>x.status==="Approved");
const totalViews=approved.reduce((a,x)=>a+x.views,0);
const totalEarned=approved.reduce((a,x)=>a+x.earnings,0);
const avgViews=approved.length?Math.round(totalViews/approved.length):0;
const best=approved.slice().sort((a,b)=>b.views-a.views)[0];
const highest=Math.max(1,...approved.map(x=>x.views));
content=`${appHeader("Analytics","Your performance across every approved clip.",wc)}${creatorNav('analytics')}
<div class="stats"><div class="stat"><small>Verified views</small><strong>${ind(totalViews)}</strong></div><div class="stat"><small>Total earned</small><strong>₹${ind(totalEarned)}</strong></div><div class="stat"><small>Avg views / clip</small><strong>${ind(avgViews)}</strong></div><div class="stat"><small>Best clip</small><strong style="font-size:14px">${best?ind(best.views)+" views":"—"}</strong></div></div>
${approved.length?`<h3 class="section-sub">Views by approved clip</h3><div style="display:flex;align-items:flex-end;gap:10px;height:110px;margin:16px 0">${approved.map(x=>`<div style="flex:1;text-align:center"><div style="background:linear-gradient(180deg,var(--lime),var(--purple));border-radius:4px 4px 0 0;height:${Math.max(6,Math.round((x.views/highest)*90))}px"></div><small style="color:#777;font-size:10px">${esc(x.title.slice(0,10))}</small></div>`).join("")}</div><small style="color:#777">Demo data — real analytics require connected social accounts, not manual entry.</small>`:`<div class="empty">No approved clips yet — once a business approves one of your submissions, its performance will show up here.</div>`}`;
}else{
const lvl=clipperLevel();
const all=allCampaigns();
const recommended=all.slice().sort((a,b)=>b.rate-a.rate).slice(0,3);
const trending=all.slice().sort((a,b)=>submissions.filter(s=>s.campaignId===b.id).length-submissions.filter(s=>s.campaignId===a.id).length).slice(0,3);
const endingSoon=all.filter(c=>c.endDate).sort((a,b)=>new Date(a.endDate)-new Date(b.endDate)).slice(0,3);
content=`${appHeader(`Hey, ${esc(user.name)} 👋`,"Ready to turn another view into income?",wc)}${creatorNav('dashboard')}
<div class="level-badge">🏅 ${lvl.name}</div>
<div class="level-bar"><div class="level-bar-fill" style="width:${lvl.pct}%"></div></div>
<small style="color:#777">${lvl.next?`₹${ind(lvl.approved)} of ₹${ind(lvl.next)} approved earnings to reach the next level`:"You've reached the top level — Legend."}</small>
<div class="stats" style="margin-top:22px"><div class="stat"><small>Available campaigns</small><strong>${all.length}</strong></div><div class="stat"><small>Your submissions</small><strong>${mine.length}</strong></div><div class="stat"><small>Total earnings</small><strong>₹${ind(mine.reduce((a,x)=>a+x.earnings,0))}</strong></div></div>
<div class="grid"><div class="card"><span class="tag">START HERE</span><h3>Browse campaigns</h3><p>Find global creators and businesses looking for Indian distribution.</p><button class="btn primary" style="margin-top:18px" onclick="renderApp('campaigns')">Browse campaigns →</button></div><div class="card"><span class="tag">HOW TO EARN</span><h3>Create & publish clips</h3><p>Choose a campaign, create a short, publish it, then submit your link for review.</p><button class="btn secondary" style="margin-top:18px" onclick="document.getElementById('how').scrollIntoView()">View guide →</button></div><div class="card"><span class="tag">ACCOUNT</span><h3>${esc(user.email)}</h3><p>Clipper account. Your demo activity is stored in this browser.</p><button class="btn secondary" style="margin-top:18px" onclick="logout()">Log out</button></div></div>
<h3 class="section-sub">🎯 Weekly Mission</h3>
<div class="card"><h3>Get 3 clips approved this week</h3><div class="level-bar"><div class="level-bar-fill" style="width:${(weekProgress()/3)*100}%"></div></div><small style="color:#777">${weekProgress()} / 3 completed</small><div style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px"><span style="color:var(--lime);font-weight:800">Reward: ₹250 bonus</span>${user.missionClaimedWeek===weekKey()?`<span class="pill approved">Claimed ✓</span>`:weekProgress()>=3?`<button class="btn primary" style="padding:9px 16px" onclick="claimMissionBonus()">Claim →</button>`:``}</div></div>
<h3 class="section-sub">✨ Recommended for You</h3><div class="grid">${recommended.length?recommended.map(c=>campaignCard(c)).join(""):`<div class="empty">No campaigns available yet.</div>`}</div>
<h3 class="section-sub">🔥 Trending</h3><div class="grid">${trending.length?trending.map(c=>campaignCard(c)).join(""):`<div class="empty">No campaign activity yet.</div>`}</div>
<h3 class="section-sub">⏰ Ending Soon</h3>${endingSoon.length?`<div class="grid">${endingSoon.map(c=>campaignCard(c)).join("")}</div>`:`<div class="empty">No campaigns have a set end date right now.</div>`}`;
}
app.innerHTML=content;
}
// Wallet actions
function addWalletMethod(){
const type=document.getElementById("methodType").value;
const identifier=document.getElementById("methodIdentifier").value.trim();
if(!identifier){toast("Enter a UPI ID or account number.");return}
if(!user.linkedMethods)user.linkedMethods=[];
user.linkedMethods.push({type,identifier});
persistUser();
toast("Payout method linked!");
renderApp("wallet");
}
function removeWalletMethod(i){
user.linkedMethods.splice(i,1);
persistUser();
toast("Method removed.");
renderApp("wallet");
}
function claimToMethod(i){
const balance=walletBalance();
if(balance<=0){toast("No balance available to claim.");return}
const m=user.linkedMethods[i];
user.walletClaimed=(user.walletClaimed||0)+balance;
persistUser();
toast(`₹${ind(balance)} claimed to ${esc(m.type)} (demo)`);
renderApp("wallet");
}
// Combines the platform's seed campaigns with campaigns real businesses have published,
// so clippers can browse and submit to BOTH from one list.
function allCampaigns(){return [...campaigns,...createdCampaigns]}
function statusClass(status){
if(status==="Approved")return "approved";
if(status==="Rejected")return "rejected";
if(status==="Needs Changes")return "changes";
return ""
}
function budgetBar(spent,budget){
const pct=budget>0?Math.min(100,Math.round(spent/budget*100)):0;
return `<div class="budget-bar"><div class="budget-bar-fill" style="width:${pct}%"></div></div><small style="color:#777">₹${ind(spent)} of ₹${ind(budget)} budget spent (approved clips only)</small>`;
}
function remainingBudget(c){
const spent=submissions.filter(s=>s.campaignId===c.id&&s.status==="Approved").reduce((a,x)=>a+x.earnings,0);
return Math.max(0,c.budget-spent);
}
// A campaign only accepts new submissions while it's Live, funded, and not past its end date.
function campaignIsOpen(c){
if(c.status==="Paused"||c.status==="Ended")return false;
if(remainingBudget(c)<=0)return false;
if(c.endDate&&new Date(c.endDate)<new Date(new Date().toDateString()))return false;
return true;
}
function campaignStatusLabel(c){
if(c.status==="Paused")return "Paused";
if(c.status==="Ended")return "Ended";
if(remainingBudget(c)<=0)return "Budget Exhausted";
if(c.endDate&&new Date(c.endDate)<new Date(new Date().toDateString()))return "Ended";
return c.status||"Live";
}
function campaignCard(c){
const remaining=remainingBudget(c);
const open=campaignIsOpen(c);
const label=campaignStatusLabel(c);
const clipperCount=submissions.filter(s=>s.campaignId===c.id).length;
const verified=isBusinessVerified(c.email);
return `<div class="card">${c.banner?`<div class="campaign-banner" style="background-image:url(${c.banner})"></div>`:""}<span class="tag">${label} · ${esc(c.niche)}</span><h3>${esc(c.title)}</h3><p style="color:#999;font-size:12px;margin:-4px 0 6px">${esc(c.business)}${verified?` <span style="color:var(--lime);font-weight:800">✓ Verified</span>`:""}</p><p>${esc(c.description)}</p><div class="stats"><div class="stat"><small>Rate</small><strong>₹${c.rate}</strong><small>/ 1K views</small></div><div class="stat"><small>Remaining</small><strong>₹${ind(remaining)}</strong></div><div class="stat"><small>Clippers</small><strong>${clipperCount}</strong></div></div><button class="btn primary" ${open?`onclick="viewCampaign(${c.id})"`:"disabled"}>${open?"View campaign →":label}</button></div>`;
}
// Reporting (campaigns, clips, businesses, clippers) — prototype logs reports locally; a real
// system would route these to a moderation queue.
let reports=JSON.parse(localStorage.getItem("clipind_reports")||"[]");
let pendingReportTarget=null;
function openReportModal(type,targetId,targetLabel){
pendingReportTarget={type,targetId,targetLabel};
document.getElementById("reportTypeLabel").textContent=type;
document.getElementById("reportTargetLabel").textContent=targetLabel;
document.getElementById("reportModal").classList.add("open");
}
function closeReportModal(){document.getElementById("reportModal").classList.remove("open");pendingReportTarget=null}
function submitReport(){
if(!pendingReportTarget)return;
const reason=document.getElementById("reportReason").value;
const details=document.getElementById("reportDetails").value.trim();
reports.push({id:Date.now(),...pendingReportTarget,reason,details,by:user?user.email:"anonymous",ts:Date.now()});
localStorage.setItem("clipind_reports",JSON.stringify(reports));
closeReportModal();
toast("Report submitted — our team will review it.");
}
// Search + niche filter + sort for the clipper-facing campaign marketplace.
function renderMarket(){
const grid=document.getElementById("marketGrid");
if(!grid)return;
const q=(document.getElementById("marketSearch")?.value||"").toLowerCase().trim();
const niche=document.getElementById("marketNiche")?.value||"";
const sort=document.getElementById("marketSort")?.value||"rate";
let list=allCampaigns().filter(c=>
(!q||c.title.toLowerCase().includes(q)||c.business.toLowerCase().includes(q))&&
(!niche||c.niche===niche)
);
if(sort==="rate")list=list.slice().sort((a,b)=>b.rate-a.rate);
else if(sort==="budget")list=list.slice().sort((a,b)=>remainingBudget(b)-remainingBudget(a));
else if(sort==="newest")list=list.slice().sort((a,b)=>b.id-a.id);
grid.innerHTML=list.length?list.map(c=>campaignCard(c)).join(""):`<div class="empty">No campaigns match your search. Try a different niche or clear your filters.</div>`;
}
function viewCampaign(id){
const c=allCampaigns().find(x=>x.id===id);const app=document.getElementById("app");
const remaining=remainingBudget(c);
const open=campaignIsOpen(c);
const label=campaignStatusLabel(c);
const b=c.brief||{};
const assets=c.assets||{};
const briefRow=(label,val)=>val?`<div class="brief-block"><small>${label}</small>${esc(val)}</div>`:"";
const briefHtml=[briefRow("Do",b.do),briefRow("Don't",b.dont),briefRow("Hook Style",b.hook),briefRow("Caption Style",b.caption),briefRow("Required CTA",b.cta),briefRow("Required Hashtags",b.hashtags),briefRow("Video Length",b.length),briefRow("Platforms",(b.platforms||[]).join(", "))].join("");
const links=(assets.referenceLinks||[]).filter(Boolean);
app.innerHTML=`${appHeader(c.title,`${c.business}${isBusinessVerified(c.email)?" ✓":""} · ${c.niche}`)}<div class="card form">
${c.banner?`<div class="campaign-banner" style="height:180px;margin-bottom:18px;background-image:url(${c.banner})"></div>`:""}
<span class="tag">${label}</span> <a href="#" style="color:#666;font-size:11px;margin-left:10px" onclick="event.preventDefault();openReportModal('Campaign',${c.id},'${esc(c.title)}')">🚩 Report campaign</a><h2 style="margin-bottom:12px">${esc(c.title)}</h2><p>${esc(c.description)}</p>
<div class="stats"><div class="stat"><small>Rate</small><strong>₹${c.rate}</strong><small>per 1,000 views</small></div><div class="stat"><small>Remaining budget</small><strong>₹${ind(remaining)}</strong></div><div class="stat"><small>Ends</small><strong>${c.endDate?new Date(c.endDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"Open-ended"}</strong></div></div>

<h3 class="section-sub" style="margin-top:26px">What You're Clipping</h3>
${c.banner||assets.logo||links.length||assets.audioNotes?`
<div class="brief-grid">
${c.banner?`<div class="brief-block"><small>Banner</small><a href="${c.banner}" download="${esc(c.title)}-banner.png" style="color:var(--lime)">Download ↓</a></div>`:""}
${assets.logo?`<div class="brief-block"><small>Logo</small><a href="${assets.logo}" download="${esc(c.title)}-logo.png" style="color:var(--lime)">Download ↓</a></div>`:""}
${assets.audioNotes?`<div class="brief-block"><small>Music / Audio Notes</small>${esc(assets.audioNotes)}</div>`:""}
${links.length?`<div class="brief-block"><small>Reference Links</small>${links.map(l=>`<a href="${esc(l)}" target="_blank" rel="noopener" style="color:var(--lime);display:block;word-break:break-all">${esc(l)}</a>`).join("")}</div>`:""}
</div>`:`<div class="notice">No source assets uploaded for this campaign yet — check the brief below for what to use.</div>`}

${briefHtml?`<h3 class="section-sub">Campaign Brief</h3><div class="brief-grid">${briefHtml}</div>`:`<div class="notice">This campaign hasn't added detailed creative brief fields — follow the overview above.</div>`}

<h3 class="section-sub">Potential Earnings</h3>
<div class="earn-tiers"><div class="earn-tier"><small>10K views</small><strong>₹${ind(Math.floor(10000/1000*c.rate))}</strong></div><div class="earn-tier"><small>100K views</small><strong>₹${ind(Math.floor(100000/1000*c.rate))}</strong></div><div class="earn-tier"><small>1M views</small><strong>₹${ind(Math.floor(1000000/1000*c.rate))}</strong></div></div>
<small style="color:#777">Estimates only, based on this campaign's rate. Actual pay depends on verified, approved views.</small>

${!open?`<div class="notice" style="margin-top:22px">This campaign isn't accepting new submissions right now (${label}). ${label==="Budget Exhausted"?"The business hasn't added more budget yet.":label==="Paused"?"The business has paused it.":"It has ended."}</div>`:`
<h3 class="section-sub">Start Creating</h3>
<div class="notice">Create your clip using the campaign's approved content, publish it to an eligible platform, then submit the public post URL below. <strong>Demo metrics:</strong> you enter your view count manually for this prototype — a real system would pull verified views automatically from your connected account instead.</div>
<div class="field"><label>Your clip/post URL</label><input id="clipUrl" placeholder="https://instagram.com/reel/... or https://youtube.com/shorts/..."></div>
<div class="field"><label>Demo metrics — verified views</label><input id="clipViews" type="number" min="0" value="10000"></div>
<button class="btn primary" onclick="submitClip(${c.id})">Submit clip →</button>`}
<button class="btn secondary" style="margin-left:8px;margin-top:18px" onclick="renderApp('campaigns')">Back</button>
</div>`;
}
function submitClip(id){
const c=allCampaigns().find(x=>x.id===id);
if(!campaignIsOpen(c)){toast(`This campaign isn't accepting submissions right now (${campaignStatusLabel(c)}).`);return}
const url=document.getElementById("clipUrl").value.trim(),views=Number(document.getElementById("clipViews").value);
if(!url||!views){toast("Add your clip URL and views.");return}
const earnings=Math.floor(views/1000*c.rate);
submissions.push({id:Date.now(),campaignId:c.id,businessEmail:c.email||null,userEmail:user.email,userName:user.name,title:c.title,url,views,rate:c.rate,earnings,status:"Under Review"});
localStorage.setItem("clipind_submissions",JSON.stringify(submissions));
if(c.email)addNotification(c.email,`New clip submitted to "${c.title}" by ${user.name}`);
toast("Clip submitted for review!");renderApp("submissions");
}
// Deterministic demo analytics (seeded from the submission id, so numbers don't jump around on refresh).
function viewClipDetail(id){
const s=submissions.find(x=>x.id===id);
if(!s){toast("Submission not found.");return}
const app=document.getElementById("app");
const seed=s.id%1000;
const days=[...Array(7)].map((_,i)=>Math.max(400,Math.floor((s.views/7)*(0.5+((seed+i*37)%100)/100))));
const maxDay=Math.max(...days);
const likes=Math.floor(s.views*0.08),comments=Math.floor(s.views*0.004),shares=Math.floor(s.views*0.012);
const viral=s.views>300000&&s.status!=="Rejected";
app.innerHTML=`${appHeader(s.title,"Clip performance",creatorHeaderExtras())}
<div class="card">
${viral?`<div class="notice" style="border-color:var(--lime)">🚀 <strong>Your clip is taking off!</strong> +${ind(Math.floor(s.views*0.02))} views in the last hour (demo).</div>`:""}
<span class="pill ${statusClass(s.status)}">${s.status}</span>${s.reason?`<span style="color:#999;font-size:12px;margin-left:10px">${esc(s.reason)}</span>`:""}
<div class="stats" style="margin-top:14px"><div class="stat"><small>Views</small><strong>${ind(s.views)}</strong></div><div class="stat"><small>Rate</small><strong>₹${s.rate}</strong></div><div class="stat"><small>Earned</small><strong>₹${ind(s.earnings)}</strong></div></div>
<h3 class="section-sub">Views over time (demo)</h3>
<div style="display:flex;align-items:flex-end;gap:8px;height:100px;margin:16px 0">${days.map(d=>`<div style="flex:1;background:linear-gradient(180deg,var(--lime),var(--purple));border-radius:4px 4px 0 0;height:${Math.max(6,Math.round((d/maxDay)*100))}%\"></div>`).join("")}</div>
<small style="color:#777">Demo data — real analytics require a connected social account (Instagram/YouTube), not manual entry.</small>
<h3 class="section-sub">Engagement (demo)</h3>
<div class="stats"><div class="stat"><small>Likes</small><strong>${ind(likes)}</strong></div><div class="stat"><small>Comments</small><strong>${ind(comments)}</strong></div><div class="stat"><small>Shares</small><strong>${ind(shares)}</strong></div></div>
<div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap"><a href="${esc(s.url)}" target="_blank" rel="noopener" class="btn secondary" style="text-decoration:none">View original clip ↗</a><button class="btn secondary" onclick="renderApp('submissions')">← Back</button></div>
</div>`;
}
function renderBusiness(app,tab){
if(tab==="create"){
if(!wizardStep||wizardStep<1)wizardStep=1;
app.innerHTML=renderWizardStep();
return}
const mine=createdCampaigns.filter(x=>x.email===user.email);
const myIds=mine.map(c=>c.id);
const mySubs=submissions.filter(s=>myIds.includes(s.campaignId));
const pending=mySubs.filter(s=>s.status==="Under Review");
const approvedSubs=mySubs.filter(s=>s.status==="Approved");
const totalSpend=approvedSubs.reduce((a,x)=>a+x.earnings,0);
const verifiedViews=approvedSubs.reduce((a,x)=>a+x.views,0);
const avgCpm=verifiedViews>0?(totalSpend/(verifiedViews/1000)).toFixed(1):"0.0";
if(tab==="analytics"){
const byCampaign=mine.map(c=>{
const subs=submissions.filter(s=>s.campaignId===c.id);
const approved=subs.filter(s=>s.status==="Approved");
const spend=approved.reduce((a,x)=>a+x.earnings,0);
const views=approved.reduce((a,x)=>a+x.views,0);
return {c,subs:subs.length,spend,views};
}).sort((a,b)=>b.spend-a.spend);
const topClipperMap={};
approvedSubs.forEach(s=>{topClipperMap[s.userName||s.userEmail]=(topClipperMap[s.userName||s.userEmail]||0)+s.earnings});
const topClipper=Object.entries(topClipperMap).sort((a,b)=>b[1]-a[1])[0];
const highest=Math.max(1,...byCampaign.map(x=>x.views));
app.innerHTML=`${appHeader("Analytics","Performance across every campaign you've launched.",notifBell())}${businessNav('analytics')}
<div class="stats"><div class="stat"><small>Total spend</small><strong>₹${ind(totalSpend)}</strong></div><div class="stat"><small>Verified views</small><strong>${ind(verifiedViews)}</strong></div><div class="stat"><small>Avg CPM</small><strong>₹${avgCpm}</strong></div><div class="stat"><small>Top clipper</small><strong style="font-size:15px">${topClipper?esc(topClipper[0]):"—"}</strong></div></div>
${byCampaign.length?`<h3 class="section-sub">Verified views by campaign</h3><div style="display:flex;align-items:flex-end;gap:10px;height:110px;margin:16px 0">${byCampaign.map(x=>`<div style="flex:1;text-align:center"><div style="background:linear-gradient(180deg,var(--lime),var(--purple));border-radius:4px 4px 0 0;height:${Math.max(6,Math.round((x.views/highest)*90))}px"></div><small style="color:#777;font-size:10px">${esc(x.c.title.slice(0,10))}</small></div>`).join("")}</div>
<table class="table"><tr><th>Campaign</th><th>Clips</th><th>Verified views</th><th>Spend</th></tr>${byCampaign.map(x=>`<tr><td>${esc(x.c.title)}</td><td>${x.subs}</td><td>${ind(x.views)}</td><td>₹${ind(x.spend)}</td></tr>`).join("")}</table>`:`<div class="empty">No campaign performance yet — launch a campaign to see analytics here.</div>`}`;
return}
app.innerHTML=`${appHeader(`Hey, ${esc(user.name)} 👋`,"Launch campaigns and track your clipping network.",notifBell())}${businessNav('dashboard')}<div class="stats"><div class="stat"><small>Active campaigns</small><strong>${mine.length}</strong></div><div class="stat"><small>Total spend</small><strong>₹${ind(totalSpend)}</strong></div><div class="stat"><small>Verified views</small><strong>${ind(verifiedViews)}</strong></div><div class="stat"><small>Clips received</small><strong>${mySubs.length}</strong></div><div class="stat"><small>Pending review</small><strong>${pending.length}</strong></div><div class="stat"><small>Avg CPM</small><strong>₹${avgCpm}</strong></div></div><div class="grid">${mine.length?mine.map(c=>businessCampaignCard(c)).join(""):`<div class="card"><span class="tag">GROW</span><h3>Launch your first campaign</h3><p>Set a budget, rate and brief. Let Indian clippers discover and distribute your content.</p><button class="btn primary" style="margin-top:18px" onclick="startWizard()">Launch campaign →</button></div>`}</div>`;
}
function businessCampaignCard(c){
const subs=submissions.filter(s=>s.campaignId===c.id);
const approvedSubs=subs.filter(s=>s.status==="Approved");
const pendingSubs=subs.filter(s=>s.status==="Under Review");
const spent=approvedSubs.reduce((a,x)=>a+x.earnings,0);
const label=campaignStatusLabel(c);
return `<div class="card">${c.banner?`<div class="campaign-banner" style="height:90px;background-image:url(${c.banner})"></div>`:""}<span class="tag">${label} · ${esc(c.niche)}</span><h3>${esc(c.title)}</h3><p>${esc(c.description)}</p><div class="stats"><div class="stat"><small>Clips submitted</small><strong>${subs.length}</strong></div><div class="stat"><small>Pending review</small><strong>${pendingSubs.length}</strong></div><div class="stat"><small>Rate</small><strong>₹${c.rate}</strong></div></div>${budgetBar(spent,c.budget)}<button class="btn primary" style="margin-top:14px" onclick="manageCampaign(${c.id})">Manage campaign →</button></div>`;
}
// Campaign lifecycle: a business can pause an active campaign (stops new submissions, resumable)
// or end it permanently (also stops new submissions, but signals it's done rather than paused).
function setCampaignState(id,status){
const c=createdCampaigns.find(x=>x.id===id);
if(!c||c.email!==user.email)return;
c.status=status;
localStorage.setItem("clipind_created",JSON.stringify(createdCampaigns));
toast(status==="Live"?"Campaign resumed.":status==="Paused"?"Campaign paused.":"Campaign ended.");
manageCampaign(id);
}
// Which submission (if any) currently has its reject/needs-changes reason picker open.
let reasonPickerFor=null;
function openReasonPicker(subId,status){reasonPickerFor={subId,status};const s=submissions.find(x=>x.id===subId);manageCampaign(s.campaignId)}
function cancelReasonPicker(campaignId){reasonPickerFor=null;manageCampaign(campaignId)}
function confirmReasonPicker(campaignId){
const reason=document.getElementById("reasonSelect").value;
const {subId,status}=reasonPickerFor;
reasonPickerFor=null;
setSubmissionStatus(subId,status,reason);
}
function manageCampaign(id){
const c=createdCampaigns.find(x=>x.id===id);
if(!c){toast("Campaign not found.");return}
if(c.email!==user.email){toast("You can only manage your own campaigns.");return}
const app=document.getElementById("app");
const subs=submissions.filter(s=>s.campaignId===id);
const approvedSubs=subs.filter(s=>s.status==="Approved");
const spent=approvedSubs.reduce((a,x)=>a+x.earnings,0);
const label=campaignStatusLabel(c);
const lifecycleControls=c.status==="Paused"?`<button class="btn primary" style="padding:9px 15px" onclick="setCampaignState(${c.id},'Live')">▶ Resume campaign</button> <button class="btn secondary" style="padding:9px 15px" onclick="setCampaignState(${c.id},'Ended')">⏹ End campaign</button>`:c.status==="Ended"?`<span style="color:#777;font-size:13px">This campaign has ended.</span>`:`<button class="btn secondary" style="padding:9px 15px" onclick="setCampaignState(${c.id},'Paused')">⏸ Pause campaign</button> <button class="btn secondary" style="padding:9px 15px" onclick="setCampaignState(${c.id},'Ended')">⏹ End campaign</button>`;
const reasons=["Wrong format","Did not follow brief","Unapproved content","Low quality","Misleading caption","Duplicate","Spam","Other"];
app.innerHTML=`${appHeader(c.title,`Manage submissions · ${c.niche}`,notifBell())}${businessNav('')}<div class="card" style="margin-bottom:22px"><div class="stats"><div class="stat"><small>Status</small><strong>${label}</strong></div><div class="stat"><small>Total submissions</small><strong>${subs.length}</strong></div><div class="stat"><small>Approved spend</small><strong>₹${ind(spent)}</strong></div></div>${budgetBar(spent,c.budget)}<div style="margin-top:16px">${lifecycleControls}</div></div>${subs.length?`<table class="table"><tr><th>Clipper</th><th>Clip</th><th>Views</th><th>Earnings</th><th>Status</th><th></th></tr>${subs.map(s=>{
let action;
if(reasonPickerFor&&reasonPickerFor.subId===s.id){
action=`<select id="reasonSelect" class="reason-select">${reasons.map(r=>`<option>${r}</option>`).join("")}</select> <button class="btn primary" style="padding:6px 10px" onclick="confirmReasonPicker(${c.id})">✓</button> <button class="btn secondary" style="padding:6px 10px" onclick="cancelReasonPicker(${c.id})">✕</button>`;
}else if(s.status==="Under Review"){
action=`<button class="btn primary" style="padding:8px 12px" onclick="setSubmissionStatus(${s.id},'Approved')">Approve</button> <button class="btn secondary" style="padding:8px 12px" onclick="openReasonPicker(${s.id},'Needs Changes')">Needs Changes</button> <button class="btn secondary" style="padding:8px 12px" onclick="openReasonPicker(${s.id},'Rejected')">Reject</button>`;
}else{
action=s.reason?`<span style="color:#777;font-size:11px">${esc(s.reason)}</span>`:"—";
}
return `<tr><td>${esc(s.userName||s.userEmail)}</td><td><a href="${esc(s.url)}" target="_blank" rel="noopener" style="color:var(--lime)">View clip ↗</a> <a href="#" style="color:#555;font-size:10px" onclick="event.preventDefault();openReportModal('Clip',${s.id},'${esc(s.title)} by ${esc(s.userName||s.userEmail)}')">🚩</a></td><td>${ind(s.views)}</td><td>₹${ind(s.earnings)}</td><td><span class="pill ${statusClass(s.status)}">${s.status}</span></td><td>${action}</td></tr>`;
}).join("")}</table>`:`<div class="empty">No clips submitted to this campaign yet.</div>`}<div style="margin-top:22px"><button class="btn secondary" onclick="renderApp('business')">← Back to dashboard</button></div>`;
}
function setSubmissionStatus(subId,status,reason){
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
}
/* ===== CAMPAIGN CREATION WIZARD (Basics → Brief → Assets → Rate&Budget → Dates → Review&Publish) ===== */
let wizardStep=1;
let wizardData={};
const WIZARD_STEPS=["Basics","Brief","Assets","Rate & Budget","Dates","Review & Publish"];
const WIZARD_NICHES=["Podcasts","Technology","Business","Gaming","Fitness","Finance","Entertainment","Education","Lifestyle","Travel","Food","Comedy","Sports","Music","Other"];
function startWizard(){wizardStep=1;wizardData={platforms:["Instagram Reels","YouTube Shorts"]};renderApp("create")}
function wizardBack(){if(wizardStep>1)wizardStep--;renderApp("create")}
function toggleWizardNiche(){document.getElementById("wNicheCustomWrap").classList.toggle("hidden",document.getElementById("wNiche").value!=="Other")}
function handleWizardBanner(e){
const file=e.target.files[0];
if(!file)return;
if(file.size>2000000){toast("Please choose an image under 2MB.");return}
const reader=new FileReader();
reader.onload=function(ev){
wizardData.banner=ev.target.result;
const preview=document.getElementById("wBannerPreview");
if(preview){preview.style.backgroundImage=`url(${wizardData.banner})`;preview.style.backgroundSize="cover";preview.style.backgroundPosition="center";preview.textContent="";}
};
reader.readAsDataURL(file);
}
function handleWizardLogo(e){
const file=e.target.files[0];
if(!file)return;
if(file.size>2000000){toast("Please choose an image under 2MB.");return}
const reader=new FileReader();
reader.onload=function(ev){
wizardData.logo=ev.target.result;
const preview=document.getElementById("wLogoPreview");
if(preview){preview.style.backgroundImage=`url(${wizardData.logo})`;preview.style.backgroundSize="cover";preview.style.backgroundPosition="center";preview.textContent="";}
};
reader.readAsDataURL(file);
}
function wizardNext(){
if(wizardStep===1){
const title=document.getElementById("wTitle").value.trim();
const business=document.getElementById("wBusiness").value.trim();
let niche=document.getElementById("wNiche").value;
if(niche==="Other"){const custom=document.getElementById("wNicheCustom").value.trim();if(!custom){toast("Type your custom niche, or pick one from the list.");return}niche=custom}
if(!title||!business){toast("Add a campaign name and business name.");return}
const platforms=[];
if(document.getElementById("wPlatIG").checked)platforms.push("Instagram Reels");
if(document.getElementById("wPlatYT").checked)platforms.push("YouTube Shorts");
Object.assign(wizardData,{title,business,niche,platforms});
}else if(wizardStep===2){
const description=document.getElementById("wDesc").value.trim();
if(!description){toast("Add a short overview of what you want clippers to make.");return}
wizardData.description=description;
wizardData.brief={do:document.getElementById("wDo").value.trim(),dont:document.getElementById("wDont").value.trim(),hook:document.getElementById("wHook").value.trim(),caption:document.getElementById("wCaption").value.trim(),cta:document.getElementById("wCTA").value.trim(),hashtags:document.getElementById("wHashtags").value.trim(),length:document.getElementById("wLength").value,platforms:wizardData.platforms};
}else if(wizardStep===3){
wizardData.referenceLinks=document.getElementById("wRefLinks").value.split("n").map(s=>s.trim()).filter(Boolean);
wizardData.audioNotes=document.getElementById("wAudioNotes").value.trim();
}else if(wizardStep===4){
const rate=Number(document.getElementById("wRate").value),budget=Number(document.getElementById("wBudget").value);
if(!rate||!budget){toast("Set a valid rate and budget.");return}
Object.assign(wizardData,{rate,budget});
}else if(wizardStep===5){
wizardData.endDate=document.getElementById("wEndDate").value||null;
}
wizardStep++;
renderApp("create");
}
function publishWizard(){
const c={id:Date.now(),title:wizardData.title,business:wizardData.business,niche:wizardData.niche,rate:wizardData.rate,budget:wizardData.budget,views:"0",status:"Live",description:wizardData.description,email:user.email,banner:wizardData.banner||null,endDate:wizardData.endDate||null,brief:wizardData.brief||{},assets:{logo:wizardData.logo||null,referenceLinks:wizardData.referenceLinks||[],audioNotes:wizardData.audioNotes||""}};
createdCampaigns.push(c);
localStorage.setItem("clipind_created",JSON.stringify(createdCampaigns));
toast("Campaign published!");
wizardStep=1;wizardData={};
renderApp("business");
}
function wizardProgress(){
return `<div style="display:flex;gap:6px;margin-bottom:10px">${WIZARD_STEPS.map((_,i)=>`<div style="flex:1;height:4px;border-radius:4px;background:${i+1<=wizardStep?"var(--lime)":"#222"}"></div>`).join("")}</div><small style="color:#777">Step ${wizardStep} of ${WIZARD_STEPS.length} · ${WIZARD_STEPS[wizardStep-1]}</small>`;
}
function renderWizardStep(){
const d=wizardData;
let body="";
if(wizardStep===1){
body=`<div class="field"><label>Campaign name</label><input id="wTitle" value="${esc(d.title||"")}" placeholder="e.g. My Podcast India Campaign"></div>
<div class="field"><label>Business / creator name</label><input id="wBusiness" value="${esc(d.business||user.name)}"></div>
<div class="field"><label>Niche</label><select id="wNiche" onchange="toggleWizardNiche()">${WIZARD_NICHES.map(n=>`<option ${d.niche===n?"selected":""}>${n}</option>`).join("")}</select></div>
<div class="field ${d.niche&&!WIZARD_NICHES.includes(d.niche)?"":"hidden"}" id="wNicheCustomWrap"><label>Custom niche</label><input id="wNicheCustom" value="${d.niche&&!WIZARD_NICHES.includes(d.niche)?esc(d.niche):""}" placeholder="Type your own niche"></div>
<div class="field"><label>Platforms</label><div style="display:flex;gap:16px;color:#ddd;font-size:14px"><label style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="wPlatIG" ${(d.platforms||[]).includes("Instagram Reels")?"checked":""} style="width:auto"> Instagram Reels</label><label style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="wPlatYT" ${(d.platforms||[]).includes("YouTube Shorts")?"checked":""} style="width:auto"> YouTube Shorts</label></div></div>`;
}else if(wizardStep===2){
const b=d.brief||{};
body=`<div class="field"><label>What you want (overview)</label><textarea id="wDesc" placeholder="Tell clippers what content to use, what style you want, and where they should post.">${esc(d.description||"")}</textarea></div>
<div class="field"><label>Do</label><input id="wDo" value="${esc(b.do||"")}" placeholder="e.g. Use vertical 9:16, add captions"></div>
<div class="field"><label>Don't</label><input id="wDont" value="${esc(b.dont||"")}" placeholder="e.g. No unrelated music, no clickbait titles"></div>
<div class="field"><label>Hook style</label><input id="wHook" value="${esc(b.hook||"")}" placeholder="e.g. Start with the punchline in the first 2 seconds"></div>
<div class="field"><label>Caption style</label><input id="wCaption" value="${esc(b.caption||"")}" placeholder="e.g. Short, casual, one emoji max"></div>
<div class="field"><label>Required CTA</label><input id="wCTA" value="${esc(b.cta||"")}" placeholder="e.g. Follow for more clips like this"></div>
<div class="field"><label>Required hashtags</label><input id="wHashtags" value="${esc(b.hashtags||"")}" placeholder="e.g. #ClipInd #Podcast"></div>
<div class="field"><label>Video length</label><select id="wLength"><option ${b.length==="Under 15s"?"selected":""}>Under 15s</option><option ${!b.length||b.length==="15–30s"?"selected":""}>15–30s</option><option ${b.length==="30–60s"?"selected":""}>30–60s</option><option ${b.length==="60s+"?"selected":""}>60s+</option></select></div>`;
}else if(wizardStep===3){
body=`<div class="field"><label>Campaign banner (optional)</label><div class="avatar-edit" style="margin-bottom:0"><div class="campaign-banner" id="wBannerPreview" style="width:180px;height:100px;border-radius:12px;background:${d.banner?`url(${d.banner}) center/cover`:"#111"};display:flex;align-items:center;justify-content:center;color:#666;font-size:12px">${d.banner?"":"No banner"}</div><div><input type="file" id="wBannerInput" accept="image/*" style="display:none" onchange="handleWizardBanner(event)"><button type="button" class="btn secondary" style="padding:9px 15px" onclick="document.getElementById('wBannerInput').click()">Upload banner</button></div></div></div>
<div class="field"><label>Logo (optional)</label><div class="avatar-edit" style="margin-bottom:0"><div class="campaign-banner" id="wLogoPreview" style="width:100px;height:100px;border-radius:12px;background:${d.logo?`url(${d.logo}) center/cover`:"#111"};display:flex;align-items:center;justify-content:center;color:#666;font-size:11px">${d.logo?"":"No logo"}</div><div><input type="file" id="wLogoInput" accept="image/*" style="display:none" onchange="handleWizardLogo(event)"><button type="button" class="btn secondary" style="padding:9px 15px" onclick="document.getElementById('wLogoInput').click()">Upload logo</button></div></div></div>
<div class="field"><label>Reference links (source videos, example clips — one per line)</label><textarea id="wRefLinks" placeholder="https://youtube.com/watch?v=...">${esc((d.referenceLinks||[]).join("n"))}</textarea></div>
<div class="field"><label>Music / audio notes (optional)</label><input id="wAudioNotes" value="${esc(d.audioNotes||"")}" placeholder="e.g. Use upbeat trending audio, avoid copyrighted music"></div>
<div class="notice">Uploaded files are stored in your browser for this demo — a real system would host these on proper file storage.</div>`;
}else if(wizardStep===4){
body=`<div class="field"><label>Pay rate (₹ per 1,000 verified views)</label><input id="wRate" type="number" value="${d.rate||50}" min="1"></div>
<div class="field"><label>Total campaign budget (₹)</label><input id="wBudget" type="number" value="${d.budget||50000}" min="1"></div>`;
}else if(wizardStep===5){
body=`<div class="field"><label>Campaign end date (optional)</label><input id="wEndDate" type="date" value="${d.endDate||""}"></div>
<div class="notice">Leave this blank for an open-ended campaign. Setting a date makes it eligible to appear in clippers' "Ending Soon" section.</div>`;
}else{
const b=d.brief||{};
body=`<div class="notice">Review everything below, then publish. Clippers will be able to discover this campaign immediately.</div>
${d.banner?`<div class="campaign-banner" style="height:140px;background-image:url(${d.banner})"></div>`:""}
<div class="brief-grid">
<div class="brief-block"><small>Campaign</small>${esc(d.title)}</div>
<div class="brief-block"><small>Business</small>${esc(d.business)}</div>
<div class="brief-block"><small>Niche</small>${esc(d.niche)}</div>
<div class="brief-block"><small>Rate</small>₹${d.rate} / 1K views</div>
<div class="brief-block"><small>Budget</small>₹${ind(d.budget)}</div>
<div class="brief-block"><small>Ends</small>${d.endDate?new Date(d.endDate).toLocaleDateString("en-IN"):"Open-ended"}</div>
<div class="brief-block"><small>Platforms</small>${(b.platforms||[]).join(", ")||"—"}</div>
<div class="brief-block"><small>Video length</small>${b.length||"—"}</div>
<div class="brief-block"><small>Logo</small>${d.logo?"Uploaded ✓":"None"}</div>
<div class="brief-block"><small>Reference links</small>${(d.referenceLinks||[]).length||"None"}</div>
</div>
<div class="brief-block" style="margin-top:4px"><small>Overview</small>${esc(d.description)}</div>
<button class="btn primary" style="width:100%;justify-content:center;margin-top:20px" onclick="publishWizard()">Publish campaign →</button>`;
}
const nav=wizardStep<6?`<button class="btn primary" onclick="wizardNext()">Next →</button>`:"";
const back=wizardStep>1?`<button class="btn secondary" style="margin-left:8px" onclick="wizardBack()">← Back</button>`:`<button class="btn secondary" style="margin-left:8px" onclick="renderApp('business')">Cancel</button>`;
return `${appHeader("Launch a Campaign","Put your content in front of India's short-form audience.",notifBell())}${businessNav('create')}<div class="card form">${wizardProgress()}<div style="margin-top:20px">${body}</div><div style="margin-top:22px">${nav}${back}</div></div>`;
}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function ind(n){return Number(n||0).toLocaleString("en-IN")}

function renderAppOnLoad(){
if(location.hash==="#creator"&&user?.role==="creator")renderApp("campaigns");
if(location.hash==="#business"&&user?.role==="business")renderApp("business");
}
// Homepage earnings calculator
function updateCalc(){
const views=Number(document.getElementById("calcViews").value);
const earn=Math.round(views/1000*50);
document.getElementById("calcViewsOut").textContent=views.toLocaleString("en-IN");
document.getElementById("calcEarnOut").textContent="₹"+earn.toLocaleString("en-IN");
}
// Makes the hero phone's view count climb continuously, like a reel actually gaining views.
function animatePhoneReel(){
const el=document.getElementById("phoneViewCount");
if(!el)return;
let views=1284392;
setInterval(()=>{
views+=Math.floor(150+Math.random()*700);
el.textContent=views.toLocaleString("en-IN");
},1400);
}
updateNavAuthButton();
updateCalc();
animatePhoneReel();

// Fetch user session from backend on load
fetch('/api/auth/me').then(r => r.json()).then(data => {
  if (data.user) {
    user = data.user;
    user.role = user.role === 'CLIPPER' ? 'creator' : user.role.toLowerCase();
    localStorage.setItem("clipind_user", JSON.stringify(user));
  } else {
    user = null;
    localStorage.removeItem("clipind_user");
  }
  updateNavAuthButton();
  renderAppOnLoad();
}).catch(e => {
  console.error(e);
  renderAppOnLoad();
});

