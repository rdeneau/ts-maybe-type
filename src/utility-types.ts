export type nil = null | undefined;

export type PredicateOrGuard<T, S extends T = T> =
  | ((value: T) => boolean)
  | ((value: T) => value is S);
