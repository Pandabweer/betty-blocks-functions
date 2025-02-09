import { formatStringMap } from "./utilityFuncs";

interface QueryOptionalOptions {
  filter?: string;
  filterVars?: { key: string; value: string }[];
  take?: number;
  skip?: number;
  bodyQuery?: string;
  count?: boolean;
}

export async function queryRecords(
  modelName: string,
  options: QueryOptionalOptions,
): Promise<string | number> {
  const {
    filter = "",
    filterVars = [],
    take = 50,
    skip = 0,
    bodyQuery = "",
    count = false,
  } = options;

  if (count === false && !bodyQuery) {
    throw new Error("No bodyQuery has been provided");
  }

  const where = filter
    ? `where: { ${formatStringMap(filter, filterVars)} }, `
    : "";
  const skipFmt = count ? "" : `, skip: ${skip}`;
  const generateQuery = `query {
    all${modelName} (${where}take: ${count ? 1 : take}${skipFmt}) {
      ${count ? "totalCount" : `results { ${bodyQuery} }`}
    }
  }`;

  // @ts-expect-error: Cannot find name 'gql'
  const { data, errors } = await gql(generateQuery);

  if (errors) {
    throw errors;
  }

  return data[`all${modelName}`][count ? "totalCount" : "results"];
}

export async function deleteManyMutation(
  modelName: string,
  ids: string[],
): Promise<void> {
  // @ts-expect-error: Cannot find name 'gql'
  const { errors }: any[] = await gql(
    `mutation($input: ${modelName}Input) {
      deleteMany${modelName}(input: $input) {
        id
      }
    }`,
    { input: { ids } },
  );

  if (errors) {
    throw errors;
  }
}
