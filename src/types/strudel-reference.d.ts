declare module "@strudel/reference" {
  interface DocParam {
    name: string;
    type?: { names: string[] };
    description?: string;
  }

  interface DocEntry {
    name: string;
    description?: string;
    comment?: string;
    params?: DocParam[];
    examples?: string[];
    synonyms?: string[];
    synonyms_text?: string;
    memberof?: string;
    longname?: string;
    kind?: string;
    scope?: string;
    returns?: { description?: string }[];
    meta?: {
      filename?: string;
      lineno?: number;
      columnno?: number;
      path?: string;
      code?: Record<string, unknown>;
    };
  }

  export const reference: {
    docs: DocEntry[];
  };
}
