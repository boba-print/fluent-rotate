# fluent-rotate 에이전트 작업 계약

PSL 서버에서 Fluent Bit가 넘기는 로그를 HTTP(`POST /logs`)로 받아 날짜별 파일로 남기는 작은 Express 앱이다. 코드는 `src/app.js` 한 파일이고, `fluent-rotate.exe` 하나로 묶어 배포한다. 운영에서의 쓰임(서비스·포트·방화벽)은 [README의 "PSL 에서의 사용"](README.md#psl-에서의-사용)을 기준으로 삼는다.

## 지켜야 할 호환

현장 서버는 Fluent Bit 설정을 바꾸지 않고 exe만 교체한다. 그래서 바뀐 exe도 아래를 그대로 지킨다.

- 경로 `/logs`, `X-Tag` → `tag`, `level` 처리, 로그 한 줄의 JSON 모양, 파일 이름 규칙(`<filename>.<날짜>` + audit json)
- 응답: 성공 200 + `Connection: close`, 잘못된 JSON 400, 100KB 초과 413. 오류 응답 본문은 상태 문구만(`app.set("env", "production")`) — 스택·설치 경로는 콘솔에만
- 실행 인자: `--filename "<경로>" --port 4002` (경로에 공백이 들어갈 수 있다)
- 포트만 지정한 `listen` — 모든 주소(`::`)에서 받는다. Fluent Bit는 `localhost`로 보내는데 이것이 IPv4·IPv6 어느 쪽으로 풀릴지 서버마다 다르므로, 바인드 주소를 좁히는 변경은 실제 Fluent Bit 전송 검증과 함께 한다. 외부 노출은 서버 방화벽 `PSL-in`으로 막는다 — 인스톨러 1.8.10.0까지는 4001-4003을 열고 1.8.10.1부터 4001만 연다. 인스톨러 버전별 상태와 exe만 바꾸는 서버의 조치는 README의 "PSL 에서의 사용" 절.

## 런타임

exe에 들어가는 Node는 psl-admin-backend의 `server.exe`와 같은 줄을 따른다(지금 `@yao-pkg/pkg` 6.24.0 → pkg-fetch 3.6.7 → Node v24.22.1). 서버가 Node를 올리면 여기도 같은 버전으로 올린다. OS 요구 사항도 `server.exe`와 같다.

## 빌드·교체 절차

1. **의존성**: `npm ci` 후 `npm audit --omit=dev`. 완료 기준: 취약점 0건. 고칠 때는 semver 안(`npm audit fix`)에서만 하고, 메이저 업그레이드가 필요하면 사용자에게 먼저 알린다.
2. **빌드**: `npm run build`. 완료 기준: `fluent-rotate.exe`가 생기고, 파일 안에 `nodejs.org/download/release/v<목표 버전>/` 문자열이 있다. 기반 바이너리 다운로드가 실패할 때의 우회와 Apple Silicon 주의는 README의 "패키징" 절에 있다.
3. **Windows 비교 검증**: 기존 exe와 새 exe를 같은 인자로 띄워 같은 요청을 보낸다 — 배열·객체 POST, 잘못된 JSON, 100KB 초과, 공백 경로, 동시 요청, 그리고 **실제 Fluent Bit 1.9.10**(psl-admin-backend `bin/fluent-bit-1.9.10-win64`)의 http 출력을 운영 설정 그대로 연결. 완료 기준: 상태 코드·`Connection` 헤더·파일 이름·로그 내용이 두 exe에서 같고, Fluent Bit 로그에 오류·재시도가 없다.
4. **교체**: 검증한 exe를 배포처에 넣는다.
   - psl-admin-backend `bin/fluent-rotate/fluent-rotate.exe` — git으로 관리한다. 그 저장소에서 따로 커밋한다. 루트 `.gitignore`가 `bin`을 제외하므로 `git add -u`로 올린다. exe가 약 95 MiB라 GitHub 파일 한도(100 MiB)에 가깝다 — 커밋 전에 크기를 본다. develop 외 릴리스 라인(`voc/*`, `release/*`)에는 따로 반영해야 한다.
   - psl-server-installer-v2 `fileList\bin\fluent-rotate\fluent-rotate.exe` — `fileList/**`는 git 밖이라 **인스톨러 빌드 PC의 로컬 fileList**에서 교체한다. 인스톨러를 만드는 사람에게 exe와 SHA-256을 넘긴다.
   - 완료 기준: 빌드 결과와 두 배포처의 exe SHA-256이 같다.
5. **설치된 서버에 적용**: README의 "설치된 서버에서 실행 파일 바꾸기" 절차(서비스 중지 → 백업 → 교체 → SHA-256 확인 → 시작). 완료 기준: 서버의 exe SHA-256이 릴리스 값과 같고, `C:\psl\logs\log.txt.<날짜>`의 수정 시각이 계속 바뀐다. 아니면 같은 절의 롤백으로 되돌린다.

`fluent-rotate.exe`는 빌드 산출물이라 이 저장소에는 커밋하지 않는다(`.gitignore`).
