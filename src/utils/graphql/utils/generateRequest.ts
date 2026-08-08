import { RequestMethod, RequestOperation } from "../enums";
import { whereToString } from "./where";
import { sortToString } from "./sort";

function formatResultsField<T>(
  fields: Partial<Record<keyof T, unknown>> | undefined,
  depth: number,
): string {
  if (fields === undefined || Object.keys(fields).length === 0) {
    return "id";
  }

  let query = "";
  const keys = Object.keys(fields);
  const lastKey = keys[keys.length - 1];

  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined) {
      throw new Error("Value of fields cannot be nullable");
    }

    if (typeof value === "object") {
      if (value !== null) {
        query += `\n${"  ".repeat(depth)}${key} { ${formatResultsField(value, depth + 1)}\n${"  ".repeat(depth)}}`;
      }
    } else {
      query += `\n${"  ".repeat(depth)}${key}`;
    }

    if (key !== lastKey) {
      query += ",";
    }
  }

  return query;
}

function formatRequest(text: string): string {
  return text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => (line.startsWith("  ") ? line.slice(2) : line))
    .join("\n");
}

function customStringify(obj: unknown): string {
  if (Array.isArray(obj)) {
    const items = obj.map((value) => {
      if (typeof value === "string") {
        return JSON.stringify(value);
      } else if (typeof value === "object" && value !== null) {
        return customStringify(value);
      } else {
        return String(value);
      }
    });
    return `[ ${items.join(", ")} ]`;
  } else if (typeof obj === "object" && obj !== null) {
    const entries = Object.entries(obj).map(([key, value]) => {
      let valStr;
      if (typeof value === "string") {
        valStr = JSON.stringify(value);
      } else if (typeof value === "object" && value !== null) {
        valStr = customStringify(value);
      } else {
        valStr = String(value);
      }
      return `${key}: ${valStr}`;
    });
    return `{ ${entries.join(", ")} }`;
  } else if (typeof obj === "string") {
    return JSON.stringify(obj);
  } else {
    return String(obj);
  }
}

export default function generateRequest<T>(
  modelName: string,
  typeReq: RequestMethod,
  operation: RequestOperation,
  options?: {
    fields?: Partial<Record<keyof T, unknown>>;
    queryArguments?: {
      skip?: number;
      sort?: Sort;
      take?: number;
      where?: object;
      input?: Record<string, unknown> | Record<string, unknown>[];
      id?: number;
      uniqueBy?: string[];
      validate?: boolean;
      totalCount?: boolean;
    };
  },
  _log_request?: boolean,
): string {
  const { skip, sort, take, where, input, id, uniqueBy, validate, totalCount } =
    options?.queryArguments || {};
  const requestArguments: string[] = [];

  if (skip !== undefined) {
    if (skip < 0 || skip > 2147483647) {
      throw new Error("Skip value must be between 0 and 2147483647 (32bit)");
    }
    requestArguments.push(`skip: ${skip}`);
  }

  if (sort !== undefined) {
    requestArguments.push(`sort: { ${sortToString(sort)} }`);
  }

  if (take !== undefined) {
    if (take < 1 || take > 5000) {
      throw new Error("Take value must be between 1 and 5000");
    }
    requestArguments.push(`take: ${take}`);
  }

  if (where !== undefined) {
    requestArguments.push(`where: { ${whereToString(where)} }`);
  }

  if (input !== undefined) {
    requestArguments.push(`input: ${customStringify(input)}`);
  }

  if (id !== undefined) {
    requestArguments.push(`id: ${id}`);
  }

  if (uniqueBy !== undefined) {
    if (operation !== RequestOperation.Upsert && operation !== RequestOperation.UpsertMany) {
      throw new Error("Cannot use uniqueBy for non-upserting mutations");
    }
    requestArguments.push(`uniqueBy: ${JSON.stringify(uniqueBy)}`);
  }

  if (validate !== undefined) {
    if (typeReq === RequestMethod.Query) {
      throw new Error("Cannot validate request for query");
    }

    if (operation === RequestOperation.Delete || operation === RequestOperation.DeleteMany) {
      throw new Error("Cannot input validate for delete since it doesn't validate anything");
    }

    requestArguments.push(`validationSets: ['${validate ? "default" : "empty"}']`);
  }

  const graphqlRequest = formatRequest(`${typeReq} {
    ${operation}${modelName}${requestArguments.length > 0 ? `(${requestArguments.join(", ")})` : ""} {
      ${operation === "all" ? "results {\n" : ""}
      ${formatResultsField(options?.fields, operation === "all" ? 4 : 3)}
      ${operation === "all" ? "}" : ""}
      ${totalCount ? "totalCount" : ""}
    }
  }`);

  if (_log_request) {
    console.log(graphqlRequest);
  }

  return graphqlRequest;
}
