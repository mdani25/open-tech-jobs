/** @type {import('next').NextConfig} */

// The site is a static export deployed to GitHub Pages at
// https://mdani25.github.io/open-tech-jobs/  ->  basePath = /open-tech-jobs
// Locally NEXT_PUBLIC_BASE_PATH is empty so `next dev` serves from /.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
