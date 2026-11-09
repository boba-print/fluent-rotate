# FluentRotate

This is an Express.js application that receives logs from Fluent Bit (or Fluentd) via an HTTP endpoint and saves them to a file. The log files are rotated based on the defined retention policy. It's designed to work with Promtail, which can read the generated log files.

In PSL, it runs on the PSL server as the `fluent-rotate` Windows service (see [Use in PSL](#use-in-psl)).

## Prerequisites

You need to have Node.js and npm installed on your machine. Node.js 22 or later is required to build; the packaged executable runs on Node.js 24 (v24.22.1).

## Getting Started

To get started with this application, you should:

1. Clone this repository.
2. Install the dependencies with `npm ci`.
3. Run the application with `npm start` (or `node src/app.js`).

## Usage

### HTTP Request

To record logs, simply send the log data in JSON format to the `/logs` URL. The data can contain an array or object format.

```bash
curl -X POST -H "Content-Type: application/json" -H "X-Tag: tag_value" -d '{"log": "your log data"}' http://host_name/logs
```

- The `X-Tag` header value is written to each record as `tag`.
- `level` (`error`, `warn`, `info`, `verbose`, `debug`, `silly`) sets the log level; any other value or no value logs at `info`.
- Responses: `200` on success, `400` for invalid JSON or a non-object body, `413` for a body over 100 KB. Successful responses carry `Connection: close` so Fluentd/Fluent Bit do not hang.

##### Example

```json
// Data in the object format.

{
  "date": "2023-06-01T01:02:03Z",
  "level": "info",
  "message": "...",
  ...
}

// Data in the array format.
[
  {
    "date": "2023-06-01T01:02:03Z",
    "level": "info",
    "message": "...",
    ...
  },
  ...
]
```

### CLI

The application has several command-line options that you can use to customize its behavior:

- `filename`: The filename pattern for log files. Defaults to `logs-%DATE%.txt`. Relative paths are resolved from the current working directory.
- `datePattern`: The date pattern to use in log filenames. Defaults to `YYYY-MM-DD`.
- `zip`: Enable or disable the zipping of archived log files. Defaults to `false`.
- `maxSize`: The maximum size of a log file before it's rotated. Defaults to `20m`.
- `maxFiles`: The maximum number of log files to keep before deleting old ones. Defaults to `14d`.
- `port`: The port number on which the server will listen. Defaults to `3000`. The server listens on all interfaces.

You can pass these options to the application as follows:

```bash
$ node src/app.js --filename myLogs-%DATE%.txt --datePattern YYYY-MM-DD-HH --zip false --maxSize 50m --maxFiles 30d --port 8080
```

## Use in PSL

- The PSL server installer ([boba-print/psl-server-installer-v2](https://github.com/boba-print/psl-server-installer-v2)) registers `bin\fluent-rotate\fluent-rotate.exe` as the NSSM service `fluent-rotate` with `--filename "<log file>" --port 4002`. The installer takes the executable from `fileList\bin\fluent-rotate\` on the installer build PC (`fileList` is not tracked in git).
- Fluent Bit on the same server forwards every record to `http://localhost:4002/logs` (`Format json`, `Header_tag X-Tag`). Agents and the server send logs to Fluent Bit on port 4001, not to this app.
- Port 4002 is only used from the same server. Keep it closed to other hosts in the Windows firewall (the installer's `PSL-in` rule should not include 4002).
- The executable is also kept in [boba-print/psl-admin-backend](https://github.com/boba-print/psl-admin-backend) under `bin/fluent-rotate/`.

## Packaging the Application

This application is packaged with [@yao-pkg/pkg](https://github.com/yao-pkg/pkg) (pinned in `devDependencies`), the same tool and Node.js runtime as the PSL server's `server.exe`. You can create a standalone executable as follows:

1. Install the dependencies with `npm ci`.
2. Run the command `npm run build` in the root directory of the application.

This generates `fluent-rotate.exe` for Windows x64 with the Node.js 24 runtime (v24.22.1, from `@yao-pkg/pkg-fetch` 3.6.7) embedded. The executable runs without a separate Node.js installation.

Notes:

- On an Apple Silicon Mac, pkg runs a macOS x64 Node.js to generate the bytecode, so Rosetta 2 must be installed.
- pkg downloads the base binaries into `~/.pkg-cache/v3.6/`. If the GitHub download fails, fetch them with `gh release download v3.6 -R yao-pkg/pkg-fetch -p node-v24.22.1-win-x64 -p node-v24.22.1-win-x64.sha256sum`, check the SHA-256, and save the binary as `~/.pkg-cache/v3.6/fetched-v24.22.1-win-x64`.

## License
This project is licensed under the MIT License.
