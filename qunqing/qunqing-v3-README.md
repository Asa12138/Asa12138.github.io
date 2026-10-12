# 群青旅行地图册：独立相册管理

正式入口文件：`qunqing/index.html`。在 GitHub Pages 发布仓库提交并推送这些文件后，访问：

https://asa12138.github.io/qunqing/

本次只修改本地文件，未推送或部署。版本文件 `qunqing-v3.html` 仍可打开，v2 与根目录原始 `qunqing.html` 保留。

## 内容只维护一份

相册照片、文案和配置的维护位置是：

```
Asa12138.github.io/
├── qunqing/
│   ├── index.html               # 目录访问入口（构建时生成）
│   ├── qunqing-v3.html          # 页面模板
│   ├── qunqing-v3.css           # 群青蓝主题，沿用 v2 的 #1c4ed8
│   ├── qunqing-v3.js            # 地图与交互
│   ├── qunqing-globe.js         # 可旋转地球，按地点打开相册
│   ├── vendor/                 # 本地 D3 库与许可证
│   ├── data/                   # 本地 Natural Earth 地形
│   ├── qunqing-replay.js        # 飞机 / 火车旅程回放
│   ├── qunqing-game.js          # 照片竞猜
│   ├── qunqing-v3-config.js     # 高德配置
│   ├── qunqing-v3-data.js       # 自动生成，通常不手动改
│   ├── manage.py               # 独立相册构建 / 新增旅程
│   └── 更新相册.command        # 双击构建
└── images/
    ├── 2508qinggan/
    │   ├── trip.json           # 日期、标题、地点、照片顺序
    │   ├── story.md            # 从旧版保存的完整旅行文案
    │   ├── 1.webp
    │   └── ...
    ├── 2409japan/
    │   ├── trip-osaka.json     # 两本相册共用一个照片目录
    │   ├── story-osaka.md
    │   ├── trip-kyoto.json
    │   ├── story-kyoto.md
    │   └── ...
    └── atlas-thumbs/           # 自动生成的预览图，不是第二套原照片
```

已导入 30 本相册 / 374 张照片。旧版的每段文案保存在对应照片目录，照片顺序与章节信息也保留。旧版没有文案的相册，其 `story.md` 留空。

- 新版地图票根有「读这段旅行手记」，照片查看器也有 ✎ 按钮。
- 手记以阅读页展示，可下载 Markdown，并返回照片。
- `story.md` 支持段落、换行、`# 标题`、`- 列表`、`**加粗**`、`*斜体*`、行内代码。任意 HTML 按文本处理。
- 照片仍放在原来的 `images/`，页面相对路径已调整为 `../images/`，没有再复制一套原照片。
- `Asa_web/qunqing.qmd` 与它的旧照片保留为历史，此后不用继续编辑或复制回去。

## 新增旅程：不改网页代码

只放照片不能可靠知道标题、日期和地点。因此每段旅程需要一个 `trip.json`；游记 `story.md` 可以留空或不建立。

### 方法一：文件夹操作

1. 在发布仓库 `images/` 下新建目录，例如 `2610your-trip`，放入照片。
2. 把 `qunqing/trip-template.json` 复制进去并改名为 `trip.json`，填写真实标题和日期。
3. 想写游记就新建 `story.md`；不写可以留空或省略。
4. 双击 `qunqing/更新相册.command`。
5. 本地看满意后，按原流程提交并推送发布仓库。

最小配置（以下都是占位符，请换成真实内容）：

```json
{
  "title": "旅程标题",
  "date": "YYYY-MM-DD",
  "location": "城市或景区",
  "category": "旅程",
  "story": "story.md",
  "places": []
}
```

不填写 `photos` 时，构建脚本按文件名自然排序自动扫描这个目录的 `.webp/.jpg/.jpeg/.png/.gif/.avif`。例如 `1.jpg, 2.jpg, 10.jpg`。默认第一张是封面，可用 `"cover": "3.jpg"` 指定其他封面。

