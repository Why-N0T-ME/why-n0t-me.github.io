---
title: "Stack Pivoting"
date: 2026-06-24  
categories: [Research]  
tags: [System, StackPivoting, ROP]  
description: Searching about Stack Pivoting and Advanced Exploitation  
image:  
    path: /assets/img/posts/  
    alt: thumbnail
---
## Introduction

이전 포스트에서 우리는 **Integer Issues(정수 이슈)**로 인해 발생한 오작동이 어떻게 메모리 할당 제한을 무력화하고 버퍼 오버플로우로 이어지는지 살펴보았다.

하지만 실제 익스플로잇(Exploit)을 수행하다 보면 또 다른 문제를 마주친다. 취약점은 찾았는데, 데이터를 덮어쓸 수 있는 **스택의 공간이 고작 16바이트나 24바이트 정도로 턱없이 부족한 경우**이다.

시스템 권한을 획득하기 위한 ROP(Return Oriented Programming) 체인을 구성하려면 수많은 가젯과 인자들을 연속해서 배치해야 하므로 최소 수십~백 바이트 이상의 공간이 필요함. 이렇게 주어진 스택 공간이 턱없이 부족할 때, 공격자는 **Stack Pivoting(스택 피보팅)**을 사용할수 있다.

### Concept: 스택 포인터의 축을 돌리다

Stack Pivoting(스택 피보팅)은 이름 그대로 스택 포인터 레지스터(`ESP` 또는 `RSP`)를 우리가 원하는 임의의 가짜 스택 영역으로 옮겨 실행 흐름을 바꾸는 기법이다. 농구에서 한 발을 바닥에 고정하고 방향을 전환하는 '피벗(Pivot)' 동작처럼, 원래의 스택 영역을 벗어나 안전하고 널널한 다른 메모리 공간을 새로운 스택으로 탈바꿈시키는 것이다.

주로 다음과 같은 상황에서 스택 피보팅이 결정적인 역할을 하게 된다.

* **버퍼 크기 제한**: 오버플로우가 가능한 공간이 너무 작아 긴 ROP 체인을 적을 수 없을 때
* **특수 문자/널 바이트 제한**: 특정 함수(`strcpy` 등)의 제약으로 인해 스택 뒤쪽으로 값을 더 밀어 넣을 수 없을 때

공격자는 마음대로 값을 채워 넣을 수 있는 **힙(Heap) 영역**이나 **전역 변수 영역(BSS 영역)**에 거대한 ROP 체인을 미리 구성해 두고, 진짜 스택에 남은 단 몇 바이트의 공간을 이용해 스택 포인터(`RSP`)를 그 가짜 스택 주소로 돌려버린다. 그 순간부터 컴퓨터는 새로운 영역을 실제 스택으로 인지하고 공격자가 짜놓은 ROP 체인을 순서대로 실행하게 된다.


### Mechanism: 스택은 어떻게 움직이는가?

스택 포인터를 제어하기 위해 공격자가 주로 활용하는 어셈블리 명령어 조합(가젯)은 크게 두 가지가 있다.

### 1. `pop rsp ; ret` 가젯

가장 직관적인 방법으로 이 가젯이 실행되면 스택의 최상단에 있는 값이 `RSP` 레지스터로 들어감.

```nasm
pop rsp
ret
```
{: ex.nasm}

만약 공격자가 `pop rsp`가 실행되는 시점의 스택 탑에 전역 변수(BSS) 주소인 `0x601000`을 적어두었다면, `RSP`는 곧바로 `0x601000`으로 바뀌고 이어지는 `ret` 명령어는 이제 원래 스택이 아닌 `0x601000`에 적힌 주소로 리턴함.

### 2. `leave ; ret` 가젯

함수가 종료되는 과정(Epilogue)을 가로채는 방식입니다. `leave` 명령어는 내부적으로 다음과 같이 동작합니다.

```nasm
mov rsp, rbp
pop rbp
```
{: file="ex.nasm"}

버퍼 오버플로우를 통해 이전 함수의 스택 프레임 포인터**(`RBP`)값을 가짜 스택의 주소**로 오염시키면 함수가 끝나고 `leave`를 만나 `pop rbp`에 의해 `RBP`에 가짜 주소가 들어가고, 메인 함수나 호출 함수로 돌아간 다음 `leave`를 다시 만나면 `mov rsp, rbp`에 의해 `RSP`도 가짜 주소로 이동하게 되고 단 두번의 함수 종료 과정을 이용해 스택을 장악한다.

