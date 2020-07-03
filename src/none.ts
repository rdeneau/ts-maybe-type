import { Maybe } from './maybe';
import { Some }  from './some';

export class None<T> implements Maybe<T> {
  fillWhenNone(defaultValue: T): Maybe<T> {
    return new Some(defaultValue);
  }

  filter<S extends T>(): Maybe<S> {
    return new None<S>();
  }

  flatMap<U>(): Maybe<U> {
    return new None<U>();
  }

  map<U>(): Maybe<U> {
    return new None<U>();
  }

  match<U>(matcher: { some: (value: T) => U; none: () => U }): U {
    return matcher.none();
  }

  valueOrDefault(defaultValue: T): T {
    return defaultValue;
  }
}
