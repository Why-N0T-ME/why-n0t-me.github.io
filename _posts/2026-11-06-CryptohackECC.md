---
title: "CryptoHack · Elliptic Curves"
date: 2026-11-06
categories: ['CTF/Wargame']
tags: [CryptoHack, Crypto, ECC]
description: CryptoHack Elliptic Curves 카테고리 Starter 챕터 풀이 - 점 덧셈의 군 구조부터 스칼라 곱, ECDH까지 정리한다
math: true
---

## 문제 정보

| 항목 | 내용 |
|---|---|
| 플랫폼 | CryptoHack |
| 분류 | Crypto → Elliptic Curves → Starter |
| 난이도 | Easy (10~50pt) |
| 풀이일 | 2026-11-06~ |
| 핵심 기법 | 유한체 위의 점 덧셈, 군의 공리, 스칼라 곱, ECDH |

> [ECC, ECDSA 개념부터 실습까지]({% post_url 2026-11-06-ECC %})에서 정리한 개념을 직접 손으로 계산해보는 실습 챕터. 이론만 봤을 때는 당연해 보이는 점 덧셈·스칼라 곱 공식도 직접 좌표를 구현해보면 생각보다 걸리는 부분이 많다.
{: .prompt-info }

## 문제 설명

CryptoHack의 Elliptic Curves 카테고리 중 Starter 챕터이다. 챕터에 들어가기 전에 점 덧셈이 만족하는 군의 공리를 먼저 짚고, 이후 문제마다 유한체 위에서의 점 덧셈·역원·스칼라 곱·ECDH를 하나씩 구현하거나 계산해 `crypto{...}` 형태의 flag를 얻는다.

- 코스: Elliptic Curves → Starter
- 목표: 문제마다 요구하는 계산을 구현해 flag를 얻는다

## 진행 현황

| 문제 | 배점 | 상태 | 풀이일 |
|---|---|---|---|
| (챕터 개요) 아벨군 | - | 완료 | 2026-11-06 |
| Point Negation | 10 | 완료 | 2026-11-06 |
| Point Addition | 30 | 완료 | 2026-11-06 |
| Scalar Multiplication | 35 | 완료 | 2026-11-06 |
| Curves and Logs | 40 | 완료 | 2026-11-06 |
| Efficient Exchange | 50 | 완료 | 2026-11-07 |

Starter 챕터는 여기까지 완료. Parameter Choice, Parameter Choice 2를 거쳐 Signatures(ECDSA) 챕터까지 이어서 정리할 예정.

## 분석

### 1. 시작하며 — 아벨군(Abelian Group)

본 문제들에 들어가기 전에, Starter 챕터는 점 덧셈이 만족하는 네 가지 성질부터 짚고 넘어간다. 타원곡선 $E$ 위의 점 $P, Q, R$에 대해:

(a) $P+O=O+P=P$ (항등원의 존재)
(b) $P+(-P)=O$ (역원의 존재)
(c) $(P+Q)+R=P+(Q+R)$ (결합법칙)
(d) $P+Q=Q+P$ (교환법칙)

(a)~(c)만 만족해도 군(group)의 정의를 충족하는데, (d) 교환법칙까지 만족하는 군을 특별히 **아벨군(Abelian group)**이라 부른다 — [ECC 글]({% post_url 2026-11-06-ECC %})에서 "$E(\mathbb{F}_p)$는 유한 아벨군"이라고 쓴 바로 그 성질이다.

**Flag**: `crypto{abelian}`

### 2. Point Negation — 점의 역원

곡선 $E: y^2=x^3+497x+1768 \pmod{9739}$ 위의 점 $P=(8045,6936)$에 대해, $P+Q=O$를 만족하는 $Q=(x,y)$를 구하는 문제다.

$(E,+)$가 아벨군이므로 $Q=O-P=O+(-P)=-P$, 즉 $Q$는 그냥 $P$의 역원이다. [ECC 글]({% post_url 2026-11-06-ECC %})에서 본 기하학적 정의대로, $-P$는 $P$를 $x$축에 대해 대칭시킨 점 $(x_P,-y_P)$다. $-y_P$를 $\mathbb{F}_{9739}$의 대표값($0\sim9738$)으로 환원하면 $-6936 \equiv 9739-6936=2803 \pmod{9739}$이므로 $Q=(8045,2803)$.

```python
P = (8045, 6936)
Q = (P[0], (P[1] * (-1)) % 9739)
print(f"crypto: {Q}")
# crypto: (8045, 2803)
```
{: file="point_negation.py" }

출력된 좌표를 `crypto{x,y}` 형식에 맞춰 제출한다.

**Flag**: `crypto{8045,2803}`

### 3. Point Addition — 점 덧셈 공식 구현

[ECC 글]({% post_url 2026-11-06-ECC %})에서 본 현(chord)·접선(tangent) 규칙을 좌표 공식으로 그대로 옮기면 된다. $P=(x_1,y_1)$, $Q=(x_2,y_2)$에 대해:

