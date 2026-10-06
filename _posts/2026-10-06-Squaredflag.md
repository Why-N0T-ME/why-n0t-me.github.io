---
title: "[Dreamhack] Squared Flag 풀이"
date: 2026-10-06
categories: [Wargame]
tags: [Dreamhack, SageMath, Linear-Equation]
description: Squared Flag 풀이 - M · flag = result 꼴의 선형방정식을 SageMath의 solve_right()로 풀어 flag를 구한다
math: true
image:
    path: /assets/img/posts/Crypto/Challenges/squared-flag/thumbnail.png
    alt: thumbnail
---

## 문제 정보

| 항목 | 내용 |
|---|---|
| 플랫폼 | Dreamhack |
| 분류 | TODO |
| 난이도 | TODO |
| 풀이일 | 2026-10-06 |
| 핵심 기법 | 선형방정식 풀이 (SageMath `solve_right()`) |

> 한 줄 요약: `M * flag = result`에서 flag를 알아내는 문제이다.
{: .prompt-info }

## 문제 설명
행렬 `M`과 `flag`를 곱한 결과 `result`가 주어지고, 이로부터 `flag`를 알아내는 문제이다. flag는 `DH{}` 형식이다.

- 제공 파일: `M.py`(행렬 `M`)
- 목표: `result`와 `M`으로부터 `flag` 복구

![img](/assets/img/posts/Crypto/Challenges/squared-flag/M.png)
_M.py의 일부_

## 분석

### 코드 분석

```python
from M import M

flag = open("flag.txt", "r").read().encode()

n = 64
assert len(flag) == n and flag[:3] == b"DH{" and flag[-1:] == b"}"
mod = 0x10001 # mod 65537 위에서의 연산

result = []

assert len(M) == n	#행렬 M의 행이 n개이면
for v in M:
	assert len(v) == n

for i in range(n):
	dot = 0
	for j in range(n):
		dot += M[i][j] * flag[j] #행렬 M과 flag 벡터를 내적(점곱)
	result.append(dot % mod)	#결과에 내적을 65537로 나눈 나머지를 append

print(result)
# [46815, 54436, 41979, 52634, 9427, 38200, 30164, 30742, 37278, 27003, 60542, 47536, 61611, 9732, 18365, 23026, 41731, 25299, 3968, 11754, 5594, 13472, 47963, 62980, 14030, 45400, 27929, 22796, 6570, 1164, 9962, 23574, 19373, 17887, 58878, 20221, 52376, 54543, 36488, 25377, 56175, 20339, 35820, 26224, 7980, 43220, 8400, 51986, 54412, 3511, 43757, 22202, 19450, 39390, 19659, 27620, 47137, 36933, 11093, 6044, 4901, 2205, 13024, 12396]
```
{: file="prob.py" }

코드의 동작은 다음과 같다.

1. `flag`는 64바이트이며 `DH{`로 시작하고 `}`로 끝난다.
2. `M`은 64개의 행을 가지고, 각 행의 길이도 64이다.
3. `M`의 각 행과 `flag` 벡터를 내적한 값을 65537로 나눈 나머지가 `result`의 각 원소가 된다.

즉 `result`와 `M`, `flag`는 다음 관계이다.

$$
result = M \cdot f \pmod{65537}
$$

> `solve_right()`로 구한 해를 보면 마지막 4개의 값이 0이다. 문제에서 flag가 `DH{}` 형식이라고 했으므로, 이 정보를 식에 추가해서 해를 구한다.
{: .prompt-tip }

## 풀이 시나리오

1. `M * flag = result`를 선형방정식 $$ax + by = c$$ 꼴로 본다. ($$a = M$$, $$x = flag$$, $$b$$와 $$y$$는 0, $$c = result$$)
2. SageMath의 `solve_right()`로 해를 구한다.
3. 해의 마지막 4개가 0이므로, `DH{}` 형식 정보를 방정식으로 추가해 다시 해를 구한다.

## 익스플로잇

### 핵심 아이디어
`result = M · f (mod 65537)`에서 `f`(flag)를 구하는 문제이다. 기약행사다리꼴로 변환하면 바로 구할 수 있고, 이를 SageMath의 `solve_right()`로 수행한다.

TODO: 마지막 4개가 0으로 나오는 이유

#### 형식 정보 추가
flag는 `DH{}` 형식이므로 위치 0, 1, 2, 63의 값이 각각 `D`, `H`, `{`, `}`이다. 해당 위치만 1인 행 벡터를 `M`에 추가하고, `result`에는 그 위치의 문자를 추가한다.

```python
for idx, c in zip([0, 1, 2, 63], b"DH{}"):
    v = [0] * 64
    v[idx] = 1

    M.append(v)
    r.append(c)
```

### 익스플로잇 코드

```python
from M import M
from sage.all import *

r=[46815, 54436, 41979, 52634, 9427, 38200, 30164, 30742, 37278, 27003, 60542, 47536, 61611, 9732, 18365, 23026, 41731, 25299, 3968, 11754, 5594, 13472, 47963, 62980, 14030, 45400, 27929, 22796, 6570, 1164, 9962, 23574, 19373, 17887, 58878, 20221, 52376, 54543, 36488, 25377, 56175, 20339, 35820, 26224, 7980, 43220, 8400, 51986, 54412, 3511, 43757, 22202, 19450, 39390, 19659, 27620, 47137, 36933, 11093, 6044, 4901, 2205, 13024, 12396]

for idx, c in zip([0, 1, 2, 63], b"DH{}"):
    v = [0] * 64
    v[idx] = 1

    M.append(v)
    r.append(c)


M=Matrix(GF(0x10001), M)
r= vector(GF(0x10001), r)


v=M.solve_right(r)
v=bytes(v).decode()
print(v)
```
{: file="main.py" }

### 실행 결과
![flag](/assets/img/posts/Crypto/Challenges/squared-flag/flag.png)

## 정리

### 핵심 요약
1. `result = M · flag (mod 65537)`이므로 `flag`는 선형방정식의 해이다.
2. `solve_right()`로 해를 구하면 마지막 4개가 0으로 나온다.
3. `DH{}` 형식 정보를 방정식으로 추가해 해를 구한다.

### 배운 점
- SageMath에서 연립선형방정식의 해(합동 포함)를 구하는것을 익혔다

---

## 참고 자료
- https://dreamhack.io/wargame/challenges/1119