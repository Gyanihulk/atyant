// Employee and email OTP authentication are verified by the server.
const accessTabs=[...document.querySelectorAll('[role="tab"]')];
function selectAccessTab(selected){
  for(const tab of accessTabs){
    const active=tab===selected;
    tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden=!active;
  }
  document.querySelector('#accessTitle').textContent=({loginTab:'Employee sign in',registerTab:'Employee registration',otpTab:'Email OTP sign in'})[selected.id];
}
for(const tab of accessTabs){
  tab.addEventListener('click',()=>selectAccessTab(tab));
  tab.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();const index=accessTabs.indexOf(tab), step=event.key==='ArrowLeft'?-1:1;
    const next=event.key==='Home'?accessTabs[0]:event.key==='End'?accessTabs.at(-1):accessTabs[(index+step+accessTabs.length)%accessTabs.length];
    selectAccessTab(next);next.focus();
  });
}
selectAccessTab(accessTabs[0]);
document.querySelectorAll('form').forEach(form=>form.addEventListener('submit',event=>event.preventDefault()));
let accessCsrf='';
const accessMessage=document.querySelector('.setup-note');
accessMessage.setAttribute('role','status');
async function accountRequest(action,data){
  const response=await fetch(`auth.php?action=${action}`,data?{method:'POST',credentials:'same-origin',body:new URLSearchParams({...data,csrf:accessCsrf})}:{credentials:'same-origin'});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||'Account service is unavailable. Please try again later.');
  return result;
}
if(location.protocol==='file:')accessMessage.textContent='Offline preview. Employee login and registration work on the configured Hostinger website.';
else accountRequest('session').then(result=>{
  accessCsrf=result.csrf;
  if(result.user){location.replace('index.php');return;}
  document.querySelectorAll('#loginForm button[type="submit"],#registerForm button[type="submit"],#sendEmailOtp').forEach(button=>button.disabled=false);
}).catch(()=>{accessMessage.textContent='Account service is unavailable. Contact the site administrator.';});
for(const form of document.querySelectorAll('#loginForm,#registerForm'))form.addEventListener('submit',async event=>{
  event.preventDefault();if(!accessCsrf)return;
  const button=form.querySelector('[type="submit"]');button.disabled=true;
  try{
    const result=await accountRequest(form.id==='loginForm'?'login':'register',Object.fromEntries(new FormData(form)));
    if(result.ok){location.assign('index.php');return;}
    accessMessage.textContent=result.message;form.reset();
  }catch(error){accessMessage.textContent=error.message;}
  finally{button.disabled=false;}
});
const otpForm=document.querySelector('#otpForm'),otpNotice=document.querySelector('#otpSetupNote');
let otpCooldown=0;
otpForm.addEventListener('submit',async event=>{
  event.preventDefault();if(!accessCsrf || Date.now()<otpCooldown)return;
  const button=document.querySelector('#sendEmailOtp');button.disabled=true;
  try{
    const result=await accountRequest('otp-send',{email:document.querySelector('#otpEmail').value.trim()});
    otpNotice.textContent=result.message;document.querySelector('#otpVerifyFields').hidden=false;
    document.querySelector('#emailOtpCode').value='';document.querySelector('#emailOtpCode').focus();
    otpCooldown=Date.now()+60000;button.textContent='Resend OTP in 60 seconds';
    const timer=setInterval(()=>{const remaining=Math.max(0,Math.ceil((otpCooldown-Date.now())/1000));button.textContent=remaining?`Resend OTP in ${remaining} seconds`:'Resend OTP';if(!remaining){clearInterval(timer);button.disabled=false;}},1000);
  }catch(error){otpNotice.textContent=error.message;button.disabled=false;}
});
document.querySelector('#verifyEmailOtp').addEventListener('click',async()=>{
  const button=document.querySelector('#verifyEmailOtp'),code=document.querySelector('#emailOtpCode').value.trim();
  if(!/^[0-9]{4}$/.test(code)){otpNotice.textContent='Enter the four-digit OTP.';return;}
  button.disabled=true;
  try{const result=await accountRequest('otp-verify',{code});if(result.ok)location.assign('index.php');}
  catch(error){otpNotice.textContent=error.message;}
  finally{button.disabled=false;}
});
document.querySelector('#otpEmail').addEventListener('input',()=>{document.querySelector('#otpVerifyFields').hidden=true;document.querySelector('#emailOtpCode').value='';});
