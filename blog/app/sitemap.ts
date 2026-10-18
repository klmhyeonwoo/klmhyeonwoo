import type { MetadataRoute } from "next";
import { getPosts } from "@/lib/posts";
import { absoluteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/profile"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/series"), changeFrequency: "weekly", priority: 0.7 },
  ];

  const posts = getPosts().map((post) => ({
    url: absoluteUrl(`/posts/${post.id}`),
    lastModified: post.updatedAt || post.publishedAt || post.date,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...posts];
}
