---
title: "[Dreamhack] double-DES 풀이"
date: 2026-10-01
categories: [Wargame]
tags: [Dreamhack, Crypto, DES, Meet-in-the-Middle]
description: double-DES 풀이 - 이중 DES 키 탐색을 Meet-in-the-Middle로 줄여 flag를 얻는다
math: true
image:
    path: /assets/img/posts/Crypto/Challenges/double-des/logo.png
    alt: thumbnail
---

## 문제 정보

| 항목 | 내용 |
|---|---|
| 플랫폼 | Dreamhack |
| 분류 | Crypto |
| 난이도 | Level 1 |
| 풀이일 | 2026-10-01 |
| 핵심 기법 | Meet-in-the-Middle Attack |

> 한 줄 요약: DES를 두 번 적용해도 키 공간이 제곱이 되지 않는다는 점을 이용해, 15초 안에 두 키를 복구하는 문제이다.
{: .prompt-info }

## 문제 설명
문제는 랜덤한 4바이트를 포함한 키를 만들고, 이를 두 개의 DES 키로 나눠 평문을 두 번 암호화한다. 알려진 평문과 그 암호문(힌트)을 이용해 두 키를 찾고, 목표 평문을 암호화해 제출하면 flag를 얻을 수 있다.

- 제공 파일: `prob.py`
- 목표: 복호화한 값이 `give_me_the_flag`가 되는 메시지(hex)를 서버에 제출하여 flag 획득

## 분석

### 코드 분석

```python
#!/usr/bin/env python3
from Crypto.Cipher import DES
import signal
import os

if __name__ == "__main__":
    signal.alarm(15)

    with open("flag", "rb") as f:
        flag = f.read()
    
    key = b'Dream_' + os.urandom(4) + b'Hacker'
    key1 = key[:8]
    key2 = key[8:]
    print("4-byte Brute-forcing is easy. But can you do it in 15 seconds?")
    cipher1 = DES.new(key1, DES.MODE_ECB)
    cipher2 = DES.new(key2, DES.MODE_ECB)
    encrypt = lambda x: cipher2.encrypt(cipher1.encrypt(x))
    decrypt = lambda x: cipher1.decrypt(cipher2.decrypt(x))

    print(f"Hint for you :> {encrypt(b'DreamHack_blocks').hex()}")

    msg = bytes.fromhex(input("Send your encrypted message(hex) > "))
    if decrypt(msg) == b'give_me_the_flag':
        print(flag)
    else:
        print("Nope!")
```
{: file="prob.py"}

`prob.py`의 동작은 다음과 같다.

1. `key = "Dream_XXXXHacker"` (XXXX는 랜덤 4바이트)
2. `key1 = "Dream_XX"`, `key2 = "XXHacker"`
3. `encrypt` := `E2(E1(x))`, `decrypt` := `D1(D2(x))` (En, Dn은 key_n으로 DES 암호화, 복호화하는 함수)
4. 입력값 `msg`를 복호화한 값이 `give_me_the_flag`와 같으면 flag를 출력

#### 키 구조
`Dream_`은 6바이트, 랜덤 부분은 4바이트, `Hacker`는 6바이트라 전체 `key`는 16바이트이다. 이를 8바이트씩 나누므로 다음과 같다.

```text
key1 = b'Dream_' + 랜덤 부분의 앞 2바이트
key2 = 랜덤 부분의 뒤 2바이트 + b'Hacker'
```

각 `#`를 랜덤 바이트 하나로 표시하면 `key1 = Dream_##`, `key2 = ##Hacker`이다. 두 키의 미지 부분은 서로 다른 2바이트 조각이다.

### 암호화와 복호화 순서
코드의 암호화는 `key1`을 먼저 적용하고 그 결과를 `key2`로 암호화한다.

$$
E_2(E_1(x))
$$

복호화는 역순으로 적용한다.

$$
D_1(D_2(x))
$$

복호화 결과가 `b'give_me_the_flag'`와 같으면 flag를 출력한다.

### 알려진 평문 힌트
문제는 알려진 평문 `P = b'DreamHack_blocks'`를 두 키로 암호화한 결과 `hint`를 제공한다.

$$
B = E_2(E_1(P))
$$

여기서 `B`는 힌트 암호문이다. 올바른 키라면 양변에 먼저 `D_2`를 적용해 다음 관계를 얻을 수 있다.

$$
D_2(B) = E_1(P)
$$

이 식의 양쪽을 각각 계산해 일치하는 중간값을 찾는 것이 풀이의 핵심이다.

