import type { WarningDoc } from "./model/database-doc";

export function createWarning(code: string, message: string, target?: string): WarningDoc {
  return {
    code,
    message,
    target,
    severity: "warning"
  };
}
