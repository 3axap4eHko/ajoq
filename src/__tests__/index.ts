import { stringify, createFilter, createSort, Context, isPrimitive, Primitive } from '../index';

const positive = {
  number: 42,
  string: 'Hello World!',
  boolean: true,
  array: [1, 2, 3],
  object: { foo: 'bar' },
  optional: 'optional',
};

const negative = {
  number: 24,
  string: 'Goodbye World!',
  boolean: false,
  array: [4, 5, 6],
  object: { bar: 'foo' },
  optional: undefined,
};

const data = [positive, negative];
type Data = (typeof data)[number];
const context = new Context(new Map<string, unknown>());

describe('AJOQ test suite', () => {
  it('should stringify undefined', () => {
    expect(stringify(undefined, context)).toBe('undefined');
  });

  it('should check isPrimitive', () => {
    expect(isPrimitive(0)).toBe(true);
    expect(isPrimitive(0n)).toBe(true);
    expect(isPrimitive(false)).toBe(true);
    expect(isPrimitive('')).toBe(true);
    expect(isPrimitive(Symbol())).toBe(true);
  });

  it('should create a value filter', () => {
    const filter = createFilter<number>(1);
    expect(filter(1)).toBe(true);
    expect(filter(0)).toBe(false);
  });

  it('should fail on undefined', () => {
    const filterFn = createFilter(undefined as any);
    const result = data.filter(filterFn);
    expect(result).toStrictEqual([]);
  });

  it.each([
    {
      name: 'number',
      filter: 42,
    },
    {
      name: 'number',
      filter: {
        $eq: 42,
        $ne: 24,
        $gt: 24,
        $gte: 42,
        $lt: 64,
        $lte: 42,
        $in: [42, 24],
        $nin: [24],
        $bits: 0b101010,
        $nbits: 0b101011,
        $exists: true,
        $type: 'number',
        $ntype: 'string',
      },
    },
    {
      name: 'string',
      filter: /hello/i,
    },
    {
      name: 'string',
      filter: {
        $eq: 'Hello World!',
        $ne: 'Goodbye World!',
        $in: ['Hello World!'],
        $nin: ['Goodbye World!'],
        $con: 'H',
        $ncon: 'G',
        $incl: 'Hello',
        $nincl: 'Goodbye',
        $match: /hello/i,
        $nmatch: /goodbye/i,
        $exists: true,
        $type: 'string',
        $ntype: 'number',
      },
    },
    {
      name: 'boolean',
      filter: {
        $eq: true,
        $ne: false,
        $in: [true],
        $nin: [false],
        $exists: true,
        $type: 'boolean',
        $ntype: 'string',
      },
    },
    {
      name: 'array',
      filter: {
        $sub: [0, 1, 2, 3, 4],
        $nsub: [3, 4, 5, 5, 6],
        $sup: [1, 2],
        $nsup: [4, 5],
        $con: 1,
        $ncon: 4,
        $exists: true,
        $type: 'object',
        $ntype: 'string',
        length: 3,
      },
    },
    {
      name: 'object',
      filter: {
        $exists: true,
        $type: 'object',
        $ntype: 'string',
        foo: {
          $exists: true,
        },
        bar: { $exists: false },
      },
    },
    {
      name: 'optional',
      filter: {
        $exists: true,
      },
    },
    {
      name: '$and',
      filter: [{ number: { $eq: 42 } }, { string: { $eq: 'Hello World!' } }],
    },
    {
      name: '$or',
      filter: {
        $or: [{ number: { $ne: 24 } }, { number: { $eq: 42 } }],
      },
    },
    {
      name: '$nor',
      filter: [{ number: { $eq: 24 } }, { string: { $eq: 'Goodbye World!' } }],
    },
    {
      name: '$not',
      filter: { number: { $eq: 24 } },
    },
  ])('should create a filter function for $name', ({ name, filter }) => {
    const filterFn = createFilter<Data>({
      [name]: filter,
    });
    const result = data.filter(filterFn);
    expect(result).toStrictEqual([positive]);
  });

  it.each([
    { name: 'number', filter: { $eq: 42 }, value: 42 },
    { name: 'string', filter: { $incl: 'Hello' }, value: 'Hello World!' },
    { name: 'string with regexp', filter: /hello/i, value: 'Hello World!' },
    { name: 'boolean', filter: { $ne: false }, value: true },
  ])('should work for primitive $name', ({ filter, value }) => {
    expect(createFilter<Primitive | object>(filter)(value)).toBe(true);
  });

  it('should create a numeric sort asc function', () => {
    const sortFn = createSort<Data>({ number: 1 });
    const result = data.sort(sortFn);
    expect(result).toStrictEqual([negative, positive]);
  });

  it('should create a numeric sort desc function', () => {
    const sortFn = createSort<Data>({ number: -1 });
    const result = data.sort(sortFn);
    expect(result).toStrictEqual([positive, negative]);
  });

  it('should create a strings sort asc function', () => {
    const sortFn = createSort<Data>({ string: 'asc' });
    const result = data.sort(sortFn);
    expect(result).toStrictEqual([negative, positive]);
  });

  it('should create a strings sort desc function', () => {
    const sortFn = createSort<Data>({ string: 'desc' });
    const result = data.sort(sortFn);
    expect(result).toStrictEqual([positive, negative]);
  });

  it('should create an array length sort function', () => {
    const sortFn = createSort<Data>({ array: { length: 1 } });
    const result = data.sort(sortFn);
    expect(result).toStrictEqual([positive, negative]);
  });

  it('should create an array element sort function', () => {
    const sortFn = createSort<Data>({ array: { [0]: -1 } });
    const result = data.sort(sortFn);
    expect(result).toStrictEqual([negative, positive]);
  });

  it('should create a boolean sort function', () => {
    const sortFn = createSort<Data>({ number: true });
    const result = data.sort(sortFn);
    expect(result).toStrictEqual([negative, positive]);
  });

  it('should create an empty sort function', () => {
    const sortFn = createSort<Data>({});
    const result = data.sort(sortFn);
    expect(result).toStrictEqual(data);
  });

  it('should create a value sort function', () => {
    const sortFn = createSort<Data>();
    const result = data.sort(sortFn);
    expect(result).toStrictEqual(data);
  });
});
