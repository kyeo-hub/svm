/** @type {import('next').NextConfig} */
const nextConfig = {
  // 针对sqlite3的特殊配置
  webpack: (config) => {
    config.externals = [...config.externals, { 'sqlite3': 'commonjs sqlite3' }];
    return config;
  }
};

module.exports = nextConfig;