import { mkdirSync, readFileSync, writeFileSync, unlinkSync, rmSync } from "fs";
import { Platform, UsePlatformFunction } from ".";
import { basename, dirname, join, relative, resolve } from "path";

function buildRouteManifest(routeFiles: string[], srcRoutesDir: string) {
  const routeMap: Record<string, { page: string, layouts: string[] }> = {};
  routeFiles.forEach(pageFile => {
    if (/page\.(js|jsx|ts|tsx)$/.test(pageFile)) {
      const routePath = pageFile
        .replace(resolve(srcRoutesDir), '')
        .replace(`/${basename(pageFile)}`, '')
        .replace(/\[([^\]]+)\]/g, ':$1');

      routeMap[routePath] = {
        page: pageFile,
        layouts: []
      };
    }
  });

  Object.keys(routeMap).forEach(routePath => {
    const segments = join(...`${routePath}`.split('/')).split('/');

    const layouts = new Set<string>();
    for (let a = 0; a <= segments.length; a++) {
      const layout = join(resolve(srcRoutesDir), ...segments.slice(0, a), 'layout.');
      for (const f of routeFiles) {
        if (f.startsWith(layout)) layouts.add(f);
      }
    }

    routeMap[routePath].layouts = [...layouts].reverse();
  });

  return Object
    .keys(routeMap)
    .reduce((obj, routePath) => ({
      ...obj,
      [routePath || '/']: routeMap[routePath]
    }), {}) as typeof routeMap;
}

function buildCacheApiDir(routeFiles: string[], srcRoutesDir: string) {
  const routeManifest = buildRouteManifest(routeFiles, srcRoutesDir);
  const template = readFileSync(join(dirname(__filename), 'vercel-handler.tsx.txt')).toString();

  const apiFiles: string[] = [];
  for (const path in routeManifest) {
    const cacheFile = join('src', 'build', 'cache', 'api', path, 'page.tsx');
    mkdirSync(dirname(cacheFile), { recursive: true });
    writeFileSync(
      cacheFile,
      template.replace('@/routes/page', relative(dirname(cacheFile), routeManifest[path].page))
    );

    apiFiles.push(cacheFile);
  }

  return apiFiles;
}

export const usingVercel: UsePlatformFunction = () => {
  let cacheApis: string[] = [];

  const platform: Platform = {
    srcApisDir: join('src', 'build', 'cache', 'api'),
    buildDir: 'dist',
    routesDir: 'api',
    transformEntryName(name) {
      return name
      // .replace(/([^/]+)\/page\.js$/, '$1.js')
      // .replace(/\/\[([^\]]+)\]\/page\.js$/, '/[$1].js');
    },
    transformBundleName(name) {
      return name.replace(/:(\w+)/g, '[$1]');
    },
    buildRollupInput(routeFiles, srcRoutesDir) {
      cacheApis = buildCacheApiDir(routeFiles, srcRoutesDir);
      return cacheApis;
    },
    buildEnd() {
      // const vercelJson = {
      //   "version": 2,
      //   "routes": cacheApis.map(f => {
      //     const src = f
      //       .replace(platform.srcApisDir || '', '')
      //       .replace(/\/page\.(js|jsx|ts|tsx)$/, '')
      //       .replace(/\/:\w+/g, "/*") || '/';
      //     const dest = f
      //       .replace(platform.srcApisDir || '', 'api')
      //       .replace(/page\.(js|jsx|ts|tsx)$/, 'index.js')

      //     return { src, dest }
      //   })
      // };

      // writeFileSync('vercel.json', JSON.stringify(vercelJson, null, 2));
      // writeFileSync(`${platform?.buildDir}/vercel.json`, JSON.stringify(vercelJson, null, 2));

      for (const f of cacheApis.map(f => platform.transformBundleName(f
        .replace(platform.srcApisDir || '', join(platform.buildDir || '', 'api'))
        .replace(/page\.(ts|jsx|tsx)$/, 'index.js')
      ))) {
        writeFileSync(f, `import handler from './page.js';

export default async function (req, res) {
  await handler(req, res);
}`);
      }

      cacheApis.forEach(f => unlinkSync(f));
      rmSync(join('src', 'build'), { recursive: true, force: true });
    },
  }

  return platform;
}