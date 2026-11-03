---
title: "CryptoHack · AES"
date: 2026-10-30
categories: ['CTF/Wargame']
tags: [CryptoHack, Crypto, AES, S-box]
description: CryptoHack AES 챕터 풀이 - 키드 퍼뮤테이션부터 S-box의 비선형성, AddRoundKey까지 AES 내부 구조를 정리한다
math: true
image:
    path: /assets/img/posts/Crypto/logo.png
    alt: thumbnail
---

## 문제 정보

| 항목 | 내용 |
|---|---|
| 플랫폼 | CryptoHack |
| 분류 | Crypto - Symmetric Cryptography → AES |
| 난이도 | Easy (5~20pt) |
| 풀이일 | 2026-10-30 |
| 핵심 기법 | 키드 퍼뮤테이션, S-box 비선형성, AddRoundKey |

> 한 줄 요약: AES를 직접 구현하기 전 단계로, 키드 퍼뮤테이션의 정의부터 S-box의 비선형성, 라운드 키 XOR까지 AES 내부 구조의 기초를 다진다.
> 유한체에 관한 대수적인 내용은 현대대수의 체를 다루는 글에서 더 자세히 알아보겠다.
{: .prompt-info }

## 문제 설명
CryptoHack의 Symmetric Cryptography 코스 중 AES 챕터이다. 문제마다 AES 내부 동작 하나씩을 짧은 코드나 개념 질문으로 확인한다.

- 코스: Symmetric Cryptography → AES
- 목표: 문제마다 요구하는 함수를 구현하거나 질문에 답해 `crypto{...}` 형태의 flag를 얻는다

## 진행 현황

| 문제 | 배점 | 상태 | 풀이일 |
|---|---|---|---|
| Keyed Permutations | 5 | 완료 | 2026-10-30 |
| Resisting Bruteforce | 10 | 완료 | 2026-10-30 |
| Structure of AES | 10 | 완료 | 2026-10-30 |
| Round Keys | 20 | 완료 | 2026-10-30 |
| Confusion through Permutation | 15 | 완료 | 2026-10-30 |
| Diffusion through Permutation | - | 완료 | 2026-11-04 |
| Bringing It All Together | - | 진행 중 | |

뒤 문제는 마저 풀어 이 글에 이어서 정리한다.

## 분석

### 1. Keyed Permutations - 키드 퍼뮤테이션

AES 같은 좋은 블록 암호는 모든 입력 블록을 서로 다른 출력 블록 하나에 대응시키는 `키드 퍼뮤테이션(Keyed Permutation)`이다. 같은 키로 암호문을 다시 원래 평문으로 되돌릴 수 있어야 하므로, 입력과 출력은 하나씩 짝지어지는 **1:1 대응**이어야 한다.

> 1:1 대응을 수학 용어로 `전단사함수(Bijection)`라고 한다.
{: .prompt-info }

**Flag**: `crypto{bijection}`

### 2. Resisting Bruteforce - 전수조사 복잡도

AES가 안전하다면 공격자는 키를 하나씩 맞혀 보는 것보다 더 빠른 방법이 없어야 한다. 128비트 키 공간을 전수조사한다고 하면, 비트코인 채굴 네트워크 전체를 동원해도 우주 나이의 100배가 넘게 걸린다고 추정된다.

학계에서는 전수조사보다 조금이라도 더 빠른 방법만 찾아도 그 암호를 이론적으로 "깨졌다(broken)"고 본다. AES에 대해 실제로 이런 공격이 하나 있는데, AES-128의 보안 강도를 126.1비트로 낮추는 수준이고 8년 넘게 더 나은 공격이 나오지 않아 실질적인 위협으로 보지는 않는다.

> 단일 키 모델에서 AES에 대한 최선의 공격은 `비클리크 암호분석(Biclique Cryptanalysis)`이다.
{: .prompt-info }

