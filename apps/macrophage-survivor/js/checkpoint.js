(function () {
  'use strict';
  var store=window.XhsBridge.storage, D=window.ImmuneData, profile=window.PatrolProfile;
  var serial=0,lastSaveTime=0;
  var groups=['shots','orbs','films','allies','nets','phages','bifidos','hearts','army','fibrinNets','delayedC3'];
  var refKeys=['target','exclude','partner'], listRefs=['hit','caught'];

  function scalars(source){
    var row={};
    Object.keys(source||{}).forEach(function(k){
      if(k==='__proto__'||k==='constructor'||k==='prototype')return;
      var value=source[k],type=typeof value;
      if(type==='string'||type==='boolean'||(type==='number' && isFinite(value)))row[k]=value;
    });
    return row;
  }
  function plainList(list){
    return (list||[]).map(function(v){return typeof v==='object'?scalars(v):v;});
  }
  function livingEnemies(g){
    var alive=g.enemies.filter(function(e){return !e.dead;});
    if(alive.length<=60)return alive;
    // Keep every live boss and its energy suppliers even during a crowded wave.
    var essential=alive.filter(function(e){return e===g.boss || e.bossSerial || e.kind==='boss' || e.coreFor || e.mirrorFor || e.supplyFor!=null;});
    var rest=alive.filter(function(e){return essential.indexOf(e)<0;});
    return essential.concat(rest.filter(function(e){return e.captain||e.wave;}),rest.filter(function(e){return !e.captain&&!e.wave;})).slice(0,60);
  }
  function encode(list,enemies){
    var rows=list.map(function(item){
      var r=scalars(item);
      refKeys.forEach(function(k){if(item[k])r[k]=enemies.indexOf(item[k]);});
      listRefs.forEach(function(k){
        if(Array.isArray(item[k]))r[k]=item[k].map(function(v){return enemies.indexOf(v);}).filter(function(i){return i>=0;});
      });
      return r;
    });
    // Shared values such as radius, armor and life flags appear only once per group.
    var fields=[],defaults={},values=[];
    rows.forEach(function(row){Object.keys(row).forEach(function(k){if(fields.indexOf(k)<0)fields.push(k);});});
    fields=fields.filter(function(k){
      var v=rows[0][k];
      if(v===undefined || !rows.every(function(row){return row[k]===v;}))return true;
      defaults[k]=v;return false;
    });
    rows.forEach(function(row){values.push(fields.map(function(k){return row[k]===undefined?null:row[k];}));});
    return {f:fields,d:defaults,v:values};
  }
  function decode(table){
    return table.v.map(function(values){
      var row=scalars(table.d);
      // Array-valued defaults can occur in one-item hit lists.
      listRefs.forEach(function(k){if(Array.isArray(table.d[k]))row[k]=table.d[k].slice();});
      table.f.forEach(function(k,i){
        if(values[i]!=null && k!=='__proto__' && k!=='prototype' && k!=='constructor')row[k]=values[i];
      });
      return row;
    });
  }
  function relink(row,enemies){
    refKeys.forEach(function(k){if(typeof row[k]==='number')row[k]=enemies[row[k]]||null;});
    listRefs.forEach(function(k){if(Array.isArray(row[k]))row[k]=row[k].map(function(i){return enemies[i];}).filter(Boolean);});
  }
  function serialize(g,height){
    if(!g.runId)g.runId=Date.now().toString(36)+'-'+(++serial).toString(36)+'-'+Math.floor(performance.now()*1000).toString(36);
    var s=scalars(g),enemies=livingEnemies(g);
    delete s.coaching;
    s.v=1;s.height=height;s.bossIndex=enemies.indexOf(g.boss);
    s.p=scalars(g.p);s.p.cargo=plainList(g.p.cargo);s.ctl=scalars(g.ctl);
    s.levels=scalars(g.levels);s.super=scalars(g.super);s.tallies=scalars(g.tallies);s.event=g.event?scalars(g.event):null;
    ['eventSchedule','phageSchedule','lastChoices'].forEach(function(k){if(Array.isArray(g[k]))s[k]=plainList(g[k]);});
    s.entities={enemies:encode(enemies,enemies)};
    groups.forEach(function(k){s.entities[k]=encode(g[k]||[],enemies);});
    return s;
  }
  function valid(s){
    return !!(s && s.v===1 && (s.mode==='campaign'||s.mode==='endless') && s.stage>=1 && s.stage<=window.Campaign.stages.length &&
      D.heroes[s.heroId] && D.maps[s.map] && s.runId && s.time>=0 && s.level>=1 && s.p && s.p.hp>0 &&
      typeof s.p.x==='number' && typeof s.p.y==='number' && Array.isArray(s.p.cargo) && s.levels && s.entities &&
      s.height>0 && ['enemies'].concat(groups).every(function(k){
        var t=s.entities[k];return t && Array.isArray(t.f) && t.d && Array.isArray(t.v) && t.v.every(Array.isArray);
      }));
  }
  function restore(g,s,height){
    if(!valid(s))return false;
    lastSaveTime=s.time;
    var ratio=height/s.height,loaded=scalars(s);
    ['v','height','bossIndex','coaching'].forEach(function(k){delete loaded[k];});
    Object.assign(g,loaded);
    if(s.waveClock==null){
      g.waveClock=s.time;
      if(g.mode==='campaign'&&g.stage<=5){
        var route=window.Campaign.stages[g.stage-1];
        // An in-flight 0.4.0 run keeps its earned time and gets a full boss window.
        g.bossAt=g.bossSpawned?s.bossAt:Math.max(s.time,route.bossAt);
        g.duration=g.goal=Math.max(route.duration,s.time+route.duration-route.bossAt);
      }
    }
    g.hero=D.heroes[g.heroId];g.p=Object.assign({},g.p,s.p,{cargo:plainList(s.p.cargo)});
    if(s.bonusHP)g.hero=Object.assign({},g.hero,{hp:g.hero.hp+s.bonusHP});
    g.rerollLimit=s.rerollLimit==null?Number(window.Campaign.canReroll(g)):s.rerollLimit;
    g.rerollsUsed=s.rerollsUsed==null?Number(!!s.rerolled):s.rerollsUsed;
    g.ctl=scalars(s.ctl);g.levels=Object.assign({},g.levels,scalars(s.levels));g.super=scalars(s.super);
    g.tallies=scalars(s.tallies);g.event=s.event?scalars(s.event):null;
    ['eventSchedule','phageSchedule','lastChoices'].forEach(function(k){if(Array.isArray(s[k]))g[k]=plainList(s[k]);});
    if(s.formationCount==null)g.formationCount=Math.max(0,Math.floor((g.nextFormation||40)/40)-1);
    if(s.nextCaptain==null){
      g.nextCaptain=g.time<240?240:240+22*(1+Math.floor((g.time-240)/22));
      // The previous release exhausted its finite event list at 135s.
      if(g.mode==='endless'&&g.eventSchedule&&g.nextEventIdx>=g.eventSchedule.length){
        var count=g.eventSchedule.length,last=g.eventSchedule[count-1];
        if(count)g.nextEventIdx=Math.max(g.nextEventIdx,count+Math.floor((g.time-last)/50));
      }
    }
    function scale(row){if(typeof row.y==='number')row.y*=ratio;if(typeof row.yy==='number')row.yy*=ratio;}
    scale(g.p);scale(g.ctl);if(typeof g.netY==='number')g.netY*=ratio;
    if(g.netUntil>g.time&&g.netTicks==null){
      g.netTicks=Math.max(0,Math.ceil((g.netUntil-(g.netTick||g.time))/.85));
      if(g.netX==null){g.netX=g.p.x;g.netY=g.p.y;}
    }
    g.enemies=decode(s.entities.enemies);
    ['enemies'].concat(groups).forEach(function(k){
      if(k!=='enemies')g[k]=decode(s.entities[k]);
      g[k].forEach(function(row){relink(row,g.enemies);scale(row);});
    });
    if(!s.actualTarget&&g.mode==='campaign'&&g.stage>=6&&g.stage<=8&&s.bossSpawned){
      // These targets may already have died in the saved 0.4.x defense window.
      var legacy=['疾行冲锋领主','质粒风暴领主','紫金耐药菌王与疾行冲锋领主'];
      g.actualTarget=legacy[g.stage-6];
      if(!g.lastBossKind)g.lastBossKind='boss';
    }
    g.boss=g.enemies[s.bossIndex]||null;g.p.inv=Math.max(1.5,g.p.inv||0);
    g.rays=[];g.laserTarget=null;g.effects=[];g.floaters=[];g.stick=null;g.resumeAge=0;g.hitStop=0;
    return true;
  }
  function load(){
    if(profile.readRun()!==undefined)return Promise.resolve();
    // Through v0.4.2 the checkpoint lived in its own key. An explicit null in the profile retires it.
    return store.get('immune.savedRun').then(function(s){profile.adoptRun(valid(s)?s:null);});
  }
  var ready=profile.ready.then(load);
  function get(){var s=profile.readRun();return s && s.runId!==profile.data.lastSettled && valid(s)?s:null;}
  function save(g,h){
    if(!g||g.settled||g.p.hp<=0)return Promise.resolve(false);
    lastSaveTime=g.time;return profile.saveRun(serialize(g,h));
  }
  function periodic(g,h){if(g.time<lastSaveTime||g.time-lastSaveTime>=5)save(g,h);}
  function clear(){return profile.saveRun(null);}
  window.PatrolCheckpoint={ready:ready,load:load,get:get,save:save,periodic:periodic,clear:clear,serialize:serialize,restore:restore};
}());
