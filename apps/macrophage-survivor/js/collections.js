(function(){
  'use strict';
  var D=window.ImmuneData,R=window.ImmuneRender,Art=window.PatrolArt;
  var statement='免责与科普声明：本作系基于免疫学灵感创作的艺术化策略游戏，为保障游玩趣味对噬菌体宿主范围、抗体分泌及细胞吞噬机制进行了戏剧化改编，不代表完全严谨的生物学或医学事实。';
  var warning='虚拟游戏战报 · 免疫防线创意模拟（非真实医学检验，娱乐设定请勿当真）';
  // All seal motifs use the same 32-unit engraving grid.
  var dies=[
    'M4 19Q2 12 10 8L19 4Q25 2 28 9M28 15Q29 21 22 25L14 29Q6 31 4 24M19 8L14 15L19 16L12 24M2 6L6 10M25 26L29 29',
    'M4 14C4 6 15 5 15 13S4 23 4 14ZM17 12C17 5 28 3 28 11S17 20 17 12ZM4 24L15 21M9 29L25 23',
    'M16 2L27 6V16Q26 24 16 29Q6 24 5 16V7ZM8 17L24 13M14 8L18 22',
    'M16 2L23 6V14L16 18L9 14V6ZM16 18V24M11 24H21M12 20L6 23L3 29M20 20L26 23L29 29M13 23L10 29M19 23L22 29',
    'M5 26Q3 24 6 21L13 15L12 6Q13 2 16 4L18 13L24 7Q28 5 28 9L20 18L9 28Q7 29 5 26Z',
    'M16 2L28 9V23L16 30L4 23V9ZM9 16L14 21L23 11',
    'M5 11H23L21 25Q14 30 8 24ZM23 13Q32 12 27 20L23 21M3 29H26M9 8Q5 5 10 2M15 8Q11 5 16 2M21 8Q17 5 22 2',
    'M15 3Q3 8 8 19Q11 25 18 24Q6 32 3 18Q1 7 15 3ZM22 7L17 16H22L19 24L28 13H23L27 7Z',
    'M6 20A4 4 0 1 0 11 25A4 4 0 0 0 6 20ZM19 23A4 4 0 1 0 24 27A4 4 0 0 0 19 23ZM11 21L25 4M20 22L8 5M2 12L7 13M26 16L31 16',
    'M16 1L19 11L28 6L22 14L31 17L21 20L26 28L18 23L15 31L12 22L3 26L9 18L1 14L11 12L7 4L14 10Z',
    'M3 12Q5 1 15 8Q25 0 29 12Q31 18 16 30Q5 23 3 17M1 16H10L13 10L16 21L19 14L22 16H31',
    'M16 3L19 12L29 15L20 19L17 29L13 20L3 17L12 13ZM4 5L7 7M25 6L28 3M4 27L7 24M26 25L28 28',
    'M6 11L4 4L11 8L16 2L21 8L28 4L26 11ZM16 22C9 9 0 16 4 23C8 30 13 26 16 22C22 10 33 18 28 24C24 30 19 26 16 22Z',
    'M4 20L9 7L15 12L20 4L28 16L23 27L15 23L7 28ZM9 7L12 18L6 23M20 4L17 16L23 21',
    'M2 16Q15 -2 30 16Q16 33 2 16ZM12 16A4 4 0 1 0 20 16A4 4 0 1 0 12 16Z',
    'M4 11L9 16L13 6L17 15L23 5L24 16L29 10L25 25H8ZM9 29H24'
  ];
  var inks=['#b0474a','#21816d','#996723'];
  function stamp(c,key,x,y,r,earned,paper){
    var i=Object.keys(D.achievements).indexOf(key),ink=earned?inks[[0,0,1,1,1,2,1,2,1,2,0,2,2,2,1,0][i]]:'#70808a';
    c.save();c.translate(x,y);c.scale(r/24,r/24);c.rotate(earned?((i%5)-2)*.065:0);
    c.lineWidth=1.3;c.strokeStyle=ink;c.fillStyle=paper||(earned?'#ede7cb':'#263744');
    c.beginPath();c.arc(0,0,23,0,Math.PI*2);c.fill();
    if(!earned)c.setLineDash([2,3]);c.stroke();c.setLineDash([]);
    c.beginPath();c.arc(0,0,20,0,Math.PI*2);c.lineWidth=.8;c.stroke();
    c.translate(-14,-14);c.scale(.875,.875);c.lineWidth=2;c.lineCap='round';c.lineJoin='round';
    c.stroke(new Path2D(dies[i]||dies[0]));c.restore();
  }
  function sealCanvas(cv,key,earned){
    cv.width=cv.height=112;stamp(cv.getContext('2d'),key,56,56,54,earned);
  }
  var encounterStage={staph:1,pneumo:2,rod:2,latent:3,phage:3,tb:4,ecoli:4,pylori:5,candida:5,boss:5,bifido:6,strepto:2,salmonella:6,meningo:7,clostrid:6,cmv:7,acineto:7,boss_cdiff:6,boss_crypto:7,boss_biofilm:8};
  function habitat(k){
    var stage=encounterStage[k];return '第 '+stage+' 关 · '+D.maps[window.Campaign.stages[stage-1].map].short;
  }
  function known(k){
    var p=window.PatrolProfile.data;
    return p.introduced.indexOf('species/'+k)>=0||(p.atlas[k]&&p.atlas[k].kills>0);
  }
  function specimen(cv,k,size,t){
    R.icon(cv,k,size,t);
    if(known(k))return;
    var c=cv.getContext('2d');c.save();c.globalCompositeOperation='source-in';c.fillStyle='#28616a';c.fillRect(0,0,size,size);
    c.globalCompositeOperation='source-over';c.textAlign='center';c.fillStyle='#b4d9d6';c.font='bold '+Math.round(size*.44)+'px sans-serif';
    c.shadowColor='#82e7dd';c.shadowBlur=3;c.fillText('?',size/2,size*.66);c.restore();
  }
  function landscape(cv,map,t,locked){
    if(cv.width!==216||cv.height!==132){cv.width=216;cv.height=132;}
    var c=cv.getContext('2d'),h=220;c.save();c.scale(.6,.6);c.fillStyle={skin:'#3b2839',lung:'#204859',gut:'#4e3a36',brain:'#272540'}[map];c.fillRect(0,0,360,h);
    Art.organ(c,{map:map,time:t,windUntil:t+1,windDir:1,fibrinNets:[{x:2,y:50,xx:250,yy:157},{x:50,y:204,xx:331,yy:51},{x:72,y:194,xx:340,yy:82}]},h);
    if(map==='gut'){for(var i=0;i<3;i++){c.save();c.translate(72+i*92+Math.cos(t*.7+i)*13,62+i*20);c.rotate(i-.5);Art.special(c,'bifido',15,t);c.restore();}}
    if(map==='brain'){c.beginPath();for(i=0;i<11;i++)c.lineTo(24+i*31,102+15*Math.sin(i*2.8+t));c.strokeStyle='#b0a4ef';c.lineWidth=2;c.stroke();}
    if(locked){c.fillStyle='rgba(11,24,39,.58)';c.fillRect(0,0,360,h);c.strokeStyle='#d7e9e8';c.lineWidth=5;
      c.strokeRect(164,106,34,24);c.beginPath();c.arc(181,106,12,Math.PI,Math.PI*2);c.stroke();}
    c.restore();
  }
  window.FieldCollection={statement:statement,warning:warning,known:known,habitat:habitat,stamp:stamp,sealCanvas:sealCanvas,specimen:specimen,landscape:landscape};
}());
