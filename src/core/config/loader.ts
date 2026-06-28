import { cosmiconfig } from "cosmiconfig";
import {
  dbdocgenConfigSchema,
  type DbdocgenConfig,
  type OutputFormat
} from "./schema";

type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

export type CliConfigOptions = {
  schema?: string;
  dialect?: "postgres" | "mysql" | "mariadb" | "sqlite" | "mssql" | "unknown";
  outDir?: string;
  formats?: OutputFormat[];
  configPath?: string;
};

export type LoadConfigInput = {
  cwd: string;
  cliOptions: CliConfigOptions;
};

export async function loadConfig(
  input: LoadConfigInput
): Promise<DbdocgenConfig> {
  const explorer = cosmiconfig("dbdocgen", {
    searchPlaces: ["dbdocgen.config.js", "dbdocgen.config.json", ".dbdocgenrc"]
  });

  const result = input.cliOptions.configPath
    ? await explorer.load(input.cliOptions.configPath)
    : await explorer.search(input.cwd);

  const fileConfig = (result?.config ?? {}) as DeepPartial<DbdocgenConfig>;
  const merged = mergeConfig(fileConfig, input.cliOptions);
  return dbdocgenConfigSchema.parse(merged);
}

function mergeConfig(
  fileConfig: DeepPartial<DbdocgenConfig>,
  cli: CliConfigOptions
): DeepPartial<DbdocgenConfig> {
  return {
    ...fileConfig,
    schema: cli.schema ?? fileConfig.schema,
    dialect: cli.dialect ?? fileConfig.dialect,
    outDir: cli.outDir ?? fileConfig.outDir,
    output: {
      ...fileConfig.output,
      formats: cli.formats ?? fileConfig.output?.formats
    }
  };
}
