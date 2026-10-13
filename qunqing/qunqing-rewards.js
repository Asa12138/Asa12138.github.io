/* Personal play rewards, persistent redemption ledger and upright wheel labels. */
window.createTravelRewards = ({syncBodyLock,toast,reducedMotion}) => {
  const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const access=window.TravelAccess,STORE='qunqing-play-rewards-v1';
  const load=()=>{const raw=access.saved(STORE);return {tickets:Number.isSafeInteger(raw.tickets)&&raw.tickets>=0?raw.tickets:0,draws:Number.isSafeInteger(raw.draws)&&raw.draws>=0?raw.draws:0,packingDay:typeof raw.packingDay==='string'?raw.packingDay:'',ticketSources:Array.isArray(raw.ticketSources)?raw.ticketSources:[],history:Array.isArray(raw.history)?raw.history.filter(v=>v&&typeof v.prize==='string').map((v,i)=>({...v,id:v.id||`legacy-${i}-${v.date}`,at:v.at||v.date,redeemed:v.redeemed===true,redeemedAt:v.redeemedAt||null})):[]};};
  let state=load(),filter='all',page=0;
  const prizes=['吃火锅','吃日料','吃烤肉','喝早茶','甜品约会','披萨之夜','海鲜大餐','你来选餐厅'];
  const wheel=$('#food-wheel'),dialog=$('#reward-dialog'),ticket=$('#ticket-dialog');let rotation=0,spinning=false,spinTimer=0,noticeFrame=0;
  const notices=[],QUOTA='qunqing-postcard-quota-v1',POSTCARD_LIMIT=10;
  const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(p=>['year','month','day'].includes(p.type)).sort((a,b)=>['year','month','day'].indexOf(a.type)-['year','month','day'].indexOf(b.type)).map(p=>p.value).join('-');
  let quotaMemory={day:day(),count:0},quotaStorage=true;
  const persist=()=>access.write(STORE,state);
  const when=at=>{const d=new Date(at);return Number.isNaN(d.getTime())?String(at||'日期未记录'):d.toLocaleString('zh-CN',{hour12:false});};
  const visibleHistory=()=>state.history.filter(v=>filter==='all'||(filter==='redeemed'?v.redeemed:!v.redeemed));
  function render(){
    const member=access.isMember();$('#reward-ticket-count').textContent=state.tickets;$('#reward-balance').textContent=member?`口袋里有 ${state.tickets} 张幸运券`:'游客浏览模式 · 登录后才能获得和使用幸运券';
    $('#reward-spin').disabled=spinning||!member||state.tickets<1;$('#reward-login').hidden=member;
    $('#reward-spin').textContent=spinning?'转呀转，快乐马上到…':!member?'登录后解锁美食转盘':state.tickets?'使用 1 张幸运券 · 开转 ✳':'先玩小游戏，收集幸运券';
    const entries=visibleHistory(),pages=Math.max(1,Math.ceil(entries.length/10));page=Math.min(page,pages-1);
    $('#reward-ledger-summary').textContent=`${state.history.length} 次抽奖 / ${state.history.filter(v=>!v.redeemed).length} 份待兑现`;
    $('#reward-history').innerHTML=entries.length?entries.slice(page*10,page*10+10).map(v=>`<li class="ledger-entry${v.redeemed?' redeemed':''}"><div><strong>${esc(v.prize)}</strong><small>抽到于 ${esc(when(v.at))}</small><small>来自 ${esc(v.source||'美食幸运券')}</small>${v.redeemed?`<small>兑现于 ${esc(when(v.redeemedAt))}</small>`:''}</div><button data-redeem="${esc(v.id)}" aria-label="${v.redeemed?'撤销':'标记'}${esc(v.prize)}已兑现">${v.redeemed?'✓ 已兑现 · 撤销':'标记已兑现'}</button></li>`).join(''):`<li class="ledger-empty">${!member?'登录后查看自己的美食兑奖簿。':filter==='all'?'第一顿快乐，还在路上。':'这里暂时没有记录。'}</li>`;
    $('#reward-ledger-pages').hidden=pages<=1;$('#reward-ledger-page').textContent=`${page+1} / ${pages}`;$('#reward-ledger-prev').disabled=page===0;$('#reward-ledger-next').disabled=page===pages-1;$('#reward-export').disabled=!member||!state.history.length;
    document.querySelectorAll('[data-ledger-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ledgerFilter===filter)));
  }
  // Open after the game's own modal/render finishes, above it in the native top layer.
  // Each notice stays until dismissed; a later award never replaces an unread one.
  function showNextNotice(){
    if(ticket.open||noticeFrame||!notices.length)return;
    noticeFrame=requestAnimationFrame(()=>{noticeFrame=requestAnimationFrame(()=>{
      noticeFrame=0;if(ticket.open||!notices.length)return;
      const notice=notices.shift(),earned=notice.kind==='earned',guest=notice.kind==='guest';
      ticket.dataset.kind=notice.kind;$('#ticket-title').textContent=notice.title;$('#ticket-source').textContent=notice.source;
      $('#ticket-prize').textContent=notice.prize;$('#ticket-caption').textContent=notice.caption;
      $('#ticket-wallet').textContent=notice.wallet||'';$('#ticket-login').hidden=!guest;
      $('#ticket-spin').hidden=!access.isMember()||state.tickets<1;$('#ticket-later').textContent=earned?'收好了，继续玩 →':'知道了 →';
      ticket.showModal();syncBodyLock();
    });});
  }
  function notify(notice){notices.push(notice);showNextNotice();}
  function earn(source){
    if(!access.isMember()){notify({kind:'guest',title:'挑战成功！登录后可以领奖。',source,prize:'本次未发放幸运券',caption:'游客试玩 · 登录后重新挑战',wallet:'用口令登录，就能收集属于你的美食约定。'});return false;}
    state.tickets++;state.ticketSources.push({source,at:new Date().toISOString()});persist();render();
    notify({kind:'earned',title:'叮！获得 1 张幸运券！',source,prize:'+1 次美食转盘',caption:'幸运券已放进口袋',wallet:`现在口袋里共有 ${state.tickets} 张幸运券。`});return true;
  }
  function open(){render();if(!spinning)$('#reward-result').textContent=state.history.length?`上一次的美食约定：${state.history[0].prize}`:'每一张幸运券，都值得一顿好好吃的。';if(!dialog.open)dialog.showModal();syncBodyLock();}
  function closeTicket(){$('#ticket-dialog').close();syncBodyLock();}
  $('#ticket-close').addEventListener('click',closeTicket);$('#ticket-later').addEventListener('click',closeTicket);$('#ticket-spin').addEventListener('click',()=>{closeTicket();open();});
  $('#ticket-login').addEventListener('click',()=>{closeTicket();access.open('登录后重新挑战，就能获得幸运券。');});
  ticket.addEventListener('close',()=>{syncBodyLock();showNextNotice();});
  prizes.forEach((name,i)=>{const label=document.createElement('span'),text=document.createElement('b');text.textContent=name;label.style.setProperty('--slice',i);label.append(text);wheel.append(label);});
  document.querySelectorAll('.reward-open').forEach(b=>b.addEventListener('click',open));$('#reward-close').addEventListener('click',()=>{dialog.close();syncBodyLock();});
  $('#reward-spin').addEventListener('click',()=>{
    if(!access.requireMember('登录后，才能用幸运券转出一份美食约定。')||spinning||state.tickets<1)return;spinning=true;
    const index=Math.floor(Math.random()*prizes.length),at=new Date().toISOString(),source=state.ticketSources.shift()?.source||'美食幸运券';
    state.tickets--;state.history.unshift({id:crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`,prize:prizes[index],at,source,redeemed:false,redeemedAt:null});filter='all';page=0;persist();render();
    $('#reward-result').textContent='正在揭晓今晚的快乐…';rotation+=2160+((360-index*45-rotation%360)%360);
    const transition=reducedMotion?'none':'transform 4.8s cubic-bezier(.12,.72,.08,1)';wheel.style.transition=transition;wheel.style.transform=`rotate(${rotation}deg)`;
    // Labels move with their sectors while the inner text counter-rotates.
    wheel.querySelectorAll('span>b').forEach(b=>{b.style.transition=transition;b.style.transform=`rotate(${-rotation}deg)`;});
    spinTimer=setTimeout(()=>{spinning=false;render();$('#reward-result').textContent=`✳ ${prizes[index]}！这份约定已记入兑奖簿，吃过后记得标记已兑现。`;},reducedMotion?0:4850);
  });
  $('#reward-ledger-filters').addEventListener('click',e=>{const b=e.target.closest('[data-ledger-filter]');if(b){filter=b.dataset.ledgerFilter;page=0;render();}});
  $('#reward-ledger-prev').addEventListener('click',()=>{page--;render();});$('#reward-ledger-next').addEventListener('click',()=>{page++;render();});
  $('#reward-history').addEventListener('click',e=>{const b=e.target.closest('[data-redeem]');if(!b||!access.requireMember('登录后才可以修改兑奖记录。'))return;const record=state.history.find(v=>v.id===b.dataset.redeem);if(!record)return;record.redeemed=!record.redeemed;record.redeemedAt=record.redeemed?new Date().toISOString():null;persist();render();toast(record.redeemed?'这份美食约定，已经兑现啦。':'已恢复为未兑现。');});
  $('#reward-export').addEventListener('click',()=>{if(!access.requireMember()||!state.history.length)return;const url=URL.createObjectURL(new Blob([JSON.stringify({exportedAt:new Date().toISOString(),records:state.history},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='群青-美食兑奖簿.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  function readQuota(){
    let raw=quotaMemory;if(quotaStorage)try{raw=JSON.parse(localStorage.getItem(QUOTA))||{day:day(),count:0};}catch{quotaStorage=false;}
    quotaMemory={day:day(),count:raw.day===day()&&Number.isInteger(raw.count)?Math.max(0,Math.min(POSTCARD_LIMIT,raw.count)):0};return quotaMemory;
  }
  function renderQuota(){
    const remaining=POSTCARD_LIMIT-readQuota().count,exhausted=remaining===0;
    $('#postcard-quota').textContent=exhausted?'今日 10 次已抽完 · 明天再见':'今日还可抽 '+remaining+' / 10 次';
    $('#postcard-limit-status').textContent=exhausted?'今天的 10 次盲盒已抽完。北京时间 00:00 更新次数。':`今日剩余 ${remaining} 次 · 每天限抽 10 次`;
    document.querySelectorAll('.random-trigger,#postcard-another').forEach(b=>{b.disabled=exhausted;b.title=exhausted?'今天已抽满 10 次，明天再来。':`今日还可抽 ${remaining} 次`;});
  }
  function takePostcard(){
    const quota=readQuota();
    if(quota.count>=POSTCARD_LIMIT){renderQuota();notify({kind:'limit',title:'今天的回忆盲盒，已抽完。',source:'每天最多抽 10 次',prize:'明天再寄一张回忆',caption:'北京时间 00:00 更新次数'});return false;}
    quota.count++;try{localStorage.setItem(QUOTA,JSON.stringify(quota));}catch{quotaStorage=false;}renderQuota();return true;
  }
  function postcard(){
    $('#postcard-luck').classList.remove('reward-earned');
    if(!access.isMember()){$('#postcard-luck').textContent='游客预览 · 本次计入每日 10 次额度，暂不参与幸运券抽奖。登录后重新抽取，可遇见彩蛋。';$('#postcard-reward').hidden=true;return;}
    state.draws++;const won=state.draws>=3&&Math.random()<.03;if(won)earn('明信片里藏着一张幸运券');else persist();
    $('#postcard-luck').textContent=won?`✳ 第 ${state.draws} 张明信片，藏着 1 张美食幸运券！`:`已寄出 ${state.draws} 张回忆 · 从第 3 张起，每次有 3% 概率掉落幸运券。`;$('#postcard-reward').hidden=!won;
    $('#postcard-luck').classList.toggle('reward-earned',won);
  }
  // A timed memory puzzle: every run starts with an explicit user action.
  const items=[['📷','相机'],['🔌','充电器'],['🪪','证件'],['🧴','防晒霜'],['☂','雨伞'],['🕶','墨镜'],['👟','运动鞋'],['🧥','外套'],['🎧','耳机'],['🧻','纸巾'],['💊','常备药'],['🥤','水杯']];
  const packing=$('#packing-dialog');let phase='idle',targets=[],choices=[],selected=new Set(),deadline=0,timer=0;
  const shuffle=list=>{const result=[...list];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;};
  function stop(){clearInterval(timer);timer=0;if(phase==='memory'||phase==='choose')phase='idle';}
  function choose(){
    phase='choose';deadline+=10000;$('#packing-list').innerHTML='<span>清单合上了。凭记忆，把那 5 件物品放进行李。</span>';
    $('#packing-submit').disabled=false;document.querySelectorAll('#packing-items button').forEach(b=>b.disabled=false);tick();
  }
  function tick(){
    if(phase!=='memory'&&phase!=='choose')return;
    const seconds=Math.max(0,Math.ceil((deadline-Date.now())/1000));
    $('#packing-status').textContent=phase==='memory'?`还有 ${seconds} 秒，记住这 5 件物品。`:`还有 ${seconds} 秒 · 已装 ${selected.size} / 5 件`;
    if(seconds===0){if(phase==='memory')choose();else finish(true);}
  }
  function startPacking(){
    stop();phase='memory';selected=new Set();targets=shuffle(items).slice(0,5);choices=shuffle([...targets,...shuffle(items.filter(v=>!targets.includes(v))).slice(0,4)]);
    $('#packing-status').classList.remove('reward-earned');
    $('#packing-list').innerHTML=targets.map(v=>`<span>${v[0]} ${v[1]}</span>`).join('');
    $('#packing-items').innerHTML=choices.map((v,i)=>`<button data-pack="${i}" aria-pressed="false" disabled><span>${v[0]}</span>${v[1]}</button>`).join('');
    $('#packing-submit').disabled=true;$('#packing-again').hidden=true;$('#packing-reward').hidden=true;deadline=Date.now()+3000;tick();timer=setInterval(tick,50);
    if(!packing.open)packing.showModal();syncBodyLock();
  }
  function finish(timeout=false){
    if(phase!=='choose')return;clearInterval(timer);timer=0;phase='result';$('#packing-submit').disabled=true;$('#packing-again').hidden=false;
    timeout=timeout||Date.now()>=deadline;
    const correct=!timeout&&selected.size===targets.length&&[...selected].every(i=>targets.includes(choices[i]));
    document.querySelectorAll('#packing-items button').forEach(b=>{b.disabled=true;b.classList.toggle('pack-correct',targets.includes(choices[Number(b.dataset.pack)]));});
    $('#packing-list').innerHTML=targets.map(v=>`<span>${v[0]} ${v[1]}</span>`).join('');
    let message=timeout?'时间到了！看看清单，再来一次。':correct?'行李齐了，现在可以出发！':'有东西忘了，或多带了。再看一遍清单吧。';
    let earned=false;
    if(correct){
      if(!access.isMember()){earn('收行李挑战成功');message+=' 游客试玩不发奖；登录后重新挑战可获得幸运券。';}
      else if(state.packingDay.split('-').map(v=>v.padStart(2,'0')).join('-')!==day()){state.packingDay=day();earned=earn('今天首次收好行李');message+=' ✳ 获得 1 张幸运券！已放进口袋。';}
      else{message+=' 今天的通关奖励已经领取，明天再来。';notify({kind:'claimed',title:'行李收齐了！今天已领过奖。',source:'收行李 · 每天首次通关奖励 1 张券',prize:'明天还可以再赢一次',caption:'本次未重复发券',wallet:`口袋里还有 ${state.tickets} 张幸运券。`});}
      $('#packing-reward').hidden=!access.isMember()||state.tickets<1;
    }
    $('#packing-status').classList.toggle('reward-earned',earned);
    $('#packing-status').textContent=message;
  }
  $('#packing-start').addEventListener('click',startPacking);$('#packing-again').addEventListener('click',startPacking);
  $('#packing-items').addEventListener('click',e=>{const b=e.target.closest('[data-pack]');if(!b||phase!=='choose')return;if(Date.now()>=deadline){finish(true);return;}const i=Number(b.dataset.pack);if(selected.has(i))selected.delete(i);else{if(selected.size>=5){toast('行李清单只有 5 件，先取出一件再装。');return;}selected.add(i);}b.setAttribute('aria-pressed',String(selected.has(i)));tick();});
  $('#packing-submit').addEventListener('click',()=>finish());$('#packing-close').addEventListener('click',()=>packing.close());packing.addEventListener('close',()=>{stop();syncBodyLock();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&packing.open&&(phase==='memory'||phase==='choose')){stop();$('#packing-status').textContent='这次收行李暂停了。准备好后，再来一次。';$('#packing-again').hidden=false;$('#packing-submit').disabled=true;}});
  addEventListener('qunqing:access-change',()=>{clearTimeout(spinTimer);cancelAnimationFrame(noticeFrame);noticeFrame=0;notices.length=0;spinning=false;rotation=0;wheel.style.transition='none';wheel.style.transform='rotate(0deg)';wheel.querySelectorAll('span>b').forEach(b=>{b.style.transition='none';b.style.transform='rotate(0deg)';});stop();packing.close();ticket.close();state=load();filter='all';page=0;render();renderQuota();$('#reward-result').textContent=access.isMember()?'小幸运，从这里重新开始。':'登录后开启美食约定。';syncBodyLock();});
  addEventListener('storage',e=>{if(e.key===QUOTA||e.key===null)renderQuota();});
  addEventListener('focus',renderQuota);document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderQuota();});
  setInterval(()=>{if(!document.hidden)renderQuota();},60000);
  render();renderQuota();return {earn,postcard,takePostcard,open};
};
