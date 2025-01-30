import {
  queryRecords,
  deleteManyQuery,
  removeEmptyRelation,
} from "../../utils/graphql";
import { formatStringMap, chunkArray } from "../../utils/utilityFuncs";

interface DeleteAll {
  model: {
    name: string;
  };
  amountToDelete?: number;
  batchSize?: number;
  keepParent: boolean;
  relationData?: JSON;
  relationVars?: { key: string; value: string }[];
  filter?: String;
  filterVars?: { key: string; value: string }[];
}

function generateQuery(data, keepParent, prefix = "", parents = []) {
  let query = "";
  let flatList = [];

  for (const [key, value] of Object.entries(data)) {
    const currentParents = [...parents, key];
    if (!value.modelName) {
      throw new Error(`Model name for ${key} is not defined`);
    }
    const entry = {
      [key]: {
        parents: parents,
        depth: parents.length,
        keep: value.keep,
        modelName: value.modelName,
      },
    };
    flatList.push(entry);

    if (key !== "subRelations") {
      query += `${prefix}${key} { ${value.keep ? "" : "id,"} `;
      if (value.subRelations) {
        const { queryBody: subQuery, flatList: subList } = generateQuery(
          value.subRelations,
          keepParent,
          "",
          currentParents,
        );
        query += subQuery;
        flatList = flatList.concat(subList);
      }
      query += `}, `;
    } else {
      if (value.subRelations) {
        const { queryBody: subQuery, flatList: subList } = generateQuery(
          keepParent,
          value.subRelations,
          `${prefix}${key} { `,
          currentParents,
        );
        if (subQuery.trim()) {
          query += `${prefix}${key} { ${subQuery}}, `;
        }
        flatList = flatList.concat(subList);
      }
    }
  }

  return {
    queryBody: (keepParent ? "" : "id, ") + query.replace(/, $/, ""),
    flatList: flatList.sort(
      (a, b) => Object.values(b)[0].depth - Object.values(a)[0].depth,
    ),
  };
}

function flattenGraphqlJson(data) {
  function flattenRelationalJson(data, flatList = [], keyName = ["parent"]) {
    if (Array.isArray(data)) {
      if (data.length !== 0) {
        if (data[0].id) {
          flatList.push({
            [keyName[keyName.length - 1]]: data.map((e) => e.id),
          });
        }
        Object.keys(data[0]).forEach((elem) => {
          if (elem !== "id") {
            if (Array.isArray(data[0][elem])) {
              const nestedData = data.flatMap((item) => item[elem]);
              flattenRelationalJson(nestedData, flatList, [...keyName, elem]);
            } else if (typeof data[0][elem] === "object") {
              if (data[0][elem].id) {
                flatList.push({ [elem]: data.map((e) => e[elem].id) });
              }
            }
          }
        });
      }
    }
    return flatList;
  }

  return flattenRelationalJson(data).map((relation) => ({
    [Object.keys(relation)[0]]: Array.from(
      new Set(relation[Object.keys(relation)[0]]),
    ),
  }));
}

const deleteAllWithLimit = async ({
  model: { name: modelName },
  amountToDelete,
  batchSize,
  keepParent,
  relationData,
  relationVars,
  filter,
  filterVars,
}) => {
  if (amountToDelete <= 0 && amountToDelete != null) {
    throw new Error("Delete amount cannot be lower than or equal to 0");
  } else if (batchSize <= 0) {
    throw new Error("Batch size cannot be lower than or equal to 0");
  } else if (keepParent && relationData == null) {
    throw new Error('If "keep parent" is ON relational data has to be defined');
  }

  let relationJson, relationalQuery, flatRelationSettings;

  try {
    relationJson = JSON.parse(formatStringMap(relationData, relationVars));
    ({ queryBody: relationalQuery, flatList: flatRelationSettings } =
      generateQuery(relationJson, keepParent));
    relationalQuery = removeEmptyRelation(relationalQuery);
  } catch (error) {
    if (relationData) {
      throw error;
    }
  }

  const parentRecordCount = await queryRecords(
    modelName,
    filter,
    filterVars,
    1,
    0,
    "",
    true,
  );
  const realAmountToDelete = amountToDelete
    ? amountToDelete > parentRecordCount
      ? parentRecordCount
      : amountToDelete
    : parentRecordCount;
  const batchesCount = Math.ceil(realAmountToDelete / batchSize);

  for (let batchIndex = 1; batchIndex - 1 < batchesCount; batchIndex++) {
    const calcAmountToDelete =
      batchIndex * batchSize > realAmountToDelete
        ? realAmountToDelete % batchSize
        : batchSize;
    const collectionBatchCount = Math.ceil(calcAmountToDelete / 200);

    let ids = [];
    for (let index = 1; index - 1 < collectionBatchCount; index++) {
      const take =
        index * 200 > calcAmountToDelete ? calcAmountToDelete % 200 : 200;
      const skip = (index - 1) * 200;
      let queryResult = [];

      if (relationJson) {
        const relationalQueryResult = await queryRecords(
          modelName,
          filter,
          filterVars,
          take,
          skip,
          relationalQuery,
        );
        const flattenedIdList = flattenGraphqlJson(relationalQueryResult);

        for (let i = 0; i < flatRelationSettings.length; i++) {
          const relation = flatRelationSettings[i];
          const [[relationName, relationInfo]] = Object.entries(relation);
          const removeObject = flattenedIdList.find((e) => relationName in e);

          if (removeObject) {
            const [[removeRelation, removeIds]] = Object.entries(removeObject);
            const chunkedSize = chunkArray(removeIds, batchSize);

            for (let j = 0; j < chunkedSize.length; j++) {
              const ids = chunkedSize[j];
              await deleteManyQuery(relationInfo.modelName, ids);
            }
          }
        }

        if (!keepParent && flattenedIdList[0].parent) {
          queryResult = flattenedIdList[0].parent;
        }
      } else {
        queryResult = await queryRecords(
          modelName,
          filter,
          filterVars,
          take,
          skip,
          "id",
        );
      }

      if (!keepParent) {
        ids.push(...queryResult);
      }
    }

    if (!keepParent) {
      await deleteManyQuery(modelName, ids);
    }
  }

  return {
    result: `${realAmountToDelete} records from ${modelName} have been deleted`,
  };
};

export default deleteAllWithLimit;
