import { createHash } from "node:crypto";
import type { DatabaseDoc } from "../../core/model/database-doc";
import type { AiProviderConfig } from "../providers/openai-compatible";
import { callAiProvider } from "../providers/openai-compatible";
import { aiTableEnrichResponseSchema } from "../schemas/ai-response";
import { createWarning } from "../../core/warnings";
import { getCachedResponse, setCachedResponse } from "../cache/file-cache";
import type { CacheOptions } from "../cache/file-cache";

export type EnrichDbOptions = {
  doc: DatabaseDoc;
  providerConfig: AiProviderConfig;
  rules: Record<string, string>;
  sourceContext?: { files: Array<{ path: string; relatedTables: string[]; chunks: Array<{ content: string }> }> };
  provider?: typeof callAiProvider;
  cacheOptions?: CacheOptions;
};

export async function enrichDatabaseDoc(options: EnrichDbOptions): Promise<DatabaseDoc> {
  const { doc, providerConfig, rules, sourceContext, provider = callAiProvider, cacheOptions } = options;
  const enriched = structuredClone(doc);

  for (const table of enriched.tables) {
    try {
      const relatedFiles = sourceContext?.files.filter((f) => f.relatedTables.includes(table.name)) ?? [];
      const contextSnippet = relatedFiles
        .flatMap((f) => f.chunks)
        .map((c) => c.content)
        .join("\n// ...\n")
        .slice(0, 3000);

      const systemPrompt = rules["system.md"] ?? "";
      const tablePrompt = rules["table-enrich.md"] ?? "";
      const columnPrompt = rules["column-enrich.md"] ?? "";

      const tableMetadata = {
        name: table.name,
        comment: table.comment,
        columns: table.columns.map((c) => ({
          name: c.name,
          type: c.type,
          nullable: c.nullable,
          defaultValue: c.defaultValue,
          isPrimaryKey: c.isPrimaryKey,
          isForeignKey: c.isForeignKey,
          comment: c.comment
        }))
      };

      const metadataJson = JSON.stringify(tableMetadata);
      const metadataHash = createHash("sha256").update(metadataJson).digest("hex").slice(0, 16);
      const contextHash = createHash("sha256").update(contextSnippet || "").digest("hex").slice(0, 16);
      const rulesHash = createHash("sha256").update(systemPrompt + tablePrompt).digest("hex").slice(0, 16);

      const cacheKey: Record<string, string> = {
        table: table.name,
        metadataHash,
        contextHash,
        rulesHash,
        model: providerConfig.model
      };

      let responseText: string;

      if (cacheOptions) {
        const cached = await getCachedResponse(cacheKey, cacheOptions);
        if (cached !== null) {
          responseText = cached;
        } else {
          const userPrompt = [
            tablePrompt,
            "",
            "## Table Metadata",
            metadataJson,
            contextSnippet ? `\n## Related Source Context\n${contextSnippet}` : ""
          ].join("\n");

          responseText = await provider(providerConfig, {
            systemPrompt,
            userPrompt
          });
          await setCachedResponse(cacheKey, responseText, cacheOptions);
        }
      } else {
        const userPrompt = [
          tablePrompt,
          "",
          "## Table Metadata",
          metadataJson,
          contextSnippet ? `\n## Related Source Context\n${contextSnippet}` : ""
        ].join("\n");

        responseText = await provider(providerConfig, {
          systemPrompt,
          userPrompt
        });
      }

      const parsed = aiTableEnrichResponseSchema.parse(JSON.parse(responseText));

      table.description = {
        value: parsed.purpose ?? table.comment ?? "",
        source: "ai",
        confidence: parsed.confidence,
        needsReview: parsed.confidence === "low"
      };

      if (parsed.columnDescriptions) {
        for (const [colName, desc] of Object.entries(parsed.columnDescriptions)) {
          const column = table.columns.find((c) => c.name === colName);
          if (column) {
            column.description = {
              value: desc.description,
              source: desc.source,
              confidence: desc.confidence,
              needsReview: desc.needsReview
            };
          }
        }
      }

      for (const todo of parsed.reviewTodos ?? []) {
        table.reviewTodos.push({
          type: "ai",
          target: table.name,
          issue: todo,
          source: "ai"
        });
      }
    } catch (err) {
      enriched.warnings.push(
        createWarning(
          "AI_ENRICH_FAILED",
          `AI enrichment failed for table "${table.name}": ${err instanceof Error ? err.message : "Unknown error"}`
        )
      );
    }
  }

  return enriched;
}