양자 컴퓨터를 기준으로 봐도, RSA 같은 공개키 암호는 Shor's algorithm으로 완전히 깨지는 반면 AES 같은 대칭키 암호는 Grover's algorithm으로 보안 강도가 절반(제곱근)으로만 줄어든다. AES-256을 권장하는 이유 중 하나이다.

**Flag**: `crypto{Biclique}`

### 3. Structure of AES - 전체 구조와 matrix2bytes

AES-128은 16바이트 평문을 4×4 바이트 행렬(`state`)로 놓고, `KeyExpansion`으로 11개의 라운드 키를 만든 뒤 아래 순서로 10라운드를 돈다.

1. **AddRoundKey** (초기 키 합산)
2. 라운드마다: `SubBytes` → `ShiftRows` → `MixColumns`(마지막 라운드는 생략) → `AddRoundKey`

문제에서는 `bytes2matrix`가 주어지고, 반대로 행렬을 바이트로 되돌리는 `matrix2bytes`를 구현해야 한다.

```python
def bytes2matrix(text):
    """ 16바이트를 4x4 행렬로 변환한다. """
    return [list(text[i:i+4]) for i in range(0, len(text), 4)]

def matrix2bytes(matrix):
    text = ""
    for row in matrix:
        for j in row:
            text += chr(j)
    return text
```
{: file="matrix.py" }

**Flag**: `crypto{inmatrix}`

### 4. Round Keys - AddRoundKey

`AddRoundKey`는 현재 state와 라운드 키를 바이트 단위로 XOR하는 가장 단순한 단계이지만, AES에서 키가 섞여 들어가는 유일한 지점이다.

처음에는 `int(bytes(sum(s, [])))`처럼 바꾸려다 `ValueError`가 났다. `bytes(obj)`는 리스트가 아니라 정수를 넘기면 그만큼의 빈 바이트열을, 문자열을 넘기면 10진수 리터럴로 파싱을 시도하기 때문에 의도한 동작이 아니었다. 바이트 하나하나를 인덱싱해 XOR하려면 `bytearray`로 변환해야 한다.

```python
def add_round_key(s, k):
    st = bytearray(sum(s, []))
    rk = bytearray(sum(k, []))
    for i in range(len(st)):
        st[i] = st[i] ^ rk[i]
    return [list(st[i:i+4]) for i in range(0, len(st), 4)]

result = add_round_key(state, round_key)
print(bytes(sum(result, [])))
```
{: file="add_round_key.py" }

**Flag**: `crypto{r0undk3y}`

### 5. Confusion through Permutation - S-box와 혼돈

AES의 각 라운드는 `SubBytes`로 시작한다. state의 바이트 하나하나를 16×16 룩업 테이블인 `S-box`로 치환하는 단계이다.

> 헷갈리기 쉬운 부분: S-box는 바이트의 "위치"가 아니라 "값"으로 찾는다. `state[0][0]`의 값이 `0xFB`라면, 행렬 좌표 (0,0)이 아니라 `0xFB`를 상위 니블(`0xF`)과 하위 니블(`0xB`)로 나눠 S-box의 15행 11열 값을 찾아 치환한다.
{: .prompt-warning }

실제로 손으로 표를 짚다가 15행 11열을 `0x79`로 잘못 읽은 적이 있는데, 실제 값은 `0x63`이었다. 행/열을 나누는 방법 자체는 맞았지만 표를 눈으로 셀 때 한 칸씩 밀려 읽은 실수였다. 헷갈리면 말로 세는 대신 코드로 직접 인덱싱해 확인하는 편이 빠르다.

S-box는 갈루아 체 $$GF(2^8)$$ 위에서 곱셈 역원을 구한 뒤 아핀 변환을 적용해 만든다. 이 과정을 하나의 다항식으로 쓰면 다음과 같다.

$$
f(x) = 05x^{fe} + 09x^{fd} + f9x^{fb} + 25x^{f7} + f4x^{ef} + 01x^{df} + b5x^{bf} + 8fx^{7f} + 63
$$

