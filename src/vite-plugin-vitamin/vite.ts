import fg from 'fast-glob';
import { dirname, resolve } from 'path';
import { createFilter, Plugin } from 'vite';
import { Platform } from './platform';
import { usingExpress } from './platform/express';

interface VitaminPluginOptions {
  ssr?: boolean;
  srcRoutesDir?: string;
  target?: Platform;
}

export default function vitaminPlugin(options: VitaminPluginOptions = {}): Plugin {
  const { ssr = true, srcRoutesDir = 'src/routes', target = usingExpress() } = options;
  const { srcApisDir = srcRoutesDir, buildDir, routesDir: buildRoutesDir, transformPathName, buildRollupInput, buildEnd } = target;

  // const serverIncludePattern = 'server.{js,ts,jsx,tsx}';
  const routesIncludePattern = '**/{page,layout}.{js,ts,jsx,tsx}';
  const routesExcludePatterns = ['node_modules/**', 'dist/**'];
  const routesFileFilter = createFilter(routesIncludePattern, routesExcludePatterns);

  // const serverFiles = fg.globSync(serverIncludePattern, { cwd: dirname(__filename), absolute: true });
  const routeFiles = fg.globSync(routesIncludePattern, {
    ignore: routesExcludePatterns,
    cwd: srcRoutesDir,
    absolute: true
  });

  // Store shared imports to identify common dependencies
  const sharedImports = new Set();

  return {
    name: 'vite-plugin-vitamin',
    config() {
      return {
        build: {
          ssr,
          outDir: buildDir,
          rollupOptions: {
            input: [...buildRollupInput(routeFiles, srcRoutesDir),],
            output: {
              entryFileNames: (chunkInfo) => {
                const filePath = chunkInfo.facadeModuleId;
                if (!filePath) return '';

                if (routesFileFilter(chunkInfo.facadeModuleId)) {
                  const relativePath = resolve(srcApisDir);
                  const routePath = filePath
                    .replace(relativePath, buildRoutesDir)
                    .replace(/page\.(ts|jsx|tsx)$/, 'index.js')
                    .replace(/\[([^\]]+)\]/g, ':$1');

                  return routePath;
                }

                if (/server\.(js|ts|jsx|tsx)$/.test(chunkInfo.facadeModuleId || '')) {
                  const relativePath = resolve(dirname(__filename));
                  const routePath = filePath
                    .replace(`${relativePath}/`, '')
                    .replace(/\.(ts|jsx|tsx)$/, '.js');
                  return routePath;
                }

                // Default naming for non-route chunks (e.g., shared)
                return `[hash].shared.js`;
              },
              chunkFileNames: `shared/[hash].js`, // Shared chunks
              manualChunks(id) {
                // Logic to split shared imports
                if (id.includes('node_modules')) {
                  sharedImports.add(id);
                  return 'shared'; // Group into 'shared' chunk
                }
                if (routesFileFilter(id)) {
                  // Keep route files as separate entries
                  return null;
                }
              },
            },
          },
        },
      }
    },

    transform(code, id) {
      if (routesFileFilter(id)) {
        // You could parse imports here with a tool like `es-module-lexer`
        // For simplicity, we'll rely on Rollup's manualChunks

        return code;
      }
    },

    generateBundle(_options, bundle) {
      for (const [, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && routesFileFilter(chunk.facadeModuleId)) {
          const fileName = chunk.fileName;
          if (!fileName) return;

          chunk.fileName = transformPathName(fileName);
        }
      }
    },

    closeBundle() {
      buildEnd?.();
    },
  };
}