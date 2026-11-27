(function(){
  'use strict';
  var D=window.ImmuneData,TAU=2*Math.PI,W=360;
  function occupancy(p){return p.cargo.reduce(function(sum,v){return sum+D.cargoSlots(v.kind);},0);}
  function tally(g,k){g.tallies[k]=(g.tallies[k]||0)+1;}
  function countClear(g,kind,at,ops){
    g.kills++;tally(g,kind);
    if(!g.levels.mhc)return;
    g.memoryClears=(g.memoryClears||0)+1;
    if(g.memoryClears===12){g.memoryClears=0;ops.orb(at.x,at.y,5,true);}
  }
  function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
  function normal(e){return !e.bossSerial&&!e.coreFor&&['staph','pneumo','rod','strepto','salmonella','meningo','clostrid'].indexOf(e.kind)>=0;}
  function nearest(list,at,test){
    var found=null,best=Infinity;
    list.forEach(function(e){
      if(e.dead||!test(e))return;
      var dx=e.x-at.x,dy=e.y-at.y,d=dx*dx+dy*dy;
      if(d<best){best=d;found=e;}
    });return found;
  }
  function cell(value,count){return Math.max(0,Math.min(count-1,Math.floor(value/60)));}
  function rebuildGrid(g,height){
    if(g.enemies.length<24){g.enemyGrid=null;return;}
    var rows=Math.ceil(height/60),grid=g.enemyGrid;
    if(!grid||grid.rows!==rows){
      grid=g.enemyGrid={rows:rows,bins:[],items:new WeakMap(),generation:0};
      for(var i=0;i<6*rows;i++)grid.bins.push([]);
    }
    grid.bins.forEach(function(bin){bin.length=0;});
    grid.generation++;grid.list=g.enemies;grid.maxRadius=0;
    g.enemies.forEach(function(e,i){if(!e.dead)trackEnemy(g,e,i);});
  }
  function trackEnemy(g,e,index){
    var grid=g.enemyGrid;
    if(!grid||grid.list!==g.enemies)return;
    var bin=6*cell(e.y,grid.rows)+cell(e.x,6),record=grid.items.get(e);
    if(!record){record={};grid.items.set(e,record);}
    grid.maxRadius=Math.max(grid.maxRadius,e.r);
    if(record.generation===grid.generation){
      if(record.bin===bin)return;
      var old=grid.bins[record.bin];old.splice(old.indexOf(e),1);
    }else record.index=index;
    record.generation=grid.generation;record.bin=bin;grid.bins[bin].push(e);
  }
  // Buckets give candidates only. Callers apply exact distance and trait rules.
  function nearby(g,at,range,body){
    var grid=g.enemyGrid;
    if(!grid||grid.list!==g.enemies)return g.enemies;
    if(body)range+=grid.maxRadius;
    var left=cell(at.x-range,6),right=cell(at.x+range,6),top=cell(at.y-range,grid.rows),bottom=cell(at.y+range,grid.rows);
    if((right-left+1)*(bottom-top+1)>=grid.bins.length*.65)return g.enemies;
    var found=[];
    for(var y=top;y<=bottom;y++)for(var x=left;x<=right;x++){
      var bin=grid.bins[y*6+x];
      for(var i=0;i<bin.length;i++)found.push(bin[i]);
    }
    // Keep spawn order for ties and for effects that chain when a target dies.
    return found.sort(function(a,b){return grid.items.get(a).index-grid.items.get(b).index;});
  }
  function nearLine(v,s){
    var dx=s.xx-s.x,dy=s.yy-s.y,k=Math.max(0,Math.min(1,((v.x-s.x)*dx+(v.y-s.y)*dy)/(dx*dx+dy*dy||1)));
    return Math.hypot(v.x-s.x-k*dx,v.y-s.y-k*dy)<v.r+3;
  }
  function fibrin(g,v,player){
    if(g.map!=='skin'||(!player&&v.r<12))return 1;
    return g.fibrinNets.some(function(s){return nearLine(v,s);})?(player ? .8 : .3):1;
  }
  function config(g,profile){
    Object.assign(g,{heroId:profile.selectedHero,hero:D.heroes[profile.selectedHero],map:profile.selectedMap,tallies:{},event:null,
      eventSchedule:[45,90,135],nextEventIdx:0,lastEvent:'',antibioticWaveAt:0,wavePending:false,survivedAntibiotic:false,vaccineTested:false,
      phages:[],phageKills:0,fullBounces:0,pneumoStreak:0,bestPneumoStreak:0,fullDeath:false,ateProbiotic:false,
      fibrinNets:[],nextFibrin:20,nextBreath:15,windUntil:0,windDir:-1,bifidos:[],nextBifido:8,hearts:[],barrier:100,
      netEnergy:0,netUntil:0,netTick:0,netTicks:0,netX:null,netY:null,laserIn:0,army:[],armyCap:0,summonIn:0,delayedC3:[],rays:[]});
    g.p.hp=g.hero.hp;
    var count=1+Math.floor(Math.random()*2);g.phageSchedule=[];
    while(count--)g.phageSchedule.push(30+Math.random()*120);g.phageSchedule.sort(function(a,b){return a-b;});
  }
  function event(g,id,ops){
    var e=D.events[id];if(id==='stayup')g.nightLevels=0;g.lastEvent=id;g.event=e.duration?{id:id,label:e.label,until:g.time+e.duration}:null;
    ops.notice(e.label+' · '+e.info,5);ops.sound('pulse');
    if(id==='antibiotic'){
      var pool=g.enemies.filter(function(v){return !v.dead&&!v.captain&&normal(v);}),n=Math.round(pool.length*.7);
      while(n--){var victim=pool.splice(Math.floor(Math.random()*pool.length),1)[0];ops.kill(victim);}
      g.bifidos=[];g.antibioticWaveAt=g.time+5;g.beamAt=g.time;
    }ops.stats();
  }
  function clocks(g,ops){
    if(g.event && g.time>=g.event.until){if(g.event.id==='coffee')g.coffeeDone=(g.coffeeDone||0)+1;g.event=null;ops.stats();}
    if(g.time>=15 && !g.vaccineTested){
      g.vaccineTested=true;var k=D.memorySkills[window.PatrolProfile.data.lastDeathBy];
      if(k && window.Campaign.skillAllowed(g,k) && g.levels[k]<window.Campaign.skillCap(g) && Math.random()<.5){g.levels[k]++;g.vaccineUntil=g.time+15;g.counterKind=window.PatrolProfile.data.lastDeathBy;ops.evolve();ops.stats();ops.notice('疫苗记忆唤醒 · '+D.upgrades[k].name+' Lv.'+g.levels[k],5);ops.sound('up');}
    }
    var n=g.eventSchedule.length,idx=g.nextEventIdx;
    var next=idx<n?g.eventSchedule[idx]:g.mode==='endless'&&n?g.eventSchedule[n-1]+50*(idx-n+1):Infinity;
    if(g.time>=next){
      g.nextEventIdx++;
      var keys=['coffee','stayup','antibiotic'].filter(function(k){return k!==g.lastEvent;});
      event(g,keys[Math.floor(Math.random()*keys.length)],ops);
    }
    if(g.antibioticWaveAt && g.time>=g.antibioticWaveAt){
      g.antibioticWaveAt=0;
      var arrivals=0;
      for(var i=0;i<7;i++){
        var e=ops.spawn(['staph','pneumo','rod'][i%3],i%2?-8:W+8,ops.height()*(i+1)/8,g.mode!=='endless');
        if(!e)e=g.enemies.find(function(v){return !v.dead&&!v.wave&&!v.captain&&!v.supplyFor&&normal(v);});
        if(!e)break;
        e.resistant=true;e.wave=true;arrivals++;
      }
      if(arrivals){g.wavePending=true;ops.notice('耐药菌潮抵达 · 紫环目标受到的伤害减半');}
      else g.antibioticWaveAt=g.time+1;
    }
    waveCleared(g);
    g.delayedC3=g.delayedC3.filter(function(v){if(v.at>g.time)return true;ops.c3(v);return false;});
  }
  function waveCleared(g){
    if(g.wavePending && !g.enemies.some(function(e){return e.wave&&!e.dead;}) && !g.p.cargo.some(function(v){return v.wave;})){
      g.wavePending=false;g.survivedAntibiotic=true;
    }
  }
  function phages(g,dt,ops){
    if(g.phageSchedule.length && g.time>=g.phageSchedule[0]){
      g.phageSchedule.shift();g.phages.push({x:W*(.2+Math.random()*.6),y:ops.height()*(.24+Math.random()*.52),phase:'idle',age:0});
      ops.notice('T4 噬菌体到达 · 触碰它可引导裂解');
    }
    g.phages=g.phages.filter(function(f){
      f.age+=dt;
      if(f.phase==='idle'){
        f.x+=Math.cos(f.age*.7)*dt*7;f.y+=Math.sin(f.age*.55)*dt*8;
        if(dist(f,g.p)<g.radius+12)f.phase='hunt';else return true;
      }
      if(!f.target||f.target.dead){
        f.phase='hunt';f.target=null;var score=-1;
        g.enemies.forEach(function(e){var rank=(e.bossSerial?20000:e.resistant?10000:0)+e.hp;if(!e.dead&&rank>score){score=rank;f.target=e;}});
      }
      var t=f.target;if(!t)return true;
      if(f.phase==='hunt'){var d=dist(f,t),v=Math.min(1,dt*150/(d||1));f.x+=(t.x-f.x)*v;f.y+=(t.y-f.y)*v;
        if(d>t.r+6)return true;f.phase='attached';f.until=g.time+3;
      }
      f.x=t.x;f.y=t.y-t.r*.65;
      if(g.time<f.until)return true;
      if(t.bossSerial)ops.damage(t,t.max*.08,true);
      else ops.kill(t);
      g.hitStop=.03;if(t.dead){g.phageKills++;if(t.elite||t.bossSerial||t.resistant)g.phageElite=(g.phageElite||0)+1;}tally(g,'phage');ops.fx('ring',t.x,t.y,44,'#9cffe2');return false;
    });
  }
  function enemyTraits(g,e,dt,ops){
    if(e.kind==='candida' && !e.hypha && e.age>=8){e.hypha=true;e.r=19;ops.fx('ring',e.x,e.y,23,'#f8bade');}
    if(e.kind!=='ecoli'||e.supplyFor)return;
    var t=e.partner;
    if(!t||t.dead||t.resistant||dist(e,t)>80){
      if(t&&e.linkTime>0&&e.linkTime<2.5&&!t.resistant)g.cutLinks++;
      e.partner=nearest(nearby(g,e,80),e,function(o){return o!==e&&normal(o)&&!o.resistant&&dist(e,o)<=80;});e.linkTime=0;
    }
    if(e.partner){e.linkTime+=dt;if(e.linkTime>=2.5){
      t=e.partner;t.resistant=true;t.hp*=2;t.max*=2;e.partner=null;e.linkTime=0;ops.fx('ring',t.x,t.y,23,'#c39cff');
    }}
  }
  function alkali(g,e){return nearby(g,e,38).some(function(v){return !v.dead&&v.kind==='pylori'&&dist(v,e)<=38;});}
  function cargoDuration(g,v){
    if(v.kind==='bifido')return 3;
    var coffee=g.event&&g.event.id==='coffee'?D.events.coffee.digestMult:1;
    var duration=v.kind==='tb'?(g.levels.acid?2:6)*coffee:v.kind==='clostrid'?3.6*coffee:g.digest;
    return duration/(g.hot?1.5:1);
  }
  function cargoStep(g,v,dt,ops){
    if(v.kind==='bifido'){v.progress+=dt/3;return v.progress>=1?'empty':'';}
    if(v.dormantUntil){
      if(g.levels.acid)v.dormantUntil=0;
      else if(g.time>=v.dormantUntil){var a=g.p.angle+Math.PI;
        var e=ops.spawn('tb',g.p.x+Math.cos(a)*(g.radius+18),g.p.y+Math.sin(a)*(g.radius+18),true);e.ejected=true;return 'empty';
      }else return '';
    }
    v.progress+=dt/cargoDuration(g,v);
    if(v.kind==='tb' && !v.checked && v.progress>=.5){v.checked=true;
      if(!v.ejected && !g.levels.acid && Math.random()<.30){v.dormantUntil=g.time+3;v.progress=.5;ops.float('休眠 3 秒',g.p.x,g.p.y-18,'#ffb0b4');return '';}
    }
    return v.progress>=1?'digest':'';
  }
  function environmental(g,dt,ops){
    var h=ops.height(),p=g.p,i;
    if(g.map==='skin'){
      if(g.time>=g.nextFibrin){g.nextFibrin+=20;
        var count=2+Math.floor(Math.random()*2);for(i=0;i<count;i++){
          var x=30+Math.random()*(W-60),y=h*(.18+Math.random()*.68),a=Math.random()*TAU;
          g.fibrinNets.push({x:x,y:y,xx:x+Math.cos(a)*72,yy:y+Math.sin(a)*72,until:g.time+12});
        }}
      g.fibrinNets=g.fibrinNets.filter(function(v){return v.until>g.time;});
    }else if(g.map==='lung'){
      if(g.time>=g.nextBreath){g.nextBreath+=15;g.windUntil=g.time+3.5;g.windDir*=-1;}
      var wind=g.time<g.windUntil?38*g.windDir:0,threshold=h-55;
      function push(v){v.x+=wind*dt;if(v.y>threshold)v.y-=65*dt;}
      [g.enemies,g.allies,g.phages,g.army].forEach(function(list){list.forEach(push);});push(p);
      p.x=Math.min(W-g.radius,Math.max(g.radius,p.x));p.y=Math.min(h-g.radius,Math.max(g.radius,p.y));
    }else if(g.map==='gut'){
      if(g.time>=g.nextBifido){g.nextBifido+=11;if(g.bifidos.length<6)g.bifidos.push({x:W*(.12+Math.random()*.76),y:h*(.17+Math.random()*.65),age:0});}
      g.bifidos=g.bifidos.filter(function(b){
        b.age+=dt;
        if(g.hero.mode==='cargo'&&dist(p,b)<g.radius+6&&occupancy(p)<g.capacity){
          p.cargo.push({kind:'bifido',progress:0});p.biteTime=g.time;g.ateProbiotic=true;tally(g,'bifido');ops.float('误吞益生菌',p.x,p.y-16,'#acffaf');return false;
        }
        var t=nearest(g.enemies,b,function(e){return e.kind!=='virus';});if(!t)return true;
        var d=dist(b,t),v=Math.min(1,34*dt/(d||1));b.x+=(t.x-b.x)*v;b.y+=(t.y-b.y)*v;
        if(d<t.r+7){ops.damage(t,20);if(Math.random()<.55)g.hearts.push({x:b.x,y:b.y,until:g.time+20});return false;}return true;
      });
      g.hearts=g.hearts.filter(function(v){if(dist(p,v)<g.radius+9){p.hp=Math.min(g.hero.hp,p.hp+5);ops.float('+5 HP',p.x,p.y-14,'#9cff95');return false;}return v.until>g.time;});
    }
  }
  function barrier(g,ops){
    if(g.map!=='brain')return;g.barrier=Math.max(0,g.barrier-8);
    if(!g.barrier){g.lastHit='barrier';g.p.hp=0;}else if(g.barrier<=28)ops.notice('血脑屏障完整度仅余 '+g.barrier+'%');
  }
  var netRadius=120;
  function netOrigin(g){return {x:g.netX!=null?g.netX:g.p.x,y:g.netY!=null?g.netY:g.p.y};}
  function inNet(g,e){return !e.dead&&dist(e,netOrigin(g))<=netRadius+e.r;}
  function armyInterval(kind){return kind==='ctl'?1.55:1.05;}
  function heroTick(g,dt,ops){
    var p=g.p;
    if(g.hero.mode==='nets'){
      if(!(g.netUntil>g.time))p.hp=Math.max(0,p.hp-1.5*dt);if(p.hp<=0)g.lastHit='bleed';
      if(g.netUntil && g.time<=g.netUntil+.04){
        g.enemies.forEach(function(e){if(inNet(g,e))e.root=Math.max(e.root,netRoot(g,e));});
        while((g.netTicks||0)>0 && g.netTick<=g.time){
          var before=g.kills;
          g.enemies.forEach(function(e){if(inNet(g,e))ops.damage(e,12);});
          if(g.kills-before>=12)g.swept=true;
          g.netTicks--;g.netTick+=.85;
        }
      }
    }
    if(g.hero.mode==='laser'){
      g.laserIn=Math.max(0,g.laserIn-dt/D.cooldownScale(g.levels));
      var reach=340+g.levels.actin*22,tar=g.laserTarget;
      if(!g.laserIn||!tar||tar.dead||dist(p,tar)>reach){
        var best=Infinity;tar=null;
        nearby(g,p,reach).forEach(function(e){if(e.dead||dist(e,p)>reach)return;var score=e.hp-((D.infected(e.kind)||e.hypha||e.bossSerial)?100000:0);if(score<best){best=score;tar=e;}});
        g.laserTarget=tar;
      }
      if(!g.laserIn&&tar){
          var weak=D.infected(tar.kind)||tar.hypha,theta=Math.atan2(tar.y-p.y,tar.x-p.x);
          g.laserIn=.6;window.ActiveSkills.fireRay(g,weak?'nk_crit':'nk',tar,theta);
          ops.damage(tar,16*(weak?3+.1*(g.levels.ifn||0):1),false,theta,null,weak?'weakBeam':'beam');
          if(weak)ops.float('突触暴击',tar.x,tar.y-tar.r,'#ffda86');
      }
    }
    if(g.hero.mode==='summon'){
      // Two baseline B-cell sentries give the summoner a source of first-level antigens.
      var kinds={ctl:g.levels.ctl,turret:2+(g.levels.turret||0)},serial=0;
      Object.keys(kinds).forEach(function(k){var n=kinds[k];
        for(var i=0;i<n;i++,serial++){
          var f=g.army[serial];if(!f||f.kind!==k)f=g.army[serial]={kind:k,cool:i*.15};
          var a=g.time*.8+serial*2.4,r=g.rallyUntil>g.time?15+(serial%4)*4:24+(serial%4)*14;
          f.x=p.x+Math.cos(a)*r;f.y=p.y+Math.sin(a)*r;
          var cooldown=armyInterval(k);
          var fatigue=g.event&&g.event.id==='stayup'?1.25:1;
          f.cool-=dt*(g.rallyUntil>g.time?1.85:1)*(r<=52?1.35:1)/(fatigue*D.cooldownScale(g.levels));
          if(f.cool<=0){var target=ops.nearest(f,k==='ctl'?function(e){return D.infected(e.kind)||e.hypha;}:function(e){return D.capsule(e.kind)&&!e.mark;},280+g.levels.actin*22);
            if(target){ops.shot(k==='ctl'?'ctl':'igg',f,target,k==='ctl'?8+3*g.levels.ctl:6+g.levels.turret);f.cool=cooldown;}}
        }
      });g.army.length=serial;g.armyCap=serial;
      g.summonIn-=dt;if(g.summonIn<=0){var gather=78+g.levels.actin*12,enemy=nearest(nearby(g,p,gather),p,function(e){return dist(e,p)<gather;});
        if(enemy){ops.orb(enemy.x,enemy.y,1);g.summonIn=2.5;}}
    }
    g.rays=g.rays.filter(function(r){return r.until>g.time;});
  }
  function armoredCaptain(e){return e.captain&&e.hp>e.max*.35;}
  function netRoot(g,e){
    var resistant=((g.mode==='endless'&&g.time>=240)||(g.mode==='campaign'&&g.stage>=9))&&(e.bossSerial||e.captain);
    return Math.max(0,g.netUntil-g.time-(resistant?2.3:0));
  }
  function neutroKill(g,e,ops){
    if(armoredCaptain(e))return;
    var isVirus=e.kind==='virus';
    ops.kill(e);
    if(!isVirus){
      g.netKills++;ops.storm(1);
      if(g.netKills%4===0){
        if(g.levels.acid)ops.area(g.p,28+g.levels.acid*5,2+g.levels.acid,'#b3e595',true);
        if(g.levels.ros){ops.area(g.p,46+g.levels.ros*14,7+g.levels.ros*6,'#ffcc76',false,true);}
      }
    }
    var late=g.mode==='endless'&&g.time>=240;
    var charge=isVirus?2:late?(g.time>=360?4:5):7;
    if(g.time>=g.netUntil)g.netEnergy=Math.min(100,g.netEnergy+charge);
    g.p.hp=Math.min(g.hero.hp,g.p.hp+(isVirus?.4:1.2));

  }
  function phaseImpact(g,e,ops){
    g.hitStop=Math.max(g.hitStop||0,.06);
    ops.fx('ring',e.x,e.y,e.r+24,'#ffdb96',.25);
    e.plasmid=Math.max(e.plasmid||0,.25);
    g.shots=g.shots.filter(function(s){
      if((s.kind==='plasmid'||s.kind==='sporebolt')&&dist(e,s)<=36){s.life=0;return false;}
      return true;
    });
  }
  function bounded(value,min,max){return Math.max(min,Math.min(max,value));}
  function atEdge(e,h,dx,dy){
    return {x:bounded(e.x+dx,20,W-20),y:bounded(e.y+dy,28,h-28)};
  }
  function bolt(g,e,angle,speed,curve){
    if(g.shots.length<220)g.shots.push({kind:'sporebolt',x:e.x,y:e.y,a:angle,life:3.6,speed:speed,curve:curve||0,from:e.kind});
  }
  function onRemoval(g,e,ops,swallowed){
    if(e.resonant){g.cutLinks++;e.resonant=false;}
    if(e.bossSerial){
      var lord=D.bossKinds.indexOf(e.kind);
      if(g.mode==='endless'&&lord>=0)g.lordMask=(g.lordMask||0)|(1<<lord);
      g.enemies.forEach(function(v){
        if(v.dead)return;
        if(v.mirrorFor===e.bossSerial){g.trueEye=true;v.dead=true;}
        if(v.coreFor===e.bossSerial)v.dead=true;
        if(v.supplyFor===e.bossSerial){delete v.supplyFor;v.resonant=false;}
      });
    }
    if(swallowed||e.coreFor||e.mirrorFor)return;
    if(e.kind==='strepto'&&!e.cloned){
      var tail=ops.spawn('strepto',e.x-6,e.y+5);
      if(tail){tail.cloned=true;tail.r*=.64;tail.hp=tail.max=Math.max(1,Math.round(tail.max*.4));}
    }else if(e.kind==='meningo'){
      g.films.push({kind:'haze',x:e.x,y:e.y,r:26,life:1});
    }else if(e.kind==='clostrid'){
      ops.fx('ring',e.x,e.y,48,'#e3b6de');
      [g.p].concat(g.enemies).forEach(function(v,i){
        if(v===e||v.dead||v.coreFor||v.bossSerial)return;
        var d=dist(v,e);if(d>=48)return;
        var a=d?Math.atan2(v.y-e.y,v.x-e.x):0;
        v.x=bounded(v.x+18*Math.cos(a),6,W-6);v.y=bounded(v.y+18*Math.sin(a),8,ops.height()-8);
        if(i)trackEnemy(g,v,i-1);
      });
    }
  }
  function linked(g,e,key){
    return g.enemies.filter(function(v){return !v.dead&&v[key]===e.bossSerial;});
  }
  function bossDefense(g,e,n,pierce,source,ops){
    if(!e.bossSerial)return n;
    if(e.kind==='boss_cdiff'){
      if(e.coreUntil)return n*.10;
      if(e.weakUntil>g.time)return n*1.5;
    }else if(e.kind==='boss_crypto'&&e.capsuleHP>0){
      var breaker=pierce||['igg','mist','beam','weakBeam'].indexOf(source)>=0;
      e.capsuleHP=Math.max(0,e.capsuleHP-n*(breaker?2:1));
      if(!e.capsuleHP){e.regrowAt=g.time+12;window.PatrolRules.phaseImpact(g,e,ops);}
      if(!breaker)return n*.55;
    }else if(e.kind==='boss_biofilm'&&e.phase===3){
      return n*(1-.18*linked(g,e,'supplyFor').length);
    }
    return n;
  }
  function aimDash(g,e,wait){
    e.chargeAngle=Math.atan2(g.p.y-e.y,g.p.x-e.x);e.chargeLeft=wait;
  }
  function doubleDash(g,e,dt,h){
    if(e.dashLeft>0){
      var step=Math.min(e.dashLeft,dt)*290;e.dashLeft-=dt;
      e.x=bounded(e.x+Math.cos(e.chargeAngle)*step,16,W-16);
      e.y=bounded(e.y+Math.sin(e.chargeAngle)*step,20,h-20);
      if(e.dashLeft<=0&&e.returnDash){e.returnDash=false;aimDash(g,e,.48);}
      return true;
    }
    if(e.chargeLeft>0){e.chargeLeft-=dt;if(e.chargeLeft<=0)e.dashLeft=.49;return true;}
    return false;
  }
  function sporeBeast(g,e,dt,ops){
    var h=ops.height();
    if(e.phase===3&&e.coreUntil){
      var cores=linked(g,e,'coreFor');
      if(!cores.length){
        g.sporeBreaker=true;e.weakUntil=g.time+3;e.coreUntil=0;window.PatrolRules.phaseImpact(g,e,ops);ops.notice('子核清空 · 巨兽虚弱');
      }else if(g.time>=e.coreUntil){
        e.hp=Math.min(e.max,e.hp+e.max*.06*cores.length);e.coreUntil=0;
        cores.forEach(function(v){v.coreFor=0;v.speed=D.species.clostrid.speed;v.r=D.species.clostrid.r;});
        ops.notice('剩余子核孵化 · 巨兽恢复');
      }else return true;
    }
    if(e.weakUntil>g.time)return true;
    if(e.phase===2&&doubleDash(g,e,dt,h))return true;
    if(e.plasmid>0)return false;
    if(e.phase===2){
      e.plasmid=7;e.returnDash=true;aimDash(g,e,.95);ops.notice('二连突刺 · 连续侧移');return true;
    }
    var aim=Math.atan2(g.p.y-e.y,g.p.x-e.x);
    for(var i=-1;i<=1;i++){
      var spot=atEdge(g.p,h,Math.cos(aim+1.57)*i*40,Math.sin(aim+1.57)*i*40);
      g.films.push({kind:'toxin',x:spot.x,y:spot.y,r:23,life:6.7,warm:.7});
    }
    e.plasmid=5.5;return false;
  }
  function cryptoQueen(g,e,dt,ops){
    var h=ops.height(),aim=Math.atan2(g.p.y-e.y,g.p.x-e.x);
    if(!e.capsuleHP&&e.regrowAt&&g.time>=e.regrowAt){e.capsuleHP=e.max*.08;e.regrowAt=0;}
    if(e.tideUntil>g.time&&e.phase===2){
      var d=dist(e,g.p);if(d<180&&d>2){
        var pull=Math.min(d,dt*21);
        g.p.x=bounded(g.p.x-Math.cos(aim)*pull,g.hitRadius,W-g.hitRadius);
        g.p.y=bounded(g.p.y-Math.sin(aim)*pull,g.hitRadius,h-g.hitRadius);
      }
    }
    if(e.plasmid>0)return false;
    if(e.phase===1){
      ops.spawn('candida',e.x+Math.cos(e.age)*20,e.y+8);
      for(var i=0;i<6;i++)bolt(g,e,aim+i*TAU/6,52,.42);
      e.plasmid=5;
    }else if(e.phase===2){
      e.tideUntil=g.time+3;e.plasmid=6;
      var gap=Math.floor(e.age)%13;
      for(var j=0;j<13;j++)if(j!==gap&&j!==(gap+1)%13)bolt(g,e,j*TAU/13+.17,61);
      ops.fx('ring',e.x,e.y,180,'#bf9be8',.7);ops.notice('潮汐环 · 穿过缺口');
    }else{
      var image=linked(g,e,'mirrorFor')[0],shooter=e.imageTurn&&image?image:e;
      e.imageTurn=!e.imageTurn;e.plasmid=1.55;
      var direction=Math.atan2(g.p.y-shooter.y,g.p.x-shooter.x);
      for(var k=-1;k<=1;k++)bolt(g,shooter,direction+k*.21,89);
    }
    return false;
  }
  function filmColony(g,e,dt,ops){
    if(e.trail<=0||e.trail==null){e.trail=1.25;g.colonyFilmUntil=g.time+6.5;g.films.push({kind:'colony',x:e.x,y:e.y,r:24,life:6.5});}else e.trail-=dt;
    if(e.plasmid>0)return false;
    var aim=Math.atan2(g.p.y-e.y,g.p.x-e.x),h=ops.height();
    if(e.phase===2){
      var cross=[[0,h*.5],[W,h*.5],[W*.5,0],[W*.5,h]];
      cross.forEach(function(pos){
        var rod=ops.spawn('rod',pos[0],pos[1]);
        if(rod){rod.crossUntil=g.time+2.6;rod.angle=Math.atan2(h*.5-pos[1],W*.5-pos[0]);}
      });
      for(var i=-2;i<=2;i++)bolt(g,e,aim+i*.24,82);
      ops.notice('四侧增援 · 避开十字线');e.plasmid=6.5;
    }else if(e.phase===3){
      var guards=linked(g,e,'supplyFor');
      if(!e.linkedOnce){
        var pool=g.enemies.filter(function(v){return !v.dead&&!v.bossSerial&&!v.supplyFor&&!v.mirrorFor&&!v.coreFor&&v.kind!=='virus';});
        for(var j=0;j<3;j++){
          var guard=pool[j]||ops.spawn('rod',bounded(e.x+(j-1)*32,18,W-18),bounded(e.y+30,18,h-18));
          if(guard){guard.supplyFor=e.bossSerial;guard.resonant=true;guards.push(guard);}
        }
        e.linkedOnce=true;ops.notice('共鸣护甲 · 击破连线护卫');
      }
      guards.forEach(function(v){bolt(g,v,Math.atan2(g.p.y-v.y,g.p.x-v.x),68);});
      e.plasmid=3;
    }else e.plasmid=2;
    return false;
  }
  function organBoss(g,e,dt,ops){
    var fraction=e.hp/e.max,phase=Math.max(e.phase||1,fraction>.65?1:fraction>.3?2:3);
    if(phase!==e.phase){
      e.phase=phase;e.plasmid=.35;e.chargeLeft=0;e.dashLeft=0;e.tideUntil=0;ops.sound('phase');
      window.PatrolRules.phaseImpact(g,e,ops);
      if(phase===3&&e.kind==='boss_cdiff'){
        e.coreUntil=g.time+8;
        for(var i=0;i<3;i++){var a=i*TAU/3,at=atEdge(e,ops.height(),66*Math.cos(a),66*Math.sin(a));
          var core=ops.spawn('clostrid',at.x,at.y,true);core.coreFor=e.bossSerial;core.r=8;core.speed=0;core.hp=core.max=27;}
        ops.notice('芽孢再生 · 八秒拆三核',4);
      }
      if(phase===3&&e.kind==='boss_crypto'){
        e.x=bounded(e.x,46,W-46);e.y=bounded(e.y,60,ops.height()-60);
        var image=ops.spawn('boss_crypto',W-e.x,ops.height()-e.y,true);
        image.mirrorFor=e.bossSerial;image.hp=image.max=Math.round(e.max*.30);image.speed=0;image.r=e.r*.91;
        ops.notice('双相镜像 · 找金色核仁',4);
      }
    }
    if(e.root>0)return true;
    var chase=g.mode==='campaign'&&g.stage>=6?Math.min(5,Math.floor(Math.max(0,g.time-g.duration)/15)):0;
    var winding=e.plasmid>0;
    e.plasmid-=dt*(1+.12*chase);
    if(chase&&winding&&e.plasmid<=0)bolt(g,e,Math.atan2(g.p.y-e.y,g.p.x-e.x)+.15,76);
    return e.kind==='boss_cdiff'?sporeBeast(g,e,dt,ops):e.kind==='boss_crypto'?cryptoQueen(g,e,dt,ops):filmColony(g,e,dt,ops);
  }
  function bossAction(g,e,dt,ops){
    if(e.regenerates&&!(e.coreUntil||e.weakUntil>g.time))e.hp=Math.min(e.max,e.hp+dt*e.max*.0015);
    if(e.fission&&g.time>=(e.fissionAt||0)){
      e.fissionAt=g.time+14;ops.spawn('strepto',e.x-12,e.y+8);ops.spawn('strepto',e.x+12,e.y+8);
    }
    if(e.kind!=='boss')return organBoss(g,e,dt,ops);
    if(e.root>0)return true;
    var fraction=e.hp/e.max,phase=Math.max(e.phase||1,fraction>.65?1:fraction>.30?2:3),h=ops.height();
    if(e.phase!==phase){
      ops.sound('phase');phaseImpact(g,e,ops);e.phase=phase;e.chargeLeft=0;e.dashLeft=0;e.chargeIn=2;
      if(phase===3){
        e.shell=Math.round(e.max*.14);
        [-1,1].forEach(function(dir){
          var node=ops.spawn('ecoli',Math.max(18,Math.min(W-18,e.x+dir*56)),Math.max(45,Math.min(h-26,e.y+34)),true);
          node.hp=node.max=Math.round(46+e.max*.015);node.supplyFor=e.bossSerial;node.speed*=.42;node.resistant=true;
        });
        ops.notice('先清除两只供能菌',4);
      }
    }
    if(phase===3&&e.shell>0&&!g.enemies.some(function(v){return !v.dead&&v.supplyFor===e.bossSerial;})){
      e.shell=0;phaseImpact(g,e,ops);ops.notice('供能已断 · 外壳瓦解',3);
    }
    var bossChase=g.mode==='campaign'&&g.stage>=6?Math.min(5,Math.floor(Math.max(0,g.time-g.duration)/15)):0;
    e.plasmid-=dt*(1+.12*bossChase);
    if(e.plasmid<=0){
      var n=e.variant===2?20:14;
      for(var i=0;i<n&&g.shots.length<240;i++)g.shots.push({kind:'plasmid',x:e.x,y:e.y,a:i*TAU/n+e.age*.2,life:3.2,speed:73});
      e.plasmid=e.variant===2?3.6:5;
      if(phase===1&&(e.guardsAt==null||e.guardsAt<=g.time)){
        e.guardsAt=g.time+14;ops.spawn('pneumo',e.x-20,e.y+16);ops.spawn('rod',e.x+20,e.y+16);
      }
    }
    if(phase!==2)return false;
    if(e.dashLeft>0){
      var travel=Math.min(dt,e.dashLeft)*340;e.dashLeft-=dt;
      e.x=Math.max(12,Math.min(W-12,e.x+Math.cos(e.chargeAngle)*travel));
      e.y=Math.max(16,Math.min(h-16,e.y+Math.sin(e.chargeAngle)*travel));return true;
    }
    if(e.chargeLeft>0){
      e.chargeLeft-=dt;
      if(e.chargeLeft<=0){e.dashLeft=.59;ops.fx('ring',e.x,e.y,34,'#ff827c');}
      return true;
    }
    e.chargeIn-=dt;if(e.chargeIn<=0){
      e.chargeIn=9;e.chargeLeft=1.1;e.chargeAngle=Math.atan2(g.p.y-e.y,g.p.x-e.x);
      ops.notice('冲撞预警 · 横移躲避',3);
      return true;
    }
    return false;
  }
  function stamps(g,won){
    var ids=[];if(g.fullDeath||g.fullBounces>=15)ids.push('overeat');if(g.bestPneumoStreak>=10)ids.push('waterloo');
    if(won&&g.survivedAntibiotic)ids.unshift('poison');if(g.phageElite>=1)ids.push('enemy_of_enemy');if(won&&g.map==='gut'&&!g.ateProbiotic)ids.push('sterile');
    if(won&&g.map==='brain'&&g.barrier>=92)ids.push('precision');
    if(won&&g.coffeeDone>=2)ids.push('coffee');
    if(g.nightStamp)ids.push('night');
    if(g.cutLinks>=5)ids.push('cutter');
    if(g.swept)ids.push('sweep');
    if(won&&g.lowSince>=0&&g.time-g.lowSince>=20)ids.push('icu');
    if(g.mode==='endless'&&g.time>360)ids.push('watch');
    if(g.sporeBreaker)ids.push('spore_breaker');
    if(g.trueEye&&won)ids.push('true_eye');
    if(g.mode==='endless'&&g.lordMask===15)ids.push('abyss_lord');
    return ids;
  }
  function levelUp(g){if(g.event&&g.event.id==='stayup'&&g.time<g.event.until){g.nightLevels=(g.nightLevels||0)+1;if(g.nightLevels>=2)g.nightStamp=true;}}
  window.PatrolRules={netRadius:netRadius,inNet:inNet,armyInterval:armyInterval,onRemoval:onRemoval,bossDefense:bossDefense,levelUp:levelUp,bossAction:bossAction,phaseImpact:phaseImpact,countClear:countClear,waveCleared:waveCleared,config:config,occupancy:occupancy,tally:tally,event:event,clocks:clocks,phages:phages,fibrin:fibrin,
    cargoDuration:cargoDuration,rebuildGrid:rebuildGrid,trackEnemy:trackEnemy,nearby:nearby,armoredCaptain:armoredCaptain,netRoot:netRoot,
    enemyTraits:enemyTraits,alkali:alkali,cargoStep:cargoStep,environmental:environmental,barrier:barrier,heroTick:heroTick,neutroKill:neutroKill,stamps:stamps};
}());
