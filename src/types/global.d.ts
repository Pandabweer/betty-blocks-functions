declare interface MappingItem {
  key: {
    kind: string;
    name: string;
  }[];
  value: unknown;
}

declare interface Blob {
  buffer(): Promise<ArrayBuffer>;
}

declare module "xlsx/xlsx.mjs" {
  export * from "xlsx";
}

interface CryptoJsWordArray {
  toString(encoder?: unknown): string;
}

interface CryptoJsModule {
  lib: {
    WordArray: {
      random?: (length: number) => CryptoJsWordArray;
    };
  };
  enc: {
    Hex: {
      parse(value: string): CryptoJsWordArray;
    };
    Base64: {
      stringify(value: CryptoJsWordArray): string;
    };
  };
  HmacSHA1(
    message: string | CryptoJsWordArray,
    key: string | CryptoJsWordArray,
  ): CryptoJsWordArray;
}

declare module "*.min.js" {
  const CryptoJS: CryptoJsModule;
  export default CryptoJS;
}
