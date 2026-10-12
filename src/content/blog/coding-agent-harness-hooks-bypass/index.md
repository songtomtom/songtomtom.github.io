---
title: "Hook은 어떻게 우회되는가"
description: "글로 적은 금지를 Claude Code Hook으로 실행 경로에 옮겼더니 차단이 0건이었습니다. 규칙을 잘 지켜서가 아니라 에이전트가 편집 도구 대신 셸로 파일을 고쳐 Hook이 발동하지 않은 것이었습니다. 쓰기 도구와 무관하게 잡는 두 번째 층을 더하고 다시 쟀습니다."
date: "2026-10-12T04:00"
series: coding-agent-harness
order: 3
category: ai
tags:
  - claude-code
  - hooks
  - harness
  - evaluation
---

[1편](/blog/coding-agent-harness-rules-skills-decisions)에서 규칙 문서를 세 층으로 나눴습니다. 그래도 규칙은 여전히 "글"입니다. "색 값을 직접 쓰지 마라"는 문장을 에이전트가 읽고 지키기를 기대하는 구조입니다. 이번 편은 그 금지를 **실행 경로**로 옮깁니다. 파일을 쓰는 순간 검사해서, 어기면 쓰기 자체가 실패하게 합니다.

결론부터 말하면 첫 시도는 아무것도 막지 못했습니다. 그리고 그 이유가 이 글의 핵심입니다.

## 쓰기 직전에 막기

Claude Code의 Hook은 도구 호출 전후에 셸 명령을 끼워 넣는 장치입니다. `PreToolUse`에 걸린 명령이 종료 코드 2로 끝나면 그 도구 호출은 취소되고, 표준 오류로 쓴 내용이 에이전트에게 돌아갑니다. 규칙 검사기가 이미 있으니(1편의 `harness/rules.py`) 쓰려는 내용을 그 검사기에 통과시키면 됩니다.

`.claude/hooks/block-forbidden.sh` (핵심만)
```bash
# PreToolUse(Write|Edit|MultiEdit): 쓰려는 내용이 CLAUDE.md 규칙에 걸리면 차단하고 이유를 돌려준다.
INPUT="$(cat)"                      # stdin 으로 도구 입력(JSON)이 온다
# tool_input.file_path 와 content(Write) / new_string(Edit) 을 꺼낸다 ...
VIOL="$(printf '%s' "$CONTENT" | python3 "$ROOT/harness/rules.py" --text "$FILE" $FLAG | grep '^R-' || true)"
# 결과를 .claude/logs/hook-blocks.jsonl 에 남긴다 (차단이든 통과든)
if [[ -n "$VIOL" ]]; then
  echo "CLAUDE.md 규칙 위반으로 쓰기를 막았습니다. 고쳐서 다시 쓰세요:" >&2
  echo "$VIOL" >&2
  exit 2
fi
```

`.claude/settings.json`
```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Write|Edit|MultiEdit",
        "hooks": [{ "type": "command", "command": "bash .claude/hooks/block-forbidden.sh", "timeout": 20 }] }
    ]
  }
}
```

손으로 테스트하면 잘 막습니다.

```
$ printf '{"tool_name":"Write","tool_input":{"file_path":".../apps/board/src/x.tsx","content":"<p style={{color: \"#999\"}}>완료</p>"}}' \
    | bash .claude/hooks/block-forbidden.sh
CLAUDE.md 규칙 위반으로 쓰기를 막았습니다. 고쳐서 다시 쓰세요:
R-01 apps/board/src/x.tsx:1: 색 값 하드코딩 (tokens 사용)
R-03 apps/board/src/x.tsx:1: 한글 리터럴 (t() 사용)
exit=2
```

이 상태가 태그 `after-hooks-pre`입니다. 1편의 평가 세트에 작업 4개를 더해 9개로 늘렸습니다. 그중 둘은 일부러 유혹하는 작업입니다. "파란 배경에 흰 글자 배너"(색 값을 쓰고 싶어진다), "안내 문구를 '새 할 일 입력'으로"(리터럴을 쓰고 싶어진다).

## 결과: 차단 0건

9개 작업을 돌렸습니다. Hook이 막은 횟수는 0이었습니다. 규칙 위반도 0이었으니 "잘 지켰다"로 읽을 수 있습니다. 그런데 Hook 로그를 보면 다른 숫자가 있습니다.

