/**
 * NativeWind's `global.css` is imported for its side effects only — the babel
 * preset compiles it away. TypeScript 6 rejects a side-effect import with no
 * type declarations (TS2882), so declare the module with no exports: importing
 * a binding from it should stay an error, since there is nothing to bind.
 */
declare module '*.css' {}
