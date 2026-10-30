import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// The product's core claim is that a withheld answer looks exactly like an
// absent one. Any component, class or copy that names a restriction would
// break that claim, so the vocabulary is asserted, not reviewed by hand.

const ROOTS = ['components', 'app'];
const EXTENSIONS = ['.ts', '.tsx', '.css'];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return EXTENSIONS.some((ext) => full.endsWith(ext)) ? [full] : [];
  });
}

const files = ROOTS.flatMap(walk).map((path) => ({ path, text: readFileSync(path, 'utf8') }));

describe('permission invisibility (T05)', () => {
  it('has no forbidden, denied, locked, restricted or hidden-count tell anywhere in the UI', () => {
    const tells = /\b(forbidden|accessdenied|denied|locked|restricted|terbatas|hidden-count|hiddencount)\b/i;
    const offenders = files.filter((f) => tells.test(f.text)).map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it('does not render a count of withheld items', () => {
    const pattern = /\b\d+\s+(hidden|disembunyikan|tersembunyi)\b/i;
    expect(files.filter((f) => pattern.test(f.text)).map((f) => f.path)).toEqual([]);
  });
});

describe('status vocabulary is closed (T15)', () => {
  const view = readFileSync('components/answer/AnswerView.tsx', 'utf8');

  it('defines exactly five pill states', () => {
    const keys = [...view.matchAll(/^\s{2}(\w+):\s*'pill pill-/gm)].map((m) => m[1]);
    expect(keys.sort()).toEqual(['approved', 'blocked', 'cancelled', 'open', 'overdue']);
  });

  it('does not define a restricted pill', () => {
    expect(view).not.toMatch(/restricted|terbatas/i);
  });
});
