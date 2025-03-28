import fg from 'fast-glob';
import { dirname, resolve } from 'path';
import { createFilter, Plugin } from 'vite';

interface VitaminPluginOptions {
  ssr?: boolean;
  srcRoutesDir?: string;
  buildDir?: string;
}

export default function vitaminPlugin({ ssr = true, srcRoutesDir = 'src/routes', buildDir = 'dist' }: VitaminPluginOptions = {}): Plugin {
  const routesIncludePattern = '**/{page,layout}.{js,ts,jsx,tsx}';
  const routesExcludePatterns = ['node_modules/**', 'dist/**'];
  const routesFileFilter = createFilter(routesIncludePattern, routesExcludePatterns);

  const serverIncludePattern = 'server.{js,ts,jsx,tsx}';

  const serverFiles = fg.globSync(serverIncludePattern, { cwd: dirname(__filename), absolute: true });
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
          outDir: buildDir, // Output directory
          rollupOptions: {
            input: [...routeFiles, ...serverFiles],
            output: {
              // Preserve directory structure for route files
              entryFileNames: (chunkInfo) => {
                const filePath = chunkInfo.facadeModuleId;
                if (!filePath) return '';

                if (routesFileFilter(chunkInfo.facadeModuleId)) {
                  const relativePath = resolve(srcRoutesDir);
                  const routePath = filePath
                    .replace(relativePath, 'routes') // Output under routes directory
                    .replace(/\[([^\]]+)\]/g, ':$1')
                    .replace(/\.(ts|jsx|tsx)$/, '.js'); // Convert to .js

                  return routePath;
                }

                if (/server\.(js|ts|jsx|tsx)$/.test(chunkInfo.facadeModuleId || '')) {
                  const relativePath = resolve(dirname(__filename));
                  const routePath = filePath
                    .replace(`${relativePath}/`, '') // Output under root directory
                    .replace(/\.(ts|jsx|tsx)$/, '.js'); // Convert to .js
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

    // Optional: Analyze imports during transform
    transform(code, id) {
      if (routesFileFilter(id)) {
        // You could parse imports here with a tool like `es-module-lexer`
        // For simplicity, we'll rely on Rollup's manualChunks
        return code;
      }
    },

    // Finalize output
    generateBundle(_options, bundle) {
      // Ensure route files maintain structure and shared chunks are hashed
      for (const [, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && routesFileFilter(chunk.facadeModuleId)) {
          const originalPath = chunk.facadeModuleId;
          if (!originalPath) return;

          const relativePath = originalPath
            .replace(resolve(srcRoutesDir), 'routes')
            .replace(/\[([^\]]+)\]/g, ':$1');
          const newFileName = `${relativePath.replace(/\.(ts|jsx|tsx)$/, '.js')}`;
          chunk.fileName = newFileName;
        }
      }
    },
  };
}