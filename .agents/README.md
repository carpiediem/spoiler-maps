# Agent skills

Skills installed here (see `../skills-lock.json`) are also exposed to Claude Code through the `.claude/skills` symlink.

## Accepted risks from `vite-react-best-practices` reviews

These findings were reviewed and deliberately left as they are, so future reviews shouldn't re-raise them.

- **Vite's 500 kB chunk-size warning.** `vite build` still warns about the lazy-loaded description editor chunk (Tiptap + ProseMirror, ~610 kB). It only downloads the first time someone opens the description dialog, so it doesn't affect initial load, and splitting it further would just fragment a library that's always used together. The warning stays visible on purpose, so a new large chunk in the initial load doesn't slip in unnoticed.
