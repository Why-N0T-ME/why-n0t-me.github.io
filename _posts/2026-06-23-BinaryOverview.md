---
title: "Binary Exploitation Overview"
date: 2026-06-23
categories: [Research]
tags: [System, PWN]
description: Binary Exploitation 기법들의 전체 흐름 정리
image:  
    path: /assets/img/posts/BinaryOverview/logo.png
    alt: thumbnail
---

## Overview

지금까지 정리한 기법들을 한 흐름으로 연결하면 다음과 같다.

```
[1단계: 취약점 발견]
Integer Issue / FSB
        ↓
[2단계: 공간 문제 해결]
Stack Pivoting
        ↓
[3단계: 익스플로잇 구성]
ret2csu + ROP
        ↓
[4단계: 최종 실행]
RTL → system("/bin/sh") → 셸 획득
```

---

## 1단계: 취약점 발견

익스플로잇의 시작은 **취약점을 찾는 것**이다.

### Integer Issue → BOF 발생

정수 연산 오류로 버퍼 크기 계산이 잘못되어 **버퍼 오버플로우(BOF)** 가 발생한다.
BOF가 발생하면 스택의 반환 주소를 덮어쓸 수 있어 실행 흐름을 가로챌 수 있다.

```c
// 예시: 부호 없는 정수로 음수를 받아 크기 검사를 우회
int size;
scanf("%d", &size);
if (size < 256) {        // size = -1이면 통과
    read(0, buf, size);  // size가 unsigned로 변환되어 엄청난 크기가 됨
}
```

### FSB → libc/카나리 주소 Leak

FSB(Format String Bug)는 BOF를 일으키는 원인이 아니라,
**ASLR과 스택 카나리를 우회하기 위한 주소 leak 수단**으로 활용된다.

```c
// 취약한 코드
char buf[64];
read(0, buf, 64);
printf(buf);  // buf = "%p %p %p"이면 스택/레지스터 값이 줄줄이 출력됨
```

- `%p`, `%x` → 스택을 읽어 **카나리 값**, **libc 주소** leak
- leak한 libc 주소로 libc base 계산 → **ASLR 우회**
- leak한 카나리 값을 페이로드에 포함 → **스택 카나리 우회**

---

## 2단계: 공간 문제 해결

### Stack Pivoting

BOF가 발생해도 스택에 **ROP Chain을 올릴 공간이 부족**한 경우가 있다.
이때 Stack Pivoting으로 스택 포인터(RSP)를 공격자가 준비한
**가짜 스택(fake stack)** 으로 옮겨 충분한 공간을 확보한다.

```
[실제 스택 - 공간 부족]       [가짜 스택 - 공간 충분]
┌──────────────────┐         ┌──────────────────┐
│  패딩            │         │  가젯 1 주소      │
├──────────────────┤         ├──────────────────┤
│  leave; ret 주소 │ ──────→ │  가젯 2 주소      │
├──────────────────┤         ├──────────────────┤
│  fake stack 주소 │         │  ...             │
└──────────────────┘         └──────────────────┘
```

`leave; ret` 가젯으로 RSP를 fake stack 주소로 이동시켜
이후 ROP Chain이 가짜 스택에서 실행되도록 한다.

---

## 3단계: 익스플로잇 구성

### ret2csu → 레지스터 세팅

64비트 환경에서 `pop rsi`, `pop rdx` 같은 가젯이 바이너리에 없을 때,
컴파일 시 자동 삽입되는 `__libc_csu_init` 함수 안의 가젯으로
`rdi`, `rsi`, `rdx`를 한번에 세팅한다.

```
가젯 2: pop rbx/rbp/r12/r13/r14/r15; ret  ← 초기값 세팅
가젯 1: mov rdx, r13 / mov rsi, r14 / mov edi, r15d  ← 레지스터에 복사
```

> glibc 2.34 이상 환경에서는 `__libc_csu_init`이 제거되어
> libc 가젯, SROP, one_gadget 등의 대안을 사용한다.

### ROP → 가젯 체인 구성

세팅된 레지스터를 바탕으로 가젯들을 체인으로 연결한다.
각 가젯 끝의 `ret`가 스택의 다음 주소를 읽어 연속 실행을 만든다.

```
[패딩              ]
[pop rdi; ret      ]  ← rdi 세팅
["/bin/sh" 주소    ]
[ret               ]  ← stack alignment
[system() 주소     ]  ← 최종 호출
```

---

## 4단계: 최종 실행

### RTL → system("/bin/sh") → 셸 획득

ROP Chain의 최종 목적지는 **libc 함수 호출**이다.
`rdi = "/bin/sh"` 세팅이 완료된 상태에서 `system()`을 호출하면 셸이 획득된다.

```
ret2csu / ROP로 rdi = "/bin/sh" 세팅
        ↓
system("/bin/sh") 호출  ← RTL
        ↓
셸 획득
```

---

## 전체 흐름 요약

```
Integer Issue   ──→ BOF 발생 (반환 주소 제어권 획득)
FSB             ──→ libc/카나리 leak (ASLR, 카나리 우회)
Stack Pivoting  ──→ 공간 부족 시 fake stack으로 이동
ret2csu         ──→ 가젯 부족 시 레지스터 세팅
ROP             ──→ 가젯 체인으로 실행 흐름 구성
RTL             ──→ system("/bin/sh")로 최종 셸 획득
```

각 기법은 독립적으로 쓰이기도 하지만,
실전 익스플로잇에서는 위 흐름처럼 **단계별로 조합**하여 사용하는 것이 일반적이다.