import assert from "node:assert/strict";
import { test } from "node:test";

import { camelCase, constantCase, convert, convertKeys, detect, dotCase, kebabCase, pascalCase, sentenceCase, snakeCase, titleCase, words } from "./src/index.js";

test("splits on punctuation, camelCase boundaries and acronyms", () => {
  const cases = {
    "foo bar": ["foo", "bar"], fooBar: ["foo", "Bar"], FooBar: ["Foo", "Bar"], foo_bar: ["foo", "bar"], "foo-bar": ["foo", "bar"], "foo.bar": ["foo", "bar"],
    "foo/bar baz": ["foo", "bar", "baz"], HTTPServer: ["HTTP", "Server"], parseHTTPResponse: ["parse", "HTTP", "Response"], XMLHttpRequest: ["XML", "Http", "Request"],
    FOO_BAR: ["FOO", "BAR"], "  spaced   out  ": ["spaced", "out"], "": [], "---": [], userID: ["user", "ID"], version2Beta: ["version2", "Beta"], h264Codec: ["h264", "Codec"], "2fa": ["2fa"]
  };
  for (const [input, expected] of Object.entries(cases)) assert.deepEqual(words(input), expected, JSON.stringify(input));
  assert.deepEqual(words("h264Codec", { splitDigits: true }), ["h", "264", "Codec"]);
});

test("every style", () => {
  const input = "parseHTTPResponse code_2fa";
  assert.equal(camelCase(input), "parseHttpResponseCode2fa");
  assert.equal(pascalCase(input), "ParseHttpResponseCode2fa");
  assert.equal(snakeCase(input), "parse_http_response_code_2fa");
  assert.equal(kebabCase(input), "parse-http-response-code-2fa");
  assert.equal(constantCase(input), "PARSE_HTTP_RESPONSE_CODE_2FA");
  assert.equal(dotCase(input), "parse.http.response.code.2fa");
  assert.equal(titleCase("the quick brown fox"), "The Quick Brown Fox");
  assert.equal(sentenceCase("THE QUICK_brown fox"), "The quick brown fox");
});

test("acronyms can be kept", () => {
  assert.equal(camelCase("parse_http_response"), "parseHttpResponse");
  assert.equal(camelCase("parseHTTPResponse", { keepAcronyms: true }), "parseHTTPResponse");
  assert.equal(pascalCase("HTTPServer", { keepAcronyms: true }), "HTTPServer");
  assert.equal(pascalCase("HTTPServer"), "HttpServer");
  assert.equal(camelCase("USER_ID", { keepAcronyms: true }), "userID");
});

test("works with accents and other alphabets", () => {
  assert.equal(snakeCase("ÉcoleNormale"), "école_normale");
  assert.equal(camelCase("straße-in-der-stadt"), "straßeInDerStadt");
  assert.equal(kebabCase("Привет Мир"), "привет-мир");
  assert.equal(pascalCase("ünï cödé"), "ÜnïCödé");
});

test("convert by name, and unknown names are refused", () => {
  assert.equal(convert("fooBar", "snake"), "foo_bar");
  assert.equal(convert("foo_bar", "pascal"), "FooBar");
  assert.throws(() => convert("x", "screaming"), /unknown style "screaming"/);
  assert.throws(() => camelCase(5), TypeError);
});

test("detect", () => {
  const cases = { foo: "lower", FOO: "upper", foo_bar: "snake", FOO_BAR: "constant", "foo-bar": "kebab", "foo.bar": "dot", fooBar: "camel", FooBar: "pascal", "foo_Bar": null, "foo bar": null, "": null };
  for (const [input, expected] of Object.entries(cases)) assert.equal(detect(input), expected, input);
  assert.equal(detect(5), null);
});

test("convertKeys changes API payloads, deep and through arrays", () => {
  const server = { user_id: 1, first_name: "Kaj", home_address: { street_name: "x", geo_point: [{ lat_deg: 1 }] }, tags: ["a_b"], created_at: new Date(0) };
  const client = convertKeys(server, "camel");
  assert.deepEqual(Object.keys(client), ["userId", "firstName", "homeAddress", "tags", "createdAt"]);
  assert.deepEqual(client.homeAddress.geoPoint, [{ latDeg: 1 }]);
  assert.deepEqual(client.tags, ["a_b"]);
  assert.ok(client.createdAt instanceof Date);
  assert.deepEqual(convertKeys(client, "snake"), { ...server, home_address: { street_name: "x", geo_point: [{ lat_deg: 1 }] } });
});

test("convertKeys: shallow, except, class instances and Maps are left alone", () => {
  assert.deepEqual(convertKeys({ a_b: { c_d: 1 } }, "camel", { deep: false }), { aB: { c_d: 1 } });
  assert.deepEqual(convertKeys({ a_b: 1, keep_me: 2 }, "camel", { except: ["keep_me"] }), { aB: 1, keep_me: 2 });
  class Thing { constructor() { this.some_value = 1; } }
  const thing = new Thing();
  const map = new Map([["a_b", 1]]);
  const out = convertKeys({ thing, map, list: [thing] }, "camel");
  assert.equal(out.thing, thing);
  assert.equal(out.map, map);
  assert.equal(out.list[0], thing);
  assert.equal(convertKeys("text", "camel"), "text");
  assert.equal(convertKeys(null, "camel"), null);
});

test("convertKeys refuses collisions and dangerous keys instead of losing data", () => {
  assert.throws(() => convertKeys({ foo_bar: 1, fooBar: 2 }, "camel"), /both become "fooBar"/);
  assert.throws(() => convertKeys(JSON.parse('{"__proto__": {"x": 1}}'), "camel", { except: ["__proto__"] }), /not allowed/);
  const converted = convertKeys(JSON.parse('{"__proto__": {"x": 1}, "constructor": 2}'), "camel");
  assert.equal(Object.getPrototypeOf(converted), Object.prototype);
  assert.equal(converted.constructor, 2);
  assert.equal(converted.x, undefined);
  assert.throws(() => convertKeys({ a: 1 }, "nope"), RangeError);
  const polluted = convertKeys(JSON.parse('{"a_b": 1}'), "camel");
  assert.equal(Object.getPrototypeOf(polluted), Object.prototype);
});

test("combining marks stay inside the word (Devanagari, decomposed accents)", () => {
  assert.deepEqual(words("हिंदी भाषा"), ["हिंदी", "भाषा"]);
  assert.equal(snakeCase("हिंदी भाषा"), "हिंदी_भाषा");
  assert.deepEqual(words("fox́Bar"), ["fox́", "Bar"]);
});

test("conversions are idempotent, also with a dotted capital I and astral letters", () => {
  for (const input of ["İstanbulAirport", "zİéİ́Bz", "𐐨𐐯 foo", "straße_xy z"]) {
    for (const style of ["camel", "pascal", "snake", "kebab", "constant", "dot", "title", "sentence"]) {
      const once = convert(input, style);
      assert.equal(convert(once, style), once, `${style} of ${JSON.stringify(input)}`);
    }
  }
  assert.equal(pascalCase("𐐨𐐯 foo"), "𐐀𐐯Foo");
});
