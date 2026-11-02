import { describe, it, expect } from 'vitest'

import { buildCspValue, collectRemoteOrigins, injectCspMeta, inlineScriptHashes } from './csp'

describe('collectRemoteOrigins', () => {
  it('keeps static origins and adds origins from env values', () => {
    const origins = collectRemoteOrigins(
      ['https://static.example'],
      ['https://proxy.example', 'https://a.example,https://b.example']
    )
    expect(origins).toEqual([
      'https://static.example',
      'https://proxy.example',
      'https://a.example',
      'https://b.example',
    ])
  })

  it('reduces full URLs to their origin and deduplicates', () => {
    const origins = collectRemoteOrigins(
      ['https://proxy.example'],
      ['https://proxy.example/ocr', ' https://proxy.example ']
    )
    expect(origins).toEqual(['https://proxy.example'])
  })

  it('ignores empty, undefined and unparseable values', () => {
    const origins = collectRemoteOrigins([], [undefined, '', 'not a url', ' , '])
    expect(origins).toEqual([])
  })
})

describe('inlineScriptHashes', () => {
  it('hashes inline scripts and skips external and empty ones', async () => {
    const html = [
      '<script>alert(1)</script>',
      '<script type="module" src="/app.js"></script>',
      '<script>   </script>',
      '<script type="text/javascript">\n  var x = 1;\n</script>',
    ].join('\n')

    const hashes = await inlineScriptHashes(html)

    // Known SHA-256 of "alert(1)"
    expect(hashes[0]).toBe("'sha256-bhHHL3z2vDgxUt0W3dWQOrprscmda2Y5pLsLg4GF+pI='")
    expect(hashes).toHaveLength(2)
    expect(hashes[1]).toMatch(/^'sha256-[A-Za-z0-9+/]+=*'$/)
  })

  it('returns no hashes when there are no inline scripts', async () => {
    await expect(inlineScriptHashes('<html><body></body></html>')).resolves.toEqual([])
  })
})

describe('buildCspValue', () => {
  it('allows own origin, hashed inline scripts and the remote origins', () => {
    const csp = buildCspValue(['https://api.example'], ["'sha256-abc='"])

    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("script-src 'self' 'sha256-abc='")
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'")
    expect(csp).toContain("connect-src 'self' https://api.example")
    expect(csp).toContain("img-src 'self' data: blob: https://api.example")
    expect(csp).toContain("object-src 'self' blob:")
  })
})

describe('injectCspMeta', () => {
  it('inserts the meta tag right after the charset declaration', () => {
    const html = '<head>\n    <meta charset="UTF-8" />\n    <title>x</title></head>'

    const result = injectCspMeta(html, "default-src 'self'")

    expect(result).toContain(
      '<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="default-src \'self\'" />'
    )
  })

  it('throws instead of shipping without a policy when the marker is missing', () => {
    expect(() => injectCspMeta('<head><meta charset="utf-8"></head>', 'x')).toThrow(
      /CSP injection failed/
    )
  })
})
