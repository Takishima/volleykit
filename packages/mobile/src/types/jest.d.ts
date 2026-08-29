/**
 * Mobile runs jest without a config file, and TypeScript 6 does not pick up
 * `@types/jest` automatically under this tsconfig. Referencing it here keeps the
 * test globals available without setting `compilerOptions.types`, which would
 * drop every other ambient `@types` package from the program.
 */
/// <reference types="jest" />
