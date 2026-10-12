/* A schematic memory player: no routing service or inferred transport history. */
window.createJourneyReplay = ({getPlan, prepare, project, thumbFor, reducedMotion,sameScene,renderSegment,onStop}) => {
  const $=s=>document.querySelector(s), esc=s=>String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stage=$('.map-stage'), overlay=$('#replay-overlay'), actor=$('#replay-vehicle');
  const guide=$('#replay-guide'), trail=$('#replay-trail'), arrival=$('#replay-arrival'), caption=$('#replay-map-caption');
  let plan=[], index=0, phase=0, running=false, active=false, vehicle='plane', repeat=false, raf=0, previousTime=0, prepared=true;
  const travel=.72, seconds=4.2;let drawnVehicle='';
  const icons={plane:'<path d="M26 0 6 5-9 18-14 18-7 5-21 5-26 10-29 10-25 0-29-10-26-10-21-5-7-5-14-18-9-18 6-5Z"/>',train:'<rect x="-28" y="-15" width="52" height="27" rx="5"/><path d="m24-2 7 9v5h-8M-18-15v-5h10v5"/><path class="vehicle-window" d="M-19-8h9v8h-9Zm15 0h9v8h-9Zm15 0h7v8h-7Z"/><circle class="vehicle-wheel" cx="-15" cy="14" r="5"/><circle class="vehicle-wheel" cx="15" cy="14" r="5"/>'};
  function position(p){if(!p)return null;return project(p);}
  function controls(){
    $('#replay-play').textContent=running?'Ⅱ 暂停回放':index===plan.length-1&&phase>=1?'↺ 再走一遍':active?'▶ 继续回放':'▶ 开始回放';
    $('#replay-map-hud').hidden=!active;$('#replay-hud-play').textContent=running?'Ⅱ':'▶';
    $('#replay-hud-play').setAttribute('aria-label',running?'暂停旅程回放':'继续旅程回放');
    $('#replay-hud-prev').disabled=index===0;$('#replay-hud-next').disabled=index===plan.length-1;
    $('#replay-play').setAttribute('aria-pressed',String(running));
    $('#replay-prev').disabled=!plan.length || index===0;
    $('#replay-next').disabled=!plan.length || index===plan.length-1;
    $('#replay-play').disabled=!plan.length;$('#replay-seek').disabled=plan.length<2;
  }
  function mark(){
    $('#replay-seek').value=Math.max(0,index-(index>0?1-phase:0));
    $('#replay-counter').textContent=`${String(index+1).padStart(2,'0')} / ${String(plan.length).padStart(2,'0')}`;
    document.querySelectorAll('#replay-film button').forEach((b,i)=>b.setAttribute('aria-current',i===index?'step':'false'));
    const target=$(`#replay-film [data-replay-stop="${index}"]`), film=$('#replay-film');
    if(target && (target.offsetLeft<film.scrollLeft || target.offsetLeft+target.offsetWidth>film.scrollLeft+film.clientWidth)) film.scrollTo({left:target.offsetLeft-film.clientWidth/2+target.offsetWidth/2,behavior:'instant'});
    controls();
  }
  function announce(){
    const to=plan[index];if(!to)return;
    const status=`${to.date} · ${to.name}${to.place?'':' · 这一帧留在照片里，尚未记录地图地点'}`;
    if($('#replay-status').textContent!==status)$('#replay-status').textContent=status;
    const label=`${index>0&&phase<travel?'下一站':'此刻'} / ${to.name}`;if(caption.textContent!==label)caption.textContent=label;caption.hidden=!active;
  }
  function prepareCurrent(){if(!prepared){prepared=true;prepare(plan[index]);announce();}}
  function paint(){
    if(!active || !plan.length){overlay.hidden=true;caption.hidden=true;return;}
    const w=stage.clientWidth,h=stage.clientHeight;overlay.setAttribute('viewBox',`0 0 ${w} ${h}`);
    const to=plan[index],from=plan[Math.max(0,index-1)],t=index===0?1:Math.min(1,phase/travel);
    const cross=from.place && to.place && (sameScene?!sameScene(from.place,to.place):from.place.scope!==to.place.scope);
    if(!prepared && (!cross || t>=.5 || reducedMotion)) prepareCurrent();
    if(renderSegment?.(from.place,to.place,t,vehicle)){overlay.hidden=true;announce();return;}
    let a=position(from.place),b=position(to.place),local=t;
    if(!a || !b || !to.place || !from.place){overlay.hidden=true;announce();return;}
    if(cross){
      // Switch scenes halfway through; edge entry is illustrative, not geography.
      if(t<.5){a=position(from.place);b={x:w+50,y:Math.max(80,h*.32)};local=t*2;}
      else{a={x:-50,y:Math.max(80,h*.32)};b=position(to.place);local=(t-.5)*2;}
    }
    overlay.hidden=false;
    const dx=b.x-a.x,dy=b.y-a.y,curve=vehicle==='plane'&&!reducedMotion?Math.min(85,Math.hypot(dx,dy)*.22):0;
    const c={x:(a.x+b.x)/2,y:(a.y+b.y)/2-curve};
    const path=`M${a.x},${a.y}Q${c.x},${c.y} ${b.x},${b.y}`;
    guide.setAttribute('d',path);trail.setAttribute('d',path);
    const length=trail.getTotalLength();trail.style.strokeDasharray=`${length} ${length}`;trail.style.strokeDashoffset=length*(1-local);
    const u=reducedMotion?1:local;
    const x=(1-u)**2*a.x+2*(1-u)*u*c.x+u*u*b.x,y=(1-u)**2*a.y+2*(1-u)*u*c.y+u*u*b.y;
    const angle=vehicle==='plane'?Math.atan2(2*(1-u)*(c.y-a.y)+2*u*(b.y-c.y),2*(1-u)*(c.x-a.x)+2*u*(b.x-c.x))*180/Math.PI:0;
    actor.setAttribute('transform',`translate(${x},${y}) rotate(${angle}) scale(${vehicle==='train'&&dx<0?-1:1},1)`);
    if(drawnVehicle!==vehicle){actor.innerHTML=icons[vehicle];actor.classList.toggle('is-train',vehicle==='train');drawnVehicle=vehicle;}
    arrival.setAttribute('cx',b.x);arrival.setAttribute('cy',b.y);arrival.style.opacity=t>=1?'.85':'0';
    announce();
  }
  function frame(now){
    if(!running)return;
    if(previousTime)phase+=Math.min(.12,(now-previousTime)/1000)*Number($('#replay-speed').value)/seconds;
    previousTime=now;
    if(phase>=1){
      if(index+1<plan.length){index++;phase=0;prepared=false;mark();}
      else if(repeat){index=0;phase=0;prepared=false;prepareCurrent();mark();}
      else{phase=1;pause();$('#replay-status').textContent='这一遍走完了。还想再出发，就按播放。';controls();return;}
    }
    paint();$('#replay-seek').value=index>0?index-1+phase:0;
    raf=requestAnimationFrame(frame);
  }
  function pause(){running=false;cancelAnimationFrame(raf);previousTime=0;controls();}
  function stop(){pause();active=false;onStop?.();overlay.hidden=true;caption.hidden=true;controls();}
  function seek(i, resume=false){
    pause();if(!plan.length)return;
    index=Math.max(0,Math.min(plan.length-1,i));phase=1;prepared=false;active=true;prepareCurrent();paint();mark();
    if(resume)play();
  }
  function play(){
    if(!plan.length)return;
    if(index===plan.length-1&&phase>=1){index=0;phase=0;prepared=false;}
    if(!active){active=true;prepared=false;prepareCurrent();}
    stage.scrollIntoView({behavior:reducedMotion?'instant':'smooth',block:'start'});
    running=true;previousTime=0;mark();paint();raf=requestAnimationFrame(frame);
  }
  function refresh(){
    stop();plan=getPlan($('#replay-range').value);index=0;phase=0;prepared=true;
    $('#replay-seek').max=Math.max(1,plan.length-1);
    $('#replay-film').innerHTML=plan.map((p,i)=>`<button data-replay-stop="${i}" aria-current="${i===0?'step':'false'}" aria-label="重访${esc(p.name)}"><img src="${esc(thumbFor(p.photo))}" alt="" loading="lazy"><span>${esc(p.name)}</span><small>${esc(p.date)}</small></button>`).join('');
    mark();$('#replay-status').textContent=plan.length?`${plan.length} 段回忆已装入。按日期，从头出发。`:'这个范围还没有相册，换个年份试试。';
  }
  $('#replay-play').addEventListener('click',()=>running?pause():play());
  $('#replay-hud-play').addEventListener('click',()=>running?pause():play());
  $('#replay-hud-prev').addEventListener('click',()=>seek(index-1));$('#replay-hud-next').addEventListener('click',()=>seek(index+1));$('#replay-hud-stop').addEventListener('click',stop);
  $('#replay-prev').addEventListener('click',()=>seek(index-1));$('#replay-next').addEventListener('click',()=>seek(index+1));
  $('#replay-film').addEventListener('click',e=>{const b=e.target.closest('[data-replay-stop]');if(b)seek(Number(b.dataset.replayStop));});
  $('#replay-seek').addEventListener('input',()=>seek(Math.round(Number($('#replay-seek').value))));
  $('#replay-range').addEventListener('change',refresh);
  $('#replay-loop').addEventListener('click',e=>{repeat=!repeat;e.currentTarget.setAttribute('aria-pressed',String(repeat));});
  document.querySelectorAll('[data-vehicle]').forEach(b=>b.addEventListener('click',()=>{vehicle=b.dataset.vehicle;document.querySelectorAll('[data-vehicle]').forEach(v=>v.setAttribute('aria-pressed',String(v===b)));paint();}));
  new ResizeObserver(()=>paint()).observe(stage);
  refresh();return {stop,pause,refresh,repaint:paint,isActive:()=>active,range:()=>$('#replay-range').value};
};
