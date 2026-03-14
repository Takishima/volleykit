/** Check if a URL points to an image based on its path extension */
export function isImageUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    return pathname.endsWith('.jpg') || pathname.endsWith('.jpeg') || pathname.endsWith('.png')
  } catch {
    return false
  }
}
