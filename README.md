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

## FAQ

### Why?

This project is used by [decaffeinate][decaffeinate] to add variable
declarations to converted CoffeeScript code. This project is not intended to
allow you to write JavaScript without variable declarations, as I consider that
a bad practice for the same reasons it's a bad practice in CoffeeScript.

[decaffeinate]: https://github.com/decaffeinate/decaffeinate

### Why `var`? Shouldn't this use `let` and `const`?

Yes, but not all situations allow the use of `let` and `const`, such as when
the variable binding takes advantage of
[hoisting](http://www.adequatelygood.com/JavaScript-Scoping-and-Hoisting.html).
If you want `let` and `const` you can use this library in combination with
[esnext](https://github.com/esnext/esnext) which will turn all eligible `var`
declarations into `let` or `const` as appropriate.

## License

MIT