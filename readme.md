#AsyncArray

A control-flow library that mimics the semantics of JS arrays, plus adds a chainable API and some extra methods.

##Install

    npm install asyncarray

##API

###Require

```js
var AsyncArray = require("asyncarray");
```

###Constructor

```js
new AsyncArray(…elems);
```

###Methods

* `forEach(<func(elem, index)>)`: Calls `func` with every element of the array. Returns `this`.
* `map(<func(elem, index, <cb(err, data)>)>)`: Calls `func` with every element of the array and uses data passed to the callback for all following methods.
* `filter(<func>)`
* `some(<func test>, <func cb>)`
* `every(<func test>, <func cb>)`
* `pluck(field)`
* `order()`
* `flatten()`
* `flattenDeep()`
* `toArray(<cb>)`

___//TODO add descriptions___