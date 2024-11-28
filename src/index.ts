export type Query<T> = {
  [P in keyof T]?: QueryCondition<T[P]>;
} & Operations<T>;

export type QueryCondition<FieldType> = FieldType | Conditions<FieldType> | Operations<QueryCondition<FieldType>>;

export interface Conditions<ValueType> {
  $eq?: ValueType;
  $ne?: ValueType;
  $gt?: ValueType;
  $gte?: ValueType;
  $lt?: ValueType;
  $lte?: ValueType;
  $in?: ValueType[];
  $nin?: ValueType[];
  $sub?: ValueType[];
  $nsub?: ValueType[];
  $sup?: ValueType[];
  $nsup?: ValueType[];
  $con?: ValueType;
  $ncon?: ValueType;
  $exists?: boolean;
  $match?: RegExp | string;
  $nmatch?: RegExp | string;
  $bits?: number;
  $nbits?: number;
  $typeof: string;
  $ntypeof: string;
}

export type ConditionKeys = keyof Conditions<unknown>;

export interface Operations<T> {
  $and?: Query<T>[];
  $or?: Query<T>[];
  $nor?: Query<T>[];
  $not?: Query<T>;
}

export type OperationKeys = keyof Operations<unknown>;

export const stringify = (value: unknown) => {
  if (value === undefined) {
    return 'undefined';
  }
  if (value instanceof RegExp) {
    return `/${value.source}/${value.flags}`;
  }
  return JSON.stringify(value);
};

export interface Condition {
  (valuePath: string, value: any, context: Context): string;
}

const conditions: Record<ConditionKeys, Condition> = {
  $eq: (valuePath: string, value: unknown) => `(${valuePath} === ${value})`,
  $ne: (valuePath: string, value: unknown) => `(${valuePath} !== ${value})`,
  $gt: (valuePath: string, value: unknown) => `(${valuePath} > ${value})`,
  $gte: (valuePath: string, value: unknown) => `(${valuePath} >= ${value})`,
  $lt: (valuePath: string, value: unknown) => `(${valuePath} < ${value})`,
  $lte: (valuePath: string, value: unknown) => `(${valuePath} <= ${value})`,
  $in: (valuePath: string, value: unknown, context: Context) => {
    const name = context.register(`new Set(${value})`);
    return `${name}.has(${valuePath})`;
  },
  $nin: (valuePath: string, value: unknown, context: Context) => `!${conditions.$in(valuePath, value, context)}`,
  $sub: (valuePath: string, value: unknown, context: Context) => {
    const name = context.register(`new Set(${value})`);
    return `${valuePath}.every((value) => ${name}.has(value))`;
  },
  $nsub: (valuePath: string, value: unknown, context: Context) => `!${conditions.$sub(valuePath, value, context)}`,
  $sup: (valuePath: string, value: unknown, context: Context) => {
    const name = context.register(`new Set(${valuePath})`);
    return `${value}.every((value) => ${name}.has(value))`;
  },
  $nsup: (valuePath: string, value: unknown, context: Context) => `!${conditions.$sup(valuePath, value, context)}`,
  $con: (valuePath: string, value: unknown) => `${valuePath}.includes(${value})`,
  $ncon: (valuePath: string, value: unknown) => `!${valuePath}.includes(${value})`,
  $exists: (valuePath: string, value: boolean) => `((${valuePath} !== undefined && ${valuePath} !== null) === ${value})`,
  $match: (valuePath: string, value: RegExp) => `${value}.test('' + ${valuePath})`,
  $nmatch: (valuePath: string, value: RegExp) => `!${value}.test('' + ${valuePath})`,
  $bits: (valuePath: string, value: unknown) => `((${valuePath} & ${value}) !== 0)`,
  $nbits: (valuePath: string, value: unknown) => `((${valuePath} & ${value}) === 0)`,
  $typeof: (valuePath: string, value: unknown) => `(typeof ${valuePath} === ${value})`,
  $ntypeof: (valuePath: string, value: unknown) => `(typeof ${valuePath} !== ${value})`,
};

