import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.string(),
    dateSort: z.string(), // ISO 8601 for sorting: "2022-08-12"
    category: z.enum(['solar', 'gaming', 'crypto', 'tech']),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = { posts };
