# Object-oriented Maybe type in TypeScript

[![npm version](https://img.shields.io/npm/v/ts-maybe-type) ![npm download](https://img.shields.io/npm/dt/ts-maybe-type)](https://www.npmjs.com/package/ts-maybe-type)

`Maybe`, a.k.a. `Option` in F♯, `Optional` in Java 8, is a well designed type, due to its mathematical foundations *(functor and monad)* and built with functional programming principles. Don't worry ! It's simple enough to be used without this background.

💡 Its main benefit is to help having a codebase more robust *(`null` free)* and more structured *(separation of data flow and control flow)*.

👉 The design is object-oriented: the type exposes methods like `map` and `filter`, so that they can be chained, offering a simpler syntax than a functional design (external functions `map`...) as long as TypeScript will not have operators like `|>` (pipe right) and `>>` (compose right).

- [Introduction](#introduction)
  - [TL;DR](#tldr)
  - [Absence of value: `null` is still not ideal](#absence-of-value-null-is-still-not-ideal)
  - [Principle of `Maybe`](#principle-of-maybe)
  - [Partial operation / Creating `Maybe` instance](#partial-operation--creating-maybe-instance)
  - [Opacity / Value accessibility](#opacity--value-accessibility)
  - [Pattern matching with `match` method](#pattern-matching-with-match-method)
  - [Intrinsic control flow](#intrinsic-control-flow)
  - [Explicit data flow](#explicit-data-flow)
- [Methods](#methods)
  - [`map` method](#map-method)
  - [`flatMap` method](#flatmap-method)
  - [`filter` method](#filter-method)
  - [`match` method](#match-method)
  - [`valueOrDefault` method](#valueordefault-method)
  - [`valueOrGet` method](#valueorget-method)
  - [`traverse` function](#traverse-function)
- [Code comparison: `null` vs `Maybe`](#code-comparison-null-vs-maybe)
  - [1. Single optional result](#1-single-optional-result)
  - [2. Chaining optional results](#2-chaining-optional-results)
  - [3. Computation decomposed in transitional steps](#3-computation-decomposed-in-transitional-steps)
- [FAQ](#faq)
  - [How to create a `Maybe` instance ❓](#how-to-create-a-maybe-instance-)
  - [How to exit from a `Maybe` instance ❓](#how-to-exit-from-a-maybe-instance-)
  - [Is it a niche, a (software) crafter stuff, not for every developer ❓](#is-it-a-niche-a-software-crafter-stuff-not-for-every-developer-)
  - [Do we need to replace `null` with `Maybe` everywhere ❓](#do-we-need-to-replace-null-with-maybe-everywhere-)
  - [What about unit testing ❓](#what-about-unit-testing-)
  - [What about its implementation ❓](#what-about-its-implementation-)

## Introduction

### TL;DR

- Much more than a simple `null` substitute!
- Easy to grasp due to the semantic and the similarity with `array` and its methods `filter`, `map`, `flatMap`
- Robust and safe: in all cases, no runtime error by design *(no `null`, `undefined` billion dollars mistake)*
- Ease splitting a business operation to improve the domain expression and simplify the code

### Absence of value: `null` is still not ideal

`Maybe` is a generic type to model the **absence of value**.

> 🗯 We have `strictNullCheck` option to keep us safe with `null`. Why not using `null` in this case ❓

`strictNullCheck` is a great improvement: every function that return either a value or `null` (or `undefined`, implicitly for now) must indicate it in its signature: `T | null`.

Still, `null` is in itself problematic as it can lead to:

- Branches in the client code, in various forms:
  - *Null Guard* : `if (a != null)`
  - Syntactical sugar:
    - *Ternary operator*: `a ? a.key : null`
    - *Falsy/Nullish Coalescing* : `find(...) || defaultValue` or with `??` (C♯, Ts 3.7)
    - *Optional chaining* (a.k.a. *Null Propagation*) : `a?.k` (C♯, Ts 3.7)
- Cumulative negative effects: `if/else` blocks chained or, worst, nested *([arrow anti-pattern](http://wiki.c2.com/?ArrowAntiPattern))*
  - ❌ Raises cyclomatic complexity
  - ❌ Looses readability

### Principle of `Maybe`

`Maybe<T>` is a box that can contain:

- either *some* value of a given type `T`,
- or *none* (a.k.a. *nothing*, *empty*).

👉 This is how `Maybe` type models the **absence of value**.

### Partial operation / Creating `Maybe` instance

`Maybe` is useful as a return type of a function defining an operation that computes a value but may not be able to do it in some circumstances. We talk about [partial operation](https://en.wikipedia.org/wiki/Partial_function).

Example: inverting a number is not possible when it's zero.

- In JavaScript, `1/0` causes no errors returning a edge case value `Infinity`, but not indicated in the signature (still `number`).
- We can return `Maybe<number>` to indicate that the invert computation is a partial operation, not always possible given the input set of all numbers.
- 2 styles of implementation are possible:

```ts
// 1. Explicit return type
const invert = (n: number): Maybe<number> =>
    // --------------------  ☝️
    n ? Maybe.some(1 / n)
      : Maybe.none();

// 2. Inferred return type
const invert = (n: number) =>
    n ? Maybe.some(1 / n)
      : Maybe.none<number>();
        // ------  ☝️
```

### Opacity / Value accessibility

When there's no value in the box, we don't want to throw an error or the return `undefined`. We don't to let the client code to rely on the Tester/Doer pattern (`if (hasValue) use(value)`) for its own safety. We better provide intrinsic safety by design.

👉 There's no `get value()`, no `get hasValue()`.

The box is fully opaque but let us:

- Match exhaustively both cases to converge to a final "value" or do a final "IO" operation,
- Perform some filtering/mapping operation on the optional inner value in the box,
- Unwrap the optional value if we give a default value when there's none.

### Pattern matching with `match` method

This a variation of the *Visitor* design pattern, `match` being the equivalent of `accept(visitor)`. The aim is to get closed to the F♯ pattern matching syntax.

```ts
const threeOrUndefined = [1, 2, 3, 4].find(x => x === 3);
  //  ↑ Type: `number | undefined`

const maybeThree = Maybe.ofNullable(threeOrUndefined);
  //  ↑ Type: `Maybe<number>`

                                     // In F♯
const message = maybeThree.match({   // match maybeThree with
  some: x  => `the value is ${x}`,   // | Some x -> sprintfn "the value is %A" x
  none: () => `the value is None`,   // | None   -> sprintfn "the value is None"
});
```

### Intrinsic control flow

Context: we are dealing with a business operation that is partial. It's complex enough so that we have split it in sub operations, some being partial too.

We want the client code to be responsible only of the *data flow* because it's the purest expression of the domain modeling. We don't want any *control flow* regarding whether some operation returned no value. This logic is delegated to the box itself.

This control flow is expressed through:

- Array-like methods that can be chained: `map`, `flatMap`, `filter`
- `traverse` function for "mass processing"

They respects functional programming principles that make code much safer:

- *Immutability* : `Maybe` instance are immutable. If it has to change its value or toggle its status, it will do it in a new instance and return it. No other part in the codebase can interact / mutate the current object.
- *Purity* : as long as the mapping/filtering function are pure, the overall operation will be pure = side-effect free = no mutation, no change out of scope => repeatability: same inputs will produce same outputs.

### Explicit data flow

Since `map`, `flatMap`, `filter` methods can be chained, we can split an partial operation into sub operations, some of them being partial too.

Advantages:

- Each sub operation is simpler to understand and to test.
- Express the happy path, the nominal case where every sub operations return a value.
- Dealing with absence of value: only once, at the end
  - With `valueOrDefault` or `valueOrGet` to get the final value, unwrapped or defaulted
    - For instance a `string` with the formatted value or an error message
  - With `match()` for a final operation producing a value (that can be of another type) or not (see Angular example of `traverse` function)

## Methods

### `map` method

> *(a.k.a `Select` LINQ)*

- Aim: executing a *mapping* operation which is total (= not partial)
  - Expressed as a function with signature `(value: T) -> U`
- Schema: `Maybe<T>` → `map(operation)` → `Maybe<U>`
- Cases: 2 - tracks *some* and *none* not connected:

```txt
   Entrée          Opération       Sortie
1. some(x) ───► map( x -> y ) ───► some(y)
2. none()  ───► map(  ....  ) ───► none()
```

Example:

```ts
const maybeThree = Maybe.some(3);
  // Returned by a previous partial operation

const double = (n: number) => n * 2;
  // Next operation (total)

const result = maybeThree.map(double);
  // Equivalent of `Maybe.some(6)`
```

### `flatMap` method

> *(a.k.a `bind`, `SelectMany` LINQ)*

- Aim: executing a *mapping* operation which is partial
  - Expressed as a function with signature `(value: T) -> Maybe<U>`
- Why not use `map`?
  - Because we will have nested box `Maybe<Maybe<U>>` which is not practical.
- Solution: flatten the result
- Cases: 3 - tracks *some* and *none* connected:

```txt
   Entrée                  Opération         Sortie
1a. some(x) ─┬─► flatMap( x -> some(y) ) ───► some(y)
1b.          └─► flatMap( x -> none()  ) ─┐
2.  none()  ───► flatMap(     ....     ) ─┴─► none()
```

> 👉 "Bowling gutter" effect: once in the gutter, no way to get out of it.

Example: compute the average price of the orders of a client
-> 2 partial operations to combine:

- Getting the client orders
- Computing the average order price, impossible when there's no orders

```ts
type Order = { price: number };

declare function getOrders: (clientId: number) => Maybe<Order[]>;
  // Return `none` when client is unknown

declare function sum: (numbers: number[]) => number;
```

```ts
const computeAveragePrice = (orders: Order[]): Maybe<number> =>
    orders.length
      ? Maybe.some(sum(orders.map(x => x.price)) / orders.length)
      : Maybe.none();

const computeAverageOrderPrice = (clientId: number) =>
  getOrders(clientId)
    .flatMap(computeAveragePrice);
```

### `filter` method

> *(a.k.a `Where` LINQ)*

- `map`, `flatMap` → *mapping* of valeur
- `filter` → skip a value when it does not satisfy a condition, evaluated by the given predicate
  - Signature 1: `filter(predicate: (value: T) => boolean): Maybe<T>`
  - Signature 2: `filter<S extends T>(guard: (value: T) => value is S): Maybe<S>`
- Cases: 3 - tracks *some* and *none* connected - same "gutter effect" as `flatMap`:

```txt
   Entrée                Opération         Sortie
1a. some(x) ─┬─► filter( x -> true  ) ───► some(y)
1b.          └─► filter( x -> false ) ─┐
2.  none()  ───► filter(    ....    ) ─┴─► none()
```

### `match` method

- Signature: `match<U>(visitor: { some: (value: T) => U, none: () => U }): U`
- Description: exhaustive pattern matching of the 2 cases (*some value* vs *none*), converging to a final *unwrapped* type `U` (that can be `void`).
- Example:

```ts
const average = (total: number, count: number): Maybe<number> =>
  Maybe.some(count)
       .filter(x => x > 0)
       .map(x => total / x);

const testAverage = (total: number, count: number): void => {
  const message = average(total, count).match({
    some: x  => `given positive count (${count}), the average is ${x}`,
    none: () => `given count 0, the average is None`,
  });
  console.log(message);
}

testAverage(100, 0);  // > given count 0, the average is None
testAverage(100, 25); // > given positive count (25), the average is 4
```

☝️ **Note:** `match({ some, none })` is equivalent to chaining `map(some).valueOrGet(none)`.

### `valueOrDefault` method

> *(a.k.a `defaultIfNone`, `orElse` Java `Optional`, `FirstOrDefault` LINQ)*

- Signature: `valueOrDefault(defaultValue: T): T`
- Description: unwrap the value if there is some or return the given `defaultValue`.
- Example:

```ts
declare function tryGenerateNumber(): Maybe<number>;

const result =
  tryGenerateNumber()
    .map(square) //   >= 0
    .flatMap(tryInvert)
    .valueOrDefault(-1); //   < 0 expresses the "failure", the absence of value, like `Array::indexOf` does
```

### `valueOrGet` method

> *(a.k.a `orElseGet` Java `Optional`)*

- Signature: `valueOrGet(getDefaultValue: () => T): T`
- Description: unwrap the value if there is some or call the given function `getDefaultValue` and return its result.
- Example:

```ts
declare function tryGenerateNumber(): Maybe<number>;

const result =
  tryGenerateNumber()
    .map(square) //   >= 0
    .flatMap(tryInvert)
    .valueOrGet(() => -1);
```

### `traverse` function

- Given:
  - A set of values: `values: T[]`
  - A partial operation: `op: T → Maybe<U>`
- Issue with `values.map(op)`, returning `Array<Maybe<U>>` not practical
- Aim: having the nesting the other way around: `Maybe<Array<U>>`
  - Either all values that the operation managed to produce *(applicative style, not monadic style)*
  - Or none when no values have been produced

Example: Search feature in a file Explorer application (like Windows Explorer)

- Display either only the found files, with a highlighting of the match in the file name
- Or a message "No files found"

Pseudo-Angular component:

```ts
declare function highlight(element: Element, search: string): Maybe<Element>;

@Component() class GridComponent {
  @Input() allElements: Element[] = [];
  elements: Element[] = [];
  noResults = false;

  find(search: string): void {
    const result = traverse(this.allElements, element => highlight(element, search));
      //  ↑ Type: `Maybe<Element[]>`

    result.match({
      some: xs => { this.elements = xs; this.noResults = false; },
      none: () => { this.elements = []; this.noResults = true; },
    });
  }
}
```

## Code comparison: `null` vs `Maybe`

### 1. Single optional result

```ts
// V1 : with `null`
const result = find(...); // Result | nil
return result
       ? handle(result)
       : handleNoResults();

// V2 : with `Maybe`
const result = tryFind(...); // Maybe<Result>
return result.match({
  some: handleResult,
  none: handleNoResults,
});
```

👉 `Maybe` is a bit "heavy" but a bit safer, forcing to deal with the absence of value (*none* case)
→ `null` is acceptable here 👌

### 2. Chaining optional results

```ts
// V1 : with `null`
const a = getA(...);          // A | nil
const b = a ? getB(a) : null; // B | nil
return b ? getC(b) : null;    // C | nil

// V2 : with `Maybe`
return tryGetA(...)
        .flatMap(tryGetB)
        .flatMap(tryGetC);
```

👉 Cyclomatic complexity goes down from 3 to 1, leading to code more understandable → `Maybe` wins!

### 3. Computation decomposed in transitional steps

```ts
// V1 : with `null` + pattern Tester (`> 0`) / Doer (`invert`)
const num = generateNumber();
const result = num != null && num > 0
               ? invert(square(num))
               : null;

// V2 : with `Maybe`
const result = tryGenerateNumber()
                .map(square)
                .flatMap(tryInvert);
```

👉 V2 expressed more clearly the computation steps: one line per step, in the natural order (*square* then *invert* ≠ `invert(square(num))`). *invert* step is handled entirely in `tryInvert` (condition + operation). → `Maybe` winner 🎌

## FAQ

### How to create a `Maybe` instance ❓

Use either:

- `Maybe.some(value)` to wrap a value
- `Maybe.none()` (or `Maybe.none<T>()` if necessary, specifying the proper `T`) to indicate the absence of value
- `Maybe.ofNullable(nullableValue)` to convert a nullable value into a `Maybe` instance, either `some(value)` if the value is not `null` or `undefined`, else `none()`.

☝️ **Notes:**

- It's possible to wrap the value `null` in a `Maybe` instance but it's not recommended!
- It's possible to wrap a function too. *TODO: talk about `apply` function*

### How to exit from a `Maybe` instance ❓

Use one of the following methods: `match` or `valueOrDefault` or `valueOrGet`. `match` converges to another type which can be `void`. In either cases, it is here where the possible absence of value is handled.

👉 **Tips:** Delay this "exit" as much as possible, until having the whole partial operation recombined. Otherwise, you probably will have to handle the 2 cases (presence or absence of value) by hand, instead of delegating it to the `Maybe` instance.

### Is it a niche, a (software) crafter stuff, not for every developer ❓

- Cliché! It's in Java since 2014 as `Optional` → it's *MainStream*!
- You can use it right now in a TypeScript codebase, front or back.

### Do we need to replace `null` with `Maybe` everywhere ❓

- ~~Everywhere~~ ❌ ! TypeScript ecosystem is *null friendly* (a lot of functions returning `null` or `undefined`). We cannot change it, but ensafe some part of our codebase, the one that is the more valuable or complex.
- It's a compromise to found between quality and pragmatism
  - `null` can still be used in the simpler cases, with the `strictNullCheck` safety.
  - `Maybe` is preferable in the all other cases.

### What about unit testing ❓

Not much more complicated than with a nullable value, since `Maybe` instances are "equatable":

| `expect(result)` | With `null`     | With `Maybe`             |
|------------------|-----------------|--------------------------|
| No value         | `toEqual(null)` | `toEqual(Maybe.none())`  |
| Value            | `toBe(3)`       | `toEqual(Maybe.some(3))` |

### What about its implementation ❓

The implementation of the `Maybe` type is based on ad-hoc polymorphism, which is the better thing to do in TypeScript: the code is not bloated with `if (hasValue) use(value) else useNone()`!

The 2 cases, `Some` and `None` are coded in separate objects. They are constructed using classes, not using object literals, so that the instances can be equatable i.e. usable with asserter like Jasmine/Jest `expect(result).toEqual(Maybe.some(value))`. It's due to the fact that, since the methods are in the prototype, they are not used for comparison, contrary to object literals holding their methods as own members.
