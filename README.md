# @sandsoftwaresolutions/case-style

[![CI](https://github.com/SandSoftwareSolutions/ss-case-style/actions/workflows/ci.yml/badge.svg)](https://github.com/SandSoftwareSolutions/ss-case-style/actions/workflows/ci.yml)

`camelCase`, `snake_case`, `kebab-case`, `PascalCase` and friends that get the hard cases right: acronyms (`parseHTTPResponse`), digits, accents, other alphabets. And a safe way to convert all the keys of an API payload. No dependencies.

## Install

```bash
npm install @sandsoftwaresolutions/case-style
```

## Usage

```js
import { camelCase, snakeCase, kebabCase, pascalCase, constantCase, titleCase, convert, convertKeys, detect } from "@sandsoftwaresolutions/case-style";

snakeCase("parseHTTPResponse");      // "parse_http_response"
camelCase("user_first_name");        // "userFirstName"
kebabCase("FooBar baz");             // "foo-bar-baz"
constantCase("maxRetryCount");       // "MAX_RETRY_COUNT"
pascalCase("my-component");          // "MyComponent"
titleCase("the quick brown fox");    // "The Quick Brown Fox"
convert("fooBar", "snake");          // by name: camel, pascal, snake, kebab, constant, dot, title, sentence
detect("fooBar");                    // "camel"

// A payload from a snake_case API into camelCase and back
const client = convertKeys(serverJson, "camel");
const server = convertKeys(client, "snake");
```

## Words

Everything starts by splitting text into words (`words(text)`): on spaces and punctuation (`_ - . /`), inside `camelCase`, and a run of capitals counts as one acronym (`XMLHttpRequest` → `XML`, `Http`, `Request`). Digits stay with the word before (`version2Beta` → `version2`, `Beta`; `splitDigits: true` splits them). It works with any letters: `ÉcoleNormale` → `école_normale`, `Привет Мир` → `привет-мир`.

`keepAcronyms: true` keeps capitals in camel, pascal and title case: `camelCase("USER_ID", { keepAcronyms: true })` → `userID`.

## `convertKeys`

- Goes through nested objects and arrays (`deep: false` for the top level only).
- Only **plain objects** are changed: Dates, Maps, Buffers and class instances are left alone.
- `except: ["keep_me"]` leaves named keys as they are.
- **No silent data loss.** If two keys would get the same name (`foo_bar` and `fooBar` both becoming `fooBar`) it throws, instead of dropping one. A key that would become `__proto__` is refused.
