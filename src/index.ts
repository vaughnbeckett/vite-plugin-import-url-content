export function importUrlContent() {
  const stringPrefix = 'fetch-text::';
  const blobPrefix = 'fetch-blob::';

  return {
    name: 'vite-plugin-import-url-content',

    resolveId(source: any) {
      if (source.startsWith(stringPrefix) || source.startsWith(blobPrefix)) {
        return source;
      }
      return null;
    },

    async load(id: any) {
      const isStringImport = id.startsWith(stringPrefix);
      const isBlobImport = id.startsWith(blobPrefix);

      if (!isStringImport && !isBlobImport) {
        return null;
      }

      // 提取原始 URL
      const prefixLength = isStringImport ? stringPrefix.length : blobPrefix.length;
      const url = id.slice(prefixLength);

      if (!url.startsWith('http')) {
        throw new Error(`Invalid URL provided: ${url}. Must start with http:// or https://`);
      }

      console.log(`[vite-plugin-import-url-content] Fetching content from: ${url}`);

      try {
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch content from ${url}. Status: ${response.status}`);
        }

        if (isStringImport) {
          const content = await response.text();
          const escapedContent = JSON.stringify(content);
          return `const content = ${escapedContent}; export default content;`;
        }

        if (isBlobImport) {
          const buffer = await response.arrayBuffer();
          const mimeType = response.headers.get('content-type') || 'application/octet-stream';

          const base64Data = Buffer.from(buffer).toString('base64');
          const dataUri = `data:${mimeType};base64,${base64Data}`;
          const escapedDataUri = JSON.stringify(dataUri);

          return `const dataUri = ${escapedDataUri}; export default dataUri;`;
        }

      } catch (error: any) {
        throw new Error(`Network error while fetching ${url}: ${error.message}`);
      }
      return null;
    }
  };
}
