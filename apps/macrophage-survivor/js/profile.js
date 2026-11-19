(function(){
  'use strict';
  var B=window.XhsBridge.storage,D=window.ImmuneData;
  var defaults={atp:0,unlocks:{heroes:['macrophage'],maps:['skin']},atlas:{},selectedHero:'macrophage',selectedMap:'skin',survival:0,lastDeathBy:null,stamps:[],seen:[]};
  var profile={},savedRun,queue=Promise.resolve(),keys=Object.keys(defaults);
  var culture={
    membrane:{name:'膜活性强化',unit:'初始生命 +',values:[0,8,16,25]},
    receptor:{name:'趋化受体敏锐',unit:'拾取距离 +',values:[0,15,30,45],suffix:'%'},
    reserve:{name:'生发中心储备',unit:'每局换牌 ',values:[0,1,2,3],suffix:' 次'},
    mitochondria:{name:'线粒体超频',unit:'初始经验 ',values:[0,30,60,100],suffix:'%'}
  };
  var stains={dark:'暗场荧光',giemsa:'瑞氏–吉姆萨紫红染',phase:'相差金青'},prices=[120,260,480];
  function counter(value){return Math.max(0,Math.floor(Number(value)||0));}
  function owned(items,table,first){
    var result=[first];(Array.isArray(items)?items:[]).forEach(function(k){if(table[k] && result.indexOf(k)<0)result.push(k);});return result;
  }
  function restore(raw){
    raw=raw||{};var u=raw.unlocks||{};
    profile.atp=counter(raw.atp);profile.survival=counter(raw.survival);profile.lastDeathBy=raw.lastDeathBy||null;
    profile.unlocks={heroes:owned(u.heroes,D.heroes,'macrophage'),maps:owned(u.maps,D.maps,'skin')};
    profile.selectedHero=profile.unlocks.heroes.indexOf(raw.selectedHero)>=0?raw.selectedHero:'macrophage';
    profile.selectedMap=profile.unlocks.maps.indexOf(raw.selectedMap)>=0?raw.selectedMap:'skin';
    profile.stamps=(Array.isArray(raw.stamps)?raw.stamps:[]).filter(function(k){return D.achievements[k];});
    profile.seen=Array.isArray(raw.seen)?raw.seen:[];
    profile.cleared=Math.min(8,counter(raw.cleared));
    profile.culture={};
    Object.keys(culture).forEach(function(k){profile.culture[k]=Math.min(3,counter(raw.culture&&raw.culture[k]));});
    profile.stains=owned(raw.stains,stains,'dark');
    profile.stain=profile.stains.indexOf(raw.stain)>=0?raw.stain:'dark';
    profile.introduced=(Array.isArray(raw.introduced)?raw.introduced:[]).filter(function(k){return typeof k==='string';});
    profile.lastSettled=typeof raw.lastSettled==='string'?raw.lastSettled:'';
    profile.heroWins=owned(raw.heroWins,D.heroes,'').filter(Boolean);
    profile.mapBest={};Object.keys(D.maps).forEach(function(k){profile.mapBest[k]=counter(raw.mapBest&&raw.mapBest[k]);});
    profile.board={};
    ['all'].concat(Object.keys(D.maps)).forEach(function(k){
      var entries=raw.board && raw.board[k];
      profile.board[k]=(Array.isArray(entries)?entries:[]).filter(function(r){
        return r && D.heroes[r.hero] && D.maps[r.map] && r.time>=0 && Array.isArray(r.skills);
      }).slice(0,10);
    });
    Object.keys(D.maps).forEach(function(k){profile.board[k].forEach(function(row){profile.mapBest[k]=Math.max(profile.mapBest[k],counter(row.time));});});
    profile.atlas={};Object.keys(D.species).forEach(function(k){profile.atlas[k]={kills:counter(raw.atlas&&raw.atlas[k]&&raw.atlas[k].kills)};});
  }
  restore(defaults);
  function load(){
    return B.get('immune.profile2').then(function(raw){
      if(raw!=null){
        if(raw.version!==2)throw new Error('无法识别用户档案版本');
        restore(raw);savedRun=raw.savedRun;return;
      }
      return Promise.all(keys.map(function(k){return B.get('immune.'+k);})).then(function(vals){
        var legacy={};keys.forEach(function(k,i){legacy[k]=vals[i];});restore(legacy);savedRun=undefined;
      });
    });
  }
  var ready=load();
  // Rewards and the active run share a single host write. A restart sees both changes or neither.
  function save(){
    var snap=JSON.parse(JSON.stringify(profile));snap.version=2;
    if(savedRun!==undefined)snap.savedRun=savedRun;
    queue=B.set('immune.profile2',snap);return queue;
  }
  function saveRun(snapshot){savedRun=snapshot;return save();}
  function cultureCost(key){
    if(Object.prototype.hasOwnProperty.call(culture,key))return prices[profile.culture[key]];
    if(Object.prototype.hasOwnProperty.call(stains,key))return profile.stains.indexOf(key)>=0?0:300;
  }
  function cultivate(key){
    var cost=cultureCost(key);
    if(cost==null||profile.atp<cost)return false;
    if(key===profile.stain)return true;
    profile.atp-=cost;
    if(culture[key])profile.culture[key]++;
    else{
      if(profile.stains.indexOf(key)<0)profile.stains.push(key);
      profile.stain=key;
    }
    save();return true;
  }
  function value(key){return culture[key].values[profile.culture[key]];}
  function prepareRun(g){
    g.bonusHP=value('membrane');g.magnetBonus=value('receptor');
    g.rerollLimit=Math.max(window.Campaign.canReroll(g)?1:0,value('reserve'));g.rerollsUsed=0;
    g.hero=Object.assign({},g.hero,{hp:g.hero.hp+g.bonusHP});
    g.p.hp=g.hero.hp;g.xp=g.next*value('mitochondria')/100;
  }
  function select(type,k){
    var isHero=type==='hero',list=isHero?profile.unlocks.heroes:profile.unlocks.maps;
    if(list.indexOf(k)<0){
      var cost=isHero?D.heroes[k].cost:k==='brain'?400:Infinity;
      if(profile.atp<cost)return false;
      profile.atp-=cost;list.push(k);
    }
    profile[isHero?'selectedHero':'selectedMap']=k;save();return true;
  }
  function settle(g,won){
    if(g.settled)return queue;
    g.settled=true;
    if(g.runId && profile.lastSettled===g.runId){g.earnedAtp=0;g.newMaps=[];return queue;}
    if(g.runId)profile.lastSettled=g.runId;
    if(!savedRun||savedRun.runId===g.runId)savedRun=null;
    g.earnedAtp=Math.floor(g.time/3)+Math.floor(g.kills/5)+(won?40:0);
    profile.mapBest[g.map]=Math.max(profile.mapBest[g.map]||0,Math.floor(g.time));
    if(won&&g.mode==='campaign'&&D.heroes[g.heroId]&&profile.heroWins.indexOf(g.heroId)<0)profile.heroWins.push(g.heroId);
    if(profile.heroWins.length===4&&profile.unlocks.heroes.length===4&&g.stamps.indexOf('grand')<0)g.stamps.push('grand');
    g.newStamps=(g.stamps||[]).filter(function(k){return profile.stamps.indexOf(k)<0;});
    g.earnedAtp+=25*g.newStamps.length;
    profile.atp+=g.earnedAtp;profile.survival+=Math.floor(g.time);if(!won)profile.lastDeathBy=g.lastHit;
    Object.keys(g.tallies).forEach(function(k){if(profile.atlas[k])profile.atlas[k].kills+=g.tallies[k];});
    (g.stamps||[]).forEach(function(k){if(profile.stamps.indexOf(k)<0)profile.stamps.push(k);});
    var maps=profile.unlocks.maps;g.newMaps=[];
    function unlock(k){if(maps.indexOf(k)<0){maps.push(k);g.newMaps.push(D.maps[k].short);}}
    if(won && g.mode==='campaign' && g.stage===profile.cleared+1){
      profile.cleared=Math.min(8,g.stage);
      if(profile.cleared===3)unlock('lung');
      if(profile.cleared===5)Object.keys(D.maps).forEach(unlock);
    }
    if(g.mode==='endless')profile.board=window.Campaign.record(profile.board,g);
    return save();
  }
  function introduce(key){
    if(typeof key==='string' && profile.introduced.indexOf(key)<0){profile.introduced.push(key);return save();}
    return queue;
  }
  window.PatrolProfile={data:profile,ready:ready,load:load,culture:culture,stains:stains,cultureCost:cultureCost,cultivate:cultivate,prepareRun:prepareRun,readRun:function(){return savedRun;},adoptRun:function(run){savedRun=run;},saveRun:saveRun,select:select,introduce:introduce,markSeen:function(k){if(profile.atlas[k] && (profile.atlas[k].kills||profile.introduced.indexOf('species/'+k)>=0) && profile.seen.indexOf(k)<0){profile.seen.push(k);save();}},settle:settle};
}());
