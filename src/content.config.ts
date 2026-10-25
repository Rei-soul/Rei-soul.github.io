import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 所有文章放在 src/content/blog/ 下；
// kind: 'tech' 技术文章（/blog 列表），kind: 'essay' 随笔（/essays 列表，暖色人文栏目）
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().default(''),
    pubDate: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    category: z.string().default('未分类'),
    kind: z.enum(['tech', 'essay']).default('tech'),
    cover: z.string().optional(),
    // 题记：显示在文章顶部，暖色引言，"人文关怀"的小小入口
    epigraph: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
