---
title: "Integer Issues"
date: 2026-06-23
categories: [Research]
tags: [System, IIS]
description: Searching about Integer Issues
image:
  path: /assets/img/posts/IntegerIssue/logo.png
  alt: thumbnail
---

## Concept
정수 이슈는 컴퓨터가 숫자를 처리하는 방식의 한계로 인해 발생하는 취약점으로 메모리 버퍼의 크기를 계산하거나 배열의 인덱스를 지정할 때 주로 발생하며, 시스템 해킹에서 메모리 오염(Memory Corruption)을 일으키는 트리거 역할을 한다.

* Integer Overflow(정수 오버플로우): 정수형 변수가 가질 수 있는 최댓값을 넘어가 가장 작은 값(또는 0)으로 되돌아가는 현상
* Integer Underflow(정수 언더플로우): 정수형 변수가 가질 수 있는 최솟값보다 작아져 가장 큰 값으로 되돌아가는 현상
* Sign Extension Errors(부호 확장 오류): 부호가 있는 정수(Signed)와 부호가 없는 정수(Unsigned)를 혼용하거나 형변환(Casting)할 때 데이터가 왜곡되는 현상

### Vulnerable Code Analysis (PoC)

정수 오버플로우가 어떻게 실제 메모리 오염(Heap Overflow)으로 이어지는지 C언어 예제를 통해 살펴보겠습니다.
```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
char *input = (char *)malloc(131070);
if (input == NULL) return 1;
memset(input, 'A', 131069);
input[131069] = '\0';

unsigned short width = 65535;
unsigned short height = 2;

unsigned short size = width * height; 

printf("[+] 계산된 할당 크기(size): %u bytes\n", size);

char *buffer = (char *)malloc(size); 
if (buffer == NULL) {
    free(input);
    return 1;
}

memcpy(buffer, input, 131070);       

printf("[+] 복사 완료\n");
free(buffer);
free(input);
return 0;
}
```
{: file="poc.c"}

### 발생 이유

`unsigned short` 타입은 메모리에서 2바이트(16비트)를 차지하고 표현할 수 있는 값의 범위는 `0`부터 `65535`까지이다.

수학적으로 `65535 * 2`는 `131070`(`0x00010040`)이지만, 16비트 공간에는 뒤의 `0x0040`만 저장됨. 이 `0x0040`을 10진수로 변환하면 `64`가 되고 컴퓨터는 오버플로우로 인해 단 64바이트만 할당해 놓고, 실제 데이터는 131000바이트가 넘는 값을 밀어 넣으면서 프로그램이 크래시(Segmentation Fault)를 일으키며 죽게 됩니다.

* * *

### Mitigation (보안 대책)

정수 취약점을 방어하기 위해 입력값과 계산 과정에서 범위를 엄격하게 검증

### 1 연산 전 오버플로우 가능성 체크

값이 변조된 후 검사하는 것은 의미가 없습니다. 계산을 수행하기 전에 안전한 범위인지 검증해야 합니다.
```c
// 안전한 곱셈 검증 예시
if (width > 0 && height > USHRT_MAX / width) {
    // 오버플로우 위험 감지 및 예외 처리
    return -1;
}
unsigned short size = width * height;
```
{: file="mitigation.c"}

### 2 안전한 라이브러리/함수 사용

최신 컴파일러나 표준 라이브러리에서 제공하는 정수 연산 검증 함수를 사용하는 것이 가장 안전하다.

*   **GCC 내장 함수**: `__builtin_mul_overflow`, `__builtin_add_overflow` 등을 사용하면 연산과 동시에 오버플로우 여부를 부울(bool) 값으로 반환받을 수 있습니다.

### 3 자료형의 일관성 유지

부호가 있는 정수(`int`)와 부호가 없는 정수(`size_t`, `unsigned int`)를 연산하거나 비교할 때 묵시적 형변환으로 인해 취약점이 자주 발생합니다. API가 요구하는 자료형을 정확히 일치시켜 사용하는 것이 중요하다.

## 결론
결국 **Integer Issues(정수 이슈)**의 본질은 할당받은 버퍼의 크기를 초과하는 바이트 크기의 입력을 받아 오버플로우를 유발하는 것입이다.일반적인 버퍼 오버플로우(Buffer Overflow)가 단순히 입력 크기를 제한하지 않아서 발생한다면, 정수 이슈는 "프로그래머가 크기를 계산하고 검증하는 로직" 자체를 컴퓨터의 산술적 한계를 이용해 무력화한다는 점에서 차이가 있다.

*공격 메커니즘*: 정수 오버플로우/언더플로우 발생 ➔ 비정상적으로 작은 크기의 메모리 할당 ➔ 대용량 데이터 입력 ➔ 힙/스택 오버플로우 발생 ➔ 힙 메타데이터 오염 (free(): invalid next size)

안전한 시스템을 구축하기 위해서는 단순히 메모리 복사 함수를 제한하는 것뿐만 아니라, 메모리 크기를 계산하는 모든 정수 연산 단계에서 철저한 범위 검증(Bounds Checking)이 선행되어야 한다.