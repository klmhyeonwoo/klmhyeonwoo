import type { NextConfig } from "next";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { shortPostId } from "./lib/short-post-id";

const nextConfig: NextConfig = {
  async redirects() {
    const posts = readdirSync(join(process.cwd(), "content", "posts"));
    return posts.flatMap((file) => {
      if (!file.endsWith(".mdx")) return [];
      const id = file.slice(0, -4);
      const code = shortPostId(id);
      return code ? [{ source: `/p/${code}`, destination: `/posts/${id}`, permanent: true }] : [];
    });
  },
};

export default nextConfig;
