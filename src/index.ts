export type Query<T> = {
  [P in keyof T]?: QueryCondition<T[P]>;
} & Operations<T>;

type QueryCondition<FieldType> =
  | FieldType
  | Conditions<FieldType>;

interface Conditions<ValueType> {
  $eq?: ValueType;
  $ne?: ValueType;
  $gt?: ValueType;
  $gte?: ValueType;
  $lt?: ValueType;
  $lte?: ValueType;
  $in?: ValueType[];
  $nin?: ValueType[];
  $exists?: boolean;
  $match?: RegExp | string;
  $nmatch?: RegExp | string;
  $bits?: number;
  $nbits?: number;
};

type ConditionKeys = keyof Conditions<unknown>;

interface Operations<T> {
  $and?: Query<T>[];
  $or?: Query<T>[];
  $nor?: Query<T>[];
  $not?: Query<T>;
};

type OperationKeys = keyof Operations<unknown>;

const conditions: Record<ConditionKeys, any> = {
  $eq: (valuePath: string, value: unknown) => `(${valuePath} === ${value})`,
  $ne: (valuePath: string, value: unknown) => `(${valuePath} !== ${value})`,
  $gt: (valuePath: string, value: unknown) => `(${valuePath} > ${value})`,
  $gte: (valuePath: string, value: unknown) => `(${valuePath} >= ${value})`,
  $lt: (valuePath: string, value: unknown) => `(${valuePath} < ${value})`,
  $lte: (valuePath: string, value: unknown) => `(${valuePath} <= ${value})`,
  $in: (valuePath: string, value: unknown) => `(${value}.includes(${valuePath}))`,
  $nin: (valuePath: string, value: unknown) => `(!${value}.includes(${valuePath}))`,
  $exists: (valuePath: string, value: unknown) => `((${valuePath} !== undefined && ${valuePath} !== null) === ${value})`,
  $match: (valuePath: string, value: unknown) => `${value}.test('' + ${valuePath})`,
  $nmatch: (valuePath: string, value: unknown) => `!${value}.test('' + ${valuePath})`,
  $bits: (valuePath: string, value: unknown) => `((${valuePath} & ${value}) !== 0)`,
  $nbits: (valuePath: string, value: unknown) => `((${valuePath} & ${value}) === 0)`,
};

const operations: Record<keyof Operations<unknown>, any> = {
  $and: (value: unknown[]) => `(${value.join(' && ')})`,
  $or: (value: unknown[]) => `(${value.join(' || ')})`,
  $nor: (value: unknown[]) => `(!(${value.join(' || ')}))`,
  $not: (value: unknown) => `(!(${value}))`,
}


const queryCodeGen = <T extends object>(query: Query<T>, valuePath: string, path: string): string => {
  if (typeof query === 'object' && query !== null) {
    const condition = Object.entries(query).map(([key, value]) => {
      if (key in conditions) {
        return conditions[key as ConditionKeys](valuePath, JSON.stringify(value));
      }
      if (key in operations) {
        const values = Array.isArray(value) ? value : [value];
        return operations[key as OperationKeys](values.map((value) => queryCodeGen(value, valuePath, path)));
      }
      const valueSubPath = `${valuePath}?.[${JSON.stringify(key)}]`;
      if (value instanceof RegExp) {
        return conditions.$match(valueSubPath, value.toString());
      }
      if (typeof value === 'object' && value !== null) {
        return queryCodeGen(value, valueSubPath, path);
      }
      return conditions.$eq(valueSubPath, JSON.stringify(value));
    });

    return `${condition.join(' && ')}`;
  }
  return 'true';
}

export const createQuery = <T extends object>(query: Query<T>, rootName: string) => {
  const code = queryCodeGen(query, 'data', rootName);
  const filter = new Function('data', `return ${code || 'true'};`);
  return (data: T) => filter(data);
};

export type SortType = 'asc' | 'desc' | 1 | -1;

export type Sort<T> = T extends object
  ? {
    [K in keyof T]?: T[K] extends object ? Sort<T[K]> : SortType;
  }
  : SortType;

export const SORT_EXPR = /^(asc|desc|1|-1)$/i

export const SORT_MAP: Record<SortType, 1 | -1> = {
  asc: 1,
  desc: -1,
  1: 1,
  '-1': -1,
};

export const sortCodeGen = <T>(sort: Sort<T>, valuePath: [string, string], path: string): string => {
  if (typeof sort === 'object' && sort !== null) {
    const condition = Object.entries(sort).map(([key, value]) => {
      const valueSubPathA = `${valuePath[0]}?.[${JSON.stringify(key)}]`;
      const valueSubPathB = `${valuePath[1]}?.[${JSON.stringify(key)}]`;
      return sortCodeGen(value, [valueSubPathA, valueSubPathB], path);
    });
    return condition.join(' || ');
  }
  if (typeof sort === 'string' && SORT_EXPR.test(sort)) {
    return `(${valuePath[0]}?.localeCompare(${valuePath[1]}) * ${SORT_MAP[sort as SortType]})`;
  }
  if (typeof sort === 'number' && SORT_EXPR.test('' + sort)) {
    return `((${valuePath[0]} - ${valuePath[1]}) * ${SORT_MAP[sort as SortType]})`;
  }
  return `0`;
};

export const createSort = <T>(sort: Sort<T>, rootName: string) => {
  const code = sortCodeGen(sort, ['a', 'b'], rootName);
  const filter = new Function('a', 'b', `return ${code || 0};`);
  console.log(filter.toString());
  return (data: T) => filter(data);
};