- $P \neq Q$: $\lambda = \dfrac{y_2-y_1}{x_2-x_1} \bmod n$
- $P = Q$ (덧셈, doubling): $\lambda = \dfrac{3x_1^2+a}{2y_1} \bmod n$
- 어느 쪽이든: $x_3 = \lambda^2-x_1-x_2 \bmod n$, $\ y_3=\lambda(x_1-x_3)-y_1 \bmod n$

나눗셈은 $\bmod n$에서 역원을 곱하는 것과 같으므로 파이썬의 `pow(d, -1, n)`(확장 유클리드)로 바로 구한다. 무한원점 $O$는 이 곡선 위에 존재하지 않는 좌표인 $(0,0)$으로 표현해서, $P+O$나 $P+(-P)$ 같은 항등원 케이스를 따로 처리한다.

```python
def addition(P, Q, n):
    if P[0] == 0 and P[1] == 0:
        return Q
    elif Q[0] == 0 and Q[1] == 0:
        return P
    elif P[0] == Q[0] and P[1] == (-1) * Q[1] % n:
        return (0, 0)
    elif P[0] != Q[0]:
        lambda_ = (Q[1] - P[1]) * pow(Q[0] - P[0], -1, n) % n
        x_3 = (lambda_**2 - P[0] - Q[0]) % n
        y_3 = (lambda_ * (P[0] - x_3) - P[1]) % n
        return (x_3, y_3)
    elif P[0] == Q[0] and P[1] == Q[1]:
        lambda_ = (3 * (P[0]**2) + 497) * pow(2 * P[1], -1, n) % n
        x_3 = (lambda_**2 - 2 * P[0]) % n
        y_3 = (lambda_ * (P[0] - x_3) - P[1]) % n
        return (x_3, y_3)

# 검증: X=(5274,2841), Y=(8669,740)일 때 X+Y=(1024,4440), X+X=(7284,2107)
addition((5274, 2841), (8669, 740), 9739)
addition((5274, 2841), (5274, 2841), 9739)

P = (493, 5564)
Q = (1539, 4742)
R = (4403, 5202)
n = 9739
S = addition(addition(addition(P, P, n), Q, n), R, n)
print(f"crypto: {S[0], S[1] % n}")
# crypto: (4215, 2162)
```
{: file="point_addition.py" }

**Flag**: `crypto{4215,2162}`

### 4. Scalar Multiplication — 이중 덧셈(double-and-add)

$Q=[n]P$를 구하는 가장 단순한 방법은 $P$를 $n-1$번 더하는 것이지만, 실제 ECDSA에서 $n$은 256비트급 정수라 이 방식으로는 평생 걸려도 못 끝낸다. 대신 **이중 덧셈(double-and-add)** — 거듭제곱의 분할정복과 같은 구조 — 을 쓰면 덧셈 연산 $O(\log n)$번으로 끝낼 수 있다.

$n$을 이진수로 보고 최하위 비트부터 훑으면서, $Q$를 $P,2P,4P,\dots$로 계속 두 배씩 키워가고, 그 비트가 1일 때만 현재 $Q$를 결과 $R$에 더한다. $n$의 이진 표현 $\sum_i n_i 2^i$에 대해 $nP=\sum_i n_i (2^iP)$인 것과 같은 원리다. 항등원 $O$은 `None`으로 표현해서, $R$에 처음 더할 때만 예외 처리한다.

```python
def ScalarMultipi(P, n):
    Q = P
    R = None

    while n > 0:
        if n % 2 == 1:
            if R is None:
                R = Q
            else:
                R = addition(R, Q, 9739)

        Q = addition(Q, Q, 9739)
        n = n // 2
    return R


P = (2339, 2213)
Q = ScalarMultipi(P, 7863)
print(f"crypto: {Q}")
# crypto: (9467, 2742)
```
{: file="scalar_multiplication.py" }

**Flag**: `crypto{9467,2742}`

### 5. Curves and Logs — ECDH 키 유도

[ECC 글의 ECDH 절]({% post_url 2026-11-06-ECC %})에서 본 그대로다. 앨리스와 밥이 각자 비밀 정수 $n_A, n_B$를 갖고 $Q_A=[n_A]G$, $Q_B=[n_B]G$를 공개로 주고받으면, 스칼라 곱의 결합·교환법칙 덕분에

$$ S = [n_A]Q_B = [n_A][n_B]G = [n_B][n_A]G = [n_B]Q_A $$

가 성립해서 둘 다 같은 $S$를 공유 비밀로 얻는다. 이 문제에서는 $Q_A=(815,3190)$과 $n_B=1829$가 주어지므로, $S=[n_B]Q_A$만 계산하면 된다.

