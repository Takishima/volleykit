import { describe, expect, it } from 'vitest'

import {
  ASSIGNMENT_PROPERTIES,
  COMPENSATION_PROPERTIES,
  EXCHANGE_PROPERTIES,
  REFEREE_BACKUP_PROPERTIES,
} from './property-configs'

/**
 * `propertyRenderConfiguration` paths are resolved against the domain model, so
 * a framework-level path such as `_permissions` fails the whole search with a
 * 500 ("The field _permissions ... neither exists in the DB nor does it have a
 * custom select expression or property value provider"). The block is returned
 * unasked - see docs/api/exchanges_api.md.
 */
describe('property configurations', () => {
  it.each([
    ['ASSIGNMENT_PROPERTIES', ASSIGNMENT_PROPERTIES],
    ['COMPENSATION_PROPERTIES', COMPENSATION_PROPERTIES],
    ['EXCHANGE_PROPERTIES', EXCHANGE_PROPERTIES],
    ['REFEREE_BACKUP_PROPERTIES', REFEREE_BACKUP_PROPERTIES],
  ])('%s requests no framework-level path', (_name, properties) => {
    expect(properties.filter((path) => path.startsWith('_'))).toEqual([])
  })
})
