import "server-only";

import { unstable_cache } from "next/cache";
import { getPost, getPostBlocks, getPosts, type PostMeta } from "./posts";

/** Shared cache tag for every filesystem-backed post read. */
export const postsCacheTag = "blog-posts";

// The repository is immutable for a deployment, so these entries never expire
// on a timer. A numeric `revalidate` here is not harmless: when one of these
// caches is read while prerendering a page, Next lowers that page's own
// revalidate window to the smaller value, which silently re-enables hourly ISR
// (and its MDX + syntax-highlighting CPU) for `revalidate = false` routes.
//
// Entries are scoped to the deployment instead, because the Data Cache outlives
// deployments and a never-expiring entry from an older deploy would otherwise
// serve a stale post index. Publish/delete routes still call
// revalidateTag(postsCacheTag, "max"), which refreshes entries immediately.
const deploymentKey = process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "local";
const cacheOptions: { revalidate: false; tags: string[] } = { revalidate: false, tags: [postsCacheTag] };

export const getCachedPosts = unstable_cache(
  async (includePrivate = false): Promise<PostMeta[]> => getPosts(includePrivate),
  ["post-index-v3", deploymentKey],
  cacheOptions,
);

export const getCachedPost = unstable_cache(
  async (id: string) => getPost(id),
  ["post-source-v1", deploymentKey],
  cacheOptions,
);

export const getCachedPostBlocks = unstable_cache(
  async (id: string) => getPostBlocks(id),
  ["post-blocks-v1", deploymentKey],
  cacheOptions,
);
