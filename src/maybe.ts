import { None }                  from './none';
import { Some }                  from './some';
import { nil, PredicateOrGuard } from './utility-types';

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

// export function apply<A, B>(maybeFn: Maybe<(a: A) => B>, maybeA: Maybe<A>): Maybe<B>;
// export function apply<A, B, C>(maybeFn: Maybe<(a: A, b: B) => C>, maybeA: Maybe<A>, maybeB: Maybe<B>): Maybe<C>;
// export function apply<A, B, C, D>(maybeFn: Maybe<(a: A, b: B, c: C) => D>, maybeA: Maybe<A>, maybeB: Maybe<B>, maybeC: Maybe<C>): Maybe<D>;
// export function apply<A, B, C, D, E>(maybeFn: Maybe<(a: A, b: B, c: C, d: D) => E>, maybeA: Maybe<A>, maybeB: Maybe<B>, maybeC: Maybe<C>, maybeD: Maybe<D>): Maybe<E>;
// export function apply(maybeFn: Maybe<(...args: any[]) => any>, ...maybeArgs: Maybe<any>[]): Maybe<any> {
//
// }

export function traverse<T, U>(items: T[], tryMap: (item: T, index: number) => Maybe<U>): Maybe<U[]> {
  const someItems = items.reduce(
    (result: Maybe<U[]>, item: T, index: number) => tryMap(item, index).match({
      some: x => result.map(xs => xs.concat(x)),
      none: () => result,
    }),
    Maybe.some([] as U[]));
  return someItems.filter(xs => xs.length > 0);
}
