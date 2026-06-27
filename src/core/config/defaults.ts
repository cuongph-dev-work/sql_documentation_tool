import { dbdocgenConfigSchema, type DbdocgenConfig } from "./schema";

export const defaultConfig: DbdocgenConfig = dbdocgenConfigSchema.parse({});
