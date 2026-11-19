(function(){
  'use strict';
  var tau=Math.PI*2, hues={macrophage:'#69efd4',neutrophil:'#f0ead0',nk:'#bbacff',dc:'#ffcba3'};
  function dot(c,x,y,r,color){c.beginPath();c.arc(x,y,r,0,tau);c.fillStyle=color;c.fill();}
  function line(c,x,y,u,v,color,width){c.beginPath();c.moveTo(x,y);c.lineTo(u,v);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
  function contour(c,n,r,wiggle){c.beginPath();for(var i=0;i<n;i++){var a=i*tau/n,d=r*(1+wiggle*Math.sin(i*3));if(i)c.lineTo(Math.cos(a)*d,Math.sin(a)*d);else c.moveTo(d,0);}c.closePath();}
  function gel(c,x,y,r,inner,edge){var g=c.createRadialGradient(x-r*.27,y-r*.3,.1,x,y,r);g.addColorStop(0,inner);g.addColorStop(.73,edge);g.addColorStop(1,inner);dot(c,x,y,r,g);}
  function trace(c,path,ink,width){
    c.strokeStyle=ink;c.lineWidth=width;c.stroke(new Path2D(path));
  }
  // Pigment, cortical grain and a narrow refracting rim are baked into each sprite.
  function stainedMembrane(c,outline,depth,light,pigment,shade,seed){
    var body=new Path2D(outline),g=c.createLinearGradient(-1,-depth,2,depth);
    g.addColorStop(0,shade);g.addColorStop(.16,light);g.addColorStop(.42,pigment);
    g.addColorStop(.83,shade);g.addColorStop(1,pigment);
    c.fillStyle=g;c.fill(body);c.strokeStyle=light;c.lineWidth=.48;c.stroke(body);
    c.save();c.clip(body);
    for(var i=0;i<55;i++){
      var x=(noise(seed+i)-.5)*26,y=(noise(seed+i+83)-.5)*depth*2;
      dot(c,x,y,.11+.20*noise(seed+i+187),i%3?'rgba(248,255,234,.48)':'rgba(30,21,53,.44)');
    }
    c.restore();
  }
  function spore(c,x,y,rx,ry,light,amber,dark){
    c.save();c.translate(x,y);c.rotate(-.21);c.scale(rx,ry);
    var coat=c.createRadialGradient(-.32,-.38,.03,0,0,1);
    coat.addColorStop(0,light);coat.addColorStop(.46,amber);coat.addColorStop(.77,dark);coat.addColorStop(1,light);
    dot(c,0,0,1,coat);oval(c,-.28,-.36,.29,.16,-.45,'rgba(255,252,223,.92)');c.restore();
  }
  function salmonella(c){
    // Long, swept peritrichous flagella surround a short amber body.
    trace(c,'M-6 -2 C-9 -4 -6 -8 -10 -10 M-1 -4 C-1 -7 3 -8 2 -11 M5 -4 C8 -6 6 -9 10 -11 M8 -2 C12 -4 11 -7 14 -8 M8 1 C10 4 12 2 13.4 4.6 M3 3 C4 7 8 5 9 9 M-3 4 C-6 6 -1 9 -6 10 M-7 3 C-12 5 -10 8 -14 8','#eeb573',.45);
    stainedMembrane(c,'M-9 0 C-9 -3 -7 -4.5 -3 -4.8 L4 -5 C8 -5 10 -3.5 10 -.4 C10 2.6 8 4 4 4.3 L-3 4.7 C-7 4.8 -9.5 3 -9 0 Z',5,'#ffe2a1','#ef9a39','#94501d',41);
    trace(c,'M-7.4 -.7 Q-6.9 -3.3 -3.3 -3.5 L2 -3.7','#fff0b5',.62);
    trace(c,'M-5.7 1 Q-4.1 -1.9 -2 .1 T1.1 .1 Q2.6 -1.8 5.9 -.7','#91502b',.78);
    dot(c,-4,2.4,.48,'#ffd96f');dot(c,6,-2,.48,'#fff3c7');
  }
  function clostridium(c,boss){
    if(boss){
      trace(c,'M-8 -2 C-11 -4 -12.7 -3 -14.1 -5.7 M-9 .4 C-12 -1 -13.1 1 -15 -.3 M-9 2 C-14 3 -12 6 -15.3 7.5 M-7 3 C-10 6 -9 8 -12 9','#c2cb8b',.54);
      stainedMembrane(c,'M-11 -.9 C-10 -5.6 -5 -7.7 1 -7.2 C6 -7.2 11.5 -5.2 12.1 -1.3 C12.8 3.3 8 6.4 3.3 6.2 C-1.4 6 -3.4 4.8 -7.3 4.7 C-10 4.4 -12 2.4 -11 -.9 Z',7.3,'#e1eaa0','#759e66','#294e4c',307);
      trace(c,'M-9.7 -1.4 C-8.8 -5.1 -4.2 -6.6 -.5 -6 M3 -5.9 Q7.8 -5.5 9.6 -3.8','#fcf5ad',.7);
      trace(c,'M-8.1 3.1 Q-5.2 3.2 -3 3.8 T2.7 4.7 Q7.5 5.1 10.8 1.3','#97cc8e',.53);
      trace(c,'M-4.5 -5.5 Q-2.9 -2.7 -4.1 .6 M2.9 -5.6 Q5.5 -3.1 4.3 .4','#456e59',.68);
      spore(c,-6.6,-.5,2.6,2.25,'#fff6b8','#edc16c','#905723');
      spore(c,-.3,-.1,3.25,2.75,'#fff6b8','#f4c675','#915628');
      spore(c,6.5,-.1,2.9,2.45,'#fff4b5','#eebc66','#8f5126');
    }else{
      stainedMembrane(c,'M-10 -1 C-9.6 -3.8 -7.6 -4.6 -3.4 -4.4 L5.1 -4.9 C9 -5.4 11 -3.4 11 -.2 C11 3.1 8.3 4.4 4.6 4 L-5.6 4.7 C-8.8 4.7 -10.5 2.9 -10 -1 Z',4.7,'#f1c5d9','#ba7499','#704564',103);
      trace(c,'M-8.3 -.8 Q-8 -3 -5.3 -3.2 L-.8 -3.4','#ffe2df',.65);
      trace(c,'M-6 1.1 Q-4.4 -1.3 -3.6 .4 T-.5 .4','#744165',.68);
      spore(c,5.5,-.1,4.3,3.45,'#fff4de','#e2c8ae','#976f77');
    }
  }
  function ecoli(c){
    trace(c,'M-6 -1 C-10 -3 -9 -6 -13 -6 M-9 .7 C-13 1 -11 3 -15 4 M-6.5 3 C-10 5 -8.5 8 -12 8','#88bec9',.39);
    stainedMembrane(c,'M-9 .1 C-8.8 -3.6 -4.8 -4.8 -.8 -5.1 C2 -5.4 8 -6 9.8 -3.6 C12 .1 9.3 3.5 5.5 3.7 C1.4 3.5 -.9 4.9 -4.5 5.5 C-7.8 6 -10.1 3.8 -9 .1 Z',5.6,'#b9f7f1','#4abbd0','#266782',157);
    trace(c,'M-7.5 .1 Q-6.8 -3.4 -1.3 -3.9','#ddffed',.6);
    trace(c,'M-4.9 1.9 Q-3.6 -2.9 .4 -1 Q4 1.2 6.2 -1.7 Q5.2 2.2 2 1 Q-1.4 -1 -4.9 1.9 Z','#b4edb0',.64);
    dot(c,7.8,-2.5,.61,'#d5fbe9');dot(c,-5.6,3.3,.45,'#a0deea');
  }
  function pylori(c){
    trace(c,'M-8.7 3.7 C-12 3.1 -12.3 7.3 -15.1 6 M-8.6 3.6 C-12.4 6.8 -11.7 9 -14.1 9.1 M-8.5 4.1 C-11 7 -9.4 8.7 -11.8 10.5 M-8.1 4 C-9.6 7.6 -7.8 9 -9.5 11.1','#dcb6e5',.44);
    stainedMembrane(c,'M-11.4 3.5 C-10.6 -.5 -8 -4 -4.8 -4.2 C-1.3 -4.5 .5 .2 3 -.5 C5.4 -1.4 4.8 -6.9 7.6 -8 C9.2 -8.8 11.7 -7.6 11.9 -6.1 C12 -4.8 10.7 -4.6 9.3 -4.7 C8.4 -1.1 7.6 3.7 4.1 4.3 C.7 5.2 -1 .9 -3.7 .4 C-6.3 .2 -6.9 4.3 -8.8 5.4 C-10.3 6.3 -11.8 5.3 -11.4 3.5 Z',7.2,'#ead2f2','#b17bd1','#674a9d',202);
    trace(c,'M-9.6 2.8 Q-7.3 -3 -4.2 -2.6 M-1.4 -.4 Q2.5 4.6 5 1 M7.4 -4.4 Q8 -7.6 10 -6.5','#f3dff9',.55);
    trace(c,'M-5 -1.6 Q-1.7 -2.2 .7 .5 M5.4 1.8 Q7 .2 7.2 -2.5','#7854a5',.59);
  }
  var organKinds=['strepto','salmonella','meningo','clostrid','cmv','acineto','boss_cdiff','boss_crypto','boss_biofilm'];
  function organSpecimen(c,k){
    var i,a,x,y;
    if(k==='strepto'){
      for(i=0;i<5;i++){x=-9+i*4.3;y=Math.sin(i*.95)*2;
        gel(c,x,y,2.8+i*.17,'#ffbf99','#bc5054');dot(c,x-.8,y-.7,.55,'#fff4d5');}
    }else if(k==='salmonella'){
      salmonella(c);
    }else if(k==='meningo'){
      oval(c,0,0,11,8.4,0,'rgba(119,216,240,.26)');c.strokeStyle='#a7e5ed';c.lineWidth=.6;c.stroke();
      [-1,1].forEach(function(side){c.save();c.scale(side,1);
        c.beginPath();c.moveTo(1,-4);c.bezierCurveTo(4,-9,10,-4,9,1);c.bezierCurveTo(8,8,3,7,1,3);c.quadraticCurveTo(4,0,1,-4);
        c.fillStyle='#8b80cb';c.fill();c.strokeStyle='#d5c5ff';c.lineWidth=.8;c.stroke();c.restore();});
    }else if(k==='clostrid'||k==='boss_cdiff'){
      clostridium(c,k==='boss_cdiff');
    }else if(k==='cmv'){
      gel(c,0,0,10.2,'#9494ca','#454575');
      [-1,1].forEach(function(side){var xx=side*4.1;
        oval(c,xx,-.8,3.4,4.6,side*.18,'#d1c8ea');oval(c,xx,-.9,1.9,2.7,side*.18,'#453857');dot(c,xx-.6,-2, .7,'#f6dea3');});
      for(i=0;i<14;i++){a=i*tau/14;dot(c,Math.cos(a)*8.6,Math.sin(a)*8.6,.47,'#cebcea');}
    }else if(k==='acineto'){
      contour(c,6,10.3,0);c.strokeStyle='#aab5e6';c.lineWidth=.95;c.stroke();
      oval(c,0,0,7.7,5.2,-.16,'#7492a4');oval(c,-.8,-1,5.7,3.2,-.2,'#a9c6cb');
      line(c,-4,.4,3,-1.1,'#587785',1.1);
    }else if(k==='boss_crypto'){
      gel(c,0,0,11.5,'rgba(172,222,235,.23)','rgba(188,151,223,.46)');
      for(i=0;i<3;i++){c.beginPath();c.ellipse(0,0,10.9-i,10.5-i,.35*i,0,tau);c.strokeStyle=['#cdebe5','#b899c8','#96bbce'][i];c.lineWidth=.38;c.stroke();}
      gel(c,0,0,5,'#c989ba','#713f79');gel(c,3.1,-3.8,2.7,'#cca1cf','#8d558e');
      for(i=0;i<12;i++){a=i*2.4;dot(c,Math.cos(a)*(7+i%3),Math.sin(a)*(7+i%3),.36,'#d4ece9');}
    }else if(k==='boss_biofilm'){
      contour(c,18,10,.105);c.fillStyle='#42756c';c.fill();c.strokeStyle='#a3dfc0';c.lineWidth=.85;c.stroke();
      for(i=0;i<7;i++){a=i*2.4;gel(c,Math.cos(a)*5.9,Math.sin(a)*5.9,2.65,'#b7f4ce','#44887c');}
      for(i=0;i<3;i++){c.save();c.translate(-5+i*4,1-i%2*3);contour(c,6,3.6,0);c.strokeStyle='#9dd9b7';c.lineWidth=.42;c.stroke();c.restore();}
    }
  }
  var microbes=['tb','ecoli','pylori','candida','phage','bifido'].concat(organKinds);
  function special(c,k,r,t,hypha){
    c.save();c.scale(r/12,r/12);c.lineCap='round';
    if(organKinds.indexOf(k)>=0)organSpecimen(c,k);
    else if(k==='ecoli'){ecoli(c);}
    else if(k==='tb'){
      c.beginPath();c.moveTo(-6,2);c.quadraticCurveTo(0,-2,7,-1);c.strokeStyle='#9a3046';c.lineWidth=9;c.stroke();c.strokeStyle='#ff7580';c.lineWidth=6;c.stroke();
      for(var i=0;i<4;i++)line(c,i*3-5,-2,i*3-4,2,'#ffc5a0',1);
    }else if(k==='pylori'){
      pylori(c);
    }else if(k==='candida'){
      if(hypha){for(var m=0;m<3;m++){var a=m*2.02;c.save();c.rotate(a);c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(6,-5,14,1);c.strokeStyle='#f6b9db';c.lineWidth=3;c.stroke();line(c,7,-2,9,-7,'#efc9e6',1.7);c.restore();}}
      gel(c,0,0,hypha?5:7,'#fce5ec','#c279af');gel(c,6,-5,3,'#ffced9','#a96893');
    }else if(k==='phage'){
      line(c,0,-4,0,6,'#b9ffdb',2.5);
      for(var z=0;z<3;z++){line(c,0,4+z,5+z,4+z,'#65dec4',1.2);line(c,5+z,4+z,10-z,10+z,'#b2fddf',1);line(c,0,4+z,-5-z,4+z,'#65dec4',1.2);line(c,-5-z,4+z,-10+z,10+z,'#b2fddf',1);}
      c.translate(0,-7);contour(c,6,6,0);c.fillStyle='#5dc8bd';c.fill();c.strokeStyle='#d8fff1';c.lineWidth=1;c.stroke();
      for(var f=0;f<6;f++)line(c,0,1,6*Math.cos(f*tau/6),6*Math.sin(f*tau/6),'#b8fff0',.7);
    }else{line(c,-7,4,2,0,'#b6f5a3',4);line(c,2,0,7,-6,'#a6e58e',3);line(c,2,0,9,2,'#d1ffa8',3);}
    c.restore();
  }
  var palettes={
    neutrophil:{edge:'#cffffc',rim:'#5dabb4',inside:'#5c8390',core:'#81acb3',nucleus:'#594c83',speck:'#b7a5d8'},
    nk:{edge:'#f2ddff',rim:'#a190f4',inside:'#433064',core:'#776299',nucleus:'#383060',speck:'#9e8bdf'},
    dc:{edge:'#ffdfa4',rim:'#f1a665',inside:'#6b4945',core:'#b37b5c',nucleus:'#504256',speck:'#b3a0b7'}
  };
  var atlases=Object.create(null);
  function noise(i){var x=Math.sin(i*72.413+3.71)*76199;return x-Math.floor(x);}
  function oval(c,x,y,rx,ry,rot,color){
    c.beginPath();c.ellipse(x,y,rx,ry,rot,0,tau);c.fillStyle=color;c.fill();
  }
  // Each atlas contains separate cytoplasm and chromatin panels. Their motion is independent.
  function atlas(k){
    if(atlases[k])return atlases[k];
    var p=palettes[k],cv=document.createElement('canvas');cv.width=440;cv.height=220;
    var c=cv.getContext('2d'),i,x,y,a,d;
    c.save();c.translate(110,110);
    var field=c.createRadialGradient(-40,-39,4,0,0,117);
    field.addColorStop(0,p.core);field.addColorStop(.68,p.inside);field.addColorStop(.90,p.rim);field.addColorStop(1,p.edge);
    c.fillStyle=field;c.fillRect(-110,-110,220,220);
    for(i=0;i<4200;i++){
      x=noise(i+517)*220-110;y=noise(i+4859)*220-110;
      c.fillStyle=i%2?'rgba(255,245,221,.12)':'rgba(21,19,44,.17)';
      c.fillRect(x,y,1+noise(i+217)*1.2,.7+noise(i+71)*.9);
    }
    for(i=0;i<58;i++){
      a=noise(i+76)*tau;d=45+noise(i+91)*53;
      c.beginPath();c.ellipse(0,0,d,d*(.70+.2*noise(i)),a,a,a+.3+noise(i+108));c.lineWidth=.55;
      c.strokeStyle=i%3?'rgba(255,238,215,.16)':'rgba(35,32,61,.3)';c.stroke();
    }
    var count=k==='neutrophil'?180:k==='nk'?45:110;
    for(i=0;i<count;i++){
      a=k==='nk'?(noise(i+51)-.5)*2.9:noise(i+17)*tau;
      d=k==='nk'?(22+Math.sqrt(noise(i+200))*64):Math.sqrt(noise(i+1124))*95;
      x=Math.cos(a)*d;y=Math.sin(a)*d;
      var s=(k==='nk'?1.7:.85)+noise(i+400)*(k==='nk'?3:2.7);
      var inner=k==='nk'?(i%3?'#ffc5df':'#ffe7b0'):k==='neutrophil'?(i%3?'#e3b8d6':'#ffe2a6'):'#efd29b';
      var outer=k==='nk'?'#a84284':k==='neutrophil'?'#89758e':'#976459';
      oval(c,x,y,s*1.35,s*1.05,a,'rgba(33,29,53,.46)');oval(c,x-.4,y-.4,s,s*.72,a,outer);dot(c,x-.4*s,y-.38*s,s*.4,inner);
    }
    c.restore();c.save();c.translate(330,110);
    var stain=c.createRadialGradient(-32,-38,4,0,0,99);
    stain.addColorStop(0,p.speck);stain.addColorStop(.27,p.nucleus);stain.addColorStop(.76,'#352c55');stain.addColorStop(.94,p.nucleus);stain.addColorStop(1,p.speck);
    c.beginPath();c.arc(0,0,97,0,tau);c.fillStyle=stain;c.fill();c.clip();
    for(i=0;i<1250;i++){
      x=noise(i+182)*200-100;y=noise(i+2312)*200-100;c.globalAlpha=.18+noise(i+321)*.42;
      oval(c,x,y,.8+noise(i+211)*4,.55+noise(i+187)*2.5,noise(i)*tau,i%3?p.speck:'#222343');
    }
    c.restore();atlases[k]=cv;return cv;
  }
  function perimeter(c,points){
    var n=points.length,last=points[n-1],first=points[0];
    c.beginPath();c.moveTo((last[0]+first[0])/2,(last[1]+first[1])/2);
    for(var i=0;i<n;i++){var a=points[i],b=points[(i+1)%n];c.quadraticCurveTo(a[0],a[1],(a[0]+b[0])/2,(a[1]+b[1])/2);}
    c.closePath();
  }
  function kernel(c,cv,x,y,rx,ry,angle){
    c.save();c.translate(x,y);c.rotate(angle);c.drawImage(cv,220,0,220,220,-rx,-ry,2*rx,2*ry);c.restore();
  }
  function nearestAngle(list,p,reach){
    var result=null,best=Infinity,limit=reach*reach;
    for(var i=0;i<list.length;i++){
      var o=list[i],dx=o.x-p.x,dy=o.y-p.y,d=dx*dx+dy*dy;
      if(o.dead||d>limit)continue;
      if(d<best){best=d;result=Math.atan2(dy,dx);}
    }
    return result;
  }
  function hero(c,k,x,y,r,t,g){
    if(!palettes[k]||r<7){
      gel(c,x,y,r,hues[k]||'#b6f2d9',k==='nk'?'#665399':'#488888');
      dot(c,x-r*.2,y-r*.1,r*.36,k==='nk'?'#634891':'#557295');return;
    }
    var p=palettes[k],cv=atlas(k),dc=k==='dc',nk=k==='nk',n=dc?32:24;
    var lagX=g?g.p.nucleusX||0:Math.cos(t*.7)*.04,lagY=g?g.p.nucleusY||0:Math.sin(t*.8)*.035;
    var points=[],tips=[],rotation=dc?.08*Math.sin(t*.6):nk?-.26:0;
    var target=null,charge=0,recoil=0;
    if(nk&&g){
      var lock=g.laserTarget;
      rotation=lock&&!lock.dead?Math.atan2(lock.y-g.p.y,lock.x-g.p.x):(g.laserAngle==null?g.p.angle:g.laserAngle);
      charge=1-Math.min(1,g.laserIn/.6);
      var firing=g.rays[g.rays.length-1];
      if(firing&&firing.kind!=='dash'&&firing.until>t){
        rotation=window.ActiveSkills.aimRay(g,firing).angle;recoil=Math.max(0,1-(t-firing.born)/.2);charge=0;
      }
    }else if(nk){charge=.5+.35*Math.sin(t*1.7);}
    if(dc&&g)target=nearestAngle(g.orbs,g.p,150);
    c.save();c.translate(x,y);c.rotate(rotation);c.scale(r*(1-.12*recoil),r*(1+.055*recoil));
    for(var i=0;i<n;i++){
      var a=i*tau/n,rad=1+.032*Math.sin(a*5+t*1.8)+.024*Math.cos(a*7-t*.8);
      if(dc){
        a+=.07*Math.sin(t*.75+i)+.04*Math.sin(i*3.7);
        var reach=target===null?0:.40*Math.pow(Math.max(0,Math.cos(a+rotation-target)),10);
        rad=i%4===0?1.63+.25*Math.sin(i*5+t*.69)+reach:i%4===1?.65:i%4===2?.60:.72;
      }else if(nk)rad+=.07*Math.cos(a)+.017*Math.sin(9*a+t*5);
      var xx=Math.cos(a)*rad,yy=Math.sin(a)*rad*(dc?.93:.92);
      points.push([xx,yy]);if(dc&&i%4===0)tips.push([xx,yy,a]);
    }
    // Bifurcated dendrites taper from the undulating cell cortex into receptor-bearing tips.
    if(dc)tips.forEach(function(v,j){
      var xx=v[0],yy=v[1],side=j%2?1:-1,ux=Math.cos(v[2]+side*.7),uy=Math.sin(v[2]+side*.7);
      var sx=xx*.75,sy=yy*.75,tx=sx+ux*.42,ty=sy+uy*.42;
      c.beginPath();c.moveTo(xx*.62,yy*.62);c.quadraticCurveTo(sx+.035,sy-.04,tx,ty);c.quadraticCurveTo(sx,sy+.04,xx*.62,yy*.62);
      c.fillStyle='#b77d60';c.fill();c.lineWidth=.014;c.strokeStyle=p.edge;c.stroke();
      dot(c,tx,ty,.027+.01*Math.sin(t*2+j),'#ffecaa');
      line(c,xx*.75,yy*.75,xx*.93,yy*.93,'#ffdd9b',.025);dot(c,xx*.93,yy*.93,.036,'#ffecb4');
    });
    perimeter(c,points);c.fillStyle=p.core;c.fill();c.shadowColor=p.rim;c.shadowBlur=r>24?8:2;
    c.strokeStyle=p.edge;c.lineWidth=.037;c.stroke();c.shadowBlur=0;c.save();c.clip();
    var width=dc?3.6:2.16;
    c.drawImage(cv,0,0,220,220,-width/2,-width/2,width,width);
    if(dc)tips.forEach(function(v,j){
      c.beginPath();c.moveTo(v[0]*.29,v[1]*.29);
      c.quadraticCurveTo(v[0]*.49+.055*Math.sin(j+t*.4),v[1]*.48,v[0]*.82,v[1]*.82);
      c.strokeStyle='rgba(255,226,177,.43)';c.lineWidth=.014;c.stroke();
    });
    if(k==='neutrophil'){
      var lobes=[[-.34,-.13,.36,.29,.65],[.03,.22,.31,.27,-.4],[.35,-.14,.33,.27,-.9]];
      c.save();c.translate(lagX,lagY);
      var primed=g?g.netEnergy>=70:(1+Math.sin(t*.8))/2>.8;
      c.beginPath();c.moveTo(-.35,-.15);c.bezierCurveTo(-.17,.38,.05,.38,.35,-.12);
      c.strokeStyle=primed?'#ffe2eb':'#ba9bbc';c.lineWidth=.06;c.stroke();
      lobes.forEach(function(v,j){kernel(c,cv,v[0]+lagX*j*.22,v[1]+Math.sin(t*1.4+j)*.018+lagY*j*.18,v[2],v[3],v[4]);});c.restore();
    }else if(nk){
      kernel(c,cv,-.22+lagX,-.05+lagY,.65,.76,-.38);
      if(!recoil){c.save();c.globalAlpha=.36+charge*.62;
        for(i=0;i<7;i++){
          a=(i-3)*.35;var gather=charge*charge;
          xx=.17+.31*Math.cos(a*2+i*1.8);yy=.55*Math.sin(a*1.8+.05*Math.sin(t*3+i));
          dot(c,xx+(.86-xx)*gather,yy*(1-gather)+.13*Math.sin(a)*gather,.031+.012*charge,'#ffe6b8');
        }c.restore();}
    }else kernel(c,cv,-.06+lagX,-.01+lagY,.42,.51,.53);
    c.restore();
    for(i=0;i<5;i++){c.save();var m=.97-.017*i;c.scale(m,m);perimeter(c,points);c.lineWidth=i===0?.018:.006;c.strokeStyle=i%2?'rgba(47,57,78,.30)':'rgba(255,245,228,.38)';c.stroke();c.restore();}
    if(nk&&recoil){
      c.globalAlpha=recoil*.85;c.beginPath();c.ellipse(0,0,1.05,1,0,-.36-(1-recoil)*2.8,.36+(1-recoil)*2.8);
      c.strokeStyle='#dcfff4';c.lineWidth=.065*recoil+.01;c.stroke();c.globalAlpha=1;
    }
    if(nk&&g&&g.beams>0){
      c.save();c.rotate(t*2);c.setLineDash([.27,.21]);c.beginPath();c.arc(0,0,1.19+.04*Math.sin(t*13),0,tau);
      c.strokeStyle='#cea3ff';c.lineWidth=.075;c.stroke();c.restore();
    }
    c.restore();
  }
  function organ(c,g,h){
    var w=360,t=g.time; c.save();
    var tint={skin:'rgba(204,85,82,.19)',lung:'rgba(117,208,237,.18)',gut:'rgba(183,105,64,.24)',brain:'rgba(89,71,220,.25)'};
    var fade=c.createLinearGradient(0,0,w,h);fade.addColorStop(0,tint[g.map]);fade.addColorStop(.5,'rgba(28,40,63,.04)');fade.addColorStop(1,tint[g.map]);c.fillStyle=fade;c.fillRect(0,0,w,h);
    if(g.map==='skin'){
      for(var j=0;j<6;j++){c.save();c.translate((42+j*97+t*(1+j%2))%(w+76)-38,(.12+j*.155)*h);c.rotate(-.42+j);c.scale(1,.62);
        var disk=c.createRadialGradient(-3,-2,1,0,0,20);disk.addColorStop(0,'rgba(108,48,72,.07)');disk.addColorStop(.68,'rgba(249,118,123,.18)');disk.addColorStop(1,'rgba(230,92,109,0)');dot(c,0,0,20,disk);c.restore();}
      g.fibrinNets.forEach(function(s){for(var j=-1;j<=1;j++)line(c,s.x,s.y+j*3,s.xx,s.yy-j*3,'rgba(255,207,110,.65)',1);});
    }else if(g.map==='lung'){
      for(var i=0;i<13;i++){var r=(4+i%4*3)*(1+.13*Math.sin(t*1.8+i));c.beginPath();c.arc((i*71)%w,(i*97)%h,r,0,tau);c.strokeStyle='rgba(155,232,255,.29)';c.lineWidth=1;c.stroke();}
      for(i=0;i<34;i++){var x=i*11;line(c,x,h,x+Math.sin(t*3+i*.42)*8,h-15-8*Math.cos(i),'#739ca9',1.5);}
      if(g.windUntil>t)for(i=0;i<6;i++){var xx=((t*g.windDir*55+i*83)%450+450)%450-45;line(c,xx,h*(i+.6)/6,xx-35*g.windDir,h*(i+.6)/6+3,'rgba(178,235,255,.45)',1.4);}
    }else if(g.map==='gut'){
      for(i=0;i<17;i++){x=i*23;c.beginPath();c.moveTo(x-10,h);c.bezierCurveTo(x-14,h-80-i%3*15,x+10,h-91+i%4*12,x+12,h);c.fillStyle=i%2?'rgba(188,124,83,.34)':'rgba(136,85,151,.43)';c.fill();}
    }else{
      for(i=0;i<Math.ceil(h/22);i++){[2,w-2].forEach(function(x){c.save();c.translate(x,i*24);contour(c,6,15,0);c.strokeStyle='rgba(135,157,253,.43)';c.stroke();c.restore();});}
    }
    if(g.event){c.save();c.scale(w,h);var wash=c.createRadialGradient(.5,.5,.21,.5,.5,.75);
      wash.addColorStop(0,'rgba(25,22,47,0)');wash.addColorStop(1,g.event.id==='coffee'?'#ffac73':'#9460bd');
      c.globalAlpha=.33+.09*Math.sin(t*2);c.fillStyle=wash;c.fillRect(0,0,1,1);c.restore();c.globalAlpha=.36;
      if(g.event.id==='stayup')for(i=0;i<20;i++)dot(c,(i*71+t*3)%w,(i*137)%h,1.1,'#ecc7ff');}
    c.restore();
    if(g.beamAt!=null&&t-g.beamAt<1.2){var x=(t-g.beamAt)/1.2*(w+80)-40,glo=c.createLinearGradient(x-35,0,x+35,0);glo.addColorStop(0,'rgba(132,255,229,0)');glo.addColorStop(.58,'rgba(193,255,242,.65)');glo.addColorStop(1,'rgba(132,255,229,0)');c.fillStyle=glo;c.fillRect(x-35,0,70,h);}
  }
  function extras(c,g,h){
    g.phages.forEach(function(f){c.save();c.translate(f.x,f.y);special(c,'phage',11,g.time);c.restore();});
    g.bifidos.forEach(function(b){c.save();c.translate(b.x,b.y);special(c,'bifido',10,g.time);c.restore();});
    g.hearts.forEach(function(v){gel(c,v.x,v.y,5,'#f1ffd6','#69c677');});
    g.army.forEach(function(f){if(g.heroId==='dc'&&Math.hypot(f.x-g.p.x,f.y-g.p.y)<120)line(c,g.p.x,g.p.y,f.x,f.y,'rgba(255,210,143,.36)',.8);hero(c,f.kind==='ctl'?'nk':'macrophage',f.x,f.y,5,g.time);});
    g.rays.forEach(function(r){if(r.kind==='dash'){c.save();c.globalAlpha=Math.max(0,(r.until-g.time)/.22);
      line(c,r.x,r.y,r.xx,r.yy,'#73d7bb',4);line(c,r.x,r.y,r.xx,r.yy,'#dafff0',1);c.restore();}});
    if(g.netUntil>g.time){c.save();c.translate(g.p.x,g.p.y);c.strokeStyle='rgba(210,247,248,.24)';
      for(var i=0;i<10;i++){var a=i*tau/10;line(c,0,0,Math.cos(a)*h,Math.sin(a)*h,'rgba(213,247,245,.22)',1);}
      for(var rad=35;rad<h;rad+=50){contour(c,10,rad,.05);c.stroke();}c.restore();}
  }
  function beams(c,g){
    g.rays.forEach(function(r){
      if(r.kind==='dash')return;
      var q=Math.max(0,Math.min(1,(g.time-r.born)/(r.until-r.born))),power=q<.16?.45+q*3.4:Math.pow((1-q)/.84,1.3);
      if(power<=0)return;
      var aim=window.ActiveSkills.aimRay(g,r),salvo=r.kind==='salvo',critical=r.kind==='nk_crit'||r.kind==='synapse';
      var hue=salvo?'#b7a2ff':critical?'#82ffe2':'#ab8cf6',core=critical?'#e4fff4':'#fff3ff';
      c.save();c.translate(aim.x,aim.y);c.rotate(aim.angle);c.lineCap='round';
      var length=aim.length,width=(salvo?8:critical?6.5:5)*power;
      var glow=c.createLinearGradient(0,0,Math.max(1,length),0);
      glow.addColorStop(0,hue);glow.addColorStop(.54,critical?'#63baaf':'#8772bc');glow.addColorStop(1,hue);
      c.globalAlpha=.36*power;c.fillStyle=glow;c.beginPath();c.moveTo(0,-1.5);
      c.bezierCurveTo(length*.12,-width*1.5,length*.63,-width*.7,length,-1);
      c.lineTo(length,1);c.bezierCurveTo(length*.63,width*.7,length*.12,width*1.5,0,1.5);c.closePath();c.fill();
      c.globalAlpha=.82*power;
      var wave=Math.min(salvo?6:4.5,length*.09)*power;
      for(var strand=-1;strand<=1;strand+=2){
        c.beginPath();c.moveTo(0,0);
        for(var i=1;i<=24;i++){var f=i/24;c.lineTo(length*f,strand*wave*Math.sin(f*3*tau-q*8)*Math.sin(f*Math.PI));}
        c.strokeStyle=strand<0?hue:'#f5cafc';c.lineWidth=salvo?1.5:1;c.stroke();
      }
      c.globalAlpha=power;line(c,0,0,length,0,core,(salvo?2.8:1.35)*power);
      for(var packet=(q*123)%55;packet<length;packet+=55){
        f=packet/(length||1);var py=wave*Math.sin(f*3*tau-q*8)*Math.sin(f*Math.PI);
        oval(c,packet,py,(salvo?4.6:3.3)*power,1.45*power,0,critical?'#ffe1a2':core);
      }
      c.beginPath();c.arc(-4,0,5,-1.08,1.08);c.strokeStyle=core;c.lineWidth=1.7;c.stroke();
      dot(c,0,0,2.7*power,core);c.restore();
      if(!aim.impact)return;
      c.save();c.translate(aim.impactX,aim.impactY);c.rotate(aim.angle);c.globalAlpha=power;
      for(var j=0;j<2;j++){
        c.beginPath();c.ellipse(0,0,1+q*(j?5:3),2+q*(j?11:6),0,0,tau);c.strokeStyle=j?hue:core;c.lineWidth=1.3;c.stroke();
      }
      for(j=0;j<5;j++){
        var a=(j-2)*.98,travel=4+q*(13+j%2*6);
        line(c,(travel-2.7)*Math.cos(a),(travel-2.7)*Math.sin(a),travel*Math.cos(a),travel*Math.sin(a),core,1.25*power);
      }
      if(r.finisher){var span=5+q*18;line(c,-span,0,span,0,'#ffe5ab',1.8);line(c,0,-span,0,span,'#ffe5ab',1.8);}
      c.restore();
    });
  }
  function status(c,e){
    if(e.resistant){c.save();c.setLineDash([3,2]);c.strokeStyle='#d79bff';c.lineWidth=1.7;c.beginPath();c.arc(e.x,e.y,e.r+3,0,tau);c.stroke();c.restore();}
    if(e.partner&&!e.partner.dead){line(c,e.x,e.y,e.partner.x,e.partner.y,'rgba(129,245,165,.48)',2);var q=Math.min(1,e.linkTime/2.5);line(c,e.x,e.y,e.x+(e.partner.x-e.x)*q,e.y+(e.partner.y-e.y)*q,'#d2ffa4',2);}
  }
  function charge(cv,fraction,col,marks){
    var w=118,h=13,d=Math.min(window.devicePixelRatio||1,2);if(cv.width!==Math.round(w*d)||cv.height!==Math.round(h*d)){cv.width=Math.round(w*d);cv.height=Math.round(h*d);cv.style.width=w+'px';cv.style.height=h+'px';}
    var c=cv.getContext('2d');c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,w,h);
    for(var i=0;i<marks;i++){var span=w/marks;line(c,i*span+2,7,(i+1)*span-2,7,i<Math.ceil(marks*fraction)?col:'#496578',4);}
  }
  window.PatrolArt={hero:hero,special:special,microbes:microbes,organ:organ,extras:extras,beams:beams,status:status,charge:charge};
}());
