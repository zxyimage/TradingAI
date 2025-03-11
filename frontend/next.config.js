
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // 启用独立模式，优化Docker部署
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig