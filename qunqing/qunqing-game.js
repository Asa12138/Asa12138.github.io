window.createMemoryQuiz = ({albums,getAlbums,reward,thumbFor,openAlbum,beforeOpen,syncBodyLock,best,saveBest}) => {
  const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const access=window.TravelAccess,dialog=$('#quiz-dialog'),total=10;
  const pool=albums.filter(a=>a.places.length&&a.photos.length),locations=[...new Set(pool.map(a=>a.location))];
  let rounds=[],round=0,streak=0,answered=false,result=false,earned=false;
  function shuffle(items){const list=[...items];for(let i=list.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;}
  function updateBest(){$('#quiz-reset-best').hidden=best===null;$('#quiz-best').textContent=best===null?'十连对挑战，等你来开启':`你的最佳连胜 · ${best} / ${total}`;}
  function showRound(){
    result=false;answered=false;const current=rounds[round],a=current.album;
    $('#quiz-title').textContent='十连对，才算都记得。';$('#quiz-round').textContent=`第 ${round+1} / ${total} 题`;
    $('#quiz-streak').textContent=`连续答对 ${streak} / ${total} · 答错需重开`;$('#quiz-reward').hidden=true;
    $('#quiz-image').src=thumbFor(a.photos[current.photo].src);$('#quiz-image').alt='本轮旅行照片';
    $('#quiz-hint').hidden=true;$('#quiz-hint').textContent=`${a.year} 年 / ${a.category}`;
    $('#quiz-feedback').textContent='连续答对全部 10 题，获得 1 张幸运券。';$('#quiz-feedback').classList.remove('reward-earned');
    $('#quiz-next').disabled=true;$('#quiz-next').textContent=round===total-1?'完成挑战 ↗':'下一张 →';$('#quiz-open-album').hidden=true;$('#quiz-hint-button').hidden=false;
    const choices=shuffle([a.location,...shuffle(locations.filter(l=>l!==a.location)).slice(0,3)]);
    $('#quiz-options').innerHTML=choices.map((l,i)=>`<button data-answer="${esc(l)}"><small>${String.fromCharCode(65+i)}</small><span>${esc(l)}</span></button>`).join('');
  }
  function start(){
    beforeOpen();const active=pool.filter(a=>(getAlbums?.()||albums).includes(a)),used=new Set();
    const buckets=shuffle(active).map(album=>({album,photos:shuffle(album.photos.map((p,i)=>({p,i})).filter(v=>!v.p.src.endsWith('/qinggan.webp')))}));
    rounds=[];
    while(rounds.length<total&&buckets.some(b=>b.photos.length))for(const b of buckets){while(b.photos.length){const p=b.photos.pop();if(used.has(p.p.src))continue;used.add(p.p.src);rounds.push({album:b.album,photo:p.i});break;}if(rounds.length===total)break;}
    if(rounds.length<total){$('#quiz-best').textContent='至少需要 10 张有地点的照片才能开始挑战。';return;}
    round=0;streak=0;earned=false;showRound();if(!dialog.open)dialog.showModal();syncBodyLock();
  }
  function finish(success,explanation='',longest=streak){
    result=true;if(access.isMember()&&(best===null||longest>best)){best=longest;saveBest(best);}updateBest();
    $('#quiz-title').textContent=success?'十张照片，每一站都还记得。':'连胜断了，下次再来十连对。';
    $('#quiz-round').textContent=`${success?'完成挑战':'本轮结束'} · 连对 ${longest} / ${total} 题`;
    $('#quiz-streak').textContent=success?`✳ 连续答对 ${total} 题！`:`连胜归零 · 本轮最高 ${longest} 题`;
    if(success)earned=reward('照片竞猜 · 连续答对 10 题');
    $('#quiz-feedback').textContent=success?(earned?'✳ 获得 1 张幸运券！已放进口袋，去美食转盘选一顿快乐。':'十连对成功！游客试玩不发券，请登录后重新挑战。'):`${explanation} 答错即结束本轮，重新挑战才能获得幸运券。`;
    $('#quiz-feedback').classList.toggle('reward-earned',earned);$('#quiz-reward').hidden=!earned;
    $('#quiz-next').textContent='↺ 重新挑战';$('#quiz-next').disabled=false;$('#quiz-hint-button').hidden=true;$('#quiz-open-album').hidden=false;
  }
  $('#quiz-start').disabled=locations.length<2;$('#quiz-start').addEventListener('click',start);
  $('#quiz-reset-best').addEventListener('click',()=>{if(!access.requireMember())return;best=null;saveBest(null);updateBest();});
  $('#quiz-options').addEventListener('click',e=>{
    const b=e.target.closest('[data-answer]');if(!b||answered||result)return;answered=true;
    const a=rounds[round].album,correct=b.dataset.answer===a.location;
    document.querySelectorAll('#quiz-options button').forEach(v=>{v.disabled=true;v.classList.toggle('correct',v.dataset.answer===a.location);v.classList.toggle('incorrect',v===b&&!correct);});
    if(!correct){const longest=streak;streak=0;finish(false,`这一帧来自 ${a.location}。${a.name} · ${a.date}。`,longest);return;}
    streak++;$('#quiz-streak').textContent=`连续答对 ${streak} / ${total} · 再答对 ${total-streak} 题即可得券`;
    if(streak===total){finish(true);return;}
    $('#quiz-feedback').textContent=`答对了！${a.name} · ${a.date}`;$('#quiz-next').disabled=false;$('#quiz-hint-button').hidden=true;
  });
  $('#quiz-hint-button').addEventListener('click',()=>{$('#quiz-hint').hidden=false;$('#quiz-hint-button').hidden=true;});
  $('#quiz-next').addEventListener('click',()=>{if(result)start();else if(answered){round++;showRound();}});
  $('#quiz-open-album').addEventListener('click',()=>{const current=rounds[round];if(!current)return;dialog.close();openAlbum(current.album,current.photo);});
  $('#quiz-close').addEventListener('click',()=>{dialog.close();syncBodyLock();});
  updateBest();return {start,setBest:value=>{best=value;streak=0;earned=false;rounds=[];round=0;dialog.close();updateBest();syncBodyLock();}};
};
