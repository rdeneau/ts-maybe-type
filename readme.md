# Object-oriented Maybe type in TypeScript

[![npm version](https://img.shields.io/npm/v/ts-maybe-type) ![npm download](https://img.shields.io/npm/dt/ts-maybe-type)](https://www.npmjs.com/package/ts-maybe-type)

The `Maybe` type, a.k.a. `Option` in F♯, `Optional` in Java 8, is conceptually similar to the type `{ value?: T }`. Except that its value is properly encapsulated i.e. not directly accessible. Instead, the `Maybe` type offers higher-level but still intuitive behaviors that enforces the quality of the code on the client side.

💡 It's really a well designed type. It's due to its mathematical foundations *(functor and monad)* and to functional programming principles. But don't worry ! It's simple and intuitive enough to be used without this background.

👍 Its main benefit is to help having a codebase more robust *(`null` free)* and more structured *(separation of data flow and control flow)*.

👉 The design is object-oriented: the type exposes methods like `map` and `filter`, so that they can be chained, offering simpler syntax and idiomatic usage in TypeScript than using external functions, at least as long as TypeScript will not have operators like `|>` _(pipe right)_ and `>>` _(compose right)_.

- [Introduction](#introduction)
  - [TL;DR](#tldr)
  - [Absence of value: `null` is still not ideal](#absence-of-value-null-is-still-not-ideal)
  - [Principle of `Maybe`](#principle-of-maybe)
  - [Partial operation & `Maybe` type as return type](#partial-operation--maybe-type-as-return-type)
  - [Opacity](#opacity)
  - [Intrinsic control flow](#intrinsic-control-flow)
  - [Explicit data flow](#explicit-data-flow)
- [Methods](#methods)
  - [`map` method](#map-method)
  - [`flatMap` method](#flatmap-method)
  - [`filter` method](#filter-method)
  - [`fillWhenNone` method](#fillwhennone-method)
  - [`match` method - Pseudo pattern matching objet-oriented style](#match-method---pseudo-pattern-matching-objet-oriented-style)
  - [`valueOrDefault` method](#valueordefault-method)
  - [`valueOrGet` method](#valueorget-method)
- [Functions](#functions)
  - [`traverse` function](#traverse-function)
  - [`apply` function](#apply-function)
  - [`mapN` function](#mapn-function)
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
  - [Where can we find more information ❓](#where-can-we-find-more-information-)

## Introduction

### TL;DR

- Much more than a simple `null` substitute!
- Easy to grasp due to similarity with `array` and its methods [`filter`](#filter-method), [`map`](#map-method), [`flatMap`](#flatmap-method)
- Robust and safe: in all cases, no runtime error by design *(no `null`, `undefined` billion dollars mistake)*
- Ease splitting a business operation to improve the domain expression and simplify the code

### Absence of value: `null` is still not ideal

`Maybe` is a generic type to model the **absence of value**.

> 🗯 We have `strictNullCheck` option to keep us safe with `null`. Why not using `null` in this case ❓

`strictNullCheck` is a great improvement: every function that return either a value or `null` (or `undefined`, implicitly included for now) must indicate it in its signature: `T | null`. For instance, `find` method of an array `items: T[]` has return type `T | undefined`: it returns `undefined` when no item has been found.

Still, `null` is in itself problematic as it can lead to:

- Branches in the client code, in various forms:
  - *Null Guard* : `if (o != null) { useNonNull(o); }`
  - Syntactical sugar:
    - *Ternary operator*: `o ? o.key : null`
    - *Falsy/Nullish coalescing* : `find(...) || defaultValue` or with `??` (C♯, Ts 3.7)
    - *Optional chaining* (a.k.a. *Null Propagation*) : `o?.k` (C♯, Ts 3.7)
- Cumulative negative effects: `if/else` blocks chained or, worst, nested *([arrow anti-pattern](http://wiki.c2.com/?ArrowAntiPattern))*
  - ❌ Raises cyclomatic complexity
  - ❌ Looses readability

### Principle of `Maybe`

`Maybe<T>` is a "box" that can contain:

- either *some* value of a given type `T`,
- or *none* (a.k.a. *nothing*, *empty*).

👉 This is how `Maybe` type models the **absence of value**.

### Partial operation & `Maybe` type as return type

`Maybe` is useful as a return type of a function defining a [partial operation](https://en.wikipedia.org/wiki/Partial_function), i.e. a function that computes a value but may not do it for some input values.

Example: inverting a number is not possible when it's zero. It's a partial operation.

- In JavaScript, `1/0` causes no errors returning a edge case value `Infinity`, but not indicated in the signature (still `number`).
- We can return `Maybe<number>` to indicate that the invert computation is a partial operation.
  - When `n !== 0`, instead of returning `1/n`, we wrap this value in the `Maybe` instance, using the factory function `Maybe.some(1/n)`
  - When `n === 0`, instead of returning `null` or `undefined` or `NaN`, we return an empty `Maybe` instance, using the factory function `Maybe.none()`
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

### Opacity

When there's no value in the box, we don't want to throw an error or to return `undefined`. We don't want to put the burden upfront, on the client code side that has to rely on the Tester/Doer pattern (`if (hasValue) use(value)`) for its own safety. We better provide **intrinsic safety** by design.

👉 There's neither `get value()` nor `get hasValue()` in the `Maybe` type.

The box is fully opaque, encapsulating its optional inner value, but lets us:

- Perform some filtering/mapping operation on the optional value in the box
  - Filtering: @see [`filter`](#filter-method)
  - Mapping: @see [`map`](#map-method), [`flatMap`](#flatmap-method)
- Match exhaustively both cases to converge to a final "value" or do a final "IO" operation
  - @see [`match`](#match-method)
- Unwrap the optional value if we give a default value when there's none
  - @see [`valueOrDefault`](#valueordefault-method), [`valueOrGet`](#valueorget-method)

### Intrinsic control flow

Context: we are dealing with a business operation that is partial. It's complex enough so that we have split it in sub operations, some being partial too.

We want the client code to be responsible only of the *data flow* because it's the purest expression of the domain modeling. We don't want any *control flow* regarding whether some operation returned no value. This logic is delegated to the box itself.

This control flow is expressed through:

- Array-like methods that can be chained: [`map`](#map-method), [`flatMap`](#flatmap-method), [`filter`](#filter-method)
- [`traverse` function](#traverse-function) for "mass processing"

✔️ They respects functional programming principles that make code much safer because deterministic:

- *Immutability* : `Maybe` instance are immutable. If it has to change its value or toggle its status, it will do it in a new instance and return it. No other part in the codebase can interact / mutate the current object.
- *Purity* : as long as the mapping/filtering function are pure, the overall operation will be pure = side-effect free = no mutation, no change out of scope => repeatability: same inputs will produce same outputs.

### Explicit data flow

Since [`map`](#map-method), [`flatMap`](#flatmap-method), [`filter`](#filter-method) methods can be chained, we can split an [partial operation](#partial-operation--maybe-type-as-return-type) into sub operations, some of them being partial too.

✔️ Advantages:

- Each sub operation is simpler to understand and to test.
- Express the happy path, the nominal case where every sub operations return a value.
- Dealing with absence of value: only once, at the end
  - With `valueOrDefault` or `valueOrGet` to get the final value, unwrapped or defaulted
    - For instance a `string` with the formatted value or an error message
  - With `match()` for a final operation producing a value (that can be of another type) or not (see Angular example of `traverse` function)

## Methods

### `map` method

> *(a.k.a `lift`, `Select` LINQ)*

- Aim: executing a *mapping* operation which is total (= not partial)
  - Expressed as a function with signature `(value: T) -> U`
- Schema: `Maybe<T>` → `map(operation)` → `Maybe<U>`
- Case count: 2 → tracks *some* and *none* not connected:

```txt
   Input            Operation      Output
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

> *(a.k.a `andThen`, `bind`, `SelectMany` LINQ)*

- Aim: executing a *mapping* operation which is partial
  - Expressed as a function with signature `(value: T) -> Maybe<U>`
- Why not use `map`?
  - Because we will have nested box `Maybe<Maybe<U>>` which is not practical.
- Solution: flatten the result
- Case count: 3 → "tracks" *some* and *none* are connected:

```txt
    Input                 Operation           Output
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
    Input                Predicate         Output
1a. some(x) ─┬─► filter( x -> true  ) ───► some(y)
1b.          └─► filter( x -> false ) ─┐
2.  none()  ───► filter(    ....    ) ─┴─► none()
```

### `fillWhenNone` method

- Signature: `fillWhenNone(defaultValue: T): Maybe<T>`
- Description: `fillWhenNone` method has an opposite purpose compared to `filter`: populating some value when it is missing.

```txt
    Input                   Value     Output
1a. some(x) ─┬─► fillWhenNone(…) ─┬─► some(x)
2.  none()  ───► fillWhenNone(x) ─┘
```

Example:

```ts
// Simulate "OR" operator between 2 optional numbers
function combineResults(results1: Maybe<number>, results2: Maybe<number>): Maybe<number> {
  return results1.match({
    some: x => results2.map(y => x + y).fillWhenNone(x),
    none: () => results2,
  });
}

combineResults(Maybe.none<number>(), Maybe.none<number>()); // → Maybe.none()
combineResults(Maybe.some(1),        Maybe.none<number>()); // → Maybe.some(1)
combineResults(Maybe.none<number>(), Maybe.some(2));        // → Maybe.some(2)
combineResults(Maybe.some(1),        Maybe.some(2));        // → Maybe.some(3)
```

☝️ **Notes:**

- It reverts the "gutter" effect.
- It's different from `valueOrDefault` because the former keeps the value in a box while the later unwraps it.

### `match` method - Pseudo pattern matching objet-oriented style

This method mimics F♯ pattern matching of the `Option` union type. It's a variation of the *Visitor* design pattern, `match` being the equivalent of `accept(visitor)`.

- Signature: `match<U>(visitor: { some: (value: T) => U, none: () => U }): U`
- Description: exhaustive pattern matching of the 2 cases (*some value* vs *none*), converging to a final *unwrapped* type `U` (that can be `void`).

Example #1:

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

Example #2:

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

☝️ **Note:** `valueOrDefault` method is conceptually similar to *nullish coalescing* operator `??` but without increasing the [cyclomatic complexity](https://en.wikipedia.org/wiki/Cyclomatic_complexity):

- With nullish value: `null ?? -1` → `-1`
- With `Maybe` type: `Maybe.none<number>().valueOrDefault(-1)` → `-1`

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

## Functions

The `Maybe` package provides additional features that simplify dealing with several `Maybe` objects.

### `traverse` function

Signature: `function traverse<T, U>(items: T[], tryMap: (item: T, index: number) => Maybe<U>): Maybe<U[]>`

Utility of such function:

- `items.map(tryMap)` returns `Array<Maybe<U>>` which is not practical ❌
- Aim: having the nesting done the other way around: `Maybe<Array<U>>`
  - With Either all values that the partial operation `tryMap` managed to produce
  - Or *none* when no values have been produced

Example: Search feature in a file Explorer application (like Windows Explorer)

- Display either the found files only, with a highlighting of the matched part in the file name
- Or a message similar to "No files found"

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

### `apply` function

- Signature: `function apply<T, U>(fun: Maybe<(value: T) => U>, arg: Maybe<T>): Maybe<U>`
- Purpose: as its name implies, the `apply` function is related to calling a function `fn`, in case both function and its arguments came from partial operations. We will be able to call `fn` only if everything is present.

#### Theory (feasible with a true functional language)

In a functional language like F♯, functions are automatically [curried](https://en.wikipedia.org/wiki/Currying). For instance, a function with 2 arguments, `(a: A, b: B) => C`, becomes `(a: A) => (b: B) => C` once curried, i.e. a function with one argument (`a: A`) returning another function with one argument (`b: B`) returning the final value of type `C`. The advantage is that both functions have the same generic signature `T => U`: `T = A, U = (B => C)` for the first one, `T = B, U = C` for the second one.

So, we can "apply" arguments one at a time with the `apply` function. But from theory to practice (in TypeScript), there's some pitfalls! Let's look at a example:

```ts
type OrderItem = { sku: string; discount: string; };

declare function tryGetPrice(sku: string): Maybe<number>;
declare function tryGetDiscount(discount: string): Maybe<Discount>;
declare function applyDiscount(price: number): (discount: Discount) => number; // ☝️ Curried

const computeOrderItemPrice = (orderItem: OrderItem): Maybe<number> =>
  // TODO
```

With the help of the [pipe operator `|>`](https://github.com/microsoft/TypeScript/issues/17718), the syntax would be readable:

```ts
const computeOrderItemPrice = (orderItem: OrderItem): Maybe<number> =>
  Maybe.some(applyDiscount)
  |> apply(tryGetPrice(orderItem.sku))
  |> apply(tryGetDiscount(orderItem.discount));
```

But we don't have the pipe operator yet. Without it, it's more cumbersome in either cases:

```ts
// V1: nested calls are hard to code due to parenthesis
const computeOrderItemPrice = (orderItem: OrderItem): Maybe<number> =>
  apply(apply(Maybe.some(applyDiscount),
    tryGetPrice(orderItem.sku)),
    tryGetDiscount(orderItem.discount));

// V2: Temporary variables help reading in order but bloat code too
const computeOrderItemPrice = (orderItem: OrderItem): Maybe<number> =>
    const fn2 = Maybe.some(applyDiscount); // Type: Maybe<(price: number) => (discount: Discount) => number>
    const fn1 = apply(fn2, tryGetPrice(orderItem.sku)); // Type: Maybe<(discount: Discount) => number>>
    return apply(fn1, tryGetDiscount(orderItem.discount));
};
```

Why not proposing a method on the `Maybe` object? With such a method, we will be closed to the syntax using the pipe operator:

```ts
const computeOrderItemPrice = (orderItem: OrderItem): Maybe<number> =>
  Maybe.some(applyDiscount)
       .apply(tryGetPrice(orderItem.sku))
       .apply(tryGetDiscount(orderItem.discount));
```

Coding such a method is a challenge cause we have the interface `Maybe<T>` but the `apply` method must be proposed only with the type `Maybe<(arg: T) => U>` ❗️

#### In practice

👉 To sum up the issues of the theoretical `apply` function:

1. It cannot be coded as a _method_ easily.
   - As a _function_, it's not practical.
2. It works well only with a curried function which is not idiomatic in TypeScript.
   - It's possible to curry a function in JavaScript, for instance using [Ramda](https://ramdajs.com/docs/#curry), but its type is another challenge to code in TypeScript.

In practice in TypeScript, it's much simpler to use the [`mapN` function](#mapn-function).

### `mapN` function

> *(a.k.a `liftN`)*

Let's explain the utility of `mapN` by comparisons with other methods and functions of the `Maybe` type:

- `mapN` *vs* [`map`](#map-method):
  - [`map`](#map-method) and [`flatMap`](#flatmap-method) methods are dealing with unary functions, i.e. functions taking only one argument.
  - [`apply`](#apply-function) and `mapN` functions are is dealing with N-ary functions.
- `mapN` *vs* [`apply`](#apply-function):
  - [`apply`](#apply-function) works well with curried functions, in order to apply arguments one by one. Also the functions are optional i.e. wrapped in a `Maybe` object.
  - `mapN` works with regular N-ary functions _(i.e. not curried)_, with the idea to do only one call, specifying all N potential values to pass as arguments to the N-ary function. This way is often more practical in TypeScript than using a curried function and several call to the `apply` function.

Signature:

- `N = 1` argument
  - `function mapN<A, B>(fn: (a: A) => B, maybeA: Maybe<A>): Maybe<B>`
  - 💡 Better call `maybeA.map(fn)` directly!
- `N = 2` arguments
  - `function mapN<A, B, C>(fn: (a: A, b: B) => C, maybeA: Maybe<A>, maybeB: Maybe<B>): Maybe<C>`
- Etc.
- `N > 4` arguments
  - ⚠️ The function accepts more than 4 arguments. Nevertheless, too much arguments is not recommended - @see [long parameter list code smell](https://refactoring.guru/smells/long-parameter-list)! Consider refactoring the code.

Example:

```ts
type OrderItem = { sku: string; discount: string; };

declare function tryGetPrice(sku: string): Maybe<number>;
declare function tryGetDiscount(discount: string): Maybe<Discount>;
declare function applyDiscount(price: number, discount: Discount) => number;

const computeOrderItemPrice = (orderItem: OrderItem): Maybe<number> =>
  mapN(applyDiscount,
    tryGetPrice(orderItem.sku),
    tryGetDiscount(orderItem.discount));
```

☝️ **Note:** `apply` and `mapN` are of more interest with another type, `Result<Success, Error[]>`, which is conceptually similar to the union type `{ value: Success } | { errors: Error[] }`. With this type, the *Failure* case can have multiples values (here called errors) as opposed to none for the `Maybe` type. `apply` and `mapN` applied to `Result` will collect the errors which is called the *"applicative style"*, as opposed to the *"monadic style"* of `flatMap` which is keeping only the first error.

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

👉 [Cyclomatic complexity](https://en.wikipedia.org/wiki/Cyclomatic_complexity) goes down from 3 to 1, leading to code more understandable → `Maybe` wins!

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

- It's possible to wrap the value `null` in a `Maybe` instance (e.g. `Maybe.some(null)` is possible) but it's not recommended! Prefer `Maybe.ofNullable()` to wrap a nullable value.
- It's possible to wrap a function too. *@see [`apply` function](#apply-function)*

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

### Where can we find more information ❓

🔗 [More information on `map`, `bind`, `apply`, `traverse` functions](https://fsharpforfunandprofit.com/posts/elevated-world/), F# for fun and profit, Scott Wlaschin.

🔗 🇫🇷 Pour ceux qui comprennent le français, j'ai donné une conférence sur le type `Maybe` en TypeScript et en C♯ : https://youtu.be/Gtu-AGIbRSI.
