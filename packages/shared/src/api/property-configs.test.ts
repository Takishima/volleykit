import { describe, expect, it } from 'vitest'

import * as propertyConfigs from './property-configs'

/**
 * `__identity` is a domain segment the endpoints resolve like any other, at the
 * root and nested; every other leading-underscore segment is framework-level.
 */
const DOMAIN_UNDERSCORE_SEGMENTS = ['__identity']

/**
 * `propertyRenderConfiguration` paths are resolved against the domain model, so
 * a framework-level path such as `_permissions` fails the whole search with a
 * 500 ("The field _permissions ... neither exists in the DB nor does it have a
 * custom select expression or property value provider"). Resolution runs at
 * every depth, so a nested `refereeGame._permissions` fails the same way.
 * Permissions are returned unasked - see docs/api/exchanges_api.md.
 *
 * Every exported config is checked, so one added later is covered without
 * touching this test.
 */
describe('property configurations', () => {
  it.each(Object.entries(propertyConfigs))(
    '%s requests no framework-level path',
    (_name, properties) => {
      const frameworkPaths = properties.filter((path) =>
        path
          .split('.')
          .some(
            (segment) => segment.startsWith('_') && !DOMAIN_UNDERSCORE_SEGMENTS.includes(segment)
          )
      )

      expect(frameworkPaths).toEqual([])
    }
  )
})
