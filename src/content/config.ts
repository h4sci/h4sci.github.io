// 1. Import utilities from `astro:content`
import { z, defineCollection, render } from 'astro:content';
import { glob } from 'astro/loaders';






// Define the collection schema using the image parameter
const blogCollection = defineCollection({
  schema: ({ image }) => z.object({
    draft: z.boolean(),
    title: z.string(),
    snippet: z.string(),
    publishDate: z.string().transform(str => new Date(str)),
    author: z.string().default('The Zurich R User Group'),
    category: z.string(),
    tags: z.array(z.string()),
    cover: image(), // Using the image parameter here
    coverAlt: z.string(),
  }),
});



// 3. Export a single `collections` object to register your collection(s)
//    This key should match your collection directory name in "src/content"
export const collections = {
  'blog': blogCollection
};
