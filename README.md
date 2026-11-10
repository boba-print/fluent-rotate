# FluentRotate

Fluent Bit(또는 Fluentd)이 HTTP 로 보내는 로그를 받아 파일로 저장하는 Express.js 앱이다. 로그 파일은 정해 둔 보존 정책에 따라 회전(rotate)한다. 만들어진 로그 파일은 Promtail 이 읽어 가도록 설계했다.

PSL 에서는 PSL 서버에서 Windows 서비스 `fluent-rotate` 로 돈다([PSL 에서의 사용](#psl-에서의-사용) 참고).

## 준비물

Node.js 와 npm 이 있어야 한다. 빌드에는 Node.js 22 이상이 필요하고, 패키징한 실행 파일에는 Node.js 24(v24.22.1)가 들어간다.

## 시작하기

1. 저장소를 클론한다.
2. `npm ci` 로 의존성을 설치한다.
3. `npm start`(또는 `node src/app.js`)로 실행한다.

## 사용법

### HTTP 요청

로그 데이터를 JSON 으로 `/logs` 에 보내면 기록된다. 데이터는 배열이나 객체 형식이면 된다.

```bash
curl -X POST -H "Content-Type: application/json" -H "X-Tag: tag_value" -d '{"log": "your log data"}' http://host_name/logs
```

- `X-Tag` 헤더 값은 각 레코드에 `tag` 로 들어간다.
- `level`(`error`, `warn`, `info`, `verbose`, `debug`, `silly`)로 로그 레벨을 정한다. 다른 값이거나 값이 없으면 `info` 로 기록한다.
- `Content-Type: application/json` 요청의 응답:
  - 객체나 배열이면 `200`
  - 잘못된 JSON 이거나 객체·배열이 아닌 JSON 이면 `400`
  - 본문이 100 KB 를 넘으면 `413`
  - 성공 응답에는 `Connection: close` 를 붙인다. Fluentd/Fluent Bit 이 연결을 붙잡고 멈추지 않게 하기 위해서다.
- 그 밖의 경우:
  - JSON 이 아닌 `Content-Type` 의 본문은 `200` 으로 답하고 빈 레코드를 기록한다.
  - `null` 이 들어 있는 배열은 `500` 을 돌려준다.
- 오류 응답 본문에는 HTTP 상태 메시지(예: `Bad Request`)만 담는다. 서비스가 `NODE_ENV` 없이 돌기 때문에 앱이 직접 Express 의 `env` 를 `production` 으로 설정한다. 스택 트레이스는 콘솔에만 남는다.

##### 예시

```json
// 객체 형식 데이터

{
  "date": "2023-06-01T01:02:03Z",
  "level": "info",
  "message": "...",
  ...
}

// 배열 형식 데이터
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

명령줄 옵션으로 동작을 바꿀 수 있다.

- `filename`: 로그 파일 이름 패턴. 기본값 `logs-%DATE%.txt`. 상대 경로는 현재 작업 디렉터리 기준이다.
- `datePattern`: 로그 파일 이름에 쓰는 날짜 패턴. 기본값 `YYYY-MM-DD`.
- `zip`: 회전된 로그 파일을 압축할지 여부. 기본값 `false`.
- `maxSize`: 회전하기 전 로그 파일 최대 크기. 기본값 `20m`.
- `maxFiles`: 오래된 파일을 지우기 전까지 남겨 둘 로그 파일 수(또는 기간). 기본값 `14d`.
- `port`: 서버가 받을 포트 번호. 기본값 `3000`. 모든 인터페이스에서 받는다.

옵션은 다음처럼 넘긴다.

```bash
$ node src/app.js --filename myLogs-%DATE%.txt --datePattern YYYY-MM-DD-HH --zip false --maxSize 50m --maxFiles 30d --port 8080
```

## PSL 에서의 사용

- PSL 서버 인스톨러([boba-print/psl-server-installer-v2](https://github.com/boba-print/psl-server-installer-v2))가 `bin\fluent-rotate\fluent-rotate.exe` 를 NSSM 서비스 `fluent-rotate` 로 등록한다. 인자는 `--filename "<로그 파일>" --port 4002` 이다. 인스톨러는 인스톨러 빌드 PC 의 `fileList\bin\fluent-rotate\` 에서 실행 파일을 가져간다(`fileList` 는 git 에서 관리하지 않는다).
- 같은 서버의 Fluent Bit 이 모든 레코드를 `http://localhost:4002/logs` 로 넘긴다(`Format json`, `Header_tag X-Tag`). 에이전트와 서버는 이 앱이 아니라 포트 4001 의 Fluent Bit 으로 로그를 보낸다.
- 포트 4002 는 같은 서버 안에서만 쓴다.
  - 서버 인스톨러 1.8.10.0 까지는 `PSL-in` 방화벽 규칙에서 TCP 4001-4003 인바운드를 연다.
  - 1.8.10.1([psl-server-installer-v2#1](https://github.com/boba-print/psl-server-installer-v2/pull/1))부터는 새로 설치하면 4001 만 열고, 업그레이드하면 기존 규칙에서 4002-4003 을 뺀다.
  - 실행 파일만 바꾸는 서버는 직접 닫는다: `netsh advfirewall firewall set rule name="PSL-in" new localport=<4002-4003 을 뺀 현재 포트 목록>`.
- 실행 파일은 [boba-print/psl-admin-backend](https://github.com/boba-print/psl-admin-backend) 의 `bin/fluent-rotate/` 에도 들어 있다.

### 설치된 서버에서 실행 파일 바꾸기

PSL 서버의 관리자 PowerShell 에서 실행한다.

```powershell
$exe = 'C:\psl\bin\fluent-rotate\fluent-rotate.exe'
Stop-Service fluent-rotate
$bak = "$exe.bak-$(Get-Date -Format yyyyMMdd-HHmmss)"     # 되돌릴 때 쓸 옛 파일(실행할 때마다 하나)
if (Test-Path $bak) { throw "backup already exists: $bak" }
Copy-Item $exe $bak
Copy-Item .\fluent-rotate.exe $exe -Force                  # 새 빌드
(Get-FileHash $exe).Hash                                   # 릴리스에 적힌 SHA-256 과 같아야 한다
Start-Service fluent-rotate
Get-ChildItem C:\psl\logs\log.txt.* | Sort-Object LastWriteTime | Select-Object -Last 1   # LastWriteTime 이 계속 바뀌어야 한다
```

되돌리기: `Stop-Service fluent-rotate` → 이번 교체에서 만든 `.bak-<날짜>-<시각>` 중 **가장 오래된** 파일을 `fluent-rotate.exe` 위에 복사 → `Start-Service fluent-rotate`. 위 절차를 여러 번 실행했다면 그보다 새 백업은 새 빌드의 사본이다.

## 패키징

[@yao-pkg/pkg](https://github.com/yao-pkg/pkg)(`devDependencies` 에 버전 고정)로 패키징한다. PSL 서버의 `server.exe` 와 같은 도구, 같은 Node.js 런타임이다. 단독 실행 파일은 이렇게 만든다.

1. `npm ci` 로 의존성을 설치한다.
2. 저장소 루트에서 `npm run build` 를 실행한다.

Node.js 24 런타임(v24.22.1, `@yao-pkg/pkg-fetch` 3.6.7)이 들어간 Windows x64 용 `fluent-rotate.exe` 가 만들어진다. 따로 Node.js 를 설치하지 않아도 실행된다.

참고:

- Apple Silicon Mac 에서는 pkg 가 바이트코드를 만들 때 macOS x64 Node.js 를 돌리므로 Rosetta 2 가 설치돼 있어야 한다.
- pkg 는 기반 바이너리를 `~/.pkg-cache/v3.6/` 에 내려받고 SHA-256 을 확인한다.
  - GitHub 다운로드가 실패하면 `gh release download v3.6 -R yao-pkg/pkg-fetch -p node-v24.22.1-win-x64` 로 받아 `~/.pkg-cache/v3.6/fetched-v24.22.1-win-x64` 로 저장한다.
  - Apple Silicon Mac 에서는 `node-v24.22.1-macos-x64` 도 같은 방법으로 받아 `fetched-v24.22.1-macos-x64` 로 저장한다.
- 실행 파일은 약 95 MiB 로, GitHub 의 파일당 100 MiB 한도에 가깝다. 다른 저장소에 커밋하기 전에 크기를 확인한다.

## 라이선스

MIT 라이선스를 따른다.
