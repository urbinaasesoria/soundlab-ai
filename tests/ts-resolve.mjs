/**
 * Resolvedor ESM para ejecutar el código TypeScript fuente directamente en
 * Node (sin bundler). Añade la extensión `.ts` y resuelve `/index.ts` cuando
 * el especificador relativo no incluye extensión, igual que hace Vite.
 *
 * Uso: node --import ./tests/register.mjs tests/engine.test.ts
 */
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") || specifier.startsWith("/")) {
    const base = context.parentURL ? dirname(fileURLToPath(context.parentURL)) : process.cwd();
    const target = resolvePath(base, specifier);
    const candidates = [target, `${target}.ts`, `${target}.tsx`, `${target}.mjs`, `${target}.js`];
    for (const candidate of candidates) {
      if (existsSync(candidate) && !candidate.endsWith("/")) {
        try {
          return await nextResolve(pathToFileURL(candidate).href, context);
        } catch {
          /* probar el siguiente candidato */
        }
      }
    }
    const asDir = resolvePath(target, "index.ts");
    if (existsSync(asDir)) return nextResolve(pathToFileURL(asDir).href, context);
  }
  return nextResolve(specifier, context);
}
