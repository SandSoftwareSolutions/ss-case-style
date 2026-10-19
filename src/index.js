/**
 * Splits text into words: on spaces and punctuation (`_ - . /`), and inside camelCase and PascalCase, where a run of capitals is one
 * acronym word (`"parseHTTPResponse"` gives `parse`, `HTTP`, `Response`). Digits stay with the word before them (`"version2Beta"` gives
 * `version2`, `Beta`) unless `splitDigits` is true. Works with any letters, not only a-z; combining marks (accents, Devanagari vowel signs) stay with their letter.
 */
export function words(text, { splitDigits = false } = {}) {
  if (typeof text !== "string") throw new TypeError("case-style: text must be a string");
  let s = text.normalize("NFC");
  s = s.replace(/(\p{Ll}\p{M}*)(\p{Lu})/gu, "$1 $2"); // fooBar -> foo Bar
  s = s.replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, "$1 $2"); // HTTPServer -> HTTP Server
  if (splitDigits) {
    s = s.replace(/(\p{L})(\p{N})/gu, "$1 $2").replace(/(\p{N})(\p{L})/gu, "$1 $2");
  } else {
    s = s.replace(/(\p{N})(\p{Lu}\p{Ll})/gu, "$1 $2"); // 2Beta -> 2 Beta (a new capitalised word starts)
  }
  return s.split(/[^\p{L}\p{N}\p{M}]+/u).filter(Boolean);
}

const lower = (w) => w.toLowerCase();
const capital = (w) => {
  if (w === "") return w;
  const first = String.fromCodePoint(w.codePointAt(0)); // a whole code point, not half a surrogate pair
  return first.toUpperCase() + w.slice(first.length).toLowerCase();
};
const isAcronym = (w) => w.length > 1 && w === w.toUpperCase() && w !== w.toLowerCase();

/** `fooBar`. With `keepAcronyms: true` an acronym stays as it is: `parseHTTPResponse`. */
export function camelCase(text, options = {}) {
  const parts = words(text, options);
  return parts.map((w, i) => (i === 0 ? lower(w) : options.keepAcronyms && isAcronym(w) ? w : capital(w))).join("");
}
/** `FooBar`. */
export function pascalCase(text, options = {}) {
  return words(text, options).map((w) => (options.keepAcronyms && isAcronym(w) ? w : capital(w))).join("");
}
/** `foo_bar`. */
export const snakeCase = (text, options) => words(text, options).map(lower).join("_");
/** `foo-bar`. */
export const kebabCase = (text, options) => words(text, options).map(lower).join("-");
/** `FOO_BAR`. */
export const constantCase = (text, options) => words(text, options).map((w) => w.toUpperCase()).join("_");
/** `foo.bar`. */
export const dotCase = (text, options) => words(text, options).map(lower).join(".");
/** `Foo Bar`. */
export const titleCase = (text, options) => words(text, options).map((w) => (options?.keepAcronyms && isAcronym(w) ? w : capital(w))).join(" ");
/** `Foo bar`. */
export const sentenceCase = (text, options) => words(text, options).map((w, i) => (i === 0 ? capital(w) : lower(w))).join(" ");

const STYLES = { camel: camelCase, pascal: pascalCase, snake: snakeCase, kebab: kebabCase, constant: constantCase, dot: dotCase, title: titleCase, sentence: sentenceCase };

/** `convert("fooBar", "snake")`. Styles: camel, pascal, snake, kebab, constant, dot, title, sentence. */
export function convert(text, style, options) {
  const fn = STYLES[style];
  if (!fn) throw new RangeError(`case-style: unknown style "${style}"; use one of ${Object.keys(STYLES).join(", ")}`);
  return fn(text, options);
}

/** Guesses the style of an identifier: "camel", "pascal", "snake", "kebab", "constant", "dot", or `null` (mixed or a single plain word gives "lower"/"upper"). */
export function detect(text) {
  if (typeof text !== "string" || text === "") return null;
  if (/^[a-z][a-z0-9]*$/.test(text)) return "lower";
  if (/^[A-Z][A-Z0-9]*$/.test(text)) return "upper";
  if (/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(text)) return "snake";
  if (/^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/.test(text)) return "constant";
  if (/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(text)) return "kebab";
  if (/^[a-z][a-z0-9]*(\.[a-z0-9]+)+$/.test(text)) return "dot";
  if (/^[a-z][a-z0-9]*([A-Z][a-z0-9]*)+$/.test(text)) return "camel";
  if (/^([A-Z][a-z0-9]*)+$/.test(text)) return "pascal";
  return null;
}

const isPlain = (v) => v !== null && typeof v === "object" && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
const UNSAFE = new Set(["__proto__"]);

/**
 * Converts the keys of an object (API payloads: `snake_case` from the server to `camelCase` in your code, and back). Arrays are
 * followed; only plain objects are changed, so Dates, Maps, Buffers and class instances are left alone. `deep` is true by default.
 * `except` lists keys (before conversion) to leave as they are. A conversion that would give two keys the same name throws instead
 * of silently losing one. A key that would end up as `__proto__` is refused.
 */
export function convertKeys(value, style, { deep = true, except = [], ...options } = {}) {
  const fn = STYLES[style];
  if (!fn) throw new RangeError(`case-style: unknown style "${style}"; use one of ${Object.keys(STYLES).join(", ")}`);
  const skip = new Set(except);
  const walk = (v, depth) => {
    if (Array.isArray(v)) return deep ? v.map((item) => walk(item, depth + 1)) : v;
    if (!isPlain(v)) return v;
    if (!deep && depth > 0) return v;
    const out = {};
    for (const [key, item] of Object.entries(v)) {
      const next = skip.has(key) ? key : fn(key, options);
      if (UNSAFE.has(next)) throw new RangeError(`case-style: the key "${key}" is not allowed`);
      if (Object.hasOwn(out, next)) throw new RangeError(`case-style: "${key}" and another key both become "${next}"`);
      Object.defineProperty(out, next, { value: walk(item, depth + 1), enumerable: true, writable: true, configurable: true });
    }
    return out;
  };
  return walk(value, 0);
}
