# Budget Topology

预算调整拓扑图原型页面。

## Links

- GitHub: https://github.com/hyin9412/budget-topology
- GitHub Pages: https://hyin9412.github.io/budget-topology/

## Local Build

```bash
PATH=/opt/homebrew/bin:$PATH npm run build
```

`vite.config.ts` uses `base: '/budget-topology/'` so built assets work under the GitHub Pages subpath.

## Deployment

Current deployment publishes the local `dist/` output directly to the `gh-pages` branch.

The project depends on packages resolved through the internal BNPM registry, so relying on a public GitHub Actions runner for dependency installation is not the preferred release path.