이렇게 고차 다항식으로 정의되는 비선형 함수를 미리 계산해 룩업 테이블로 만든 것이 S-box이고, 섀넌이 말한 `혼돈(Confusion)` — 키와 암호문의 관계를 최대한 복잡하게 만드는 성질 — 을 담당한다. 문제는 state를 역 S-box(`inv_s_box`)로 치환해 평문을 복원하는 `sub_bytes`를 완성하는 것이다.

```python
def sub_bytes(s, sbox=s_box):
    st = bytearray(sum(s, []))
    for i in range(len(st)):
        st[i] = sbox[st[i]]
    return [list(st[i:i+4]) for i in range(0, len(st), 4)]

result = sub_bytes(state, sbox=inv_s_box)
print(bytes(sum(result, [])))
```
{: file="sub_bytes.py" }

**Flag**: `crypto{l1n34rly}`

### 6. Diffusion through Permutation - 행 밀기·열 혼합과 확산

`ShiftRows`(행 밀기)와 `MixColumns`(열 혼합)는 단 두 라운드만으로 평문 한 바이트의 변화가 암호문 전체로 퍼지게 만든다. 행 밀기는 각 행을 순환시키는 가벼운 연산이고, 열 혼합은 그보다 훨씬 복잡하다.

- **행 밀기**: $r=0$행(첫 번째 행)은 그대로 두고, $r$번째 행을 왼쪽으로 $r$칸씩 순환시킨다.
- **열 혼합**: 갈루아 체 $$GF(2^8)$$ 위에서 state와 고정된 행렬을 행렬곱한다.

#### 유한체 위의 행렬곱

유한체($$GF(p^n)$$) 위의 행렬곱도 식 자체는 보통의 행렬곱과 같다. $$c_{ij} = \sum_{k} a_{ik} b_{kj}$$ 다만 곱셈과 덧셈이 실수·복소수의 연산이 아니라 유한체의 연산을 따른다. $$GF(2^n)$$에서는 덧셈이 XOR, 곱셈이 모듈러 다항식 연산이다.

결합법칙은 성립하지만 교환법칙은 성립하지 않고, 정사각행렬이면서 행렬식이 0이 아니면 유클리드 호제법으로 역행렬을 구할 수 있다. `MixColumns`에 쓰이는 4×4 행렬은 $$GF(2^8)$$ 위에서 행렬식이 0이 아니어서 역행렬이 유일하게 존재하고, 그 역행렬을 적용하는 것이 `inv_mix_columns`이다.

#### 인덱싱 - 틀린 시도

이 코드의 `state`는 `state[열][행]`(첫 번째 인덱스가 열) 구조다. `shift_rows`를 식으로 쓰면 $$new[c][r] = old[(c+r) \bmod 4][r]$$ — **행($r$, 두 번째 인덱스)은 고정하고 열($c$, 첫 번째 인덱스)만 도는** 연산이다. `inv_shift_rows`를 짜다가 두 번 틀렸다.

1. 열 하나(`s[i]`)만 백업해 놓고 그 안에서 값을 재배치했다. 하지만 행 밀기는 **다른 열의 값을 끌어와야** 하는 연산이라, 같은 열 안에서만 맴도는 방식으로는 애초에 구현할 수 없는 식이었다.
2. 백업 범위를 행렬 전체로 늘리고 $$new[c][r] = old[(c-r) \bmod 4][r]$$ 식을 그대로 인덱싱으로 옮기니 해결됐다.