旧相册为了保留原顺序，在 `photos` 中列出了照片。给旧相册追加照片时，追加相应文件名；想改用自动扫描就去掉 `photos` 字段。日本的两本相册必须保留各自列表，避免把同目录的照片混在一起。

### 方法二：终端建立目录与配置

在发布仓库运行下面的命令，把参数替换为真实信息（`YYYY-MM-DD` 必须换成真实出发日期）：

```sh
python3 qunqing/manage.py new 2610your-trip \
  --title "旅程标题" --date "YYYY-MM-DD" --location "城市名"
```

然后放照片、写 `story.md`，再运行：

```sh
python3 qunqing/manage.py build
```

空相册会跳过；放入照片后重新构建即可。已有旅程配置不会被 `new` 覆盖。

### 让新地点出现在地图上

手工复制模板时，给 `places` 填上实际地点与高德坐标，顺序是 **[经度, 纬度]**：

```json
"places": [
  {
    "id": "你的地点英文标识",
    "name": "真实城市或景区名",
    "coords": [经度数字, 纬度数字],
    "scope": "china"
  }
]
```

上面是结构说明，中文占位符需换成实际数值后才是有效 JSON。可以复制一个已有相册的 `places` 来复用同一城市。相同地点用相同 `id`，地图自动合并，不会重复放图钉。国内 `scope` 为 `china`；海外用 `overseas`；世界地球展示所有已配置的地点。可填写 `country`，例如 `马来西亚`，便于将同国图钉合成照片合集。

使用 `new --location` 且地点名称与已有城市完全相同时，脚本会复用已有位置；未知地点不会自动猜坐标，也不会自动请求地理编码。可以另外用 `--longitude 实际经度 --latitude 实际纬度` 添加新点。没有坐标的相册仍能浏览与搜索，只是暂不出现在地图 / 地点护照中。

JSON 中还可选填 `summary`（票根摘要）、`draft: true`（暂不显示）。每个目录能包含多个 `trip-*.json`，用不同 `id/key` 和各自的 `story`、`photos` 区分。

## Quarto 主站怎么继续更新

