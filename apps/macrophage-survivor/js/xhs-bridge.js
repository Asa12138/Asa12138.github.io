(function () {
  'use strict';
  // Browser host for GitHub Pages. Progress stays in this origin under one prefix.
  var PREFIX = 'macrophage-survivor.v1.';
  var memory = Object.create(null);
  var writes = Object.create(null);
  var dirty = Object.create(null);
  var failed = Object.create(null);
  var confirmed = false;
  var usable = false;
  try {
    var probe = PREFIX + 'probe';
    window.localStorage.setItem(probe, '1');
    usable = window.localStorage.getItem(probe) === '1';
    window.localStorage.removeItem(probe);
  } catch (err) { usable = false; }

  function namespaced(key) { return PREFIX + key; }
  function status() {
    if (!usable) return '这台浏览器不保存进度，本次游玩结束即清空';
    if (Object.keys(failed).length) return '保存未完成 · 本次进度暂存在页面里';
    if (Object.keys(dirty).length) return '正在保存进度…';
    return confirmed ? '进度已保存在这台浏览器' : '本机存档可用';
  }
  function showStatus() {
    ['storage-note', 'result-storage'].forEach(function (id) {
      var node = document.getElementById(id);
      if (node) node.textContent = status();
    });
  }
  function readLocal(key) {
    try {
      var raw = window.localStorage.getItem(namespaced(key));
      return raw == null ? null : JSON.parse(raw);
    } catch (err) { return null; }
  }
  function get(key) {
    return Promise.resolve().then(function () {
      if (key in memory) return memory[key];
      if (!usable) { showStatus(); return null; }
      var value = readLocal(key);
      if (value != null) memory[key] = value;
      showStatus();
      return value;
    });
  }
  function retryWrites() {
    return Promise.all(Object.keys(failed).map(function (key) {
      return writes[key] || set(key, memory[key]);
    }));
  }
  function set(key, value) {
    var data;
    try { data = JSON.stringify(value); } catch (err) { return Promise.resolve(false); }
    if (typeof data !== 'string') return Promise.resolve(false);
    memory[key] = value;
    if (writes[key] && dirty[key] === data) return writes[key];
    dirty[key] = data;
    var pending = (writes[key] || Promise.resolve()).then(function () {
      if (!usable) return false;
      window.localStorage.setItem(namespaced(key), data);
      return readLocal(key) != null || data === 'null';
    }).catch(function () { return false; }).then(function (ok) {
      if (writes[key] === pending) {
        delete writes[key];
        if (ok) { confirmed = true; delete dirty[key]; delete failed[key]; }
        else if (usable) failed[key] = true;
        showStatus();
      }
      return ok;
    });
    writes[key] = pending;
    showStatus();
    return pending;
  }
  function downloadImage(url) {
    if (typeof url !== 'string' || url.indexOf('data:image/') !== 0) throw new Error('无可用战报');
    var link = document.createElement('a');
    link.href = url;
    link.download = '免疫防线战报.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  function exportReport(url) {
    return Promise.resolve().then(function () {
      downloadImage(url);
      return '战报图片已下载。';
    }).catch(function () { return '暂时无法下载战报，可截屏保留。'; });
  }
  function fileFromReport(url) {
    return fetch(url).then(function (response) { return response.blob(); }).then(function (blob) {
      return new File([blob], '免疫防线战报.png', { type: blob.type || 'image/png' });
    });
  }
  function postReport(url, draft) {
    var text = draft && draft.content ? draft.content : '本局免疫战报';
    var title = draft && draft.title ? draft.title : '巨噬幸存者：免疫防线';
    if (navigator.share) {
      return fileFromReport(url).then(function (file) {
        var payload = { title: title, text: text };
        if (!navigator.canShare || navigator.canShare({ files: [file] })) payload.files = [file];
        return navigator.share(payload);
      }).then(function () { return '已打开系统分享。'; }, function () {
        try { downloadImage(url); } catch (err) { return '暂时无法分享战报，可截屏保留。'; }
        return '战报图片已下载，可自行发布。';
      });
    }
    return exportReport(url).then(function (message) {
      return message === '战报图片已下载。' ? '战报图片已下载，可自行发布。' : message;
    });
  }
  function shareGame() {
    var url = location.href.split('#')[0];
    if (navigator.share) {
      return navigator.share({ title: '巨噬幸存者：免疫防线', text: '来显微战场巡逻一轮。', url: url }).then(function () { return ''; }, function () { return ''; });
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(url).then(function () { return '游戏链接已复制。'; }, function () { return '游戏地址：' + url; });
    }
    return Promise.resolve('游戏地址：' + url);
  }
  window.XhsBridge = {
    ready: Promise.resolve(0),
    storage: { get: get, set: set, retry: retryWrites, status: status, available: function () { return usable; } },
    layout: function () { return Promise.resolve(null); },
    ranks: {
      available: function () { return false; },
      read: function () { return Promise.reject({ errCode: 1005 }); },
      submit: function () { return Promise.reject({ errCode: 1005 }); }
    },
    canShareGame: function () { return true; },
    shareGame: shareGame,
    vibrate: function () {
      if (navigator.vibrate) { try { navigator.vibrate(12); } catch (err) {} }
    },
    toFilePath: function (url) { return Promise.resolve(url); },
    exportReport: exportReport,
    postReport: postReport
  };
}());
