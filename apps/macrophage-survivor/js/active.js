(function(){
  'use strict';
  var D=window.ImmuneData,primary={cargo:'dash',nets:'net',laser:'salvo',summon:'rally'},tactics=['mist','pulse','veil'];
  function status(g,slot){
    var k=slot===1?primary[g.hero.mode]:tactics.filter(function(id){return g.levels[id]>0;})[0];
    var a=D.actives[k],locked=(g.mode!=='endless'&&g.stage<3)||!a,cd=a?a.cd-(a.cdStep||0)*Math.max(0,(g.levels[k]||1)-1):0;
    cd*=D.cooldownScale(g.levels);
    var left=Math.max(0,(g['actUntil'+slot]||0)-g.time),ratio=cd?Math.min(1,left/cd):0;
    if(k==='net'){ratio=1-g.netEnergy/100;left=0;}
    return {key:k||'',name:a?a.name:'战术槽',locked:locked,ready:!locked&&ratio<=0,ratio:ratio,left:left,cd:cd};
  }
  function gap(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
  function fireRay(g,kind,target,angle,range){
    var ray={kind:kind,target:target,tx:target?target.x:g.p.x,ty:target?target.y:g.p.y,
      angle:angle,range:range,born:g.time,until:g.time+(kind==='nk'||kind==='nk_crit'?.19:.22)};
    g.rays.push(ray);
    if(g.hero.mode==='laser'){g.laserAt=g.time;g.laserAngle=angle;}
    return ray;
  }
  function aimRay(g,r){
    // Even a defeated target retains its final coordinates for the brief impact flash.
    if(r.target){r.tx=r.target.x;r.ty=r.target.y;if(r.target.dead)r.target=null;}
    var p=g.p,angle=r.kind==='salvo'?r.angle:Math.atan2(r.ty-p.y,r.tx-p.x);
    var dx=Math.cos(angle),dy=Math.sin(angle),radius=g.hitRadius||g.radius||12;
    var distance=r.kind==='salvo'?r.range:Math.hypot(r.tx-p.x,r.ty-p.y);
    var lip=Math.min(radius*.89,distance);
    var hit=r.kind==='salvo'?r.hitDistance:distance;
    return {x:p.x+dx*lip,y:p.y+dy*lip,angle:angle,length:distance-lip,
      impact:hit!=null,impactX:p.x+dx*(hit||0),impactY:p.y+dy*(hit||0)};
  }
  function dash(g,ops){
    var p=g.p,a=g.stick&&(g.stick.dx||g.stick.dy)?Math.atan2(g.stick.dy,g.stick.dx):p.angle;
    var start={x:p.x,y:p.y};p.angle=a;
    p.x=Math.max(g.hitRadius,Math.min(360-g.hitRadius,p.x+68*Math.cos(a)));
    p.y=Math.max(g.hitRadius,Math.min(ops.height()-g.hitRadius,p.y+68*Math.sin(a)));
    var dx=p.x-start.x,dy=p.y-start.y,d2=dx*dx+dy*dy;
    var crossed=g.enemies.map(function(e){
      var f=Math.max(0,Math.min(1,((e.x-start.x)*dx+(e.y-start.y)*dy)/(d2||1)));
      return {e:e,f:f,d:Math.hypot(e.x-start.x-f*dx,e.y-start.y-f*dy)};
    }).filter(function(v){return !v.e.dead&&v.d<g.reachRadius+v.e.r;}).sort(function(a,b){return a.f-b.f;});
    var count=0;crossed.forEach(function(v){if(count<2&&ops.swallow(v.e))count++;});
    p.cargo.forEach(function(v){v.progress=Math.min(1,v.progress+.4);});p.inv=Math.max(p.inv,.45);
    g.rays.push({kind:'dash',x:start.x,y:start.y,xx:p.x,yy:p.y,born:g.time,until:g.time+.22});ops.fx('ring',p.x,p.y,24,'#a4ffe5');
  }
  function beam(g,ops){
    var p=g.p,h=ops.height(),target=null,score=-Infinity;
    g.enemies.forEach(function(e){if(e.dead||e.x<0||e.y<0||e.x>360||e.y>h)return;
      var priority=(D.infected(e.kind)||e.hypha?3000:e.bossSerial?2000:e.resistant?1000:0)-gap(p,e);
      if(priority>score){score=priority;target=e;}
    });
    var angle=target?Math.atan2(target.y-p.y,target.x-p.x):p.angle,dx=Math.cos(angle),dy=Math.sin(angle),range=Math.hypot(360,h);
    var ray=fireRay(g,'salvo',null,angle,range);ray.hitDistance=target?gap(p,target):null;ray.finisher=g.beams===1;
    var before=g.kills;
    g.enemies.forEach(function(e){
      var x=e.x-p.x,y=e.y-p.y,d=x*dx+y*dy;
      if(!e.dead&&d>=0&&d<=range&&Math.abs(x*dy-y*dx)<=e.r+4)ops.damage(e,30,true,angle,null,'beam');
    });
    if(g.beams===1)ops.area(target||p,65,55,'#ffd39f');
    var kills=g.kills-before;
    if(kills+(g.time-g.lastBeamAt<=.5?g.lastBeamKills:0)>=12)g.swept=true;
    g.lastBeamKills=kills;g.lastBeamAt=g.time;g.beams--;g.nextBeam+=.4;
  }
  function cast(g,slot,ops){
    var s=status(g,slot);if(!s.ready)return false;
    var k=s.key,p=g.p,a=D.actives[k],power=a.power+(g.levels[k]-1)*a.gain;
    g['actUntil'+slot]=g.time+s.cd;
    var before=g.kills;
    if(k==='dash')dash(g,ops);
    if(k==='net'){
      var netR=window.PatrolRules.netRadius;
      g.netEnergy=0;g.netUntil=g.time+4.5;g.netTick=g.time+.85;g.netTicks=5;g.netX=p.x;g.netY=p.y;
      g.enemies.forEach(function(e){
        if(e.dead||gap(e,p)>netR+e.r)return;
        e.root=Math.max(e.root,window.PatrolRules.netRoot(g,e));
        if(e.chargeLeft>0||e.dashLeft>0){e.chargeLeft=0;e.dashLeft=0;e.chargeIn=9;}
      });
      ops.fx('ring',p.x,p.y,netR,'#f3ffff',.55);
    }
    if(k==='salvo'){g.beams=6;g.nextBeam=g.time+.4;g.lastBeamAt=-1;g.lastBeamKills=0;}
    if(k==='rally'){g.rallyUntil=g.time+4;g.army.forEach(function(f){f.x=p.x;f.y=p.y;});ops.fx('ring',p.x,p.y,95,'#ffda85',.6);}
    if(k==='mist'){
      var bonus=0;
      p.cargo.forEach(function(v){
        if(v.kind!=='bifido'){
          window.PatrolRules.countClear(g,v.kind,p,ops);
          if(ops.orb)ops.orb(p.x,p.y,D.antigenValue(v,false));
          bonus+=10*D.cargoSlots(v.kind);
        }
      });
      p.cargo=[];g.netEnergy=Math.max(0,(g.netEnergy||0)-30);
      var mistPower=power+Math.min(50,bonus);
      g.enemies.forEach(function(e){var d=gap(e,p);
        if(!e.dead&&d<=140+e.r&&(d<=e.r||((e.x-p.x)*Math.cos(p.angle)+(e.y-p.y)*Math.sin(p.angle))/d>=.42)){
          if(D.capsule(e.kind))e.mark=true;e.slowUntil=g.time+3;ops.damage(e,mistPower,false,null,null,'mist');
        }
      });ops.fx('ring',p.x+Math.cos(p.angle)*55,p.y+Math.sin(p.angle)*55,65,'#bbf68c');
    }
    if(k==='pulse'){
      window.PatrolRules.barrier(g,ops);ops.area(p,125,power,'#ffbb68',false,true);
      g.films=g.films.filter(function(v){return gap(v,p)>125+v.r;});
      g.enemies.forEach(function(e,i){var d=gap(e,p);if(!e.dead&&d>0&&d<=125+e.r){e.x+=(e.x-p.x)*25/d;e.y+=(e.y-p.y)*25/d;window.PatrolRules.trackEnemy(g,e,i);}});
    }
    if(k==='veil'){
      g.shieldHP=power;g.shieldUntil=g.time+4.5;p.hp=Math.min(g.hero.hp,p.hp+15);
      ops.fx('ring',p.x,p.y,32,'#a7eaff');
    }
    if(g.kills-before>=12)g.swept=true;
    return true;
  }
  function tick(g,ops){
    while(g.beams>0&&g.time>=g.nextBeam)beam(g,ops);
    if(g.shieldUntil<=g.time)g.shieldHP=0;
  }
  window.ActiveSkills={status:status,cast:cast,tick:tick,fireRay:fireRay,aimRay:aimRay};
}());