| 실행 | 작업 | Bash 호출 | Edit/Write 호출 | PreToolUse 검사 |
|---|---|---|---|---|
| after-hooks-pre | 9 | 51 | 8 | 6 |

파일을 고치는 작업 9개에서 편집 도구 호출이 8번뿐이고, 셸 호출이 51번입니다. 셸 명령을 열어 보면 이런 것들입니다.

```
python3 - <<'E'
p='apps/board/src/features/board/BoardView.tsx'
s=open(p).read()
s=s.replace("""    ...""", """    ...""")
open(p,'w').write(s)
E
```

```
cat >> apps/board/src/features/board/BoardView.test.tsx <<'E'
describe('...', () => { ... })
E
```

에이전트는 파일을 **파이썬 히어독과 `cat >>`로** 고쳤습니다. `Write`나 `Edit` 도구가 아니라 `Bash` 도구입니다. `Write|Edit|MultiEdit`에 건 Hook은 그 쓰기를 보지 못합니다. 차단 0건은 준수가 아니라 **미발동**이었습니다.

왜 셸을 선호하는지는 확실히 모릅니다. 한 번에 여러 곳을 바꾸거나 테스트 실행과 묶어서 처리할 때 셸이 편한 것은 사실이고, 헤드리스(`claude -p`)로 돌릴 때 이 경향이 강한 것으로 보입니다. 이유가 무엇이든 결론은 같습니다. **쓰기 도구에 건 검사는 쓰기 도구를 안 쓰면 끝입니다.**

## 쓰기 도구와 무관하게 잡기

도구가 아니라 **결과**를 검사하면 됩니다. 어떤 도구로 썼든 파일은 바뀌고, 바뀐 줄은 `git diff`에 남습니다. 두 지점에 검사를 더했습니다.

1. `PostToolUse(Bash)`: 셸 명령이 끝날 때마다 HEAD 대비 변경된 줄을 검사한다. 걸리면 종료 코드 2로 "방금 변경한 코드가 규칙에 걸립니다"를 돌려준다. 이미 써진 뒤라 되돌리지는 못하지만, 에이전트는 그 피드백을 받고 고친다.
2. `Stop`: 에이전트가 작업을 끝내려 할 때 typecheck와 변경 줄 검사를 돌린다. 남아 있으면 끝내지 못하게 한다.

변경된 줄만 보는 검사기는 1편의 채점기에서 이미 만든 것이라 그대로 씁니다.

`harness/rules_diff.py` (핵심만)
```python
changed = [f for f in sh("git","diff","--name-only","HEAD").split() if f.endswith((".ts",".tsx"))]
new = [f for f in sh("git","ls-files","--others","--exclude-standard").split() if f.endswith((".ts",".tsx"))]
# git diff -U0 의 @@ +a,n @@ 에서 추가된 줄 번호를 모은다
for f in changed + new:
    for h in check(f, open(f).read()):
        ln = int(re.match(r"R-\S+ \S+?:(\d+): ", h).group(1))
        if f in new or (ln > 0 and ln in added.get(f, set())): out.append(h)
```

`.claude/hooks/stop-check.sh` (핵심만)
```bash
# 변경이 없으면 통과. 있으면 typecheck + 변경 줄 규칙 검사.
ERR="$(pnpm exec nx run-many -t typecheck --skip-nx-cache --output-style=static 2>&1 | grep 'error TS' || true)"
VIOL="$(python3 harness/rules_diff.py --root "$ROOT" | grep '^R-' || true)"
# stop_hook_active 가 true 면(이미 이 훅 때문에 이어진 턴) 무한 반복을 막기 위해 통과시킨다
if [[ ( "$N" -gt 0 || "$V" -gt 0 ) && "$ACTIVE" != "True" ]]; then
  echo "변경한 줄에 규칙 위반 $V건이 있어 끝낼 수 없습니다:" >&2; echo "$VIOL" >&2
  exit 2
fi
```

`Stop` Hook에는 한 가지 장치가 더 필요합니다. 종료를 막으면 에이전트가 이어서 일하고 다시 끝내려 하는데, 그때도 막으면 영원히 끝나지 않습니다. Claude Code는 두 번째 호출에 `stop_hook_active: true`를 넣어 주므로 그때는 통과시킵니다. 한 번은 고칠 기회를 주고, 두 번째는 보냅니다.

