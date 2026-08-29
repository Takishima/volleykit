import { describe, expect, it } from 'vitest'

import * as propertyConfigs from './property-configs'

/**
 * `__identity` is a domain path the endpoints resolve like any other; every
 * other leading-underscore path is framework-level.
 */
const DOMAIN_UNDERSCORE_PATHS = ['__identity']

/**
 * `propertyRenderConfiguration` paths are resolved against the domain model, so
 * a framework-level path such as `_permissions` fails the whole search with a
 * 500 ("The field _permissions ... neither exists in the DB nor does it have a
 * custom select expression or property value provider"). Permissions are
 * returned unasked - see docs/api/exchanges_api.md.
 *
 * Every exported config is checked, so one added later is covered without
 * touching this test.
 */
describe('property configurations', () => {
  it.each(Object.entries(propertyConfigs))(
    '%s requests no framework-level path',
    (_name, properties) => {
      const frameworkPaths = properties.filter((path) => {
        const [root] = path.split('.')
        return root.startsWith('_') && !DOMAIN_UNDERSCORE_PATHS.includes(root)
      })

      expect(frameworkPaths).toEqual([])
    }
  )
})
