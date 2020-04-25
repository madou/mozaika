/**
 * Module description:   src/lib/equal.js
 *
 * Created on 16/02/2020
 * @author Alexander. E. Fedotov
 * @email <alexander.fedotov.uk@gmail.com>
 */

/**
 * A function that will perform a deep comparison of two given object properties.
 * The function will return a boolean to denote whether both objects have the exact
 * same properties and identical property values,
 *
 * @param {any} x - Left hand-side object in comparison
 * @param {any} y - right hand-side object in comparison
 * @return {Boolean} comparison result
 * */
export default function deepEqual(x, y) {
  if (x === y) {
    return true;
  } else if ((typeof x == "object" && x != null) && (typeof y == "object" && y != null)) {
    if (Object.keys(x).length !== Object.keys(y).length)
      return false;

    for (const property in x) {
      if (y.hasOwnProperty(property)) {
        if (!deepEqual(x[property], y[property])) return false;
      } else return false;
    }
    return true;
  } else return false;
}
