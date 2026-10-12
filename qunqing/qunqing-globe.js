/* Spherical globe using bundled D3 geo projection and Natural Earth land data. */
window.createTravelGlobe = ({getPlaces,getAlbum,onSelect,onManual,thumbFor,reducedMotion,onRepaint}) => {
  if(!window.d3?.geoOrthographic)return null;
  const $=s=>document.querySelector(s), root=$('#world-globe'),canvas=$('#globe-canvas'),ctx=canvas.getContext('2d');
  const pins=$('#globe-pins'),popover=$('#globe-popover'),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let width=0,height=0,radius=0,zoom=1,center=[110,25],visible=false,land=null,selected=null,spin=false,drag=null,flight=null,focusMotion=null,raf=0,previous=0;
  const projection=d3.geoOrthographic().clipAngle(90).precision(.6),path=d3.geoPath(projection,ctx),grid=d3.geoGraticule10();
  const nodes=new Map();
  const country=p=>p.country || (p.scope==='china'?'中国':p.id==='denmark'?'丹麦':['kyoto','osaka'].includes(p.id)?'日本':p.name);
  function syncProjection(){radius=Math.min(width*.43,height*.39)*zoom;projection.translate([width*.5,height*.48]).scale(radius).rotate([-center[0],-center[1],0]);}
  function project(coords){if(!coords||d3.geoDistance(center,coords)>Math.PI/2-.025)return null;const v=projection(coords);return {x:v[0],y:v[1]};}
  function line(points,color,lineWidth,dash=[]){ctx.beginPath();path({type:'LineString',coordinates:points});ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);}
  function drawFlight(){
    if(!flight?.from?.coords||!flight?.to?.coords)return;
    const interpolate=d3.geoInterpolate(flight.from.coords,flight.to.coords),steps=64;
    const points=Array.from({length:steps+1},(_,i)=>interpolate(i/steps));
    line(points,'#bbd7ff77',1.3,[4,6]);
    const completedCount=Math.max(2,Math.ceil(steps*flight.t)+1);
    const complete=Array.from({length:completedCount},(_,i)=>interpolate(flight.t*i/(completedCount-1)));
    line(complete,'#f7bf8c',2.5);
    const p=project(interpolate(flight.t));if(!p)return;
    const near=project(interpolate(Math.min(1,flight.t+.015))) || project(interpolate(Math.max(0,flight.t-.015)));
    let angle=near?Math.atan2(near.y-p.y,near.x-p.x):0;if(flight.t>.985)angle+=Math.PI;
    ctx.save();ctx.translate(p.x,p.y);if(flight.vehicle==='plane')ctx.rotate(angle);
    ctx.shadowColor='#06214c';ctx.shadowBlur=8;ctx.fillStyle='#fffdf7';ctx.strokeStyle='#133c95';ctx.lineWidth=1.8;
    if(flight.vehicle==='plane'){
      const shape=new Path2D('M24 0 6 4-8 16-13 16-7 4-20 4-25 9-28 9-24 0-28-9-25-9-20-4-7-4-13-16-8-16 6-4Z');ctx.fill(shape);ctx.stroke(shape);
    }else{
      if(near&&near.x<p.x)ctx.scale(-1,1);
      ctx.beginPath();ctx.roundRect(-23,-13,46,25,5);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#1c4ed8';
      for(let x=-15;x<20;x+=12)ctx.fillRect(x,-7,8,7);
      for(const x of [-13,13]){ctx.beginPath();ctx.arc(x,13,4,0,Math.PI*2);ctx.fill();}
    }
    ctx.restore();
  }
  function drawPins(){
    const points=getPlaces().map(p=>({p,pixel:project(p.coords)})).filter(v=>v.pixel),groups=[];
    // A world overview groups cities by country so nearby photos do not cover each other.
    for(const item of points){const found=groups.find(g=>country(g[0].p)===country(item.p));if(found)found.push(item);else groups.push([item]);}
    const keep=new Set(),occupied=[];
    for(const group of groups){
      const key=group.map(v=>v.p.id).sort().join('|');keep.add(key);
      let node=nodes.get(key);const chosen=group.find(v=>v.p.id===selected?.id)||group[0];
      const a=getAlbum(chosen.p),source=chosen.p.chapter?a.photos[chosen.p.photoIndex||0]?.src:a.cover;
      const countries=[...new Set(group.map(v=>country(v.p)))],label=group.length===1?chosen.p.name:countries.length===1?countries[0]+' · '+group.length+' 地':'足迹 · '+group.length+' 地';
      if(!node){node=document.createElement('button');node.className='globe-pin';node.dataset.globeMembers=key;node.innerHTML='<img alt=""><span class="globe-pin-name"></span><span class="globe-pin-count"></span>';nodes.set(key,node);pins.append(node);}
      const image=node.querySelector('img');if(image.getAttribute('src')!==thumbFor(source))image.src=thumbFor(source);
      node.querySelector('.globe-pin-name').textContent=label;const count=node.querySelector('.globe-pin-count');count.hidden=group.length===1;count.textContent=group.length;
      node.setAttribute('aria-label',group.length===1?'重访'+chosen.p.name:'展开'+group.map(v=>v.p.name).join('、'));
      node.setAttribute('aria-pressed',String(group.some(v=>v.p.id===selected?.id)));node.classList.toggle('active',group.some(v=>v.p.id===selected?.id));
      const pixel=group.some(v=>v.p.id===selected?.id)?chosen.pixel:group.reduce((v,item)=>({x:v.x+item.pixel.x/group.length,y:v.y+item.pixel.y/group.length}),{x:0,y:0});
      const candidates=[[0,0],[28,-25],[-28,25],[55,0],[-55,0],[0,-75],[0,75],[70,-45],[-70,45]];
      let anchor=pixel;
      for(const [dx,dy]of candidates){const next={x:Math.max(35,Math.min(width-35,pixel.x+dx)),y:Math.max(95,Math.min(height-78,pixel.y+dy))};if(!occupied.some(v=>Math.abs(v.x-next.x)<74&&Math.abs(v.y-next.y)<82)){anchor=next;break;}}
      occupied.push(anchor);
      if(Math.hypot(anchor.x-pixel.x,anchor.y-pixel.y)>2){ctx.beginPath();ctx.moveTo(pixel.x,pixel.y);ctx.lineTo(anchor.x,anchor.y);ctx.strokeStyle='#b7d2ff99';ctx.lineWidth=1;ctx.stroke();}
      ctx.beginPath();ctx.arc(pixel.x,pixel.y,2.5,0,Math.PI*2);ctx.fillStyle='#f5bc89';ctx.fill();
      node.style.left=anchor.x+'px';node.style.top=anchor.y+'px';
    }
    for(const [key,node]of nodes){if(!keep.has(key)){node.remove();nodes.delete(key);}}
  }
  function draw(){
    if(!visible||!width||!height)return;syncProjection();const x=width*.5,y=height*.48;ctx.clearRect(0,0,width,height);
    // Orbital lines and atmosphere are decorative; only land and pins are geographic.
    ctx.save();ctx.translate(x,y);ctx.rotate(-.25);ctx.beginPath();ctx.ellipse(0,0,radius*1.2,radius*.32,0,0,Math.PI*2);ctx.strokeStyle='#75a6ff20';ctx.lineWidth=1;ctx.setLineDash([3,8]);ctx.stroke();ctx.restore();
    const halo=ctx.createRadialGradient(x,y,radius*.96,x,y,radius*1.12);halo.addColorStop(0,'#568dff55');halo.addColorStop(1,'#568dff00');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(x,y,radius*1.12,0,Math.PI*2);ctx.fill();
    const ocean=ctx.createRadialGradient(x-radius*.45,y-radius*.4,radius*.05,x,y,radius);ocean.addColorStop(0,'#3979dc');ocean.addColorStop(.6,'#184ca1');ocean.addColorStop(1,'#071e51');ctx.fillStyle=ocean;ctx.beginPath();path({type:'Sphere'});ctx.fill();
    ctx.beginPath();path(grid);ctx.strokeStyle='#a4caff24';ctx.lineWidth=.7;ctx.stroke();
    if(land){const fill=ctx.createLinearGradient(x-radius,y-radius,x+radius,y+radius);fill.addColorStop(0,'#a5caff');fill.addColorStop(.65,'#74a6e8');fill.addColorStop(1,'#4a78bd');ctx.beginPath();path(land);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle='#cee4ff55';ctx.lineWidth=.6;ctx.stroke();}
    const shade=ctx.createRadialGradient(x-radius*.32,y-radius*.37,radius*.22,x+radius*.25,y+radius*.18,radius*1.17);shade.addColorStop(0,'#06163e00');shade.addColorStop(.65,'#06163e18');shade.addColorStop(1,'#020f32bd');ctx.beginPath();path({type:'Sphere'});ctx.fillStyle=shade;ctx.fill();ctx.strokeStyle='#b9d8ff66';ctx.lineWidth=1;ctx.stroke();
    drawFlight();drawPins();
  }
  function tick(time){raf=0;if(!visible||document.hidden)return;const dt=previous?Math.min(.1,(time-previous)/1000):0;previous=time;
    if(focusMotion){const t=Math.min(1,(time-focusMotion.start)/focusMotion.duration),u=1-(1-t)**3;center=focusMotion.at(u);if(t===1)focusMotion=null;}
    else if(spin&&!drag){center[0]=(center[0]+dt*6)%360;}
    draw();onRepaint?.();if((focusMotion||spin)&&!raf)raf=requestAnimationFrame(tick);else if(!raf)previous=0;
  }
  function requestDraw(){if(!raf){previous=0;raf=requestAnimationFrame(tick);}}
  function pauseSpin(){if(!spin)return;spin=false;$('#globe-spin').setAttribute('aria-pressed','false');$('#globe-spin').textContent='↻ 让地球转起来';}
  function focus(coords,animate=true){if(!coords)return;pauseSpin();const target=[...coords];if(reducedMotion||!animate){center=target;focusMotion=null;draw();return;}focusMotion={at:d3.geoInterpolate(center,target),start:performance.now(),duration:750};requestDraw();}
  function refresh(){popover.hidden=true;draw();$('#globe-footprints').textContent=`${getPlaces().length} 个地点 / 一个小小世界`;}
  function reset(){zoom=1;flight=null;focus([110,25]);popover.hidden=true;}
  function setVisible(next){visible=next;if(!next){cancelAnimationFrame(raf);raf=0;previous=0;return;}resize();if(spin||focusMotion)requestDraw();}
  function resize(){width=root.clientWidth||root.parentElement.clientWidth;height=root.clientHeight||root.parentElement.clientHeight;const dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();onRepaint?.();}
  function travel(from,to,t,vehicle){root.classList.add('replaying');pauseSpin();if(!from||!to){flight=null;draw();return;}const key=from.id+'|'+to.id;if(flight?.key!==key){const middle=d3.geoInterpolate(from.coords,to.coords)(.5);focus(middle,true);}flight={key,from,to,t,vehicle};draw();}
  function clearTravel(){flight=null;root.classList.remove('replaying');draw();}
  pins.addEventListener('click',e=>{
    const node=e.target.closest('[data-globe-members]');if(!node)return;onManual();pauseSpin();const group=getPlaces().filter(p=>node.dataset.globeMembers.split('|').includes(p.id));
    if(group.length===1){popover.hidden=true;onSelect(group[0]);return;}
    $('#globe-popover-title').textContent='这颗图钉里，藏着 '+group.length+' 个地方';
    $('#globe-popover-list').innerHTML=group.map(p=>`<button data-globe-place="${esc(p.id)}">${esc(p.name)} <span>↗</span></button>`).join('');popover.hidden=false;
  });
  $('#globe-popover-list').addEventListener('click',e=>{const button=e.target.closest('[data-globe-place]');if(button){popover.hidden=true;onSelect(getPlaces().find(p=>p.id===button.dataset.globePlace));}});
  $('#globe-popover-close').addEventListener('click',()=>{popover.hidden=true;});
  root.addEventListener('pointerdown',e=>{if(e.target.closest('button,a'))return;onManual();pauseSpin();focusMotion=null;popover.hidden=true;drag={x:e.clientX,y:e.clientY,center:[...center],id:e.pointerId};root.setPointerCapture(e.pointerId);root.classList.add('dragging');});
  root.addEventListener('pointermove',e=>{if(!drag)return;center=[drag.center[0]-(e.clientX-drag.x)*.35,Math.max(-75,Math.min(75,drag.center[1]+(e.clientY-drag.y)*.28))];draw();});
  function endDrag(){drag=null;root.classList.remove('dragging');}
  root.addEventListener('pointerup',endDrag);root.addEventListener('pointercancel',endDrag);
  $('#globe-spin').addEventListener('click',()=>{onManual();spin=!spin;$('#globe-spin').setAttribute('aria-pressed',String(spin));$('#globe-spin').textContent=spin?'Ⅱ 暂停地球自转':'↻ 让地球转起来';if(spin)requestDraw();});
  $('#globe-zoom-in').addEventListener('click',()=>{onManual();zoom=Math.min(1.65,zoom+.15);draw();});$('#globe-zoom-out').addEventListener('click',()=>{onManual();zoom=Math.max(.75,zoom-.15);draw();});
  new ResizeObserver(resize).observe(root);document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;previous=0;}else if(visible&&(spin||focusMotion))requestDraw();});
  fetch('data/ne-110m-land.json').then(r=>{if(!r.ok)throw new Error('地形数据未载入');return r.json();}).then(data=>{
    // D3 expects clockwise exterior rings; normalise features that represent a complement.
    for(const f of data.features){if(d3.geoArea(f)>2*Math.PI){const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;polygons.forEach(p=>p.forEach(ring=>ring.reverse()));}}
    land=data;draw();$('#globe-loading').hidden=true;
  }).catch(()=>{$('#globe-loading').textContent='地形数据未载入，请刷新；地点索引仍可使用。';});
  return {setVisible,refresh,reset,project,travel,clearTravel,select:(p,fly=false)=>{selected=p;if(fly)focus(p.coords);else draw();},pause:pauseSpin};
};
