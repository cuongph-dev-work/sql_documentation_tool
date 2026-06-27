import type { DatabaseDoc } from "../model/database-doc";

export type ParserInput = {
  schemaPath: string;
};

export type ExportOptions = {
  outDir: string;
};

export interface ParserPlugin {
  name: string;
  parse(input: ParserInput): Promise<DatabaseDoc>;
}

export interface ExporterPlugin {
  name: string;
  export(doc: DatabaseDoc, options: ExportOptions): Promise<void>;
}

export interface EnricherPlugin {
  name: string;
  enrich(doc: DatabaseDoc): Promise<DatabaseDoc>;
}
