// 项目页数据：手动精选维护（最稳定）。
// 构建时项目页会尝试用 GitHub API 刷新 star/更新时间（CI 里有 GITHUB_TOKEN），
// 拉取失败时回落到这里的数据，所以请保持这份文件和你的仓库同步。
export interface Project {
  name: string;
  url: string;
  desc: string;
  lang: string;
  stars: number;
  // 展示分组：course = 课程学习，lab = 复现/实验，side = 课余小项目
  group: 'course' | 'lab' | 'side';
  featured?: boolean;
}

export const PROJECTS: Project[] = [
  {
    name: 'NWPU_FCS_LEARNING',
    url: 'https://github.com/Rei-soul/NWPU_FCS_LEARNING',
    desc: '计算机系统基础（FCS）课程学习记录：汇编、链接、存储器层次、虚拟内存，配套实验与笔记。',
    lang: 'C',
    stars: 7,
    group: 'course',
    featured: true,
  },
  {
    name: 'NTAM',
    url: 'https://github.com/Rei-soul/NTAM',
    desc: '论文 NTAM 的复现代码：从公式到 PyTorch 实现的完整过程记录。',
    lang: 'Python',
    stars: 1,
    group: 'lab',
    featured: true,
  },
  {
    name: 'DL_learning',
    url: 'https://github.com/Rei-soul/DL_learning',
    desc: 'PyTorch 深度学习笔记与实验代码，从手写反向传播到常用模型。',
    lang: 'Python',
    stars: 0,
    group: 'lab',
    featured: true,
  },
  {
    name: 'CS-study-snippets',
    url: 'https://github.com/Rei-soul/CS-study-snippets',
    desc: 'C++ 学习路上的代码片段集合，随课程持续更新。',
    lang: 'C++',
    stars: 0,
    group: 'course',
  },
  {
    name: 'BOOM',
    url: 'https://github.com/Rei-soul/BOOM',
    desc: '扫雷小游戏：C++ 命令行实现，第一次完整走通"设计-编码-调试"全流程的复盘项目。',
    lang: 'C++',
    stars: 0,
    group: 'side',
  },
  {
    name: 'Stroop-Effect',
    url: 'https://github.com/Rei-soul/Stroop-Effect',
    desc: 'Stroop 效应心理实验程序：课程作业，也让我第一次认真思考"人如何使用软件"。',
    lang: 'C++',
    stars: 0,
    group: 'side',
  },
  {
    name: 'Devcode_Java',
    url: 'https://github.com/Rei-soul/Devcode_Java',
    desc: 'Java 基础练习代码。',
    lang: 'Java',
    stars: 0,
    group: 'course',
  },
];

export const GROUP_LABEL: Record<Project['group'], string> = {
  course: '课程学习',
  lab: '复现与实验',
  side: '课余小项目',
};
