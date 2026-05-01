# Caveman vendored files

The following files in this `.claude/` directory are derived from
[JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) and are
vendored here so caveman activates in every Claude Code session that opens
this repo (local CLI, Claude Code on the web, and the `claude.yml` GitHub
Action) without requiring a per-machine plugin install.

- `hooks/caveman-activate.sh` — derived from `hooks/caveman-activate.js` and `skills/caveman/SKILL.md`
- `commands/caveman.md` — derived from `commands/caveman.toml` and `skills/caveman/SKILL.md`
- `commands/caveman-review.md` — derived from `commands/caveman-review.toml` and `skills/caveman-review/SKILL.md`
- `commands/caveman-commit.md` — derived from `commands/caveman-commit.toml` and `skills/caveman-commit/SKILL.md`

To resync against upstream, see `https://github.com/JuliusBrussee/caveman` and
re-derive the files above. Statusline, mode tracker, stats, MCP shrink, and
cavecrew subagents from the upstream plugin are intentionally not vendored.

## Upstream license

```
MIT License

Copyright (c) 2026 Julius Brussee

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
