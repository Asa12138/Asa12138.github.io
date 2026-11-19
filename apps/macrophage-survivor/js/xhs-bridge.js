(function () {
  'use strict';
  var memory = Object.create(null);
  function webHost(){
    var host={
      available:function(){return false;},
      read:function(){return null;},
      write:function(){return false;},
      saveImage:function(){throw new Error('无可用战报');},
      shareImage:function(){return Promise.resolve('当前环境无法打开发笔记页，可截屏保留战报。');},
      shareLink:function(){return Promise.resolve('');},
      vibrate:function(){},
      label:function(){return '发表笔记';},
      canShare:function(){return false;}
    };
    /*<web-host>*/
    host=(function(){
      var PREFIX='macrophage-survivor.v1.';
      var usable=null;
      function available(){
        if(window.xhs)return false;
        if(usable!=null)return usable;
        usable=false;
        try{
          var probe=PREFIX+'probe',store=window.localStorage;
          store.setItem(probe,'1');
          usable=store.getItem(probe)==='1';
          store.removeItem(probe);
        }catch(err){usable=false;}
        return usable;
      }
      function read(key){
        try{
          var raw=window.localStorage.getItem(PREFIX+key);
          return raw==null?null:JSON.parse(raw);
        }catch(err){return null;}
      }
      function write(key,data){
        try{
          window.localStorage.setItem(PREFIX+key,data);
          var raw=window.localStorage.getItem(PREFIX+key);
          return raw!=null||data==='null';
        }catch(err){return false;}
      }
      function saveImage(url){
        if(typeof url!=='string'||url.indexOf('data:image/')!==0)throw new Error('无可用战报');
        var link=document.createElement('a');
        link.href=url;
        link.download='免疫防线战报.png';
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      function fileFromReport(url){
        var comma=url.indexOf(',');
        if(comma<0)throw new Error('无可用战报');
        var header=url.slice(0,comma),payload=url.slice(comma+1),mime=/^data:([^;,]+)/.exec(header);
        var binary=atob(payload),bytes=new Uint8Array(binary.length),i;
        for(i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i)&255;
        return new File([bytes],'免疫防线战报.png',{type:mime?mime[1]:'image/png'});
      }
      function shareImage(url,draft){
        var text=draft&&draft.content?draft.content:'本局免疫战报';
        var title=draft&&draft.title?draft.title:'巨噬幸存者：免疫防线';
        var nav=window.navigator;
        if(nav&&nav.share){
          return Promise.resolve().then(function(){
            var file=fileFromReport(url),payload={title:title,text:text};
            if(!nav.canShare||nav.canShare({files:[file]}))payload.files=[file];
            return nav.share(payload);
          }).then(function(){return '已打开系统分享。';},function(){
            try{saveImage(url);}catch(err){return '暂时无法分享战报，可截屏保留。';}
            return '战报图片已下载，可自行发布。';
          });
        }
        try{saveImage(url);return Promise.resolve('战报图片已下载，可自行发布。');}
        catch(err){return Promise.resolve('暂时无法下载战报，可截屏保留。');}
      }
      function shareLink(){
        var url=location.href.split('#')[0],nav=window.navigator;
        if(nav&&nav.share){
          return nav.share({title:'巨噬幸存者：免疫防线',text:'来显微战场巡逻一轮。',url:url}).then(function(){return '';},function(){return '';});
        }
        if(nav&&nav.clipboard&&nav.clipboard.writeText){
          return nav.clipboard.writeText(url).then(function(){return '游戏链接已复制。';},function(){return '游戏地址：'+url;});
        }
        return Promise.resolve('游戏地址：'+url);
      }
      function vibrate(){
        var nav=window.navigator;
        if(nav&&nav.vibrate){try{nav.vibrate(12);}catch(err){}}
      }
      return {available:available,read:read,write:write,saveImage:saveImage,shareImage:shareImage,shareLink:shareLink,vibrate:vibrate,label:function(){return '分享战报';},canShare:function(){return true;}};
    })();
    /*</web-host>*/
    return host;
  }
  var host=webHost();
  function invoke(name, options, timeout, lateSuccess) {
    return new Promise(function (resolve, reject) {
      var timer,expired=false;
      function done(value) {
        clearTimeout(timer);
        if(expired && lateSuccess){expired=false;lateSuccess(value);}
        resolve(value);
      }
      function fail(err) { clearTimeout(timer); reject(err); }
      try {
        var tool = window.xhs && window.xhs.miniTool;
        if (!tool || typeof tool[name] !== 'function') { fail(new Error(name)); return; }
        timer = setTimeout(function () { expired=true;fail(new Error('接口未响应')); }, timeout || 1800);
        options.success = done;
        options.fail = fail;
        var result = tool[name](options);
        if (result && typeof result.then === 'function') result.then(done, fail);
      } catch (err) { fail(err); }
    });
  }
  function clientVersion(options) {
    return Math.floor(Number(options && options.miniToolEnv && options.miniToolEnv.buildVersion) / 1000) || 0;
  }
  var version = 0;
  var ready = Promise.resolve().then(function () {
    var direct = clientVersion(window.xhs && window.xhs.launchOptions);
    return direct || invoke('getLaunchOptions', {}).then(clientVersion);
  }).catch(function () { return 0; }).then(function (v) { version=v;return v; });
  function supported(name,min) {
    var api=window.xhs && window.xhs.miniTool;
    return version>=min && api && typeof api[name]==='function';
  }
  var writes=Object.create(null), dirty=Object.create(null), failed=Object.create(null);
  var retryTimer=0,retries=0,confirmed=false;
  function nativeStorage(){return supported('getStorage',9460)&&supported('setStorage',9460);}
  function status(){
    if(!nativeStorage()){
      if(version&&version<9460)return '请升级小红书以保存进度';
      if(window.xhs)return '当前环境仅保留本次进度';
      if(!host.available())return '这台浏览器不保存进度，本次游玩结束即清空';
      if(Object.keys(failed).length)return '保存未完成 · 本次进度暂存在页面里';
      if(Object.keys(dirty).length)return '正在保存进度…';
      return confirmed?'进度已保存在这台浏览器':'本机存档可用';
    }
    if(Object.keys(failed).length)return '保存未完成 · 本次进度暂存';
    if(Object.keys(dirty).length)return '正在保存进度…';
    return confirmed?'进度已保存到本机':'本机存档可用';
  }
  function showStatus(){
    ['storage-note','result-storage'].forEach(function(id){var node=document.getElementById(id);if(node)node.textContent=status();});
  }
  function readNative(key){
    return invoke('getStorage',{key:key}).then(function(r){
      if(!r||!('data' in r)||(r.errMsg&&r.errMsg!=='getStorage:ok'))throw new Error('读取未确认');
      return r.data==null?null:JSON.parse(r.data);
    });
  }
  function writeNative(key,data){
    return invoke('setStorage',{key:key,data:data},5000,function(){
      // An older call can complete after the WebView timed out and saved a newer revision.
      if(key in memory && JSON.stringify(memory[key])!==data){
        (writes[key]||Promise.resolve()).then(function(){return readNative(key);}).then(function(value){
          if(!writes[key] && JSON.stringify(value)!==JSON.stringify(memory[key]))set(key,memory[key]);
        },function(){if(!writes[key]){failed[key]=true;showStatus();scheduleRetry();}});
      }
    }).then(function(r){
      if(r===false||(r&&r.errMsg&&r.errMsg!=='setStorage:ok'))throw new Error('写入未确认');
    });
  }
  var migration;
  function migrateLegacyOnce(){
    if(migration)return migration;
    migration=(async function(){
      if(!supported('setStorage',9460)||!supported('getStorage',9460))return;
      var marker='immune.migrated03';
      var flag=await readNative(marker);
      if(flag!=null)return;
      var account=await readNative('immune.profile2');
      var bank=await readNative('immune.atp');
      var keys=['immune.best','immune.muted'];
      if(account==null&&bank==null){
        keys=keys.concat(['immune.profile2','immune.atp','immune.unlocks','immune.atlas','immune.selectedHero','immune.selectedMap','immune.survival','immune.lastDeathBy']);
      }
      for(var i=0;i<keys.length;i++){
        var key=keys[i],old=null;
        try{old=window.localStorage.getItem(key);if(old!=null)JSON.parse(old);}catch(err){continue;}
        if(old!=null&&await readNative(key)==null)await writeNative(key,old);
      }
      await writeNative(marker,'true');
    }()).catch(function(err){migration=null;throw err;});
    return migration;
  }
  function get(key) {
    return ready.then(function(){
      if(key in memory)return memory[key];
      if(supported('getStorage',9460))return migrateLegacyOnce().then(function(){return readNative(key);});
      if(window.xhs||!host.available()){showStatus();return null;}
      var value=host.read(key);
      if(value!=null)memory[key]=value;
      showStatus();
      return value;
    });
  }
  function scheduleRetry(){
    if(retryTimer||retries>=3||document.hidden)return;
    retries++;
    retryTimer=setTimeout(function(){retryTimer=0;retryWrites();},retries*900);
  }
  function retryWrites(){
    return Promise.all(Object.keys(failed).map(function(key){return writes[key]||set(key,memory[key]);}));
  }
  function set(key,value) {
    var data;
    try{data=JSON.stringify(value);}catch(err){return Promise.resolve(false);}
    if(typeof data!=='string')return Promise.resolve(false);
    memory[key]=value;
    if(writes[key]&&dirty[key]===data)return writes[key];
    dirty[key]=data;
    var pending=(writes[key]||ready).then(function(){
      if(!nativeStorage()){
        if(window.xhs||!host.available())return false;
        return host.write(key,data);
      }
      if(failed[key]){
        // The host may have saved the previous write and lost its acknowledgement.
        return readNative(key).then(function(current){
          return JSON.stringify(current)===data?true:writeNative(key,data).then(function(){return true;});
        });
      }
      return writeNative(key,data).then(function(){return true;});
    }).catch(function(){return false;}).then(function(ok){
      if(writes[key]===pending){
        delete writes[key];
        if(ok){confirmed=true;delete dirty[key];delete failed[key];if(!Object.keys(failed).length)retries=0;}
        else if(nativeStorage()||(!window.xhs&&host.available())){failed[key]=true;scheduleRetry();}
        showStatus();
      }
      return ok;
    });
    writes[key]=pending;showStatus();return pending;
  }
  function layout() {
    return ready.then(function(){return supported('getWindowInfo',9490)?invoke('getWindowInfo',{}):null;}).catch(function(){return null;});
  }
  function nativeMethod(name) {
    var api=window.xhs && window.xhs.miniTool;
    return !!(api && typeof api[name]==='function');
  }
  var rankDenied=false,rankCache=Object.create(null);
  function rankAvailable(){
    return !rankDenied&&supported('submitScore',9510)&&nativeMethod('getRankList')&&nativeMethod('getMyRank');
  }
  function rankRequest(method,options,attempt){
    if(!rankAvailable())return Promise.reject({errCode:1005});
    return invoke(method,options,5000).catch(function(err){
      var code=err&&err.errCode;
      if(code===1005||code===10003)rankDenied=true;
      if(method!=='submitScore'&&code===2002&&attempt<2){
        return new Promise(function(resolve){setTimeout(resolve,500*Math.pow(2,attempt));})
          .then(function(){return rankRequest(method,options,attempt+1);});
      }
      throw err;
    });
  }
  function readRanks(board,period){
    var key=board+'/'+period,entry=rankCache[key];
    if(!rankAvailable())return Promise.reject({errCode:1005});
    if(entry&&Date.now()<entry.expires)return entry.promise;
    entry={expires:Infinity};rankCache[key]=entry;
    entry.promise=Promise.all([
      rankRequest('getRankList',{board:board,period:period},0),
      rankRequest('getMyRank',{board:board,period:period},0)
    ]).then(function(results){
      var list=results[0],mine=results[1];
      if(!list||!Array.isArray(list.data)||!mine||
        ['EXACT','OVER_LIMIT','NO_SCORE','NOT_PARTICIPATING'].indexOf(mine.status)<0){
        throw new Error('榜单数据不完整');
      }
      entry.expires=Date.now()+30000;
      return {rows:list.data,mine:mine};
    }).catch(function(err){
      if(rankCache[key]===entry)delete rankCache[key];
      throw err;
    });
    return entry.promise;
  }
  async function submitRank(board,score){
    try{
      var response=await rankRequest('submitScore',{board:board,score:score},0);
      if(response&&Number.isFinite(response.score)&&response.score>=score)return 'confirmed';
    }catch(err){
      if(err&&Number.isInteger(err.errCode)&&err.errCode!==2004)throw err;
    }finally{
      ['all','month','week','day'].forEach(function(period){delete rankCache[board+'/'+period];});
    }
    // A lost acknowledgement is resolved through a read for today's board.
    try{
      var mine=await rankRequest('getMyRank',{board:board,period:'day'},0);
      if(mine&&mine.status==='EXACT'&&Number.isFinite(mine.score)&&mine.score>=score)return 'confirmed';
    }catch(err){}
    return 'unknown';
  }
  function canShareGame(){return !!supported('share',9530)||(!window.xhs&&host.canShare());}
  function shareGame(){
    if(supported('share',9530))return invoke('share',{type:'card'},120000).then(function(){return '';},function(err){
      if(err&&err.errCode===15503)return '已达今日分享次数上限。';
      if(err&&err.errCode===15502)return '请在小红书 App 全屏打开游戏后分享。';
      return '暂时无法打开分享面板，请稍后再试。';
    });
    if(window.xhs)return Promise.resolve('请在小红书 9.53 及以上版本打开后分享。');
    return host.shareLink();
  }
  function reportActionLabel(){return nativeMethod('postNote')?'发表笔记':host.label();}
  function toFilePath(url) {
    if(typeof url!=='string'||!/^data:image\/(?:png|jpeg|webp);base64,/.test(url)){
      return Promise.reject(new Error('无可用战报'));
    }
    if(!nativeMethod('writeTempFile'))return Promise.resolve(url);
    return invoke('writeTempFile',{data:url},12000).then(function(result){
      return result && result.filePath || url;
    },function(){return url;});
  }
  function exportReport(url){
    return ready.then(function(){
      if(!supported('saveImageToPhotosAlbum',9420)){
        if(window.xhs||!host.available())return '当前环境无法保存到相册，可截屏保留战报。';
        try{host.saveImage(url);return '战报图片已下载。';}
        catch(err){return '暂时无法下载战报，可截屏保留。';}
      }
      return toFilePath(url).then(function(path){return invoke('saveImageToPhotosAlbum',{filePath:path},60000);})
        .then(function(){return '已保存至相册';});
    }).catch(function(){return '保存未完成，可检查相册权限后重试，或截屏保留战报。';});
  }
  function postReport(url,draft){
    if(!nativeMethod('postNote')){
      if(window.xhs||!host.available())return Promise.resolve('当前环境无法打开发笔记页，可截屏保留战报。');
      return host.shareImage(url,draft);
    }
    return toFilePath(url).then(function(path){
      var options={title:draft.title,content:draft.content,mediaInfo:{image_resources:[{url:path}]}};
      if(supported('postNote',9430))options.pageType='photo_publish';
      return invoke('postNote',options,300000);
    }).then(function(){return '已提交笔记，可在小红书查看发布进度。';}).catch(function(){return '发笔记流程已结束，可保存战报后再试。';});
  }
  window.XhsBridge={ready:ready,storage:{get:get,set:set,retry:retryWrites,status:status,available:function(){return nativeStorage()||(!window.xhs&&host.available());}},layout:layout,
    ranks:{available:rankAvailable,read:readRanks,submit:submitRank},canShareGame:canShareGame,shareGame:shareGame,
    vibrate:function(type){
      if(supported('vibrateShort',9500)){invoke('vibrateShort',{type:type==='heavy'?'heavy':'light'}).catch(function(){});return;}
      if(!window.xhs)host.vibrate();
    },
    toFilePath:toFilePath,exportReport:exportReport,postReport:postReport,reportActionLabel:reportActionLabel
  };
  if(typeof document!=='undefined'&&document.getElementById){
    var shareNode=document.getElementById('share-report');
    if(shareNode)shareNode.textContent=reportActionLabel();
  }
}());
