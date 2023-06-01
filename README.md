# FluentRotate

This is an Express.js application that receives logs from Fluentd via an HTTP endpoint and saves them to a file. The log files are rotated based on the defined retention policy. It's designed to work with Promtail, which can read the generated log files.

## Prerequisites

You need to have Node.js and npm installed on your machine. This app has been tested with Node.js v14 and later.

## Getting Started

To get started with this application, you should:

1. Clone this repository.
2. Install the dependencies with `npm install`.
3. Run the application with node.

## Usage

### HTTP Request

To record logs, simply send the log data in JSON format to the `/log` URL. The data can contain an array or object format.

```bash
curl -X POST -H "Content-Type: application/json" -H "X-Tag: tag_value" -d '{"log": "your log data"}' http://host_name/log
```

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

- `filename`: The filename pattern for log files. Defaults to `logs-%DATE%.txt`.
- `datePattern`: The date pattern to use in log filenames. Defaults to `YYYY-MM-DD`.
- `zip`: Enable or disable the zipping of archived log files. Defaults to `false`.
- `maxSize`: The maximum size of a log file before it's rotated. Defaults to `20m`.
- `maxFiles`: The maximum number of log files to keep before deleting old ones. Defaults to `14d`.
- `port`: The port number on which the server will listen. Defaults to `3000`.

You can pass these options to the application as follows:

```bash
$ node app.js --filename myLogs-%DATE%.txt --datePattern YYYY-MM-DD-HH --zip false --maxSize 50m --maxFiles 30d --port 8080
```

## Packaging the Application
This application supports packaging with pkg.js. You can create a standalone executable version of the application as follows:

1. Install pkg globally with npm install -g pkg.
2. Run the command `npm run build` in the root directory of the application.

This will generate executables for different platforms. You can run these executables as standalone applications.

## License
This project is licensed under the MIT License.