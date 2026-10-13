/* A shared passphrase for personal play, not a security boundary. */
(() => {
  'use strict';
  const $=s=>document.querySelector(s),config=window.TRAVEL_PLAY_CONFIG||{},keys=['qunqing-atlas-v3','qunqing-play-rewards-v1','qunqing-postcard-quota-v1'];
  const SESSION='qunqing-member-session-v1',REVISION='qunqing-records-revision-v1',BACKUP='qunqing-records-backup-v1';
  const token=`${config.recordsRevision}:${config.passcodeHash}`;let member=false,wasReset=false;
  const read=(key)=>{try{return JSON.parse(localStorage.getItem(key))||{};}catch{return {};}};
  const lock=()=>document.body.classList.toggle('dialog-open',[...document.querySelectorAll('dialog')].some(d=>d.open));
  function reset(initial=false){
    if(!initial&&!member)return false;
    try{const snapshot={at:new Date().toISOString(),stores:{}};keys.forEach(key=>{const value=localStorage.getItem(key);if(value!==null)snapshot.stores[key]=value;});if(Object.keys(snapshot.stores).length)localStorage.setItem(BACKUP,JSON.stringify(snapshot));keys.forEach(key=>localStorage.removeItem(key));localStorage.setItem(REVISION,config.recordsRevision);wasReset=true;}catch{ /* Games remain usable if storage is unavailable. */ }
    if(!initial){dispatchEvent(new CustomEvent('qunqing:access-change',{detail:{type:'reset'}}));$('#records-reset-status').textContent='玩法记录已归零；如需恢复，可使用下面的恢复按钮。';render();}return true;
  }
  // The requested one-time reset runs before the album and game controllers read data.
  try{if(localStorage.getItem(REVISION)!==config.recordsRevision){reset(true);sessionStorage.removeItem(SESSION);}member=sessionStorage.getItem(SESSION)===token;}catch{}
  function saved(key){return member&&keys.includes(key)?read(key):{};}
  function write(key,value){if(!member||!keys.includes(key))return false;try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
  function render(){
    document.querySelectorAll('.auth-toggle').forEach(b=>{if(b.id==='reward-login')return;b.textContent=member?'已登录 · 我的记录':'游客 · 登录';});
    $('#login-title').textContent=member?'这份快乐，有自己的记录。':'知道口令，就一起玩。';$('#login-form').hidden=member;$('#member-records').hidden=!member;
    const album=read(keys[0]),rewards=read(keys[1]);$('#member-records-summary').textContent=`${rewards.tickets||0} 张幸运券 · ${Array.isArray(album.stamps)?album.stamps.length:0} 枚印章 · ${Array.isArray(rewards.history)?rewards.history.length:0} 条兑奖记录`;
    $('#member-restore').hidden=!member||!Object.keys(read(BACKUP).stores||{}).length;
  }
  function open(reason){$('#login-feedback').textContent='';$('#login-reason').textContent=member?'每一次小幸运，都在这里留下痕迹。':reason||'游客可以浏览相册、试玩游戏；登录后解锁奖券、盖章、收藏与兑奖记录。';render();if(!$('#login-dialog').open)$('#login-dialog').showModal();lock();}
  function requireMember(reason){if(member)return true;open(reason);return false;}
  $('#login-form').addEventListener('submit',async e=>{
    e.preventDefault();const submit=$('#login-submit');if(submit.disabled)return;submit.disabled=true;$('#login-feedback').textContent='正在核对口令…';
    try{
      if(!crypto.subtle)throw new Error('secure-context');
      const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode($('#login-passcode').value.trim())),hex=[...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('');
      if(hex!==config.passcodeHash){$('#login-feedback').textContent='口令还差一点点，再试一次。';return;}
      member=true;try{sessionStorage.setItem(SESSION,token);}catch{}$('#login-passcode').value='';$('#login-dialog').close();lock();dispatchEvent(new CustomEvent('qunqing:access-change',{detail:{type:'login'}}));render();
    }catch{$('#login-feedback').textContent='请从 HTTPS 网站或本地预览地址打开，再尝试登录。';}finally{submit.disabled=false;}
  });
  document.querySelectorAll('.auth-toggle').forEach(b=>b.addEventListener('click',()=>open()));
  $('#login-close').addEventListener('click',()=>$('#login-dialog').close());$('#login-dialog').addEventListener('close',()=>{$('#login-passcode').value='';lock();});
  $('#member-logout').addEventListener('click',()=>{member=false;try{sessionStorage.removeItem(SESSION);}catch{}dispatchEvent(new CustomEvent('qunqing:access-change',{detail:{type:'logout'}}));$('#login-feedback').textContent='已退出，回到游客浏览模式。';render();});
  $('#member-reset').addEventListener('click',()=>reset());
  $('#member-restore').addEventListener('click',()=>{if(!member)return;const backup=read(BACKUP);try{keys.forEach(key=>{if(typeof backup.stores?.[key]==='string')localStorage.setItem(key,backup.stores[key]);else localStorage.removeItem(key);});dispatchEvent(new CustomEvent('qunqing:access-change',{detail:{type:'restore'}}));$('#records-reset-status').textContent='已恢复上次重置前的玩法记录。';render();}catch{$('#records-reset-status').textContent='暂时无法恢复记录。';}});
  window.TravelAccess={isMember:()=>member,saved,write,open,requireMember,reset,wasReset:()=>wasReset};render();
})();
