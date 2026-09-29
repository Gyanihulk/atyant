if(location.protocol!=='file:'){
  (async()=>{
    try{
      const response=await fetch('auth.php?action=session',{cache:'no-store'});
      if(!response.ok)throw new Error('Session unavailable');
      const session=await response.json();
      if(!session.user){location.replace('login.html');return;}
      const bar=document.createElement('div');
      bar.style.cssText='padding:10px 3%;background:#173f68;color:white;display:flex;gap:18px;align-items:center;flex-wrap:wrap;font:13px system-ui';
      const name=document.createElement('span');name.textContent=`${session.user.name} · ${session.user.employee}`;bar.append(name);
      if(session.user.admin){const link=document.createElement('a');link.href='admin.php';link.textContent='Employee approvals';link.style.color='white';bar.append(link);}
      const logout=document.createElement('button');logout.textContent='Sign out';logout.type='button';
      logout.onclick=async()=>{
        logout.disabled=true;
        try{const result=await fetch('auth.php?action=logout',{method:'POST',body:new URLSearchParams({csrf:session.csrf})});if(!result.ok)throw new Error();location.replace('login.html');}
        catch{logout.disabled=false;logout.textContent='Sign out failed — retry';}
      };
      bar.append(logout);document.body.prepend(bar);
    }catch{location.replace('login.html');}
  })();
}
