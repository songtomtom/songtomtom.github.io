import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import pagefind from "astro-pagefind";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://songtomtom.github.io",
  // 예전 "프로젝트" 메뉴가 "시리즈"로 이름이 바뀌었다. 밖에 공유된 옛 링크를 받는다.
  redirects: {
    "/projects/apollo-router-supergraph-on-kubernetes": "/series/apollo-router-supergraph-on-kubernetes",
    "/projects/argocd-gitops": "/series/argocd-gitops",
    "/projects/flutter-feature-architecture": "/series/flutter-feature-architecture",
    "/projects/flutter-test": "/series/flutter-test",
    "/projects/go-grpc": "/series/go-grpc",
    "/projects/go-testify-testing": "/series/go-testify-testing",
    "/projects/gqlgen-apollo-subscriptions": "/series/gqlgen-apollo-subscriptions",
    "/projects/graphql-mesh-gateway": "/series/graphql-mesh-gateway",
    "/projects/mysql-to-postgres-on-kubernetes": "/series/mysql-to-postgres-on-kubernetes",
    "/projects/nx-vite-pnpm-monorepo": "/series/nx-vite-pnpm-monorepo",
    "/projects/scratch-blocks": "/series/scratch-blocks",
    "/projects/webpack-to-vite-library": "/series/webpack-to-vite-library",
  },
  integrations: [sitemap(), mdx(), pagefind()],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    shikiConfig: {
      theme: "css-variables",
    },
  },
});
