import type { MetadataRoute } from "next";
import { getPosts } from "@/lib/posts";
import { getSeries } from "@/lib/series";
import { absoluteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/profile"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/series"), changeFrequency: "weekly", priority: 0.7 },
  ];

  const allPosts = getPosts();
  const posts = allPosts.map((post) => ({
    url: absoluteUrl(`/posts/${post.id}`),
    lastModified: post.updatedAt || post.publishedAt || post.date,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const series = getSeries().map((item) => {
    const lastModified = allPosts
      .filter((post) => post.seriesId === item.id)
      .map((post) => post.updatedAt || post.publishedAt || post.date)
      .sort((left, right) => right.localeCompare(left))[0];
    return {
      url: absoluteUrl(`/series/${item.id}`),
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    };
  });

  return [...staticPages, ...series, ...posts];
}
