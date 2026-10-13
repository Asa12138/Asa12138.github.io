/* Floating navigation and user-started background music, without autoplay. */
(() => {
  'use strict';
  const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  $('#float-darts').addEventListener('click',()=>{setTimeout(()=>$('#darts-start').click(),0);});
  const links=[...document.querySelectorAll('[data-float-section]')],sections=links.map(a=>document.getElementById(a.dataset.floatSection));let scheduled=false;
  function markSection(){scheduled=false;let active='';sections.forEach(s=>{const r=s.getBoundingClientRect();if(r.top<=innerHeight*.42&&r.bottom>innerHeight*.2)active=s.id;});links.forEach(a=>{if(a.dataset.floatSection===active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}
  addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(markSection);}},{passive:true});markSection();
  const audio=$('#bgm-audio'),panel=$('#bgm-panel'),STORE='qunqing-bgm-v1';let saved={};try{saved=JSON.parse(localStorage.getItem(STORE))||{};}catch{}
  const modes=['list','single','shuffle'],modeNames={list:'列表循环',single:'单曲循环',shuffle:'随机播放'},modeIcons={list:'↻',single:'↻₁',shuffle:'⤨'};
  let tracks=[],index=0,mode=modes.includes(saved.mode)?saved.mode:'list',playGeneration=0,loading=false,lastSave=0;
  const volume=Number.isFinite(saved.volume)?Math.max(0,Math.min(1,saved.volume)):.24;
  audio.volume=volume;audio.muted=!!saved.muted;$('#bgm-volume').value=Math.round(volume*100);
  const clock=n=>`${Math.floor((Number.isFinite(n)?n:0)/60)}:${String(Math.floor((Number.isFinite(n)?n:0)%60)).padStart(2,'0')}`;
  const duration=()=>Number.isFinite(audio.duration)?audio.duration:tracks[index]?.duration||0;
  function persist(){try{localStorage.setItem(STORE,JSON.stringify({track:tracks[index]?.id,volume:audio.volume,muted:audio.muted,mode,time:Number.isFinite(audio.currentTime)?audio.currentTime:0}));}catch{}}
  function progress(){const total=duration();$('#bgm-seek').max=Math.max(total,1);$('#bgm-seek').disabled=!audio.currentSrc||total<=0;$('#bgm-seek').value=audio.currentTime||0;$('#bgm-time').textContent=`${clock(audio.currentTime)} / ${clock(total)}`;}
  function render(){
    const playing=!audio.paused&&!audio.ended;
    $('#bgm-title').textContent=tracks[index]?.title||'旅途 BGM';$('#bgm-artist').textContent=tracks[index]?.artist||'四首歌，陪我们慢慢走。';
    $('#bgm-play').textContent=playing?'Ⅱ':'▶';$('#bgm-play').setAttribute('aria-label',playing?'暂停 BGM':'播放 BGM');$('#bgm-play').disabled=!tracks.length;$('#viewer-bgm').textContent=playing?'♫Ⅱ':'♫';$('#viewer-bgm').setAttribute('aria-label',playing?'暂停 BGM':'播放 BGM');$('#viewer-bgm').title=playing?'暂停背景音乐':'播放背景音乐';
    $('#bgm-toggle').classList.toggle('playing',playing);$('#bgm-mini-label').textContent=playing?tracks[index]?.title||'音乐在路上':'给旅途加点 BGM';
    $('#bgm-mode').textContent=modeIcons[mode];$('#bgm-mode').setAttribute('aria-label',`播放模式：${modeNames[mode]}`);$('#bgm-mode').title=modeNames[mode];
    $('#bgm-volume-value').textContent=audio.muted?'静音':`${Math.round(audio.volume*100)}%`;$('#bgm-mute').textContent=audio.muted?'♩':'♪';$('#bgm-mute').setAttribute('aria-pressed',String(audio.muted));$('#bgm-mute').setAttribute('aria-label',audio.muted?'取消 BGM 静音':'静音 BGM');
    document.querySelectorAll('[data-bgm-track]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.bgmTrack)===index)));progress();
    if('mediaSession' in navigator){try{navigator.mediaSession.playbackState=playing?'playing':'paused';}catch{}}
  }
  function expand(open){panel.hidden=!open;$('#bgm-toggle').hidden=open;$('#bgm-toggle').setAttribute('aria-expanded',String(open));$('#float-music').setAttribute('aria-expanded',String(open));}
  $('#bgm-toggle').addEventListener('click',()=>expand(true));$('#float-music').addEventListener('click',()=>expand(panel.hidden));$('#bgm-collapse').addEventListener('click',()=>expand(false));
  function prepare(){
    if(!tracks.length)return;const track=tracks[index];
    if(audio.getAttribute('src')===track.src)return;
    audio.src=track.src;audio.load();
    if('mediaSession' in navigator&&typeof MediaMetadata==='function'){try{navigator.mediaSession.metadata=new MediaMetadata({title:track.title,artist:track.artist,album:'群青 · 旅途 BGM'});}catch{}}
  }
  async function play(){
    if(!tracks.length)return;const token=++playGeneration;prepare();loading=true;$('#bgm-status').textContent='正在把音乐装进旅途…';
    try{await audio.play();if(token!==playGeneration)return;loading=false;$('#bgm-status').textContent=`正在播放 · ${modeNames[mode]} · 收起播放器也会继续播放。`;}
    catch(error){if(token!==playGeneration||error.name==='AbortError')return;loading=false;$('#bgm-status').textContent=error.name==='NotAllowedError'?'浏览器还没允许播放，再点一次播放按钮。':'这首歌暂未载入，试试下一首或稍后再播放。';}
    render();
  }
  function pause(){playGeneration++;loading=false;audio.pause();$('#bgm-status').textContent='音乐暂停了，风景还在。';persist();render();}
  function choose(next,start=!audio.paused||loading){playGeneration++;loading=false;audio.pause();index=(next+tracks.length)%tracks.length;prepare();render();persist();if(start)play();else $('#bgm-status').textContent='已切换曲目，点播放继续听。';}
  function next(start=!audio.paused||loading){if(!tracks.length)return;let target=(index+1)%tracks.length;if(mode==='shuffle'&&tracks.length>1){const pool=tracks.map((_,i)=>i).filter(i=>i!==index);target=pool[Math.floor(Math.random()*pool.length)];}choose(target,start);}
  function previous(){if(!tracks.length)return;if(audio.currentTime>3){audio.currentTime=0;progress();persist();return;}choose(index-1);}
  $('#bgm-play').addEventListener('click',()=>audio.paused&&!loading?play():pause());$('#viewer-bgm').addEventListener('click',()=>audio.paused&&!loading?play():pause());$('#bgm-next').addEventListener('click',()=>next());$('#bgm-prev').addEventListener('click',previous);
  $('#bgm-mode').addEventListener('click',()=>{mode=modes[(modes.indexOf(mode)+1)%modes.length];persist();render();$('#bgm-status').textContent=`已切换为${modeNames[mode]}。`;});
  $('#bgm-mute').addEventListener('click',()=>{audio.muted=!audio.muted;persist();render();});
  $('#bgm-volume').addEventListener('input',e=>{audio.volume=Number(e.target.value)/100;audio.muted=audio.volume===0;persist();render();});
  $('#bgm-seek').addEventListener('input',e=>{if(audio.currentSrc&&Number.isFinite(audio.duration)){audio.currentTime=Number(e.target.value);progress();persist();}});
  $('#bgm-tracks').addEventListener('click',e=>{const b=e.target.closest('[data-bgm-track]');if(b)choose(Number(b.dataset.bgmTrack),true);});
  audio.addEventListener('timeupdate',()=>{progress();if(Date.now()-lastSave>5000){lastSave=Date.now();persist();}});
  audio.addEventListener('loadedmetadata',()=>{if(saved.track===tracks[index]?.id&&Number.isFinite(saved.time)&&saved.time>0&&saved.time<audio.duration-2){audio.currentTime=saved.time;saved.time=0;}progress();});
  audio.addEventListener('play',render);audio.addEventListener('pause',render);
  audio.addEventListener('waiting',()=>{if(!audio.paused)$('#bgm-status').textContent='音乐正在缓冲，稍等一下。';});audio.addEventListener('playing',()=>{$('#bgm-status').textContent=`正在播放 · ${modeNames[mode]} · 收起播放器也会继续播放。`;render();});
  audio.addEventListener('error',()=>{loading=false;$('#bgm-status').textContent='音乐文件暂未载入，试试下一首。';render();});
  audio.addEventListener('ended',()=>{if(mode==='single'){audio.currentTime=0;play();}else next(true);});
  addEventListener('pagehide',persist);
  if('mediaSession' in navigator){const actions={play,pause,previoustrack:previous,nexttrack:()=>next(true),seekbackward:d=>{audio.currentTime=Math.max(0,audio.currentTime-(d.seekOffset||10));},seekforward:d=>{audio.currentTime=Math.min(duration(),audio.currentTime+(d.seekOffset||10));},seekto:d=>{if(Number.isFinite(d.seekTime)&&audio.currentSrc)audio.currentTime=d.seekTime;}};Object.entries(actions).forEach(([action,handler])=>{try{navigator.mediaSession.setActionHandler(action,handler);}catch{}});}
  fetch('audio/playlist.json').then(r=>{if(!r.ok)throw new Error('playlist');return r.json();}).then(list=>{
    tracks=list.filter(t=>t&&typeof t.title==='string'&&typeof t.artist==='string'&&/^audio\/[a-z0-9-]+\.m4a$/.test(t.src));index=Math.max(0,tracks.findIndex(t=>t.id===saved.track));
    $('#bgm-tracks').innerHTML=tracks.map((t,i)=>`<button data-bgm-track="${i}" aria-label="播放曲目 ${esc(t.title)}" aria-pressed="${i===index}"><small>${String(i+1).padStart(2,'0')}</small><span>${esc(t.title)}<em>${esc(t.artist)}</em></span><time>${clock(t.duration)}</time></button>`).join('');render();
  }).catch(()=>{$('#bgm-status').textContent='歌单暂未载入，请稍后刷新。';});render();
})();
