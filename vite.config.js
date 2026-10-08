import { defineConfig } from 'vite';

// GitHub Pages 주소가 https://ohhaewonisulzzang.github.io/engpit/ 이라서 배포할 때만 경로 앞에 /engpit/ 를 붙인다
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/engpit/' : '/',
}));