`Asa_web/_quarto.yml` 已把相册导航改为 `/qunqing/`，并从主站渲染排除旧 `qunqing.qmd`。这是 Quarto 官方支持的 [render 排除规则](https://quarto.org/docs/projects/quarto-projects.html#render-targets)。

已准备 `Asa_web/update_site.R`。把原来的更新函数换成：

```r
source("~/Documents/GitHub/Asa_web/update_site.R")
update_asa_web()
```

它会先构建独立相册，再渲染主站，然后用 rsync 同步主站。构建脚本自动生成排除清单，保护 `qunqing/`、原始相册、各旅程照片 / 文案和缩略图，避免它们被旧 Quarto 副本覆盖。仍保留主站所需的头像等非相册图片同步。

不需要把新相册目录放回 `Asa_web`。已有历史 QMD 和照片没有删除。`_site` 是构建产物，新函数会保留它，也不会运行 `rm -rf` 或 `rsync --delete`。函数仅更新本地，不自动执行 Git 提交 / 推送。

如果只改相册，双击「更新相册.command」即可，不必运行 Quarto。修改页面模板 `qunqing-v3.html` 后也运行构建，它会同步目录入口 `index.html`。

## 本地预览

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory /Users/asa/Documents/GitHub/Asa12138.github.io
```

打开 `http://127.0.0.1:8765/qunqing/`。

图片、JS、CSS 与目录入口都使用站点内路径。高德图钉是城市 / 景区概略位置，不是照片 GPS；青甘连线是行程示意；世界地球按坐标投影，照片图钉合并为国家合集。备用星图为排版示意。高德配置的 key / securityJsCode 沿用现有配置；公开域名是否可用仍受高德控制台域名限制约束。本次没有更改控制台设置。

高德配置目前采用开发用的前端接入方式，公开发布时配置文件可被读取。高德官方建议生产环境通过服务器 `serviceHost` 代理保存 securityJsCode；纯 GitHub Pages 不提供该后端。相关规则见[高德安全密钥文档](https://lbs.amap.com/api/javascript-api-v2/guide/abc/jscode)。

## 记忆游乐场与旅程回放

- **足迹放映机**：默认按相册出发日期播放完整年表；选择「当前地图 / 年份」可播放当前范围。点青甘特辑时自动装入已有环线站点。可切换飞机 / 火车、暂停继续、上一站 / 下一站、拖动时间轴、调整速度和循环播放。点时间线照片可直接跳转。
- 移动连线与载具均为回忆示意，不代表真实交通方式或实际导航路径。在世界地球上回放时，沿球面示意弧线播放载具，地球会跟随旅程转动；没有地点的相册只展示照片，不添加虚构坐标。回放不会自动刷印章；打开相册或点击地点可以盖章。
- **大印章护照**：桌面约占游乐场 2/3 宽度，印章错落排列，默认展示全部。可切换每页 12 枚或 6 枚并左右翻页；盖章会自动翻到对应页。
- **明信片盲盒**：点叠放照片或「抽一张明信片」，随机打开一张照片；可跳进对应相册。
- **猜猜这是哪里**：每轮随机抽五本已有地点的相册，根据照片选相册记录的地点。答完显示成绩，可查看原相册或重新挑战；最佳成绩与印章、收藏一起保存在当前浏览器。
- 关闭网页 / 切换到其他标签时会暂停播放；系统选择减少动态效果时，载具改为直接到站，保留照片顺序播放。

这些组件直接读取同一份相册数据。新增旅程后运行构建，新照片会进入年表、盲盒与竞猜；配置好地点后也会进入地图和护照。

## 2026 年新增旅程与 WebP

- `images/2607malaysia/trip.json`：2026.7.23–7.28，34 张照片；按用户提供的六天分别编排 `chapter` 与照片 `date`。仙本那 / 亚庇为城市概略位置，数据来源保存在各地点的 `coordinateSource`。
- `images/2610wuyishan/trip.json`：2026.10.1–10.4，6 张照片；未提供每日对应关系，因此保留整体日期范围。武夷山坐标参照 [UNESCO 地理资料](https://whc.unesco.org/en/list/911/maps/)，不代表照片 GPS。两段游记原文保持不变。
- 两段旅程的网页照片均使用 WebP（quality=80，保留原尺寸并处理 EXIF 方向），JSON 明确列出 WebP，JPG 不会混入相册。此次保留了 JPG 原图，网页加载的是 WebP。这两个目录的 JPG 已加入 Git 忽略规则，作为本地原图保留；WebP 和预览图正常提交。
- `images/pic.py` 默认路径已指向当前发布仓库的 `images/`，新增 `--folders` 可只转换指定旅程；缩略图目录不参与批量转换。本机可使用已有 Python + Pillow：

```sh
/opt/anaconda3/bin/python images/pic.py --folders 2607malaysia 2610wuyishan --keep-original
python3 qunqing/manage.py build
```

上面命令保留原图；脚本原有不带 `--keep-original` 时删除原图的行为仍保留，按自己的备份情况选择。

## 可旋转世界地球

选择地图页的「地球 · 全部足迹」，或直接访问 `qunqing/#earth`：拖动球面旋转，点击照片合集后选城市，或直接使用地点索引。支持放大、缩小、暂停 / 开启自转；可在球面上播放完整年表或当前年份。首次进入默认面向亚洲。所有地形文件和脚本随站点保存，不依赖海外地图瓦片服务。

地球采用 [D3 球面投影](https://d3js.org/d3-geo/projection) 与 [Natural Earth 1:110m 地形](https://www.naturalearthdata.com/downloads/110m-physical-vectors/)。地形只表现海岸与陆地，不绘制国家边界。库版本、许可证和数据来源见 `vendor/SOURCES.md`。
