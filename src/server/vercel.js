import { jsx } from "react/jsx-runtime";
import express from "express";
import { renderToPipeableStream } from "react-dom/server";
const _routes = '{\n  "/": {\n    "page": "routes/page.js",\n    "layouts": [\n      "routes/layout.js"\n    ]\n  },\n  "/user/:id/": {\n    "page": "routes/user/:id/page.js",\n    "layouts": [\n      "routes/user/:id/layout.js",\n      "routes/layout.js"\n    ]\n  }\n}';
let routes = {};
try {
  routes = JSON.parse(_routes);
} catch (err) {
}
const streamResponse = (_req, res, el) => {
  res.setHeader("Content-Type", "text/html");
  const { pipe, abort } = renderToPipeableStream(el);
  const timeoutId = setTimeout(() => abort(), 1e4);
  pipe(res);
  return () => clearTimeout(timeoutId);
};
const composeLayouts = (layouts, PageComponent) => {
  return (props) => layouts.reduceRight(
    (children, Layout) => /* @__PURE__ */ jsx(Layout, { ...props, children }),
    /* @__PURE__ */ jsx(PageComponent, { ...props })
  );
};
const app = express();
for (const routePath of Object.keys(routes)) {
  app.get(routePath, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const vreq = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: req.query,
      params: req.params,
      body: req.body,
      rawBody: req.body,
      // Requires body-parser middleware with `rawBody` enabled
      ip: req.ip,
      getHeader(name) {
        return req.headers[name.toLowerCase()];
      }
    };
    const pageModule = await ((_a = routes[routePath]) == null ? import(void 0) : import(_a.page));
    const PageComponent = pageModule.default;
    let metadata = {};
    for (const e of Object.keys(pageModule)) {
      if (e === "default") continue;
      if (((_c = (_b = pageModule[e]) == null ? void 0 : _b.constructor) == null ? void 0 : _c.name) === "Metadata") {
        metadata = (_e = (_d = pageModule[e]).generate) == null ? void 0 : _e.call(_d, vreq, void 0);
      }
    }
    if ((((_f = routes[routePath]) == null ? void 0 : _f.layouts) || []).length > 0) {
      const localLayouts = await Promise.all((_h = (_g = routes[routePath]) == null ? void 0 : _g.layouts) == null ? void 0 : _h.map(async (l) => {
        const pageModule2 = await import(l);
        const LayoutComponent = pageModule2.default;
        return LayoutComponent;
      }));
      const ComposedComponent = composeLayouts(localLayouts, PageComponent);
      streamResponse(req, res, /* @__PURE__ */ jsx(ComposedComponent, { request: vreq, metadata }));
    } else {
      streamResponse(req, res, /* @__PURE__ */ jsx(PageComponent, { request: vreq, metadata }));
    }
  });
}
export {
  app as default
};
