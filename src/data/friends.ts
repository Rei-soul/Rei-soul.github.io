// 友链数据：在 /links 页面展示。欢迎交换友链（在任意文章下留言或提 Issue 即可）。
export interface Friend {
  name: string;
  url: string;
  desc: string;
  avatar?: string;
}

export const FRIENDS: Friend[] = [
  {
    name: '听风347',
    url: 'https://tingfeng347.github.io/',
    desc: '本项目视觉精致度的对标与灵感来源，感谢前辈的示范。',
  },
  // 交换友链在这里追加：
  // { name: '某位朋友', url: 'https://example.com', desc: '一句话介绍' },
];
