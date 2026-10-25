---
title: 用 C++ 写一个扫雷：BOOM 复盘
description: 从命令行扫雷的完整开发复盘：架构设计、边界情况与第一次认真的代码重构。
pubDate: 2026-06-20
category: 项目复盘
tags: [C++, 项目, 游戏逻辑]
kind: tech
epigraph: 第一颗雷教会我初始化，最后一颗雷教会我边界情况。
---

[BOOM](https://github.com/Rei-soul/BOOM) 是我第一个"从零设计"的小项目：一个命令行扫雷。代码不长，但第一次完整经历了设计 → 编码 → 调试 → 重构的循环，值得复盘。

<!-- more -->

## 需求拆解

扫雷的核心规则拆出来其实只有四条：

1. 随机布置 $m$ 颗雷（首点保护：第一次点击不踩雷）
2. 点击数字格 → 显示周围 8 格的雷数
3. 点击空白格 → 递归展开相邻空白区域
4. 插旗 / 取消插旗

## 关键实现

### 棋盘表示

用两个平行数组而不是一个：

```cpp
struct Board {
    std::vector<bool>   mine;     // 是否有雷
    std::vector<int>    count;    // 周围雷数（-1 表示自身是雷）
    std::vector<State>  state;    // Hidden / Revealed / Flagged
    int w, h;
};
```

`state` 和数据分离之后，"渲染"和"逻辑"就不再互相污染——这是这个项目里我最早体会到的架构收益。

### 递归展开（Flood Fill）

```cpp
void reveal(Board& b, int x, int y) {
    if (!b.inBounds(x, y)) return;
    auto& cell = b.at(x, y);
    if (cell.state != State::Hidden) return;   // 关键：已展开的直接返回，防止死循环
    cell.state = State::Revealed;
    if (cell.count == 0)
        for (auto [dx, dy] : kNeighbors)
            reveal(b, x + dx, y + dy);
}
```

第一版我在这里栈溢出过：忘了判断 `state != Hidden` 就递归，两个相邻空白格互相触发。教训是**递归函数的第一行永远是终止条件**。

### 首点保护

真正的新雷区在玩家第一次点击之后才生成，生成时排除首点及其 8 邻域。实现很简单，但"游戏体验"和"程序正确"一样重要。

## 边界情况清单

- [x] 点击坐标越界（棋盘边缘的格子邻居不足 8 个）
- [x] 剩余格数恰等于雷数时的胜利判定
- [x] 对已展开格子插旗（应当无效）
- [x] 雷数等于格子总数时首点保护无解（限制最大雷数）

## 重构记录

第一版所有逻辑写在 `main.cpp` 的 300 行里。重构后拆成 `Board / Render / Input / Game` 四个模块，主循环只剩 20 行。重构没有加任何新功能，但之后加"自定义棋盘大小"只花了十分钟。

> 先让它工作，再让它优雅；但别等太久才做第二步。

*（本文为示例文章框架，欢迎替换成你自己的内容。）*
