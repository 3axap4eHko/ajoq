# AJOQ

Another Javascript Object Query.

[![Coverage Status][codecov-image]][codecov-url]
[![Github Build Status][github-image]][github-url]
[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][npm-url]
[![Snyk][snyk-image]][snyk-url]


Uses mongodb like query structure to execute in function

## Installation

```bash
npm install ajoq
```

## Usage

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
const sorted = values.toSorted(sortFn); // [{ name: 'John', age: 42 }, { name: 'Jane', age: 18 }]
```

## Documentation

### Filter

The `Filter` type represents a flexible and expressive way to filter and search data. It supports combining conditions with logical operators, making it suitable for complex query requirements.

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


## License
License [The MIT License](./LICENSE)
Copyright (c) 2024 Ivan Zakharchanka

[npm-url]: https://www.npmjs.com/package/ajoq
[downloads-image]: https://img.shields.io/npm/dw/ajoq.svg?maxAge=43200
[npm-image]: https://img.shields.io/npm/v/ajoq.svg?maxAge=43200
[github-url]: https://github.com/3axap4eHko/ajoq/actions
[github-image]: https://github.com/3axap4eHko/ajoq/workflows/Build%20Package/badge.svg?branch=master
[snyk-url]: https://snyk.io/test/npm/ajoq/latest
[snyk-image]: https://snyk.io/test/github/3axap4eHko/ajoq/badge.svg?maxAge=43200
