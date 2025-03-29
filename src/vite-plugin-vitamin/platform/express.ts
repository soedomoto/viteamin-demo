import { UsePlatformFunction } from ".";

export const usingExpress: UsePlatformFunction = () => {
  return {
    srcApisDir: 'src/routes',
    buildDir: 'dist',
    routesDir: 'routes',
    transformPathName(name) {
      return name;
    },
    buildRollupInput(routeFiles) {
      return routeFiles;
    },
  }
}