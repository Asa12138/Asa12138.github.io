(function () {
  'use strict';
  var D=window.ImmuneData;
  var stages=[
    {id:1,name:'破口初阵',map:'skin',duration:45,bossAt:25,elite:'staph',label:'巨型金葡聚落',hp:105},
    {id:2,name:'荚膜防线',map:'skin',duration:60,bossAt:35,elite:'pneumo',label:'荚膜卫队长',hp:88,targets:2},
    {id:3,name:'胞内警报',map:'skin',duration:75,bossAt:45,elite:'latent',label:'感染细胞巢',hp:245},
    {id:4,name:'气浪抗药',map:'lung',duration:90,bossAt:60,elite:'tb',label:'蜡壳重装菌团',hp:345},
    {id:5,name:'菌王总决战',map:'lung',duration:120,bossAt:75},
    {id:6,name:'肠道协防',map:'gut',duration:180,bossAt:118,lords:['boss_cdiff']},
    {id:7,name:'屏障守夜',map:'brain',duration:180,bossAt:115,lords:['boss_crypto']},
    {id:8,name:'禁区双王',map:'brain',duration:180,bossAt:108,targets:2,lords:['boss_crypto','boss_biofilm']}
  ];
  var gates={actin:1,acid:1,ros:2,igg:2,ctl:3,c3:3,turret:4,ifn:3,mhc:4,mist:3,pulse:3,veil:3};
  function configure(g,mode,stage,map){
    var s=stages[stage-1]||stages[0],endless=mode==='endless';
    g.mode=endless?'endless':'campaign';g.stage=s.id;g.duration=g.goal=endless?0:s.duration;
    g.map=endless&&D.maps[map]?map:s.map;g.bossAt=endless?epochLength:s.bossAt;
    g.waveClock=0;g.actUntil1=0;g.actUntil2=0;g.shieldHP=0;g.shieldUntil=0;g.rallyUntil=0;
    g.beams=0;g.coffeeDone=0;g.cutLinks=0;g.phageElite=0;g.lowSince=-1;
    g.nextFormation=40;g.epoch=0;g.bossCount=0;g.synapseIn=2;g.stormLoad=0;g.netKills=0;
    g.nextCaptain=240;g.formationCount=0;
    if(endless)g.eventSchedule=[45,90];
    if(!endless&&g.stage<3)g.phageSchedule=[];
    if(!endless&&g.stage<2)g.eventSchedule=[];
    if(!endless&&g.stage===3)g.phageSchedule=[34];
  }
  function tier(g){return g.mode==='endless'?8:g.stage;}
  function skillAllowed(g,key){
    if(!gates[key]||gates[key]>tier(g))return false;
    if(D.actives[key])return !['mist','pulse','veil'].some(function(other){return other!==key&&g.levels[other]>0;});
    if(key==='turret')return g.hero.mode==='summon';
    if(key==='ros'||key==='acid')return g.hero.mode==='cargo'||g.hero.mode==='nets';
    return true;
  }
  function skillCap(g,k){return !D.actives[k]&&k!=='ifn'&&k!=='mhc'&&g.mode==='endless'&&g.time>=120?5:3;}
  function recipeGroups(recipe){return [[recipe.needs[0]],recipe.alternate?[recipe.needs[1],recipe.alternate]:[recipe.needs[1]]];}
  function recipeAllowed(g,key){
    return tier(g)>=(key==='synapse'?4:3)&&recipeGroups(D.supers[key]).every(function(group){
      return group.some(function(id){return skillAllowed(g,id);});
    });
  }
  function recipeReady(g,key){
    return recipeAllowed(g,key)&&recipeGroups(D.supers[key]).every(function(group){
      return group.some(function(id){return g.levels[id]>=3;});
    });
  }
  function skillValue(g,k,level){return window.DisplayTier.tierDesc(k,level,g.hero);}
  var pools={
    skin:[['strepto',2],['clostrid',6],['acineto',7]],
    lung:[['tb',4],['ecoli',4],['strepto',2],['pylori',5],['candida',5],['cmv',6]],
    gut:[['salmonella',5],['ecoli',4],['pylori',5],['candida',5],['clostrid',6]],
    brain:[['meningo',7],['acineto',7],['cmv',6],['candida',5]]
  };
  function spawnKind(g){
    var level=tier(g),pool=pools[g.map]||pools.skin;
    if(g.time>8 && Math.random()<(level>=6?.56:.35)){
      var available=pool.filter(function(row){
        return level>=row[1] && !(row[0]==='acineto'&&g.mode==='endless'&&g.time<120);
      });
      if(available.length)return available[Math.floor(Math.random()*available.length)][0];
    }
    var roll=Math.random();if(level>=3&&g.time>=9&&roll<.13)return 'latent';
    if(level>=2&&g.time>=7&&roll<.36)return 'rod';
    if(level>=2&&g.time>=4&&roll<.62)return 'pneumo';return 'staph';
  }
  var eras=['潜伏定植','耐药扩散','生物被膜','细胞因子枯竭'];
  function era(g){return Math.floor(g.time/120);}
  function spawnLimit(g){return g.mode==='endless'?90+15*Math.min(3,era(g)):100;}
  function spawnDelay(g){
    var t=g.time;
    if(g.mode!=='endless')return Math.max(.32,1.05-t*.004)/(g.stage>=6?1.10+.55*Math.min(1,t/55):1);
    if(t<120)return .95-.53*t/120;
    if(t<240)return .42-.18*(t-120)/120;
    if(t<360)return .24-.07*(t-240)/120;
    return .14;
  }
  function hpScale(g){
    var t=g.time,x;
    if(t<120)return 1+.48*t/120;
    if(t<240){x=(t-120)/120;return 1.48+x*(.72+.4*x);}
    if(t<360){x=(t-240)/120;return 2.6+x*(1.5+.7*x);}
    x=(t-360)/30;return 4.8+x*(.55+.055*x);
  }
  function contactScale(g){
    if(g.mode!=='endless'||era(g)===0)return 1;
    return era(g)===1?1.15:1.35+.22*(era(g)-2);
  }
  function scaleEnemy(g,e){
    if(tier(g)<4||D.bossKinds.indexOf(e.kind)>=0||e.kind==='virus')return;
    var periods=Math.floor(g.time/30);
    if(g.mode==='endless'){
      e.hp=e.max=Math.max(1,Math.round(e.max*hpScale(g)));
      e.speed*=Math.min(1.42,1+periods*.04);
      if(g.time>=360)e.frenzied=true;
      return;
    }
    e.hp=e.max=Math.round(e.max*(1+periods*.16));e.speed*=1+periods*.04;
  }
  function virulence(g){
    var lv=Math.floor(g.time/60)+1,index=era(g);
    var details=['新生菌群生命 '+Math.round(hpScale(g)*100)+'%','自然刷新耐药率 18%','重装队长需削血至 35%','接触伤害 '+Math.round(contactScale(g)*100)+'% · 领主双词缀'];
    return {level:lv,name:eras[Math.min(3,index)],detail:index>=4?'双领主入场 · 接触伤害 '+Math.round(contactScale(g)*100)+'%':details[Math.min(3,index)]};
  }
  function promoteCaptain(g,ops){
    // At the population ceiling promote a live patrol instead of skipping the encounter.
    var e=ops.spawn('staph');
    if(!e)e=g.enemies.find(function(v){return !v.dead&&!v.captain&&!v.bossSerial&&!v.supplyFor&&(v.kind==='staph'||v.kind==='rod'||v.kind==='tb');});
    if(!e)return;
    e.captain=true;e.r*=1.35;e.max=Math.max(40,Math.round(e.max*2.5));e.hp=e.max;
    g.nextCaptain=g.time+22;
    ops.notice('重装队长入场');
  }
  function formation(g,ops){
    var level=tier(g),h=ops.height(),wave=++g.formationCount;
    g.nextFormation=g.time+(g.mode==='endless'&&g.time>=360?24:40);
    var cross=level===4||wave%2===1,n=level>=6?8:5;
    for(var i=0;i<n;i++){
      var edge=i%4,across=.27+(.46*(i+.5)/n),kind=cross?'rod':i%4===0?'pylori':'pneumo';
      var x=edge===0?-6:edge===1?366:360*across,y=edge===2?-6:edge===3?h+6:h*across;
      var e=ops.spawn(kind,x,y);if(e&&(!cross||level>=6&&i%2===0))e.resistant=true;
    }
    ops.notice(cross?'十字冲锋菌潮':'氨云护卫编队',4);
  }
  var epochLength=120;
  function briefing(mode,stage,map){
    if(mode==='endless')return {
      title:'无尽深渊',location:D.maps[map].name,icon:'boss',
      goal:'尽可能长时间存活，挑战轮番登场的变异领主。',
      clockLabel:'时间限制',clock:'无时限',arrivalLabel:'领主间隔',arrival:D.clock(epochLength),
      note:'每个纪元都有新领主加入。生存时长决定当前器官的巡逻排名。'
    };
    var s=stages[stage-1],timed=stage<=5,count=s.targets||1;
    var target=s.label?(count===2?'两名':'')+s.label:(s.lords||['boss']).map(function(k){return D.species[k].name;}).join('与');
    var note=timed?'视野内只剩一个敌人或清场时，波次倒计时加快一倍。':'提前击败目标后仍需守满时间。防守时间到后，存活的首领可继续追击。';
    if(s.map==='brain')note+=' 手动释放活性氧聚爆会消耗 8% 屏障，耗尽即失败。';
    return {title:s.name,target:target,location:'第 '+stage+' 关 · '+D.maps[s.map].name,icon:s.elite||(s.lords||['boss'])[0],
      goal:(timed?'倒计时结束前击败':'守住防线，并击败')+target+'。',
      clockLabel:timed?'波次时限':'最短防守',clock:D.clock(s.duration),
      arrivalLabel:'目标登场时剩余',arrival:D.clock(s.duration-s.bossAt),note:note};
  }
  function missionClock(g){
    if(g.mode==='endless')return {label:'存活时间',seconds:g.time};
    if(g.stage<=5)return {label:'限时剩余',seconds:Math.max(0,Math.ceil(g.duration-g.waveClock))};
    if(g.time>=g.duration)return {label:'追击用时',seconds:g.time-g.duration};
    return {label:'防守剩余',seconds:Math.ceil(g.duration-g.time)};
  }
  function addBoss(g,ops,s,index){
    var endless=g.mode==='endless',cycle=endless?Math.max(0,g.epoch-1):Math.max(0,g.stage-5);
    var kind=s.elite||(s.lords?s.lords[index]:endless?D.bossKinds[(cycle+index)%D.bossKinds.length]:'boss');
    var e=ops.spawn(kind,index?288:92,-12,true);
    e.bossSerial=++g.bossCount;e.elite=!!s.elite;e.phase=1;e.variant=0;e.label=s.label||D.species[kind].name;
    if(e.elite){e.hp=e.max=s.hp;e.r*=1.82;e.speed=18;e.fuse=99999;}
    else{
      var baseSpeed=kind==='boss'?26:D.species[kind].speed;
      var life=endless?1450*(1+.30*cycle+.055*cycle*cycle):[1120,1660,1840,1270][cycle];
      e.speed=baseSpeed;e.affix='';
      if(endless&&g.epoch>=2){
        var affixes=['迅捷','厚甲','再生','裂变护卫'];
        var first=(cycle-1+index)%affixes.length,second=(first+1)%affixes.length;
        e.affix=affixes[first]+(g.epoch>=3?' · '+affixes[second]:'');
        if(e.affix.indexOf('迅捷')>=0)e.speed*=1.14;
        if(e.affix.indexOf('厚甲')>=0)life*=1.22;
        e.regenerates=e.affix.indexOf('再生')>=0;e.fission=e.affix.indexOf('裂变')>=0;
      }
      e.speed=Math.min(baseSpeed*1.32/1.15,e.speed*(1+(endless?cycle*.035:0)));
      e.hp=e.max=Math.round(life);
      if(kind==='boss_crypto')e.capsuleHP=e.max*.08;
    }
    if(!g.boss||g.boss.dead)g.boss=e;
    g.bossDead=false;g.bossSpawned=true;
    ops.notice(e.label+'入场',4);ops.sound('boss');return e;
  }
  function tick(g,ops){
    if(tier(g)>=4&&g.time>=g.nextFormation)formation(g,ops);
    if(g.mode==='endless'&&g.time>=g.nextCaptain)promoteCaptain(g,ops);
    if((g.mode==='campaign'&&g.stage<=5?Math.max(g.waveClock||0,g.time):g.time)<g.bossAt)return;
    if(g.mode==='endless'){
      g.epoch++;ops.sound('epoch');g.bossAt+=epochLength;
      var active=g.enemies.filter(function(v){return !v.dead&&v.bossSerial;});
      var count=g.epoch>=4?2:1;
      for(var i=0;i<count&&active.length<2;i++){
        var kind=D.bossKinds[(g.epoch-1+i)%D.bossKinds.length];
        if(!active.some(function(v){return v.kind===kind;}))active.push(addBoss(g,ops,{},i));
      }
    }
    else if(!g.bossSpawned){
      var s=stages[g.stage-1];g.actualTarget=briefing('campaign',s.id,g.map).target;
      addBoss(g,ops,s,0);if(s.targets===2)addBoss(g,ops,s,1);
    }
  }
  function bossGone(g){
    g.boss=g.enemies.filter(function(e){return e.bossSerial&&!e.dead;})[0]||null;
    g.bossDead=!g.boss;
  }
  var grades=[
    [0,'见习巡逻员',10],[30,'防线实习生',25],[60,'驻站免疫员',45],[120,'主治免疫官',65],
    [210,'主任免疫官',82],[330,'防线研究员',94],[480,'免疫学首席院士',99]
  ];
  function rank(seconds){
    var row=grades[0];grades.forEach(function(v){if(seconds>=v[0])row=v;});
    return {seconds:row[0],title:row[1],percent:row[2]};
  }
  function reportRow(g){
    var skillKeys=Object.keys(g.levels).filter(function(k){return g.levels[k]>0;}).sort(function(a,b){
      return Number(!!D.actives[b])-Number(!!D.actives[a])||g.levels[b]-g.levels[a];
    });
    var row={time:Math.floor(g.time),kills:g.kills,level:g.level,hero:g.heroId,map:g.map,epoch:g.epoch,
      skills:skillKeys.slice(0,6).map(function(k){return {key:k,level:g.levels[k]};})};
    if(g.mode==='campaign')row.stage=g.stage;
    if(g.reportMeta){
      var threat={S:3,A:2,B:1},species=Object.keys(g.tallies).filter(function(k){return D.species[k]&&k!=='phage'&&k!=='bifido';});
      species.sort(function(a,b){return threat[D.species[b].danger]-threat[D.species[a].danger]||D.species[b].hp-D.species[a].hp;});
      var fresh=g.newStamps||[];
      row.report=Object.assign({},g.reportMeta,{atp:g.earnedAtp,specimen:species[0],
        supers:Object.keys(D.supers).filter(function(k){return g.super[k];}),
        stamps:fresh.concat(g.stamps.filter(function(k){return fresh.indexOf(k)<0;}))});
    }
    return row;
  }
  function record(board,g){
    var row=reportRow(g);
    var result={};['all','skin','lung','gut','brain'].forEach(function(k){
      var entries=board&&Array.isArray(board[k])?board[k].slice():[];
      if(k==='all'||k===g.map)entries.push(row);
      result[k]=entries.sort(function(a,b){return b.time-a.time||b.kills-a.kills||b.level-a.level;}).slice(0,10);
    });return result;
  }
  window.Campaign={stages:stages,configure:configure,briefing:briefing,missionClock:missionClock,tier:tier,skillAllowed:skillAllowed,skillCap:skillCap,skillValue:skillValue,recipeGroups:recipeGroups,recipeAllowed:recipeAllowed,recipeReady:recipeReady,
    spawnLimit:spawnLimit,spawnDelay:spawnDelay,hpScale:hpScale,contactScale:contactScale,virulence:virulence,
    canReroll:function(g){return tier(g)>=5;},spawnKind:spawnKind,scaleEnemy:scaleEnemy,tick:tick,bossGone:bossGone,rank:rank,reportRow:reportRow,record:record};
}());
