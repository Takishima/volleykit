/**
 * Ambient type declarations for platform-agnostic globals.
 *
 * The shared package intentionally excludes the DOM lib to prevent accidental
 * use of browser-only APIs (document, window, localStorage, etc.) in code
 * that must also run on React Native. These declarations provide types only
 * for the subset of web APIs available in both environments.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// fetch API — available in browsers, React Native, and Node 18+
declare function fetch(input: string | URL | Request, init?: RequestInit): Promise<Response>

declare class Request {
  constructor(input: string | URL | Request, init?: RequestInit)
  readonly url: string
  readonly method: string
  readonly headers: Headers
  readonly body: ReadableStream<Uint8Array> | null
  clone(): Request
  json(): Promise<any>
  text(): Promise<string>
}

declare class Response {
  constructor(body?: BodyInit | null, init?: ResponseInit)
  readonly ok: boolean
  readonly status: number
  readonly statusText: string
  readonly headers: Headers
  readonly body: ReadableStream<Uint8Array> | null
  readonly type: ResponseType
  readonly url: string
  clone(): Response
  json(): Promise<any>
  text(): Promise<string>
}

type ResponseType = 'basic' | 'cors' | 'default' | 'error' | 'opaque' | 'opaqueredirect'

interface ResponseInit {
  status?: number
  statusText?: string
  headers?: HeadersInit
}

declare class Headers {
  constructor(init?: HeadersInit)
  append(name: string, value: string): void
  delete(name: string): void
  get(name: string): string | null
  has(name: string): boolean
  set(name: string, value: string): void
  forEach(callbackfn: (value: string, key: string, parent: Headers) => void): void
}

type HeadersInit = Headers | Record<string, string> | [string, string][]
type BodyInit =
  | string
  | Blob
  | ArrayBuffer
  | FormData
  | URLSearchParams
  | ReadableStream<Uint8Array>

interface RequestInit {
  method?: string
  headers?: HeadersInit
  body?: BodyInit | null
  signal?: AbortSignal
  credentials?: 'include' | 'omit' | 'same-origin'
  mode?: 'cors' | 'navigate' | 'no-cors' | 'same-origin'
  cache?: 'default' | 'force-cache' | 'no-cache' | 'no-store' | 'only-if-cached' | 'reload'
  redirect?: 'error' | 'follow' | 'manual'
}

// AbortController — available in browsers, React Native, and Node 15+
declare class AbortController {
  readonly signal: AbortSignal
  abort(reason?: any): void
}

declare class AbortSignal {
  readonly aborted: boolean
  readonly reason: any
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void
}

// Timers — available in all JS environments
declare function setTimeout(
  callback: (...args: any[]) => void,
  ms?: number,
  ...args: any[]
): ReturnType<typeof setTimeout>
declare function clearTimeout(id: ReturnType<typeof setTimeout>): void
declare function setInterval(
  callback: (...args: any[]) => void,
  ms?: number,
  ...args: any[]
): ReturnType<typeof setInterval>
declare function clearInterval(id: ReturnType<typeof setInterval>): void

// Web Crypto — available in browsers, React Native, and Node 15+
declare const crypto: {
  randomUUID(): string
  getRandomValues<T extends ArrayBufferView>(array: T): T
  subtle: SubtleCrypto
}

interface SubtleCrypto {
  digest(algorithm: string, data: ArrayBuffer | ArrayBufferView): Promise<ArrayBuffer>
}

// URL — available in browsers, React Native, and Node 10+
declare class URL {
  constructor(url: string, base?: string | URL)
  hash: string
  host: string
  hostname: string
  href: string
  readonly origin: string
  password: string
  pathname: string
  port: string
  protocol: string
  search: string
  readonly searchParams: URLSearchParams
  username: string
  toString(): string
  toJSON(): string
}

declare class URLSearchParams {
  constructor(init?: string | Record<string, string> | [string, string][] | URLSearchParams)
  append(name: string, value: string): void
  delete(name: string): void
  get(name: string): string | null
  getAll(name: string): string[]
  has(name: string): boolean
  set(name: string, value: string): void
  sort(): void
  toString(): string
  forEach(callbackfn: (value: string, key: string, parent: URLSearchParams) => void): void
}

// FormData — available in browsers and React Native
declare class FormData {
  append(name: string, value: string | Blob, fileName?: string): void
  delete(name: string): void
  get(name: string): FormDataEntryValue | null
  getAll(name: string): FormDataEntryValue[]
  has(name: string): boolean
  set(name: string, value: string | Blob, fileName?: string): void
}

type FormDataEntryValue = File | string

declare class Blob {
  constructor(blobParts?: BlobPart[], options?: BlobPropertyBag)
  readonly size: number
  readonly type: string
  slice(start?: number, end?: number, contentType?: string): Blob
  text(): Promise<string>
  arrayBuffer(): Promise<ArrayBuffer>
}

type BlobPart = string | Blob | ArrayBuffer | ArrayBufferView

interface BlobPropertyBag {
  type?: string
}

declare class File extends Blob {
  constructor(fileBits: BlobPart[], fileName: string, options?: FilePropertyBag)
  readonly name: string
  readonly lastModified: number
}

interface FilePropertyBag extends BlobPropertyBag {
  lastModified?: number
}

// ReadableStream — available in browsers, React Native, and Node 16+
declare class ReadableStream<R = any> {
  readonly locked: boolean
  cancel(reason?: any): Promise<void>
  getReader(): ReadableStreamDefaultReader<R>
}

declare class ReadableStreamDefaultReader<R = any> {
  readonly closed: Promise<undefined>
  cancel(reason?: any): Promise<void>
  read(): Promise<ReadableStreamReadResult<R>>
  releaseLock(): void
}

type ReadableStreamReadResult<T> = { done: false; value: T } | { done: true; value: undefined }

// EventTarget types used by AbortSignal
interface EventListenerOrEventListenerObject {
  (evt: Event): void
}

interface Event {
  readonly type: string
}

// Console — available in all JS environments
declare const console: {
  log(...data: any[]): void
  warn(...data: any[]): void
  error(...data: any[]): void
  info(...data: any[]): void
  debug(...data: any[]): void
}
