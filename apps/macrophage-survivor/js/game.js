(function () {
  'use strict';
  var D=window.ImmuneData, R=window.ImmuneRender, A=window.ImmuneAudio, B=window.XhsBridge;
  var P=window.PatrolProfile,Q=window.PatrolRules,Art=window.PatrolArt;
  var C=window.Campaign, CP=window.PatrolCheckpoint, Tiers=window.DisplayTier;
  var mode='campaign',stage=1,loaded=false,discovery=null;
  var W=360,H=640,TAU=Math.PI*2;
  function el(id){return document.getElementById(id);}
  function clamp(v,low,high){return Math.max(low,Math.min(v,high));}
  function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
  function angle(a,b){return Math.atan2(b.y-a.y,b.x-a.x);}
  function sample(items){return items[Math.floor(Math.random()*items.length)];}
  var scope=el('scope'),field=el('field'),ctx=field.getContext('2d'),ground;
  var heroView=el('hero-view'),heroContext=heroView.getContext('2d');
  var state='home',g,previous=0,coverTime=0,keys={},pointer=null,muted=false,best=0;
  var ops={stats:stats,kill:killed,damage:damage,spawn:spawn,notice:notice,fx:fx,float:floatLabel,sound:A.play,
    swallow:swallow,area:area,storm:stormPulse,orb:orb,height:function(){return H;},nearest:nearest,shot:shot,c3:emitC3,evolve:evolve};
  var resultId=0,resultRow,resultRank,ending=null,lastSlots='',lastHud=0;
  var layoutRead=0,musicOff=false,mirror=false,fixedStick=false,prefTouched={},skillPaint=[];
  var stickBase=el('fixed-stick');
  var activeNames={macrophage:'猛扑',neutrophil:'诱捕网',nk:'过载',dc:'集结',mist:'酸雾',pulse:'聚爆',veil:'护膜'};
  function safeLayout(){
    var ticket=++layoutRead;
    B.layout().then(function(info){
      if(ticket!==layoutRead)return;
      var style=scope.style;
      if(!info||!(info.windowWidth>0)||!(info.windowHeight>0)){
        ['--host-top','--host-bottom','--host-left','--host-right','--safe-top','--safe-bottom'].forEach(function(key){style.removeProperty(key);});
        return;
      }
      var rect=scope.getBoundingClientRect(),safe=info.safeArea||{};
      var sx=window.innerWidth/info.windowWidth,sy=window.innerHeight/info.windowHeight;
      var top=(safe.top||0)*sy;
      var buttons=info.menuButtons||{};
      Object.keys(buttons).forEach(function(key){
        var b=buttons[key];
        if(b&&b.left*sx<rect.right&&b.right*sx>rect.left&&b.bottom*sy>rect.top&&b.top*sy<rect.bottom){
          top=Math.max(top,b.bottom*sy+4);
        }
      });
      function inset(key,value,minimum){
        var pixels=Math.max(minimum||0,Math.ceil(value));
        style.setProperty(key,pixels+'px');
        return pixels;
      }
      var t=inset('--host-top',top-rect.top);
      inset('--host-right',rect.right-(safe.right||info.windowWidth)*sx);
      var b=inset('--host-bottom',rect.bottom-(safe.bottom||info.windowHeight)*sy);
      inset('--host-left',(safe.left||0)*sx-rect.left);
      inset('--safe-top',t,8);inset('--safe-bottom',b,14);
    });
  }
  function resize(){
    var ww=window.innerWidth,hh=window.innerHeight,compact=ww<=750||hh<=550;
    var sh=compact?hh:Math.min(890,hh-132),sw=Math.min(ww,sh*9/16);
    if(compact && ww/hh<.78){sw=ww;sh=hh;}
    var oldH=H; H=W*sh/sw;
    scope.style.width=sw+'px';scope.style.height=sh+'px';scope.style.setProperty('--heading',Math.round(Math.min(sw*.137,sh*.093))+'px');
    var cw=scope.clientWidth,ch=scope.clientHeight,dpr=Math.min(window.devicePixelRatio||1,2);
    heroView.width=Math.round(360*dpr);heroView.height=Math.round(225*dpr);
    heroContext.setTransform(heroView.width/360,0,0,heroView.height/225,0,0);
    field.width=Math.round(cw*dpr);field.height=Math.round(ch*dpr);
    ctx.setTransform(field.width/W,0,0,field.height/H,0,0);
    ground=R.ground(H);safeLayout();
    if(g && oldH!==H){
      [g.enemies,g.shots,g.orbs,g.films,g.effects,g.allies,g.nets,g.phages,g.bifidos,g.hearts,g.army,g.floaters,[g.p,g.ctl]].forEach(function(arr){arr.forEach(function(v){v.y*=H/oldH;});});
      g.floaters.forEach(function(v){if(v.below)v.below*=H/oldH;});
      g.fibrinNets.forEach(function(v){v.y*=H/oldH;v.yy*=H/oldH;});
      g.rays.forEach(function(r){if(r.kind==='dash'){r.y*=H/oldH;r.yy*=H/oldH;}else r.ty*=H/oldH;});
    }
    clearInput();
  }
  function clearInput(){keys={};endStick(pointer);}
  function button(label,cls,fn){
    var b=document.createElement('button');b.textContent=label;b.className=cls;b.addEventListener('click',fn);return b;
  }
  function backButton(label,fn){return button(label,'text-btn back-nav',fn);}
  function paragraph(text){var p=document.createElement('p');p.textContent=text;return p;}
  function setScreen(next){
    el('home-toast').hidden=true;
    state=next;A.scene(next,g);scope.setAttribute('data-screen',next);clearInput();el('home').hidden=next!=='home';el('hud').hidden=['playing','upgrade','paused','brief'].indexOf(next)<0;
    el('sheet').hidden=['playing','ending','result','home'].indexOf(next)>=0;
    el('result').hidden=next!=='result';el('outro').hidden=next!=='ending';

  }
  function sheet(next,kicker,title){
    setScreen(next);el('sheet-kicker').textContent=kicker;el('sheet-title').textContent=title;
    var box=el('sheet-body');box.textContent='';el('sheet').classList.remove('has-menu-footer');
    box.parentNode.scrollTop=0;return box;
  }
  function menuPage(next,kicker,title,label,back){
    var box=sheet(next,kicker,title),list=fragment('div','menu-scroll');
    el('sheet').classList.add('has-menu-footer');box.appendChild(list);box.appendChild(backButton(label,back));
    return list;
  }
  function fragment(tag,cls,txt){var n=document.createElement(tag);n.className=cls;if(txt)n.textContent=txt;return n;}
  var FC=window.FieldCollection,firstWinPending=false,sideSignature='';
  function animateSheet(node,draw){
    var last=-100;
    function frame(now){
      if(!el('sheet-body').contains(node)||el('sheet').hidden)return;
      if(!document.hidden&&now-last>=125){draw(now/1000);last=now;}
      requestAnimationFrame(frame);
    }
    draw(0);requestAnimationFrame(frame);
  }
  function specimen(kind,back){
    if(!FC.known(kind))return;
    P.markSeen(kind);refreshLoadout();
    var s=D.species[kind],count=(P.data.atlas[kind]||{}).kills||0;
    var box=menuPage('specimen','MICROSCOPIC ATLAS',s.name,'返回',back),flip=button('','atlas-flip',function(){
      A.play('flip');var on=flip.classList.toggle('turned');flip.setAttribute('aria-pressed',String(on));
      front.setAttribute('aria-hidden',String(on));rear.setAttribute('aria-hidden',String(!on));
    });flip.setAttribute('aria-label','翻转图鉴，查看特征与破解法');flip.setAttribute('aria-pressed','false');
    var inner=fragment('span','flip-inner'),front=fragment('span','atlas-face front'),rear=fragment('span','atlas-face rear');
    var cv=fragment('canvas','large-spec');R.icon(cv,kind,100);
    front.appendChild(fragment('b','atlas-rank',kind==='phage'||kind==='bifido'?'友方生态':'威胁 · '+s.danger));
    front.appendChild(cv);front.appendChild(fragment('strong','latin',s.latin));front.appendChild(fragment('small','flip-hint','轻点翻面 ↻'));
    rear.setAttribute('aria-hidden','true');rear.appendChild(fragment('b','atlas-tags',s.tags.join('　')));
    rear.appendChild(fragment('strong','roast',s.roast));rear.appendChild(fragment('span','counterplay',s.info));
    inner.appendChild(front);inner.appendChild(rear);flip.appendChild(inner);box.appendChild(flip);
    var stars=s.milestones.filter(function(n){return count>=n;}).length,goal=s.milestones[stars]||200;
    var prog=fragment('div','atlas-progress'),bar=fragment('div','atlas-track'),fill=fragment('i','');
    fill.style.width=Math.min(100,count/goal*100)+'%';bar.appendChild(fill);
    prog.appendChild(fragment('span','',(['未评级','铜星','银星','镀金星'][stars])+'　'+(kind==='phage'?'协助':kind==='bifido'?'误吞':'累计清除')+' '+count+' / '+goal));prog.appendChild(bar);
    box.appendChild(prog);animateSheet(cv,function(t){if(!flip.classList.contains('turned'))R.icon(cv,kind,100,t);});
  }
  var preview='macrophage',heroKeys=Object.keys(D.heroes);
  function home(){
    setScreen('home');refreshLoadout();
    if(firstWinPending&&P.data.cleared>0){
      firstWinPending=false;scope.classList.add('first-win');A.play('gate');
      setTimeout(function(){scope.classList.remove('first-win');},1900);
    }
  }
  function refreshLoadout(){
    var pr=P.data,hero=D.heroes[preview],own=pr.unlocks.heroes.indexOf(preview)>=0;
    el('wallet').textContent=pr.atp+' ATP';
    el('wallet-pill').setAttribute('aria-label','细胞培养室，余额 '+pr.atp+' ATP');
    scope.setAttribute('data-stain',pr.stain);
    scope.classList.toggle('rookie',pr.survival===0&&pr.cleared===0&&!CP.get());
    var saved=CP.get(),route=C.stages[stage-1];
    if(state==='home')timeline({mode:mode,stage:stage,epoch:0,time:-1});
    el('mode-campaign').setAttribute('aria-pressed',String(mode==='campaign'));
    el('mode-endless').setAttribute('aria-pressed',String(mode==='endless'));
    el('mode-endless').setAttribute('aria-disabled',String(pr.cleared<5));
    el('mode-endless').setAttribute('aria-label',pr.cleared>=5?'无尽深渊':'无尽深渊，第五关通关解锁');
    el('rank-label').textContent=C.rank(pr.board.all.length?pr.board.all[0].time:0).title;
    el('route-label').textContent=mode==='campaign'?'第 '+stage+' 关 · '+route.name:D.maps[pr.selectedMap].name;
    el('route-open').setAttribute('aria-label',(mode==='campaign'?'选择关卡，':'选择战场，')+el('route-label').textContent);
    el('start-label').textContent=saved?'继续巡逻':!own?'解锁'+hero.name:mode==='campaign'?'开始第 '+stage+' 关':'进入无尽深渊';
    el('start-meta').textContent=saved?D.clock(saved.time)+' · Lv.'+saved.level:!own?hero.cost+' ATP':mode==='endless'?'∞':stage===1?'45 秒实训':D.clock(route.duration);
    el('start').classList.toggle('unlock',!saved&&!own);
    var shortfall=!saved&&!own&&pr.atp<hero.cost;
    el('start').disabled=!loaded;el('start').setAttribute('aria-disabled',String(!!shortfall));
    if(shortfall)el('start-meta').textContent='还差 '+(hero.cost-pr.atp)+' ATP';
    el('new-run').hidden=!saved;
    el('hero-name').textContent=hero.name;el('hero-trait').textContent=hero.trait;
    var active={cargo:'dash',nets:'net',laser:'salvo',summon:'rally'}[hero.mode];
    el('hero-active').textContent='主动 · '+D.actives[active].name;
    el('hero-hp').textContent=hero.hp+P.culture.membrane.values[pr.culture.membrane];el('hero-speed').textContent=Tiers.speedTier(hero.speed)+'档';
    var got=Object.keys(pr.atlas).filter(FC.known);refreshSide(got);
    el('atlas-count').textContent=got.length+'/'+Object.keys(D.species).length;
    el('atlas-open').classList.toggle('unread',got.some(function(k){return pr.seen.indexOf(k)<0;}));
  }
  function browseHero(delta){
    if(!loaded)return;
    el('home-toast').hidden=true;
    preview=heroKeys[(heroKeys.indexOf(preview)+delta+heroKeys.length)%heroKeys.length];
    if(P.data.unlocks.heroes.indexOf(preview)>=0)P.select('hero',preview);refreshLoadout();
  }
  function routes(){
    var box=menuPage('routes','CAMPAIGN','防线战役','返回观测站',home),grid=fragment('div','stage-grid');
    C.stages.forEach(function(s){
      var locked=s.id>Math.min(8,P.data.cleared+1);
      var b=button('','stage-pick',function(){
        if(locked){deny(b,'通过第 '+(s.id-1)+' 关后开放「'+s.name+'」。');return;}
        stage=s.id;mode='campaign';home();
      });b.setAttribute('aria-disabled',String(locked));b.setAttribute('aria-pressed',String(s.id===stage));
      b.appendChild(fragment('small','','第 '+s.id+' 关 · '+D.maps[s.map].short));
      b.appendChild(fragment('b','',s.name));b.appendChild(fragment('span','',D.clock(s.duration)+(s.id<=P.data.cleared?'　已通关':locked?'　未开放':'　可挑战')));
      grid.appendChild(b);
    });box.appendChild(grid);
  }
  function routeMenu(){if(mode==='endless')mapsMenu();else routes();}
  el('route-open').addEventListener('click',routeMenu);
  el('mode-campaign').addEventListener('click',function(){mode='campaign';refreshLoadout();});
  el('mode-endless').addEventListener('click',function(){
    if(P.data.cleared<5){var box=sheet('locked','ENDLESS','第五关后开启无尽深渊');
      box.appendChild(paragraph('击败第五关菌王后，四座器官战场都能参加无尽挑战。每两分钟会有新的变异首领加入战斗。'));
      box.appendChild(button('查看战役进度','primary',routes));box.appendChild(backButton('返回观测站',home));return;}
    mode='endless';refreshLoadout();
  });
  var rankBoards=['all','skin','lung','gut','brain'];
  var rankPeriods={all:'历史最佳',month:'本月',week:'本周',day:'今日'};
  function boardName(key){return key==='all'?'总榜':D.maps[key].short;}
  function rankSources(box,platform,change){
    if(!B.ranks.available())return;
    var tabs=fragment('div','rank-tabs rank-source');
    tabs.id='rank-sources';tabs.setAttribute('role','group');tabs.setAttribute('aria-label','排行来源');
    ['本机战绩','平台榜'].forEach(function(label,i){
      var active=!!i===platform,b=button(label,'',function(){if(!active)change();});
      b.setAttribute('aria-pressed',String(active));tabs.appendChild(b);
    });
    box.appendChild(tabs);
  }
  function leaderboard(tab,restore,message){
    var top=P.data.board.all[0],rank=C.rank(top?top.time:0);
    var box=sheet('rank','ENDLESS RECORDS','荣耀排行榜');
    rankSources(box,false,function(){platformLeaderboard(tab);});
    if(message){
      var notice=fragment('p','rank-message',message);notice.setAttribute('role','status');box.appendChild(notice);
    }
    var bestPanel=fragment('div','rank-best'),bestTime=fragment('div','rank-personal'),standing=fragment('div','rank-standing');
    bestTime.appendChild(fragment('small','','个人最佳'));bestTime.appendChild(fragment('strong','',top?D.clock(top.time):'—'));
    standing.appendChild(fragment('b','',rank.title));standing.appendChild(fragment('small','',top?'基准分位 '+rank.percent+'%':'等待首份战绩'));
    bestPanel.appendChild(bestTime);bestPanel.appendChild(standing);box.appendChild(bestPanel);
    var tabs=fragment('div','rank-tabs board-tabs'),controls={},scroll=fragment('div','rank-scroll');
    var list=fragment('ol','rank-list'),empty=paragraph(''),tiers=fragment('details','rank-scale');
    tabs.setAttribute('role','group');tabs.setAttribute('aria-label','筛选无尽战场');
    rankBoards.forEach(function(k){
      var b=button(boardName(k),'',function(){select(k);});
      b.setAttribute('aria-controls','board-records');controls[k]=b;tabs.appendChild(b);
    });
    list.id='board-records';empty.className='rank-empty';
    scroll.appendChild(list);scroll.appendChild(empty);
    tiers.appendChild(fragment('summary','','七阶防线基准'));
    var scale=fragment('div','rank-grades');
    [0,30,60,120,210,330,480].forEach(function(n){
      var grade=C.rank(n),line=fragment('div','rank-grade');
      line.appendChild(fragment('span','',D.clock(n)));line.appendChild(fragment('b','',grade.title));line.appendChild(fragment('span','',grade.percent+'%'));
      if(top&&rank.seconds===n)line.classList.add('current');
      scale.appendChild(line);
    });
    tiers.appendChild(scale);tiers.appendChild(paragraph('分位来自游戏设定的存活时长标尺。'));scroll.appendChild(tiers);
    box.appendChild(tabs);box.appendChild(scroll);box.appendChild(backButton('返回观测站',home));
    function select(key){
      tab=key;Object.keys(controls).forEach(function(k){controls[k].setAttribute('aria-pressed',String(k===key));});
      var rows=P.data.board[key]||[];list.textContent='';list.setAttribute('aria-label',controls[key].textContent+'成绩');
      empty.textContent=(key==='all'?'无尽总榜':D.maps[key].short+'分榜')+'暂无战绩';empty.hidden=!!rows.length;
      rows.forEach(function(r,i){
        var item=fragment('li',''),b=button('','rank-row',function(){
          var saved={index:i,offset:scroll.scrollTop,expanded:tiers.open};
          recordCard(r,function(){leaderboard(key,saved);});
        });
        var result=fragment('span','rank-run'),details=fragment('span','rank-score');
        result.appendChild(fragment('strong','',D.clock(r.time)));result.appendChild(fragment('small','',D.maps[r.map].short+' · '+D.heroes[r.hero].name));
        details.appendChild(fragment('b','','Lv.'+r.level));details.appendChild(fragment('small','','清除 '+r.kills));
        b.appendChild(fragment('span','rank-number',String(i+1).padStart(2,'0')));b.appendChild(result);b.appendChild(details);
        var arrow=fragment('i','rank-arrow');arrow.setAttribute('aria-hidden','true');b.appendChild(arrow);
        item.appendChild(b);list.appendChild(item);
      });
      scroll.scrollTop=0;
    }
    select(tab);
    if(restore){
      tiers.open=restore.expanded;var selected=list.children[restore.index];
      if(selected)selected.firstChild.focus();
      scroll.scrollTop=restore.offset;
    }
  }
  function platformFilter(keys,label,name,selected,change,cls){
    var tabs=fragment('div','rank-tabs board-tabs '+cls);
    tabs.setAttribute('role','group');tabs.setAttribute('aria-label',label);
    keys.forEach(function(key){
      var b=button(name(key),'',function(){
        Array.prototype.forEach.call(tabs.children,function(item){item.setAttribute('aria-pressed',String(item===b));});
        change(key);
      });
      b.setAttribute('aria-pressed',String(key===selected));tabs.appendChild(b);
    });
    return tabs;
  }
  function platformLeaderboard(tab){
    var box=sheet('platform-rank','ENDLESS RECORDS','平台榜'),period='all',revision=0,rows=[],shown=0;
    rankSources(box,true,function(){leaderboard(tab);});
    box.appendChild(platformFilter(rankBoards,'无尽战场',boardName,tab,function(key){tab=key;read();},'platform-maps'));
    box.appendChild(platformFilter(Object.keys(rankPeriods),'榜单周期',function(key){return rankPeriods[key];},
      period,function(key){period=key;read();},'platform-periods'));
    var best=fragment('div','rank-best'),personal=fragment('div','rank-personal'),standing=fragment('div','rank-standing');
    var time=fragment('strong','','—'),place=fragment('b','','—');
    personal.appendChild(fragment('small','','本期最佳存活'));personal.appendChild(time);
    standing.appendChild(place);standing.appendChild(fragment('small','','我的名次'));
    best.appendChild(personal);best.appendChild(standing);box.appendChild(best);
    var scroll=fragment('div','rank-scroll'),list=fragment('ol','rank-list'),status=fragment('p','rank-empty');
    var more=button('显示更多名次','text-btn',renderPage),retry=button('重新读取','text-btn',read);
    list.setAttribute('aria-label','平台榜排名');status.setAttribute('role','status');
    scroll.appendChild(status);scroll.appendChild(list);scroll.appendChild(more);scroll.appendChild(retry);
    box.appendChild(scroll);box.appendChild(backButton('返回观测站',home));
    function renderPage(){
      rows.slice(shown,shown+20).forEach(function(row){
        var item=fragment('li','platform-rank-row');
        item.appendChild(fragment('span','rank-number',String(row.rank)));
        item.appendChild(fragment('span','platform-nickname',row.nickname||'小红薯'));
        item.appendChild(fragment('strong','',D.clock(row.score)));
        list.appendChild(item);shown++;
      });
      more.hidden=shown>=rows.length;
    }
    async function read(){
      var ticket=++revision;
      function active(){return ticket===revision&&status.isConnected&&state==='platform-rank';}
      list.textContent='';shown=0;scroll.scrollTop=0;more.hidden=true;retry.hidden=true;
      time.textContent=place.textContent='—';status.hidden=false;status.textContent='正在读取平台榜…';
      try{
        var result=await B.ranks.read(rankBoards.indexOf(tab)+1,period);
        if(!B.ranks.available())throw new Error('平台榜不可用');
        if(!active())return;
        var mine=result.mine;
        time.textContent=mine.status==='EXACT'?D.clock(mine.score):'—';
        place.textContent={EXACT:'第 '+mine.rank+' 名',OVER_LIMIT:'500+',NO_SCORE:'本期暂无成绩',NOT_PARTICIPATING:'尚未提交成绩'}[mine.status];
        rows=result.rows;
        status.hidden=rows.length>0;status.textContent='本期暂无上榜成绩';
        renderPage();
      }catch(err){
        if(!B.ranks.available()&&state==='rank'&&el('rank-sources'))el('rank-sources').hidden=true;
        if(!active())return;
        if(!B.ranks.available()){leaderboard(tab,null,'平台榜暂未开放，仍可查看本机战绩。');return;}
        status.textContent=err&&err.errCode===2002?'榜单正在更新，请稍后重试。':'平台榜暂时读取失败，请重试。';
        retry.hidden=false;
      }
    }
    read();
  }
  function postBattleReport(url,row){
    var endless=row.stage==null,hero=D.heroes[row.hero].name,map=D.maps[row.map].short;
    var title=endless?'我的巨噬幸存者无尽战报':'我的巨噬幸存者战役战报';
    var mode=endless?'无尽深渊':'防线战役第 '+row.stage+' 关';
    var content='我用'+hero+'在'+map+'打了'+mode+'，存活 '+D.clock(row.time)+'，清除 '+row.kills+' 个菌落。';
    return B.postReport(url,{title:title,content:content+'\n\n#巨噬幸存者'+(endless?' #巨噬幸存者无尽榜':'')});
  }
  function bindReportAction(b,operation,img,note){
    b.addEventListener('click',function(){
      var id=resultId,page=state;b.disabled=true;
      operation(img.src).then(function(msg){
        b.disabled=false;if(page===state&&id===resultId&&b.isConnected)note.textContent=msg;
      });
    });
  }
  function recordCard(row,back){
    var box=sheet('record','ENDLESS RECORD','无尽巡逻战绩'),img=fragment('img','record-poster');
    img.src=R.report(row);img.alt=D.maps[row.map].short+' · '+D.heroes[row.hero].name+'战报，存活 '+D.clock(row.time)+'，清除 '+row.kills;
    var actions=fragment('div','record-actions'),note=fragment('small','record-status');
    var save=fragment('button','primary','保存战报图片'),post=fragment('button','',B.reportActionLabel());
    img.id='record-poster';note.setAttribute('role','status');actions.appendChild(save);actions.appendChild(post);
    bindReportAction(save,B.exportReport,img,note);bindReportAction(post,function(url){return postBattleReport(url,row);},img,note);
    box.appendChild(img);box.appendChild(actions);box.appendChild(note);box.appendChild(backButton('返回榜单',back));
  }
  el('rank-open').addEventListener('click',function(){leaderboard('all');});
  function atlasMenu(initial,offsets,returnTo){
    var box=sheet('atlas','MICROSCOPIC ATLAS','显微图鉴'),tabs=fragment('div','rank-tabs atlas-tabs'),grid=fragment('div','atlas-grid');
    var kinds=Object.keys(D.species),labels={all:'全部 '+kinds.length,S:'S 级',A:'A 级',B:'B 级',ally:'友方生态'};
    var buttons={},cards={},icons=[],active=null;
    offsets=offsets||{};grid.id='atlas-results';
    tabs.setAttribute('role','group');tabs.setAttribute('aria-label','按威胁等级或阵营筛选');
    function select(group){
      if(active===group)return;
      if(active)offsets[active]=grid.scrollTop;
      active=group;
      Object.keys(buttons).forEach(function(key){buttons[key].setAttribute('aria-pressed',String(key===group));});
      kinds.forEach(function(k){cards[k].hidden=group!=='all'&&cards[k].dataset.group!==group;});
      grid.scrollTop=offsets[group]||0;
    }
    Object.keys(labels).forEach(function(group){
      var b=button(labels[group],'',function(){select(group);});
      b.setAttribute('aria-controls',grid.id);buttons[group]=b;tabs.appendChild(b);
    });
    box.appendChild(tabs);box.appendChild(grid);
    kinds.forEach(function(k){
      var spec=D.species[k],friend=k==='phage'||k==='bifido',known=FC.known(k);
      var item=button('','sample atlas-tile',function(){
        offsets[active]=grid.scrollTop;specimen(k,function(){atlasMenu(active,offsets,k);});
      });
      cards[k]=item;item.dataset.group=friend?'ally':spec.danger;
      var cv=fragment('canvas',''),count=P.data.atlas[k].kills;
      item.disabled=!known;item.appendChild(cv);FC.specimen(cv,k,54,0);
      item.appendChild(fragment('b','',known?spec.name:'未知标本'));
      item.appendChild(fragment('small','',known?(friend?'友方':'威胁 '+spec.danger)+' · '+count+' 次':'首次出没于 '+FC.habitat(k)));
      if(known){icons.push([cv,k]);var n=spec.milestones.filter(function(min){return count>=min;}).length;
        item.appendChild(fragment('span','atlas-stars','★★★'.slice(0,n)+'☆☆☆'.slice(n)));}
      grid.appendChild(item);
    });
    box.appendChild(backButton('返回观测站',function(){returnHomeTo('atlas-open');}));
    select(initial||'all');
    (cards[returnTo]||buttons[active]).focus({preventScroll:true});
    if(returnTo)grid.scrollTop=offsets[active]||0;
    animateSheet(grid,function(t){icons.forEach(function(v){if(!cards[v[1]].hidden)FC.specimen(v[0],v[1],54,t);});});
  }
  function stampsMenu(){
    var box=menuPage('stamps','FIELD COLLECTION　/　'+P.data.stamps.length+' / '+Object.keys(D.achievements).length,'检验印章墙','返回观测站',function(){returnHomeTo('stamps-open');});
    var grid=fragment('div','seal-grid'),readout=fragment('p','skill-readout','点选印章查看线索。每枚新章奖励 25 ATP。');
    Object.keys(D.achievements).forEach(function(k){
      var won=P.data.stamps.indexOf(k)>=0,b=button('','stamp-entry'+(won?' earned':''),function(){
        readout.textContent=D.achievements[k]+' · '+D.stampHints[k]+(won?'　已收藏':'　首次达成 +25 ATP');if(won)A.play('stamp');
      }),cv=fragment('canvas','');FC.sealCanvas(cv,k,won);b.appendChild(cv);
      b.appendChild(fragment('b','',D.achievements[k]));b.appendChild(fragment('small','',won?'已盖章':D.stampHints[k]));grid.appendChild(b);
    });box.appendChild(readout);box.appendChild(grid);
  }
  var shortSkill={actin:'肌动蛋白',acid:'溶酶体',igg:'IgG',ros:'呼吸爆发',ctl:'CTL',c3:'C3b',turret:'B 细胞',ifn:'γ-干扰素',mhc:'抗原呈递',mac:'MAC',storm:'因子风暴',synapse:'突触猎杀',matrix:'制导矩阵'};
  function groupName(group){return group.map(function(k){return shortSkill[k];}).join(' 或 ');}
  function recipeMate(recipe,key){
    var groups=C.recipeGroups(recipe);
    if(groups[0].indexOf(key)>=0)return groups[1];
    if(groups[1].indexOf(key)>=0)return groups[0];
    return null;
  }
  function treeMenu(){
    var box=sheet('tree','IMMUNE PATHWAYS','全局技能树'),range=P.data.cleared+1;
    var detail=fragment('div','skill-readout tree-readout'),scroll=fragment('div','tree-scroll');
    detail.id='tree-detail';detail.setAttribute('role','region');detail.setAttribute('aria-label','所选技能详情');
    detail.setAttribute('aria-live','polite');detail.tabIndex=0;scroll.tabIndex=-1;
    box.appendChild(detail);box.appendChild(scroll);
    function node(key,shape){
      var a=D.actives[key],superweapon=D.supers[key],obj=a||superweapon||D.upgrades[key];
      var allowed=[],threshold=9,spec={mode:'campaign',stage:1};
      Object.keys(D.heroes).forEach(function(h){
        spec.hero=D.heroes[h];
        for(var lv=1;lv<=8;lv++){
          spec.stage=lv;
          var ok=superweapon?C.recipeAllowed(spec,key):a?lv>=3&&(!a.hero||a.hero===h):C.skillAllowed(spec,key);
          if(ok){threshold=Math.min(lv,threshold);allowed.push(h);break;}
        }
      });
      var available=range>=threshold&&allowed.some(function(k){return P.data.unlocks.heroes.indexOf(k)>=0;});
      var rule=range<threshold?'通过第 '+(threshold-1)+' 关开启':'解锁'+D.heroes[allowed[0]].name+'开启';
      var name=shortSkill[key]||obj.name;
      var b=button('','skill-chip '+shape+(available?'':' locked'),function(){
        Array.prototype.forEach.call(scroll.querySelectorAll('.skill-chip'),function(n){n.setAttribute('aria-pressed',String(n.dataset.skill===key));});
        detail.textContent='';detail.scrollTop=0;
        var heading=fragment('div','tree-detail-heading');heading.appendChild(fragment('b','',obj.name));
        heading.appendChild(fragment('small','',available?'已开放':rule));detail.appendChild(heading);
        var hero=allowed.indexOf(P.data.selectedHero)>=0?P.data.selectedHero:allowed[0];
        var audience=allowed.length===Object.keys(D.heroes).length?'全部出战细胞':allowed.map(function(h){return D.heroes[h].name;}).join(' / ');
        detail.appendChild(fragment('small','','适配 '+audience));
        if(superweapon){detail.appendChild(paragraph(C.recipeGroups(superweapon).map(function(group){return groupName(group)+' Lv.3';}).join(' ＋ ')+' · '+superweapon.effect+'。'));}
        else if(a&&a.hero)detail.appendChild(paragraph(a.effect+' '+Tiers.tierDesc(key,1,hero)+'。'+({dash:'抢收落单菌与黏液带内目标。',net:'阻断精英冲撞与冲锋菌潮。',salvo:'针对感染细胞和念珠菌菌丝。',rally:'收拢抗原，对付密集来敌。'})[key]));
        else{[1,2,3].forEach(function(n){detail.appendChild(fragment('small','','Lv.'+n+'　'+Tiers.tierDesc(key,n,hero)));});
          detail.appendChild(paragraph(counters[key]||obj.effect+' '+({mist:'克制荚膜菌。',pulse:'扫除绿脓杆菌黏液。',veil:'抵挡菌王冲撞。'})[key]));}
      });
      b.dataset.skill=key;b.setAttribute('aria-pressed','false');b.setAttribute('aria-controls',detail.id);
      b.setAttribute('aria-label',obj.name+'，'+(available?'已开放':rule));
      var icon=fragment('i','');
      var cv=fragment('canvas','');cv.setAttribute('aria-hidden','true');
      R.upgradeIcon(cv,({mac:'c3',storm:'ros',synapse:'actin',dash:'actin',net:'c3',salvo:'ctl',rally:'turret'})[key]||key);
      icon.appendChild(cv);b.appendChild(icon);b.appendChild(fragment('b','',name));return b;
    }
    scroll.appendChild(fragment('h3','tree-heading','超武合成'));
    var recipes=fragment('div','recipe-tree');scroll.appendChild(recipes);
    Object.keys(D.supers).forEach(function(k){var branch=fragment('div','branch'),pair=fragment('div','parents');
      var recipe=D.supers[k];pair.appendChild(node(recipe.needs[0],'round'));pair.appendChild(fragment('span','recipe-sign','+'));
      if(recipe.alternate){
        var alternatives=fragment('div','recipe-options');alternatives.appendChild(node(recipe.needs[1],'round'));
        alternatives.appendChild(fragment('span','recipe-sign','或'));alternatives.appendChild(node(recipe.alternate,'round'));pair.appendChild(alternatives);
      }else pair.appendChild(node(recipe.needs[1],'round'));
      branch.appendChild(pair);branch.appendChild(fragment('span','recipe-arrow','→'));branch.appendChild(node(k,'hex'));recipes.appendChild(branch);
    });
    function skillGroup(title,keys,shape){
      scroll.appendChild(fragment('h3','tree-heading',title));var grid=fragment('div','active-tree');
      keys.forEach(function(k){grid.appendChild(node(k,shape));});scroll.appendChild(grid);
    }
    skillGroup('其他常驻技能',['turret','mhc'],'round');skillGroup('主动技能',Object.keys(D.actives),'diamond');
    var initial=scroll.querySelector('.hex:not(.locked)')||scroll.querySelector('.skill-chip:not(.locked)')||scroll.querySelector('.skill-chip');
    scroll.addEventListener('keydown',function(e){
      if(!/^Arrow(Left|Right|Up|Down)$/.test(e.key)||!e.target.classList.contains('skill-chip'))return;
      var box=e.target.getBoundingClientRect(),horizontal=e.key==='ArrowLeft'||e.key==='ArrowRight';
      var direction=e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1,nearest=null,best=Infinity;
      Array.prototype.forEach.call(scroll.querySelectorAll('.skill-chip'),function(candidate){
        var rect=candidate.getBoundingClientRect(),dx=(rect.left+rect.right-box.left-box.right)/2,dy=(rect.top+rect.bottom-box.top-box.bottom)/2;
        var along=(horizontal?dx:dy)*direction,side=Math.abs(horizontal?dy:dx),score=along+2*side;
        if(along>8&&side<along&&score<best){best=score;nearest=candidate;}
      });
      e.preventDefault();if(nearest){nearest.focus();nearest.click();}
    });
    initial.click();initial.focus();box.appendChild(backButton('返回观测站',home));
  }
  function returnHomeTo(id){home();el(id).focus();}
  var readingBack;
  function science(from,viaManual,selected){
    var library=window.ImmuneScience,box=sheet('science','IMMUNOLOGY ENCYCLOPEDIA','人体免疫科普馆');
    var tabs=fragment('div','ency-tabs'),list=fragment('div','ency-list'),actions=fragment('div','ency-actions');
    var active=selected||'lines',controls=[];
    readingBack=viaManual?function(){manual(from,null,true);}:from;
    tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','科普主题');
    list.id='science-entries';list.setAttribute('role','tabpanel');list.tabIndex=0;
    library.tabs.forEach(function(item,i){
      var tab=button(item.label,'ency-tab',function(){select(item.id);});
      tab.id='science-tab-'+item.id;tab.setAttribute('role','tab');tab.setAttribute('aria-controls',list.id);
      tab.addEventListener('keydown',function(e){
        var n=controls.length,index=i;
        if(e.key==='ArrowRight')index=(i+1)%n;else if(e.key==='ArrowLeft')index=(i+n-1)%n;
        else if(e.key==='Home')index=0;else if(e.key==='End')index=n-1;else return;
        e.preventDefault();controls[index].focus();select(library.tabs[index].id);
      });
      tabs.appendChild(tab);controls.push(tab);
    });
    function select(key){
      active=key;list.textContent='';list.setAttribute('aria-labelledby','science-tab-'+key);
      controls.forEach(function(tab,i){var on=library.tabs[i].id===key;tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;});
      var page=fragment('div','ency-page'),pictures=[];list.appendChild(page);
      library[key].forEach(function(item){
        var card=fragment('article','ency-entry'),cv=fragment('canvas','ency-icon'),head=fragment('div','ency-head');
        cv.setAttribute('aria-hidden','true');card.appendChild(cv);card.appendChild(head);
        if(item.badge)head.appendChild(fragment('small','ency-badge',item.badge));
        head.appendChild(fragment('h3','',item.name||item.title));
        if(item.meta)head.appendChild(fragment('small','ency-meta',item.meta));
        if(item.myth){
          [['游戏设定',item.myth],['科学事实',item.fact]].forEach(function(pair){
            var note=fragment('p','ency-note');note.appendChild(fragment('b','',pair[0]));note.appendChild(document.createTextNode(pair[1]));card.appendChild(note);
          });
        }else card.appendChild(paragraph(item.body));
        page.appendChild(card);
        if(item.skillIcon)R.upgradeIcon(cv,item.skillIcon);else pictures.push([cv,item]);
      });
      list.scrollTop=0;
      function draw(t){pictures.forEach(function(p){library.drawIcon(p[0],p[1],t);});}
      if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)draw(0);else animateSheet(page,draw);
    }
    box.appendChild(tabs);box.appendChild(list);box.appendChild(actions);
    if(!viaManual){var hand=button('生存手册','',function(){manual(from,active);});hand.id='science-manual';actions.appendChild(hand);}
    var back=backButton(viaManual?'返回生存手册':'返回观测站',readingBack);back.id='science-back';actions.appendChild(back);
    select(active);controls[library.tabs.map(function(tab){return tab.id;}).indexOf(active)].focus();
  }
  el('science-open').addEventListener('click',function(){science(function(){returnHomeTo('science-open');},false);});
  el('statement-open').addEventListener('click',function(){
    var box=sheet('statement','FIELD NOTES','免责与科普声明');
    box.appendChild(paragraph(FC.statement));var done=backButton('返回观测站',function(){returnHomeTo('statement-open');});
    box.appendChild(done);done.focus();
  });
  el('rank-dock').addEventListener('click',function(){leaderboard('all');});el('tree-open').addEventListener('click',treeMenu);
  el('atlas-open').addEventListener('click',function(){atlasMenu();});el('stamps-open').addEventListener('click',stampsMenu);
  el('prev-hero').addEventListener('click',function(){browseHero(-1);});el('next-hero').addEventListener('click',function(){browseHero(1);});
  var swipeX=null;
  el('stage').addEventListener('touchstart',function(e){swipeX=e.touches[0].clientX;},{passive:true});
  el('stage').addEventListener('touchend',function(e){var dx=e.changedTouches[0].clientX-swipeX;if(swipeX!=null&&Math.abs(dx)>30)browseHero(dx<0?1:-1);swipeX=null;});
  function mapsMenu(){
    var box=menuPage('maps','ORGAN LANDSCAPES','器官战场','返回观测站',home),views=[];
    Object.keys(D.maps).forEach(function(k){
      var m=D.maps[k],owned=P.data.unlocks.maps.indexOf(k)>=0,cv=fragment('canvas','landscape');
      var b=button('','map-pick landscape-card',function(){
        if(!owned){deny(b,m.unlock);return;}
        if(mode==='endless'){if(P.select('map',k))home();return;}
        var routesHere=C.stages.filter(function(s){return s.map===k&&s.id<=P.data.cleared+1;});
        if(routesHere.length){stage=routesHere[routesHere.length-1].id;home();}
        else deny(b,'通过第 6 关后可挑战脑屏障战役。');
      });b.setAttribute('aria-disabled',String(!owned));
      var meta=fragment('span','map-meta');meta.appendChild(fragment('b','',m.name));
      meta.appendChild(fragment('small','',({skin:'纤维网减速',lung:'周期横风',gut:'友军共生',brain:'范围技禁区'})[k]+' · 最佳 '+D.clock(P.data.mapBest[k]||0)));
      meta.appendChild(fragment('small','',owned?m.info:m.unlock));b.appendChild(cv);b.appendChild(meta);views.push([cv,k,!owned]);box.appendChild(b);
    });
    animateSheet(views[0][0],function(t){views.forEach(function(v){FC.landscape(v[0],v[1],t,v[2]);});});
  }
  el('choose-map').addEventListener('click',mapsMenu);
  var toastTimer;
  function showToast(message){
    var toast=el('home-toast');
    toast.textContent=message;toast.hidden=false;
    toast.style.top=state==='home'?(el('start').getBoundingClientRect().top-scope.getBoundingClientRect().top-6)+'px':'';
    clearTimeout(toastTimer);toastTimer=setTimeout(function(){toast.hidden=true;},2400);
  }
  function deny(control,message,cost){
    var wallet=el('wallet-pill');
    if(cost!=null)message='还差 '+Math.max(0,cost-P.data.atp)+' ATP。完成巡逻或首次获得检验印章可赚取 ATP。';
    control.classList.remove('denied');wallet.classList.remove('wallet-alert');
    void control.offsetWidth;
    control.classList.add('denied');if(cost!=null)wallet.classList.add('wallet-alert');
    showToast(message);A.play('deny');B.vibrate('light');
  }
  function cultureMenu(focusKey){
    var previousList=el('sheet-body').querySelector('.menu-scroll'),scroll=focusKey&&previousList?previousList.scrollTop:0;
    var box=menuPage('culture','IMMUNITY OBSERVATORY','细胞培养室','返回观测站',function(){returnHomeTo('wallet-pill');});
    box.appendChild(fragment('p','culture-balance','余额 '+P.data.atp+' ATP · 强化从下一局生效'));
    function row(key,title,detail,label,isStain){
      var cost=P.cultureCost(key),b=button('','culture-row',function(event){
        if(event.detail>1)return;
        if(cost>P.data.atp){deny(b,'',cost);return;}
        if(P.cultivate(key)){A.play('equip');refreshLoadout();cultureMenu(key);}
      });
      b.id='culture-'+key;
      b.disabled=cost==null||key===P.data.stain;b.setAttribute('aria-disabled',String(b.disabled||cost>P.data.atp));
      if(isStain)b.setAttribute('aria-pressed',String(key===P.data.stain));
      var left=fragment('span','culture-copy');left.appendChild(fragment('b','',title));
      if(detail)left.appendChild(fragment('small','',detail));b.appendChild(left);b.appendChild(fragment('span','culture-price',label));box.appendChild(b);
    }
    Object.keys(P.culture).forEach(function(k){
      var spec=P.culture[k],lv=P.data.culture[k],cost=P.cultureCost(k),target=spec.values[Math.min(3,lv+1)];
      row(k,spec.name+' · Lv.'+lv,(lv<3?'下一级 · ':'')+spec.unit+target+(spec.suffix||''),lv===3?'已满级':cost+' ATP');
    });
    box.appendChild(fragment('h3','culture-title','显微染色'));
    Object.keys(P.stains).forEach(function(k){row(k,P.stains[k],'',P.data.stain===k?'使用中':P.cultureCost(k)?'300 ATP':'切换',true);});
    var next=focusKey&&el('culture-'+focusKey);
    (next&&!next.disabled?next:box.querySelector('button:not(:disabled)')).focus();
    box.scrollTop=scroll;
  }
  el('wallet-pill').addEventListener('click',function(){cultureMenu();});
  function manual(from,museumTab,restoreFocus){
    readingBack=museumTab?function(){science(from,false,museumTab);}:from;
    var box=menuPage('manual','FIELD MANUAL','生存手册','返回',readingBack);
    var link=button('人体免疫科普馆','ency-manual-link',function(){science(from,!museumTab,museumTab);});
    link.id='manual-science';box.appendChild(link);if(restoreFocus)link.focus();
    var note=fragment('p','science-card'),badge=fragment('canvas','');badge.width=badge.height=64;
    var nib=badge.getContext('2d');nib.scale(2,2);nib.strokeStyle='#ffd59a';nib.lineWidth=1.6;
    nib.stroke(new Path2D('M2 3C18 7 0 21 16 29M12 1C-2 10 22 20 6 29M5 9L10 8M5 15L12 14M8 20L13 19M16 21L26 6Q30 2 29 8L20 23ZM15 22Q10 25 13 30Q22 29 19 23Z'));
    note.appendChild(badge);note.appendChild(document.createTextNode(FC.statement));box.appendChild(note);
    var entries=[
      ['actin','操控与消化槽','默认在战场任意处拖动。切到固定摇杆后，从圆盘拖动。电脑可用 WASD 或方向键。巨噬细胞碰触吞噬，满舱时拉开，消化后拾取抗原。'],
      ['ros','主动技能与超武公式','第三关起，点按双圆钮释放技能。键盘按 J（或空格）释放职业技能，按 K（或 E）释放战术技能。暂停查看合成路线。γ-干扰素搭配 IgG 或 CTL，两项均到 Lv.3 就能发射三联制导抗体。'],
      ['acid','四大器官法则','皮肤避开金丝，肺泡留意横风。肠道别误吞队友。血脑屏障从 100% 开始，每次手动释放活性氧聚爆会消耗 8 个百分点，降到 0% 即失败。'],
      ['ctl','无尽纪元规则','通关第五关解锁。每两分钟轮换领主。四分钟后，先把重装队长削到 35% 生命再吞噬或触杀。八分钟起留意两条首领血条。']
    ];entries.forEach(function(e){var row=fragment('div','guide-row'),cv=fragment('canvas',''),copy=fragment('div','');R.upgradeIcon(cv,e[0]);row.appendChild(cv);
      copy.appendChild(fragment('b','',e[1]));copy.appendChild(paragraph(e[2]));row.appendChild(copy);box.appendChild(row);});
  }
  function refreshSide(got){
    var sig=got.join('|')+'!';if(sig===sideSignature)return;sideSignature=sig;var list=el('index-list');list.textContent='';
    Object.keys(D.species).forEach(function(k){
      var known=FC.known(k),spec=D.species[k],b=button('','sample',function(){
        if(['playing','paused','home'].indexOf(state)<0||g&&g.upgradeLead)return;
        specimen(k,g?pause:home);
      }),cv=fragment('canvas',''),copy=fragment('span','');
      b.disabled=!known;FC.specimen(cv,k,36,1);copy.appendChild(fragment('b','',known?spec.name:'未知标本'));
      copy.appendChild(fragment('small','',known?spec.tag:FC.habitat(k)));b.appendChild(cv);b.appendChild(copy);list.appendChild(b);
    });
  }
  function syncSound(){A.enable(!muted);A.music(!musicOff);}
  function syncPreferenceRows(){
    [['musicOff',!musicOff],['muted',!muted],['leftHand',mirror],['fixedStick',fixedStick]].forEach(function(item){
      var b=el('pref-'+item[0]);if(!b)return;
      b.setAttribute('aria-pressed',String(item[1]));
      if(item[0]==='leftHand')b.lastChild.textContent=mirror?'左手':'右手';
      else if(item[0]==='fixedStick')b.lastChild.textContent=fixedStick?'固定':'跟随';
      else b.lastChild.textContent=item[1]?'开':'关';
    });
  }
  function syncControls(){
    el('active-pad').classList.toggle('left',mirror);
    stickBase.classList.toggle('right',mirror);stickBase.hidden=!fixedStick;
    field.setAttribute('aria-label',fixedStick?'显微战场，拖动'+(mirror?'右':'左')+'下角摇杆或用方向键移动':'显微战场，拖动或用方向键移动');
  }
  function preferenceRows(box){
    [['背景音乐','musicOff'],['游戏音效','muted'],['主动键位置','leftHand'],['移动摇杆','fixedStick']].forEach(function(item){
      var key=item[1],b=button('','pref-row',function(){
        A.unlock();prefTouched[key]=true;
        if(key==='musicOff')musicOff=!musicOff;
        if(key==='muted')muted=!muted;
        if(key==='leftHand')mirror=!mirror;
        if(key==='fixedStick')fixedStick=!fixedStick;
        var values={musicOff:musicOff,muted:muted,leftHand:mirror,fixedStick:fixedStick};
        B.storage.set('immune.'+key,values[key]);syncControls();
        syncPreferenceRows();syncSound();if(key==='muted'&&!muted)A.play('ready');
      });
      b.id='pref-'+key;b.appendChild(document.createTextNode(item[0]));b.appendChild(fragment('span',''));
      box.appendChild(b);
    });
    syncPreferenceRows();
  }
  el('settings-open').addEventListener('click',function(){
    var box=menuPage('settings','PREFERENCES','设置','返回观测站',function(){returnHomeTo('settings-open');});preferenceRows(box);
    el('pref-musicOff').focus();
  });
  // A touch starts before some mobile WebViews grant audio playback. Keep the
  // unlock listeners until the context is actually running.
  var wakeEvents=['pointerdown','touchend','keydown','click'];
  function awaken(){
    if(A.unlock())wakeEvents.forEach(function(type){document.removeEventListener(type,awaken,true);});
  }
  A.music(false);A.enable(false);
  wakeEvents.forEach(function(type){document.addEventListener(type,awaken,true);});
  document.querySelector('.manual').addEventListener('click',function(){manual(function(){setScreen('home');});});
  function loadProgress(first){
    var account=first?CP.ready:P.load().then(CP.load);
    return Promise.all([account,B.storage.get('immune.best'),B.storage.get('immune.muted'),B.storage.get('immune.musicOff'),B.storage.get('immune.leftHand'),B.storage.get('immune.fixedStick')]).then(function(v){
      best=Object.keys(P.data.mapBest).reduce(function(n,k){return Math.max(n,P.data.mapBest[k]);},Number(v[1])||0);
      el('mobile-best').textContent=el('best').textContent=D.clock(best);
      if(!prefTouched.muted)muted=v[2]===true;
      if(!prefTouched.musicOff)musicOff=v[3]==null?muted:v[3]===true;
      if(!prefTouched.leftHand)mirror=v[4]===true;
      if(!prefTouched.fixedStick)fixedStick=v[5]===true;
      syncControls();syncSound();syncPreferenceRows();
      loaded=true;preview=P.data.selectedHero;
      var saved=CP.get();stage=saved?saved.stage:Math.min(8,P.data.cleared+1);mode=saved?saved.mode:'campaign';
      firstWinPending=P.data.cleared===0;home();el('choose-map').disabled=false;el('home').disabled=false;el('boot-status').hidden=true;
      el('storage-note').textContent=B.storage.status();
    },function(){
      var box=sheet('storage-error','PATROL RECORD','暂时无法读取存档');
      box.appendChild(paragraph('请重试读取本机进度，之后可继续上次的巡逻。'));
      var retry=button('重试读取','primary',function(){retry.disabled=true;loadProgress(false);});
      box.appendChild(retry);retry.focus();
    });
  }
  loadProgress(true);
  function pauseVitals(){
    var T=window.DisplayTier,mode=g.hero.mode,coffee=g.event&&g.event.id==='coffee'?D.events.coffee:null;
    var grid=fragment('div','pause-vitals-grid');
    function metric(label,value,current,max,base,suffix){
      var row=fragment('div','pause-vital'),copy=fragment('div','pause-metric');
      var boost=base!=null&&current>base,lit=Math.ceil(5*current/max);
      copy.appendChild(fragment('span','',label));copy.appendChild(fragment('b','',value));
      if(boost)copy.appendChild(fragment('small','pause-boost','+'+(current-base)));
      row.appendChild(copy);
      var meter=fragment('span','pause-segments');meter.setAttribute('aria-hidden','true');
      for(var i=0;i<5;i++){
        var boosted=boost&&i>=Math.min(lit-1,Math.ceil(5*base/max));
        meter.appendChild(fragment('i',i>=lit?'':boosted?'bonus':'lit'));
      }
      row.appendChild(meter);if(suffix)row.appendChild(fragment('small','pause-barrier',suffix));grid.appendChild(row);
    }
    function rank(label,tier,limit,base){metric(label,tier+'档',tier,limit,base);}
    rank('移速',T.speedTier(g.speed),8,T.speedTier(coffee?g.speed/coffee.speedMult:g.speed));
    var reach=mode==='cargo'?g.radius:g.reachRadius;
    rank(mode==='cargo'?'吞噬范围':mode==='nets'?'拾取范围':'射程',T.reachTier(reach),5,T.reachTier(coffee?reach/coffee.radiusMult:reach));
    if(mode==='cargo'){
      rank('消化速度',T.digestTier(g.digest/(g.hot?1.5:1)),5,T.digestTier(coffee?g.digest/coffee.digestMult:g.digest));
    }else{
      var charge=mode==='nets'?g.netEnergy/100:1-g.laserIn/.6;
      if(mode==='summon'){
        var total=0;
        g.army.forEach(function(f){var interval=(f.kind==='ctl'?1.7-.25*g.levels.ctl:2.4)*.4;total+=clamp(1-f.cool/interval,0,1);});
        charge=g.army.length?total/g.army.length:0;
      }
      rank(mode==='nets'?'诱捕网充能':mode==='laser'?'光束充能':'军团充能',Math.ceil(5*clamp(charge,0,1)),5);
    }
    var integrity=g.map==='brain'?'屏障完整度 '+Math.round(g.barrier)+'%':'';
    if(mode==='cargo'){var used=Q.occupancy(g.p);metric('容量',used+'/'+g.capacity+' 槽',used,g.capacity,null,integrity);}
    else if(mode==='summon')metric('在场军团',g.army.length+' 名',g.army.length,Math.max(1,g.armyCap),null,integrity);
    else if(integrity)metric('屏障完整度',Math.round(g.barrier)+'%',g.barrier,100);
    else{
      var guard=g.shieldUntil>g.time?Math.ceil(g.shieldHP||0):0;
      metric('护盾',guard+' 点',guard,Math.max(1,D.actives.veil.power+D.actives.veil.gain*((g.levels.veil||1)-1)));
    }
    return grid;
  }
  function pauseRecipes(parent){
    var recipes=fragment('div','pause-recipes');
    Object.keys(D.supers).forEach(function(k){
      var recipe=D.supers[k],made=g.super[k];if(!made&&!C.recipeAllowed({mode:'endless',hero:g.hero,levels:g.levels},k))return;
      var groups=C.recipeGroups(recipe),progress=groups.some(function(group){return group.some(function(key){return g.levels[key]>0;});});
      var row=fragment('div','pause-route '+(made?'made':progress?'partial':'dormant'));
      groups.forEach(function(group,i){
        if(i)row.appendChild(fragment('span','pause-plus','＋'));
        var level=Math.min(3,Math.max.apply(null,group.map(function(key){return g.levels[key]||0;})));
        row.appendChild(fragment('span',level?'component present':'component',groupName(group)+' '+level+'/3'));
      });
      row.appendChild(fragment('span','pause-arrow','→'));
      row.appendChild(fragment('b','',recipe.name));
      row.setAttribute('aria-label',(made?'已合成':progress?'合成中':'未获得组件')+' '+row.textContent);
      recipes.appendChild(row);
    });
    parent.appendChild(recipes);
  }
  function pauseTools(){
    var box=menuPage('pause-tools','FIELD MANUAL','手册 / 音效','返回暂停',pause);
    box.appendChild(button('查看生存手册','map-pick',function(){manual(pauseTools);}));
    preferenceRows(box);
  }
  function pause(){
    if(!g)return;
    var T=window.DisplayTier,box=sheet('paused','TACTICAL PAUSE　/　'+D.clock(g.time),'防御已暂停');
    var scroll=fragment('div','pause-scroll');
    scroll.appendChild(fragment('b','pause-location',g.mode==='campaign'?'第 '+g.stage+' 关 · '+C.stages[g.stage-1].name:'无尽深渊 · '+D.maps[g.map].short));
    if(g.mode==='endless'){
      var risk=C.virulence(g);
      scroll.appendChild(fragment('p','abyss-readout',risk.name+' · 毒力 Lv.'+risk.level+' · 新生敌人生命 '+Math.round(C.hpScale(g)*100)+'% · 接触伤害 '+Math.round(C.contactScale(g)*100)+'%'));
    }
    scroll.appendChild(pauseVitals());
    var owned=fragment('section','pause-owned-section'),cards=fragment('div','pause-owned-grid'),strip=fragment('div','pause-unowned-strip');
    var hint=fragment('div','pause-hint');hint.hidden=true;hint.setAttribute('role','status');
    function explain(text){hint.textContent=text;hint.hidden=false;}
    function skill(key,level,isSuper){
      var obj=D.upgrades[key]||D.actives[key]||D.supers[key],fixed=isSuper||obj.hero,cap=C.skillCap(g,key);
      var effect=isSuper?obj.effect:T.tierDesc(key,level||1,g.hero);
      var b=button('',level?'pause-owned-card':'pause-unowned-icon',function(){
        var detail=effect;
        if(level&&!fixed&&level<cap)detail=T.upgradeDelta(key,level,level+1,g.hero);
        else if(!level&&!C.skillAllowed(g,key))detail+=' · 当前构筑未开放';
        else if(level&&!fixed)detail+=' · 已满级';
        explain(obj.name+' · '+detail);
      });
      var cv=fragment('canvas','');cv.setAttribute('aria-hidden','true');
      R.upgradeIcon(cv,({mac:'c3',storm:'ros',synapse:'actin',dash:'actin',net:'c3',salvo:'ctl',rally:'turret'})[key]||key);
      b.appendChild(cv);b.setAttribute('aria-label',obj.name+' · '+(level?effect:'未获取，预览'));
      if(!level){strip.appendChild(b);return;}
      var copy=fragment('span','pause-skill-copy');copy.appendChild(fragment('b','',obj.name));
      var stars=isSuper?'✦ 已合成':obj.hero?'★ 职业主动':'★'.repeat(Math.min(3,level))+'☆'.repeat(Math.max(0,3-level))+' Lv.'+level;
      copy.appendChild(fragment('small','pause-stars',stars));
      b.appendChild(copy);b.appendChild(fragment('small','pause-effect',effect));cards.appendChild(b);
    }
    Object.keys(D.upgrades).forEach(function(key){
      if(key==='turret'&&g.hero.mode!=='summon')return;
      var lv=g.levels[key]||0;if(!lv||!D.actives[key])skill(key,lv,false);
    });
    Object.keys(D.supers).forEach(function(k){if(g.super[k])skill(k,1,true);});
    [1,2].forEach(function(slot){var info=window.ActiveSkills.status(g,slot);if(!info.locked)skill(info.key,g.levels[info.key]||1,false);});
    owned.appendChild(fragment('h3','','本局已激活技能'));
    owned.appendChild(cards.children.length?cards:fragment('div','pause-empty','收集抗原升级后，已选技能将在此高亮陈列'));scroll.appendChild(owned);
    if(strip.children.length){scroll.appendChild(fragment('h3','','未获取技能'));scroll.appendChild(strip);}
    scroll.appendChild(fragment('h3','','超武合成路线'));pauseRecipes(scroll);
    box.appendChild(scroll);box.appendChild(hint);
    var actions=fragment('div','pause-actions');actions.appendChild(button('继续防御','primary',function(){resume();}));
    var save=button('暂存并返回观测站','pause-secondary',function(){
      var run=g;save.disabled=true;
      function failed(){if(state==='paused'&&g===run){save.disabled=false;explain('存档尚未写入，请重试。');}}
      CP.save(run,H).then(function(ok){
        if(state!=='paused'||g!==run)return;
        if(!ok&&B.storage.available()){failed();return;}
        g=null;home();
      },failed);
    });
    actions.appendChild(save);actions.appendChild(button('手册 / 音效','pause-secondary',pauseTools));box.appendChild(actions);
  }
  function resume(ramp){setScreen('playing');previous=0;g.resumeAge=ramp===false?1:0;A.unlock();}
  function stats(){
    var l=g.levels,coffee=g.event&&g.event.id==='coffee'?D.events.coffee:null;g.capacity=(5+l.acid*2)*(g.super.storm?2:1);g.hitRadius=12;g.reachRadius=13*(1+.18*l.actin);
    g.radius=g.hero.mode==='cargo'?g.reachRadius:13;
    g.speed=g.hero.speed*(1+.10*l.actin);g.digest=Math.max(.42,1.8*(1-.2*l.acid));
    if(coffee){g.speed*=coffee.speedMult;g.reachRadius*=coffee.radiusMult;if(g.hero.mode==='cargo')g.radius=g.reachRadius;g.digest*=coffee.digestMult;}
  }
  function missionBrief(){
    g=null;
    var mission=C.briefing(mode,stage,P.data.selectedMap);
    var box=sheet('mission',mission.location,mission.title);
    var target=fragment('div','mission-target'),cv=fragment('canvas',''),details=fragment('div','');
    R.icon(cv,mission.icon,84,0,!!mission.elite);cv.setAttribute('aria-hidden','true');
    animateSheet(cv,function(t){if(state==='mission')R.icon(cv,mission.icon,84,t,!!mission.elite);});
    details.appendChild(fragment('small','','任务目标'));
    var goal=fragment('strong','');goal.id='mission-goal';
    if(mission.goalName){
      goal.appendChild(document.createTextNode(mission.goalLead));
      goal.appendChild(fragment('b','mission-name',mission.goalName));
      goal.appendChild(document.createTextNode(mission.goalTail));
    }else goal.textContent=mission.goal;
    details.appendChild(goal);
    target.appendChild(cv);target.appendChild(details);box.appendChild(target);
    var clocks=fragment('div','mission-clocks');
    [[mission.clockLabel,mission.clock],[mission.arrivalLabel,mission.arrival]].forEach(function(pair,i){
      var card=fragment('div',''),value=fragment('b','',pair[1]);
      if(i===0)value.id='mission-time';
      card.appendChild(fragment('small','',pair[0]));card.appendChild(value);clocks.appendChild(card);
    });
    box.appendChild(clocks);box.appendChild(fragment('p','mission-note',mission.note));
    var launch=button('开始行动','primary',function(){if(state==='mission')newGame();});
    var back=backButton('返回观测站',function(){returnHomeTo('start');});
    launch.id='mission-start';back.id='mission-back';box.appendChild(launch);box.appendChild(back);launch.focus();
  }
  function newGame(snapshot){
    resultId++;A.unlock();var levels={};Object.keys(D.upgrades).forEach(function(k){levels[k]=0;});
    g={time:0,kills:0,level:1,xp:0,next:D.nextXP(1),resumeAge:1,upgradeLead:0,hitStop:0,levels:levels,super:{mac:false,storm:false},p:{x:W*.5,y:H*.53,hp:100,cargo:[],angle:0,motion:0,inv:0,nucleusX:0,nucleusY:0,biteTime:-1},
      floaters:[],enemies:[],shots:[],orbs:[],films:[],effects:[],allies:[],nets:[],stick:null,ctl:{x:W*.5,y:H*.53},
      spawnIn:1,iggIn:1,ctlIn:1,macIn:2.5,waveIn:60,boss:null,bossSpawned:false,bossDead:false,hot:false,marked:0,
      bounces:0,lastHit:'clear',notice:'',noticeUntil:0};
    Q.config(g,P.data);C.configure(g,snapshot?snapshot.mode:mode,snapshot?snapshot.stage:stage,snapshot?snapshot.map:P.data.selectedMap);
    if(!snapshot)P.prepareRun(g);
    skillPaint=[];discovery=null;if(snapshot&&!CP.restore(g,snapshot,H)){CP.clear();g=null;home();return;}
    scope.classList.remove('level-flash');lastSlots='';lastHud=0;el('export-status').textContent='';stats();setScreen('playing');previous=0;
    if(snapshot){stats();resume();hud();if(g.pendingPick)offer(false,true);return;}
    [[-27,32],[61,-51],[-90,-43],[94,94],[-62,112],[33,16],[-41,-20]].forEach(function(o){spawn('staph',g.p.x+o[0],g.p.y+o[1]);});
    if(g.mode==='campaign'&&g.stage===1){spawn('staph',g.p.x+20,g.p.y-46);spawn('staph',g.p.x-42,g.p.y+40);}
    hud();
    if(g.mode==='campaign'&&g.stage===1&&P.data.cleared<1&&P.data.introduced.indexOf('guide/hud')<0){
      g.notice='';g.noticeUntil=-1;g.coaching=true;hud();showCoach(0);
    }else{
      notice(g.hero.name+' · '+g.hero.trait+'。'+D.maps[g.map].info,4);hud();CP.save(g,H);
    }
  }
  var coachIndex=0;
  var coachSteps=[
    {focus:'self',text:'你在操控这颗细胞。滑动屏幕，它就会跟着走。'},
    {focus:'level',text:'等级升高后，可以挑选一项免疫技能。'},
    {focus:'hp',text:'这是生命。被病菌撞到会下降。'},
    {focus:'time',text:'这是本关倒计时。时间走完前要打倒目标。'},
    {focus:'kills',text:'这里是已经清除的菌落数量。'},
    {focus:'cargo',text:'靠近病菌就会吞噬。消化需要时间，消化舱满了就先躲开。'},
    {focus:'enemy',text:'这些金色圆团是金黄色葡萄球菌。靠近才能吞下。'},
    {focus:'xp',text:'清除之后会掉落抗原。捡起来就能升级。'}
  ];
  function clearDemoOrb(){
    if(!g||!g.demoOrb)return;
    var i=g.orbs.indexOf(g.demoOrb);
    if(i>=0)g.orbs.splice(i,1);
    g.demoOrb=null;
  }
  function ensureDemoOrb(){
    if(g.demoOrb&&g.orbs.indexOf(g.demoOrb)>=0)return;
    var x=g.p.x+58,y=g.p.y+8;
    if(x>W-28)x=g.p.x-58;
    g.demoOrb={x:x,y:y,dx:0,dy:0,age:1,value:1.5,memory:false,demo:true};
    g.orbs.push(g.demoOrb);
  }
  function coachBox(node,pad,round){
    var scopeRect=scope.getBoundingClientRect();
    if(!node)return {left:scopeRect.width*.5-28,top:scopeRect.height*.45-28,width:56,height:56,round:true};
    var area=node.getBoundingClientRect();
    return {left:area.left-scopeRect.left-pad,top:area.top-scopeRect.top-pad,width:Math.max(44,area.width+pad*2),height:Math.max(36,area.height+pad*2),round:!!round};
  }
  function worldHole(x,y,r){
    var fieldRect=field.getBoundingClientRect(),scopeRect=scope.getBoundingClientRect();
    var sx=fieldRect.left+x*fieldRect.width/W,sy=fieldRect.top+y*fieldRect.height/H,sr=Math.max(22,r*fieldRect.width/W);
    return {left:sx-sr-scopeRect.left,top:sy-sr-scopeRect.top,width:sr*2,height:sr*2,round:true};
  }
  function coachHole(){
    var step=coachSteps[coachIndex]||coachSteps[0];
    if(step.focus==='self')return worldHole(g.p.x,g.p.y,Math.max(30,g.radius+18));
    if(step.focus==='enemy'){
      var enemy=g.enemies.filter(function(v){return !v.dead&&v.kind==='staph';})[0];
      return enemy?worldHole(enemy.x,enemy.y,enemy.r+16):worldHole(g.p.x+20,g.p.y-46,28);
    }
    if(step.focus==='xp'){ensureDemoOrb();return worldHole(g.demoOrb.x,g.demoOrb.y,20);}
    clearDemoOrb();
    var nodes={level:scope.querySelector('.avatar'),hp:scope.querySelector('.meter.life'),time:scope.querySelector('.telemetry'),kills:scope.querySelector('.combat-tally'),cargo:el('cargo')};
    return coachBox(nodes[step.focus],step.focus==='cargo'?6:8,false);
  }
  function placeCoach(){
    if(!g||!g.coaching)return;
    var box=coachHole(),ring=el('coach-ring'),card=el('coach-card');
    ring.style.left=box.left+'px';ring.style.top=box.top+'px';ring.style.width=box.width+'px';ring.style.height=box.height+'px';
    ring.style.borderRadius=box.round?'50%':'16px';
    var scopeH=scope.getBoundingClientRect().height,cardH=card.offsetHeight||132;
    if(box.top>cardH+20)card.style.top='12px';
    else{
      var below=box.top+box.height+12;
      card.style.top=(below+cardH<scopeH-8?below:Math.max(12,scopeH-cardH-12))+'px';
    }
  }
  function endCoach(){
    if(!g||!g.coaching)return;
    clearDemoOrb();g.coaching=false;el('coach').hidden=true;
    notice(g.hero.name+' · '+g.hero.trait+'。'+D.maps[g.map].info,4);hud();
    P.introduce('guide/hud');CP.save(g,H);
  }
  function showCoach(index){
    if(!g)return;
    if(index>=coachSteps.length){endCoach();return;}
    coachIndex=index;
    if(coachSteps[index].focus==='xp')ensureDemoOrb();else clearDemoOrb();
    el('coach').hidden=false;
    el('coach-text').textContent=coachSteps[index].text;
    el('coach-next').textContent=index===coachSteps.length-1?'知道了，开始':'下一步';
    placeCoach();
  }
  function notice(s){
    var labels=[['疫苗','疫苗记忆唤醒'],['冰美式','冰美式 · 消化加速'],['熬夜','熬夜 · 经验加成'],['广谱','抗生素空投'],['高烧','高烧 · 免疫加速'],['局部炎症','炎症援军抵达'],['菌王入侵','菌王入侵'],['耐药菌潮','耐药菌潮抵达']];
    var found=labels.filter(function(pair){return s.indexOf(pair[0])===0;})[0];
    g.notice=found?found[1]:s.split(' · ')[0].slice(0,10);g.noticeUntil=g.time+1.6;
  }
  function spawn(kind,x,y,force){
    if(!force && g.enemies.length>=C.spawnLimit(g) && kind!=='boss')return;
    var s=D.species[kind]||{hp:3,r:4,speed:118};
    var pair=kind==='salmonella'&&x==null;
    if(x==null){var edge=Math.floor(Math.random()*4);x=edge<2?(edge?W+15:-15):Math.random()*W;y=edge>=2?(edge===2?-15:H+15):Math.random()*H;}
    var e={kind:kind,x:x,y:y,r:s.r,hp:s.hp,max:s.hp,speed:s.speed,angle:Math.random()*TAU,age:0,split:5,armor:0,root:0,
      mark:false,turn:0,trail:0,fuse:9,plasmid:3,dead:false};
    if(kind==='acineto'){e.resistant=true;e.armor=3;}if(kind==='cmv')e.fuse=11;
    C.scaleEnemy(g,e);g.enemies.push(e);Q.trackEnemy(g,e,g.enemies.length-1);
    if(pair)spawn(kind,x+14,y+12);
    return e;
  }
  function chooseSpawn(){return C.spawnKind(g);}
  function fx(kind,x,y,r,col,duration){
    if(g.effects.length<230)g.effects.push({kind:kind,x:x,y:y,r:r,color:col,age:0,duration:duration||.4,dx:(Math.random()-.5)*32,dy:(Math.random()-.5)*32});
  }
  function sparks(x,y,col,count){for(var i=0;i<(count||6);i++)fx('spark',x,y,1,col,.4);}
  function orb(x,y,val,memory){
    if(g.mode==='campaign'&&g.stage<=4)val*=1.55-.05*g.stage;
    if(g.event && g.event.id==='stayup')val*=D.events.stayup.xpMult;
    if(g.orbs.length>=35&&!memory){
      var merged=g.orbs.filter(function(o){return !o.demo&&!o.memory&&o.value<15&&Math.hypot(o.x-x,o.y-y)<28;})[0];
      if(merged){merged.value+=val;return;}
    }
    if(g.orbs.length>=160){g.orbs[0].value+=val;if(memory)g.orbs[0].memory=true;return;}
    var a=Math.random()*TAU;g.orbs.push({x:x,y:y,dx:Math.cos(a)*40,dy:Math.sin(a)*40,age:0,value:val,memory:!!memory});
  }
  function nearest(from,prefer,range,exclude){
    var bestE=null,bestDistance=Infinity,preferred=false;
    Q.nearby(g,from,range).forEach(function(e){
      if(e.dead||e===exclude)return;
      var dx=e.x-from.x,dy=e.y-from.y,d=dx*dx+dy*dy;
      if(d>range*range)return;
      var matches=!!(prefer&&prefer(e));
      if((matches&&!preferred)||(matches===preferred&&d<bestDistance)){bestDistance=d;bestE=e;preferred=matches;}
    });return bestE;
  }
  function shot(kind,from,target,damage,hops,exclude){
    if(!target || g.shots.length>=240)return;
    g.shots.push({kind:kind,x:from.x,y:from.y,target:target,a:angle(from,target),damage:damage,hops:hops||0,
      life:2.4,exclude:exclude,speed:kind==='ctl'?250:kind==='igg'?175:200});
  }
  function complement(from){
    if(!g.levels.c3)return;
    if(g.event&&g.event.id==='stayup'){
      // Complement is kill-triggered. Stretch the spacing of its queued volleys during fatigue.
      var fatigue=D.events.stayup,elapsed=g.time-(g.event.until-fatigue.duration);
      g.delayedC3.push({x:from.x,y:from.y,at:g.time+elapsed*(fatigue.cooldownMult-1)});return;
    }
    emitC3(from);
  }
  function emitC3(from){
    var targets=Q.nearby(g,from,220).filter(function(e){return !e.dead && dist(from,e)<220;});
    targets.sort(function(a,b){return dist(from,a)-dist(from,b);});
    for(var i=0;i<3&&targets.length;i++)shot('c3',from,targets[i%targets.length],4+3*g.levels.c3,1);
  }
  function killed(e){
    if(e.dead)return;breakLinks(e);e.dead=true;Q.onRemoval(g,e,ops,false);if(!e.mirrorFor&&!e.coreFor)Q.countClear(g,e.kind,e,ops);sparks(e.x,e.y,(D.species[e.kind]||D.species.latent).color,9);
    if(e.bossSerial){
      C.bossGone(g);
      if(g.mode==='campaign'&&g.bossDead){
        g.lastBossKind=e.kind;g.lastBossX=e.x;g.lastBossY=e.y/H;g.lastBossRadius=e.r;g.lastBossTime=g.time;
      }
      notice(g.mode==='endless'?'领主已清除':g.boss?'尚有领主在场':'关底目标已清除');
    }
    A.play('burst');if(e.bossSerial)g.hitStop=.03;fx('ring',e.x,e.y,e.r+8,'#b8ffe9');orb(e.x,e.y,D.antigenValue(e,false));complement(e);
  }
  function damage(e,n,pierce,direction,cap,source){
    if(e.dead)return;e.hurt=.09;e.impact=typeof direction==='number'?direction:angle(g.p,e);
    A.play(e.resistant||e.armor>0?'shield':'impact');
    if(e.resistant||e.armor>0)e.guardUntil=g.time+.14;
    if(g.vaccineUntil>g.time&&e.kind===g.counterKind)n*=1.35;
    var sensitizer=g.levels.ifn||0;
    if(e.vulnerableUntil>g.time)n*=1+D.vulnerability(sensitizer)/100;
    if(source&&source!=='mist'&&sensitizer){n*=1+.05*sensitizer;e.vulnerableUntil=g.time+3;}
    if(cap!=null)n=Math.min(n,cap);
    if(e.shell>0){
      var powered=g.enemies.some(function(v){return !v.dead&&v.supplyFor===e.bossSerial;});
      if(powered){
        e.shell=Math.max(0,e.shell-n*(pierce?1:.45));e.guardUntil=g.time+.2;
        if(!e.shell)Q.phaseImpact(g,e,ops);
        floatLabel(e.shell?'耐药壳':'护盾破裂',e.x,e.y-e.r,'#ffd486');return;
      }
      e.shell=0;Q.phaseImpact(g,e,ops);
    }
    n=Q.bossDefense(g,e,n,pierce,source,ops);
    e.hp-=n*(e.armor > 0 && !pierce ? .38 : 1)*(e.resistant&&!pierce ? .5 : 1);if(e.hp<=0)killed(e);
  }
  function area(at,r,n,color,acid,ros,exclude){
    fx('ring',at.x,at.y,r,color,.42);Q.nearby(g,at,r,true).forEach(function(e){
      if(e!==exclude && !e.dead && dist(at,e)<=r+e.r){if((acid||ros)&&Q.alkali(g,e)){e.guardUntil=g.time+.18;floatLabel('氨云免疫',e.x,e.y-e.r,'#e0b3ff');A.play('shield');return;}if(acid && D.capsule(e.kind))e.mark=true;damage(e,n,false);}
    });
  }
  function floatLabel(text,x,y,color){
    // Cosmetic feedback has its own budget and never consumes gameplay random numbers.
    if(g.floaters.some(function(f){return f.text===text && g.time-f.born<.32;}))return;
    var key=text!=='消化完成!'&&text!=='+5 HP'&&text!=='+EXP';
    var channel=g.floaters.filter(function(f){return f.key===key;});
    if(channel.length>=(key?4:3)){
      if(!key)return;
      g.floaters.splice(g.floaters.indexOf(channel[0]),1);
    }
    var below=0;
    if(y<H*.4){
      var fieldRect=field.getBoundingClientRect(),px=fieldRect.left+x*fieldRect.width/W;
      var halfWidth=(text.length*5+4)*fieldRect.width/W;
      var bottom=Math.max(el('pause').parentNode.getBoundingClientRect().bottom,el('xp').parentNode.getBoundingClientRect().bottom);
      [el('core-dock'),el('bossbar')].forEach(function(node){
        if(node.hidden)return;
        var box=node.getBoundingClientRect();
        if(box.width>2&&px+halfWidth>=box.left&&px-halfWidth<=box.right)bottom=Math.max(bottom,box.bottom);
      });
      bottom=(bottom-fieldRect.top)*H/fieldRect.height;
      if(y-35<bottom)below=Math.max(y+36,bottom+12);
    }
    g.floaters.push({text:text,x:x,y:y,below:below,born:g.time,color:color,key:key});
  }
  function stormPulse(units){
    if(!g.super.storm)return;
    g.stormLoad+=units;
    if(g.stormLoad<4)return;
    g.stormLoad-=4;A.play('super');var before=g.kills;area(g.p,155,65,'#d2f8ff',false,true);if(g.kills-before>=12)g.swept=true;
  }
  function finishCargo(v){
    var p=g.p;Q.countClear(g,v.kind,p,ops);p.hp=Math.min(g.hero.hp,p.hp+1.4);A.play('digest');sparks(p.x,p.y,'#ffda6e');floatLabel('消化完成!',p.x,p.y-g.radius,'#ffedac');
    var a=Math.random()*TAU;
    orb(p.x+Math.cos(a)*17,p.y+Math.sin(a)*17,D.antigenValue(v,true));
    if(g.levels.acid)area(p,28+g.levels.acid*5,2+g.levels.acid,'#a9da7b',true);
    if(g.levels.ros){area(p,46+g.levels.ros*14,7+g.levels.ros*6,'#f8c463',false,true);}
    stormPulse(D.cargoSlots(v.kind));
    complement(p);
  }
  function hit(e,amount){
    var p=g.p;if(p.inv>0)return;
    amount*=C.contactScale(g);
    if(g.shieldUntil>g.time&&g.shieldHP>0){var blocked=Math.min(amount,g.shieldHP);g.shieldHP-=blocked;amount-=blocked;if(!amount){p.inv=.65;A.play('shield');return;}}
    p.hp=Math.max(0,p.hp-amount);if(g.lowSince<0&&p.hp>0&&p.hp<g.hero.hp*.12)g.lowSince=g.time;p.inv=.65;g.shakeAt=g.time;g.lastHit=e.kind;A.play('hit');B.vibrate('heavy');fx('ring',p.x,p.y,27,'#fc8876',.3);
  }
  function movePlayer(dt){
    var p=g.p,dx=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);
    var dy=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0);
    if(g.stick && !dx && !dy){dx=g.stick.dx;dy=g.stick.dy;}
    var len=Math.hypot(dx,dy);p.motion=Math.min(1,len);if(len>1){dx/=len;dy/=len;}
    var speed=g.speed*(Q.occupancy(p)>=g.capacity ? .7 : 1)*Q.fibrin(g,{x:p.x,y:p.y,r:g.radius},true);
    var film=g.films.find(function(v){return !(v.warm>0)&&dist(p,v)<v.r&&v.kind==='toxin';});
    if(film&&!(film.tickAt>g.time)){hit({kind:'boss_cdiff'},3);film.tickAt=g.time+1;}
    if(g.shieldUntil>g.time)speed=g.speed;
    else if(film||g.films.some(function(v){return !(v.warm>0)&&dist(p,v)<v.r;}))speed*=.56;
    var follow=1-Math.exp(-dt*6);
    p.nucleusX+=(-dx*.15-p.nucleusX)*follow;p.nucleusY+=(-dy*.15-p.nucleusY)*follow;
    if(len)p.angle=Math.atan2(dy,dx);p.x=clamp(p.x+dx*speed*dt,g.hitRadius,W-g.hitRadius);p.y=clamp(p.y+dy*speed*dt,g.hitRadius,H-g.hitRadius);
    p.inv=Math.max(0,p.inv-dt);
    for(var i=p.cargo.length-1;i>=0;i--){
      var v=p.cargo[i],result=Q.cargoStep(g,v,dt,ops);
      if(result){p.cargo.splice(i,1);if(result==='digest')finishCargo(v);if(p.hp<=0)break;}
    }
  }
  function strikeCaptain(e){
    if(e.struckAt!=null&&g.time-e.struckAt<.65)return;
    e.struckAt=g.time;
    var a=angle(g.p,e);
    damage(e,14+g.levels.actin*3);
    e.x+=Math.cos(a)*13;e.y+=Math.sin(a)*13;
    floatLabel(Q.armoredCaptain(e)?'重装 · 先削血':'破甲 · 可处决',e.x,e.y-e.r,'#ffcf81');
    Q.trackEnemy(g,e,g.enemies.indexOf(e));
  }
  function contact(e){
    var p=g.p,space=g.capacity-Q.occupancy(p),shield=D.capsule(e.kind)&&!e.mark;
    var edible=g.hero.mode==='cargo'&&!e.bossSerial&&!e.mirrorFor&&!shield&&!e.hypha&&e.kind!=='virus'&&!D.infected(e.kind)&&space>=D.cargoSlots(e.kind);
    if(dist(p,e)>(edible?g.reachRadius:g.hitRadius)+e.r*.85)return;
    if(Q.armoredCaptain(e)&&(g.hero.mode==='cargo'||g.hero.mode==='nets')){
      strikeCaptain(e);if(!e.dead)hit(e,9);return;
    }
    if(g.hero.mode==='nets'&&!e.bossSerial&&!e.mirrorFor&&!e.hypha){Q.neutroKill(g,e,ops);return;}
    if(e.elite&&(g.hero.mode==='cargo'||g.hero.mode==='nets')&&!shield&&(e.struckAt==null||g.time-e.struckAt>=.8)){
      e.struckAt=g.time;damage(e,14+g.levels.actin*3);if(e.dead)return;
    }
    if(e.kind==='virus'){hit(e,8);if(!p.hp&&g.hero.mode==='cargo'&&space===0)g.fullDeath=true;e.dead=true;return;}

    var tooBig=g.hero.mode==='cargo' && space<D.cargoSlots(e.kind);
    if(shield||e.bossSerial||D.infected(e.kind)||e.mirrorFor||tooBig||e.hypha||g.hero.mode!=='cargo'){
      var contactHit=p.inv<=0;
      if(contactHit&&(tooBig||shield))A.play('shield');
      if(contactHit && tooBig){g.fullBounces+=space===0?1:0;if(D.cargoSlots(e.kind)>1)floatLabel('槽位不足！',p.x,p.y-16,'#ffcdab');}
      if(contactHit && !shield)g.pneumoStreak=0;
      if(shield && p.inv<=0){
        g.bounces++;g.pneumoStreak++;g.bestPneumoStreak=Math.max(g.bestPneumoStreak,g.pneumoStreak);floatLabel('滑开了! 需抗体',(p.x+e.x)/2,(p.y+e.y)/2-10,'#f1fdff');
      }
      hit(e,e.elite?4:shield?5:e.hypha?15:e.bossSerial?18:10);
      if(p.hp<=0&&space===0&&g.hero.mode==='cargo')g.fullDeath=true;
      var a=angle(e,p);p.x=clamp(p.x+Math.cos(a)*7,g.hitRadius,W-g.hitRadius);p.y=clamp(p.y+Math.sin(a)*7,g.hitRadius,H-g.hitRadius);
      if(!e.bossSerial&&!e.mirrorFor){e.x-=Math.cos(a)*7;e.y-=Math.sin(a)*7;}
      return;
    }
    swallow(e);
  }
  function breakLinks(e){
    g.enemies.forEach(function(b){if((b===e||b.partner===e)&&b.partner&&b.linkTime>0&&b.linkTime<2.5){
      g.cutLinks++;b.partner=null;b.linkTime=0;
    }});
  }
  function swallow(e){
    var p=g.p;
    if(!e.dead&&g.hero.mode==='cargo'&&Q.armoredCaptain(e)){strikeCaptain(e);return false;}
    if(e.dead||g.hero.mode!=='cargo'||e.bossSerial||e.mirrorFor||e.hypha||e.kind==='virus'||D.infected(e.kind)||(D.capsule(e.kind)&&!e.mark)||g.capacity-Q.occupancy(p)<D.cargoSlots(e.kind))return false;
    breakLinks(e);Q.onRemoval(g,e,ops,true);g.pneumoStreak=0;p.biteTime=g.time;p.cargo.push({kind:e.kind,progress:0,wave:e.wave,ejected:e.ejected,cloned:e.cloned,resistant:e.resistant});e.dead=true;A.play('eat');B.vibrate('light');sparks(e.x,e.y,D.species[e.kind].color);return true;
  }
  function enemyStep(e,dt){
    if(e.dead)return;e.hurt=Math.max(0,(e.hurt||0)-dt);e.age+=dt;e.armor=Math.max(0,e.armor-dt);e.root=Math.max(0,e.root-dt);
    Q.enemyTraits(g,e,dt,ops);
    if(e.kind==='staph' && !e.elite && e.age>=e.split){
      e.split=e.age+5;if(g.enemies.length<Math.min(85,C.spawnLimit(g))){var child=spawn('staph',e.x+(Math.random()-.5)*20,e.y+(Math.random()-.5)*20);child.cloned=true;}
    }
    if(D.infected(e.kind)&&!e.elite){
      e.fuse-=dt;if(e.fuse<=0){e.dead=true;fx('ring',e.x,e.y,36,'#ed98b3');
        var cmv=e.kind==='cmv',count=cmv?12:8;
        for(var i=0;i<count;i++){var vir=spawn('virus',e.x,e.y);if(vir){vir.angle=e.angle+TAU*i/count;if(cmv&&i%2)vir.speed*=.56;}}return;}
    }
    if(e.bossSerial&&!e.elite&&Q.bossAction(g,e,dt,ops)){contact(e);return;}
    var gait=e.speed*(g.hot?1.15:1);
    if(g.mode==='endless'&&!e.bossSerial&&D.species[e.kind])gait=Math.min(gait,1.42*D.species[e.kind].speed);
    var vel=gait*(e.slowUntil>g.time?.6:1)*Q.fibrin(g,e,false);
    if(g.colonyFilmUntil>g.time&&!e.bossSerial&&e.kind!=='virus'&&g.films.some(function(v){return v.kind==='colony'&&dist(v,e)<v.r;}))vel*=1.4;
    if(e.crossUntil>g.time){vel*=2.4;}
    else if(e.kind==='rod'||e.kind==='salmonella'){
      e.turn-=dt;if(e.turn<=0){e.angle=angle(e,g.p)+(Math.random()-.5)*1.45;e.turn=(e.kind==='rod'?.8:.62)+Math.random()*.26;}
      vel*=e.turn>.52?1.85:.66;
      e.trail-=dt;if(e.kind==='rod'&&e.trail<=0 && !e.root){e.trail=.32;g.films.push({x:e.x,y:e.y,r:12,life:3.5});}
    }else if(e.kind!=='virus')e.angle=angle(e,g.p);
    if(!e.root){e.x+=Math.cos(e.angle)*vel*dt;e.y+=Math.sin(e.angle)*vel*dt;}
    if(e.kind==='virus' && (e.age>4||e.x< -20||e.x>W+20||e.y< -20||e.y>H+20)){e.dead=true;return;}
    contact(e);
  }
  function allyWave(){
    for(var i=0;i<2;i++){
      var x=i?W+8:-8,y=H*(.13+Math.random()*.74),start={x:x,y:y};
      var target=nearest(start,null,1000)||g.p, a=Math.atan2(clamp(target.y-y,-H*.4,H*.4),i?-W:W);
      g.allies.push({x:x,y:y,a:a,netIn:.4,hit:[],life:4});
    }
  }
  function allies(dt){
    g.allies.forEach(function(f){
      f.x+=Math.cos(f.a)*150*dt;f.y+=Math.sin(f.a)*150*dt;f.netIn-=dt;f.life-=dt;
      if(f.netIn<=0){g.nets.push({x:f.x,y:f.y,r:38,life:3,caught:[]});f.netIn=.95;}
      Q.nearby(g,f,11,true).forEach(function(e){
        if(!e.dead && dist(e,f)<e.r+11 && f.hit.indexOf(e)<0){damage(e,22);f.hit.push(e);}
      });
    });
    g.allies=g.allies.filter(function(f){return f.life>0 && f.x> -24 && f.x<W+24;});
  }
  function weapons(dt){
    var p=g.p,l=g.levels;
    var fatigue=g.event&&g.event.id==='stayup'?D.events.stayup.cooldownMult:1;
    var weaponTime=dt/D.cooldownScale(l);
    g.iggIn-=weaponTime/fatigue;g.ctlIn-=weaponTime/fatigue;g.macIn-=weaponTime;
    if(l.igg && g.iggIn<=0){
      var t=nearest(p,function(e){return D.capsule(e.kind)&&!e.mark;},330);
      if(t){shot('igg',p,t,5+l.igg*3);A.play('shot');g.iggIn=Math.max(.28,1.24-.22*l.igg);}
    }
    if(l.ctl && g.hero.mode!=='summon'){
      g.ctl.x=p.x+Math.cos(g.time*2)*29;g.ctl.y=p.y+Math.sin(g.time*2)*29;
      if(g.ctlIn<=0){var v=nearest(g.ctl,function(e){return D.infected(e.kind)||e.hypha;},370);
        if(v){shot('ctl',g.ctl,v,15+l.ctl*8+(D.infected(v.kind)?18:0));g.ctlIn=1.7-l.ctl*.25;}}
    }
    if(g.super.synapse){
      g.synapseIn-=weaponTime;
      if(g.synapseIn<=0){
        var prey=nearest(p,function(e){return e.supplyFor||D.infected(e.kind)||e.bossSerial;},320);
        if(prey){g.synapseIn=2.8;window.ActiveSkills.fireRay(g,'synapse',prey,angle(p,prey));
          damage(prey,48,true,null,null,'beam');floatLabel('突触暴击',prey.x,prey.y-18,'#ffda86');}
      }
    }
    if(g.super.matrix){
      g.matrixIn=(g.matrixIn||0)-weaponTime;
      if(g.matrixIn<=0){
        var lock=nearest(p,function(e){return e.vulnerableUntil>g.time;},360);
        if(lock){g.matrixIn=2.6;for(var i=0;i<3;i++){
          var a=g.time+i*TAU/3;shot('matrix',{x:p.x+20*Math.cos(a),y:p.y+20*Math.sin(a)},lock,12);
        }}
      }
    }
    if(g.super.mac && g.macIn<=0){
      var top=null;g.enemies.forEach(function(e){if(!e.dead && (!top||top.hp<e.hp))top=e;});
      if(top){var before=g.kills;g.macIn=3.2;damage(top,top.max*.25+12,true,null,top.bossSerial?Math.min(75,top.max*.045):null);fx('hole',top.x,top.y,top.r*.87,'#fff8b4',.6);area(top,75,24,'#9df8e4',false,false,top);if(g.kills-before>=12)g.swept=true;A.play('super');}
    }
  }
  function projectile(s,dt){
    if(s.life<=0)return;s.life-=dt;
    if(s.kind==='sporebolt'){
      s.a+=(s.curve||0)*dt;s.x+=Math.cos(s.a)*s.speed*dt;s.y+=Math.sin(s.a)*s.speed*dt;
      if(dist(s,g.p)<g.hitRadius+3){hit({kind:s.from},7);s.life=0;}return;
    }
    if(s.kind==='plasmid'){
      s.x+=Math.cos(s.a)*s.speed*dt;s.y+=Math.sin(s.a)*s.speed*dt;
      var e=nearest(s,function(v){return !v.bossSerial&&!v.mirrorFor&&v.kind!=='virus';},36);
      if(e && !e.bossSerial&&!e.mirrorFor&&e.kind!=='virus'&&dist(e,s)<e.r+4){e.armor=6;s.life=0;}return;
    }
    if(!s.target||s.target.dead)s.target=nearest(s,null,235,s.exclude);
    var t=s.target;if(!t){s.life=0;return;}s.a=angle(s,t);
    if(dist(s,t)<=s.speed*dt+t.r){
      if((s.kind==='igg'||s.kind==='matrix')&&D.capsule(t.kind)&&!t.mark){t.mark=true;g.marked++;}
      damage(t,s.damage,false,s.a,null,s.kind);s.life=0;sparks(t.x,t.y,s.kind==='ctl'?'#9dbfff':'#c1e4a1');
      if(s.hops>0)shot('c3',t,nearest(t,null,150,t),s.damage,s.hops-1,t);
    }else{s.x+=Math.cos(s.a)*s.speed*dt;s.y+=Math.sin(s.a)*s.speed*dt;}
  }
  function pickups(dt){
    g.orbs=g.orbs.filter(function(o){
      if(o.demo)return true;
      o.age+=dt;o.x+=o.dx*dt;o.y+=o.dy*dt;o.dx*=Math.exp(-4*dt);o.dy*=Math.exp(-4*dt);
      var d=dist(o,g.p);
      var reach=(g.hero.mode==='summon'?150:80)+(g.hero.mode==='cargo'?0:18*g.levels.actin)+(o.value>=2.5?62:0);
      reach*=1+(g.magnetBonus||0)/100;
      if(o.age>.24 && (d<reach||g.rallyUntil>g.time)){var step=Math.min(d,dt*(g.rallyUntil>g.time?430:155));o.x+=(g.p.x-o.x)*step/(d||1);o.y+=(g.p.y-o.y)*step/(d||1);}
      if(o.age>.24 && dist(o,g.p)<g.radius+4){g.xp+=o.value;g.pickupAt=g.time;A.play('pickup');return false;}return true;
    });
  }
  var bonuses={heal:{name:'组织修复',effect:'立即恢复 30 点生命。',science:'组织修复伴随炎症消退。'},
    clear:{name:'清道夫脉冲',effect:'清除附近威胁，造成 60 点范围伤害。',science:'吞噬细胞参与清除受损组织碎片。'},
    collect:{name:'抗原回收',effect:'立即回收全场抗原，并恢复 8 点生命。',science:'抗原加工为后续呈递提供素材。'}};
  function evolve(){
    Object.keys(D.supers).forEach(function(key){var s=D.supers[key];if(!g.super[key]&&C.recipeReady(g,key)){
      g.super[key]=true;notice('超武合成 · '+s.name,5);A.play('super');}});
  }
  function tierRows(key,compact){
    var list=fragment('div',compact?'pick-tier-list':'skill-intro-tiers');
    var count=compact?C.skillCap(g,key):3;
    for(var lv=1;lv<=count;lv++){
      var row=fragment('div','skill-tier-item'),badge=fragment('span','lv-badge','Lv.'+lv);
      badge.setAttribute('data-level',String(lv));row.appendChild(badge);
      var desc=Tiers.tierDesc(key,lv,g.hero),line=fragment('span','tier-line');
      if(compact){desc.split(' · ').forEach(function(part){line.appendChild(fragment('span','pick-metric',part));});}
      else line.textContent=desc;
      row.appendChild(line);
      if(!compact){
        var steps=fragment('span','tier-steps');steps.setAttribute('aria-hidden','true');
        for(var i=0;i<4;i++)steps.appendChild(fragment('i',i<=lv?'lit':''));
        row.appendChild(steps);
      }
      list.appendChild(row);
    }
    return list;
  }
  function deltaLine(key,lv){
    var line=fragment('small','pick-delta'),delta=Tiers.upgradeDelta(key,lv,lv+1,g.hero);
    delta.split(' · ').forEach(function(part){
      var at=part.indexOf('▸'),metric=fragment('span','pick-metric');
      if(at<0)metric.appendChild(fragment('span',!lv?'tier-gain':'',part));
      else{
        metric.appendChild(document.createTextNode(part.slice(0,at+1)));
        metric.appendChild(fragment('span','tier-gain',part.slice(at+1)));
      }
      line.appendChild(metric);
    });
    return line;
  }
  var counters={acid:'荚膜破盾，缩短结核消化。',actin:'更容易追上冲刺杆菌。',ros:'贴近密集菌群释放，避开氨云。',igg:'优先追踪完整荚膜。',c3:'清除成团目标触发弹射。',ctl:'优先点杀感染细胞与菌丝。',turret:'在光环内提高友军攻速。',ifn:'用光束或弹幕标记目标，接下来 3 秒集火收益更高。',mhc:'每清除 12 个敌人，额外凝聚一颗金色记忆抗原。'};
  var tactics={
    boss_cdiff:'拆掉三颗芽孢核，再打虚弱的巨兽。',boss_crypto:'从弹幕缺口横移，瞄准金色核仁。',boss_biofilm:'击破青色连线末端的护卫。',
    staph:'空槽时贴近吞噬；满载就拉开。',pneumo:'IgG 标记　/　溶酶体酸蚀破盾',rod:'横向避开冲刺，绕过绿色黏液。',latent:'CTL 远程点杀　/　NK 穿孔素',
    tb:'酸化加速消化，至少预留两格。',ecoli:'优先打断绿线相连的菌体。',pylori:'进入云中，单体清除中心菌。',candida:'趁孢子阶段吞噬，菌丝交给远程火力。',
    boss:'躲开红带，击破连线供能体。',phage:'主动触碰，引导它附着高血量目标。',bifido:'保留友军，收集它放出的回血球。'
  };
  function brief(key,skill,target,done){
    A.play('discover');var id=(skill?'skill/':'species/')+key,meta=(skill?D.upgrades:D.species)[key];
    var box=sheet('brief',skill?'新免疫技能入列':'首次观测 · '+meta.danger+' 级',meta.name);
    var body=fragment('div','briefing'),cv=fragment('canvas','');
    cv.style.width=cv.style.height='80px';body.appendChild(cv);
    if(skill){
      R.upgradeIcon(cv,key);
      body.appendChild(tierRows(key,false));
      Object.keys(D.supers).forEach(function(k){var recipe=D.supers[k];
        var partner=recipeMate(recipe,key);
        if(partner){
          var hint=fragment('div','synergy-callout','搭配 '+groupName(partner)+'，双 Lv.3　→　');
          hint.appendChild(fragment('strong','',recipe.name));body.appendChild(hint);
        }
      });
      if(key==='turret')body.appendChild(paragraph(meta.science));
    }else{
      R.icon(cv,key,80,0);
      body.appendChild(fragment('p','brief-threat',meta.info));var hint=fragment('div','brief-counter');
      var tools=({pneumo:['igg','acid'],latent:['ctl'],tb:['acid'],candida:['ctl'],staph:['actin']})[key]||[];
      tools.forEach(function(k){var icon=fragment('canvas','');R.upgradeIcon(icon,k);icon.style.cssText='display:inline-block;width:24px;height:24px;margin:0 4px 0 0;vertical-align:middle;';hint.appendChild(icon);});
      hint.appendChild(document.createTextNode(tactics[key]||meta.roast));body.appendChild(hint);
    }
    discovery={cv:cv,key:key,skill:skill,target:target,last:0};box.appendChild(body);
    box.appendChild(button(skill?'进入技能选择':'记入图鉴，继续巡逻','primary',function(){
      P.introduce(id);discovery=null;done();
    }));
  }
  function encounter(){
    if(g.time<(g.scanAfter||0))return false;
    g.scanAfter=g.time+.12;
    var lists=[g.enemies,g.phages,g.bifidos];
    for(var j=0;j<lists.length;j++)for(var i=0;i<lists[j].length;i++){
      var e=lists[j][i],k=j===1?'phage':j===2?'bifido':e.kind;
      if(e.dead||e.coreFor||e.mirrorFor||!D.species[k]||e.x<28||e.x>W-28||e.y<28||e.y>H-28||P.data.introduced.indexOf('species/'+k)>=0)continue;
      brief(k,false,e,resume);return true;
    }return false;
  }
  function offer(reroll,restore){
    if(!restore){
      if(!reroll){g.xp-=g.next;g.level++;Q.levelUp(g);g.next=D.nextXP(g.level);A.play('up');}
      var pool=Object.keys(g.levels).filter(function(k){return C.skillAllowed(g,k)&&g.levels[k]<C.skillCap(g,k);});
      var preferred=reroll?pool.filter(function(k){return g.lastChoices.indexOf(k)<0;}):[],draw=[];
      while(draw.length<3&&pool.length){var bag=preferred.length?preferred:pool,k=sample(bag);
        pool.splice(pool.indexOf(k),1);if(preferred.length)preferred.splice(preferred.indexOf(k),1);draw.push(k);}
      Object.keys(bonuses).forEach(function(k){if(draw.length<3)draw.push(k);});g.lastChoices=draw;
    }
    g.pendingPick=true;if(!restore)CP.save(g,H);
    var choices=g.lastChoices;
    var unseen=choices.filter(function(k){return D.upgrades[k]&&P.data.introduced.indexOf('skill/'+k)<0;});
    if(unseen.length){brief(unseen[0],true,null,function(){offer(false,true);});return;}
    g.pickAfter=performance.now()+300;
    var box=sheet('upgrade','IMMUNE ADAPTATION   /   LV.'+g.level,'选择免疫升级');
    var scroll=fragment('div','upgrade-scroll'),build=fragment('div','build-summary');scroll.appendChild(build);
    Object.keys(g.levels).forEach(function(k){if(g.levels[k]){var cv=fragment('canvas','');R.upgradeIcon(cv,k);var item=fragment('span','');item.title=D.upgrades[k].name;item.appendChild(cv);item.appendChild(document.createTextNode('·'+g.levels[k]));build.appendChild(item);}});
    build.appendChild(fragment('small','','双 Lv.3 可进化 · 暂停查看合成路线'));
    choices.forEach(function(k){
      var data=D.upgrades[k]||bonuses[k],lv=g.levels[k]||0,isSkill=!!D.upgrades[k];
      var card=fragment('div','pick-card'),b=button('','pick-main',function(){
        if(state!=='upgrade'||performance.now()<g.pickAfter)return;
        g.pendingPick=false;if(isSkill){g.levels[k]++;A.play('equip');}else if(k==='clear')area(g.p,140,60,'#eff9ba');
        else if(k==='heal')g.p.hp=Math.min(g.hero.hp,g.p.hp+30);
        else{g.orbs.forEach(function(o){if(!o.demo)g.xp+=o.value;});g.orbs=g.orbs.filter(function(o){return o.demo;});g.p.hp=Math.min(g.hero.hp,g.p.hp+8);}
        evolve();stats();resume();hud();CP.save(g,H);
      });
      var cv=fragment('canvas',''),copy=fragment('span','pick-copy');R.upgradeIcon(cv,k);b.appendChild(cv);
      copy.appendChild(fragment('b','',data.name));if(isSkill)copy.appendChild(fragment('em','',(lv>=3?'基因过载':'●●●'.slice(0,lv+1)+'○○○'.slice(lv+1))+'  Lv.'+(lv+1)));
      copy.appendChild(isSkill?deltaLine(k,lv):fragment('small','',data.effect));
      Object.keys(D.supers).forEach(function(id){var s=D.supers[id],mates=recipeMate(s,k);
        if(mates&&mates.some(function(n){return g.levels[n];}))copy.appendChild(fragment('small','pair','配对 '+groupName(mates)+' → '+s.name));});
      b.appendChild(copy);card.appendChild(b);
      var detail=fragment('div','pick-detail');detail.id='pick-detail-'+k;detail.hidden=true;
      var info=button('ⓘ','pick-info',function(e){e.stopPropagation();var open=detail.hidden;
        Array.prototype.forEach.call(box.querySelectorAll('.pick-detail'),function(d){d.hidden=true;d.previousElementSibling.setAttribute('aria-expanded','false');});
        detail.hidden=!open;info.setAttribute('aria-expanded',String(open));});
      info.setAttribute('aria-controls',detail.id);info.setAttribute('aria-label',data.name+'详情');info.setAttribute('aria-expanded','false');card.appendChild(info);
      if(isSkill){detail.appendChild(tierRows(k,true));if(counters[k])detail.appendChild(paragraph(counters[k]));}
      detail.appendChild(paragraph(data.science));card.appendChild(detail);scroll.appendChild(card);
    });
    if(g.rerollLimit){
      var left=g.rerollLimit-g.rerollsUsed;
      var refresh=button(left?'重新抗原呈递 · 换一批（余 '+left+' 次）':'本局已刷新','reroll-btn',function(){
        if(state==='upgrade'&&g.rerollsUsed<g.rerollLimit&&performance.now()>=g.pickAfter){g.rerollsUsed++;offer(true);}
      });refresh.disabled=!left;scroll.appendChild(refresh);
    }
    box.appendChild(scroll);hud();
  }
  function outcome(won){
    var campaign=g.mode==='campaign',defense=campaign&&g.stage>5;
    var title=campaign?(won?'关卡完成':'关卡失败'):'无尽巡逻结束';
    var kind='loss',caption='细胞失活',reason,x=g.p.x,y=g.p.y/H,radius=g.radius,bossBreak=false,bossKind=null;
    if(won){
      var mission=C.briefing(g.mode,g.stage,g.map);
      kind='win';caption=defense?'防线守住了':'首领已击败';
      reason=(defense?'守满 '+g.duration+' 秒，':'')+(g.actualTarget||mission.target)+'已击败';
      if(g.time-g.lastBossTime<1){x=g.lastBossX;y=g.lastBossY;radius=g.lastBossRadius;bossBreak=true;bossKind=g.lastBossKind||mission.icon;}
    }else if(g.lastHit==='timeout'){
      kind='timeout';caption='倒计时结束';
      var remaining=g.enemies.filter(function(e){return e.bossSerial&&!e.dead;}).length;
      reason=g.duration+' 秒已到，'+(remaining?'仍有 '+remaining+' 个关底目标':'关底目标未清除');
    }else if(g.lastHit==='barrier'||g.map==='brain'&&g.barrier===0){
      kind='barrier';caption='屏障破裂';reason='血脑屏障完整度降至 0%';
    }else if(g.lastHit==='bleed'){
      reason='中性粒细胞持续消耗生命，活性耗尽';
    }else{
      var source=g.lastHit==='virus'?'病毒颗粒':D.species[g.lastHit]&&D.species[g.lastHit].name;
      reason=source?'受到'+source+'攻击，生命耗尽':'出战细胞的生命已耗尽';
    }
    var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return {won:won,kind:kind,title:title,caption:caption,reason:reason,x:x,y:y,radius:radius,bossBreak:bossBreak,bossKind:bossKind,
      duration:reduced ? 0.7 : 2.4,reduced:reduced,elapsed:0,lastFrame:null};
  }
  function finish(won){
    if(g.settled)return;Q.waveCleared(g);g.stamps=Q.stamps(g,won);
    ending=outcome(won);
    var persona=g.super.storm?'细胞因子暴走狂魔':g.super.mac?'膜上开孔专家':g.marked>=4?'优雅的抗体调理大师':
      g.lastHit==='pneumo'?'被多糖荚膜滑倒的实习白细胞':won?'守住防线的巨噬老兵':g.kills>=40?'溶酶体值班主任':'巡游中的见习巨噬细胞';
    if(g.hero.mode!=='cargo'&&!g.super.mac)persona={nets:'织网的白色先锋',laser:'精准穿孔的夜巡者',summon:'免疫军团指挥官'}[g.hero.mode];
    g.reportMeta={won:won,reason:ending.reason,persona:persona,tip:sample(D.tips[g.lastHit]||D.tips.clear),stain:P.data.stain};
    P.settle(g,won);
    scope.setAttribute('data-outcome',ending.kind);scope.classList.remove('level-flash');
    el('outro').classList.toggle('upper',ending.y>0.58);
    el('outro-title').textContent=ending.caption;el('outro-reason').textContent=ending.reason;
    setScreen('ending');A.play(won?'victory':'defeat');
    best=Math.max(best,P.data.mapBest[g.map]);el('mobile-best').textContent=el('best').textContent=D.clock(best);
  }
  function showResult(){
    var summary=ending;ending=null;
    el('result-title').textContent=summary.title;el('result-reason').textContent=summary.reason;
    el('atp-earned').textContent='+'+g.earnedAtp+' ATP'+(g.newStamps&&g.newStamps.length?'（含新章奖励 '+25*g.newStamps.length+'）':'')+(g.newMaps.length?'　新战场 · '+g.newMaps.join(' / '):'');
    refreshLoadout();if(g.newStamps&&g.newStamps.length)A.play('stamp');
    resultRow=C.reportRow(g);
    el('report-img').src=R.report(resultRow);
    resultRank=g.mode==='endless'&&B.ranks.available()&&resultRow.time<=1000000?
      [1,rankBoards.indexOf(resultRow.map)+1].map(function(board){return {board:board,status:'ready'};}):null;
    var submit=el('rank-submit');
    submit.hidden=!resultRank;submit.disabled=false;submit.textContent='提交到平台榜';
    el('rank-status').textContent='';
    var onward=summary.won&&g.mode==='campaign'&&g.stage<8,next=el('next-stage'),again=el('restart');
    next.hidden=!onward;next.classList.toggle('primary',onward);again.classList.toggle('primary',!onward);
    setScreen('result');el('result-title').focus();
  }
  async function submitResultRank(){
    var submit=el('rank-submit'),notice=el('rank-status'),rank=resultRank;
    if(!rank||submit.disabled)return;
    submit.disabled=true;notice.textContent='正在提交成绩…';
    var pending=rank.filter(function(entry){return entry.status==='ready'||entry.status==='retry';});
    var score=resultRow.time;
    await Promise.all(pending.map(async function(entry){
      try{entry.status=await B.ranks.submit(entry.board,score);}
      catch(err){
        var canRetry=err&&[2001,2008,2009,2999].indexOf(err.errCode)>=0;
        entry.status=entry.status==='ready'&&canRetry?'retry':'failed';
      }
    }));
    if(state!=='result'||resultRank!==rank)return;
    var confirmed=rank.filter(function(entry){return entry.status==='confirmed';}).length;
    var parts=confirmed===2?['成绩已录入平台总榜和器官榜。']:confirmed===1?['成绩已录入 1 个榜单。']:[];
    var retry=rank.some(function(entry){return entry.status==='retry';});
    if(rank.some(function(entry){return entry.status==='unknown';}))parts.push('部分成绩待确认，可在平台榜查看。');
    if(!B.ranks.available())parts.push('平台榜暂未开放，可在荣耀排行查看本机战绩。');
    else if(retry)parts.push('部分成绩暂未提交，可重试。');
    else if(rank.some(function(entry){return entry.status==='failed';}))parts.push('平台榜暂时无法提交其余成绩。');
    submit.hidden=!retry||!B.ranks.available();submit.disabled=submit.hidden;submit.textContent='重试提交';
    notice.textContent=parts.join('');
  }
  function castActive(slot){
    if(state!=='playing'||!window.ActiveSkills.cast(g,slot,ops))return false;
    if(g.p.hp<=0)finish(false);else if(g.mode==='campaign'&&g.stage<=5&&g.bossDead)finish(true);else hud();return true;
  }
  function step(dt){
    var teaching=g.mode==='campaign'&&g.stage<=5;
    if(teaching&&g.bossSpawned&&g.bossDead){finish(true);return;}
    if(encounter())return;
    var old=g.time,fast=teaching&&g.enemies.filter(function(e){return !e.dead&&e.x>=0&&e.x<=W&&e.y>=0&&e.y<=H;}).length<=1?2:1;
    g.waveClock+=dt*fast;g.time+=dt;g.floaters=g.floaters.filter(function(f){return g.time-f.born<.90;});g.spawnIn-=dt*fast*(g.event&&g.event.id==='stayup'?D.events.stayup.spawnMult:1);
    if(g.spawnIn<=0){
      var entry=spawn(chooseSpawn());
      if(entry&&fast===2){entry.x=clamp(entry.x,0,W);entry.y=clamp(entry.y,0,H);}
      if(entry&&g.mode==='endless'&&g.time>=120&&Math.random()<.18)entry.resistant=true;
      g.spawnIn=C.spawnDelay(g);
    }
    if(g.mode==='endless'&&Math.floor(old/60)<Math.floor(g.time/60)){
      g.mutateAt=g.time;
      if(Math.floor(g.time/60)%2)A.play('epoch');
    }
    if(old<60 && g.time>=60)notice('局部炎症反应 · 中性粒细胞入场，NETs 可困住周围敌人。',5);
    if(g.time>=g.waveIn){allyWave();g.waveIn+=12;}
    if(!g.hot && g.time>=90){g.hot=true;notice('高烧 39.5°C · 消化加快 50%，敌人移速提升 15%。',5);}
    C.tick(g,ops);
    if(!teaching&&g.duration&&old<g.duration&&g.time>=g.duration&&!g.bossDead)notice('击败关底目标即可过关',5);
    Q.clocks(g,ops);Q.environmental(g,dt,ops);Q.rebuildGrid(g,H);Q.heroTick(g,dt,ops);
    if(g.p.hp<=0){finish(false);return;}
    if(g.lowSince<0&&g.p.hp<g.hero.hp*.12)g.lowSince=g.time;
    window.ActiveSkills.tick(g,ops);
    movePlayer(dt);if(g.p.hp<=0){finish(false);return;}
    Q.phages(g,dt,ops);allies(dt);
    g.films=g.films.filter(function(v){v.life-=dt;if(v.warm>0)v.warm-=dt;return v.life>0;});
    g.nets=g.nets.filter(function(v){v.life-=dt;return v.life>0;});
    g.enemies.forEach(function(e,i){
      if(!e.dead && !e.bossSerial && e.kind!=='virus'){
        g.nets.forEach(function(n){if(n.caught.indexOf(e)<0 && dist(e,n)<n.r){n.caught.push(e);e.root=3;}});
      }
      if(g.p.hp>0){enemyStep(e,dt);if(!e.dead)Q.trackEnemy(g,e,i);}
    });
    if(g.p.hp<=0){finish(false);return;}
    weapons(dt);g.shots.forEach(function(s){projectile(s,dt);});g.shots=g.shots.filter(function(s){return s.life>0;});
    pickups(dt);g.enemies=g.enemies.filter(function(e){return !e.dead;});
    g.effects=g.effects.filter(function(v){v.age+=dt;return v.age<v.duration;});
    if(g.mode==='campaign'){
      if(g.bossDead&&(teaching||g.time>=g.duration)){finish(true);return;}
      if(teaching&&g.waveClock>=g.duration){g.lastHit='timeout';finish(false);return;}
    }
    if(g.xp>=g.next&&!g.upgradeLead){g.upgradeLead=.35;scope.classList.add('level-flash');}
  }
  var glyphs={acid:'酸',actin:'伪',ros:'氧',igg:'Y',c3:'C3',ctl:'T',turret:'B',ifn:'γ',mhc:'呈',mac:'孔',storm:'暴',synapse:'突',matrix:'阵'};
  function hudCanvas(id,w,h){
    var cv=el(id),ratio=Math.min(window.devicePixelRatio||1,2);
    if(cv.width!==Math.ceil(w*ratio)||cv.height!==Math.ceil(h*ratio)){
      cv.width=Math.ceil(w*ratio);cv.height=Math.ceil(h*ratio);cv.style.width=w+'px';cv.style.height=h+'px';
    }
    var c=cv.getContext('2d');c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,w,h);c.textAlign='center';return c;
  }
  function aria(id,label){var node=el(id);if(node.getAttribute('aria-label')!==label)node.setAttribute('aria-label',label);}
  function hudLabel(c,label,x,y){
    c.save();c.strokeStyle='rgba(5,18,31,.9)';c.lineWidth=2;c.lineJoin='round';
    c.strokeText(label,x,y);c.fillText(label,x,y);c.restore();
  }
  function paintActives(){
    var active=window.ActiveSkills,pad=el('active-pad');
    pad.hidden=C.tier(g)<3;if(pad.hidden)return;
    [1,2].forEach(function(slot){
      var info=active.status(g,slot),b=el('active-'+slot),last=skillPaint[slot];
      var name=slot===1?activeNames[g.heroId]:activeNames[info.key]||'未装配';
      var pct=Math.max(0,Math.min(1,info.ratio||0)),label=info.locked?'未装配':info.ready?name:info.key==='net'?Math.round((1-pct)*100)+'%':Math.ceil(info.left)+'s';
      var hash=label+'|'+Math.round(pct*80)+'|'+info.key+'|'+info.ready;
      if(last&&last.hash===hash)return;
      if(info.ready&&last&&!last.ready&&state==='playing')A.play('ready');
      skillPaint[slot]={hash:hash,ready:info.ready};b.classList.toggle('ready',!!info.ready);b.disabled=!!info.locked;
      var cv=b.querySelector('canvas'),size=slot===1?56:46,c=cv.getContext('2d');
      if(cv.width!==size*2){cv.width=cv.height=size*2;}
      c.setTransform(2,0,0,2,0,0);c.clearRect(0,0,size,size);var h=size/2;
      var cooldownEnd=-Math.PI/2+pct*TAU;
      if(pct>0){c.fillStyle='rgba(5,12,26,.20)';c.beginPath();c.moveTo(h,h);c.arc(h,h,h-2,-Math.PI/2,cooldownEnd);c.fill();}
      if(!info.locked&&pct<1){c.strokeStyle=info.ready?'#f3d791':'#8ed4d0';c.lineWidth=1.5;c.beginPath();c.arc(h,h,h-3,cooldownEnd,TAU-Math.PI/2);c.stroke();}
      b.querySelector('b').textContent=info.ready||info.locked?label:name+'\n'+label;aria(b.id,(info.name||name)+'，'+(info.ready?'可释放':label));
    });
  }
  function triggerActive(slot){
    if(state!=='playing'||g.upgradeLead||C.tier(g)<3)return;
    if(castActive(slot)){A.play('cast');hud();}
  }
  [1,2].forEach(function(slot){
    var b=el('active-'+slot);
    function press(e){e.stopPropagation();e.preventDefault();triggerActive(slot);}
    if(window.PointerEvent)b.addEventListener('pointerdown',press);
    else {b.addEventListener('touchstart',press,{passive:false});b.addEventListener('mousedown',press);}
    b.addEventListener('click',function(e){if(e.detail===0)triggerActive(slot);});
  });
  function statusHud(){
    var core=Object.keys(g.levels).filter(function(k){return g.levels[k]&&['mist','pulse','veil'].indexOf(k)<0;});
    Object.keys(D.supers).forEach(function(k){if(g.super[k]){
      var recipe=D.supers[k],mate=recipe.alternate&&g.levels[recipe.needs[1]]<3?recipe.alternate:recipe.needs[1];
      core=core.filter(function(v){return v!==recipe.needs[0]&&v!==mate;});core.unshift(k);}});
    core=core.slice(0,6);var c=hudCanvas('core-dock',Math.max(1,core.length*27),28);
    core.forEach(function(k,i){var x=i*27+13,special=!!D.supers[k];
      c.beginPath();if(special){for(var j=0;j<6;j++){var a=j*TAU/6;c.lineTo(x+12*Math.cos(a),13+12*Math.sin(a));}c.closePath();}else c.arc(x,13,11,0,TAU);
      c.fillStyle=special?'rgba(94,70,36,.36)':'rgba(17,46,64,.30)';c.fill();c.strokeStyle=special?'#ffe29a':'#6daea9';c.stroke();
      if(k==='mac'&&g.macIn>0){c.beginPath();c.moveTo(x,13);c.arc(x,13,11,-Math.PI/2,-Math.PI/2+TAU*Math.min(1,g.macIn/3.2));c.fillStyle='rgba(5,13,30,.28)';c.fill();}
      c.fillStyle='#ebfff6';c.font='bold 11px sans-serif';hudLabel(c,glyphs[k],x,15);
      if(!special)for(var n=0;n<3;n++){c.fillStyle=n<g.levels[k]?'#c7ffac':'#536773';c.fillRect(x-6+n*5,19,3,2);}
    });
    var rows=[],good='#7ff4cb',env='#ffc16f',bad='#ff8ab4';
    function row(name,icon,left,total,col,permanent){if(left>0||permanent)rows.push([name,icon,Math.max(0,left),total,col,permanent]);}
    if(g.event)row(g.event.label,g.event.id==='coffee'?'咖':'夜',g.event.until-g.time,15,g.event.id==='coffee'?good:bad);
    row('疫苗克制','苗',(g.vaccineUntil||0)-g.time,15,good);row('胞外诱捕网','网',g.netUntil-g.time,4,good);
    if(g.hot)row('高烧','热',1,1,env,true);
    if(g.map==='lung')row('呼吸气浪',g.windDir>0?'→':'←',g.windUntil-g.time,3.5,env);
    var barrier=el('barrier-readout');barrier.hidden=g.map!=='brain';
    if(!barrier.hidden){
      var percent=String(Math.round(g.barrier));
      if(barrier.getAttribute('aria-valuenow')!==percent){
        barrier.setAttribute('aria-valuenow',percent);el('barrier-percent').textContent=percent+'%';
      }
    }
    row('耐药菌潮','潮',g.antibioticWaveAt-g.time,5,bad);
    if(g.films.some(function(v){return dist(g.p,v)<v.r;}))row('菌膜减速','慢',1,1,bad,true);
    c=hudCanvas('status-rings',28,Math.max(1,rows.length*31));
    rows.forEach(function(v,i){var y=i*31+14,urgent=!v[5]&&v[2]<3;
      c.globalAlpha=urgent ? .72+.28*Math.cos(g.time*12) : 1;c.beginPath();c.arc(14,y,12,0,TAU);c.fillStyle='rgba(12,33,49,.32)';c.fill();
      c.beginPath();c.arc(14,y,12,-Math.PI/2,-Math.PI/2+TAU*Math.min(1,v[2]/v[3]));c.strokeStyle=v[4];c.lineWidth=2;c.stroke();
      c.font='bold 10px sans-serif';c.fillStyle='#ffffff';hudLabel(c,v[1],14,y+(v[5]?4:0));
      if(!v[5]){c.font='8px sans-serif';hudLabel(c,Math.ceil(v[2])+'s',14,y+9);}
    });c.globalAlpha=1;aria('status-rings',rows.map(function(v){return v[0];}).join('、')||'无短效状态');
    aria('core-dock',core.map(function(k){return D.supers[k]?D.supers[k].name:D.upgrades[k].name+' '+g.levels[k]+'级';}).join('、')||'尚无核心技能');
    var warn=el('threat'),bossSoon=(!g.bossSpawned||g.mode==='endless')&&(g.waveClock!=null?g.waveClock:g.time)>=g.bossAt-1.5,wave=g.antibioticWaveAt>g.time&&g.antibioticWaveAt-g.time<=1.5;
    warn.hidden=!bossSoon&&!wave;warn.textContent=bossSoon?'▼':wave?'◀　▶':'';
    var dots=el('phase-dots').children;milestones(g).slice(1).forEach(function(t,i){dots[i].classList.toggle('lit',(g.waveClock!=null?g.waveClock:g.time)>=t);});
    el('hud').setAttribute('data-edge',g.time-g.shakeAt<.22?'hit':g.time-g.mutateAt<1.3?'mutate':g.event?g.event.id:g.hot?'hot':'');
    el('xp').parentNode.classList.toggle('near',g.xp/g.next>.85);el('xp').parentNode.classList.toggle('absorb',g.time-g.pickupAt<.15);
  }
  function milestones(run){
    if(run.mode==='endless'){var base=run.epoch*120;return [base,base+30,base+60,base+90,base+120];}
    var s=C.stages[run.stage-1];return [0,Math.floor(s.duration/3),Math.floor(s.duration/2),s.bossAt,s.duration];
  }
  function bossHud(){
    var bar=el('bossbar'),bosses=g.enemies.filter(function(e){return e.bossSerial&&!e.dead;});
    var count=Math.min(2,bosses.length);
    while(bar.children.length>count)bar.removeChild(bar.lastChild);
    bar.hidden=!count;
    for(var i=0;i<count;i++){
      var e=bosses[i],row=bar.children[i];
      if(!row){
        row=fragment('div','boss-row');var track=fragment('div','meter');
        row.appendChild(fragment('span',''));row.appendChild(fragment('b',''));track.appendChild(fragment('i',''));row.appendChild(track);bar.appendChild(row);
      }
      var label=(e.label||'关底精英')+(e.affix?' · '+e.affix:'');
      if(row.firstChild.textContent!==label)row.firstChild.textContent=label;
      row.children[1].textContent='P'+(e.phase||1)+(i===1&&bosses.length>2?'　+'+(bosses.length-2):'');
      row.lastChild.firstChild.style.transform='scaleX('+clamp(e.hp/e.max,0,1)+')';
    }
  }
  function hud(){
    var p=g.p,clock=C.missionClock(g);
    el('clock-label').textContent=clock.label;el('time').textContent=D.clock(clock.seconds);
    aria('time',clock.label+' '+el('time').textContent);paintActives();el('kills').textContent=g.kills;el('level').textContent='Lv.'+g.level;
    el('hp').style.transform='scaleX('+p.hp/g.hero.hp+')';el('hpnum').textContent=Math.ceil(p.hp)+'/'+g.hero.hp;
    el('xp').style.transform='scaleX('+clamp(g.xp/g.next,0,1)+')';
    var mode=g.hero.mode,used=Q.occupancy(p),value=mode==='cargo'?used+'/'+g.capacity:mode==='nets'?g.netEnergy+'%':
      mode==='laser'?Math.round(100*(1-Math.min(.6,g.laserIn)/.6))+'%':g.army.length+'/'+g.armyCap;
    el('cargo-title').textContent={cargo:'溶酶体消化舱',nets:'NETs 诱捕网充能',laser:'穿孔素光束',summon:'在场免疫军团'}[mode];
    if(value!==lastSlots){el('cargo-num').textContent=value;lastSlots=value;}
    el('cargo').classList.toggle('full',mode==='cargo'&&used>=g.capacity);
    if(mode==='cargo')R.slots(el('slots'),g.capacity,p.cargo);else Art.charge(el('slots'),mode==='nets'?g.netEnergy/100:mode==='laser'?1-g.laserIn/.6:g.army.length/(g.armyCap||1),mode==='laser'?'#d4b4ff':'#98efd9',mode==='nets'?10:6);
    statusHud();
    var badge=el('virulence'),banner=el('banner'),mutating=g.mode==='endless'&&g.time-g.mutateAt<3.2;
    badge.hidden=g.mode!=='endless';
    if(!badge.hidden)badge.textContent='毒力 Lv.'+(1+Math.floor(g.time/60));
    banner.classList.toggle('mutation',mutating);banner.classList.toggle('leaving',!mutating&&g.noticeUntil-g.time<.28);
    banner.hidden=!mutating&&g.time>g.noticeUntil;
    if(mutating){var risk=C.virulence(g);banner.textContent=risk.name+' · 毒力 Lv.'+risk.level+'\n'+risk.detail;}
    else banner.textContent=g.notice;
    bossHud();
    timeline(g);
  }
  function timeline(run){
    var marks=document.querySelectorAll('.timeline li');milestones(run).forEach(function(s,i){
      var labels=run.mode==='endless'?['纪元开始','巡逻推进','深入战场','首领将至','变异首领']:['防线启动','巡逻推进','巡逻过半','关底精英','防守目标'];
      marks[i].classList.toggle('active',(run.waveClock!=null?run.waveClock:run.time)>=s);var time=marks[i].firstElementChild,name=marks[i].lastElementChild;
      if(time.textContent!==D.clock(s))time.textContent=D.clock(s);if(name.textContent!==labels[i])name.textContent=labels[i];
    });
  }
  function loop(now){
    var dt=previous?Math.min(.085,(now-previous)/1000):0;previous=now;
    if(state==='playing'){
      if(g.coaching)placeCoach();
      else{
      var freeze=Math.min(g.hitStop,dt);g.hitStop-=freeze;dt-=freeze;
      var scale=.2+.8*Math.min(1,g.resumeAge);g.resumeAge=Math.min(1,g.resumeAge+dt);
      if(g.upgradeLead){scale=.18;g.upgradeLead=Math.max(0,g.upgradeLead-dt);if(!g.upgradeLead){scope.classList.remove('level-flash');offer(false);}}
      if(g.p.hp<g.hero.hp*.25)A.play('heart');
      var remain=dt*scale;while(remain>.00001 && state==='playing'){var tick=Math.min(1/45,remain);step(tick);remain-=tick;}
      if(state==='playing')CP.periodic(g,H);
      lastHud+=dt;if(lastHud>=.09 && state==='playing'){hud();lastHud=0;}
      }
    }
    if(g && state!=='home')R.frame(ctx,g,H,ground,ending);
    else{coverTime+=dt;R.cover(ctx,H,coverTime,ground,preview,state==='home'?heroContext:null);}
    if(state==='ending'&&ending&&!document.hidden){
      if(ending.lastFrame!==null)ending.elapsed+=Math.max(0,now-ending.lastFrame)/1000;
      ending.lastFrame=now;
      R.outro(ctx,ending,Math.min(1,ending.elapsed/ending.duration),H);
      if(ending.elapsed>=ending.duration)showResult();
    }
    if(state==='brief'&&discovery&&!discovery.skill){
      var target=discovery.target;if(target){ctx.save();ctx.beginPath();ctx.arc(target.x,target.y,(target.r||10)+8+2*Math.sin(now/240),0,TAU);
        ctx.strokeStyle='#ffe3a3';ctx.lineWidth=2;ctx.stroke();ctx.restore();}
      if(now-discovery.last>95){R.icon(discovery.cv,discovery.key,80,now/1000);discovery.last=now;}
    }
    A.scene(state,g);requestAnimationFrame(loop);
  }
  function coord(e){var rect=field.getBoundingClientRect();return {x:(e.clientX-rect.left)*W/rect.width,y:(e.clientY-rect.top)*H/rect.height};}
  function startStick(e,id){
    if(state!=='playing'||pointer!==null)return false;
    var p=coord(e),s={x:p.x,y:p.y,lastX:p.x,lastY:p.y,dx:0,dy:0};
    if(fixedStick){
      var base=stickBase.getBoundingClientRect(),cx=base.left+base.width/2,cy=base.top+base.height/2;
      if(Math.hypot(e.clientX-cx,e.clientY-cy)>base.width/2+6)return false;
      var center=coord({clientX:cx,clientY:cy});
      s.fixed=true;s.x=center.x;s.y=center.y;
      s.travel=base.width*.32*W/field.getBoundingClientRect().width;
    }
    g.stick=s;pointer=id;
    if(s.fixed)moveStick(e,id);
    return true;
  }
  function moveStick(e,id){if(pointer!==id||!g.stick)return;var p=coord(e),s=g.stick;
    var x=p.x-s.x,y=p.y-s.y,d=Math.hypot(x,y);
    if(s.fixed){
      var scale=d<2?0:1/Math.max(d,s.travel);
      s.dx=x*scale;s.dy=y*scale;
      stickBase.firstElementChild.style.transform='translate('+s.dx*100+'%,'+s.dy*100+'%)';
      return;
    }
    var dx=p.x-s.lastX,dy=p.y-s.lastY;
    if(d>32){s.x+=x*(d-32)/d;s.y+=y*(d-32)/d;}
    if(dx*s.dx+dy*s.dy<0 && Math.hypot(dx,dy)>=.25){
      s.reverse=(s.reverse||0)+Math.hypot(dx,dy);
      if(s.reverse>=6){s.x=p.x-6*dx/Math.hypot(dx,dy);s.y=p.y-6*dy/Math.hypot(dx,dy);s.reverse=0;}
    }else s.reverse=0;
    s.dx=(p.x-s.x)/32;s.dy=(p.y-s.y)/32;s.lastX=p.x;s.lastY=p.y;}
  function endStick(id){if(pointer===id){pointer=null;if(g)g.stick=null;stickBase.firstElementChild.style.transform='';}}
  if(window.PointerEvent){
    // A touch that began on the field can end after the pause sheet has opened.
    field.addEventListener('touchstart',function(e){e.preventDefault();},{passive:false});
    field.addEventListener('pointerdown',function(e){if(e.button!==0||!startStick(e,e.pointerId))return;try{field.setPointerCapture(e.pointerId);}catch(err){}});
    window.addEventListener('pointermove',function(e){moveStick(e,e.pointerId);});
    ['pointerup','pointercancel','lostpointercapture'].forEach(function(n){window.addEventListener(n,function(e){endStick(e.pointerId);});});
  }else{
    ['touchstart','touchmove','touchend','touchcancel'].forEach(function(n){
      field.addEventListener(n,function(e){e.preventDefault();Array.prototype.forEach.call(e.changedTouches,function(t){
        if(n==='touchstart')startStick(t,t.identifier);else if(n==='touchmove')moveStick(t,t.identifier);else endStick(t.identifier);
      });},{passive:false});
    });
    field.addEventListener('mousedown',function(e){startStick(e,'mouse');});window.addEventListener('mousemove',function(e){moveStick(e,'mouse');});window.addEventListener('mouseup',function(){endStick('mouse');});
  }
  var activeKeys={KeyJ:1,Space:1,KeyK:2,KeyE:2};
  window.addEventListener('keydown',function(e){
    if(g&&g.coaching){
      if(e.repeat)return;
      if(e.code==='Escape')endCoach();
      else if(e.code==='Enter'||e.code==='Space'){e.preventDefault();showCoach(coachIndex+1);}
      return;
    }
    var slot=activeKeys[e.code];
    if(state==='playing'&&slot&&!e.ctrlKey&&!e.altKey&&!e.metaKey){
      e.preventDefault();if(!e.repeat)triggerActive(slot);return;
    }
    if(e.code==='Escape'&&!e.repeat){
      if(state==='playing')pause();
      else if(state==='paused')resume();
      else if(!el('sheet').hidden){
        var back=el('sheet-body').querySelector('.back-nav');if(back)back.click();
      }
      return;
    }
    if(state==='playing' && /^(Key[WASD]|Arrow(Up|Down|Left|Right))$/.test(e.code)){e.preventDefault();keys[e.code]=true;}
  });
  window.addEventListener('keyup',function(e){delete keys[e.code];});
  function autoPause(){clearInput();if(state==='playing')pause();}
  document.addEventListener('visibilitychange',function(){if(ending)ending.lastFrame=null;});
  function saveOnExit(){if(g&&g.coaching)return;if(g&&!g.settled)CP.save(g,H);autoPause();}
  window.addEventListener('pagehide',saveOnExit);window.addEventListener('blur',saveOnExit);
  document.addEventListener('visibilitychange',function(){A.background(document.hidden);if(document.hidden)saveOnExit();else B.storage.retry();});
  el('start').addEventListener('click',function(){
    var saved=CP.get();if(saved){mode=saved.mode;stage=saved.stage;newGame(saved);return;}startSelected();
  });
  function startSelected(){
    if(P.data.unlocks.heroes.indexOf(preview)<0){
      if(P.select('hero',preview)){A.play('equip');home();}else deny(el('start'),'',D.heroes[preview].cost);
      return;
    }
    P.select('hero',preview);missionBrief();
  }
  el('new-run').addEventListener('click',function(){
    var box=sheet('confirm','PATROL RECORD','替换暂存的巡逻？');
    box.appendChild(paragraph('在任务页点击「开始行动」后，将替换上一次断点。已获得的 ATP 和通关纪录会保留。'));
    box.appendChild(button('保留断点','primary',home));
    var own=P.data.unlocks.heroes.indexOf(preview)>=0;
    var begin=button(own?'查看新局任务':'解锁并开始新局','text-btn',function(){
      if(P.select('hero',preview))missionBrief();else deny(begin,'',D.heroes[preview].cost);
    });begin.setAttribute('aria-disabled',String(!own&&P.data.atp<D.heroes[preview].cost));box.appendChild(begin);
  });
  el('restart').addEventListener('click',function(){mode=g.mode;stage=g.stage;missionBrief();});
  el('next-stage').addEventListener('click',function(){if(!g||g.mode!=='campaign'||g.stage>=8)return;mode='campaign';stage=g.stage+1;missionBrief();});
  el('pause').addEventListener('click',pause);
  el('coach-next').addEventListener('click',function(){if(g&&g.coaching)showCoach(coachIndex+1);});
  el('coach-skip').addEventListener('click',function(){if(g&&g.coaching)endCoach();});
  el('back-home').addEventListener('click',function(){stage=g.mode==='campaign'?Math.min(P.data.cleared+1,8):stage;g=null;home();});
  var shareGame=el('share-game');
  B.ready.then(function(){shareGame.hidden=!B.canShareGame();});
  shareGame.addEventListener('click',async function(){
    shareGame.disabled=true;
    var message=await B.shareGame();shareGame.disabled=false;
    if(message&&state==='home')showToast(message);
  });
  el('rank-submit').addEventListener('click',submitResultRank);
  bindReportAction(el('share-report'),function(url){return postBattleReport(url,resultRow);},el('report-img'),el('export-status'));
  bindReportAction(el('export'),B.exportReport,el('report-img'),el('export-status'));

  window.addEventListener('resize',resize);resize();requestAnimationFrame(loop);
}());
