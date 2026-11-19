(function () {
  'use strict';
  var Art=window.PatrolArt,Q=window.PatrolRules,D = window.ImmuneData, TAU = Math.PI * 2, W = 360;
  var reducedMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)');
  function drawRoundRect(c,x,y,w,h,r) {
    c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r);
    c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath();
  }
  function dot(c,x,y,r,fill) {
    c.fillStyle=fill; c.beginPath(); c.arc(x,y,r,0,TAU); c.fill();
  }
  function ring(c,x,y,r,col,width,start,end) {
    c.strokeStyle=col; c.lineWidth=width; c.beginPath(); c.arc(x,y,r,start || 0,end == null ? TAU : end); c.stroke();
  }
  function line(c,x,y,xx,yy,col,width) {
    c.strokeStyle=col; c.lineWidth=width; c.beginPath(); c.moveTo(x,y); c.lineTo(xx,yy); c.stroke();
  }
  function glow(c,x,y,r,colors) {
    var g=c.createRadialGradient(x-r*.17,y-r*.22,r*.01,x,y,r);
    colors.forEach(function(color,i){g.addColorStop(i/(colors.length-1),color);}); return g;
  }
  function grain(i) { var v=Math.sin(i*123.43+34.51)*13487.71; return v-Math.floor(v); }
  function blob(c,points) {
    var p=points[points.length-1]; c.beginPath(); c.moveTo((p.x+points[0].x)/2,(p.y+points[0].y)/2);
    points.forEach(function(a,i){var b=points[(i+1)%points.length];c.quadraticCurveTo(a.x,a.y,(a.x+b.x)/2,(a.y+b.y)/2);}); c.closePath();
  }
  function surface(size) {
    var cv=document.createElement('canvas');cv.width=cv.height=size;return cv;
  }
  function gradient(c,x,y,xx,yy,colors) {
    var g=c.createLinearGradient(x,y,xx,yy);
    colors.forEach(function(col,i){g.addColorStop(i/(colors.length-1),col);});return g;
  }
  function stroke(c,color,width){c.strokeStyle=color;c.lineWidth=width;c.stroke();}
  function ellipse(c,x,y,rx,ry,a,fill){
    c.beginPath();c.ellipse(x,y,rx,ry,a,0,TAU);c.fillStyle=fill;c.fill();
  }
  var cellLayers={};
  function tissueTexture() {
    // A small baked optical-density map gives the cytoplasm depth at cover magnification.
    var cv=surface(288),c=cv.getContext('2d'),im=c.createImageData(cv.width,cv.height);
    var noise=new Float32Array(64*64);
    for(var i=0;i<noise.length;i++)noise[i]=grain(i+2302);
    function field(x,y) {
      var ix=Math.floor(x),iy=Math.floor(y),u=x-ix,v=y-iy;
      u=u*u*(3-2*u);v=v*v*(3-2*v);
      var a=noise[(iy&63)*64+(ix&63)],b=noise[(iy&63)*64+((ix+1)&63)];
      var d=noise[((iy+1)&63)*64+(ix&63)],e=noise[((iy+1)&63)*64+((ix+1)&63)];
      return (a+(b-a)*u)*(1-v)+(d+(e-d)*u)*v;
    }
    for(var y=0;y<cv.height;y++)for(var x=0;x<cv.width;x++){
      var warp=field(x*.026,y*.026),fine=field(x*.18+warp*5,y*.1-warp*5);
      var n=field(x*.053+warp*3,y*.047-warp*3)*.53+fine*.32+field(x*.72,y*.72)*.15;
      var at=(y*cv.width+x)*4,bright=n>.52;
      im.data[at]=bright?164:14;im.data[at+1]=bright?245:49;im.data[at+2]=bright?223:90;
      im.data[at+3]=Math.min(112,Math.abs(n-.52)*290);
    }
    c.putImageData(im,0,0);return cv;
  }
  function cytoplasm() {
    if(cellLayers.plasma)return cellLayers.plasma;
    var cv=surface(480),c=cv.getContext('2d');c.translate(240,240);c.scale(185,185);
    c.drawImage(tissueTexture(),-1.30,-1.30,2.60,2.60);
    // Tiny directed fibrils, vesicles and folded cisternae share a high-resolution texture.
    for(var i=0;i<2600;i++){
      var x=grain(i+72)*2.6-1.3,y=grain(i+3190)*2.6-1.3;
      var f=2*Math.sin(5*x+3*y)+1.2*Math.cos(7*y-4*x),len=.004+.038*grain(i+6172);
      line(c,x,y,x+Math.cos(f)*len,y+Math.sin(f)*len,i%4?'rgba(136,248,226,.26)':'rgba(8,27,67,.56)',.003+grain(i+111)*.005);
    }
    for(i=0;i<25;i++){
      var a=i*2.4,dist=.52+.42*grain(46+i),ox=Math.cos(a)*dist,oy=Math.sin(a)*dist*.88;
      c.save();c.translate(ox,oy);c.rotate(a+.8);var rr=.026+.069*grain(25+i);
      c.scale(1,.72);dot(c,0,0,rr,glow(c,0,0,rr,['#b9fff0','#398d93','#154856','#70eacd']));
      ring(c,0,0,rr*.78,'rgba(204,255,240,.63)',.006,3.2,5.1);
      if(i%4===0){dot(c,0,0,rr*.43,'#636298');dot(c,-rr*.18,-rr*.12,rr*.16,'#f8bcaf');}c.restore();
    }
    for(i=0;i<8;i++){
      var ma=i*2.37+.48,md=.51+grain(i+37)*.4;
      c.save();c.translate(Math.cos(ma)*md,Math.sin(ma)*md*.91);c.rotate(ma+.65);
      c.beginPath();c.moveTo(-.105,.008);c.bezierCurveTo(-.12,-.076,.007,-.12,.09,-.064);
      c.bezierCurveTo(.144,-.014,.087,.073,-.018,.044);c.bezierCurveTo(-.064,.028,-.086,.066,-.105,.008);
      c.fillStyle=gradient(c,0,-.08,0,.05,['#f6cb9c','#cd8c87','#855b76']);c.fill();stroke(c,'#e9d4a9',.009);c.clip();
      for(var z=0;z<5;z++){var mx=z*.038-.080;c.beginPath();c.moveTo(mx,-.081);c.bezierCurveTo(mx-.03,-.03,mx+.033,.01,mx-.006,.04);stroke(c,'#815278',.012);}
      c.restore();
    }
    for(i=0;i<14;i++){
      c.save();c.rotate(i<8?-.45:2.74);var k=i%8;
      c.beginPath();c.moveTo(-.41,.19+k*.032);
      c.bezierCurveTo(-.18,.16+k*.041,-.13,.58+k*.029,.14,.51+k*.029);
      c.bezierCurveTo(.31,.48+k*.035,.39,.33+k*.031,.57,.4+k*.019);
      stroke(c,k%2?'rgba(158,255,235,.57)':'rgba(29,81,118,.75)',.009);c.restore();
    }
    for(i=0;i<440;i++){
      x=(grain(i+615)-.5)*2.5;y=(grain(i+1382)-.5)*2.5;
      dot(c,x,y,.004+.009*grain(i+361),i%5?'rgba(201,255,225,.69)':'#ffdf9c');
    }
    cellLayers.plasma=cv;return cv;
  }
  function nucleus(){
    if(cellLayers.nucleus)return cellLayers.nucleus;
    var cv=surface(240),c=cv.getContext('2d');c.translate(120,120);c.scale(106,106);
    c.beginPath();c.moveTo(-.83,-.19);c.bezierCurveTo(-.96,-.77,-.28,-1,.16,-.74);
    c.bezierCurveTo(.52,-.55,.17,-.24,.48,-.05);c.bezierCurveTo(1.12,.19,.87,.79,.33,.82);
    c.bezierCurveTo(-.28,.93,-.75,.42,-.83,-.19);c.closePath();
    c.fillStyle=gradient(c,-.8,-.7,.65,.8,['#9a92ff','#4a4f9f','#2d2a65','#705fc2']);c.fill();
    c.shadowColor='#c09dff';c.shadowBlur=6;stroke(c,'#c6bdff',.036);c.shadowBlur=0;c.clip();
    for(var i=0;i<185;i++){
      var x=grain(31+i)*2-1,y=grain(351+i)*2-1,r=.013+.069*grain(571+i);
      dot(c,x,y,r,glow(c,x,y,r,['#c0a1eb','#7668a9','rgba(47,38,108,.33)']));
    }
    for(i=0;i<8;i++){
      x=grain(i+89)*1.5-.74;y=grain(i+391)*1.5-.74;
      dot(c,x,y,.10,glow(c,x,y,.10,['#eaa3ec','#a16bc2','#4d397e']));
    }
    cellLayers.nucleus=cv;return cv;
  }
  function cell(c,x,y,r,t,angle,speed,full,cargo,detail,motion) {
    c.save();c.translate(x,y);
    var elapsed=motion?t-motion.biteTime:1;
    var impulse=elapsed<.25? .15*Math.cos(elapsed*35)*Math.pow(1-elapsed/.25,2):0;
    c.rotate(angle);c.scale(r*(1+impulse),r*(1+impulse*.7));c.rotate(-angle);
    var pts=[],breath=1+.021*Math.sin(t*1.9);
    for(var i=0;i<20;i++){
      var a=i*TAU/20,tip=Math.pow((1+Math.cos(a-angle))/2,9)*speed*.29;
      var d=breath+.16*Math.sin(a*5+.42*t)+.12*Math.cos(a*3-.29*t)+.083*Math.sin(a*8-.2*t)+tip;
      pts.push({x:Math.cos(a)*d*1.05,y:Math.sin(a)*d*.90});
    }
    dot(c,0,0,1.48,glow(c,0,0,1.48,[full?'rgba(251,101,125,0.412)':'rgba(50,255,216,0.310)','rgba(50,184,196,0.173)','rgba(13,80,109,0)']));
    blob(c,pts);c.fillStyle=gradient(c,-.85,-.8,.84,.87,full?['#ffc0b0','#d75b76','#652f56','#f09177']:['#b3fff0','#50c8b2','#177b85','#194562','#78d7cf']);c.fill();
    c.shadowColor=full?'#ff808c':'#50ffe0';c.shadowBlur=detail?11:4;
    stroke(c,full?'#ffd8b7':'#b5ffe5',.019);c.shadowBlur=0;c.save();c.clip();
    c.drawImage(cytoplasm(),-240/185,-240/185,480/185,480/185);
    c.save();c.translate(-.10+(motion?motion.nucleusX:Math.sin(t*.63)*.034),-.07+(motion?motion.nucleusY:Math.cos(t*.51)*.025));
    c.rotate(-.47+.06*Math.sin(t));c.drawImage(nucleus(),-.59,-.56,1.18,1.12);c.restore();
    if(detail){
      // Broken cortical highlights reveal local membrane curvature without a uniform neon outline.
      for(i=0;i<20;i++){
        var v=pts[i],next=pts[(i+1)%20],prev=pts[(i+19)%20];
        for(var j=0;j<9;j++){
          var u=j/9,m=1-u;
          var bx=m*m*(prev.x+v.x)/2+2*m*u*v.x+u*u*(v.x+next.x)/2;
          var by=m*m*(prev.y+v.y)/2+2*m*u*v.y+u*u*(v.y+next.y)/2;
          var f=.91+.075*grain(i*9+j+611);dot(c,bx*f,by*f,.005+.004*grain(i*9+j),'rgba(216,255,232,.74)');
        }
      }
    }
    // Nested rim strokes follow the same twenty membrane points as the pseudopods.
    for(i=0;i<5;i++){
      c.save();var scale=.975-i*.018;c.scale(scale,scale);blob(c,pts);
      stroke(c,i%2?'rgba(14,92,108,.39)':'rgba(194,255,218,.51)',i===0 ? .015 : .007);c.restore();
    }
    c.restore();
    if(elapsed>=0 && elapsed<.25){
      c.save();var ripple=.68+elapsed*1.6;c.scale(ripple,ripple);blob(c,pts);
      stroke(c,'rgba(232,255,219,'+(1-elapsed/.25)+')',.04);c.restore();
    }
    cargo.forEach(function(v,j){
      var a=j*2.4+t*.18,d=.46+.20*Math.sin(j*3),px=Math.cos(a)*d,py=Math.sin(a)*d*.85;
      var rr=cargo.length>9 ? .12 : .18;
      dot(c,px,py,rr,glow(c,px,py,rr,['#4c928b','#193c56','#7cd7c0']));
      c.save();c.translate(px,py);c.rotate(a);var edge=rr*.83;c.drawImage(bodyTexture(v.kind,false),-edge,-edge,edge*2,edge*2);c.restore();
      ring(c,px,py,rr,'#96dedc',.014);
      ring(c,px,py,rr+.014,'#fff5a7',.033,-Math.PI/2,-Math.PI/2+TAU*v.progress);
    });
    c.restore();
  }
  function antibody(c,x,y,r,angle,color) {
    c.save(); c.translate(x,y); c.rotate(angle); c.beginPath();c.moveTo(-r,0);c.lineTo(0,0);c.lineTo(r*.72,-r*.7);c.moveTo(0,0);c.lineTo(r*.72,r*.7);c.strokeStyle=color;c.lineWidth=Math.max(1.2,r*.36);c.lineCap='round';c.stroke();c.restore();
  }
  function paintEnemy(c,e) {
    var k=e.kind,r=e.r;
    c.save();c.translate(e.x,e.y);c.rotate(e.angle||0);c.scale(r,r);
    var i,a,x,y;
    if(Art.microbes.indexOf(k)>=0){Art.special(c,k,1,0,false);}
    else if(k==='staph'||k==='boss'){
      dot(c,0,0,1.33,glow(c,0,0,1.33,[k==='boss'?'#9d459e':'#d67c00','rgba(165,110,35,0.169)','rgba(83,43,12,0)']));
      if(k==='boss'){
        ring(c,0,0,.99,'#eaba77',.07);
        for(i=0;i<12;i++){a=i*TAU/12;dot(c,Math.cos(a),Math.sin(a),.086,i%2?'#bca1ff':'#ffd55d');}
      }
      var beads=[[-.63,-.27,.32],[-.42,.32,.39],[-.26,-.56,.37],[.18,-.62,.39],[.57,-.22,.36],[.57,.22,.33],[.04,.59,.39],[-.16,.04,.44],[.24,-.10,.34]];
      beads.forEach(function(b,i){
        var colors=k==='boss'&&i%2===0?['#f9cfff','#b86ad8','#6b3c9d','#462c73']:['#ffeeb7','#ffcb57','#ffb703','#b45704'];
        dot(c,b[0],b[1],b[2],glow(c,b[0],b[1],b[2],colors));
        ring(c,b[0],b[1],b[2],'rgba(255,222,159,0.651)',.024);ellipse(c,b[0]-b[2]*.29,b[1]-b[2]*.40,b[2]*.28,b[2]*.15,-.60,'#fff8d7');
        for(var j=0;j<7;j++)dot(c,b[0]+(grain(j+142)-.5)*b[2],b[1]+(grain(j+72)-.5)*b[2],.023,'rgba(255,234,176,0.439)');
      });
    }else if(k==='pneumo'){
      c.scale(1.07,.81);drawRoundRect(c,-1.08,-.85,2.16,1.7,.83);
      c.fillStyle=gradient(c,-.8,-.85,.8,.84,['rgba(181,249,255,0.612)','rgba(102,223,255,0.176)','rgba(35,118,185,0.369)','rgba(145,221,249,0.580)']);c.fill();
      stroke(c,e.mark?'rgba(174,234,251,0.569)':'#baf7ff',.068);
      [-.38,.38].forEach(function(pos){
        c.save();c.translate(pos,0);c.rotate(-.24);c.scale(.87,1.09);
        dot(c,0,0,.48,glow(c,0,0,.48,['#ffb8cb','#ff4d6d','#d72872','#8c275e']));
        ring(c,0,0,.48,'#ffb8e0',.036);ellipse(c,-.13,-.20,.13,.063,-.6,'#fff0ef');c.restore();
      });
      c.beginPath();c.moveTo(-.90,-.30);c.quadraticCurveTo(-.75,-.76,-.18,-.74);stroke(c,'#edffff',.075);
      c.beginPath();c.moveTo(.28,.70);c.quadraticCurveTo(.83,.69,.93,.24);stroke(c,'#9ee9ff',.045);
    }else if(k==='rod'){
      drawRoundRect(c,-.95,-.46,1.95,.92,.45);c.fillStyle=gradient(c,0,-.46,0,.46,['#d5ff7c','#70e000','#38b000','#267b23']);c.fill();stroke(c,'#b8fc63',.055);
      drawRoundRect(c,-.82,-.32,1.67,.64,.30);stroke(c,'rgba(240,255,156,0.667)',.046);
      c.beginPath();for(i=0;i<=22;i++){x=-.66+i*.061;y=Math.sin(i*.58)*.15;i?c.lineTo(x,y):c.moveTo(x,y);}stroke(c,'#276731',.075);
      for(i=0;i<8;i++)dot(c,grain(i+71)*1.4-.7,(grain(i+29)-.5)*.5,.037,'#eeffb4');
    }else if(k==='latent'){
      for(i=0;i<14;i++){
        a=i*TAU/14;var d=.98+.11*grain(i+33);
        line(c,.7*Math.cos(a),.7*Math.sin(a),d*Math.cos(a),d*Math.sin(a),'#bf68ca',.081);
        ellipse(c,d*Math.cos(a),d*Math.sin(a),.11,.058,a+Math.PI/2,'#ed94cd');
      }
      dot(c,0,0,.84,glow(c,0,0,.84,['#b8499d','#7209b7','#612266','#372346']));
      ring(c,0,0,.84,'#f198d9',.045);
      for(i=0;i<30;i++){a=grain(i+58)*TAU;d=grain(i+191)*.71;dot(c,Math.cos(a)*d,Math.sin(a)*d,.025+.04*grain(i),i%3?'rgba(239,127,186,0.631)':'#5c1767');}
    }else{
      for(i=0;i<8;i++){a=i*TAU/8;line(c,0,0,Math.cos(a),Math.sin(a),'#ff9daa',.14);}
      dot(c,0,0,.65,glow(c,0,0,.65,['#ffe3cf','#ff707b','#bf3866']));
    }c.restore();
  }
  var sprites=Object.create(null);
  function bodyTexture(k,marked) {
    var key=k+(marked?'Marked':''),cv=sprites[key];
    if(!cv){
      cv=surface(D.bossKinds.indexOf(k)>=0?170:128);var half=cv.width/2;
      paintEnemy(cv.getContext('2d'),{kind:k,x:half,y:half,r:half/1.38,mark:marked});sprites[key]=cv;
    }
    return cv;
  }
  function enemy(c,e,t) {
    var k=e.kind,r=e.r,cv=bodyTexture(k,e.mark);
    c.save();c.translate(e.x,e.y);var hurt=(e.hurt||0)/.09;
    if(hurt){c.rotate(e.impact||0);c.scale(1-.16*hurt,1+.16*hurt);c.rotate(-(e.impact||0));}
    c.rotate(e.angle||0);var edge=r*1.38;
    if(k==='rod'){
      for(var n=0;n<2;n++){
        c.beginPath();for(var i=0;i<19;i++){
          var xx=(-.78-i*.091)*r,yy=(Math.sin(i*.52-t*14+n*1.8)*i*.021+(n-.5)*.13)*r;
          i?c.lineTo(xx,yy):c.moveTo(xx,yy);
        }stroke(c,n?'rgba(139,255,156,0.612)':'rgba(183,255,103,0.788)',Math.max(.7,r*.062));
      }
    }
    if(k==='boss_biofilm'){
      for(var limb=0;limb<4;limb++){
        c.save();c.rotate(limb*TAU/4);c.beginPath();c.moveTo(r*.58,0);
        c.bezierCurveTo(r*.96,r*.23,r*1.22,Math.sin(t*4+limb)*r*.26,r*1.42,Math.sin(t*5+limb)*r*.27);
        stroke(c,'#83dab0',Math.max(.7,r*.045));c.restore();
      }
    }
    if(e.mirrorFor)c.globalAlpha=.45;
    if(e.coreFor){dot(c,0,0,r,glow(c,0,0,r,['#fff8cd','#f6d580','#845f46']));}
    else if(k==='candida'&&e.hypha)Art.special(c,k,r,t,true);else c.drawImage(cv,-edge,-edge,2*edge,2*edge);
    if(hurt){
      var maskKey='hit:'+k,mask=sprites[maskKey];
      if(!mask){mask=surface(cv.width);var mc=mask.getContext('2d');mc.drawImage(cv,0,0);mc.globalCompositeOperation='source-in';mc.fillStyle='#fff';mc.fillRect(0,0,mask.width,mask.height);sprites[maskKey]=mask;}
      c.save();c.globalAlpha=.65*hurt;c.drawImage(mask,-edge,-edge,edge*2,edge*2);c.restore();
    }
    if(k==='latent'){
      c.globalAlpha=.60+.36*Math.sin(t*9);
      for(var j=0;j<3;j++){var cx=Math.cos(j*2.1)*r*.29,cy=Math.sin(j*2.1)*r*.27;
        dot(c,cx,cy,r*.19,glow(c,cx,cy,r*.19,['#fff2c5','#ff4b58','#e52751']));}
    }
    if(e.mark && D.capsule(k)){
      c.globalAlpha=.65+.32*Math.sin(t*6);c.beginPath();c.moveTo(-r*.28,-r*.57);c.lineTo(-r*.09,-r*.21);c.lineTo(-r*.21,0);c.lineTo(r*.13,r*.43);stroke(c,'#fff4ac',1.2);
    }
    c.restore();

    if(e.elite||e.variant>0){
      c.save();c.translate(e.x,e.y);c.rotate(t*.6);
      var count=e.elite?3:e.variant===1?4:6,ink=e.elite?'#ffde8d':e.variant===1?'#ff8679':'#9dfbdc';
      for(var j=0;j<count;j++){var a=j*TAU/count;ring(c,0,0,r+4,ink,2,a,a+.45);dot(c,Math.cos(a)*(r+4),Math.sin(a)*(r+4),1.7,ink);}c.restore();
    }
    if(k==='boss_crypto'&&!e.mirrorFor){
      if(e.capsuleHP>0)ring(c,e.x,e.y,r+3,'#c2e8eb',1.3);
      if(e.phase===3)dot(c,e.x,e.y,r*(.13+.025*Math.sin(t*8)),'#ffe796');
      if(e.tideUntil>t)for(var wave=0;wave<3;wave++)ring(c,e.x,e.y,8+(t*42+wave*56)%169,'rgba(192,161,230,.45)',1,t+wave,t+wave+4);
    }
    if(e.coreFor||e.coreUntil>t){
      ring(c,e.x,e.y,r+3,'#f7dd8d',1.5);
      if(e.coreUntil>t)ring(c,e.x,e.y,r+7,'#ffd983',2.2,-Math.PI/2,-Math.PI/2+TAU*(e.coreUntil-t)/8);
    }
    if(e.phase===3&&e.shell>0){ring(c,e.x,e.y,r+6,'#f3c775',2.3);ring(c,e.x,e.y,r+10,'#b993fb',1.4);}
    if(e.max>24&&e.hp<e.max&&!e.dead){line(c,e.x-r,e.y-r-7,e.x+r,e.y-r-7,'#3f455c',2);line(c,e.x-r,e.y-r-7,e.x-r+2*r*e.hp/e.max,e.y-r-7,'#ffbe9d',2);}
    if(e.guardUntil>t){c.save();c.translate(e.x,e.y);c.beginPath();for(var z=0;z<6;z++)c.lineTo(Math.cos(z*TAU/6)*(r+4),Math.sin(z*TAU/6)*(r+4));c.closePath();stroke(c,'#cf9eff',1.5);c.restore();}
    if(e.frenzied){
      c.save();c.globalAlpha=.25+.15*Math.sin(t*3+e.age);
      ring(c,e.x,e.y,r+1,'#f95f77',1.6,.2,3.8);c.restore();
    }
    if(e.captain){
      var intact=Q.armoredCaptain(e),orbit=r+(intact?5:7);
      c.save();c.translate(e.x,e.y);c.rotate(t*(intact?.65:1.1));
      for(var plate=0;plate<3;plate++){
        var turn=plate*TAU/3;
        ring(c,0,0,orbit,intact?'#8b602e':'#89e8ce',intact?4:2,turn,turn+(intact?1.1:.28));
        ring(c,0,0,orbit+1.2,intact?'#f0bf72':'#c9ffeb',1,turn,turn+.26);
      }
      c.restore();
    }
    Art.status(c,e);
    if(e.vulnerableUntil>t){
      var arc=t*2;ring(c,e.x,e.y,r+3,'#9ffbce',1.6,arc,arc+.9);
      ring(c,e.x,e.y,r+3,'#9ffbce',1.6,arc+Math.PI,arc+Math.PI+.9);
    }
    if(e.mark)antibody(c,e.x,e.y-r-4,5,-Math.PI/2,'#ffd65e');
    if(e.armor>0)ring(c,e.x,e.y,r+3,'#e3b6ff',1.4);
    if(D.infected(k) && !e.elite && typeof e.fuse==='number'){
      ring(c,e.x,e.y,r+4,'#61445e',1.8);ring(c,e.x,e.y,r+4,'#ff9cbc',2,-Math.PI/2,-Math.PI/2+TAU*Math.max(.001,e.fuse/(k==='cmv'?11:9)));if(k==='cmv')ring(c,e.x,e.y,r+7,'#a5a1dd',1);
    }
  }
  function icon(canvas,kind,size,time) {
    var ratio=Math.min(window.devicePixelRatio||1,2),side=Math.ceil(size*ratio);
    if(canvas.width!==side||canvas.height!==side)canvas.width=canvas.height=side;
    var c=canvas.getContext('2d'),t=time||0;
    c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,size,size);
    enemy(c,{kind:kind,x:size*.52,y:size*(.5+.014*Math.sin(t*1.6)),r:size*.355,angle:-.42+.10*Math.sin(t*.8)},t);
  }
  var moteSeeds=[];
  for(var mi=0;mi<66;mi++)moteSeeds.push([grain(mi+948),grain(mi+137),grain(mi+468),grain(mi+238)]);
  function ground(h) {
    var base=document.createElement('canvas');base.width=W;base.height=Math.ceil(h);
    var c=base.getContext('2d');
    c.fillStyle=glow(c,W*.47,h*.46,h*.69,['#103245','#0d2233','#0c1b33','#07131e']);c.fillRect(0,0,W,h);
    // Render blurred tissue once; the slightly oversized layer can slide behind the field.
    var far=document.createElement('canvas');far.width=W+40;far.height=base.height+40;
    var f=far.getContext('2d');
    for(var i=0;i<7;i++){
      var cx=(grain(128+i)*1.2-.08)*W,cy=(i+.25)*h/7,r=35+grain(698+i)*46;
      f.save();f.translate(cx,cy);f.rotate(grain(811+i)*2-.9);f.scale(1,.43+grain(i+417)*.25);f.globalAlpha=.06;
      var disk=f.createRadialGradient(-r*.15,-r*.2,0,0,0,r);
      disk.addColorStop(0,'#3b2546');disk.addColorStop(.38,'#5f416b');disk.addColorStop(.67,'#f8889e');disk.addColorStop(.83,'#ffb2ac');disk.addColorStop(1,'rgba(224,97,129,0)');
      dot(f,0,0,r,disk);f.restore();
    }
    for(i=0;i<4;i++){
      // Locally curved bundles enter the field at different angles and depths.
      f.save();f.translate([14,390,92,290][i],[.28,.54,.87,.12][i]*h);
      f.rotate([-.99,1.18,-.48,-.49][i]);
      for(var j=0;j<6;j++){
        var by=j*1.85,twist=3*Math.sin(j*.74);
        f.beginPath();f.moveTo(-175,-28+by);f.bezierCurveTo(-97,-46+by,2,18+twist,49,7+by*.7);
        f.bezierCurveTo(130,-11+by*1.2,164,22+twist,238,51+by*.8);
        stroke(f,j%3?'rgba(135,165,192,.052)':'rgba(134,105,179,.085)',j%3 ? .7 : 2.3);
      }f.restore();
    }
    // Small out-of-focus scatter and vessel striations keep the dark field optically textured.
    for(i=0;i<270;i++){
      var x=grain(900+i)*W,y=grain(1460+i)*h;
      r=.35+grain(i+358)*1.35;dot(c,x,y,r,i%9?'rgba(134,199,223,0.129)':'rgba(235,197,156,0.278)');
      if(i%17===0){r=3+grain(8+i)*7;dot(c,x,y,r,glow(c,x,y,r,['rgba(73,181,183,0.122)','rgba(135,219,216,0.055)','rgba(52,89,111,0)']));}
    }
    var vignette=document.createElement('canvas');vignette.width=W;vignette.height=base.height;
    var v=vignette.getContext('2d');v.scale(W,h);var lens=v.createRadialGradient(.5,.48,.23,.5,.48,.74);
    lens.addColorStop(0,'rgba(2,7,21,0)');lens.addColorStop(.68,'rgba(4,7,29,.20)');lens.addColorStop(1,'rgba(2,5,15,.79)');v.fillStyle=lens;v.fillRect(0,0,1,1);
    return {base:base,far:far,vignette:vignette};
  }
  function fieldDepth(c,bg,h,t,px,py) {
    c.drawImage(bg.base,0,0);
    var ux=(px/W-.5),uy=(py/h-.5);
    c.drawImage(bg.far,-20-ux*19+Math.sin(t*.14)*2,-20-uy*19+Math.cos(t*.16)*2);
    moteSeeds.forEach(function(s,i){
      var a=s[0]*TAU+t*(.038+s[2]*.04),phase=(s[1]+t*.009*(.5+s[2]))%1,rad=1-phase;
      var x=W*.5+Math.cos(a)*W*.75*rad+Math.sin(t*1.9+i)*1.6-ux*7;
      var y=h*.5+Math.sin(a)*h*.71*rad+Math.cos(t*1.6+i*.7)*1.8-uy*7;
      c.globalAlpha=Math.min(1,phase*12,rad*9)*(.27+s[3]*.50);
      ellipse(c,x,y,.6+s[3]*1.1,.36+s[3]*.59,a,i%7?'#a0dfde':'#ffd6a2');
    });c.globalAlpha=1;c.drawImage(bg.vignette,0,0);
  }
  function cover(c,h,t,bg,preview,slide) {
    fieldDepth(c,bg,h,t,W*(.5+.27*Math.sin(t*.22)),h*(.5+.23*Math.cos(t*.21)));
    if(!slide)return;
    // The specimen has its own transparent slide. The surrounding controls reserve its space.
    var width=360,height=225,x=width*.5+Math.sin(t*.31)*2.4,y=height*.49+Math.cos(t*.35)*2;
    var iris=90;
    c=slide;c.clearRect(0,0,width,height);
    c.save();c.translate(width*.5,height*.49);ring(c,0,0,iris,'rgba(136,218,208,.24)',.8);
    for(var mark=0;mark<64;mark++){
      var phase=mark*TAU/64,span=mark%8===0?6:mark%2===0?3:1.5;
      line(c,Math.cos(phase)*(iris+2),Math.sin(phase)*(iris+2),Math.cos(phase)*(iris+2+span),Math.sin(phase)*(iris+2+span),'rgba(157,220,207,.40)',.8);
    }
    c.restore();
    var specimens=[['staph',.14,.2,16],['pneumo',.86,.21,15],['rod',.16,.83,13],['latent',.84,.80,13]];
    specimens.forEach(function(v,i){
      var xx=width*v[1]+Math.cos(t*.41+i)*4,yy=height*v[2]+Math.sin(t*.47+i)*4;
      enemy(c,{kind:v[0],x:xx,y:yy,r:v[3],angle:i*.69-.68+.09*Math.sin(t+i)},t);
    });
    if(preview==='macrophage')cell(c,x,y,67,t*.55,.04,.42,false,[],true);
    else Art.hero(c,preview,x,y,preview==='dc'?48:64,t);
  }
  function net(c,v) {
    c.save();c.translate(v.x,v.y);c.strokeStyle='rgba(231,242,225,.47)';c.lineWidth=.8;
    for(var n=1;n<4;n++){
      c.beginPath();for(var i=0;i<8;i++){var a=i*TAU/8,r=v.r*n/3*(.8+.16*Math.sin(i*4));var x=Math.cos(a)*r,y=Math.sin(a)*r;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.stroke();
      if(n===3){for(var j=0;j<8;j++){var b=j*TAU/8,end=v.r*(.8+.16*Math.sin(j*4));line(c,0,0,Math.cos(b)*end,Math.sin(b)*end,'rgba(231,242,225,.4)',.8);}}
    }c.restore();
  }
  function friendly(c,f) {
    dot(c,f.x,f.y,11,glow(c,f.x,f.y,11,['#faefdd','#dfe6d2','#89a394']));
    for(var i=0;i<3;i++)dot(c,f.x+Math.cos(i*TAU/3)*3.2,f.y+Math.sin(i*TAU/3)*3.2,3.3,'#787b92');
  }
  function ctl(c,pos) {dot(c,pos.x,pos.y,8,glow(c,pos.x,pos.y,8,['#dae7ff','#75a7db','#425c9f']));dot(c,pos.x-1,pos.y,3.7,'#586ba6');}
  function physiology(c,g,h) {
    if(g.time<60)return;
    c.save();c.scale(W,h);
    var flush=c.createRadialGradient(.5,.50,.24,.5,.5,.71);
    flush.addColorStop(0,'rgba(243,82,100,0)');flush.addColorStop(.72,'rgba(249,83,96,.14)');flush.addColorStop(1,'#ff717e');
    c.globalAlpha=.26+.13*Math.sin(g.time*1.46);c.fillStyle=flush;c.fillRect(0,0,1,1);
    if(g.hot){
      var t=g.time-90,warm=c.createRadialGradient(.52,.45,.01,.52,.45,.9);
      warm.addColorStop(0,'rgba(255,181,85,0.251)');warm.addColorStop(.35,'rgba(234,161,77,0.110)');warm.addColorStop(.86,'rgba(245,143,65,0.478)');
      c.globalAlpha=.38+.19*Math.sin(t*2.15);c.fillStyle=warm;c.fillRect(0,0,1,1);
    }c.restore();
    if(g.hot)for(var i=0;i<9;i++){
      var q=(g.time*.63+grain(193+i))%1;
      var x=g.p.x+Math.sin(i*4.8+q*3)*(g.radius+9),y=g.p.y-g.radius*.25-q*30;
      c.save();c.globalAlpha=Math.sin(q*Math.PI)*.86;ring(c,x,y,.6+q*1.25,'#ffd278',.8);c.restore();
    }
  }
  function floaters(c,g) {
    var still=reducedMotion&&reducedMotion.matches;
    g.floaters.forEach(function(v){
      var q=(g.time-v.born)/.9,font=v.text==='+EXP'?'bold 10px Arial, sans-serif':'600 10px sans-serif';
      c.save();c.font=font;c.textAlign='center';var w=c.measureText(v.text).width+8;
      var travel=still?0:q*17,x=Math.max(w/2+2,Math.min(W-w/2-2,v.x));
      var y=v.below?v.below+travel*.65:Math.max(16,v.y-9-travel);
      var critical=v.text.indexOf('暴击')>=0,immune=v.text.indexOf('免疫')>=0;
      c.globalAlpha=Math.min(1,(1-q)*3);
      if(v.key){
        drawRoundRect(c,x-w/2,y-9,w,13,6);
        c.fillStyle=critical?'rgba(72,42,21,.40)':immune?'rgba(62,27,64,.40)':'rgba(12,32,45,.35)';c.fill();
      }
      c.lineJoin='round';c.lineWidth=2;c.strokeStyle='rgba(8,18,29,.86)';c.strokeText(v.text,x,y+1);
      c.fillStyle=critical?'#ffeb90':immune?'#f4c9ff':v.color;c.fillText(v.text,x,y+1);
      if(!still&&v.text.indexOf('滑开')===0&&q<.50)ring(c,v.x,v.y+10,4+q*48,'rgba(245,255,255,'+(.65*(1-q*2))+')',1.4);
      c.restore();
    });
  }
  function antigen(c,o,p){
    var dx=p.x-o.x,dy=p.y-o.y,d=Math.hypot(dx,dy);
    if(d<80 && d>1 && o.age>.24){
      var len=Math.min(19,7+(80-d)*.17),tx=-dx/d*len,ty=-dy/d*len;
      c.beginPath();c.moveTo(o.x+tx+ty*.3,o.y+ty-tx*.3);
      c.bezierCurveTo(o.x+tx*.77+ty*.42,o.y+ty*.77-tx*.42,o.x+tx*.48,o.y+ty*.48,o.x,o.y);
      stroke(c,gradient(c,o.x+tx,o.y+ty,o.x,o.y,['rgba(107,255,219,0.000)','rgba(121,238,220,0.580)','#ffdf8d']),1.8);
    }
    if(o.value>=2.5){
      if(o.memory){c.save();c.translate(o.x,o.y);c.rotate(o.age*1.8);ring(c,0,0,7,'#ffe5a4',1.15);
        for(var i=0;i<4;i++){var a=i*TAU/4;line(c,3*Math.cos(a),3*Math.sin(a),8*Math.cos(a),8*Math.sin(a),'#fff3c8',1.3);}c.restore();}
      var high=o.value>=15,sz=high?6:o.value>=5?5:3.7;
      dot(c,o.x,o.y,sz+2,high?'rgba(173,130,252,.45)':'rgba(255,193,90,.35)');c.save();c.translate(o.x,o.y);c.rotate(.78);c.fillStyle=high?'#d7aeff':'#ffd48c';c.fillRect(-sz*.64,-sz*.64,sz*1.28,sz*1.28);c.restore();return;
    }
    dot(c,o.x,o.y,6,glow(c,o.x,o.y,6,['#ffefa9','rgba(117,255,218,0.541)','rgba(57,198,207,0.000)']));
    dot(c,o.x,o.y,2.45,glow(c,o.x,o.y,2.45,['#fffdda','#ffe08d','#6ae3cd']));
  }
  function slots(cv,capacity,cargo){
    var cols=Math.min(11,capacity),rows=Math.ceil(capacity/cols),width=cols*15,height=rows*15,ratio=Math.min(2,window.devicePixelRatio||1);
    if(cv.width!==Math.round(width*ratio)||cv.height!==Math.round(height*ratio)){
      cv.width=Math.round(width*ratio);cv.height=Math.round(height*ratio);cv.style.width=width+'px';cv.style.height=height+'px';
    }
    var c=cv.getContext('2d');c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,width,height);
    var contents=[];cargo.forEach(function(v){contents.push(v);if(D.cargoSlots(v.kind)>1)contents.push(v);});
    for(var i=0;i<capacity;i++){
      var v=contents[i],x=(i%cols)*15+7.5,y=Math.floor(i/cols)*15+7.5;
      dot(c,x,y,5.7,'rgba(66,117,122,0.369)');ring(c,x,y,5.7,'rgba(151,232,225,0.478)',.85);
      if(v){var col=D.species[v.kind].color;dot(c,x,y,4,glow(c,x,y,4,['#fff1bb',col,'rgba(36,91,105,.45)']));ring(c,x,y,6.4,'#e8ffe9',1.4,-Math.PI/2,-Math.PI/2+v.progress*TAU);}
      if(v&&D.cargoSlots(v.kind)>1){line(c,x-2,y+2,x+2,y-2,v.dormantUntil?'#fff1bd':'#ffadbf',1.8);}
      dot(c,x-2,y-2.7,.9,'rgba(229,255,237,0.690)');
    }
  }
  function upgradeIcon(cv,k){
    cv.width=cv.height=80;var c=cv.getContext('2d');c.scale(2,2);var x=20,y=20;
    if(k==='mist'||k==='pulse'||k==='veil'){
      if(k==='mist'){for(var m=0;m<5;m++)line(c,8,28,22+m*2,6+m*2,'#bff394',1.7);}
      if(k==='pulse'){ring(c,x,y,12,'#ffb57d',1.5);ring(c,x,y,8,'#ffda82',2);dot(c,x,y,4,'#fff1bb');}
      if(k==='veil'){c.beginPath();c.moveTo(20,7);c.lineTo(31,12);c.quadraticCurveTo(30,26,20,33);c.quadraticCurveTo(10,26,9,12);c.closePath();stroke(c,'#91ecf1',2);line(c,15,20,25,20,'#dcfff2',2);line(c,20,15,20,25,'#dcfff2',2);}return;
    }
    if(k==='turret'){Art.hero(c,'dc',20,20,9,1);return;}
    if(k==='ifn'||k==='matrix'){
      ring(c,x,y,10,k==='matrix'?'#f3d385':'#abf1d6',1.5,-1.1,3.9);
      for(var j=0;j<3;j++){var a=j*TAU/3-.5;
        if(k==='matrix')antibody(c,x+8*Math.cos(a),y+8*Math.sin(a),4,a,'#ffe398');
        else dot(c,x+8*Math.cos(a),y+8*Math.sin(a),2.8,'#ace8d7');
      }dot(c,x,y,2.8,'#fff3be');return;
    }
    if(k==='mhc'){c.beginPath();c.moveTo(9,13);c.quadraticCurveTo(15,32,21,22);c.quadraticCurveTo(28,30,32,13);stroke(c,'#88d9fc',2.5);
      line(c,14,14,27,14,'#ffce81',2.5);line(c,20,24,20,32,'#a0f7e0',2);return;}
    if(k==='igg'){c.shadowColor='#ffbe4e';c.shadowBlur=5;antibody(c,x,y,12,-Math.PI/2,'#ffe194');return;}
    if(k==='acid'||k==='heal'||k==='collect'){
      dot(c,x,y,12,glow(c,x,y,12,['#173e69','#16857e','#a0ffcf']));ring(c,x,y,12,'#c8ffe8',1);
      if(k==='heal'){line(c,14,20,26,20,'#edffe3',2);line(c,20,14,20,26,'#edffe3',2);}
      else for(var i=0;i<4;i++){var a=i*2.4;dot(c,x+Math.cos(a)*6,y+Math.sin(a)*5,2.5,k==='acid'?'#b7f9a2':'#ffdf9b');}
    }else if(k==='ctl'){ctl(c,{x:x,y:y});ring(c,x,y,13,'#86bcfc',1,0,4.8);dot(c,32,16,2,'#c7f2ff');}
    else if(k==='c3'){for(var j=0;j<3;j++){var b=j*TAU/3-1.57,xx=x+Math.cos(b)*10,yy=y+Math.sin(b)*10;line(c,x,y,xx,yy,'#96fff0',1.5);dot(c,xx,yy,4,glow(c,xx,yy,4,['#dafff2','#5bdbcf','#397d9c']));}dot(c,x,y,3,'#c4fff4');}
    else if(k==='actin'){for(var f=0;f<3;f++){c.beginPath();c.moveTo(8,26+f*2);c.bezierCurveTo(15,25,21,5+f*3,32,12+f*3);stroke(c,f%2?'#86e6ff':'#c4a6ff',2);}}
    else{for(var z=0;z<10;z++){var a2=z*TAU/10;line(c,x+Math.cos(a2)*6,y+Math.sin(a2)*6,x+Math.cos(a2)*13,y+Math.sin(a2)*13,'#ffc16a',1.4);}dot(c,x,y,7,glow(c,x,y,7,['#fff7af','#ffa53e','#e66a5c']));}
  }
  function edgePointers(c,g,h){
    var centerY=h*.5,edgeTop=h*.21,edgeBottom=h*.79;
    function point(target,col){
      if(target.x>=16&&target.x<=W-16&&target.y>=edgeTop&&target.y<=edgeBottom)return;
      var dx=target.x-W/2,dy=target.y-centerY;
      var t=Math.min((W/2-16)/(Math.abs(dx)||1),(dy<0?centerY-edgeTop:edgeBottom-centerY)/(Math.abs(dy)||1),1);
      c.save();c.translate(W/2+dx*t,centerY+dy*t);c.rotate(Math.atan2(dy,dx));
      c.globalAlpha=.78+.14*Math.sin(g.time*4);c.beginPath();c.moveTo(6,0);c.lineTo(-5,-4.5);c.lineTo(-3,0);c.lineTo(-5,4.5);c.closePath();
      c.fillStyle=col;c.fill();stroke(c,'#132636',1.4);c.restore();
    }
    if(g.boss&&!g.bossDead)g.enemies.forEach(function(e){if(e.bossSerial&&!e.dead)point(e,'#ff96ce');});
    g.phages.forEach(function(f){if(f.phase==='idle')point(f,'#84f7d4');});
  }
  function frame(c,g,h,bg,ending) {
    var p=g.p;c.save();var shock=g.time-g.shakeAt;if(shock<.22){var mag=4*Math.exp(-shock*18);c.translate(mag*Math.sin(91*shock),mag*Math.cos(103*shock));}fieldDepth(c,bg,h,g.time,p.x,p.y);Art.organ(c,g,h);physiology(c,g,h);
    g.films.forEach(function(v){
      c.save();c.globalAlpha=Math.min(1,v.life);
      if(v.kind){
        var ink=v.kind==='toxin'?'#ebbc6b':v.kind==='haze'?'#a6aff6':'#67dba9';
        if(v.warm>0)c.setLineDash([3,4]);
        else{c.globalAlpha*=.18;dot(c,v.x,v.y,v.r,ink);c.globalAlpha=Math.min(.75,v.life);}
        ring(c,v.x,v.y,v.r,ink,1);ring(c,v.x,v.y,v.r*.67,ink,.65,.5,3.8);
      }else{
        dot(c,v.x,v.y,v.r,glow(c,v.x,v.y,v.r,['rgba(163,255,90,0.369)','rgba(72,230,106,0.200)','rgba(91,250,99,0.078)']));
        ring(c,v.x,v.y,v.r*.85,'rgba(156,242,111,0.282)',.7,.45,4.7);
      }
      c.restore();});
    g.nets.forEach(function(v){net(c,v);});
    g.orbs.forEach(function(o){antigen(c,o,p);});
    g.enemies.forEach(function(e){
      if(e.kind==='pylori'&&!e.dead)dot(c,e.x,e.y,38,'rgba(186,107,224,.13)');
      if(e.chargeLeft>0){
        var len=Math.hypot(W,h),dx=Math.cos(e.chargeAngle),dy=Math.sin(e.chargeAngle);
        c.save();c.translate(e.x,e.y);c.rotate(e.chargeAngle);
        c.fillStyle='rgba(247,79,98,'+(.11+.09*Math.sin(g.time*20))+')';c.fillRect(0,-e.r*.72,len,e.r*1.44);
        c.setLineDash([7,5]);line(c,0,-e.r*.72,len,-e.r*.72,'#ff929a',1);line(c,0,e.r*.72,len,e.r*.72,'#ff929a',1);c.restore();
        line(c,e.x,e.y,e.x+dx*len,e.y+dy*len,'rgba(255,192,153,.4)',1);
      }else if(e.supplyFor){
        var boss=g.enemies.find(function(v){return !v.dead&&v.bossSerial===e.supplyFor;});
        if(boss){line(c,e.x,e.y,boss.x,boss.y,'rgba(115,246,165,.52)',3);var f=(g.time*1.1)%1;dot(c,e.x+(boss.x-e.x)*f,e.y+(boss.y-e.y)*f,2.2,'#edffb8');}
      }
    });
    g.enemies.forEach(function(e){if(!e.dead)enemy(c,e,g.time);});Art.extras(c,g,h);
    g.allies.forEach(function(f){friendly(c,f);});if(g.levels.ctl&&g.hero.mode!=='summon')ctl(c,g.ctl);
    g.shots.forEach(function(v){
      if(v.kind==='matrix'){line(c,v.x,v.y,v.x-9*Math.cos(v.a),v.y-9*Math.sin(v.a),'#b0e7d3',1.5);
        antibody(c,v.x,v.y,5.5,v.a,'#fff0ad');}
      else if(v.kind==='sporebolt'){dot(c,v.x,v.y,3.2,v.from==='boss_biofilm'?'#80e6bb':'#eed6fb');ring(c,v.x,v.y,4.4,'#efd8ad',.75);}
      else if(v.kind==='igg')antibody(c,v.x,v.y,4.5,v.a,'#ffe3a0');
      else if(v.kind==='plasmid')ring(c,v.x,v.y,4,'#e4b0f5',1.4);
      else {dot(c,v.x,v.y,v.kind==='c3'?3.2:2.5,v.kind==='c3'?'#8df6eb':'#9ac9ff');}
    });
    c.save();if(p.inv>.08 && Math.floor(p.inv*12)%2)c.globalAlpha=.55;
    if(ending&&ending.kind==='loss'&&!ending.reduced){
      var collapse=Math.min(1,ending.elapsed/1.4);
      c.translate(p.x,p.y);c.scale(1-.62*collapse,1-.8*collapse);c.translate(-p.x,-p.y);c.globalAlpha=1-.85*collapse;
    }
    if(g.hero.mode==='cargo'){
      var full=Q.occupancy(p)>=g.capacity;
      if(full)ring(c,p.x,p.y,g.radius*(1.21+.09*Math.sin(g.time*9)),'#ff9291',1.3);
      if(!full){var edible=g.enemies.find(function(e){return !e.dead&&!e.bossSerial&&!e.mirrorFor&&!Q.armoredCaptain(e)&&e.kind!=='virus'&&!D.infected(e.kind)&&!e.hypha&&(!D.capsule(e.kind)||e.mark)&&g.capacity-Q.occupancy(p)>=D.cargoSlots(e.kind)&&Math.hypot(p.x-e.x,p.y-e.y)<g.radius+e.r+6;});
        if(edible){var a=Math.atan2(edible.y-p.y,edible.x-p.x);ellipse(c,p.x+Math.cos(a)*g.radius*.84,p.y+Math.sin(a)*g.radius*.84,g.radius*.55,g.radius*.25,a,'#7fdbc4');}}
      cell(c,p.x,p.y,g.radius*(full?1.13:1),g.time,p.angle,p.motion,full,p.cargo,false,p);
      if(full){
        var soon=0,remaining=Infinity;
        p.cargo.forEach(function(v){
          var delay=v.dormantUntil?Math.max(0,v.dormantUntil-g.time):(1-v.progress)*Q.cargoDuration(g,v);
          if(delay<remaining){remaining=delay;soon=v.dormantUntil?1-delay/3:v.progress;}
        });
        ring(c,p.x,p.y,g.radius*1.11,'#ffdc81',1.8,-Math.PI/2,-Math.PI/2+TAU*Math.max(0,Math.min(1,soon)));
      }
    }else Art.hero(c,g.heroId,p.x,p.y,g.hitRadius||g.radius,g.time,g);
    if(g.hero.mode==='summon'){
      var close=g.orbs.filter(function(o){return Math.hypot(o.x-p.x,o.y-p.y)<150;}).slice(0,4);
      close.forEach(function(o,i){c.beginPath();c.moveTo(p.x,p.y);c.quadraticCurveTo((p.x+o.x)/2+9*Math.sin(g.time+i),(p.y+o.y)/2-8,o.x,o.y);stroke(c,'rgba(255,206,165,.61)',1.2);});
    }c.restore();
    Art.beams(c,g);
    g.effects.forEach(function(v){
      var q=Math.min(1,v.age/v.duration);c.save();c.globalAlpha=(1-q)*.87;
      if(v.kind==='spark')dot(c,v.x+v.dx*(2*q-q*q),v.y+v.dy*(2*q-q*q),2.3*(1-q)+.2,v.color);
      else if(v.kind==='hole'){dot(c,v.x,v.y,v.r*(.35+.65*q),'#061611');ring(c,v.x,v.y,v.r*(.35+.65*q),v.color,2.7);}
      else ring(c,v.x,v.y,Math.max(.2,v.r*q),v.color,2.5-q);c.restore();
    });
    if(g.time-g.pickupAt<.12)ring(c,p.x,p.y,g.radius*(1+(g.time-g.pickupAt)*3),'#ffedaa',1.2);
    if(g.rallyUntil>g.time){c.save();c.setLineDash([6,5]);ring(c,p.x,p.y,95,'#ebc06c',1.3);c.restore();}
    if(g.shieldHP>0&&g.shieldUntil>g.time){ring(c,p.x,p.y,g.radius+5,'#a9fbdc',2);ring(c,p.x,p.y,g.radius+8,'rgba(159,225,255,.48)',1);}
    floaters(c,g);c.restore();if(!ending)edgePointers(c,g,h);
    if(g.stick&&!g.stick.fixed){
      var s=g.stick,thumbX=s.x+s.dx*28,thumbY=s.y+s.dy*28;
      dot(c,s.x,s.y,27,'rgba(10,33,45,.06)');ring(c,s.x,s.y,27,'rgba(177,231,223,.62)',1);
      dot(c,thumbX,thumbY,8,'rgba(150,226,216,.17)');ring(c,thumbX,thumbY,8,'rgba(214,248,236,.83)',1);
    }
  }
  function outro(c,summary,progress,h){
    var t=summary.reduced?0.32:progress,x=summary.x,y=summary.y*h,r=Math.max(14,summary.radius);
    var win=summary.won,ink=win?'#adffe1':summary.kind==='timeout'?'#ffdc96':'#ffac9d';
    var spread=1-Math.pow(1-t,3);
    c.save();
    var shade=c.createRadialGradient(x,y,r,x,y,Math.max(h,W)*.86);
    shade.addColorStop(0,'rgba(3,15,24,.12)');shade.addColorStop(.57,'rgba(4,17,28,.56)');shade.addColorStop(1,'rgba(2,10,20,.86)');
    c.fillStyle=shade;c.fillRect(0,0,W,h);
    c.translate(x,y);
    if(summary.bossKind&&!summary.reduced&&t<.72){
      var piece=t/.72,edge=r*1.38,texture=bodyTexture(summary.bossKind,false);
      // Clip the actual specimen sprite into sectors so the final hit is recognizable.
      for(var k=0;k<7;k++){
        var start=k*TAU/7,mid=start+TAU/14,drift=(12+grain(k)*27)*piece;
        c.save();c.globalAlpha=1-piece;c.translate(Math.cos(mid)*drift,Math.sin(mid)*drift+8*piece*piece);
        c.rotate((grain(k+7)-.5)*piece*.9);
        c.beginPath();c.moveTo(0,0);c.arc(0,0,edge*1.45,start,start+TAU/7+.002);c.closePath();c.clip();
        c.drawImage(texture,-edge,-edge,2*edge,2*edge);c.restore();
      }
    }
    c.lineCap='round';c.shadowColor=ink;c.shadowBlur=5;
    c.globalAlpha=.86*(1-.72*t);
    if(summary.kind==='timeout'){
      var dial=r+17;
      ring(c,0,0,dial,ink,1.8);
      for(var i=0;i<12;i++){var a=i*TAU/12;line(c,Math.cos(a)*(dial-4),Math.sin(a)*(dial-4),Math.cos(a)*dial,Math.sin(a)*dial,ink,i%3?1:2);}
      line(c,0,0,0,-dial*.7,ink,2);line(c,0,0,dial*.47,0,ink,2);
      ring(c,0,0,dial+7+spread*18,ink,1,-Math.PI/2,-Math.PI/2+TAU*(1-.88*t));
    }else{
      ring(c,0,0,r+8+spread*(win?103:40),ink,2.2-t*1.3);
      if(win)ring(c,0,0,r+2+spread*69,'#ffeab5',1);
      var count=summary.kind==='barrier'?8:win?26:14;
      for(var j=0;j<count;j++){
        var theta=TAU*(j+grain(j)*.6)/count,gap=grain(j+24);
        var reach=r+9+spread*(18+gap*(win?87:46));
        var px=Math.cos(theta)*reach,py=Math.sin(theta)*reach;
        if(summary.kind==='barrier'||summary.bossBreak||!win){
          var width=(summary.kind==='barrier'?0.72:.44)*TAU/count;
          ring(c,px,py,3+gap*(r*.58),j%3?ink:'#ffeecc',1.3+gap,theta-width,theta+width);
        }else dot(c,px,py,1.2+gap*1.7,j%4?ink:'#ffe9a8');
      }
    }
    c.restore();
  }
  function report(record) {
    var cv=document.createElement('canvas');cv.width=750;cv.height=1100;var c=cv.getContext('2d');
    var navy='#132d40',paper='#f3f4e8',mint='#abf4d6',purple='#524583';
    var meta=record.report,hero=D.heroes[record.hero],map=D.maps[record.map],endless=!record.stage;
    var rank=window.Campaign.rank(record.time),won=meta&&meta.won,stain=meta&&meta.stain;
    if(stain==='giemsa'){paper='#f5e7ed';navy='#472b49';mint='#f4badd';purple='#773e66';}
    if(stain==='phase'){paper='#f6edcf';navy='#163d43';mint='#dfcd83';purple='#35666a';}
    function label(s,x,y,size,color,bold,max){
      c.fillStyle=color;c.font=(bold?'bold ':'')+size+'px "PingFang SC","Microsoft YaHei",Arial,sans-serif';
      if(max)c.fillText(s,x,y,max);else c.fillText(s,x,y);
    }
    function box(x,y,w,h,r,color){drawRoundRect(c,x,y,w,h,r);c.fillStyle=color;c.fill();}
    function paragraph(s,x,y,width,size){
      var buf='';c.font=size+'px "PingFang SC",Arial,sans-serif';c.fillStyle=navy;
      Array.from(s).forEach(function(ch){if(c.measureText(buf+ch).width>width){c.fillText(buf,x,y);buf='';y+=size*1.5;}buf+=ch;});c.fillText(buf,x,y);
    }
    c.fillStyle=paper;c.fillRect(0,0,750,1100);
    for(var i=0;i<1700;i++){dot(c,grain(i+31)*750,grain(i+1800)*1100,.6+grain(i)*.8,'rgba(46,77,90,.085)');}
    for(i=0;i<3;i++){c.fillStyle=[navy,'#77c7b7','#bdabe6'][i];c.fillRect(i*250,0,250,10);}
    box(42,39,34,34,10,navy);line(c,49,56,69,56,mint,3);line(c,59,46,59,66,mint,3);
    label('免疫观测站',88,66,23,navy,true);var station=endless?'无尽深渊 · '+rank.title:'第 '+record.stage+' 关 · '+window.Campaign.stages[record.stage-1].name;
    c.save();c.textAlign='right';label(station,706,65,22,'#436559',true,408);c.restore();
    line(c,42,89,708,89,'#93aaa9',1.3);
    var fc=window.FieldCollection;label(fc.warning,43,118,17,navy,true);
    var accent=won?'#17694f':endless?'#524583':'#a33b34';
    label('免疫防线 · 巡逻战报',43,175,31,navy,true);
    label(endless?'无尽巡逻结束':won?'关卡完成':'关卡失败',38,264,endless?58:77,accent,true,451);
    c.save();c.translate(576,211);c.rotate(-.13);
    // A scalloped die-cut specimen sticker sits over the print halftone.
    for(var row=-6;row<=6;row++){for(var col=-7;col<=7;col++){
      if(col*col+row*row<54)dot(c,col*12,row*12,2.8,'#9faaa9');
    }}
    c.save();c.shadowColor='rgba(41,75,85,0.333)';c.shadowBlur=6;c.shadowOffsetY=4;
    var pts=[];for(i=0;i<36;i++){var a=i*TAU/36,r=i%2?70:77;pts.push({x:Math.cos(a)*r,y:Math.sin(a)*r});}
    blob(c,pts);c.fillStyle='#b9abe6';c.fill();stroke(c,'#fffef2',8);c.restore();
    if(hero.mode==='cargo')cell(c,0,0,51,2.8,-.4,.4,false,[],true);else Art.hero(c,record.hero,0,0,record.hero==='dc'?32:41,1);
    box(-78,51,156,31,14,navy);c.textAlign='center';label(won?'CLEARED':endless?'ENDLESS':'FAILED',0,73,18,mint,true);c.restore();
    label(meta?meta.reason:map.name+' · '+hero.name,43,315,24,accent,true,660);
    box(40,341,670,147,23,navy);
    line(c,365,363,365,463,'#577383',1.2);
    label('存活时长',64,386,22,'#b4e7df');label('清除菌落总数',396,386,22,'#b4e7df');
    label(D.clock(record.time),61,455,60,'#f5fff4',true);label(String(record.kills),393,455,60,'#f5fff4',true);
    label(meta?'免疫人格':'巡逻称号',46,542,24,navy,true);
    c.save();c.translate(375,609);c.rotate(-.027);
    box(-326,-43,652,86,16,'#dfd7ef');drawRoundRect(c,-326,-43,652,86,16);stroke(c,purple,3);
    c.setLineDash([8,5]);drawRoundRect(c,-318,-35,636,70,11);stroke(c,'#8073a8',1.7);c.setLineDash([]);
    c.textAlign='center';label(meta?meta.persona:rank.title,0,15,40,purple,true,593);c.restore();
    label(meta?'本局超武':'巡逻进度',46,710,23,navy,true);
    label(map.short+'巡逻 · '+hero.name+(meta?' · +'+meta.atp+' ATP':''),225,710,20,navy,false,475);
    var badges=meta?meta.supers.filter(function(k){return D.supers[k];}).map(function(k){return D.supers[k].name;}):
      ['等级 Lv.'+record.level,'纪元 '+record.epoch];
    (badges.length?badges:['本局未解锁']).forEach(function(s,j){
      var width=Math.min(301,Math.floor((669-13*(badges.length-1))/(badges.length||1))),x=46+j*(width+13);box(x,729,width,48,22,badges.length?'#ffdf8f':'#dce5dc');
      label(badges.length?'✦':'○',x+15,762,24,navy,true);label(s,x+43,760,21,navy,true,width-52);
    });
    label('本局进化配装',45,810,21,navy,true);
    for(var slot=0;slot<6;slot++){var xx=49+slot*66;box(xx,825,54,52,10,'#d8e6dd');var skill=record.skills[slot];if(skill&&D.upgrades[skill.key]){
      var iconCanvas=surface(80);upgradeIcon(iconCanvas,skill.key);c.drawImage(iconCanvas,xx+8,826,38,38);label('Lv.'+skill.level,xx+11,873,14,navy,true);}}
    var k=meta&&meta.specimen;
    if(k&&D.species[k]){enemy(c,{kind:k,r:18,x:480,y:850,angle:-.35},1);label(D.species[k].danger+' · '+D.species[k].name,509,856,16,navy,true,185);}
    var stamps=meta?meta.stamps:[];
    if(stamps.length){
      var space=560/stamps.length,r=Math.min(23,space*.45);
      label('检验印章',47,911,17,navy,true);
      stamps.forEach(function(k,j){fc.stamp(c,k,152+j*Math.min(space,55),903,r,true);});
    }
    var tipY=stamps.length?934:891;
    box(40,tipY,670,58,13,'#d7ebe6');paragraph(meta?meta.tip:map.info,54,tipY+23,639,16);
    line(c,42,1003,705,1003,'#839a9a',1.2);
    label(fc.warning,45,1027,18,navy,true,660);paragraph(fc.statement,45,1053,658,15);
    return cv.toDataURL('image/png');
  }
  window.ImmuneRender={cell:cell,ground:ground,cover:cover,frame:frame,outro:outro,report:report,icon:icon,slots:slots,upgradeIcon:upgradeIcon};
}());
