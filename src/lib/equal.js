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
 * @param {Object|Number|String} left - Left hand-side object in comparison
 * @param {Object|Number|String} right - right hand-side object in comparison
 * @return {Boolean} comparison result
 * */
export default function deepEqual(left, right) {
  if (left === right) {
    return true;
  } else if ((typeof left === "object" && left != null) && (typeof right === "object" && right != null)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    if (leftKeys.length !== rightKeys.length) {
      return false;
    }

    for (const prop in left) {
      if (rightKeys.indexOf(prop) !== -1) {
        if (!deepEqual(left[prop], right[prop])) return false;
      } else return false;
    }
    return true;
  } else return false;
}
