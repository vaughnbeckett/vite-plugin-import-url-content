declare module 'fetch-text::*' {
    const content: string;
    export default content;
}

declare module 'fetch-blob::*' {
    const dataUri: string;
    export default dataUri;
}

declare module 'fetch-ref::*' {
    const url: string;
    export default url;
}
