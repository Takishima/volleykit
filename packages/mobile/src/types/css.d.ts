/**
 * NativeWind's `global.css` is imported for its side effects only — the babel
 * preset compiles it away. TypeScript 6 rejects a side-effect import with no
 * type declarations (TS2882), so declare the module shape here.
 */
declare module '*.css' {
  const content: string
  export default content
}
