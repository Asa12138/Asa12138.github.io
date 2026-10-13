(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const data = window.TRAVEL_ATLAS_DATA || [];
  const config = { ...(window.TRAVEL_MAP_CONFIG || {}) };
  const storyDialog=$('#story-dialog');
  let storyAlbum=null;
  const dialog = $('#photo-dialog');
  const postcardDialog = $('#postcard-dialog');
  const settingsDialog = $('#settings-dialog');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STORE = 'qunqing-atlas-v3';
  const access=window.TravelAccess;
  function readSaved() { return access.saved(STORE); }
  const saved = readSaved();
  const stamps = new Set(Array.isArray(saved.stamps) ? saved.stamps : []);
  const favorites = new Set(Array.isArray(saved.favorites) ? saved.favorites.map(src=>src.replace(/^images\//,'../images/')) : []);
  const QUIZ_RULES='ten-in-a-row-v1';
  const readBest=record=>record.quizRules===QUIZ_RULES&&Number.isInteger(record.quizBest)&&record.quizBest>=0&&record.quizBest<=10?record.quizBest:null;
  let quizBest=readBest(saved),legacyQuizBest=saved.quizRules===QUIZ_RULES?saved.legacyQuizBest:saved.quizBest;
  let stampPage=0, stampLimit='all', replay=null, globe=null, rewards=null, quiz=null;
  const persist = () => access.write(STORE,{stamps:[...stamps],favorites:[...favorites],quizBest,quizRules:QUIZ_RULES,...(legacyQuizBest!==undefined?{legacyQuizBest}:{})});
  const albums = data.map((a,index) => ({...a,index,name:a.name || a.title,location:a.location || '地点待补充',category:a.category || '旅程'}));
  const photoThumbs = new Map(data.flatMap(a=>a.photos.map(p=>[p.src,p.thumb || p.src])));
  albums.forEach(a=>photoThumbs.set(a.cover,a.coverThumb || photoThumbs.get(a.cover) || a.cover));
  const thumbFor = src => photoThumbs.get(src) || src;
  const byKey = key => albums.find(a=>a.key===key);
  const placeMap = new Map();
  albums.forEach(a=>(a.places || []).forEach(info=>{
    if(!placeMap.has(info.id)) placeMap.set(info.id,{...info,scope:info.scope || 'china',en:info.en || 'TRAVEL',keys:[],albums:[]});
    const p=placeMap.get(info.id);p.keys.push(a.key);p.albums.push(a);
  }));
  const places = [...placeMap.values()];
  // The fallback star chart is an illustration; the actual map uses coords.
  places.forEach((p,i)=>{if(!p.star)p.star=[18+(i%4)*21,24+(Math.floor(i/4)%4)*18];});
  const qinggan = byKey('2508qinggan');
  const routePlaces = (qinggan?.route || []).map(p=>({...p,en:'QINGGAN',scope:'qinggan',keys:[qinggan.key],albums:[qinggan],photoIndex:p.chapter?Math.max(0,qinggan.photos.findIndex(photo=>photo.chapter.includes(p.chapter))):0}));
  let scope = 'china', mapYear = 'all', journalYear = 'all', company = 'all';
  const companyLabel=a=>a.companions==='solo'?'独自出发':'与群青同行';
  const matchesCompany=a=>company==='all'||(a.companions||'together')===company;
  const companyAlbums=()=>albums.filter(matchesCompany);
  const companyPlaces=()=>places.filter(p=>p.albums.some(matchesCompany));
  let currentPlace = places.find(p=>p.id==='qinghai') || places.find(p=>p.scope==='china') || places[0] || null, destinationAlbum = currentPlace?.albums[0] || null;
  let map = null, mapReady = false, mapLoading = false, markers = [], routeLine = null, clusterMarkers = [];
  let mapFailure = '', mapGeneration = 0;
  let currentAlbum = null, photoIndex = 0, photoTimer = null;
  let postcardAlbum = null, postcardPhoto = 0, toastTimer = null, swipeStart = null;
  let cardNodes = [];
  const allYears = [...new Set(albums.map(a => a.year))].sort().reverse();

  function toast(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false; toastTimer = setTimeout(() => { $('#toast').hidden = true; },2500); }
  function eligiblePlaces() { return (scope === 'qinggan' ? routePlaces : scope === 'overseas' ? places : places.filter(p => p.scope === scope)).filter(p => eligibleAlbums(p).length); }
  function eligibleAlbums(p) { return p.albums.filter(a => matchesCompany(a)&&(mapYear === 'all' || a.year === mapYear)); }
  function pinHTML(p) { const a = eligibleAlbums(p)[0] || p.albums[0]; const src = p.chapter ? a.photos[p.photoIndex].src : a.cover; return `<button class="photo-pin${currentPlace?.id === p.id?' active':''}" data-place="${esc(p.id)}" aria-label="查看${esc(p.name)}的旅行照片" aria-pressed="${currentPlace?.id === p.id}"><img src="${esc(thumbFor(src))}" alt="" loading="lazy"><span>${esc(p.name)}</span></button>`; }
  function stampFor(p) { return places.find(v=>v.id===p.id) || places.find(v=>v.keys.some(key=>p.keys.includes(key))); }
  function collectStamp(p) {
    if(!access.isMember())return;
    const v = stampFor(p);
    if (!v || stamps.has(v.id)) return;
    stamps.add(v.id);persist();renderPassport(v.id);toast(`已盖章 · ${v.stampName || v.name} ✳`);
  }
  function renderPassport(animateID = '') {
    const passportPlaces=companyPlaces();
    const perPage=stampLimit==='all'?Math.max(1,passportPlaces.length):Number(stampLimit);
    if(animateID)stampPage=Math.floor(Math.max(0,passportPlaces.findIndex(p=>p.id===animateID))/perPage);
    const totalPages=Math.max(1,Math.ceil(passportPlaces.length/perPage));stampPage=Math.max(0,Math.min(stampPage,totalPages-1));
    $('#stamp-pagination').hidden=totalPages<=1;
    $('#stamp-page').textContent=`${String(stampPage+1).padStart(2,'0')} / ${String(totalPages).padStart(2,'0')}`;
    $('#stamp-prev').disabled=stampPage===0;$('#stamp-next').disabled=stampPage===totalPages-1;
    $('#stamp-book').dataset.density=stampLimit;
    // Stable offsets keep the loose, hand-stamped arrangement across page flips.
    const tilts=[-13,8,-5,15,-9,4,11,-7], shifts=[-4,7,-1,9,2,-7,5,-3], scales=[1,.92,1.04,.95,1,.9,.98,1.03];
    $('#stamp-book').innerHTML = passportPlaces.slice(stampPage*perPage,stampPage*perPage+perPage).map((p,i) => {
      const j=stampPage*perPage+i;
      return `<button class="passport-stamp${stamps.has(p.id)?' collected':''}${animateID===p.id?' just-stamped':''}" style="--stamp-tilt:${tilts[j%tilts.length]}deg;--stamp-shift:${shifts[j%shifts.length]}px;--stamp-scale:${scales[j%scales.length]}" data-stamp="${esc(p.id)}" aria-label="${stamps.has(p.id)?'已收集':'重访并收集'}${esc(p.stampName || p.name)}印章"><span>${esc((p.stampName || p.name).replace(' · 三星堆',''))}</span><small>${esc(p.en)}</small></button>`;
    }).join('');
    $('#stamp-count').textContent = passportPlaces.filter(p => stamps.has(p.id)).length;
    $('#stamp-total').textContent = passportPlaces.length;
    $('#passport-access-note').textContent=access.isMember()?'点开地点，盖下属于那段旅程的印章。':'游客可重访地点；登录后才会记录印章。';
    $('#passport-reset').disabled=!access.isMember();
  }
  function setScope(next, shouldScroll = false, duringReplay = false) {
    if(!duringReplay)stopRoute();scope = next;
    if (next === 'qinggan') mapYear = 'all';
    $$('.scope-tabs button').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.scope === scope)));
    $$('#map-years button').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.year === mapYear)));
    $('#map-years').hidden = scope === 'qinggan';
    const visible = eligiblePlaces();
    if (!visible.some(p => p.id === currentPlace?.id)) currentPlace = visible[0] || null;
    renderPlaces();
    if (currentPlace) selectPlace(currentPlace, {fly:false, collect:false,fromReplay:true}); else clearDestination();
    if(!duringReplay){if(scope==='qinggan')$('#replay-range').value='view';replay?.refresh();}
    if (shouldScroll) $('#atlas').scrollIntoView({behavior:reducedMotion?'instant':'smooth'});
  }
  function renderPlaces() {
    const visible = eligiblePlaces();
    const useMap = scope !== 'overseas' && mapReady, useGlobe=scope==='overseas'&&!!globe;
    $('#world-globe').hidden=!useGlobe;globe?.setVisible(useGlobe);globe?.refresh();$('.map-stage').classList.toggle('is-globe',useGlobe);
    $('#amap').hidden = !useMap;
    $('#constellation').hidden = useMap || useGlobe;
    $('#map-zoom').hidden = !useMap;
    $('#place-index-list').innerHTML = visible.map(p => `<button data-index-place="${p.id}" aria-pressed="${p.id===currentPlace?.id}">${esc(p.name)}</button>`).join('');
    $('#map-count').textContent = `${visible.length} 个${scope==='qinggan'?'旅程站点':scope==='overseas'?'地球足迹':'地点'} · 点击照片图钉`;
    $('#map-mode-label').textContent = useMap ? 'AMAP / 我们的旅行坐标' : useGlobe ? 'EARTH / 一起走过的小小世界' : scope === 'overseas' ? 'WORLD / 旅行地点星图' : 'TRAVEL / 旅行地点星图';
    $('#map-location-note').textContent = useMap || useGlobe ? '城市 / 景区概略位置 · 非照片 GPS' : '地点星图 · 排版示意，非地理比例';
    $$('.region-word').forEach(el => { el.hidden = scope !== 'china'; });
    $('#star-pins').innerHTML = visible.map(p => `<div class="star-pin" style="left:${p.star[0]}%;top:${p.star[1]}%">${pinHTML(p)}</div>`).join('');
    $('#constellation').classList.toggle('overseas',scope==='overseas');
    updateMapStatus();
    if (!useMap) return;
    map.remove([...markers,...clusterMarkers]);markers = [];clusterMarkers=[];
    if (routeLine) { map.remove(routeLine);routeLine = null; }
    visible.forEach(p => {
      const wrap = document.createElement('div');wrap.innerHTML = pinHTML(p);const content = wrap.firstElementChild;
      content.addEventListener('click',() => selectPlace(p));
      const marker = new AMap.Marker({position:p.coords,content,anchor:'bottom-center',zIndex:p.id===currentPlace?.id?200:100});
      marker._placeID = p.id;marker._content = content;markers.push(marker);
    });
    map.add(markers);
    if (scope === 'qinggan') {
      routeLine = new AMap.Polyline({path:routePlaces.map(p => p.coords),strokeColor:'#dd603f',strokeWeight:3,strokeStyle:'dashed',strokeOpacity:.65,zIndex:50});map.add(routeLine);
    }
    resetMapView();
  }
  function layoutMapPins() {
    if (!mapReady || scope === 'overseas') return;
    map.remove(clusterMarkers);clusterMarkers=[];
    const points=markers.map(marker=>({marker,p:eligiblePlaces().find(p=>p.id===marker._placeID),pixel:map.lngLatToContainer(marker.getPosition())}));
    const narrow=window.innerWidth<=820;
    const groups=[];
    // Bound each stack's diameter so a chain of close points cannot merge
    // distant cities into one misleading region-sized stack.
    points.forEach(item=>{
      const group=groups.find(g=>g.every(other=>Math.abs(item.pixel.x-other.pixel.x)<(narrow?53:68)&&Math.abs(item.pixel.y-other.pixel.y)<(narrow?63:80)));
      if(group)group.push(item);else groups.push([item]);
    });
    groups.forEach(group=>{
      if(group.length===1){group[0].marker.show();return;}
      group.forEach(v=>v.marker.hide());
      const first=group.find(v=>v.p.id==='hangzhou') || group.find(v=>v.p.id===currentPlace?.id) || group[0];
      const isJiangnan=group.every(v=>v.p.coords[0]>=118&&v.p.coords[0]<=123&&v.p.coords[1]>=28&&v.p.coords[1]<=33);
      const label=isJiangnan?'江南':'照片合集';
      const node=document.createElement('button');node.className='cluster-pin';node.setAttribute('aria-label',`展开${label}的${group.length}个地点`);
      node.innerHTML=`<img src="${esc(thumbFor((eligibleAlbums(first.p)[0] || first.p.albums[0]).cover))}" alt=""><span class="cluster-count">${group.length}</span><span class="cluster-name">${esc(label)} · ${group.length} 地</span>`;
      node.addEventListener('click',()=>{stopRoute();group.forEach(v=>v.marker.show());map.setFitView(group.map(v=>v.marker),true,[80,70,70,70],12);layoutMapPins();});
      const coords=group.reduce((v,item)=>[v[0]+item.p.coords[0]/group.length,v[1]+item.p.coords[1]/group.length],[0,0]);
      const marker=new AMap.Marker({position:coords,content:node,anchor:'bottom-center',zIndex:180});clusterMarkers.push(marker);map.add(marker);
    });
  }
  function updateMapStatus() {
    $('#map-status').textContent = scope === 'overseas' ? globe?'拖动地球可以旋转；点击照片合集可展开附近地点。地点为城市 / 景区概略位置；丹麦定位到国家。':'世界地点星图为排版示意。地点索引与相册仍可探索。' : mapReady ? '高德地图已连接。点击照片叠可展开附近地点。可拖动、缩放；青甘连线为旅程示意，不是导航轨迹。' : mapLoading ? '正在连接高德地图，先在地点星图里逛逛。' : `${mapFailure || '高德地图尚未连接'}；地点星图与相册仍可探索。`;
  }
  function resetMapView() {
    if(scope==='overseas'&&globe){globe.reset();return;}
    if (!mapReady || scope === 'overseas' || !markers.length) return;
    map.resize();
    markers.forEach(m=>m.show());
    if (markers.length === 1) map.setZoomAndCenter(10,eligiblePlaces()[0].coords,true);
    else map.setFitView(markers,true,[70,65,55,65],scope === 'qinggan'?7:6);
    layoutMapPins();
  }
  function selectPlace(p,{fly=true,collect=true,album=null,fromReplay=false}={}) {
    if (!p) return;
    if(!fromReplay)stopRoute();
    currentPlace = p;destinationAlbum = album || eligibleAlbums(p)[0] || p.albums[0];
    const cover = p.chapter ? destinationAlbum.photos[p.photoIndex].src : destinationAlbum.cover;
    $('#destination-open').disabled=false;
    $('#destination-image').src = thumbFor(cover);$('#destination-image').alt = `${p.name} · ${destinationAlbum.name}`;
    $('#destination-open').setAttribute('aria-label',`翻开${destinationAlbum.name}相册`);
    $('#destination-count').textContent = `${destinationAlbum.photos.length} FRAMES`;
    $('#destination-date').textContent = `${destinationAlbum.year} / ${p.date || destinationAlbum.date}`;
    $('#destination-title').textContent = p.chapter || p.scope==='qinggan' ? p.name : destinationAlbum.name;
    $('#destination-story').hidden=!destinationAlbum.notes.length;
    $('#destination-note').textContent = p.note || destinationAlbum.summary || destinationAlbum.notes[0] || '把这一天，留在照片里。';
    $('#destination-location').textContent = `${p.en} / ${destinationAlbum.category} / ${companyLabel(destinationAlbum)}`;
    $('#place-number').textContent = String(eligiblePlaces().findIndex(v => v.id === p.id)+1).padStart(2,'0');
    $('#place-albums').innerHTML = eligibleAlbums(p).length > 1 ? eligibleAlbums(p).map(a => `<button data-place-album="${a.index}" aria-pressed="${a===destinationAlbum}">${esc(a.name)}</button>`).join('') : '';
    $$('#place-index-list button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.indexPlace===p.id)));
    $$('#star-pins .photo-pin').forEach(b => { b.classList.toggle('active',b.dataset.place===p.id);b.setAttribute('aria-pressed',String(b.dataset.place===p.id)); });
    markers.forEach(m => { const active = m._placeID===p.id;m._content.classList.toggle('active',active);m._content.setAttribute('aria-pressed',String(active));m.setzIndex(active?200:100); });
    if (fly && mapReady && scope !== 'overseas') map.setZoomAndCenter(scope==='qinggan'?8:Math.max(map.getZoom(),9),p.coords,reducedMotion,500);
    if(scope==='overseas')globe?.select(p,fly);
    if (collect) collectStamp(p);
  }
  function clearDestination() {
    $('#destination-story').hidden=true;
    $('#destination-title').textContent = '这里，还没有匹配的足迹';$('#destination-note').textContent = '换个年份、同行人或地图视野，继续探索。';
    $('#destination-image').removeAttribute('src');$('#destination-image').alt='';$('#place-number').textContent='—';$('#destination-location').textContent='下一段旅程待续';$('#destination-count').textContent = '';$('#destination-date').textContent = '';$('#place-albums').innerHTML = '';
    $('#destination-open').disabled = true;destinationAlbum = null;
  }
  function stopRoute() { replay?.stop(); }
  function replayPlan(range) {
    if(range==='view' && scope==='qinggan')return routePlaces.filter(p=>eligibleAlbums(p).length).map(p=>({place:p,album:qinggan,name:p.name,date:p.date,photo:qinggan.photos[p.photoIndex].src}));
    return companyAlbums().sort((a,b)=>(a.startDate||a.date).localeCompare(b.startDate||b.date)||a.index-b.index)
      .filter(a=>range==='all'||(mapYear==='all'||a.year===mapYear)&&(scope==='overseas'?a.places.length:a.places.some(p=>p.scope===scope)))
      .map(a=>({place:findAlbumPlace(a),album:a,name:a.name,date:a.date,photo:a.cover}));
  }
  function prepareReplay(record) {
    const p=record.place;
    if(p){
      const resetYear=replay.range()==='all'&&mapYear!=='all';
      if(replay.range()==='all')mapYear='all';
      if(resetYear || scope!=='overseas'&&(scope!==p.scope || !eligiblePlaces().some(v=>v.id===p.id)))setScope(scope==='overseas'?'overseas':p.scope,false,true);
      if(scope!=='overseas')resetMapView();
      selectPlace(p,{fly:false,collect:false,album:record.album,fromReplay:true});
    }else{
      // Unlocated albums remain photo memories; no invented map point.
      selectPlace({id:'photo-only',name:record.album.name,en:'PHOTO MEMORY',albums:[record.album],keys:[record.album.key],scope},{fly:false,collect:false,album:record.album,fromReplay:true});
      $('#place-number').textContent='✳';$('#destination-location').textContent='PHOTO MEMORY / 地点未记录';
    }
  }
  function projectReplay(p) {
    if(!p)return null;
    if(scope==='overseas'&&globe)return globe.project(p.coords);
    if(mapReady && scope!=='overseas' && p.coords){const pixel=map.lngLatToContainer(p.coords);return {x:pixel.x,y:pixel.y};}
    const star=p.star || [18+(routePlaces.findIndex(v=>v.id===p.id)%4)*21,30+Math.floor(routePlaces.findIndex(v=>v.id===p.id)/4)*27];
    const stage=$('.map-stage');return {x:stage.clientWidth*star[0]/100,y:stage.clientHeight*star[1]/100};
  }
  async function connectMap() {
    if (mapLoading) return;
    mapLoading=true;mapFailure='';updateMapStatus();
    const generation=++mapGeneration;
    try {
      if (!config.key) throw new Error('缺少高德 Web 端 key');
      window._AMapSecurityConfig = config.serviceHost ? {serviceHost:config.serviceHost} : {securityJsCode:config.securityJsCode || ''};
      if (map) {map.destroy();map=null;mapReady=false;markers=[];routeLine=null;}
      await new Promise((resolve,reject) => {
        const old=$('#amap-sdk');if(old) old.remove();
        const script=document.createElement('script');script.id='amap-sdk';
        const timer=setTimeout(() => reject(new Error('高德连接超时')),15000);
        script.onload=() => {clearTimeout(timer);window.AMap?.Map?resolve():reject(new Error('高德未返回可用地图，请检查 key 类型与安全密钥'));};
        script.onerror=() => {clearTimeout(timer);reject(new Error('高德脚本加载失败'));};
        script.src=`https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(config.key)}`;
        document.head.append(script);
      });
      if(generation!==mapGeneration) return;
      $('#amap').hidden=false;
      map=new AMap.Map('amap',{viewMode:'2D',zoom:5,center:[108.9,34.3],mapStyle:'amap://styles/whitesmoke',features:['bg','road'],dragEnable:true,scrollWheel:false,showIndoorMap:false});
      await new Promise((resolve,reject) => {
        const timeout=setTimeout(() => reject(new Error('高德底图未完成载入，请检查域名和 key 配置')),18000);
        map.on('complete',() => {clearTimeout(timeout);resolve();});
      });
      if(generation!==mapGeneration) return;
      mapReady=true;mapLoading=false;
      map.on('zoomend',()=>{layoutMapPins();replay?.repaint();});map.on('moveend',()=>replay?.repaint());map.on('mapmove',()=>replay?.repaint());map.on('resize',()=>{layoutMapPins();replay?.repaint();});renderPlaces();
      if(currentPlace) selectPlace(currentPlace,{fly:false,collect:false,fromReplay:true});replay?.repaint();
    } catch(error) {
      if(generation!==mapGeneration) return;
      mapLoading=false;mapReady=false;mapFailure=error.message;
      if(map){map.destroy();map=null;}markers=[];
      renderPlaces();
    }
  }
  function renderYearButtons(target) {
    $(target).innerHTML = `<button data-year="all" aria-pressed="true">全部</button>`+allYears.map(y => `<button data-year="${y}" aria-pressed="false">${y}</button>`).join('')+(target==='#journal-years'?'<button data-year="favorites" aria-pressed="false">♡ 收藏</button>':'');
  }
  function filterJournal() {
    const query=$('#trip-search').value.trim().toLocaleLowerCase();
    const visible=[];
    cardNodes.forEach(card => {
      const a=albums[Number(card.dataset.album)];
      card.hidden=!matchesCompany(a)||!(journalYear==='all'||a.year===journalYear||(journalYear==='favorites'&&a.photos.some(p=>favorites.has(p.src))))||!!query&&!`${a.name} ${a.title} ${a.location} ${a.category} ${a.date} ${a.notes.join(' ')} ${a.photos.map(p=>p.chapter).join(' ')}`.toLocaleLowerCase().includes(query);
      if(!card.hidden)visible.push(a);
    });
    $('#archive-count').textContent=`${visible.length} 本相册 / ${visible.reduce((n,a)=>n+a.photos.length,0)} 张照片`;
    $('#empty-state').hidden=visible.length>0;
    $('#empty-state').textContent=journalYear==='favorites'?'还没有收藏。翻开相册，点一下 ♡，留下喜欢的照片。':'还没有这段回忆。换个关键词试试？';
  }
  function renderAlbums() {
    $('#album-grid').innerHTML=albums.map(a=>`<button class="album-card" data-album="${a.index}" aria-label="打开${esc(a.name)}，${a.photos.length}张照片"><span class="album-cover"><img src="${esc(thumbFor(a.cover))}" alt="${esc(a.name)}" loading="lazy" decoding="async"><span class="album-index">${String(a.index+1).padStart(2,'0')}</span><span class="album-photo-count">${a.photos.length} FRAMES</span></span><span class="album-copy"><span class="album-year">${a.year} / ${esc(a.location)} / ${esc(a.category)}</span><span class="album-title">${esc(a.name)}</span><span class="album-date">${esc(a.date)} <span class="companion-badge ${a.companions==='solo'?'solo':''}">${companyLabel(a)}</span></span></span><span class="album-arrow" aria-hidden="true">↗</span></button>`).join('');
    cardNodes=$$('.album-card');filterJournal();
  }
  function syncBodyLock() { document.body.classList.toggle('dialog-open',$$('dialog').some(d=>d.open)); }
  function openAlbum(a,index=0) {
    if(!a) return;
    stopRoute();currentAlbum=a;photoIndex=Math.max(0,Math.min(index,a.photos.length-1));
    $('#viewer-title').textContent=a.name;$('#viewer-date').textContent=`${a.location} / ${a.date} / ${companyLabel(a)}`;
    $('#viewer-note-text').innerHTML=a.storyHtml || (a.notes.length?a.notes.map(n=>`<p>${esc(n)}</p>`).join(''):'<p>这一页还没有写下手记。</p>');
    $('#viewer-story').hidden=!a.notes.length;
    $('#viewer-notes').open=false;
    $('#viewer-thumbs').innerHTML=a.photos.map((p,i)=>`<button data-photo="${i}" aria-label="第${i+1}张照片" aria-pressed="${i===photoIndex}"><img src="${esc(p.thumb || p.src)}" alt="" loading="lazy" decoding="async"></button>`).join('');
    dialog.showModal();syncBodyLock();showPhoto();
  }
  function openStory(a) {
    if(!a)return;stopRoute();stopSlideshow();storyAlbum=a;
    $('#story-title').textContent=a.name;$('#story-date').textContent=`${a.location} / ${a.date} / ${companyLabel(a)}`;
    $('#story-text').innerHTML=a.storyHtml || a.notes.map(n=>`<p>${esc(n)}</p>`).join('') || '<p>这一页还没有写下手记。</p>';
    $('#story-cover').src=thumbFor(a.cover);$('#story-cover').alt=a.name;
    $('#story-download').href=a.storySource;$('#story-download').download=`${a.name}.md`;
    storyDialog.showModal();syncBodyLock();$('.story-body').scrollTop=0;
  }
  function showPhoto() {
    if(!currentAlbum)return;
    const p=currentAlbum.photos[photoIndex];
    $('#viewer-image').src=p.src;$('#viewer-image').alt=`${currentAlbum.name}，第${photoIndex+1}张照片`;
    $('#viewer-caption').textContent=p.caption || p.chapter || currentAlbum.location;
    $('#viewer-counter').textContent=`${String(photoIndex+1).padStart(2,'0')} / ${String(currentAlbum.photos.length).padStart(2,'0')}`;
    $$('#viewer-thumbs button').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.photo)===photoIndex)));
    const thumbs=$('#viewer-thumbs'),thumb=$(`#viewer-thumbs button[data-photo="${photoIndex}"]`);if(thumb)thumbs.scrollTo({left:thumb.offsetLeft-thumbs.clientWidth/2+thumb.offsetWidth/2,behavior:'instant'});
    const isSaved=favorites.has(p.src);$('#viewer-save').textContent=isSaved?'♥':'♡';$('#viewer-save').setAttribute('aria-pressed',String(isSaved));
    const next=new Image();next.src=currentAlbum.photos[(photoIndex+1)%currentAlbum.photos.length].src;
  }
  function stepPhoto(delta) { photoIndex=(photoIndex+delta+currentAlbum.photos.length)%currentAlbum.photos.length;showPhoto(); }
  function stopSlideshow() { clearInterval(photoTimer);photoTimer=null;$('#viewer-autoplay').textContent='▷';$('#viewer-autoplay').setAttribute('aria-pressed','false'); }
  function closeAlbum() { stopSlideshow();dialog.close();syncBodyLock(); }
  function drawPostcard() {
    stopRoute();
    const pool=companyAlbums();if(!pool.length){toast('当前筛选里没有可抽取的相册。');return;}
    if(rewards&&!rewards.takePostcard())return;
    const choices=pool.length>1?pool.filter(a=>a!==postcardAlbum):pool;
    postcardAlbum=choices[Math.floor(Math.random()*choices.length)];
    const photos=postcardAlbum.photos;
    const candidates=photos.map((p,i)=>({p,i})).filter(v=>!v.p.src.endsWith('/qinggan.webp'));
    postcardPhoto=candidates[Math.floor(Math.random()*candidates.length)]?.i || 0;
    $('#postcard-image').src=photos[postcardPhoto].src;$('#postcard-image').alt=`${postcardAlbum.name}的旅行照片`;
    $('#postcard-place').textContent=postcardAlbum.location;$('#postcard-title').textContent=postcardAlbum.name;
    $('#postcard-note').textContent=postcardAlbum.summary || postcardAlbum.notes[0] || '那天的风和笑容，还藏在照片里。';
    $('#postcard-date').textContent=`寄自 ${postcardAlbum.date} / 第 ${postcardPhoto+1} 张记忆`;
    rewards?.postcard();
    if(!postcardDialog.open)postcardDialog.showModal();syncBodyLock();
  }
  function findAlbumPlace(a) { return places.find(p=>p.keys.includes(a.key)); }
  function init() {
    if(!albums.length){$('#archive-count').textContent='相册数据未载入，请运行 manage.py build。';return;}
    $('#stat-albums').textContent=albums.length;$('#stat-photos').textContent=albums.reduce((n,a)=>n+a.photos.length,0);$('#footer-year').textContent=allYears[0];
    globe=window.createTravelGlobe({getPlaces:eligiblePlaces,getAlbum:p=>p.id===currentPlace?.id&&destinationAlbum?destinationAlbum:eligibleAlbums(p)[0]||p.albums[0],onSelect:p=>selectPlace(p),onManual:stopRoute,thumbFor,reducedMotion,onRepaint:()=>replay?.repaint()});
    renderYearButtons('#map-years');renderYearButtons('#journal-years');renderAlbums();renderPassport();renderPlaces();selectPlace(currentPlace,{fly:false,collect:false});
    $('[data-scope="qinggan"]').hidden=!routePlaces.length;
    replay=window.createJourneyReplay({getPlan:replayPlan,prepare:prepareReplay,project:projectReplay,thumbFor,reducedMotion,sameScene:(a,b)=>scope==='overseas'&&!!globe||a.scope===b.scope,renderSegment:(from,to,t,vehicle)=>{if(scope!=='overseas'||!globe)return false;globe.travel(from,to,reducedMotion?1:t,vehicle);return true;},onStop:()=>globe?.clearTravel()});
    rewards=window.createTravelRewards({syncBodyLock,toast,reducedMotion});
    window.createTravelDarts({places,syncBodyLock,beforeOpen:()=>{stopRoute();stopSlideshow();},reducedMotion});
    quiz=window.createMemoryQuiz({albums,getAlbums:companyAlbums,reward:(source)=>rewards.earn(source),thumbFor,openAlbum,beforeOpen:()=>{stopRoute();stopSlideshow();},syncBodyLock,best:quizBest,saveBest:value=>{if(access.isMember()){quizBest=value;persist();}}});
    connectMap();
  }
  $$('.company-tabs').forEach(tabs=>tabs.addEventListener('click',e=>{
    const b=e.target.closest('[data-company]');if(!b)return;stopRoute();company=b.dataset.company;
    $$('[data-company]').forEach(v=>v.setAttribute('aria-pressed',String(v.dataset.company===company)));
    stampPage=0;renderPassport();filterJournal();setScope(scope);
  }));
  $('.scope-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-scope]');if(b)setScope(b.dataset.scope);});
  $('#place-index-list').addEventListener('click',e=>{const b=e.target.closest('[data-index-place]');if(b)selectPlace(eligiblePlaces().find(p=>p.id===b.dataset.indexPlace));});
  $('#star-pins').addEventListener('click',e=>{const b=e.target.closest('[data-place]');if(b)selectPlace(eligiblePlaces().find(p=>p.id===b.dataset.place));});
  $('#place-albums').addEventListener('click',e=>{const b=e.target.closest('[data-place-album]');if(b)selectPlace(currentPlace,{fly:false,album:albums[Number(b.dataset.placeAlbum)]});});
  $('#destination-story').addEventListener('click',()=>openStory(destinationAlbum));
  $('#viewer-story').addEventListener('click',()=>openStory(currentAlbum));
  $('#story-close').addEventListener('click',()=>{storyDialog.close();syncBodyLock();});
  $('#story-photos').addEventListener('click',()=>{storyDialog.close();if(!dialog.open)openAlbum(storyAlbum);else if(currentAlbum!==storyAlbum){closeAlbum();openAlbum(storyAlbum);}syncBodyLock();});
  $('#destination-open').addEventListener('click',()=>{if(destinationAlbum)openAlbum(destinationAlbum,currentPlace?.photoIndex || 0);});
  $('#map-reset').addEventListener('click',()=>{stopRoute();resetMapView();});
  $('#zoom-in').addEventListener('click',()=>map?.zoomIn());$('#zoom-out').addEventListener('click',()=>map?.zoomOut());
  $('#map-years').addEventListener('click',e=>{
    const b=e.target.closest('[data-year]');if(!b)return;stopRoute();mapYear=b.dataset.year;
    $$('#map-years button').forEach(v=>v.setAttribute('aria-pressed',String(v===b)));
    const visible=eligiblePlaces();if(!visible.some(p=>p.id===currentPlace?.id))currentPlace=visible[0] || null;
    renderPlaces();if(currentPlace){$('#destination-open').disabled=false;selectPlace(currentPlace,{fly:false,collect:false});}else clearDestination();replay?.refresh();
  });
  $('#stamp-book').addEventListener('click',e=>{const b=e.target.closest('[data-stamp]');if(!b)return;const p=places.find(p=>p.id===b.dataset.stamp);mapYear='all';setScope(p.scope,true);selectPlace(p);});
  $('#stamp-limit').addEventListener('change',e=>{stampLimit=e.target.value;stampPage=0;renderPassport();});
  $('#stamp-prev').addEventListener('click',()=>{stampPage--;renderPassport();});
  $('#stamp-next').addEventListener('click',()=>{stampPage++;renderPassport();});
  $('#passport-reset').addEventListener('click',()=>{if(!access.requireMember())return;stamps.clear();persist();renderPassport();toast('印章册已翻到新的一页。');});
  $$('.random-trigger').forEach(b=>b.addEventListener('click',drawPostcard));
  $('#postcard-another').addEventListener('click',drawPostcard);
  $('#postcard-close').addEventListener('click',()=>{postcardDialog.close();syncBodyLock();});
  $('#postcard-album').addEventListener('click',()=>{postcardDialog.close();const p=findAlbumPlace(postcardAlbum);if(p)collectStamp(p);openAlbum(postcardAlbum,postcardPhoto);});
  $('#journal-years').addEventListener('click',e=>{const b=e.target.closest('[data-year]');if(!b)return;journalYear=b.dataset.year;$$('#journal-years button').forEach(v=>v.setAttribute('aria-pressed',String(v===b)));filterJournal();});
  $('#trip-search').addEventListener('input',filterJournal);
  $('#album-grid').addEventListener('click',e=>{const b=e.target.closest('[data-album]');if(b){const a=albums[Number(b.dataset.album)];const p=findAlbumPlace(a);if(p)collectStamp(p);openAlbum(a,journalYear==='favorites'?Math.max(0,a.photos.findIndex(p=>favorites.has(p.src))):0);}});
  $('#viewer-close').addEventListener('click',closeAlbum);$('#viewer-prev').addEventListener('click',()=>stepPhoto(-1));$('#viewer-next').addEventListener('click',()=>stepPhoto(1));
  $('#viewer-thumbs').addEventListener('click',e=>{const b=e.target.closest('[data-photo]');if(b){photoIndex=Number(b.dataset.photo);showPhoto();}});
  $('#viewer-save').addEventListener('click',()=>{if(!access.requireMember('登录后，才能把照片收藏进自己的记忆。'))return;const src=currentAlbum.photos[photoIndex].src;if(favorites.has(src)){favorites.delete(src);toast('已移出收藏。');}else{favorites.add(src);toast('这张回忆，收藏好了。');}persist();showPhoto();filterJournal();});
  $('#viewer-autoplay').addEventListener('click',()=>{if(photoTimer){stopSlideshow();return;}photoTimer=setInterval(()=>stepPhoto(1),3500);$('#viewer-autoplay').textContent='Ⅱ';$('#viewer-autoplay').setAttribute('aria-pressed','true');});
  dialog.addEventListener('close',()=>{stopSlideshow();syncBodyLock();});
  $$('dialog:not(#ticket-dialog)').forEach(d=>{d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();});d.addEventListener('close',syncBodyLock);});
  $('#viewer-image').addEventListener('touchstart',e=>{swipeStart=e.changedTouches[0]?.clientX ?? null;},{passive:true});
  $('#viewer-image').addEventListener('touchend',e=>{if(swipeStart===null)return;const dx=e.changedTouches[0].clientX-swipeStart;swipeStart=null;if(Math.abs(dx)>50)stepPhoto(dx<0?1:-1);},{passive:true});
  $('#map-settings').addEventListener('click',()=>{$('#settings-key').value=config.key || '';$('#settings-code').value=config.securityJsCode || '';settingsDialog.showModal();syncBodyLock();});
  $('#settings-close').addEventListener('click',()=>{settingsDialog.close();syncBodyLock();});
  $('#settings-form').addEventListener('submit',e=>{e.preventDefault();if(mapLoading){toast('地图正在连接，请稍候。');return;}config.key=$('#settings-key').value.trim();config.securityJsCode=$('#settings-code').value.trim();config.serviceHost='';settingsDialog.close();syncBodyLock();connectMap();});
  document.addEventListener('keydown',e=>{
    if(e.key==='/'&&!$$('dialog').some(d=>d.open)&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();$('#trip-search').focus();}
    if(dialog.open&&!$$('dialog').some(d=>d!==dialog&&d.open)){if(e.key==='ArrowRight'){e.preventDefault();stepPhoto(1);}if(e.key==='ArrowLeft'){e.preventDefault();stepPhoto(-1);}}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden){replay?.pause();stopSlideshow();}});
  addEventListener('qunqing:access-change',()=>{const record=readSaved();stamps.clear();favorites.clear();(record.stamps||[]).forEach(id=>stamps.add(id));(record.favorites||[]).forEach(src=>favorites.add(src));quizBest=readBest(record);legacyQuizBest=record.quizRules===QUIZ_RULES?record.legacyQuizBest:record.quizBest;quiz?.setBest(quizBest);stampPage=0;renderPassport();filterJournal();if(currentAlbum)showPhoto();if(access.isMember())toast('玩法记录已同步，可以继续收集了。');});
  init();
  const showEarth=()=>{if(location.hash==='#earth')setScope('overseas',true);};
  window.addEventListener('hashchange',showEarth);showEarth();
})();