```python
def shift_rows(s):
    s[0][1], s[1][1], s[2][1], s[3][1] = s[1][1], s[2][1], s[3][1], s[0][1]
    s[0][2], s[1][2], s[2][2], s[3][2] = s[2][2], s[3][2], s[0][2], s[1][2]
    s[0][3], s[1][3], s[2][3], s[3][3] = s[3][3], s[0][3], s[1][3], s[2][3]


def inv_shift_rows(s):
    old = [col[:] for col in s]
    for c in range(4):
        s[c] = [old[(c - r) % 4][r] for r in range(4)]
    return s


# learned from http://cs.ucsb.edu/~koc/cs178/projects/JT/aes.c
xtime = lambda a: (((a << 1) ^ 0x1B) & 0xFF) if (a & 0x80) else (a << 1)


def mix_single_column(a):
    # see Sec 4.1.2 in The Design of Rijndael
    t = a[0] ^ a[1] ^ a[2] ^ a[3]
    u = a[0]
    a[0] ^= t ^ xtime(a[0] ^ a[1])
    a[1] ^= t ^ xtime(a[1] ^ a[2])
    a[2] ^= t ^ xtime(a[2] ^ a[3])
    a[3] ^= t ^ xtime(a[3] ^ u)


def mix_columns(s):
    for i in range(4):
        mix_single_column(s[i])


def inv_mix_columns(s):
    # see Sec 4.1.3 in The Design of Rijndael
    for i in range(4):
        u = xtime(xtime(s[i][0] ^ s[i][2]))
        v = xtime(xtime(s[i][1] ^ s[i][3]))
        s[i][0] ^= u
        s[i][1] ^= v
        s[i][2] ^= u
        s[i][3] ^= v

    mix_columns(s)
    return s


def matrix2bytes(matrix):
    return bytes(sum(matrix, []))


state = [
    [108, 106, 71, 86],
    [96, 62, 38, 72],
    [42, 184, 92, 209],
    [94, 79, 8, 54],
]

s2 = inv_mix_columns(state)
s3 = inv_shift_rows(s2)
print(matrix2bytes(s3))
```
{: file="diffusion.py" }

`inv_mix_columns`와 `inv_shift_rows`는 둘 다 `return s`로 자기 자신을 돌려주기 때문에 `inv_shift_rows(inv_mix_columns(s))`처럼 중첩해서 쓸 수도 있다. 다만 둘 다 `s`를 제자리에서(in-place) 바꾸고 그 결과를 돌려주는 함수라, `return` 없이 중첩하면 안쪽 함수가 `None`을 반환해 바깥 함수가 `TypeError`를 낸다. `return s`를 빼먹지 않거나, 아니면 그냥 줄을 나눠 순서대로 호출하면 된다.

**Flag**: `crypto{d1ffUs3R}`

## 정리

### 핵심 요약
1. AES는 키드 퍼뮤테이션이며, 복호화가 가능하려면 입출력이 전단사(bijection)여야 한다.
2. 128비트 키 공간은 현재까지 알려진 최선의 단일 키 공격(비클리크 암호분석)으로도 사실상 전수조사 수준의 안전성을 유지한다.
3. S-box는 $$GF(2^8)$$의 역원과 아핀 변환으로 만든 비선형 치환표이며, 상태 행렬의 위치가 아니라 바이트 "값"을 행/열로 쪼개 찾는다.
4. `ShiftRows`는 행을 고정하고 열끼리 순환시키는 연산이라, 역변환은 다른 열의 값을 끌어오는 구조로 짜야 한다. 같은 열 안에서만 값을 재배치하는 방식으로는 구현할 수 없다.

### 배운 점
- `bytes(obj)`는 리스트가 아니라 정수나 문자열을 넘기면 다른 의미로 동작한다. 바이트 단위로 값을 읽고 쓰려면 `bytearray`를 쓴다.
- 표를 눈으로 셀 때는 한 칸씩 밀려 읽기 쉽다. 헷갈리면 코드로 직접 인덱싱해 검증하는 편이 빠르다.
- 함수가 `return` 없이 제자리에서만 값을 바꾸는 스타일이면, 그 함수들을 중첩해서 호출할 수 없다. 줄을 나눠 순서대로 호출하거나 `return s`를 꼭 넣어야 한다.
- 갈루아 체를 사용한다는데 현대대수 진도를 좀 빠르게빠르게 나가야할것 같다. 정수론도 해야하는데 :(

---

## 참고 자료
- [CryptoHack - Symmetric Cryptography](https://cryptohack.org/challenges/aes/)
- [ YouTube: AES Rijndael Cipher explained as a Flash animation](https://www.youtube.com/watch?v=gP4PqVGudtg)
