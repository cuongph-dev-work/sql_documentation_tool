import { describe, expect, it } from "vitest";
import { aiTableEnrichResponseSchema } from "../../src/ai/schemas/ai-response";

describe("aiTableEnrichResponseSchema", () => {
  it("accepts a valid AI response with table, purpose, confidence, columnDescriptions, and reviewTodos", () => {
    const result = aiTableEnrichResponseSchema.safeParse({
      table: "orders",
      purpose: "Stores customer orders.",
      confidence: "high",
      businessNotes: ["Orders can be in pending, shipped, or cancelled state."],
      columnDescriptions: {
        id: {
          description: "Primary key for orders table.",
          source: "db_comment",
          confidence: "high",
          needsReview: false
        },
        status: {
          description: "Order status based on backend enum OrderStatus.",
          source: "backend_source",
          confidence: "high",
          needsReview: false
        },
        customer_name: {
          description: "Name inferred from naming convention.",
          source: "ai",
          confidence: "low",
          needsReview: true
        }
      },
      reviewTodos: [
        "Verify the purpose of the customer_name field.",
        "Confirm order status enum values."
      ]
    });

    expect(result.success).toBe(true);
  });

  it("rejects a response missing confidence in a column description", () => {
    const result = aiTableEnrichResponseSchema.safeParse({
      table: "orders",
      purpose: "Stores orders.",
      confidence: "high",
      columnDescriptions: {
        id: {
          description: "Primary key.",
          source: "db_comment",
          needsReview: false
          // missing confidence
        }
      }
    });

    expect(result.success).toBe(false);
  });

  it("rejects a response with an invalid source value", () => {
    const result = aiTableEnrichResponseSchema.safeParse({
      table: "orders",
      purpose: "Stores orders.",
      confidence: "high",
      columnDescriptions: {
        id: {
          description: "Primary key.",
          source: "invalid_source",
          confidence: "high",
          needsReview: false
        }
      }
    });

    expect(result.success).toBe(false);
  });
});
