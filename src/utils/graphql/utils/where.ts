import { LogicalOperator, ComparisonOperator } from "../enums";

const logicalOperators = Object.values(LogicalOperator);
const comparisonOperators = Object.values(ComparisonOperator);

export function validateWhereObject(where: Record<string, unknown>): void {
  if (typeof where !== "object" || where === null) {
    throw new Error("Where clause must be a non-null object");
  }

  for (const key of Object.keys(where)) {
    const value = where[key];

    if (logicalOperators.includes(key as LogicalOperator)) {
      if (!Array.isArray(value)) {
        throw new Error(`Operator '${key}' has to be an array`);
      }

      value.forEach((item, idx) => {
        try {
          validateWhereObject(item);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
          throw new Error(`Error in '${key}' array element at index ${idx}: ${err?.message}`);
        }
      });
    } else {
      if (typeof value !== "object" || value === null) {
        throw new Error(`Field '${key}' must be an object`);
      }

      for (const fieldKey of Object.keys(value)) {
        if (comparisonOperators.includes(fieldKey as ComparisonOperator)) {
          continue;
        }

        const objectConditional = (value as Record<string, unknown>)[
          fieldKey
        ] as ComparisonOperator;

        if (typeof objectConditional !== "object" || objectConditional === null) {
          throw new Error(`Condition on field '${fieldKey}' must be an object`);
        }

        const objectConditionalKeys = Object.keys(objectConditional);
        if (objectConditionalKeys.length !== 1) {
          throw new Error(`Condition on field '${fieldKey}' cannot contain more than one operator`);
        }

        const conditionalOperator = objectConditionalKeys[0];
        if (!comparisonOperators.includes(conditionalOperator as ComparisonOperator)) {
          throw new Error(
            `Invalid operator '${conditionalOperator}' on field '${fieldKey}'. Allowed: ${comparisonOperators.join(", ")}`,
          );
        }
      }
    }
  }
}

export function whereToString<T>(where: T, validate = true, _isRoot = true): string {
  if (validate && _isRoot) {
    validateWhereObject(where as Record<string, unknown>);
  }

  if (Array.isArray(where)) {
    return `[${where.map((item) => whereToString(item, validate, false)).join(", ")}]`;
  }

  if (typeof where === "object" && where !== null) {
    const content = Object.entries(where)
      .map(([key, value]) => `${key}: ${whereToString(value, validate, false)}`)
      .join(", ");
    return _isRoot ? content : `{ ${content} }`;
  }

  return typeof where === "string" ? JSON.stringify(where) : String(where);
}

export function whereToObject(where: string, validate = true): object {
  const parsedWhere = JSON.parse(`{${where}}`.replace(/(\w+):/g, '"$1":'));

  if (validate) {
    validateWhereObject(parsedWhere);
  }

  return parsedWhere;
}
