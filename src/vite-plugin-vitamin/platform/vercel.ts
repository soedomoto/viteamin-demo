import { mkdirSync, readFileSync, writeFileSync, unlinkSync, rmSync } from "fs";
import { UsePlatformFunction } from ".";
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

  return {
    srcApisDir: join('src', 'build', 'cache', 'api'),
    buildDir: 'dist',
    routesDir: 'api',
    transformPathName(name) {
      return name.replace(/:(\w+)/g, '[$1]');
    },
    buildRollupInput(routeFiles, srcRoutesDir) {
      cacheApis = buildCacheApiDir(routeFiles, srcRoutesDir);
      return cacheApis;
    },
    buildEnd() {
      cacheApis.forEach(f => unlinkSync(f));
      rmSync(join('src', 'build'), { recursive: true, force: true });
    },
  }
}