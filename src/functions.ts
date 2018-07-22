/*
 * Random element from Array arr.
 */
function randomElem (arr: any[]): any {
  return arr[randomInt(0, arr.length - 1)];
}

/*
 * Random integer between min and max.
 */
function randomInt (min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/*
 * Identity function
 */
function id<T>(x: T): T {
  return x;
}

/*
 * Constant function factory function
 */
function constant<T>(x: T): (a: any) => T {
  return _ => x;
}

export { constant, id, randomElem, randomInt };
