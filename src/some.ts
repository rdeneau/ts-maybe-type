import { Maybe }            from './maybe';
import { None }             from './none';
import { PredicateOrGuard } from './utility-types';

export class Some<T> implements Maybe<T> {
  constructor(private readonly value: T) {}

  fillWhenNone(): Maybe<T> {
    return this;
  }

  filter<S extends T>(predicate: PredicateOrGuard<T, S>): Maybe<S> {
    const value = this.value;
    return predicate(value)
           ? new Some(value)
           : new None<S>();
  }

  flatMap<U>(mapper: (value: T) => Maybe<U>): Maybe<U> {
    return mapper(this.value);
  }

  map<U>(mapper: (value: T) => U): Maybe<U> {
    return new Some(mapper(this.value));
  }

  match<U>(matcher: { some: (value: T) => U; none: () => U }): U {
    return matcher.some(this.value);
  }

  valueOrDefault(): T {
    return this.value;
  }

  valueOrGet(): T {
    return this.value;
  }
}
