/* eslint-disable @typescript-eslint/no-unused-vars */

import express, { Request, Response } from 'express';
import { Metadata, PageComponent as PageComponentType } from './page';
import { renderToPipeableStream } from 'react-dom/server';
import { JSX } from 'react';
import _routes from '../../dist/routes.json?raw';

let routes: Record<string, {page: string, layouts: []}> = {};
try {
  routes = JSON.parse(_routes);
} catch (err) {
  //
}

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

const app = express();
for (const routePath of Object.keys(routes)) {
  app.get(routePath, async (req: Request, res: Response) => {
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

    const pageModule = await import(routes[routePath]?.page);
    const PageComponent: PageComponentType<object> = pageModule.default;

    let metadata: Metadata | undefined = {};
    for (const e of Object.keys(pageModule)) {
      if (e === 'default') continue;
      if (pageModule[e]?.constructor?.name === 'Metadata') {
        metadata = pageModule[e].generate?.(vreq, undefined);
      }
    }

    if ((routes[routePath]?.layouts || []).length > 0) {
      const localLayouts = await Promise.all(routes[routePath]?.layouts?.map(async (l) => {
        const pageModule = await import(l);
        const LayoutComponent: PageComponentType<object> = pageModule.default;
        return LayoutComponent;
      }))

      const ComposedComponent = composeLayouts(localLayouts, PageComponent);
      streamResponse(req, res, <ComposedComponent request={vreq} metadata={metadata} />);
    } else {
      streamResponse(req, res, <PageComponent request={vreq} metadata={metadata} />);
    }
  });
}

export default app;