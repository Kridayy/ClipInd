import re

with open('public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace avatar upload
old_avatar = """async function handleAvatarChange(e){
const file=e.target.files[0];
if(!file)return;
if(file.size>1500000){toast("Please choose an image under 1.5MB.");return}
const reader=new FileReader();
reader.onload=function(ev){
user.avatar=ev.target.result;
renderApp(tab);
toast("Avatar updated (preview only for now).");
};
reader.readAsDataURL(file);
}"""

new_avatar = """async function handleAvatarChange(e){
const file=e.target.files[0];
if(!file)return;
if(file.size>5000000){toast("Please choose an image under 5MB.");return}
const fd = new FormData();
fd.append('file', file);
try {
  toast("Uploading avatar...");
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  if (res.ok) {
    const data = await res.json();
    user.avatar = data.url;
    renderApp(tab);
    toast("Avatar updated successfully.");
  } else {
    toast("Upload failed.");
  }
} catch(err) {
  toast("Upload error.");
}
}"""

content = content.replace(old_avatar, new_avatar)

# Replace campaign banner upload
old_banner = """function handleBannerUpload(e){
const file=e.target.files[0];
if(!file)return;
if(file.size>2000000){toast("Please choose an image under 2MB.");return}
const reader=new FileReader();
reader.onload=function(ev){
wizardData.banner=ev.target.result;
renderCampaignWizard(currentWizardStep);
};
reader.readAsDataURL(file);
}"""

new_banner = """async function handleBannerUpload(e){
const file=e.target.files[0];
if(!file)return;
if(file.size>5000000){toast("Please choose an image under 5MB.");return}
const fd = new FormData();
fd.append('file', file);
try {
  toast("Uploading banner...");
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  if (res.ok) {
    const data = await res.json();
    wizardData.banner = data.url;
    renderCampaignWizard(currentWizardStep);
    toast("Banner uploaded.");
  } else {
    toast("Upload failed.");
  }
} catch(err) {
  toast("Upload error.");
}
}"""

content = content.replace(old_banner, new_banner)

# Replace campaign logo upload
old_logo = """function handleLogoUpload(e){
const file=e.target.files[0];
if(!file)return;
if(file.size>2000000){toast("Please choose an image under 2MB.");return}
const reader=new FileReader();
reader.onload=function(ev){
wizardData.logo=ev.target.result;
renderCampaignWizard(currentWizardStep);
};
reader.readAsDataURL(file);
}"""

new_logo = """async function handleLogoUpload(e){
const file=e.target.files[0];
if(!file)return;
if(file.size>5000000){toast("Please choose an image under 5MB.");return}
const fd = new FormData();
fd.append('file', file);
try {
  toast("Uploading logo...");
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  if (res.ok) {
    const data = await res.json();
    wizardData.logo = data.url;
    renderCampaignWizard(currentWizardStep);
    toast("Logo uploaded.");
  } else {
    toast("Upload failed.");
  }
} catch(err) {
  toast("Upload error.");
}
}"""

content = content.replace(old_logo, new_logo)

with open('public/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated index.html uploads successfully.")
