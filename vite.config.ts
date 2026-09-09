
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn, ChildProcess } from 'child_process';

let proxyProcess: ChildProcess | null = null;



// Плагин Vite для автоматического запуска server.js
function expressProxyPlugin() {
  return {
    name: 'express-proxy-plugin',
    configureServer() {
      if (!proxyProcess) {
        console.log('\n🚀 [Vite Plugin] Автоматический запуск Node.js Express прокси...');

        // Запуск server.js в фоновом режиме
        proxyProcess = spawn('node', ['server.js'], {
          stdio: 'inherit',
          shell: true,
        });

        proxyProcess.on('error', (err) => {
          console.error('❌ Ошибка запуска server.js:', err);
        });
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    expressProxyPlugin(),
  ],
});