### 요약

* **본질**: Stack Pivoting은 협소한 스택 공간의 한계를 극복하기 위해 `RSP`를 힙이나 전역 변수 등 **임의의 가짜 스택 영역으로 전환하는 기법**이다.
* **핵심 가젯**: `pop rsp ; ret` 또는 함수의 에필로그인 `leave ; ret` 구조를 정교하게 조작하여 달성한다.

## 실습

```c
// main.c
#include <stdio.h>
#include <unistd.h>

char global_buff[0x2000]; // 1. 충분한 공간을 가진 전역 변수 영역 (가짜 스택)

int main() {
    // 버퍼링 미적용 설정
    setvbuf(stdout, NULL, _IONBF, 0);
    char stack[32] = {0};     // 2. 32바이트 크기의 협소한 진짜 스택 버퍼

    puts("Enter something to write to the global: ");
    // 가짜 스택 역할을 할 전역 변수에 먼저 거대한 ROP 체인을 배치
    read(0, global_buff, sizeof(global_buff)); 

    puts("Now give me something to store on the stack: ");
    // stack 버퍼의 크기는 32바이트인데, 32 + 24(0x18) 바이트만큼 입력
    // 딱 SFP(Saved Frame Pointer, 8바이트)와 Return Address(8바이트) 영역까지만 오버플로우
    read(0, stack, sizeof(stack) + 0x18);

    return 0;
}
```
{: file="main.c"}

위 코드는 스택 피보팅이 발생하는 C코드로, 전역변수에는 큰 데이터를 쓸수 있지만, 함수 내 버퍼의 크기는 16바이트로 작게 제한된 상황이다.

```sh
# Canary, PIE 보호기법을 끄고 컴파일
gcc -o target target.c -fno-stack-protector -no-pie
```
{: file="compile.sh"}

* global_buff: 가짜스택으로 쓸 공간으로 맨 앞 8바이트는 더미 데이터를 채우고 그 뒤에는 실행시키고 싶은 ROP 체인 가젯들을 나열
* stack: 더미데이터(32바이트) + global_buff주소 + leave; ret 가젯주소 + 더미데이터(8바이트)

![main](/assets/img/posts/StackPivoting/main.png)
> main함수의 디스어셈블 결과

![ROPgadget](/assets/img/posts/StackPivoting/gadget1.png)
> main 바이너리 내부에는 pop rdi 가젯이 없음 -> 바이너리에 포함된 puts함수를 이용해 이 함수의 메모리 주소(GOT)를 leak
> libc 내부에 있는 pop rdi 가젯을 사용
> 알아낸 주소로 lib_base를 구하고 라이브러리 내의 system함수와 "/bin/sh"문자열 주소를 획득해 쉘 실행

### ROP체인 작성 & 셸 획득

디스어셈블 결과를 바탕으로 필요한 주소들을 정리하면 다음과 같다.

* `global_buff` 주소: `0x404060` (가짜 스택의 시작)
* `leave ; ret` 가젯: main 함수 에필로그 (`0x4011de`)
* `puts@plt`: `0x401030` (GOT leak용)
* `puts@got`: `0x404018` (puts의 실제 주소 저장 위치)
* `read@got`: ROP 체인 내 다음 단계용
* `pop rbp ; ret`: `0x40112d`

바이너리 자체에는 `pop rdi` 가젯이 없으므로, 먼저 `puts`의 GOT 주소를 leak하여 libc base를 계산하고, libc 내부의 `pop rdi ; ret` 가젯과 `system("/bin/sh")`을 호출한다.

#### Exploit 구성 전략

**1단계 (global_buff에 배치할 가짜 스택)**
```
[+0x00] dummy (8바이트)          ← leave;ret 이후 RSP가 처음 가리키는 곳 (pop rbp에 소비됨)
[+0x08] pop_rdi_ret (libc)       ← ret 후 첫 번째 가젯
[+0x10] puts_got 주소            ← rdi = puts@GOT
[+0x18] puts_plt 주소            ← puts(puts@got) 호출 → leak
[+0x20] main 주소                ← leak 후 main 재실행 (2차 공격 준비)
```

**2단계 (stack 버퍼 오버플로우 페이로드)**
```
[+0x00] 'A' * 32                 ← stack 버퍼 채우기(더미)
[+0x20] global_buff + 8 주소     ← SFP(RBP) 위치: 가짜 스택 주소로 오염
[+0x28] leave ; ret 가젯 주소    ← Return Address: 스택 피보팅 트리거
```