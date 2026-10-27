# Chen Peng / Asa — personal website

原生 HTML / CSS / JavaScript。GitHub Pages 继续从 `main` 根目录发布，网页无需 Quarto、npm 或构建工具。

## 本地预览与编辑

```sh
python3 -m http.server 8771 --bind 127.0.0.1
```

打开 http://127.0.0.1:8771/ 。

- `index.html`：个人介绍、研究方向、精选项目、教育经历、爱好与联系。
- `works.html`：研究方向、已发表论文、预印本和教育经历。
- `development.html`：R 包、科研平台与 Web apps。
- `books/index.html`：三本教程的统一书架。
- `FileList/index.html`：下载文件、科研英语社区与外部内容入口。
- `databases/index.html`：数据库入口。
- `wp.html`：微信公众号二维码。
- `assets/main/site.css`：共享样式；`site.js`：语言选择、右侧章节定位和动图暂停。
- `assets/main/translations.js`：中文翻译；英文直接写在 HTML，禁用 JavaScript 后仍可阅读与导航。
- 页面用 `?lang=en` / `?lang=zh` 切换语言，也会保存选择。桌面右侧导航对应页面中的 section ID；小屏收起侧栏，保留顶部主导航。
- 图标取自 [Lucide](https://github.com/lucide-icons/lucide)，已内嵌到 HTML，不依赖第三方 CDN。源码版本与许可见 `assets/icons/`。
- 原头像、动画插画、博客图片和 R 包 GIF 继续使用 `images/` 中的原文件。GIF 可暂停，系统选择减少动态效果时显示静态替代内容。

## 内容目录

```text
books/
  iPhylo_tutorial/
  MetaNet_tutorial/
  pctax_tutorial/
FileList/
  GOlist.rda
  JCR_IF_2024_bigger_than_2.4.csv
  JCR_IF_2025_bigger_than_2.4.csv
  JCR_IF_2026_bigger_than_2.4.csv
  SanJiChunLianZiTiJian.ttf
  china.json
databases/CRISPRome/     # 原站文件整体迁移
```

三本教程保持各自的静态资源和内部目录。下载文件只维护在 `FileList/`，保留原文件名和 URL，不创建资源副本；直接替换对应文件后提交即可。科研英语入口链接到 [Asa English Community](https://asa-english-community.netlify.app/)，本站不再保存课程和音频。

未来独立小应用放在 `apps/<name>/`，自行维护资源和独立 browser storage key，并在 Projects 页面加入入口。

## 旧地址兼容

- `/FileList/` 是资源页面和下载文件的正式入口，原有 6 个下载地址直接返回文件，R / Python / curl 均可使用。
- `others.html` 跳到 `/FileList/`。
- `404.html` 中的 `assets/main/legacy-paths.js` 为旧 `/resources/`、教程、CRISPRome 和群青的浏览器书签提供新地址跳转。404 JavaScript 只适用于浏览器；程序下载请使用 `/FileList/<文件名>`。
- 教程中少量既有链接问题单独记录，未扩大为教程重写。

## 发布

仓库：[Asa12138/Asa12138.github.io](https://github.com/Asa12138/Asa12138.github.io)

主页：[asa12138.github.io](https://asa12138.github.io/)

GitHub Pages 使用 `main` 分支根目录。`.nojekyll` 让 HTML 和已有资源直接发布，无需构建依赖；推送后等待 Pages 部署成功即可。

本仓库从当前精简目录建立新的 Git 历史，不包含已删除旧仓库的提交。`.gitattributes` 保持下载文件、教程和数据库文件原始字节不变。

## 群青

独立站点：https://asa12138.github.io/Asa_qunqing/ 。主站已移除群青页面、地图、游戏、音频和相册资源，仅保留外链与 404 兼容规则。

压缩前的原始照片、相册配置、游记和旧缩略图已移至同级 **`Asa_qunqing-originals/`**，逐文件 SHA-256 见该目录 `archive-manifest-20261027.json`。这不是公开站点的一部分。移动到同一磁盘不等于释放同等磁盘空间。

主站直接维护原生 HTML，不再由 Quarto 同步覆盖。群青独立仓库不受主站重建影响。
