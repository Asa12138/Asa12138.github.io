/* Domestic destination lottery + live POI discovery through the existing JS API. */
window.createTravelDarts = ({places,syncBodyLock,beforeOpen,reducedMotion}) => {
  const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dialog=$('#darts-dialog'),svg=$('#dart-map');let features=[],cities=[],projection=null,current=null,pois=[],generation=0,loading=null,throwing=false,throwTimer=0;
  const STORE='qunqing-next-departure-v1';let saved={};try{saved=JSON.parse(localStorage.getItem(STORE))||{};}catch{}
  $('#dart-origin').value=typeof saved.origin==='string'?saved.origin.slice(0,40):'';$('#dart-date').value=typeof saved.date==='string'?saved.date:'';
  const search=(query)=>`https://www.baidu.com/s?wd=${encodeURIComponent(query)}`;
  const amap=(keyword,city)=>`https://uri.amap.com/search?${new URLSearchParams({keyword,city,view:'map'})}`;
  const link=(title,url)=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(title)} ↗</a>`;
  const nameKey=name=>name.split(' · ')[0].replace(/(?:特别行政区|地区|市|盟)$/u,'');
  const available=()=>{const region=$('#dart-region-filter').value,query=$('#dart-query').value.trim();return cities.filter(c=>($('#dart-pool').value!=='new'||!c.visited)&&(region==='all'||c.region===region)&&(!query||`${c.name} ${c.region}`.includes(query)));};
  function updatePool(){const pool=available();$('#dart-map-status').textContent=`${cities.length} 个国内目的地 · 当前可掷向 ${pool.length} 个`;$('#dart-throw').disabled=throwing||!pool.length;$('#dart-city-options').innerHTML=pool.slice(0,60).map(c=>`<button data-dart-city="${esc(c.name)}">${esc(c.name)}${c.visited?' ♡':''}</button>`).join('');$('#dart-choice-count').textContent=pool.length>60?'先显示 60 个，填写地名或选择省份可以缩小范围。':`${pool.length} 个目的地 · 点一个，直接出发。`;}
  function persist(){try{localStorage.setItem(STORE,JSON.stringify({origin:$('#dart-origin').value.trim(),date:$('#dart-date').value,city:current?.name}));}catch{}}
  function normalize(f){const geometry=JSON.parse(JSON.stringify(f.geometry));if(geometry.type==='MultiPolygon')geometry.coordinates=geometry.coordinates.map(poly=>d3.geoArea({type:'Polygon',coordinates:poly})>Math.PI*2?poly.map(r=>r.reverse()):poly);else if(geometry.type==='Polygon'&&d3.geoArea({type:'Polygon',coordinates:geometry.coordinates})>Math.PI*2)geometry.coordinates=geometry.coordinates.map(r=>r.reverse());return {...f,geometry};}
  async function load(){
    if(loading)return loading;
    loading=(async()=>{
      const [mapResponse,cityResponse]=await Promise.all([fetch('data/china-provinces.json'),fetch('data/china-destinations.json')]);if(!mapResponse.ok||!cityResponse.ok)throw new Error('地图暂未加载');const data=await mapResponse.json();features=data.features.map(normalize);
      cities=(await cityResponse.json()).map(c=>({...c,visited:places.some(p=>p.scope==='china'&&nameKey(p.name)===nameKey(c.name))}));
      places.filter(p=>p.scope==='china').forEach(p=>{const name=p.name.split(' · ')[0];if(!cities.some(c=>nameKey(c.name)===nameKey(name)))cities.push({name,region:'相册里的其他足迹',coords:p.coords,visited:true});});
      $('#dart-region-filter').innerHTML='<option value="all">所有省份 / 地区</option>'+[...new Set(cities.map(c=>c.region))].sort((a,b)=>a.localeCompare(b,'zh-CN')).map(r=>`<option value="${esc(r)}">${esc(r)}</option>`).join('');
      projection=d3.geoMercator().fitExtent([[28,18],[672,490]],{type:'FeatureCollection',features});const path=d3.geoPath(projection);
      $('#dart-provinces').innerHTML=features.map(f=>`<path d="${path(f)||''}"${f.properties.name?`><title>${esc(f.properties.name)}</title></path>`:' class="dart-islands"/>'}`).join('');
      $('#dart-cities').innerHTML=cities.map(c=>{const [x,y]=projection(c.coords);return `<circle cx="${x}" cy="${y}" r="${c.visited?3.3:1.45}" class="${c.visited?'visited':''}"><title>${esc(c.name)}</title></circle>`;}).join('');
      updatePool();
      if(typeof saved.city==='string'){const c=cities.find(c=>c.name===saved.city);if(c){current=c;placeTarget(c);renderPlan(false);}}
    })().catch(()=>{$('#dart-map-status').textContent='地图暂未载入，关闭后重新打开可以重试。';loading=null;});return loading;
  }
  function placeTarget(city){if(!projection)return;const [x,y]=projection(city.coords);$('#dart-target').removeAttribute('hidden');$('#dart-target').setAttribute('transform',`translate(${x},${y})`);$('#dart-target-label').textContent=city.name;}
  function renderPlan(lookup=true){
    if(!current||throwing)return;const city=current.name,origin=$('#dart-origin').value.trim(),date=$('#dart-date').value,route=origin?`${origin} 到 ${city}`:`${city} 交通`,when=date?` ${date}`:'';
    $('#dart-city').textContent=city;$('#dart-region').textContent=`${current.region} · ${current.visited?'重访一段旧故事':'一张新的旅行章节'}`;
    $('#dart-transport').innerHTML=link('🚄 查高铁 / 火车路线',search(`${route}${when} 高铁 火车`))+link('✈ 查航班',search(`${route}${when} 航班`))+link('🚗 查自驾路线',search(`${route} 自驾 路线`))+link('12306 · 班次与余票','https://www.12306.cn/index/')+link('携程 · 航班与票价','https://flights.ctrip.com/');
    $('#dart-scenic-links').innerHTML=link('在高德看景点',amap('风景名胜',city))+link('找一份旅行攻略',search(`${city} 旅游 景点 攻略`));$('#dart-save').disabled=false;persist();if(lookup)lookupPOIs();
  }
  async function lookupPOIs(){
    const token=++generation,city=current.name;pois=[];$('#dart-arrivals').innerHTML='';$('#dart-pois').innerHTML='';$('#dart-poi-status').textContent='正在高德查找景点…';
    const fallback=()=>{if(token===generation)$('#dart-poi-status').textContent='暂时没查到景点，可打开下方高德或攻略入口继续探索。';};
    if(!window.AMap?.plugin){fallback();return;}
    // Bound each search. Old responses cannot replace a newer dart destination.
    const timeout=setTimeout(fallback,10000);
    try{AMap.plugin('AMap.PlaceSearch',()=>{
      if(token!==generation){clearTimeout(timeout);return;}
      lookupArrivals(token,city);
      const service=new AMap.PlaceSearch({city,citylimit:true,type:'风景名胜',pageSize:6,pageIndex:1});
      service.search('景点',(status,result)=>{
        clearTimeout(timeout);if(token!==generation)return;
        if(status!=='complete'||!result?.poiList?.pois?.length){fallback();return;}
        pois=result.poiList.pois;$('#dart-poi-status').textContent=`高德景点查询 · ${new Date().toLocaleDateString('zh-CN')} · 可点开查看详情`;
        $('#dart-pois').innerHTML=pois.map(p=>`<a href="${esc(amap(p.name,city))}" target="_blank" rel="noopener noreferrer"><span>${esc(p.name)} ↗</span><small>${esc([p.pname,p.cityname,p.adname,p.address].filter(Boolean).join(' '))}</small></a>`).join('');
      });
    });}catch{clearTimeout(timeout);fallback();}
  }
  function lookupArrivals(token,city){
    $('#dart-arrivals').innerHTML='<div id="dart-stations">正在查铁路车站…</div><div id="dart-airports">正在查机场…</div>';
    [['火车站','火车站','#dart-stations','铁路车站'],['机场','飞机场','#dart-airports','机场地点']].forEach(([keyword,type,selector,label])=>{
      const target=$(selector),fallback=()=>{if(token===generation&&target.isConnected)target.textContent=`${label}：暂未取得结果，可通过路线入口查询邻近站点。`;};
      const timeout=setTimeout(fallback,10000);
      try{new AMap.PlaceSearch({city,citylimit:true,type,pageSize:2,pageIndex:1}).search(keyword,(status,result)=>{
        clearTimeout(timeout);if(token!==generation||!target.isConnected)return;
        const found=status==='complete'?result?.poiList?.pois||[]:[];
        if(!found.length){fallback();return;}
        target.innerHTML=`<small>${label} · 高德查询</small>`+found.map(p=>link(p.name,amap(p.name,city))).join('');
      });}catch{clearTimeout(timeout);fallback();}
    });
  }
  function throwTo(target){
    if(throwing||!target)return;throwing=true;$('#dart-throw').disabled=true;generation++;$('#dart-arrivals').innerHTML='';$('#dart-pois').innerHTML='';pois=[];
    $('#dart-city').textContent='飞镖飞行中…';$('#dart-region').textContent='把下一站，交给一点点运气。';$('#dart-transport').innerHTML='';$('#dart-scenic-links').innerHTML='';$('#dart-save').disabled=true;$('#dart-poi-status').textContent='落点揭晓后，查询景点。';
    placeTarget(target);$('#dart-target').classList.remove('dart-landing');void svg.getBoundingClientRect();$('#dart-target').classList.add('dart-landing');
    $('#dart-target-label').textContent='';throwTimer=setTimeout(()=>{throwing=false;current=target;updatePool();placeTarget(current);renderPlan();},reducedMotion?0:850);
  }
  $('#darts-start').addEventListener('click',()=>{beforeOpen();if(!dialog.open)dialog.showModal();syncBodyLock();load().then(()=>{if(current&&dialog.open)renderPlan();});});
  $('#darts-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{generation++;clearTimeout(throwTimer);throwing=false;updatePool();if(current){placeTarget(current);renderPlan(false);}else{$('#dart-target').setAttribute('hidden','');$('#dart-city').textContent='目的地待揭晓';}syncBodyLock();});
  $('#dart-throw').addEventListener('click',()=>{const pool=available().filter(c=>c!==current);throwTo(pool[Math.floor(Math.random()*pool.length)]||available()[0]);});
  $('#dart-pool').addEventListener('change',updatePool);$('#dart-region-filter').addEventListener('change',updatePool);$('#dart-query').addEventListener('input',updatePool);
  $('#dart-city-options').addEventListener('click',e=>{const b=e.target.closest('[data-dart-city]');if(b)throwTo(available().find(c=>c.name===b.dataset.dartCity));});
  svg.addEventListener('click',e=>{if(!projection||throwing)return;const r=svg.getBoundingClientRect(),scale=Math.min(r.width/700,r.height/530),point=[(e.clientX-r.left-(r.width-700*scale)/2)/scale,(e.clientY-r.top-(r.height-530*scale)/2)/scale],coords=projection.invert(point);if(!features.some(f=>f.properties.name&&d3.geoContains(f,coords)))return;const nearest=available().reduce((best,c)=>!best||d3.geoDistance(c.coords,coords)<d3.geoDistance(best.coords,coords)?c:best,null);throwTo(nearest);});
  $('#dart-origin').addEventListener('input',()=>{persist();renderPlan(false);});$('#dart-date').addEventListener('change',()=>{persist();renderPlan(false);});
  $('#dart-save').addEventListener('click',()=>{
    if(!current||throwing)return;const text=`# 下一站：${current.name}\n\n出发地：${$('#dart-origin').value.trim()||'待定'}\n日期：${$('#dart-date').value||'待定'}\n目的地：${current.region} · ${current.name}\n\n## 交通与景点查询\n\n${[...document.querySelectorAll('#dart-arrivals a,#dart-transport a,#dart-scenic-links a')].map(a=>`- [${a.textContent}](${a.href})`).join('\n')}\n\n## 高德景点查询\n\n${pois.length?pois.map(p=>`- ${p.name}：${p.address||'地址请在高德查看'}`).join('\n'):'未获得景点列表，请使用上方查询入口。'}\n\n交通班次、价格和景点开放信息以查询时的结果为准。\n`;
    const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`下一站-${current.name}.md`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
};
