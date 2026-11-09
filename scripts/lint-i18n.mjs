#!/usr/bin/env node
/**
 * Lint i18n (ENF-I18N-01) :
 *  1. parité stricte des clés entre les catalogues FR et EN ;
 *  2. aucun placeholder `{param}` présent d'un côté et absent de l'autre ;
 *  3. heuristique : aucune chaîne « en dur » évidente dans apps/web/src (hors tests / commentaires).
 *
 * Sortie non nulle si un problème est détecté.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problemes = [];

// 1 + 2 — catalogues
const frSrc = readFileSync(join(ROOT, 'packages/shared/src/i18n/fr.ts'), 'utf8');
const enSrc = readFileSync(join(ROOT, 'packages/shared/src/i18n/en.ts'), 'utf8');

const clesEtParams = (src) => {
  const map = new Map();
  const re = /'([a-z0-9]+(?:\.[a-z0-9]+)+)'\s*:\s*(?:'([^']*)'|"([^"]*)")/gi;
  let m;
  while ((m = re.exec(src)) !== null) {
    const val = m[2] ?? m[3] ?? '';
    const params = [...val.matchAll(/\{(\w+)\}/g)].map((x) => x[1]).sort();
    map.set(m[1], params.join(','));
  }
  return map;
};

const frMap = clesEtParams(frSrc);
const enMap = clesEtParams(enSrc);

for (const k of frMap.keys()) if (!enMap.has(k)) problemes.push(`clé absente de en.ts : ${k}`);
for (const k of enMap.keys()) if (!frMap.has(k)) problemes.push(`clé absente de fr.ts : ${k}`);
for (const [k, p] of frMap) {
  if (enMap.has(k) && enMap.get(k) !== p) {
    problemes.push(`placeholders divergents pour ${k} : fr(${p}) vs en(${enMap.get(k)})`);
  }
}

// 3 — heuristique texte en dur dans apps/web/src
const webSrc = join(ROOT, 'apps/web/src');
const walk = (dir) => {
  let out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out = out.concat(walk(full));
    else if (/\.(tsx|ts)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
};

let fichiersWeb = [];
try {
  fichiersWeb = walk(webSrc);
} catch {
  /* apps/web pas encore présent */
}

for (const f of fichiersWeb) {
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, '');
    // Texte JSX visible : > Mot ... < contenant au moins une lettre et un espace, hors {t(...)}
    const jsxText = code.match(/>\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' ]{3,})\s*</);
    if (jsxText && !/[{}]/.test(jsxText[1]) && !/aria-|data-/.test(code)) {
      problemes.push(`${relative(ROOT, f)}:${i + 1} texte JSX possiblement en dur : "${jsxText[1].trim()}"`);
    }
  });
}

if (problemes.length) {
  console.error('✗ lint i18n — problèmes détectés :');
  for (const p of problemes) console.error('  - ' + p);
  process.exit(1);
}
console.log(`✓ lint i18n — ${frMap.size} clés, parité FR/EN OK, ${fichiersWeb.length} fichiers web scannés`);
