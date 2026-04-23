import type { Plugin, ViteDevServer } from 'vite'
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

  const resDir = '.res'
  const workDir = `${resDir}/vpiuc`
  let publicDir = '';

  return {
    name,
    enforce: 'pre',
    config(userConfig) {
      publicDir = userConfig.publicDir || 'public'
      const targetIgnore = `${publicDir}/${resDir}/**`
      const existing = userConfig.server?.watch?.ignored
      const newIgnored = Array.isArray(existing)
          ? [...existing, targetIgnore]
          : existing
              ? [existing, targetIgnore]
              : [targetIgnore]
      return {
        server: {
          watch: {
            ignored: newIgnored
          }
        }
      };
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
          const fullCachePath = path.resolve(publicDir, workDir)
          const filename = getFileName(url)
          const hash = crypto.createHash('md5').update(
              hashMode ? subProtocol + url : url).digest('hex')
          let localFilePath = path.join(fullCachePath, hash)
          let publicUrl = `/${workDir}/${hash}`
          if (!hashMode){
            localFilePath = path.join(localFilePath, filename)
            publicUrl = `${publicUrl}/${filename}`
          }
          if (!fs.existsSync(localFilePath)) {
            const buffer = await response.arrayBuffer();
            fs.mkdirSync(path.dirname(localFilePath), {recursive: true})
            fs.writeFileSync(localFilePath, Buffer.from(buffer))
          }
          return `export default ${JSON.stringify(publicUrl)};`
        }
      }
    }
  };
}
