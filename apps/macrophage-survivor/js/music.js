(function () {
  'use strict';
  // Sixteenth-note scores from the seven-scene soundtrack. Zero is a rest.
  var TRACKS = {
    home: {
      // 观测站 · 暗视野静息 · 主界面 / 图鉴 · F Lydian 梦幻八音盒
      bpm: 82,
      leadWave: 'sine',
      arpWave: 'triangle',
      bassWave: 'triangle',
      leadVol: 0.08, arpVol: 0.04, bassVol: 0.09, drumVol: 0.02,
      lead: [
        77,0,0,81, 84,0,83,0, 81,0,0,79, 77,0,0,0,
        76,0,0,79, 81,0,77,0, 74,0,0,0,  0,0,0,0,
        77,0,0,81, 86,0,84,0, 83,0,0,81, 79,0,0,0,
        81,0,79,0, 77,0,76,0, 77,0,0,0,  0,0,0,0
      ],
      arp: [
        65,69,72,77, 65,69,72,77, 64,67,71,76, 64,67,71,76,
        62,65,69,74, 62,65,69,74, 60,64,67,72, 60,64,67,72,
        65,69,72,77, 65,69,72,77, 67,71,74,79, 67,71,74,79,
        62,65,69,74, 60,64,67,72, 65,69,72,77, 65,0,0,0
      ],
      bass: [
        53,0,0,0, 53,0,0,0, 52,0,0,0, 52,0,0,0,
        50,0,0,0, 50,0,0,0, 48,0,0,0, 48,0,0,0,
        53,0,0,0, 53,0,0,0, 55,0,0,0, 55,0,0,0,
        50,0,0,0, 48,0,0,0, 53,0,0,0, 53,0,0,0
      ],
      drums: 'H.......H.......H.......H.......H.......H.......H.......H...H...'
    },
    skin: {
      // 皮肤战场 · 毛细血管初阵 · 皮肤破口 · 轻快英雄 NES 动作风 (4/4)
      bpm: 126,
      leadWave: 'square',
      arpWave: 'square',
      bassWave: 'triangle',
      leadVol: 0.062, arpVol: 0.032, bassVol: 0.11, drumVol: 0.055,
      lead: [
        72,0,76,0, 79,0,76,79, 81,0,79,0, 76,0,0,0,
        74,0,77,0, 79,0,74,0, 76,0,72,0, 67,0,0,0,
        72,0,76,0, 79,0,84,0, 83,0,81,0, 79,0,0,0,
        77,0,76,0, 74,0,71,0, 72,0,0,0, 0,0,0,0
      ],
      arp: [
        60,64,67,64, 60,64,67,64, 57,60,64,60, 57,60,64,60,
        53,57,60,57, 55,59,62,59, 60,64,67,64, 55,59,62,59,
        60,64,67,64, 60,64,67,64, 57,60,64,60, 55,59,62,59,
        53,57,60,57, 55,59,62,59, 60,64,67,72, 60,0,0,0
      ],
      bass: [
        48,0,60,0, 48,0,60,0, 45,0,57,0, 45,0,57,0,
        41,0,53,0, 43,0,55,0, 48,0,60,0, 43,0,55,0,
        48,0,60,0, 48,0,60,0, 45,0,57,0, 43,0,55,0,
        41,0,53,0, 43,0,55,0, 48,0,43,45, 48,0,0,0
      ],
      drums: 'K.H.S.H.K.H.S.HKK.H.S.H.K.K.S.HHK.H.S.H.K.H.S.HKK.H.S.H.K.K.S.SH'
    },
    lung: {
      // 肺泡战场 · 呼吸气浪圆舞 · 肺泡黏液 · 3/4 拍漂浮气浪与纤毛律动
      bpm: 112,
      leadWave: 'triangle',
      arpWave: 'sine',
      bassWave: 'triangle',
      leadVol: 0.09, arpVol: 0.045, bassVol: 0.10, drumVol: 0.045,
      lead: [
        74,0,0,0, 77,0,81,0, 79,0,0,0,
        76,0,0,0, 74,0,72,0, 74,0,0,0,
        77,0,0,0, 81,0,84,0, 81,0,0,0,
        79,0,77,0, 76,0,74,0, 72,0,0,0
      ],
      arp: [
        62,65,69, 62,65,69, 60,64,67, 60,64,67,
        58,62,65, 58,62,65, 62,65,69, 62,65,69,
        65,69,72, 65,69,72, 62,65,69, 62,65,69,
        60,64,67, 58,62,65, 60,64,67, 60,0,0
      ],
      bass: [
        50,0,0, 57,0,0, 48,0,0, 55,0,0,
        46,0,0, 53,0,0, 50,0,0, 57,0,0,
        53,0,0, 60,0,0, 50,0,0, 57,0,0,
        48,0,0, 46,0,0, 48,0,0, 48,0,0
      ],
      drums: 'K..H..H..H..K..H..H..H..K..W..H..H..K..H..S..H..'
    },
    gut: {
      // 肠道战场 · 绒毛丛林放克 · 肠道黏膜 · 俏皮切分低音与丛林打击乐
      bpm: 118,
      leadWave: 'triangle',
      arpWave: 'square',
      bassWave: 'sawtooth',
      leadVol: 0.095, arpVol: 0.025, bassVol: 0.065, drumVol: 0.062,
      lead: [
        74,0,77,79, 0,74,0,72, 74,0,0,77, 79,81,79,0,
        77,0,74,0, 72,69,72,0, 74,0,0,0,  0,0,72,74,
        81,0,79,77, 0,79,77,74, 72,0,74,77, 0,74,72,0,
        69,0,72,0, 74,0,77,0, 74,0,0,0,  0,0,0,0
      ],
      arp: [
        62,0,65,0, 69,0,65,0, 62,0,65,0, 67,0,65,0,
        60,0,64,0, 67,0,64,0, 62,0,65,0, 69,0,0,0,
        65,0,69,0, 72,0,69,0, 60,0,64,0, 67,0,64,0,
        57,0,60,0, 62,0,65,0, 62,0,0,0, 0,0,0,0
      ],
      bass: [
        38,0,0,38, 0,50,38,0, 38,0,41,0, 43,0,45,0,
        36,0,0,36, 0,48,36,0, 38,0,0,38, 50,0,48,45,
        41,0,0,41, 0,53,41,0, 36,0,0,36, 0,48,36,0,
        33,0,36,0, 38,0,41,0, 38,0,50,0, 38,0,0,0
      ],
      drums: 'K..KS.H.K.K.S.HHK..KS.H.K.H.S.SHK..KS.H.K.K.S.HHK.K.S.H.KKHKS.SH'
    },
    brain: {
      // 血脑屏障 · 神经矩阵脉冲 · 血脑禁区 · 冷峻 F# 小调电音矩阵
      bpm: 132,
      leadWave: 'sine',
      arpWave: 'sawtooth',
      bassWave: 'triangle',
      leadVol: 0.085, arpVol: 0.028, bassVol: 0.11, drumVol: 0.058,
      lead: [
        78,0,0,0, 81,0,0,0, 80,0,0,78, 76,0,0,0,
        78,0,0,0, 83,0,0,0, 81,0,0,80, 78,0,0,0,
        85,0,0,0, 83,0,81,0, 80,0,0,78, 76,0,0,0,
        78,0,80,0, 81,0,83,0, 85,0,0,0, 0,0,0,0
      ],
      arp: [
        54,61,66,61, 54,61,66,61, 52,59,64,59, 52,59,64,59,
        50,57,62,57, 50,57,62,57, 49,56,61,56, 49,56,61,56,
        54,61,66,61, 54,61,66,61, 52,59,64,59, 52,59,64,59,
        50,57,62,57, 52,59,64,59, 54,61,66,69, 66,61,54,0
      ],
      bass: [
        42,42,42,42, 42,42,42,42, 40,40,40,40, 40,40,40,40,
        38,38,38,38, 38,38,38,38, 37,37,37,37, 37,37,49,37,
        42,42,42,42, 42,42,42,42, 40,40,40,40, 40,40,40,40,
        38,38,38,38, 40,40,40,40, 42,0,42,0, 42,0,0,0
      ],
      drums: 'K..H..S.K.H...S.K..H..S.K.H.K.SHK..H..S.K.H...S.K..H..S.K.K.S.HH'
    },
    boss: {
      // MRSA 菌王 · 弗里吉亚决战 · 首领战 · 高压半音阶双踩 Boss 战歌
      bpm: 152,
      leadWave: 'sawtooth',
      arpWave: 'square',
      bassWave: 'triangle',
      leadVol: 0.06, arpVol: 0.036, bassVol: 0.125, drumVol: 0.075,
      lead: [
        76,0,76,77, 80,0,77,76, 74,0,76,74, 72,71,69,71,
        76,0,77,0, 80,0,83,0, 81,0,80,77, 76,0,0,0,
        76,0,80,0, 83,0,84,83, 81,0,80,0, 77,0,76,0,
        74,0,76,77, 80,0,83,0, 88,0,0,0, 0,0,0,0
      ],
      arp: [
        64,68,71,68, 65,69,72,69, 64,68,71,68, 62,65,69,65,
        64,68,71,68, 65,69,72,69, 64,68,71,68, 64,68,71,76,
        64,68,71,68, 64,68,71,68, 65,69,72,69, 65,69,72,69,
        62,65,69,65, 65,69,72,69, 64,68,71,76, 71,68,64,0
      ],
      bass: [
        40,40,40,41, 40,40,41,40, 38,38,40,38, 36,35,33,35,
        40,40,41,40, 44,40,47,40, 45,45,44,41, 40,40,52,40,
        40,40,40,40, 43,43,43,43, 41,41,41,41, 40,40,40,40,
        38,38,40,41, 44,44,47,47, 40,0,40,0, 40,0,52,0
      ],
      drums: 'KKHSKKHSKKHSKKSSKKHSKKHSKKHKS.SSKKHSKKHSKKHSKKSSKKHSKKHSKKKKS.SS'
    },
    endless: {
      // 无尽深渊 · 免疫超载纪元 · 无尽模式 · 赛博疾走 4-on-the-floor 合成波
      bpm: 142,
      leadWave: 'square',
      arpWave: 'sawtooth',
      bassWave: 'triangle',
      leadVol: 0.068, arpVol: 0.03, bassVol: 0.12, drumVol: 0.068,
      lead: [
        73,0,76,0, 80,0,78,0, 76,0,75,0, 73,0,71,0,
        69,0,73,0, 76,0,80,0, 78,0,76,75, 76,0,0,0,
        85,0,83,0, 80,0,78,0, 80,0,83,0, 85,0,0,0,
        81,0,80,0, 78,0,75,0, 73,0,0,0, 0,0,0,0
      ],
      arp: [
        61,64,68,73, 61,64,68,73, 59,63,66,71, 59,63,66,71,
        57,61,64,69, 57,61,64,69, 56,60,63,68, 56,60,63,68,
        61,64,68,73, 61,64,68,73, 59,63,66,71, 59,63,66,71,
        57,61,64,69, 56,60,63,68, 61,64,68,73, 68,64,61,0
      ],
      bass: [
        37,49,37,49, 37,49,37,49, 35,47,35,47, 35,47,35,47,
        33,45,33,45, 33,45,33,45, 32,44,32,44, 32,44,47,48,
        37,49,37,49, 37,49,37,49, 35,47,35,47, 35,47,35,47,
        33,45,33,45, 32,44,32,44, 37,49,37,49, 37,0,0,0
      ],
      drums: 'K.H.S.H.K.H.S.H.K.H.S.H.K.H.S.HHK.H.S.H.K.H.S.H.K.H.S.H.K.K.S.SS'
    }
  };

  function create(ctx, out, noise) {
    var filter=ctx.createBiquadFilter(), duck=ctx.createGain(), cutoff=18000;
    filter.type='lowpass';filter.frequency.value=cutoff;filter.Q.value=.7;
    filter.connect(duck);duck.connect(out);
    var track=null, layer=null, timer=null, step=0, next=0;
    var rate=1, targetRate=1, phase=0, epoch=0, enabled=true, hidden=false;

    function voice(source, at, duration, volume, attack, color) {
      var gain=ctx.createGain();
      if(attack){
        gain.gain.setValueAtTime(.0001,at);
        gain.gain.exponentialRampToValueAtTime(volume,at+attack);
      }else gain.gain.setValueAtTime(volume,at);
      gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
      if(color){source.connect(color);color.connect(gain);}else source.connect(gain);
      gain.connect(layer);
      source.addEventListener('ended',function(){
        source.disconnect();gain.disconnect();if(color)color.disconnect();
      });
      source.start(at);source.stop(at+duration+.005);
    }
    function tone(wave,midi,at,len,vol){
      if(!midi)return;
      var osc=ctx.createOscillator();osc.type=wave;
      osc.frequency.value=440*Math.pow(2,(midi-69)/12);
      voice(osc,at,len,vol,.008);
    }
    function drum(type,at,vol){
      if(type==='.')return;
      if(type==='K'){
        var kick=ctx.createOscillator();kick.type='sine';
        kick.frequency.setValueAtTime(145,at);kick.frequency.exponentialRampToValueAtTime(42,at+.085);
        voice(kick,at,.095,vol*1.9,0);
      }else{
        var src=ctx.createBufferSource(),color=ctx.createBiquadFilter();
        var wind=type==='W',snare=type==='S';
        src.buffer=noise;color.type=type==='H'?'highpass':'bandpass';
        color.frequency.value=wind?750:snare?1850:6400;
        if(wind)color.Q.value=1.4;
        voice(src,at,wind?.22:snare?.09:.032,vol*(wind?.9:snare?1.15:.52),wind?.07:0,color);
        if(snare){
          var body=ctx.createOscillator();body.type='triangle';body.frequency.value=200;
          voice(body,at,.045,vol*.65,.008);
        }
      }
    }
    function sound(i,at,duration){
      var score=TRACKS[track];
      tone(score.leadWave,score.lead[i],at,duration*1.6,score.leadVol);
      tone(score.arpWave,score.arp[i],at,duration*.72,score.arpVol);
      tone(score.bassWave,score.bass[i],at,duration*.92,score.bassVol);
      drum(score.drums.charAt(i),at,score.drumVol);
      // Later phases double notes from the new score in a quiet upper register.
      var arp=score.arp[i];
      if(track==='boss'&&phase>=3&&i%2&&arp)tone('square',arp+12,at,duration*.48,.013);
      if(track==='endless'&&epoch){
        if(i%4===1&&arp)tone('triangle',arp+12,at,duration*1.3,.028);
        if(epoch>=2&&i%4===2)drum('K',at,.035);
        if(epoch>=3&&i%4===3)drum('H',at,.035);
      }
    }
    function pump(){
      if(!layer||ctx.state!=='running')return;
      var now=ctx.currentTime,score=TRACKS[track];
      if(next<now-.02)next=now+.015;
      while(next<now+.12){
        rate+=(targetRate-rate)*.23;
        var duration=15/(score.bpm*rate);
        sound(step,next,duration);
        next+=duration;step=(step+1)%score.lead.length;
      }
    }
    function restart(){
      if(timer!==null){clearInterval(timer);timer=null;}
      if(layer){
        var old=layer;layer=null;
        if(hidden||!enabled)old.disconnect();
        else{
          old.gain.setTargetAtTime(.0001,ctx.currentTime,.025);
          setTimeout(function(){old.disconnect();},180);
        }
      }
      if(enabled&&!hidden&&track){
        layer=ctx.createGain();layer.gain.value=.0001;
        layer.gain.setTargetAtTime(1,ctx.currentTime,.035);layer.connect(filter);
        next=ctx.currentTime+.02;timer=setInterval(pump,40);pump();
      }
    }
    function scene(state,g){
      var field=g&&!g.settled;
      var boss=field&&g.boss&&!g.boss.dead&&!g.boss.elite;
      var id=!field||state==='home'?'home':boss?'boss':g.mode==='endless'?'endless':g.map;
      if(!TRACKS[id])id='skin';
      var hot=field&&(g.hot||g.map==='brain'&&g.barrier<40);
      targetRate=hot?1.12:1;
      var f=id==='home'?(state==='home'?18000:2500):state==='playing'?18000:620;
      if(f!==cutoff){cutoff=f;filter.frequency.setTargetAtTime(f,ctx.currentTime,.08);}
      phase=boss?g.boss.phase:0;epoch=field?g.epoch||0:0;
      if(id!==track){track=id;step=0;rate=1;restart();}
    }
    return {
      scene:scene,
      enable:function(on){if(enabled!==on){enabled=on;restart();}},
      background:function(on){if(hidden!==on){hidden=on;restart();}},
      warn:function(){
        var t=ctx.currentTime;duck.gain.cancelScheduledValues(t);
        duck.gain.setTargetAtTime(.4,t,.02);duck.gain.setTargetAtTime(1,t+1.2,.09);
      }
    };
  }
  window.ImmuneScore={create:create};
}());
