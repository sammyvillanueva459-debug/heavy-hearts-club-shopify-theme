// Runs Shopify Theme Check against the theme using .theme-check.yml.
// Exits non-zero on any error-severity offense.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { check, Severity } from '@shopify/theme-check-node';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const offenses = await check(root, path.join(root, '.theme-check.yml'));
const names = { [Severity.ERROR]: 'error', [Severity.WARNING]: 'warning', [Severity.INFO]: 'info' };

for (const o of offenses) {
  const rel = path.relative(root, new URL(o.uri).pathname);
  console.log(`${names[o.severity]}  ${rel}:${o.start.line + 1}  ${o.check}: ${o.message}`);
}
const errors = offenses.filter((o) => o.severity === Severity.ERROR).length;
console.log(`\n${offenses.length} offenses (${errors} errors)`);
process.exit(errors > 0 ? 1 : 0);
