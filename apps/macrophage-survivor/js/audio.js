(function () {
  'use strict';
  var ctx,bus,sfx,music,noise,enabled=true,bgm=true,hidden=document.hidden;
  var state='home',run=null,active=0,last={},note=0,seed=1931;
  var steps=[523,587,659,784,880,1046];
  var tones={eat:[280,720,.10],digest:[680,980,.09],hit:[170,48,.15],up:[460,1150,.27],shot:[500,320,.06],pulse:[220,840,.24]};
  function random(){
    seed=(1664525*seed+1013904223)>>>0;
    return seed/4294967296;
  }
  function unlock(){
    if(hidden)return false;
    try{
      var Audio=window.AudioContext||window.webkitAudioContext;
      if(!Audio)return true;
      if(!ctx&&Audio){
        ctx=new Audio();bus=ctx.createDynamicsCompressor();bus.threshold.value=-18;bus.ratio.value=8;bus.connect(ctx.destination);
        sfx=ctx.createGain();sfx.gain.value=enabled?1:0;sfx.connect(bus);
        noise=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.26),ctx.sampleRate);
        var samples=noise.getChannelData(0);
        for(var i=0;i<samples.length;i++)samples[i]=random()*2-1;
        music=window.ImmuneScore.create(ctx,bus,noise);music.enable(bgm);music.scene(state,run);
      }
      if(ctx&&(ctx.state==='suspended'||ctx.state==='interrupted'))ctx.resume().catch(function(){});
      return !!music && ctx.state==='running';
    }catch(err){return false;}
  }
  function background(isHidden){
    hidden=isHidden;
    if(!ctx||!music)return;
    if(isHidden){
      if(ctx.state!=='closed')ctx.suspend().catch(function(){});
      music.background(true);
    }else{
      music.background(false);unlock();
    }
  }
  function voice(source,at,dur,vol,filter){
    var gain=ctx.createGain();gain.gain.setValueAtTime(.0001,at);
    gain.gain.exponentialRampToValueAtTime(vol,at+.006);gain.gain.exponentialRampToValueAtTime(.0001,at+dur);
    if(filter){source.connect(filter);filter.connect(gain);}else source.connect(gain);
    gain.connect(sfx);active++;
    source.addEventListener('ended',function(){active--;source.disconnect();gain.disconnect();if(filter)filter.disconnect();});
    source.start(at);source.stop(at+dur+.003);
  }
  function tone(type,f,end,at,dur,vol){
    var osc=ctx.createOscillator();osc.type=type;osc.frequency.setValueAtTime(f,at);osc.frequency.exponentialRampToValueAtTime(end,at+dur);
    voice(osc,at,dur,vol);
  }
  function air(f,end,at,dur,vol){
    var src=ctx.createBufferSource(),bp=ctx.createBiquadFilter();src.buffer=noise;src.loop=true;
    bp.type='bandpass';bp.Q.value=1.8;bp.frequency.setValueAtTime(f,at);bp.frequency.exponentialRampToValueAtTime(end,at+dur);
    voice(src,at,dur,vol,bp);
  }
  var chords={
    victory:[523,659,784,988],defeat:[392,311,261,196],ready:[880,1320],
    phase:[146,155,233],equip:[523,784,1046],gate:[659,831,988],epoch:[293,349,277]
  };
  function play(k){
    if(k==='boss')k='boss_warn';if(k==='end')k='defeat';
    if(!enabled||hidden||!ctx||ctx.state!=='running')return;
    var t=ctx.currentTime,prior=last[k],interval=k==='heart'?.87:k==='impact'?.045:.075;
    if(prior!=null&&t-prior<interval)return;
    var critical=chords[k]||['boss_warn','stamp','discover','cast','flip'].indexOf(k)>=0;
    if(active>=(critical?42:17))return;
    last[k]=t;
    var pitch=1+(random()-.5)*.12;
    if(music&&(k==='boss_warn'||k==='victory'))music.warn();
    if(k==='boss_warn'){
      tone('sawtooth',280,93,t,.75,.055);tone('triangle',420,128,t+.16,.83,.07);tone('sine',69,37,t,.98,.13);return;
    }
    if(k==='cast'){air(420,2900,t,.28,.25);tone('sine',170,58,t,.22,.10);return;}
    if(k==='deny'){tone('triangle',230,200,t,.06,.07);tone('triangle',180,155,t+.06,.06,.05);return;}
    if(k==='discover'){air(3200,950,t,.045,.22);tone('sine',784,830,t+.08,.46,.064);tone('sine',1175,1244,t+.12,.37,.024);return;}
    if(k==='stamp'){air(480,200,t,.07,.28);tone('triangle',130,40,t,.22,.15);return;}
    if(k==='flip'){air(1300,3900,t,.10,.18);tone('triangle',720,1050,t+.06,.06,.03);return;}
    var chord=chords[k];
    if(chord){
      var finale=k==='victory'||k==='defeat',stride=finale?.13:.065,dur=finale?.54:.22;
      chord.forEach(function(f,i){tone(k==='phase'||k==='epoch'?'triangle':'sine',f,f,t+i*stride,dur,.07);});
      if(k==='victory')tone('sine',1976,2093,t+.43,.75,.035);
      return;
    }
    if(k==='impact'){tone('triangle',620*pitch,290*pitch,t,.038,.05);return;}
    if(k==='burst'){air(950*pitch,620*pitch,t,.082,.10);tone('sine',240*pitch,75*pitch,t,.085,.08);return;}
    if(k==='shield'){[1180,1740].forEach(function(f){tone('sine',f*pitch,f*.89*pitch,t,.07,.025);});return;}
    if(k==='pickup'){note=prior!=null&&t-prior<=1.6?Math.min(5,note+1):0;tone('sine',steps[note],steps[note]*1.13,t,.085,.05);tone('sine',steps[note]*2,steps[note]*1.8,t,.055,.014);return;}
    if(k==='heart'){tone('sine',55,50,t,.14,.07);tone('sine',55,48,t+.19,.13,.052);return;}
    if(k==='super'){[330,415,494].forEach(function(f,i){tone('sine',f,f*1.01,t+i*.07,.22,.06);});tone('sine',120,46,t,.25,.08);return;}
    var s=tones[k];if(s)tone(k==='hit'?'triangle':'sine',s[0]*pitch,s[1]*pitch,t,s[2],.058);
  }
  window.ImmuneAudio={
    unlock:unlock,play:play,background:background,
    enable:function(on){enabled=on;if(sfx)sfx.gain.setTargetAtTime(on?1:0,ctx.currentTime,.012);},
    music:function(on){bgm=on;if(music)music.enable(on);},
    scene:function(next,g){state=next;run=g;if(music)music.scene(next,g);}
  };
}());