#### 취약점
- **취약점 종류**: 이중 암호화(Double DES)에 대한 Meet-in-the-Middle 공격이 가능하다.
- **원인**: 키의 대부분이 고정 문자열(`Dream_`, `Hacker`)이고 미지수는 랜덤 4바이트뿐이다. 이 4바이트가 `key1`과 `key2`에 2바이트씩 나뉘어 들어가므로 각 키가 서로 독립적으로 $$2^{16}$$가지만 가진다. 두 키를 독립적으로 구할 수 있어 중간값을 기준으로 탐색을 나눌 수 있다.
- **영향**: 알려진 평문과 힌트만으로 두 키를 모두 복구할 수 있고, 목표 평문을 직접 암호화해 flag를 얻는다.

### 단순 전수조사
key1과 key2의 미지 부분은 4바이트(각 2바이트)이므로 전수조사로 이를 찾아내려면 $$2^{32}$$번 연산이 필요하다. 실제로 해보면 시간이 매우 오래 걸리는 것을 확인할 수 있다.

```python
from pwn import *
from Crypto.Cipher import DES
from tqdm import trange

io = remote("host3.dreamhack.games", 17404)

io.recvuntil(b":> ")
hint = bytes.fromhex(io.recvline().decode())

for i in trange(2**32):
    key = b'Dream_' + i.to_bytes(4, "big") + b'Hacker'
    key1 = key[:8]
    key2 = key[8:]
    cipher1 = DES.new(key1, DES.MODE_ECB)
    cipher2 = DES.new(key2, DES.MODE_ECB)
    if cipher2.encrypt(cipher1.encrypt(b'DreamHack_blocks')) == hint:
        print("Success")
        break
```
{: file="dumbway.py"}

![img](/assets/img/posts/Crypto/Challenges/double-des/dumbway.png)

> 15초 제한 안에 $$2^{32}$$번의 DES 연산을 하는 것은 불가능하다. 두 키를 한꺼번에 대입하지 않고 나누어 탐색하는 다른 접근이 필요하다.
{: .prompt-warning }

## 공격 시나리오

1. 모든 `key1` 후보로 알려진 평문을 암호화해 중간값 `E1(P)`를 저장한다.
2. 모든 `key2` 후보로 `hint`를 한 겹 복호화한 값 `D2(B)`가 저장된 중간값과 일치하는지 확인한다.
3. 일치하면 두 키를 찾은 것이므로, `give_me_the_flag`를 두 키로 암호화해 서버에 제출한다.

## 익스플로잇

### 핵심 아이디어

#### 후보가 키마다 2^16개인 이유
각 키에서 모르는 부분은 2바이트이다. 바이트 하나는 256가지 값 중 하나이므로 2바이트 후보 수는 다음과 같다.

$$
256 \times 256 = 256^2 = 2^{16} = 65{,}536
$$

다음 코드가 0부터 65,535까지의 정수를 2바이트로 바꿔 모든 후보를 생성한다.

```python
b = i.to_bytes(2, "big")
```

`"big"`은 바이트 순서를 빅엔디안으로 정한다. 후보 수 자체에는 영향을 주지 않는다.

#### Meet-in-the-Middle 공격
두 키를 모두 무작정 조합하면 후보 쌍은 $$2^{16} \times 2^{16} = 2^{32}$$개이다. 이를 전부 확인하는 대신, 중간 암호화 결과를 기준으로 양쪽 탐색을 나눈다.

**1. 모든 `key1` 후보로 중간값 저장**

```python
conflict = {}

for i in range(65536):
    b = i.to_bytes(2, "big")
    key1_candidate = b"Dream_" + b
    cipher = DES.new(key1_candidate, DES.MODE_ECB)
    middle = cipher.encrypt(b"DreamHack_blocks")
    conflict[middle] = key1_candidate
```

각 후보 `key1`로 알려진 평문을 암호화하고, `E_1(P) → key1 후보` 형태로 사전에 저장한다.

**2. 모든 `key2` 후보로 힌트를 한 겹 복호화**

```python
for i in range(65536):
    b = i.to_bytes(2, "big")
    key2_candidate = b + b"Hacker"
    cipher = DES.new(key2_candidate, DES.MODE_ECB)
    middle = cipher.decrypt(hint)

    if middle in conflict:
        key1 = conflict[middle]
        key2 = key2_candidate
        break
```

올바른 `key2` 후보라면 `D_2(B)`가 사전에 저장된 `E_1(P)`와 일치한다. 이때 두 키 후보를 찾은 것이다.

따라서 비교하는 것은 `key1`과 `key2`의 일부 바이트가 서로 같은지 여부가 아니다. 비교 대상은 다음 두 중간값이다.

$$
E_1(P) \stackrel{?}{=} D_2(B)
$$

#### 계산량

| 방법 | 연산량 |
|---|---|
| 단순 전수조사 | $$2^{32}$$개의 키 쌍 |
| Meet-in-the-Middle | 앞쪽 후보 $$2^{16}$$개 계산 + 뒤쪽 후보 $$2^{16}$$개 조회 |

대략 $$2^{16} + 2^{16}$$번의 암호 계산으로 줄어드는 대신, 앞쪽 중간값을 저장할 메모리가 필요하다.

