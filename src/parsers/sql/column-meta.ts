type AnyAst = Record<string, unknown>;

export function normalizeColumnType(definition: unknown): {
  type: string;
  size?: string;
} {
  if (typeof definition !== "object" || definition === null) {
    return { type: String(definition ?? "unknown").toLowerCase() };
  }

  const def = definition as AnyAst;
  const base = String(def.dataType ?? def.type ?? def.name ?? "unknown").toLowerCase();

  if (String(def.dataType ?? "").toUpperCase() === "ENUM") {
    const values = extractEnumValues(def.expr);
    if (values.length > 0) {
      const joined = values.join(", ");
      return {
        type: `${base}(${values.map((v) => `'${v}'`).join(",")})`,
        size: String(values.length)
      };
    }
  }

  if (def.length !== undefined && def.length !== null) {
    const length = formatAstValue(def.length);
    if (def.scale !== undefined && def.scale !== null) {
      const scale = formatAstValue(def.scale);
      return {
        type: `${base}(${length},${scale})`,
        size: `${length},${scale}`
      };
    }
    return {
      type: `${base}(${length})`,
      size: length
    };
  }

  const suffix = Array.isArray(def.suffix)
    ? def.suffix
        .map((item) => formatAstValue(item))
        .filter(Boolean)
        .join(" ")
    : def.suffix
      ? formatAstValue(def.suffix)
      : "";

  return {
    type: suffix ? `${base} ${suffix}`.trim() : base
  };
}

export function extractColumnComment(definition: AnyAst): string | undefined {
  const comment = definition.comment as AnyAst | undefined;
  if (!comment) return undefined;

  const value = comment.value as AnyAst | undefined;
  if (value?.value !== undefined) return String(value.value);
  if (comment.value !== undefined && typeof comment.value === "string") {
    return comment.value;
  }
  return undefined;
}

export function hasColumnUnique(definition: AnyAst): boolean {
  return definition.unique === "unique" || definition.unique === true;
}

export function extractCheckBounds(
  expression: unknown,
  columnName: string
): { minValue?: string; maxValue?: string; expression?: string } {
  const result: { minValue?: string; maxValue?: string; expression?: string } = {};
  walkCheckExpression(expression, columnName, result);
  return result;
}

function walkCheckExpression(
  expression: unknown,
  columnName: string,
  result: { minValue?: string; maxValue?: string; expression?: string }
): void {
  if (!expression || typeof expression !== "object") return;
  const expr = expression as AnyAst;

  if (expr.type === "binary_expr") {
    const operator = String(expr.operator ?? "").toUpperCase();
    if (operator === "AND" || operator === "OR") {
      walkCheckExpression(expr.left, columnName, result);
      walkCheckExpression(expr.right, columnName, result);
      return;
    }

    const columnRef = findColumnRef(expr.left) ?? findColumnRef(expr.right);
    if (columnRef !== columnName) return;

    const bound = readBound(expr, columnName);
    if (!bound) return;

    if (bound.kind === "min") {
      result.minValue = mergeBound(result.minValue, bound.value, "max");
    } else {
      result.maxValue = mergeBound(result.maxValue, bound.value, "min");
    }
    return;
  }

  result.expression ??= stringifyExpression(expr);
}

function readBound(
  expr: AnyAst,
  columnName: string
): { kind: "min" | "max"; value: string } | undefined {
  const operator = String(expr.operator ?? "");
  const left = expr.left as AnyAst | undefined;
  const right = expr.right as AnyAst | undefined;

  if (findColumnRef(left) === columnName) {
    if (operator === ">=" || operator === ">") {
      return { kind: "min", value: formatAstValue(right) };
    }
    if (operator === "<=" || operator === "<") {
      return { kind: "max", value: formatAstValue(right) };
    }
  }

  if (findColumnRef(right) === columnName) {
    if (operator === ">=" || operator === ">") {
      return { kind: "max", value: formatAstValue(left) };
    }
    if (operator === "<=" || operator === "<") {
      return { kind: "min", value: formatAstValue(left) };
    }
  }

  return undefined;
}

function mergeBound(
  current: string | undefined,
  next: string,
  pick: "min" | "max"
): string {
  if (!current) return next;
  const currentNum = Number(current);
  const nextNum = Number(next);
  if (!Number.isNaN(currentNum) && !Number.isNaN(nextNum)) {
    return pick === "min"
      ? String(Math.max(currentNum, nextNum))
      : String(Math.min(currentNum, nextNum));
  }
  return next;
}

function findColumnRef(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const expr = value as AnyAst;
  if (expr.type === "column_ref" && expr.column) {
    return String(expr.column);
  }
  return undefined;
}

function formatAstValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    const object = value as AnyAst;
    if (object.value !== undefined) return String(object.value);
    if (object.dataType) return normalizeColumnType(object).type;
  }
  return String(value);
}

function stringifyExpression(expr: AnyAst): string {
  if (expr.type === "binary_expr") {
    const left = stringifyExpression((expr.left as AnyAst) ?? {});
    const right = stringifyExpression((expr.right as AnyAst) ?? {});
    return `${left} ${expr.operator} ${right}`.trim();
  }
  if (expr.type === "column_ref") return String(expr.column ?? "");
  if (expr.value !== undefined) return formatAstValue(expr);
  return "check";
}

export function extractConstraintColumnNames(definition: unknown): string[] {
  return extractDeepColumnNames(definition);
}

function extractDeepColumnNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item !== "object" || item === null) return String(item ?? "unknown");
    const object = item as AnyAst;
    if (object.column !== undefined) return String(object.column);
    if (object.expr) return extractDeepColumnName(object.expr);
    return String(object.name ?? "unknown");
  });
}

function extractDeepColumnName(value: unknown): string {
  if (typeof value !== "object" || value === null) {
    return String(value ?? "unknown");
  }
  const object = value as AnyAst;
  if (object.expr) return extractDeepColumnName(object.expr);
  if (object.column && typeof object.column === "object") {
    return extractDeepColumnName(object.column);
  }
  if (object.column !== undefined) return String(object.column);
  return String(object.name ?? "unknown");
}

export function stringifyCheckDefinition(definition: unknown): string | undefined {
  if (!Array.isArray(definition) || definition.length === 0) return undefined;
  if (definition.length === 1) {
    return stringifyExpression(definition[0] as AnyAst);
  }
  return definition
    .map((item) => stringifyExpression(item as AnyAst))
    .filter(Boolean)
    .join("; ");
}
