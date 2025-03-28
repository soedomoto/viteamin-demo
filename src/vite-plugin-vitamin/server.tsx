import express, { Request, Response } from 'express';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { JSX } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { fileURLToPath } from 'url';
import { Metadata, PageComponent as PageComponentType } from './page';
// import bodyParser from 'body-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

const app = express();
// app.use(bodyParser);
const appDir = join(__dirname, 'routes');

const streamResponse = (_req: Request, res: Response, el: JSX.Element) => {
  res.setHeader('Content-Type', 'text/html');
  
  const { pipe, abort } = renderToPipeableStream(el);
  const timeoutId = setTimeout(() => abort(), 10000);
  pipe(res);
  
  return () => clearTimeout(timeoutId);
};

// Function to compose layouts from root to leaf
const composeLayouts = (layouts: PageComponentType<object>[], PageComponent: PageComponentType<object>): PageComponentType<object> => {
  return (props) => layouts.reduceRight(
    (children, Layout) => <Layout {...props}>{children}</Layout>,
    <PageComponent {...props} />
  );
};

// Function to recursively load routes and collect layouts
async function loadRoutes(
  directory: string,
  basePath: string = '',
  parentLayouts: PageComponentType<object>[] = []
) {
  const items = readdirSync(directory);
  let localLayouts = [...parentLayouts];

  // Check for layout.js and add it to the layout stack
  if (items.includes('layout.js')) {
    const layoutModule = await import(`file://${join(directory, 'layout.js')}`);
    const LayoutComponent: PageComponentType<object> = layoutModule.default;
    localLayouts = [...localLayouts, LayoutComponent];
  }

  for (const item of items) {
    const fullPath = join(directory, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      const isDynamic = item.startsWith('[') && item.endsWith(']');
      const routeSegment = isDynamic ? `:${item.slice(1, -1)}` : item;
      await loadRoutes(fullPath, `${basePath}/${routeSegment}`, localLayouts);
    } else if (item === 'page.js') {
      const pageModule = await import(`file://${fullPath}`);
      const PageComponent: PageComponentType<object> = pageModule.default;
      
      const routePath = basePath === '' ? '/' : basePath;

      const routeHandler = (req: Request, res: Response) => {
        const vreq = {
          method: req.method,
          url: req.url,
          headers: req.headers,
          query: req.query as Record<string, string>,
          params: req.params,
          body: req.body,
          rawBody: req.body as string | Buffer | undefined, // Requires body-parser middleware with `rawBody` enabled
          ip: req.ip,
          getHeader(name: string): string | string[] | undefined {
              return req.headers[name.toLowerCase()];
          }
      }

        let metadata: Metadata | undefined = {};
        for (const e of Object.keys(pageModule)) {
          if (e === 'default') continue;
          if (pageModule[e] instanceof Metadata) {
            metadata = pageModule[e].generate?.(vreq, undefined);
          }
        }

        if (localLayouts.length > 0) {
          const ComposedComponent = composeLayouts(localLayouts, PageComponent);
          streamResponse(req, res, <ComposedComponent request={vreq} metadata={metadata} />);
        } else {
          streamResponse(req, res, <PageComponent request={vreq} metadata={metadata} />);
        }
      };

      app.get(routePath, routeHandler);
    }
  }
}

// Load all routes and start server
loadRoutes(appDir)
  .then(() => {
    app.listen(3000, () => {
      console.log('Server running on http://localhost:3000');
    });
  })
  .catch((err) => {
    console.error('Failed to load routes:', err);
  });

// Example directory structure:
// routes/
//   layout.js         // Root layout
//   page.js          // Root page
//   blog/
//     layout.js      // Blog layout
//     page.js        // Blog page
//     [id]/
//       layout.js    // Post layout
//       page.js      // Post page

// Example layout.js
/*
import React from 'react';
interface LayoutProps { children?: React.ReactNode; }
export default function Layout({ children }: LayoutProps) {
  return (
    <div>
      <header>Layout Header</header>
      {children}
      <footer>Layout Footer</footer>
    </div>
  );
}
*/

// Example page.js
/*
import React from 'react';
export default function Page() {
  return <main>Page Content</main>;
}
*/