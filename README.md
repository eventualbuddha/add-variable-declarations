# add-variable-declarations

Add variable declarations for implicit global variable assignments.

## Install

```
$ npm install [--save-dev] add-variable-declarations
```

## Usage

```js
import addVariableDeclarations from 'add-variable-declarations';

const source = `
PI = 3.14;
radius = 8;
circumference = 2 * PI * radius;
`;

console.log(addVariableDeclarations(source).code);
// var PI = 3.14;
// var radius = 8;
// var circumference = 2 * PI * radius;
```

## Why?

This project is used by [decaffeinate][decaffeinate] to add variable
declarations to converted CoffeeScript code. This project is not intended to
allow you to write JavaScript without variable declarations, as I consider that
a bad practice for the same reasons it's a bad practice in CoffeeScript.

[decaffeinate]: https://github.com/decaffeinate/decaffeinate

## License

MIT