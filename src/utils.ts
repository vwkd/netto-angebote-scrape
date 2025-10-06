/**
 * Generate range of integers
 *
 * @param start lower bound (inclusive), integer, smaller or equal to `end`
 * @param end upper bound (inclusive), integer, larger or equal to `start`
 * @returns a generator yielding numbers from start to end
 */
export function* range(start: number, end: number): Generator<number> {
  for (let i = start; i <= end; i += 1) {
    yield i;
  }
}
