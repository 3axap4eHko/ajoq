import { stringify, createFilter, createSort } from '../index';

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

describe('AJOQ test suite', () => {
  it('should create empty filter', () => {
    const filter = createFilter();
    expect(filter(positive)).toBe(true);
    expect(filter(negative)).toBe(true);

  });
  it('should stringify undefined', () => {
    expect(stringify(undefined)).toBe('undefined');
  });

  it.each([
    {
      name: 'number', filter: 42
    },
    {
      name: 'number', filter: {
        $eq: 42,
        $ne: 24,
        $gt: 24,
        $gte: 42,
        $lt: 64,
        $lte: 42,
        $in: [42, 24],
        $nin: [24],
        $bits: 0b010,
        $nbits: 0b100,
        $exists: true,
        $typeof: 'number',
        $ntypeof: 'string',
      }
    },
    {
      name: 'string', filter: /hello/i
    },
    {
      name: 'string', filter: {
        $eq: 'Hello World!',
        $ne: 'Goodbye World!',
        $in: ['Hello World!'],
        $nin: ['Goodbye World!'],
        $con: 'H',
        $ncon: 'G',
        $match: /hello/i,
        $nmatch: /goodbye/i,
        $exists: true,
        $typeof: 'string',
        $ntypeof: 'number',
      }
    },
    {
      name: 'boolean', filter: {
        $eq: true,
        $ne: false,
        $in: [true],
        $nin: [false],
        $exists: true,
        $typeof: 'boolean',
        $ntypeof: 'string',
      }
    },
    {
      name: 'array', filter: {
        $sub: [0, 1, 2, 3, 4],
        $nsub: [3, 4, 5, 5, 6],
        $sup: [1, 2],
        $nsup: [4, 5],
        $con: 1,
        $ncon: 4,
        $exists: true,
        $typeof: 'object',
        $ntypeof: 'string',
        length: 3,
      }
    },
    {
      name: 'object', filter: {
        $exists: true,
        $typeof: 'object',
        $ntypeof: 'string',
        foo: {
          $exists: true,
        },
        bar: { $exists: false },
      },
    },
    {
      name: 'optional', filter: {
        $exists: true,
      },
    },
    {
      name: '$and', filter: [
        { number: { $eq: 42 } },
        { string: { $eq: 'Hello World!' } },
      ],
    },
    {
      name: '$or', filter: {
        $or: [
          { number: { $ne: 24 } },
          { number: { $eq: 42 } },
        ],
      },
    },
    {
      name: '$nor', filter: [
        { number: { $eq: 24 } },
        { string: { $eq: 'Goodbye World!' } },
      ],
    },
    {
      name: '$not', filter: { number: { $eq: 24 } },
    },

  ])('should create a filter function for $name', ({ name, filter }) => {
    const filterFn = createFilter<typeof data[number]>({
      [name]: filter,
    });
    const result = data.filter(filterFn);
    expect(result).toStrictEqual([positive]);
  });

  it('should create a numeric sort asc function', () => {
    const sortFn = createSort<typeof data[number]>({ number: 1 });
    const result = data.sort(sortFn);
    expect(result).toStrictEqual([negative, positive]);
  });

  it('should create a numeric sort desc function', () => {
    const sortFn = createSort<typeof data[number]>({ number: -1 });
    const result = data.sort(sortFn);
    expect(result).toStrictEqual([positive, negative]);
  });

  it('should create a strings sort asc function', () => {
    const sortFn = createSort<typeof data[number]>({ string: 'asc' });
    const result = data.sort(sortFn);
    expect(result).toStrictEqual([negative, positive]);
  });

  it('should create a strings sort desc function', () => {
    const sortFn = createSort<typeof data[number]>({ string: 'desc' });
    const result = data.sort(sortFn);
    expect(result).toStrictEqual([positive, negative]);
  });

  it('should create an empty sort function', () => {
    const sortFn = createSort<typeof data[number]>({});
    const result = data.sort(sortFn);
    expect(result).toStrictEqual(data);
  });
});
