'use strict';

/**
 * Runs before any page script. Chromium 108 (Electron 22, the last line that
 * supports Windows 7) lacks a handful of ECMAScript/browser builtins that the
 * Harness client bundles use unconditionally, so we install minimal polyfills
 * in the page's main world.
 *
 * Everything here is feature-detected: on a newer Chromium this file is a no-op.
 */

const { webFrame } = require('electron');

const POLYFILL = String.raw`
(() => {
  const define = (target, name, value) => {
    if (typeof target[name] !== 'undefined') return;
    Object.defineProperty(target, name, { value, writable: true, configurable: true, enumerable: false });
  };

  define(Promise, 'withResolvers', function withResolvers() {
    let resolve, reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  });

  define(Promise, 'try', function tryFn(fn, ...args) {
    return new Promise((resolve) => resolve(fn(...args)));
  });

  define(AbortSignal, 'timeout', function timeout(ms) {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));
    }, ms);
    controller.signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
    return controller.signal;
  });

  define(AbortSignal, 'any', function any(signals) {
    const controller = new AbortController();
    const abortFrom = (signal) => {
      controller.abort(signal.reason);
    };
    for (const signal of signals) {
      if (signal.aborted) { abortFrom(signal); return controller.signal; }
      signal.addEventListener('abort', () => abortFrom(signal), { once: true });
    }
    return controller.signal;
  });

  const arrayCopy = (array, mutate) => {
    const copy = Array.prototype.slice.call(array);
    mutate(copy);
    return copy;
  };

  define(Array.prototype, 'toSorted', function toSorted(compareFn) {
    return arrayCopy(this, (copy) => copy.sort(compareFn));
  });
  define(Array.prototype, 'toReversed', function toReversed() {
    return arrayCopy(this, (copy) => copy.reverse());
  });
  define(Array.prototype, 'toSpliced', function toSpliced(start, deleteCount, ...items) {
    return arrayCopy(this, (copy) => copy.splice(start, deleteCount, ...items));
  });
  define(Array.prototype, 'with', function withAt(index, value) {
    const copy = Array.prototype.slice.call(this);
    const resolved = index < 0 ? copy.length + index : index;
    if (resolved < 0 || resolved >= copy.length) throw new RangeError('Invalid index');
    copy[resolved] = value;
    return copy;
  });

  define(Array, 'fromAsync', async function fromAsync(items, mapFn, thisArg) {
    const result = [];
    let index = 0;
    for await (const item of items) {
      result.push(mapFn ? await mapFn.call(thisArg, item, index) : item);
      index += 1;
    }
    return result;
  });

  const groupBy = (items, callback) => {
    const out = Object.create(null);
    let index = 0;
    for (const item of items) {
      const key = callback(item, index++);
      (out[key] ??= []).push(item);
    }
    return out;
  };
  define(Object, 'groupBy', groupBy);
  define(Map, 'groupBy', function mapGroupBy(items, callback) {
    const out = new Map();
    let index = 0;
    for (const item of items) {
      const key = callback(item, index++);
      if (!out.has(key)) out.set(key, []);
      out.get(key).push(item);
    }
    return out;
  });

  const setMethod = (name, method) => {
    define(Set.prototype, name, function (...args) {
      return method(this, args);
    });
  };
  setMethod('union', (self, args) => new Set([...self, ...args[0]]));
  setMethod('intersection', (self, args) => new Set([...self].filter((value) => args[0].has(value))));
  setMethod('difference', (self, args) => new Set([...self].filter((value) => !args[0].has(value))));
  setMethod('symmetricDifference', (self, args) => new Set([
    ...[...self].filter((value) => !args[0].has(value)),
    ...[...args[0]].filter((value) => !self.has(value)),
  ]));
  setMethod('isSubsetOf', (self, args) => [...self].every((value) => args[0].has(value)));
  setMethod('isSupersetOf', (self, args) => [...args[0]].every((value) => self.has(value)));
  setMethod('isDisjointFrom', (self, args) => [...self].every((value) => !args[0].has(value)));

  define(String.prototype, 'isWellFormed', function isWellFormed() {
    return !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(this);
  });
  define(String.prototype, 'toWellFormed', function toWellFormed() {
    return String(this).replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '\uFFFD');
  });

  define(RegExp, 'escape', function escape(text) {
    return String(text).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
  });

  if (typeof Iterator !== 'undefined' && typeof Iterator.from !== 'function') {
    Iterator.from = (iterable) => {
      if (iterable instanceof Iterator) return iterable;
      const iterator = iterable[Symbol.iterator]();
      const wrapper = {
        next: () => iterator.next(),
        return: (value) => iterator.return?.(value) ?? { done: true, value },
        [Symbol.iterator]() { return this; },
      };
      const helpers = {
        map(fn) { return Iterator.from((function* () { let i = 0; for (const v of wrapper) yield fn(v, i++); })()); },
        filter(fn) { return Iterator.from((function* () { let i = 0; for (const v of wrapper) if (fn(v, i++)) yield v; })()); },
        take(limit) { return Iterator.from((function* () { let n = 0; for (const v of wrapper) { if (n++ >= limit) return; yield v; } })()); },
        drop(limit) { return Iterator.from((function* () { let n = 0; for (const v of wrapper) { if (n++ < limit) continue; yield v; } })()); },
        toArray() { return [...wrapper]; },
      };
      return Object.assign(wrapper, helpers);
    };
  }
})();
`;

try {
  // Executes in the page's main world, before the document's own scripts.
  webFrame.executeJavaScript(POLYFILL, false);
} catch (error) {
  console.error('dsh-win7-shell polyfill injection failed:', error);
}
