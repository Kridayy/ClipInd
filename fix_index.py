import re

with open('public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the broken viewPublicProfile function which was mangled
broken_str = """<div class="avatar-edit"><div class="avatar-circle large" style="${user.avatar?`background-image:url(${user.avatar})`:""}"  if(tab==="dashboard"){
    app.innerHTML+=`
    <div class="grid" style="margin-bottom:25px">
      <div class="card"><small style="color:#aaa;display:block;margin-bottom:5px;font-size:12px;text-transform:uppercase;letter-spacing:0.05em">Total Verified Views</small><strong style="font-size:32px" class="lime">\${ind(analytics.totalVerifiedViews)}</strong></div>
      <div class="card"><small style="color:#aaa;display:block;margin-bottom:5px;font-size:12px;text-transform:uppercase;letter-spacing:0.05em">Total Spend</small><strong style="font-size:32px">₹\${ind(analytics.campaignSpend)}</strong></div>
      <div class="card"><small style="color:#aaa;display:block;margin-bottom:5px;font-size:12px;text-transform:uppercase;letter-spacing:0.05em">Avg. CPM</small><strong style="font-size:32px">₹\${analytics.averageCPM}</strong></div>
    </div>lvl.name}</div></div></div>"""

fixed_str = """<div class="avatar-edit"><div class="avatar-circle large" style="${user.avatar?`background-image:url(${user.avatar})`:""}">${user.avatar?"":initials(user.name)}</div><div><h3 style="margin:0">${esc(user.name)}</h3><div class="level-badge" style="margin-top:8px">🏅 ${lvl.name}</div></div></div>"""

content = content.replace(broken_str, fixed_str)

# Now manually apply the dashboard logic for business correctly
old_business_dash = """  if(tab==="dashboard"){
    const allApproved=submissions.filter(s=>s.status==="Approved");
    const bViews=allApproved.reduce((sum,s)=>sum+(s.verifiedViews||0),0);
    const bSpend=allApproved.reduce((sum,s)=>sum+(s.earnings||0),0);
    const bCPM=bViews>0?((bSpend/bViews)*1000).toFixed(2):"0.00";
    
    app.innerHTML+=`
    <div class="grid" style="margin-bottom:25px">
      <div class="card"><small style="color:#aaa;display:block;margin-bottom:5px;font-size:12px;text-transform:uppercase;letter-spacing:0.05em">Total Verified Views</small><strong style="font-size:32px" class="lime">${ind(bViews)}</strong></div>
      <div class="card"><small style="color:#aaa;display:block;margin-bottom:5px;font-size:12px;text-transform:uppercase;letter-spacing:0.05em">Total Spend</small><strong style="font-size:32px">₹${ind(bSpend)}</strong></div>
      <div class="card"><small style="color:#aaa;display:block;margin-bottom:5px;font-size:12px;text-transform:uppercase;letter-spacing:0.05em">Avg. CPM</small><strong style="font-size:32px">₹${bCPM}</strong></div>
    </div>"""

new_business_dash = """  if(tab==="dashboard"){
    app.innerHTML+=`
    <div class="grid" style="margin-bottom:25px">
      <div class="card"><small style="color:#aaa;display:block;margin-bottom:5px;font-size:12px;text-transform:uppercase;letter-spacing:0.05em">Total Verified Views</small><strong style="font-size:32px" class="lime">${ind(analytics.totalVerifiedViews)}</strong></div>
      <div class="card"><small style="color:#aaa;display:block;margin-bottom:5px;font-size:12px;text-transform:uppercase;letter-spacing:0.05em">Total Spend</small><strong style="font-size:32px">₹${ind(analytics.campaignSpend)}</strong></div>
      <div class="card"><small style="color:#aaa;display:block;margin-bottom:5px;font-size:12px;text-transform:uppercase;letter-spacing:0.05em">Avg. CPM</small><strong style="font-size:32px">₹${analytics.averageCPM}</strong></div>
    </div>"""

content = content.replace(old_business_dash, new_business_dash)

with open('public/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed index.html successfully.")
