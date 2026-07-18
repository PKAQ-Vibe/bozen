import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// 注意：保持迁移兼容性
// - 路径别名 @ -> src，@data -> data，与 ant design pro 通用约定一致
// - 把 data/ 暴露为 @data/*，迁移到 Pro 时直接换 services 内部实现即可
// - PDF 等静态资源放 public/，运行时以 /textbooks/*.pdf 访问；build 时会拷进 dist 根
export default defineConfig({
  base: '/bozen/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@data': path.resolve(__dirname, 'data'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
