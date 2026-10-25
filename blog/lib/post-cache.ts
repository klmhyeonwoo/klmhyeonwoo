import "server-only";

import { unstable_cache } from "next/cache";
import { getPost, getPostBlocks, getPosts, type PostMeta } from "./posts";

/** Shared cache tag for every filesystem-backed post read. */
export const postsCacheTag = "blog-posts";

// The repository is immutable for a deployment. These caches avoid repeatedly
// parsing the same files when a public page is regenerated or metadata and the
// page are rendered together. Publish/delete routes invalidate the tag too,
// so local and self-hosted workflows still receive a timely refresh.
export const getCachedPosts = unstable_cache(
  async (includePrivate = false): Promise<PostMeta[]> => getPosts(includePrivate),
  ["post-index-v1"],
  { revalidate: 3600, tags: [postsCacheTag] },
);

export const getCachedPost = unstable_cache(
  async (id: string) => getPost(id),
  ["post-source-v1"],
  { revalidate: 3600, tags: [postsCacheTag] },
);

export const getCachedPostBlocks = unstable_cache(
  async (id: string) => getPostBlocks(id),
  ["post-blocks-v1"],
  { revalidate: 3600, tags: [postsCacheTag] },
);
