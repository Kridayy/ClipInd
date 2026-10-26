import re

with open('public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update report reason list and submit function
report_modal_html = """<div class="field"><label>Reason</label><select id="reportReason"><option>Fraud</option><option>Copyright</option><option>Spam</option><option>Misleading brief</option><option>Payment issue</option><option>Abuse</option><option>Other</option></select></div>"""
content = content.replace(report_modal_html, """<div class="field"><label>Reason</label><select id="reportReason"><option value="Fraud">Fraud</option><option value="Copyright">Copyright</option><option value="Spam">Spam</option><option value="Misleading brief">Misleading brief</option><option value="Payment issue">Payment issue</option><option value="Abuse">Abuse</option><option value="Other">Other</option></select></div>""")

# Inject a report globals logic 
script_globals = """let currentReportTarget = null;
let currentReportType = 'OTHER';

function openReportModal(type, id, label) {
  currentReportType = type;
  currentReportTarget = id;
  document.getElementById('reportTypeLabel').textContent = type;
  document.getElementById('reportTargetLabel').textContent = label || '';
  document.getElementById('reportModal').classList.add('open');
}

function closeReportModal() {
  document.getElementById('reportModal').classList.remove('open');
}

async function submitReport() {
  const reason = document.getElementById('reportReason').value;
  const details = document.getElementById('reportDetails').value;
  try {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetId: currentReportTarget,
        targetType: currentReportType,
        reason: reason + (details ? ' - ' + details : '')
      })
    });
    if (res.ok) {
      toast("Report submitted successfully.");
      closeReportModal();
    } else {
      toast("Failed to submit report.");
    }
  } catch (e) {
    toast("Error submitting report.");
  }
}
"""

content = content.replace("function closeReportModal(){document.getElementById(\"reportModal\").classList.remove(\"open\")}", script_globals)
content = content.replace("function submitReport(){\ncloseReportModal();\ntoast(\"Report submitted.\");\n}", "")

# Inject Analytics Fetching
creator_analytics = """let analytics = { totalVerifiedViews: 0, totalEarnings: 0, clipsSubmitted: 0, approvalRate: 0, averageViews: 0 };
async function loadAnalytics() {
  if (!user) return;
  try {
    const url = user.role === 'creator' ? '/api/analytics/clipper' : '/api/analytics/business';
    const res = await fetch(url);
    if (res.ok) {
      analytics = await res.json();
    }
  } catch (e) {}
}"""
content = content.replace("async function loadWalletData() {", creator_analytics + "\nasync function loadWalletData() {")
content = content.replace("await loadWalletData();", "await loadWalletData();\n    await loadAnalytics();")

# Now we need to update the Creator dashboard to use `analytics` instead of calculating it in JS
# Also update the Business dashboard
# I'll just write a JS replace for rendering

render_creator_old = """  app.innerHTML=\`
  <div class="app-head">
    <div class="app-title"><h1>Dashboard</h1><p>Welcome back, \${user.name.split(" ")[0]}</p></div>
    <div>
      <button class="btn secondary" style="padding:10px 15px;font-size:14px" onclick="renderMarket()">Browse Campaigns</button>
    </div>
  </div>
  <div class="appnav">
    <button class="tab \${tab==="dashboard"?"active":""}" onclick="renderApp('dashboard')">Overview</button>
    <button class="tab \${tab==="campaigns"?"active":""}" onclick="renderApp('campaigns')">Campaigns</button>
    <button class="tab \${tab==="submissions"?"active":""}" onclick="renderApp('submissions')">My Submissions</button>
    <button class="tab \${tab==="wallet"?"active":""}" onclick="renderApp('wallet')">Wallet & Earnings</button>
  </div>
  \`;"""

# I won't write full Python replacements for complex frontend since it might be error-prone for 500 lines of UI. Let me just inject the analytics object usage manually into `index.html`.

with open('public/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated index.html logic successfully.")
