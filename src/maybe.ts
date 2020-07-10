import { None }                              from './none';
import { Some }                              from './some';
import { KeyOfTuple, nil, PredicateOrGuard } from './utility-types';

export interface Maybe<T> {
  /**
   * Fill the value with the given `defaultValue` if `this` "is" none.
   */
  fillWhenNone(defaultValue: T): Maybe<T>;

  /**
   * @return `none` when the `value` does not satisfy the given predicate
   * @summary A.k.a `Where` (C# LINQ)
   */
  filter<S extends T = T>(predicate: PredicateOrGuard<T , S>): Maybe<S>;

  /**
   * Given a mapping function that may return no value (hence the `Maybe` result type),
   * apply it on the value if there's some.
   * @param mapper: mapping function used to try to map the value when there's some.
   * @return a new `Maybe` object, either some mapped value or none.
   * @summary A.k.a `bind` (F# `Option`, Haskell `Maybe`), `SelectMany` (C# LINQ)
   */
  flatMap<U>(mapper: (value: T) => Maybe<U>): Maybe<U>;

  /**
   * Given a mapping function, apply it on the value if there's some.
   * @param mapper: mapping function used to map the value when there's some.
   * @return a new `Maybe` object, either some mapped value or none.
   * @summary A.k.a `Select` (C# LINQ)
   */
  map<U>(mapper: (value: T) => U): Maybe<U>;

  /**
   * Handle both cases (some value or none) at once.
   * @param matcher: kind of visitor having handlers for each cases: "some value" and "none".
   * @summary A.k.a `accept` (Visitor design pattern)
   */
  match<U>(matcher: { some: (value: T) => U, none: () => U }): U;

  /**
   * Unwrap the value if there is some or return the given `defaultValue`.
   * @summary A.k.a `defaultIfNone`, `orElse` (Java `Optional`), `FirstOrDefault` (C# LINQ)
   */
  valueOrDefault(defaultValue: T): T;

  /**
   * Unwrap the value if there is some or call the given function `getDefaultValue` and return its result.
   * @summary A.k.a `orElseGet` (Java `Optional`)
   */
  valueOrGet(getDefaultValue: () => T): T;
}

export namespace Maybe {
  export const some = <T>(value: T): Maybe<T> => new Some(value);
  export const none = <T>(): Maybe<T> => new None<T>();

  export const ofNullable = <T>(value: T | nil): Maybe<T> =>
    some(value).filter<T>(x => x != null);
}

/**
 * Apply an optional curried function one argument at a time, each argument being optional too.
 * To fully apply a N-ary function, call `apply` N times.
 * @param fun: optional curried function
 * @param arg: optional argument to apply to `fun`
 */
export function apply<T, U>(fun: Maybe<(value: T) => U>, arg: Maybe<T>): Maybe<U> {
  return fun.match({
    none: () => Maybe.none<U>(),
    some: fn => arg.map(value => fn(value)),
  });
}

type ParametersAsMaybe<F extends (...args: any[]) => any, P extends any[] = Parameters<F>> = {
  [K in keyof P]: K extends KeyOfTuple<P> ? Maybe<P[K]> : never
} & { length: P['length'] } & any[];

/**
 * Try to call the given N-ary function `fn` from the given N optional values `maybeArgs` when all are present.
 * @param fn: function to call
 * @param maybeArgs: optional values to pass as arguments to `fn` when all are present.
 */
export function mapN<F extends (...args: any[]) => any>(fn: F, ...maybeArgs: ParametersAsMaybe<F>): Maybe<ReturnType<F>> {
  return traverse(maybeArgs, x => x)
    .filter(args => args.length === maybeArgs.length)
    .map(args => fn(...args));
}

export function traverse<T, U>(items: T[], tryMap: (item: T, index: number) => Maybe<U>): Maybe<U[]> {
  const someItems = items.reduce(
    (result: Maybe<U[]>, item: T, index: number) => tryMap(item, index).match({
      some: x => result.map(xs => xs.concat(x)),
      none: () => result,
    }),
    Maybe.some([] as U[]));
  return someItems.filter(xs => xs.length > 0);
}
