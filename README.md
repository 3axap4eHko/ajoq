# AJOQ

[![Github Build Status][github-image]][github-url]
[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][npm-url]
[![Snyk][snyk-image]][snyk-url]

**The fastest MongoDB-style query library for JavaScript - 3x faster than Sift, 14x faster than Mingo.**

AJOQ compiles your queries into optimized JavaScript functions, giving you the expressive power of MongoDB queries with superior performance.

## Why AJOQ?

- 🚀 **Blazing Fast** - 3-14x faster than alternatives (see [benchmarks](#performance-benchmarks))
- 🎯 **MongoDB Compatible** - Use familiar MongoDB query syntax
- 📦 **Zero Dependencies** - Tiny, self-contained library
- 🔧 **TypeScript Ready** - Full type safety and IntelliSense support
- ⚡ **Compiled Queries** - Queries compile to optimized JavaScript, not interpreted

### Perfect for:
- **High-performance filtering** - When speed matters
- **Client-side operations** - Filter API responses without server roundtrips
- **Static site generators** - Fast search in build processes
- **Real-time applications** - Low-latency data filtering
- **Large datasets** - Efficiently process thousands of records

## Quick Example

```ts
// Complex user search with MongoDB-style queries
const users = [
  { name: 'Alice', age: 28, skills: ['js', 'react'], active: true },
  { name: 'Bob', age: 32, skills: ['python'], active: false },
  { name: 'Charlie', age: 25, skills: ['js', 'vue'], active: true }
];

// Find active users who know JavaScript and are under 30
const filter = createFilter({
  active: true,
  age: { $lt: 30 },
  skills: { $con: 'js' }
});

const results = users.filter(filter);
// → [{ name: 'Alice', ... }, { name: 'Charlie', ... }]
```

## Installation

```bash
npm install ajoq
```

## Basic Usage

### Filter function
```ts
import { createFilter } from "ajoq";

interface Data {
  name: string;
  age: number;
  // data type
}
const values: Data[] = [{ name: 'John', age: 42 }, { name: 'Jane', age: 18 }];

const filterFn = createFilter<Data>({ name: 'John', age: { $gte: 21 } });
const filtered = values.filter(filterFn); // [{ name: 'John', age: 42 }]
```

### Sort function
```ts
import { createSort } from "ajoq";

interface Data {
  name: string;
  age: number;
  // data type
}
const values: Data[] = [{ name: 'John', age: 42 }, { name: 'Jane', age: 18 }];

const sortFn = createSort<Data>({ name: 'asc', age: -1 });
const sorted = values.toSorted(sortFn); // [{ name: 'Jane', age: 18 }, { name: 'John', age: 42 }]
```

## Performance Benchmarks

### AJOQ vs Popular Alternatives

Benchmarked on 10,000 objects using [Overtake](https://github.com/3axap4eHko/overtake) benchmark suite:

| Library | Operations/sec | Relative Speed | Weekly Downloads |
|---------|---------------|----------------|------------------|
| **AJOQ** | **7,673 ops/s** | **Baseline** | - |
| [Sift](https://github.com/crcn/sift.js) | 2,442 ops/s | 3.1x slower | 3.3M |
| [Mingo](https://github.com/kofrasa/mingo) | 551 ops/s | 13.9x slower | 178k |

### Why is AJOQ Faster?

1. **Query Compilation** - Queries compile once into native JavaScript functions
2. **Zero Overhead** - No interpretation layer or external dependencies
3. **Optimized Operations** - Automatic caching (e.g., Set creation for array operations)
4. **Direct Property Access** - Generated code uses direct property access without abstraction

### Run Benchmarks Yourself

```bash
# Install dependencies
npm install --save-dev sift mingo overtake

# Run benchmark
npx overtake benchmark.ts
```

See [benchmark.ts](./benchmark.ts) for the full benchmark suite.

## Documentation

### How It Works

Unlike other query libraries that interpret queries at runtime, AJOQ **compiles** your MongoDB-style queries into optimized JavaScript functions. This means:

1. **Parse once, run many times** - Query compilation happens once
2. **Native JavaScript speed** - No interpretation overhead
3. **Optimized operations** - Automatic caching of repeated operations (like Set creation)

### Filter API

Filters support all MongoDB query operators for maximum compatibility.

#### Logical Operators

  - `$and`: Matches if all sub-conditions are true (logical AND).
  - `$or`: Matches if at least one sub-condition is true (logical OR).
  - `$nor`: Matches if none of the sub-conditions are true (logical NOR).
  - `$not`: Matches if the sub-condition is false (logical NOT).

#### Filter Operators

  - `$eq`: Matches if the field equals the value.
  - `$ne`: Matches if the field does not equal the value.
  - `$gt`: Matches if the field is greater than the value.
  - `$gte`: Matches if the field is greater than or equal to the value.
  - `$lt`: Matches if the field is less than the value.
  - `$lte`: Matches if the field is less than or equal to the value.
  - `$exists`: Matches if the field exists or does not exist (true or false).
  - `$match`: Matches if the field value matches a regex or string.
  - `$nmatch`: Matches if the field value does not match a regex or string.
  - `$incl`: Matches if the string field includes the specified substring.
  - `$nincl`: Matches if the string field does not include the specified substring.
  - `$bits`: Matches if any bits from the field value match the specified bitmask.
  - `$nbits`: Matches if no bits from the field value match the specified bitmask.
  - `$type`: Matches if the field's type matches the specified type.
  - `$ntype`: Matches if the field's type does not match the specified type.
  - `$in`: Matches if the field value is in the specified array.
  - `$nin`: Matches if the field value is not in the specified array.
  - `$sub`: Matches if all elements of the field array are in the specified array (subset).
  - `$nsub`: Matches if the field array is not a subset of the specified array.
  - `$sup`: Matches if the field array contains all elements of the specified array (superset).
  - `$nsup`: Matches if the field array does not contain all elements of the specified array.
  - `$con`: Matches if the field array contains the specified value.
  - `$ncon`: Matches if the field array does not contain the specified value.

### Real-World Examples

#### Complex Product Search
```ts
// E-commerce product filtering
const productFilter = createFilter({
  $and: [
    { price: { $gte: 50, $lte: 200 } },
    { category: { $in: ['electronics', 'computers'] } },
    { 
      $or: [
        { brand: 'Apple' },
        { rating: { $gte: 4.5 } }
      ]
    },
    { tags: { $con: 'wireless' } }
  ]
});

const products = await fetch('/api/products').then(r => r.json());
const filtered = products.filter(productFilter);
```

#### User Permission Check
```ts
// Check complex permission rules
const canEdit = createFilter({
  $or: [
    { role: 'admin' },
    {
      $and: [
        { role: 'editor' },
        { permissions: { $sup: ['read', 'write'] } },
        { suspended: { $ne: true } }
      ]
    }
  ]
});

if (canEdit(currentUser)) {
  // Allow editing
}
```

### Array Operator Examples

```ts
import { createFilter } from "ajoq";

// $in - check if value is in array
const roleFilter = createFilter({ role: { $in: ['admin', 'moderator'] } });
roleFilter({ role: 'admin' }); // true
roleFilter({ role: 'user' }); // false

// $con - check if array contains value
const tagFilter = createFilter({ tags: { $con: 'javascript' } });
tagFilter({ tags: ['javascript', 'node'] }); // true
tagFilter({ tags: ['python', 'django'] }); // false

// $sub - check if array is subset
const subsetFilter = createFilter({ skills: { $sub: ['js', 'html', 'css'] } });
subsetFilter({ skills: ['js', 'html'] }); // true (subset of allowed)
subsetFilter({ skills: ['js', 'php'] }); // false (php not in allowed)

// $sup - check if array is superset
const supersetFilter = createFilter({ permissions: { $sup: ['read', 'write'] } });
supersetFilter({ permissions: ['read', 'write', 'delete'] }); // true
supersetFilter({ permissions: ['read'] }); // false
```

## License
License [The MIT License](./LICENSE)
Copyright (c) 2024 Ivan Zakharchanka

[npm-url]: https://www.npmjs.com/package/ajoq
[downloads-image]: https://img.shields.io/npm/dw/ajoq.svg?maxAge=43200
[npm-image]: https://img.shields.io/npm/v/ajoq.svg?maxAge=43200
[github-url]: https://github.com/3axap4eHko/ajoq/actions
[github-image]: https://github.com/3axap4eHko/ajoq/actions/workflows/build.yml/badge.svg?branch=master
[snyk-url]: https://snyk.io/test/npm/ajoq/latest
[snyk-image]: https://snyk.io/test/github/3axap4eHko/ajoq/badge.svg?maxAge=43200
