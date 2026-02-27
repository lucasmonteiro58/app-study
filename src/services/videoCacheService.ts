const CACHE_NAME = 'drivestudy-videos-v1'

const cacheKey = (fileId: string) => `/cached-video/${fileId}`

/** Returns a blob URL if the video is already cached, otherwise null. */
export async function getCachedVideo(fileId: string): Promise<string | null> {
  if (!('caches' in window)) return null
  try {
    const cache = await caches.open(CACHE_NAME)
    const cached = await cache.match(cacheKey(fileId))
    if (!cached) return null
    const blob = await cached.blob()
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

/** Saves a video blob to the cache. */
export async function setCachedVideo(
  fileId: string,
  blob: Blob,
): Promise<void> {
  if (!('caches' in window)) return
  try {
    const cache = await caches.open(CACHE_NAME)
    await cache.put(
      cacheKey(fileId),
      new Response(blob, { headers: { 'Content-Type': blob.type } }),
    )
  } catch {
    // Quota exceeded or private browsing — silently ignore
  }
}

/** Removes a single cached video. */
export async function deleteCachedVideo(fileId: string): Promise<void> {
  if (!('caches' in window)) return
  try {
    const cache = await caches.open(CACHE_NAME)
    await cache.delete(cacheKey(fileId))
  } catch { /* ignore */ }
}

/** Returns true if the video is in the cache. */
export async function isVideoCached(fileId: string): Promise<boolean> {
  if (!('caches' in window)) return false
  try {
    const cache = await caches.open(CACHE_NAME)
    return !!(await cache.match(cacheKey(fileId)))
  } catch {
    return false
  }
}

/** Returns approximate size of all cached videos in MB. */
export async function getCacheSize(): Promise<number> {
  if (!('caches' in window) || !('storage' in navigator)) return 0
  try {
    const estimate = await navigator.storage.estimate()
    return Math.round(((estimate.usage ?? 0) / (1024 * 1024)) * 10) / 10
  } catch {
    return 0
  }
}
