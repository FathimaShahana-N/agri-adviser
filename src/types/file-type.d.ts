// file-type v22 is ESM-only and its published types require a
// "bundler"/"nodenext" moduleResolution to resolve via package "exports".
// This project stays on CommonJS + dynamic import() for that one module,
// so this minimal ambient declaration lets TS type-check the parts of the
// API we actually use without fighting module resolution.
declare module "file-type" {
  export interface FileTypeResult {
    ext: string;
    mime: string;
  }

  export function fileTypeFromBuffer(
    input: Uint8Array | ArrayBuffer
  ): Promise<FileTypeResult | undefined>;
}
