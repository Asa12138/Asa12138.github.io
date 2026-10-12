window.createMemoryQuiz = ({albums, thumbFor, openAlbum, beforeOpen, syncBodyLock, best, saveBest}) => {
  const $=s=>document.querySelector(s), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dialog=$('#quiz-dialog'), pool=albums.filter(a=>a.places.length&&a.photos.length), locations=[...new Set(pool.map(a=>a.location))];
  let rounds=[], round=0, score=0, answered=false, result=false;
  function shuffle(items){const list=[...items];for(let i=list.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;}
  function updateBest(){ $('#quiz-reset-best').hidden=best===null;$('#quiz-best').textContent=best===null?'还没挑战过这份回忆':`你的最佳记忆 · ${best} / 5`; }
  function showRound(){
    result=false;answered=false;const a=rounds[round].album;
    $('#quiz-title').textContent='猜猜，这是哪里？';$('#quiz-round').textContent=`${round+1} / ${rounds.length} · 已答对 ${score} 张`;
    $('#quiz-image').src=thumbFor(a.photos[rounds[round].photo].src);$('#quiz-image').alt='本轮旅行照片';
    $('#quiz-hint').hidden=true;$('#quiz-hint').textContent=`${a.year} 年 / ${a.category}`;
    $('#quiz-feedback').textContent='有些风景，看一眼就能想起。';$('#quiz-next').disabled=true;$('#quiz-next').textContent=round===rounds.length-1?'揭晓成绩 ↗':'下一张 →';
    $('#quiz-open-album').hidden=true;$('#quiz-hint-button').hidden=false;
    const choices=shuffle([a.location,...shuffle(locations.filter(l=>l!==a.location)).slice(0,3)]);
    $('#quiz-options').innerHTML=choices.map((l,i)=>`<button data-answer="${esc(l)}"><small>${String.fromCharCode(65+i)}</small><span>${esc(l)}</span></button>`).join('');
  }
  function start(){
    beforeOpen();rounds=shuffle(pool).slice(0,5).map(album=>{const photos=album.photos.map((p,i)=>({p,i})).filter(v=>!v.p.src.endsWith('/qinggan.webp'));return {album,photo:photos[Math.floor(Math.random()*photos.length)]?.i||0};});
    round=0;score=0;showRound();if(!dialog.open)dialog.showModal();syncBodyLock();
  }
  function finish(){
    result=true;if(best===null||score>best){best=score;saveBest(best);}updateBest();
    $('#quiz-title').textContent=score===5?'每一站，都还记得。':score>=3?'那些日子，还在心里。':'让照片帮你再想起来。';
    $('#quiz-round').textContent=`本次答对 ${score} / ${rounds.length}`;
    $('#quiz-feedback').textContent=`记忆成绩 ${score} / ${rounds.length} · 最佳 ${best} / 5。再玩一轮，会抽到新的照片。`;
    $('#quiz-options').innerHTML='';$('#quiz-next').textContent='↺ 再玩一次';$('#quiz-next').disabled=false;$('#quiz-hint-button').hidden=true;$('#quiz-open-album').hidden=false;
  }
  $('#quiz-start').disabled=locations.length<2;
  $('#quiz-start').addEventListener('click',start);
  $('#quiz-reset-best').addEventListener('click',()=>{best=null;saveBest(null);updateBest();});
  $('#quiz-options').addEventListener('click',e=>{
    const b=e.target.closest('[data-answer]');if(!b||answered)return;answered=true;
    const a=rounds[round].album,correct=b.dataset.answer===a.location;if(correct)score++;
    document.querySelectorAll('#quiz-options button').forEach(v=>{v.disabled=true;v.classList.toggle('correct',v.dataset.answer===a.location);v.classList.toggle('incorrect',v===b&&!correct);});
    $('#quiz-feedback').textContent=`${correct?'答对了！':'这一帧来自 '+a.location+'。'} ${a.name} · ${a.date}`;
    $('#quiz-next').disabled=false;$('#quiz-open-album').hidden=false;$('#quiz-hint-button').hidden=true;
  });
  $('#quiz-hint-button').addEventListener('click',()=>{$('#quiz-hint').hidden=false;$('#quiz-hint-button').hidden=true;});
  $('#quiz-next').addEventListener('click',()=>{if(result)start();else if(answered){if(round+1===rounds.length)finish();else{round++;showRound();}}});
  $('#quiz-open-album').addEventListener('click',()=>{const current=rounds[round];dialog.close();openAlbum(current.album,current.photo);});
  $('#quiz-close').addEventListener('click',()=>{dialog.close();syncBodyLock();});
  updateBest();return {start};
};
