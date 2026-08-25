# Isomorphic TS/JS Lib _(@icomedias/hybridforms-js)_

[![Build status](https://img.shields.io/github/actions/workflow/status/IcoDeveloper/hybridforms-js/main.yml?branch=main)](https://github.com/IcoDeveloper/hybridforms-js/actions?query=workflow%3A%22Node.js+CI%22)
[![NPM Version](https://img.shields.io/npm/v/@icomedias/hybridforms-js.svg)](https://npm.im/@icomedias/hybridforms-js)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg)](https://github.com/RichardLitt/standard-readme)

A Typescript/Javascript isomorphic library, for use in HybridForms forms and Node.js.

Typedoc: [https://icomediasgmbh.github.io/hybridforms-js/](https://icomediasgmbh.github.io/hybridforms-js/)

## Table of Contents

- [Isomorphic TS/JS Lib _(@icomedias/hybridforms-js)_](#isomorphic-tsjs-lib-icomediashybridforms-js)
  - [Table of Contents](#table-of-contents)
  - [Install](#install)
    - [NPM](#npm)
    - [Development](#development)
  - [Usage](#usage)
    - [UMD](#umd)
    - [Custom `xhr` implementation](#custom-xhr-implementation)
  - [Tests](#tests)
    - [The fake server](#the-fake-server)
  - [Contribute](#contribute)
  - [License](#license)

## Install

- Node.js 18+ is recommended.

### NPM

To install via NPM:

```
npm install @icomedias/hybridforms-js
```

### Development

To install locally (for development):

```
git clone https://github.com/IcoDeveloper/hybridforms-js.git
cd hybridforms-js
npm install
```

## Usage

First of all, you need to install the library:

```sh
npm install @icomedias/hybridforms-js
```

Then you're able to import the library and establish the connection with the database:

```js
import { createClient } from '@icomedias/hybridforms-js'

// Create a single HybridForms client for interacting with the API
const hybridforms = createClient({
    baseUrl: 'example.hybridforms.com',
    clientId: '1',
    user: 'test@test.com',
    password: '123456'
})
```

### UMD

You can now use plain `<script>`s to import hybridforms-js, like:

```html
<script src="hybridforms.min.js"></script>
```

Then you can use it from a global `HybridFormsJS` variable:

```html
<script>
    const { createClient } = HybridFormsJS
    const hybridforms = createClient({
        baseUrl: 'example.hybridforms.com',
        clientId: '1',
        user: 'test@test.com',
        password: '123456'
    })

    console.log('HybridForms Instance: ', hybridforms)
  // ...
</script>
```

### Custom `xhr` implementation

`hybridforms-js` uses the [`node-fetch`](https://www.npmjs.com/package/node-fetch) library to make HTTP requests, but an alternative `xhr` implementation can be provided as an option. This is necessary in HybridForms forms where an authentication is already available:

```html
<script data-hf-src="hybridforms.min.js"></script>
```

```js
const { createClient } = HybridFormsJS
// Provide a custom `xhr` implementation as an option
const hybridforms = createClient({
    baseUrl: 'example.hybridforms.com',
    clientId: '1',
    xhr: HybridForms.API.XHR.request
})
```

## Tests

```
npm test              # lint, then run the suite once
npm run test:watch    # vitest in watch mode
npm run test:coverage # suite plus a v8 coverage report
```

The suite runs on [vitest](https://vitest.dev) and needs no network access, no
credentials and no HybridForms deployment. Every request goes to a fake server
started inside the test process.

### The fake server

`test/server/` holds an in-process stand-in for a HybridForms Core Server:

| File | Purpose |
| --- | --- |
| `fakeServer.ts` | Router and `node:http` plumbing: path matching, the request log, response encoding |
| `hybridForms.ts` | `createHybridFormsServer()` — wires state, routes and the auth guard together |
| `state.ts` | Per-instance mutable state (issued tokens, form items, catalogs) |
| `fixtures.ts` | Canonical response data and file bodies |
| `routes/` | One module per API area, plus `/__test__/*` routes used to drive `src/lib/fetch.ts` |

Each spec file starts its own server on an ephemeral port, so files run in
parallel without interfering:

```ts
let server: FakeServerHandle

beforeAll(async () => {
    server = await createHybridFormsServer({ loginMethod: 'ADFS' })
})
afterAll(async () => await server.close())
beforeEach(() => server.reset())

it('lists form definitions', async () => {
    const response = await clientFor(server).formDefinitions.getFormDefinitions()
    expect(response.response).to.have.length(2)
})
```

`createHybridFormsServer()` takes a `loginMethod` (`ADFS`, `AzureAD`,
`WindowsAuthentication`), a `tokenLifetimeSeconds` (pass a negative value to
force token refresh) and `gatewayOverrides` for reshaping `/api/app/gatewayData`.

The handle exposes `state` for inspecting server-side effects, `requests` /
`requestsFor(path)` for asserting on what the client actually sent,
`clearRequests()` to empty the log while keeping state, and `reset()` for both.

Writes are real: `createCatalog` then `getCatalog` reads back what was written,
and `simpleAPI.post()` creates an item that `forms.listForms()` then returns.

## Contribute

PRs accepted.

If editing the Readme, please conform to the
[standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

[MIT License](LICENSE.md) © 2023 icomedias GmbH.
