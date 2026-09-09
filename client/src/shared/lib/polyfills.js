/**
 * Browser polyfills for modern ECMAScript proposals and runtime compatibility.
 * Specifically provides polyfills for TC39 Stage 3 Map Upsert methods:
 * Map.prototype.getOrInsertComputed and Map.prototype.getOrInsert.
 */

if (typeof Map !== 'undefined') {
  if (typeof Map.prototype.getOrInsertComputed !== 'function') {
    Map.prototype.getOrInsertComputed = function (key, callbackFn) {
      if (this.has(key)) {
        return this.get(key);
      }
      const value = callbackFn(key);
      this.set(key, value);
      return value;
    };
  }

  if (typeof Map.prototype.getOrInsert !== 'function') {
    Map.prototype.getOrInsert = function (key, defaultValue) {
      if (this.has(key)) {
        return this.get(key);
      }
      this.set(key, defaultValue);
      return defaultValue;
    };
  }
}
