# Rei-soul 的个人网站

> 在 0 与 1 之间，留一点墨迹。

简约但有科技，理工但有人文关怀的个人网站。基于 **Astro 5 + Tailwind CSS 4** 构建，部署在 GitHub Pages。

线上地址：<https://rei-soul.github.io>

## 功能一览

- 首页终端打字机 Hero + Canvas 星空 + 渐隐网格背景
- 全站 View Transitions 平滑切换；明暗主题一键切换（按钮为圆心的圆形扩散动画）
- 博客系统：列表分页、目录 TOC 高亮、阅读进度条、阅读时长、上下篇导航
- 代码块 Mac 窗口化 + 一键复制 + Shiki 双主题高亮；KaTeX 数学公式
- 归档页 `git log --graph` 风格时间线（每篇文章是一个 commit 节点）
- 随笔栏目（暖色调人文栏目）；标签系统；友链页
- 项目页：构建期自动同步 GitHub 仓库 star/更新时间（静态数据兜底）
- 站内搜索（Pagefind 静态索引，`Ctrl K` 或 `/` 唤起）
- 页脚：一言 API、不蒜子访问统计、建站天数
- 深色默认 + 浅色纸张主题；`prefers-reduced-motion` 全量降级；SEO / RSS / Sitemap

## 技术栈

| 类别 | 选型 |
| --- | --- |
| 框架 | Astro 5（默认零 JS，岛屿交互） |
| 样式 | Tailwind CSS 4（`@theme` 设计令牌） |
| 字体 | 霞鹜文楷屏幕版（标题/人文）· JetBrains Mono（代码/理工）· 系统栈正文 |
| 搜索 | Pagefind |
| 高亮 | Shiki（github-light / github-dark 双主题） |
| 部署 | GitHub Actions → GitHub Pages |

## 本地开发

需要 Node.js ≥ 20（`node -v` 查看）：

```bash
npm install      # 安装依赖
npm run dev      # 开发服务器 http://localhost:4321
npm run build    # 构建到 dist/（并生成 Pagefind 搜索索引）
npm run preview  # 本地预览构建产物（搜索功能在此模式下可用）
```

> dev 模式下搜索会提示"需先构建"，这是正常的：Pagefind 索引只在 build 时生成。

## 写文章

在 `src/content/blog/` 下新建 Markdown 文件（文件名即 URL，如 `my-post.md` → `/blog/my-post/`）：

```markdown
---
title: 文章标题
description: 一句话摘要（列表页和 SEO 用）
pubDate: 2026-10-25
tags: [标签1, 标签2]
category: 分类
kind: tech            # tech=技术文章 / essay=随笔（进随笔栏目，暖色调）
epigraph: 题记，显示在标题下方（可选，人文点缀）
draft: false          # true 则不发布
---

正文。`<!-- more -->` 之前的内容会作为摘要。
```

支持：代码块（自动窗口化+复制）、`$...$` 行内 / `$$...$$` 块级公式、表格、引用、任务列表。

## 常用自定义

| 想改什么 | 去哪里 |
| --- | --- |
| 站名 / 简介 / 社交链接 / 建站日期 | `src/data/site.ts` |
| 颜色 / 字体 / 动效令牌 | `src/styles/global.css` 顶部 `:root` 与 `.dark` |
| 项目列表 | `src/data/projects.ts`（构建时会自动刷新 star） |
| 友链 | `src/data/friends.ts` |
| 导航菜单 | `src/components/SiteHeader.astro` |
| 首页终端命令 | `src/pages/index.astro` 的 `terminalLines` |
| 页面顶部壁纸横幅 | 各页面里的 `<PageBanner .../>`（壁纸/标题/命令行小字） |

## 更换壁纸

每页的壁纸是 `public/wallpapers/` 下的 SVG（程序绘制、每个页面一张、主题各异）。换成你自己的照片：

1. 把照片（建议 JPG、宽≥1600px、体积 <500KB）重命名为如 `home.jpg`，放进 `public/wallpapers/`
2. 打开对应页面（首页是 `src/pages/index.astro`），把 `<PageBanner wallpaper="/wallpapers/home.svg"` 改成 `/wallpapers/home.jpg`
3. 壁纸上方会自动叠加渐变罩保证白色标题可读，无需额外处理

## 部署（首次）

1. 代码推到 `main` 分支后，仓库 **Settings → Pages → Build and deployment → Source 选 "GitHub Actions"**
2. 以后每次 push 到 main 自动构建发布，无需任何手动操作

## 常见问题

**Q：`npm install` 时字体包 `lxgw-wenkai-screen-webfont` 安装失败？**
打开 `src/layouts/Base.astro`，把 `import 'lxgw-wenkai-screen-webfont/style.css';` 这行删掉，换成在 `<head>` 里加：
`<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lxgw-wenkai-screen-webfont@1.7.0/style.css" />`

**Q：不蒜子统计不显示 / 想移除？**
不蒜子服务偶发不稳定，等一会或直接删掉 `src/components/SiteFooter.astro` 中 `busuanzi` 相关的三行即可。

**Q：想开评论？**
见 `src/components/Comments.astro` 顶部的注释（giscus，基于 GitHub Discussions）。

**Q：构建时项目页拉不到 GitHub API？**
正常的：CI 里有 `GITHUB_TOKEN` 会自动刷新；本地构建无网络时回落到 `src/data/projects.ts` 的静态数据。

## License

代码 MIT；文章内容版权归作者所有。
