/**
 * Module description:   src/lib/debounce.js
 *
 * Created on 02/03/2020
 * @author Alexander. E. Fedotov
 * @email <alexander.fedotov.uk@gmail.com>
 */

/**
 * debounce prevents a particular function from being called until after a given
 * cool-down period (default 50ms). Every time the function is called, it resets
 * the cool-down.
 *
 * @param {Function} fn - function to be executed after cool-down.
 * @param {Number} threshold - Time in milliseconds for the cool-down to last
 * @return {Function} original function that is now debounced.
 */

export default function debounce(fn, threshold = 5) {
  let deferTimer = null;

  const debounced = () => {
    if (deferTimer) {
      clearTimeout(deferTimer);
    }

    deferTimer = setTimeout(() => {
      deferTimer = null;
      fn();
    }, threshold);
  };

  debounced.clearTimeout = () => {
    if (deferTimer) {
      clearTimeout(deferTimer);
    }
  };

  return debounced;
}