#### 목표 평문을 암호화해 제출하기
키를 찾은 뒤 목표 평문 `b'give_me_the_flag'`를 같은 순서로 암호화한다.

```python
cipher1 = DES.new(key1, DES.MODE_ECB)
cipher2 = DES.new(key2, DES.MODE_ECB)

encrypt = lambda x: cipher2.encrypt(cipher1.encrypt(x))
request = encrypt(b"give_me_the_flag")
```

즉 서버에 제출할 값은 다음과 같다.

$$
E_2(E_1(\texttt{give\_me\_the\_flag}))
$$

서버가 이를 `D_1(D_2(...))` 순서로 복호화하면 목표 평문을 얻어 flag를 출력한다.

### 익스플로잇 코드

```python
from pwn import *
from Crypto.Cipher import DES

#io = process(["python3", "prob.py"])
io = remote("host3.dreamhack.games", 17404)

io.recvuntil(b":> ")
hint = bytes.fromhex(io.recvline().decode())

conflict = dict()

for i in range(65536):
    b = i.to_bytes(2, "big")
    cipher = DES.new(b"Dream_" + b, DES.MODE_ECB)
    enc = cipher.encrypt(b"DreamHack_blocks")
    conflict[enc] = b"Dream_" + b

for i in range(65536):
    b = i.to_bytes(2, "big")
    cipher = DES.new(b + b"Hacker", DES.MODE_ECB)
    dec = cipher.decrypt(hint)

    if dec in conflict:
        key1 = conflict[dec]
        key2 = b + b"Hacker"
        break

cipher1 = DES.new(key1, DES.MODE_ECB)
cipher2 = DES.new(key2, DES.MODE_ECB)
encrypt = lambda x: cipher2.encrypt(cipher1.encrypt(x))
assert encrypt(b"DreamHack_blocks") == hint

io.sendlineafter(b'> ', encrypt(b"give_me_the_flag").hex().encode())

flag = eval(io.recvline())
io.close()

print(flag.decode())
```
{: file="solve.py"}

### 실행 결과

![img](/assets/img/posts/Crypto/Challenges/double-des/flag.png)

## 정리

### 핵심 요약
1. 전체 16바이트 재료를 8바이트씩 나눠 두 DES 키를 만든다.
2. 각 키의 미지 부분은 2바이트라 후보가 각각 $$2^{16}$$개다.
3. 힌트는 $$B = E_2(E_1(P))$$ 형태다.
4. 올바른 키에서는 $$E_1(P) = D_2(B)$$가 성립한다.
5. 중간값을 기준으로 양쪽 후보를 대조하는 방법이 Meet-in-the-Middle이다.
6. 키를 찾으면 `give_me_the_flag`를 두 키로 암호화해 제출한다.

### 배운 점
- 이 문제에서 핵심은 DES 자체를 깨는 것이 아니라, Double DES 키 탐색을 Meet-in-the-Middle로 줄이는 것이다.
- `to_bytes(2, "big")`의 `2`는 바이트 수이며, 가능한 입력은 $$256^2$$개이다.
- DES는 오래된 암호이므로 이 풀이는 교육용 문제에서만 다루고, 실제 시스템에는 사용하지 않는다.
- 암호화를 두 번 적용해도 키 공간이 제곱으로 늘어나지 않는다. 두 키를 독립적으로 공격할 수 있으면 연산량이 $$2^{2n}$$이 아니라 약 $$2^{n+1}$$로 줄어든다.
- 실제 DES(키 56비트)도 Double DES를 쓰면 $$2^{112}$$이 아니라 약 $$2^{57}$$ 수준의 안전성밖에 얻지 못한다. 이 때문에 Triple DES가 쓰였고, 현재는 AES가 표준이다.
- 단순 전수조사가 불가능해 보여도 문제 구조를 둘로 쪼갤 수 있으면 시간-메모리 트레이드오프로 풀 수 있다. 이 풀이는 $$2^{16}$$개 항목의 딕셔너리 메모리를 쓰는 대신 시간을 줄였다.

### 방어 방법
- DES 대신 AES 같은 현대 표준 암호를 사용한다.
- 키는 고정 문자열을 섞지 않고 전체를 충분한 길이의 난수로 생성한다. 이 문제는 키의 대부분이 고정값이라 32비트짜리 키 공간밖에 없었다.
- 두 번 암호화하는 방식으로 안전성을 높이려 하지 않는다. 안전성은 키 길이와 알고리즘 자체로 확보해야 한다.

---

## 참고 자료
- [Dreamhack - Double DES](https://dreamhack.io/wargame/challenges/1118)
- [Meet-in-the-Middle Attack (Cryptography for the Everyday Developer)](https://sookocheff.com/post/cryptography/cryptography-for-the-everyday-developer/meet-in-the-middle-attack/)