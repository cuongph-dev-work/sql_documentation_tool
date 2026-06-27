import { cosmiconfig } from "cosmiconfig";
import { dbdocgenConfigSchema, type DbdocgenConfig, type OutputFormat } from "./schema";

type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

export type CliConfigOptions = {
  schema?: string;
  source?: string;
  outDir?: string;
  formats?: OutputFormat[];
  ai?: boolean;
  aiProvider?: "9router" | "openai" | "openai-compatible";
  aiBaseUrl?: string;
  aiModel?: string;
  configPath?: string;
};

export type LoadConfigInput = {
  cwd: string;
  cliOptions: CliConfigOptions;
};

export async function loadConfig(input: LoadConfigInput): Promise<DbdocgenConfig> {
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

function mergeConfig(fileConfig: DeepPartial<DbdocgenConfig>, cli: CliConfigOptions): DeepPartial<DbdocgenConfig> {
  return {
    ...fileConfig,
    schema: cli.schema ?? fileConfig.schema,
    outDir: cli.outDir ?? fileConfig.outDir,
    context: {
      ...fileConfig.context,
      source: {
        ...fileConfig.context?.source,
        enabled: cli.source ? true : fileConfig.context?.source?.enabled,
        rootDir: cli.source ?? fileConfig.context?.source?.rootDir
      }
    },
    ai: {
      ...fileConfig.ai,
      enabled: cli.ai ?? fileConfig.ai?.enabled,
      provider: cli.aiProvider ?? fileConfig.ai?.provider,
      baseURL: cli.aiBaseUrl ?? fileConfig.ai?.baseURL,
      model: cli.aiModel ?? fileConfig.ai?.model
    },
    output: {
      ...fileConfig.output,
      formats: cli.formats ?? fileConfig.output?.formats
    }
  };
}
