import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Next.js(App Router)는 별도의 vitest 프리셋을 제공하지 않으므로, JSX 트랜스폼을 위해
// @vitejs/plugin-react를 직접 붙인다. tsconfig.json의 "@/*" 경로 별칭을 그대로 미러링해서
// 앱 코드와 테스트 코드가 동일한 import 경로를 쓸 수 있게 한다.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    // @testing-library/jest-dom v7의 자동 matcher 등록이 전역 expect를 찾으므로 globals가 필요하다.
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
