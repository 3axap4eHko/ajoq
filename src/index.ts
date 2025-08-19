export type RegExpOrString<T> = T extends string ? RegExp | T : T;
export type ItemType<T> = T extends ReadonlyArray<infer U> ? T | RegExpOrString<U> : RegExpOrString<T>;
export type FilterCondition<T> = T | ItemType<T> | PureFilterOperators<T> | PureFilterOperators<ItemType<T>> | LogicOperators<FilterCondition<T>>;
export type QueryStatefulCondition<T> =
  | T
  | ItemType<T>
  | StatefulFilterOperators<T>
  | StatefulFilterOperators<ItemType<T>>
  | LogicOperators<FilterCondition<T>>;

export type Filter<T> = {
  [P in keyof T]?: FilterCondition<T[P]>;
} & LogicOperators<T>;

export interface LogicOperators<T> {
  $and?: Filter<T>[];
  $or?: Filter<T>[];
  $nor?: Filter<T>[];
  $not?: Filter<T>;
}

export interface ConditionFn {
  (valuePath: string, value: any, context: Context): string;
}

export type OperationKeys = keyof LogicOperators<unknown>;

export interface PureFilterOperators<ValueType> {
  $eq?: ValueType;
  $ne?: ValueType;
  $gt?: ValueType;
  $gte?: ValueType;
  $lt?: ValueType;
  $lte?: ValueType;

  $exists?: boolean;
  $match?: RegExp | string;
  $nmatch?: RegExp | string;
  $incl?: string;
  $nincl?: string;
  $bits?: number;
  $nbits?: number;
  $type?: string;
  $ntype?: string;
}

export type PureFilterOperatorsNames = keyof PureFilterOperators<unknown>;

const pureFilters: Record<PureFilterOperatorsNames, ConditionFn> = {
  $eq: (valuePath: string, value: unknown) => `(${valuePath} === ${value})`,
  $ne: (valuePath: string, value: unknown) => `(${valuePath} !== ${value})`,
  $gt: (valuePath: string, value: unknown) => `(${valuePath} > ${value})`,
  $gte: (valuePath: string, value: unknown) => `(${valuePath} >= ${value})`,
  $lt: (valuePath: string, value: unknown) => `(${valuePath} < ${value})`,
  $lte: (valuePath: string, value: unknown) => `(${valuePath} <= ${value})`,
  $exists: (valuePath: string, value: boolean) => `((${valuePath} !== undefined && ${valuePath} !== null) === ${value})`,
  $match: (valuePath: string, value: RegExp) => `${value}?.test('' + ${valuePath})`,
  $nmatch: (valuePath: string, value: RegExp) => `!${value}?.test('' + ${valuePath})`,
  $incl: (valuePath: string, value: string) => `${valuePath}?.includes(${value})`,
  $nincl: (valuePath: string, value: string) => `!${valuePath}?.includes(${value})`,
  $bits: (valuePath: string, value: unknown) => `((${valuePath} & ${value}) === ${value})`,
  $nbits: (valuePath: string, value: unknown) => `((${valuePath} & ${value}) !== ${value})`,
  $type: (valuePath: string, value: unknown) => `(typeof ${valuePath} === ${value})`,
  $ntype: (valuePath: string, value: unknown) => `(typeof ${valuePath} !== ${value})`,
};

export interface EffectFilterOperators<ValueType> {
  $in?: ReadonlyArray<ValueType>;
  $nin?: ReadonlyArray<ValueType>;
  $sub?: ReadonlyArray<ValueType>;
  $nsub?: ReadonlyArray<ValueType>;
  $sup?: ReadonlyArray<ValueType>;
  $nsup?: ReadonlyArray<ValueType>;
  $con?: ValueType;
  $ncon?: ValueType;
}

export type EffectFilterOperatorsNames = keyof EffectFilterOperators<unknown>;

export interface StatefulFilterOperators<ValueType> extends PureFilterOperators<ValueType> {
  $unique?: boolean;
}

export const stringify = (value: unknown, context: Context) => {
  if (value === undefined) {
    return 'undefined';
  }
  if (!isPrimitive(value) || typeof value === 'bigint') {
    const scope = context.scope(value);
    return scope;
  }
  return JSON.stringify(value);
};

const effectFilters: Record<EffectFilterOperatorsNames, ConditionFn> = {
  $in: (valuePath: string, value: unknown[], context: Context) => {
    const scope = context.scope(new Set(value));
    return `${scope}?.has(${valuePath})`;
  },
  $nin: (valuePath: string, value: unknown[], context: Context) => `!${effectFilters.$in(valuePath, value, context)}`,
  $sub: (valuePath: string, value: unknown[], context: Context) => {
    const scope = context.scope(new Set(value));
    return `!!${valuePath}?.every((value) => ${scope}?.has(value))`;
  },
  $nsub: (valuePath: string, value: unknown[], context: Context) => `!${effectFilters.$sub(valuePath, value, context)}`,
  $sup: (valuePath: string, value: unknown, context: Context) => {
    const scope = context.scope(value);
    const name = context.register(`new Set(${valuePath})`);
    return `!!${scope}?.every((value) => ${name}.has(value))`;
  },
  $nsup: (valuePath: string, value: unknown, context: Context) => `!${effectFilters.$sup(valuePath, value, context)}`,
  $con: (valuePath: string, value: unknown, context: Context) => {
    const setVar = context.register(`new Set(${valuePath})`);
    return `${setVar}.has(${stringify(value, context)})`;
  },
  $ncon: (valuePath: string, value: unknown, context: Context) => {
    const setVar = context.register(`new Set(${valuePath})`);
    return `!${setVar}.has(${stringify(value, context)})`;
  },
};

