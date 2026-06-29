/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace SDK packages ship ESM/CJS from dist; transpile them so Next
  // can process their CSS side-effect imports and JSX.
  transpilePackages: ['@platform/core', '@platform/react', '@platform/ui'],
}

export default nextConfig
