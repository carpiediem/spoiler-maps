import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// src/lib is organized by who uses it: lib/view/ for the view screen's own
// logic, lib/editor/ for the editor's, and the top level for code both share
// (or that isn't tied to either). These tests keep that layering from
// eroding, e.g. by view code quietly reaching into editor internals.

const LIB_DIR = resolve(__dirname);
const SRC_DIR = resolve(LIB_DIR, '..');

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

/** Every relative import in `file`, as an absolute path without an extension. */
function relativeImports(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  const specifiers = [...source.matchAll(/(?:from|import|mock)\s*\(?\s*'(\.{1,2}\/[^']*)'/g)];
  return specifiers.map((match) => resolve(dirname(file), match[1]!));
}

function zone(file: string): 'view' | 'editor' | 'shared' {
  const first = relative(LIB_DIR, file).split(/[\\/]/)[0];
  return first === 'view' || first === 'editor' ? first : 'shared';
}

const libFiles = listFiles(LIB_DIR).filter((file) => !file.endsWith('architecture.test.ts'));

describe('src/lib layering', () => {
  it('finds the lib files it is meant to check', () => {
    expect(libFiles.length).toBeGreaterThan(20);
    expect(libFiles.some((file) => zone(file) === 'view')).toBe(true);
    expect(libFiles.some((file) => zone(file) === 'editor')).toBe(true);
  });

  it('never imports from components or screens', () => {
    const offenders = libFiles.flatMap((file) =>
      relativeImports(file)
        .filter((target) => {
          const top = relative(SRC_DIR, target).split(/[\\/]/)[0];
          return top === 'components' || top === 'screens';
        })
        .map((target) => `${relative(SRC_DIR, file)} -> ${relative(SRC_DIR, target)}`),
    );

    expect(offenders).toEqual([]);
  });

  it('keeps view/ and editor/ from importing each other', () => {
    const offenders = libFiles.flatMap((file) => {
      const from = zone(file);
      if (from === 'shared') return [];
      const other = from === 'view' ? 'editor' : 'view';
      return relativeImports(file)
        .filter((target) => zone(target) === other && target.startsWith(join(LIB_DIR, other)))
        .map((target) => `${relative(SRC_DIR, file)} -> ${relative(SRC_DIR, target)}`);
    });

    expect(offenders).toEqual([]);
  });

  it('keeps shared top-level files from depending on view/ or editor/', () => {
    const offenders = libFiles
      .filter((file) => zone(file) === 'shared')
      .flatMap((file) =>
        relativeImports(file)
          .filter(
            (target) =>
              target.startsWith(join(LIB_DIR, 'view')) ||
              target.startsWith(join(LIB_DIR, 'editor')),
          )
          .map((target) => `${relative(SRC_DIR, file)} -> ${relative(SRC_DIR, target)}`),
      );

    expect(offenders).toEqual([]);
  });
});