$S$는 곡선 위의 점이라 그대로 대칭키로 쓰기엔 구조가 있는 값이다. 그래서 $x$좌표를 문자열로 바꿔 SHA1으로 해시해 키를 유도한다 — 그리고 이 문제는 이 hexdigest **자체가 flag**다. 앞 문제들처럼 `crypto{x,y}` 형식으로 감싸지 않는다는 점이 다르다.

```python
import hashlib

Q_A = (815, 3190)
S = ScalarMultipi(Q_A, 1829)
x = S[0]
key = hashlib.sha1(str(x).encode()).hexdigest()
print(key)
# 80e5212754a824d3a4aed185ace4f9cac0f908bf
```
{: file="curves_and_logs.py" }

**Flag**: `80e5212754a824d3a4aed185ace4f9cac0f908bf`

### 6. Efficient Exchange — $x$좌표만으로 키 교환하기

지금까지는 점 전체 $(x,y)$를 주고받는다고 가정했지만, 사실 $x$좌표만 보내도 충분하다 — "Efficient"라는 이름이 여기서 나온다. 앨리스는 $x(Q_A)=4726$만 보냈고, $y(Q_A)$는 받는 쪽(밥)이 곡선 방정식으로 직접 복원해야 한다.

$y^2 \equiv x^3+497x+1768 \pmod{9739}$를 풀면 되는데, $p=9739 \equiv 3 \pmod 4$인 소수라서 모듈러 제곱근을 바로 공식으로 구할 수 있다(Tonelli–Shanks의 $p \equiv 3 \pmod 4$ 특수 케이스):

$$ y \equiv (y^2)^{\frac{p+1}{4}} \pmod p $$

이렇게 구한 $y_1$과 그 음수 $y_2=p-y_1$, 둘 다 같은 $x$에 대응하는 유효한 제곱근이라 $Q_A=(x,y_1)$인지 $(x,y_2)$인지는 이 정보만으로 알 수 없다. 그런데 **어느 쪽을 골라도 상관없다**: $[n_B](-Q_A)=-[n_B]Q_A$이고, 한 점과 그 역원은 $x$좌표가 같기 때문에 공유 비밀 $S=[n_B]Q_A$의 $x$좌표는 $y_1,y_2$ 중 뭘 골랐든 똑같이 나온다. 실제로 둘 다 계산해보면:

```
S (y1 선택) = (1791, 2181)
S (y2 선택) = (1791, 7558)
```

$x$좌표(1791)가 정확히 일치한다. 키 유도에는 $x$좌표만 쓰이므로, 부호를 몰라도 같은 키가 나온다 — 이 덕분에 앨리스가 $y$를 안 보내도 되는 것이다.

이렇게 구한 $x$좌표로 SHA1 키를 유도해 AES-CBC로 암호화된 flag를 복호화한다.

```python
from Crypto.Cipher import AES
import hashlib

p = 9739
x_A = 4726
n_B = 6534

y_sq = (pow(x_A, 3) + 497 * x_A + 1768) % p
y_1 = pow(y_sq, (p + 1) // 4, p)  # p % 4 == 3이므로 바로 구해짐

Q_A = (x_A, y_1)
secret_point = ScalarMultipi(Q_A, n_B)
shared_secret = secret_point[0]

iv = "cd9da9f1c60925922377ea952afc212c"
ciphertext = "febcbe3a3414a730b125931dccf912d2239f3e969c4334d95ed0ec86f6449ad8"

sha1 = hashlib.sha1()
sha1.update(str(shared_secret).encode('ascii'))
key = sha1.digest()[:16]

cipher = AES.new(key, AES.MODE_CBC, bytes.fromhex(iv))
plaintext = cipher.decrypt(bytes.fromhex(ciphertext))
print(plaintext)
# b'crypto{3ff1c1ent_k3y_3xch4ng3}\x02\x02'  (끝의 \x02\x02는 PKCS7 패딩)
```
{: file="efficient_exchange.py" }

**Flag**: `crypto{3ff1c1ent_k3y_3xch4ng3}`

## 정리

Starter 챕터 6문제를 통해 점 덧셈 공식 구현 → 이중 덧셈으로 효율적인 스칼라 곱 → ECDH로 공유 비밀 생성 → 그 비밀을 대칭키로 유도해 실제 메시지 복호화까지, [ECC 글]({% post_url 2026-11-06-ECC %})에서 개념으로만 봤던 내용을 전부 코드로 직접 확인했다. 특히 Efficient Exchange에서 "점과 그 역원은 $x$좌표가 같다"는 사실이 대역폭을 절반으로 줄이는 실질적인 트릭으로 쓰이는 걸 보고, 기하학적 정의가 왜 저런 모양인지 한 번 더 와닿았다.

다음은 Parameter Choice, Parameter Choice 2를 거쳐 Signatures(ECDSA) 챕터로 이어간다.

## 참고 자료
- [CryptoHack - Elliptic Curves](https://cryptohack.org/challenges/ecc/)
