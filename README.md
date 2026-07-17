# 玄天界三维地图

一个可运行于 SillyTavern 酒馆助手 JS-Slash-Runner 的 Three.js 玄幻世界地图查看器，也可以通过 GitHub Pages 作为独立网页预览。

## 当前功能

- 酒馆助手“地图”按钮和独立地图窗口
- Three.js 真实三维地形、相机控制和动画循环
- 区域颜色、雪山、火山、河谷、边界和地点标签
- 程序化植被：针叶林、阔叶林、灌木、枯木、岩石和冰晶
- 北冥雪原下雪特效
- 南离火洲火山烟雾和火光特效
- GLB 地标资产加载管线，支持加载失败后自动回退程序模型
- GitHub Pages 静态网页入口

## 本地开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

构建产物在：

```text
dist/xuantian-map.js
```

## GitHub Pages 托管

本仓库已经准备好 `docs/` 静态站点目录。推送到 GitHub 后，在仓库设置里打开：

```text
Settings -> Pages -> Build and deployment -> Deploy from a branch
Branch: main
Folder: /docs
```

保存后，网页地址通常是：

```text
https://MumeTrace.github.io/daoyuan-map/
```

## 酒馆助手使用

如果作为 JS-Slash-Runner 脚本使用，构建后使用：

```text
dist/xuantian-map.js
```

如果从 GitHub Pages 或 CDN 远程加载，需要保证同目录下也能访问：

```text
models/
textures/
```

因为地形贴图和测试 GLB 模型会通过脚本所在 URL 自动解析。

## 目录说明

- `src/`：地图源码
- `public/models/`：GLB 模型静态资源
- `public/textures/`：贴图静态资源
- `docs/`：GitHub Pages 托管目录
- `blender/`：后续 Blender 自动建模脚本预留目录
- `tools/`：地形材质生成工具

## 许可证

Personal project. All rights reserved unless a license is added later.
# daoyuan-map
