import re

with open('public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace local variables with backend calls
wallet_old = """let walletClaimed=0,bonusEarned=0;
let walletMethods=JSON.parse(localStorage.getItem("clipind_walletMethods")||"[]"); // {id,type,identifier}
let payoutRequests=JSON.parse(localStorage.getItem("clipind_payoutRequests")||"[]"); // {id,amount,methodId,status,ts}

function availableBalance(){return (user?user.walletClaimed:walletClaimed)+(user?user.bonusEarned:bonusEarned)-payoutRequests.filter(r=>r.status!=="Failed"&&r.status!=="Cancelled").reduce((sum,r)=>sum+r.amount,0);}

function addWalletMethod(type,id){
if(!type||!id)return;
walletMethods.push({id:Date.now(),type,identifier:id});
localStorage.setItem("clipind_walletMethods",JSON.stringify(walletMethods));
renderApp("wallet");
}
function removeWalletMethod(id){
walletMethods=walletMethods.filter(m=>m.id!==id);
localStorage.setItem("clipind_walletMethods",JSON.stringify(walletMethods));
renderApp("wallet");
}
function requestPayout(amount,methodId){
if(amount>availableBalance()){toast("Insufficient balance.");return}
payoutRequests.push({id:Date.now(),amount,methodId,status:"Pending",ts:Date.now()});
localStorage.setItem("clipind_payoutRequests",JSON.stringify(payoutRequests));
toast("Payout requested!");
renderApp("wallet");
}"""

wallet_new = """let walletBalance = 0;
let totalEarned = 0;
let transactions = [];
let walletMethods = [];
let payoutRequests = [];

async function loadWalletData() {
  if (!user || user.role !== 'creator') return;
  try {
    const [wRes, tRes, mRes, pRes] = await Promise.all([
      fetch('/api/wallet'),
      fetch('/api/wallet/transactions'),
      fetch('/api/wallet/methods'),
      fetch('/api/wallet/payouts')
    ]);
    if (wRes.ok) {
      const data = await wRes.json();
      walletBalance = data.balance;
      totalEarned = data.totalEarned;
    }
    if (tRes.ok) transactions = await tRes.json();
    if (mRes.ok) walletMethods = await mRes.json();
    if (pRes.ok) payoutRequests = await pRes.json();
  } catch(e) { console.error(e); }
}

function availableBalance() { return walletBalance; }

async function addWalletMethod(type, identifier){
  if(!type||!identifier)return;
  try {
    const res = await fetch('/api/wallet/methods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, identifier })
    });
    if(res.ok) {
      await loadWalletData();
      renderApp("wallet");
    } else { toast("Failed to add method"); }
  } catch(e) { toast("Error adding method"); }
}

async function removeWalletMethod(id){
  try {
    const res = await fetch(`/api/wallet/methods/${id}`, { method: 'DELETE' });
    if(res.ok) {
      await loadWalletData();
      renderApp("wallet");
    } else {
      const err = await res.json();
      toast(err.error || "Cannot remove method");
    }
  } catch(e) { toast("Error removing method"); }
}

async function requestPayout(amount, methodId){
  if(amount > availableBalance()){toast("Insufficient balance.");return}
  try {
    const res = await fetch('/api/wallet/payout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(amount), methodId: Number(methodId) })
    });
    if (res.ok) {
      toast("Payout requested!");
      await loadWalletData();
      renderApp("wallet");
    } else {
      const err = await res.json();
      toast(err.error || "Failed to request payout");
    }
  } catch(e) { toast("Error requesting payout"); }
}"""

content = content.replace(wallet_old, wallet_new)

# Inject loadWalletData into app initialization / routing
load_campaigns_replacement = """    }
    await loadNotifications();
    await loadWalletData();
  } catch(e) { console.error(e); }
}"""

content = content.replace("""    }
    await loadNotifications();
  } catch(e) { console.error(e); }
}""", load_campaigns_replacement)

# Ensure UI renders correctly for totalEarned vs user.bonusEarned+user.walletClaimed
ui_total_earned = """<div class="stat-value">₹${ind((user?user.walletClaimed:walletClaimed)+(user?user.bonusEarned:bonusEarned))}</div>"""
ui_total_earned_new = """<div class="stat-value">₹${ind(totalEarned)}</div>"""
content = content.replace(ui_total_earned, ui_total_earned_new)

# And for lifetime earnings in stats box:
ui_stat_total = """<div class="stat-box">
<div class="stat-label">Total Earned</div>
<div class="stat-value">₹${ind((user?user.walletClaimed:walletClaimed)+(user?user.bonusEarned:bonusEarned))}</div>
</div>"""
ui_stat_total_new = """<div class="stat-box">
<div class="stat-label">Total Earned</div>
<div class="stat-value">₹${ind(totalEarned)}</div>
</div>"""
content = content.replace(ui_stat_total, ui_stat_total_new)

# Fix missing ts format for payout requests since backend gives createdAt
payout_table_row = """<tr><td>₹${ind(r.amount)}</td><td>${m?m.type:"Unknown"} (...${m?m.identifier.slice(-4):""})</td><td><span class="badge ${r.status==="Completed"?"live":r.status==="Pending"?"paused":"ended"}">${r.status}</span></td><td>${new Date(r.ts).toLocaleDateString()}</td></tr>"""
payout_table_row_new = """<tr><td>₹${ind(r.amount)}</td><td>${m?m.type:"Unknown"} (...${m?m.identifier.slice(-4):""})</td><td><span class="badge ${r.status==="COMPLETED"?"live":r.status==="PENDING"?"paused":"ended"}">${r.status}</span></td><td>${new Date(r.createdAt).toLocaleDateString()}</td></tr>"""
content = content.replace(payout_table_row, payout_table_row_new)


with open('public/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated index.html")
