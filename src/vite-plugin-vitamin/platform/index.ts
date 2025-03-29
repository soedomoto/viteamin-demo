export type TargetPlatform = 'vercel' | 'express';
export type Platform = {
  srcApisDir?: string;
  buildDir: string;
  routesDir: string;
  transformEntryName: (name: string) => string;
  transformBundleName: (name: string) => string;
  buildRollupInput: (routeFiles: string[], srcRoutesDir: string) => string[];
  buildEnd?: () => void
}
export type UsePlatformFunction = () => Platform;