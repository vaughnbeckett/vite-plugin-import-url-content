import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

function getFileName(urlStr) {
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

export function importUrlContent() {
  const stringPrefix = 'fetch-text::';
  const blobPrefix = 'fetch-blob::';
  const refPrefix = 'fetch-ref::';

  return {
    name: 'vite-plugin-import-url-content',

    resolveId(source: any) {
      if ([stringPrefix, blobPrefix, refPrefix].some(x => source.startsWith(x))) {
        return source;
      }
      return null;
    },

    async load(id: any) {
      const isStringImport = id.startsWith(stringPrefix);
      const isBlobImport = id.startsWith(blobPrefix);
      const isRefImport = id.startsWith(refPrefix);

      if (!(isStringImport || isBlobImport || isRefImport)) {
        return null;
      }

      const prefixLength = isStringImport ? stringPrefix.length : (isRefImport ? refPrefix.length : blobPrefix.length);
      const url = id.slice(prefixLength);

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
        const buffer = await response.arrayBuffer();
        if (isBlobImport) {
          const mimeType = response.headers.get('content-type') || 'application/octet-stream';
          const base64Data = Buffer.from(buffer).toString('base64');
          const dataUri = `data:${mimeType};base64,${base64Data}`;
          const escapedDataUri = JSON.stringify(dataUri);
          return `const dataUri = ${escapedDataUri}; export default dataUri;`;
        } else {
          const publicDir = 'public'
          const cacheSubDir = '_frc' //_fetch_ref_cache
          const fullCachePath = path.resolve(publicDir, cacheSubDir)
          const filename = getFileName(url)
          const hash = crypto.createHash('md5').update(url).digest('hex')
          const localFilePath = path.join(fullCachePath, hash, filename)
          const publicUrl = `/${cacheSubDir}/${hash}/${filename}`
          fs.mkdirSync(path.dirname(localFilePath), {recursive: true})
          fs.writeFileSync(localFilePath, Buffer.from(buffer))
          return `export default ${JSON.stringify(publicUrl)};`
        }
      }
    }
  };
}