const operations: Record<keyof LogicOperators<unknown>, any> = {
  $and: (value: unknown[]) => `(${value.join(' && ')})`,
  $or: (value: unknown[]) => `(${value.join(' || ')})`,
  $nor: (value: unknown[]) => `!(${value.join(' || ')})`,
  $not: (value: unknown[]) => `!(${value})`,
};

export class Context {
  private counter = 0;
  private values: string[] = [];
  private cacheMap = new Map<string, string>();

  constructor(private scopeMap: Map<string, unknown>) {}

  scope<T>(value: T): string {
    const name = `s$$${this.counter++}`;
    this.scopeMap.set(name, value);
    return `scope.get('${name}')`;
  }

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

const filterCodeGen = <T extends object>(query: Filter<T> | undefined, valuePath: string, context: Context): string => {
  if (typeof query === 'object' && query !== null) {
    const condition = Object.entries(query).map(([key, value]) => {
      if (key in pureFilters) {
        return pureFilters[key as PureFilterOperatorsNames](valuePath, stringify(value, context), context);
      }
      if (key in effectFilters) {
        return effectFilters[key as EffectFilterOperatorsNames](valuePath, value, context);
      }
      if (key in operations) {
        const values = Array.isArray(value) ? value : [value];
        return operations[key as OperationKeys](values.map((v) => filterCodeGen(v, valuePath, context)));
      }
      const valueSubPath = `${valuePath}?.[${stringify(key, context)}]`;
      if (value instanceof RegExp) {
        return pureFilters.$match(valueSubPath, stringify(value, context), context);
      }
      if (typeof value === 'object' && value !== null) {
        return filterCodeGen(value, valueSubPath, context);
      }
      return pureFilters.$eq(valueSubPath, stringify(value, context), context);
    });
    if (condition.length > 0) {
      return `${condition.join(' && ')}`;
    }
  }
  return `${!!query}`;
};

const PRIMITIVES = new Set(['string', 'number', 'boolean', 'bigint', 'symbol']);

export type Primitive = string | number | boolean | bigint | symbol;
export const isPrimitive = (value: unknown): value is Primitive => PRIMITIVES.has(typeof value);

export const createFilter = <T extends object | number | string | boolean | bigint | symbol>(
  filter: Filter<T> | number | string | boolean | bigint | symbol,
): ((data: T) => boolean) => {
  if (isPrimitive(filter)) {
    return (data: T) => data === filter;
  }
  const scope = new Map<string, unknown>();
  const context = new Context(scope);
  const code = filterCodeGen(filter as object, 'data', context);
  const filterFn = new Function('data', 'scope', `${context}\nreturn ${code};`);
  return (data: T) => filterFn(data, scope);
};

export type SortType<T> = T extends number
  ? 1 | -1
  : T extends string
    ? 'asc' | 'desc'
    : T extends unknown[]
      ? { length?: 1 | -1 } & { [Index: number]: SortType<T[number]> }
      : boolean;

export type Sort<T> = T extends object
  ? {
      [K in keyof T]?: SortType<T[K]> | boolean;
    }
  : SortType<T> | boolean;

type SortDirection = 'asc' | 'desc' | 1 | -1 | true | false;
const SORT_MAP: Record<`${SortDirection}`, 1 | -1> = {
  asc: 1,
  desc: -1,
  1: 1,
  '-1': -1,
  true: 1,
  false: -1,
};

const sortCodeGen = <T>(sort: Sort<T>, valuePathA: string, valuePathB: string): string => {
  if (typeof sort === 'object' && sort !== null) {
    const condition = Object.entries(sort).map(([key, value]) => {
      const valueSubPathA = `${valuePathA}?.[${JSON.stringify(key)}]`;
      const valueSubPathB = `${valuePathB}?.[${JSON.stringify(key)}]`;
      return sortCodeGen(value, valueSubPathA, valueSubPathB);
    });
    if (condition.length > 0) {
      return condition.join(' || ');
    }
  }
  if (typeof sort === 'string' && (sort === 'asc' || sort === 'desc')) {
    return `(${valuePathA}?.localeCompare(${valuePathB}) * ${SORT_MAP[sort as `${SortDirection}`]})`;
  }
  if (typeof sort === 'number' && (sort === 1 || sort === -1)) {
    return `((${valuePathA} - ${valuePathB}) * ${SORT_MAP[`${sort}` as `${SortDirection}`]})`;
  }
  if (typeof sort === 'boolean') {
    return `(${valuePathA} > ${valuePathB} === ${sort} ? 1 : (${valuePathA} < ${valuePathB} === ${sort} ? -1 : 0)) `;
  }
  return `0`;
};

export const createSort = <T>(sort?: Sort<T>): ((a: T, b: T) => number) => {
  if (!sort) {
    return () => 0;
  }
  const code = sortCodeGen(sort, 'a', 'b');
  const sortFn = new Function('a', 'b', `return ${code};`);
  return sortFn as (a: T, b: T) => number;
};