const operations: Record<keyof Operations<unknown>, any> = {
  $and: (value: unknown[]) => `(${value.join(' && ')})`,
  $or: (value: unknown[]) => `(${value.join(' || ')})`,
  $nor: (value: unknown[]) => `!(${value.join(' || ')})`,
  $not: (value: unknown[]) => `!(${value})`,
};

class Context {
  private counter = 0;
  private values: string[] = [];
  private cacheMap = new Map<string, string>();

  register(code: string) {
    if (!this.cacheMap.has(code)) {
      const name = `v$$${this.counter++}`;
      this.values.push(`const ${name} = ${code};`);
      this.cacheMap.set(code, name);
    }
    return this.cacheMap.get(code)!;
  }
  toString() {
    return this.values.join('\n');
  }
}

const filterCodeGen = <T extends object>(query: Query<T> | undefined, valuePath: string, context: Context): string => {
  if (typeof query === 'object' && query !== null) {
    const condition = Object.entries(query).map(([key, value]) => {
      if (key in conditions) {
        return conditions[key as ConditionKeys](valuePath, stringify(value), context);
      }
      if (key in operations) {
        const values = Array.isArray(value) ? value : [value];
        return operations[key as OperationKeys](values.map((v) => filterCodeGen(v, valuePath, context)));
      }
      const valueSubPath = `${valuePath}?.[${stringify(key)}]`;
      if (value instanceof RegExp) {
        return conditions.$match(valueSubPath, value.toString(), context);
      }
      if (typeof value === 'object' && value !== null) {
        return filterCodeGen(value, valueSubPath, context);
      }
      return conditions.$eq(valueSubPath, JSON.stringify(value), context);
    });
    if (condition.length > 0) {
      return `${condition.join(' && ')}`;
    }
  }
  return 'true';
};

export const createFilter = <T extends object>(query?: Query<T>) => {
  const context = new Context();
  const code = filterCodeGen(query, 'data', context);
  const filter = new Function('data', `${context}\nreturn ${code};`);
  return (data: T) => filter(data);
};

export type SortType = 'asc' | 'desc' | 1 | -1;

export type Sort<T> = T extends object
  ? {
      [K in keyof T]?: T[K] extends object ? Sort<T[K]> : SortType;
    }
  : SortType;

const SORT_EXPR = /^(asc|desc|1|-1)$/i;

const SORT_MAP: Record<SortType, 1 | -1> = {
  asc: 1,
  desc: -1,
  1: 1,
  '-1': -1,
};

const sortCodeGen = <T>(sort: Sort<T>, valuePath: [string, string]): string => {
  if (typeof sort === 'object' && sort !== null) {
    const condition = Object.entries(sort).map(([key, value]) => {
      const valueSubPathA = `${valuePath[0]}?.[${JSON.stringify(key)}]`;
      const valueSubPathB = `${valuePath[1]}?.[${JSON.stringify(key)}]`;
      return sortCodeGen(value, [valueSubPathA, valueSubPathB]);
    });
    if (condition.length > 0) {
      return condition.join(' || ');
    }
  }
  if (typeof sort === 'string' && SORT_EXPR.test(sort)) {
    return `(${valuePath[0]}?.localeCompare(${valuePath[1]}) * ${SORT_MAP[sort as SortType]})`;
  }
  if (typeof sort === 'number' && SORT_EXPR.test('' + sort)) {
    return `((${valuePath[0]} - ${valuePath[1]}) * ${SORT_MAP[sort as SortType]})`;
  }
  return `0`;
};

export const createSort = <T>(sort: Sort<T>) => {
  const code = sortCodeGen(sort, ['a', 'b']);
  const sortFn = new Function('a', 'b', `return ${code};`);
  return (a: T, b: T) => sortFn(a, b);
};
