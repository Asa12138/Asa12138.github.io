# Bundled globe sources

- D3 Array 3.2.4: https://cdn.jsdelivr.net/npm/d3-array@3.2.4/dist/d3-array.min.js
- D3 Geo 3.1.1: https://cdn.jsdelivr.net/npm/d3-geo@3.1.1/dist/d3-geo.min.js
- D3 libraries use the ISC license; copies are included beside the scripts.
- API documentation: https://d3js.org/d3-geo/projection and https://d3js.org/d3-geo/path
- Natural Earth land, 1:110m: https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson
- Natural Earth terms: https://www.naturalearthdata.com/about/terms-of-use/ (public domain).
- Data retrieval date: 2026-10-12. The downloaded land file is stored unchanged at ../data/ne-110m-land.json. Ring orientation is normalised for D3 during rendering. No administrative boundaries are included.

SHA-256:

d3-array-3.2.4.min.js: 80aa70d0cd17dabddf6d056494ea17926a45a69da8b7850220aace331bad671d
d3-geo-3.1.1.min.js: 23e574f1e8d4716d622bce45356a379b66a277162b145f5f147e4c8daefb73d2
ne-110m-land.json: 9e0729ee253ca7d7a5c4ae9395fb1902264c5377c52e224d13dd85010e2835d9

## 国内地图飞镖（2026-10-13）

- 国内省级地图 GeoJSON：阿里云 DataV GeoAtlas https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json （本地存放 `../data/china-provinces.json`，原始文件保留）。界面为小游戏示意，行政区轮廓用于限定点选范围；随机目的地为候选城市，并非均匀抽取国土坐标。
- 省级行政中心坐标取上述数据的 `properties.center`；额外已有地点取相册配置。
- 高德 JS API 2.0 景点查询：https://lbs.amap.com/api/javascript-api-v2/guide/services/autocomplete
- 高德 URI 搜索：https://developer.amap.com/api/uri-api/guide/search/search
- 交通查询入口：百度关键词搜索、铁路12306 https://www.12306.cn/index/、携程航班 https://flights.ctrip.com/ 。不包含预制班次、票价或预约数据。

china-provinces.json SHA-256: 99adfeded5223848bbe37a0a12f8023e11ee12161c7800521c27db42fdeac275

## 飞镖目的地与网页音频（2026-10-13）

- 城市坐标来源：阿里云 DataV `https://datavmap-public.oss-cn-hangzhou.aliyuncs.com/areas/csv/100000_city.json`。读取 `rows` 的 name、parent、lng、lat、adcode；不使用历史人口字段。移除直辖市郊县重复项、莱芜旧地级市记录，简化市/地区后缀，补充已有省级中心中的台北、香港、澳门等缺项。保存为 `../data/china-destinations.json`。此列表是旅行目的地坐标缓存，不声称为最新行政区划名录。
- HTML 音频与用户启动播放：https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play
- 预加载：https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/preload
- 可选系统媒体按钮：https://developer.mozilla.org/en-US/docs/Web/API/MediaSession/setActionHandler
- 音频输入：用户提供的四首桌面文件；本次只做本地压缩、封装与网页接入，没有推送或部署。

china-destinations.json SHA-256: b20cd44fd748bad56c1115ddc0891abd9a73f6cafaf1c92f02117d51374e1060
