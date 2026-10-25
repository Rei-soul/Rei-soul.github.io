---
title: 深度学习入坑路线与避坑指南
description: 一个 CS 本科生的 PyTorch 学习路径：从手写反向传播到复现论文，附资源清单。
pubDate: 2026-10-10
category: 深度学习
tags: [PyTorch, 学习路线, 深度学习]
kind: tech
epigraph: 轮子要造一遍，才知道轮子为什么是圆的。
---

入门深度学习三个月，把路线和资源整理在这里，对应代码在 [DL_learning](https://github.com/Rei-soul/DL_learning)。写这篇的目的：如果重来一遍，我希望有人告诉我这些。

<!-- more -->

## 我的路线（三个月）

### 第一阶段：手推 + 手写（不碰框架）

- 用 NumPy 实现两层全连接网络，手写反向传播
- 用 NumPy 实现一个微型 autograd（跟着 [micrograd](https://github.com/karpathy/micrograd) 的思路）
- 这一步的价值：之后框架报出的任何梯度错误，你都有能力怀疑它

### 第二阶段：PyTorch 基础

核心 API 其实不多，按使用频率排序：

```python
import torch
import torch.nn as nn

model = nn.Sequential(
    nn.Linear(784, 128),
    nn.ReLU(),
    nn.Linear(128, 10),
)

loss_fn = nn.CrossEntropyLoss()          # 内含 softmax，不要再手动加
optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)

for x, y in loader:
    optimizer.zero_grad()                # 忘记这行 = 梯度累加，loss 鬼畜
    loss = loss_fn(model(x), y)
    loss.backward()
    optimizer.step()
```

### 第三阶段：完整项目 + 论文复现

- CIFAR-10 分类：数据增强、学习率调度、TensorBoard
- 复现一篇自己感兴趣的论文（我选了 NTAM，见另一篇记录）

## 避坑清单

1. **不要一上来就训大模型。** 显存和时间都会劝退你，先在 MNIST 级别的数据上把流程跑顺
2. **`zero_grad()` 的位置。** 放在 `backward()` 之前、循环的开头
3. **数据集划分要固定随机种子**，否则每次实验不可比
4. **先过拟合一个小批次**：如果连 16 个样本都拟合不了，说明有 bug，不是模型不行
5. **看 `loss` 曲线别只看最后几个点**，中间的震荡形态信息量更大

## 资源清单（全免费）

- 3Blue1Brown 神经网络系列：建立直觉
- Karpathy 的 "Neural Networks: Zero to Hero"：手写实现
- PyTorch 官方 60 分钟教程：API 上手
- 《动手学深度学习》（d2l.ai）：系统化 + 代码

## 下一步

- [ ] Transformer 结构的逐行实现
- [ ] 分布式训练入门
- [ ] 把 DL_learning 仓库整理成可复用的模板

*（本文为示例文章框架，欢迎替换成你自己的内容。）*
