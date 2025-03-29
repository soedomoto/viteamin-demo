import { UsePlatformFunction } from ".";

export const usingExpress: UsePlatformFunction = () => {
  return {
    srcApisDir: 'src/routes',
    buildDir: 'dist',
    routesDir: 'routes',
    transformEntryName(name) {
      return name;
    },
    transformBundleName(name) {
      return name;
    },
    buildRollupInput(routeFiles) {
      return routeFiles;
    },
  }
}