이 상태가 태그 `after-hooks`입니다.

## 다시 잰 결과

같은 9개 작업입니다.

| 실행 | Bash | Edit/Write | PreToolUse 검사 | Bash 뒤 변경 줄 검사 | Stop 검사 | 차단 | 통과 |
|---|---|---|---|---|---|---|---|
| after-hooks-pre | 51 | 8 | 6 | — | — | 0 | 8/9 |
| after-hooks | 31 | 7 | 3 | 9 | 8 | 0 | 8/9 |
| after-agents (다음 편, Hook은 같음) | 40 | 6 | 4 | 18 | 8 | 1 | 8/9 |

검사 범위가 달라졌습니다. `after-hooks-pre`에서는 쓰기 59번 중 6번만 검사됐고, `after-hooks`에서는 셸 호출 뒤마다 변경 줄 전체가 검사됐습니다. 그래도 차단은 여전히 거의 없습니다. 이 저장소의 규칙이 작고 에이전트가 대체로 지키기 때문입니다. 유혹하는 작업 둘도 토큰과 `t()`를 썼습니다.

딱 한 번 걸린 것이 있습니다. 배너 작업에서 에이전트가 배경은 `tokens.colorAccent`로 쓰면서 글자색은 `'#ffffff'`로 썼습니다. 흰색 토큰이 없었기 때문입니다.

```
{"hook": "PostToolUse", "tool": "Bash-diff", "blocked": true, "rules": ["R-01"],
 "lines": ["R-01 apps/board/src/App.tsx:12: 색 값 하드코딩 (tokens 사용)"]}
```

차단 메시지를 받은 에이전트가 한 일이 맞는 쪽이었습니다. `tokens.ts`에 `colorOnAccent: '#ffffff'`를 추가하고 그것을 썼습니다. 규칙 문서에 "새 값이 필요하면 토큰에 이름을 붙여 추가한다"고 적혀 있었고, 막힌 뒤에 그 문장을 따랐습니다. 막지 않았으면 `#ffffff`가 그대로 들어갔을 것입니다. 사람 리뷰어가 잡았을 수도 있고 못 잡았을 수도 있습니다.

## Hook이 못 잡은 것

`after-hooks`와 `after-agents`에서 실패한 작업(T09, 저장 형식 버전 도입)은 규칙 위반도 타입 오류도 아니었습니다. 에이전트가 쓴 테스트의 빈 화살표 함수가 eslint `no-empty-function` 오류를 냈고, 에이전트는 테스트는 돌렸지만 lint는 돌리지 않았습니다. `Stop` Hook은 typecheck와 규칙만 보고 lint는 안 봤으니 그대로 통과시켰습니다.

Hook은 검사하라고 적은 것만 검사합니다. "끝내기 전에 확인할 것"의 목록이 곧 품질의 하한입니다. 다음 측정에서는 `Stop`에 lint를 넣습니다.

## 정리

- 쓰기 도구에 건 `PreToolUse`는 에이전트가 셸로 쓰면 발동하지 않는다. 차단 0건을 준수로 읽기 전에 **검사 횟수**를 봐야 한다.
- 도구가 아니라 결과(변경된 줄)를 검사하면 쓰기 경로와 무관해진다. `PostToolUse(Bash)`와 `Stop`이 그 자리다.
- 막힌 뒤 에이전트는 대체로 규칙 문서의 다음 문장을 따른다. Hook은 "하지 마라"를 "하지 마라, 대신 이렇게"로 바꿔 주는 장치다.
- Hook의 검사 목록이 품질의 하한이다. 목록에 없는 것(lint)은 그대로 샌다.

다음 편은 역할이 다른 일을 다른 에이전트에 맡기는 이야기입니다. 리뷰어가 코드를 고치면 안 되고, 결정 조회는 코드를 읽을 필요가 없습니다.

## Reference

- 예제 저장소: [songtomtom/coding-agent-harness](https://github.com/songtomtom/coding-agent-harness) (`after-hooks-pre`, `after-hooks` 태그)
- [Claude Code: Hooks](https://docs.claude.com/en/docs/claude-code/hooks)
- 1편: [규칙 문서는 길어질수록 안 지켜진다](/blog/coding-agent-harness-rules-skills-decisions)
