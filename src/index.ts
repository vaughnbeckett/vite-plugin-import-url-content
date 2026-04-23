import type { Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

function getFileName(urlStr: any) {
  try {
    const url = new URL(urlStr);
    let pathname = url.pathname;
    if (pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    const filename = pathname.split('/').pop();
    return decodeURIComponent(filename || '');
  } catch (e) {
    console.error("无效的 URL", e);
    return "";
  }
}

const virtualProtocol = '\0protocol:'
const subProtocol = ':'

export function importUrlContent(): Plugin {
  const name = 'vite-plugin-import-url-content'
  const stringPrefix = 'fetch-text::';
  const blobPrefix = 'fetch-blob::';
  const refPrefix = 'fetch-ref::';

  const CACHE_DIR = path.resolve(`node_modules/.cache/${name}`)
  const cacheSubDir = 'fetch_ref_cache'
  const assetCache = new Map<string, { buffer: Buffer; contentType: string }>()
  let isServe = false

  return {
    name,
    enforce: 'pre',

    configResolved(config) {
      isServe = config.command === 'serve' || config.mode === 'development'
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith(`/@${cacheSubDir}/`)) {
          const urlPath = req.url.split('?')[0]
          const cached = assetCache.get(urlPath)
          if (cached) {
            res.setHeader('Content-Type', cached.contentType)
            res.setHeader('Cache-Control', 'max-age=31536000')
            return res.end(cached.buffer)
          }
        }
        next()
      })
    },

    resolveId(source: any) {
      if ([stringPrefix, blobPrefix, refPrefix].some((x) => source.startsWith(x)))
        return virtualProtocol + encodeURIComponent(source);
      return null;
    },

    async load(id: any) {
      if (!id.startsWith(virtualProtocol))
        return null;
      id = decodeURIComponent(id.substring(virtualProtocol.length));
      const isStringImport = id.startsWith(stringPrefix);
      const isBlobImport = id.startsWith(blobPrefix);
      const isRefImport = id.startsWith(refPrefix);

      if (!(isStringImport || isBlobImport || isRefImport)) {
        return null;
      }

      const prefixLength = isStringImport ? stringPrefix.length : (isRefImport ? refPrefix.length : blobPrefix.length);
      let url = id.slice(prefixLength);

      let hashMode = false
      if (isRefImport && url.startsWith(subProtocol)) {
        hashMode = true;
        url = url.substring(subProtocol.length);
      }

      if (!url.startsWith('http')) {
        throw new Error(`Invalid URL provided: ${url}. Must start with http:// or https://`);
      }

      console.log(`[vite-plugin-import-url-content] Fetching content from: ${url}`);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch content from ${url}. Status: ${response.status}`);
      }

      if (isStringImport) {
        const content = await response.text();
        const escapedContent = JSON.stringify(content);
        return `const content = ${escapedContent}; export default content;`;
      } else {
        if (isBlobImport) {
          const buffer = await response.arrayBuffer();
          const mimeType = response.headers.get('content-type') || 'application/octet-stream';
          const base64Data = Buffer.from(buffer).toString('base64');
          const dataUri = `data:${mimeType};base64,${base64Data}`;
          const escapedDataUri = JSON.stringify(dataUri);
          return `const dataUri = ${escapedDataUri}; export default dataUri;`;
        } else {
          const fullCachePath = path.resolve(CACHE_DIR, cacheSubDir)
          const filename = getFileName(url)
          const hash = crypto.createHash('md5').update(
              hashMode ? subProtocol + url : url).digest('hex')
          let localFilePath = path.join(fullCachePath, hash)
          if (!hashMode){
            localFilePath = path.join(localFilePath, filename)
          }
          let buffer;
          if (fs.existsSync(localFilePath)) {
            buffer = fs.readFileSync(localFilePath)
          }else{
            buffer = Buffer.from(await response.arrayBuffer())
            fs.mkdirSync(path.dirname(localFilePath), {recursive: true})
            fs.writeFileSync(localFilePath, buffer)
          }
          if (isServe) {
            const virtualPath = `/@${cacheSubDir}/${hash}/${filename}`
            assetCache.set(virtualPath, { buffer, contentType:"application/octet-stream" })
            return `export default ${JSON.stringify(virtualPath)}`
          } else {
            const fileHandle = this.emitFile({
              type: 'asset',
              name: filename,
              source: buffer
            })
            return `export default import.meta.ROLLUP_FILE_URL_${fileHandle}`
          }
        }
      }
    }
  }
}
