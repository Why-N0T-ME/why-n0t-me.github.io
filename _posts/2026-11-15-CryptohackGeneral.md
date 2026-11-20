---
title: "CryptoHack · Introduction & General"
description: "CryptoHack의 Introduction, General(인코딩·모듈러 연산·XOR·데이터 포맷) 카테고리 풀이를 정리한다"
date: 2026-11-15
categories: ['CTF/Wargame']
tags: [CryptoHack, Crypto]
math: true
---

## 문제 정보

| 항목 | 내용 |
|---|---|
| 플랫폼 | CryptoHack |
| 분류 | Introduction / General |
| 풀이일 | 2026-11-15~ |
| 핵심 기법 | 인코딩(ASCII, Hex, Base64, 정수↔바이트), 유클리드 호제법, 모듈러 연산, 페르마의 소정리, XOR, PEM/DER/SSH 키 포맷 |

> Elliptic Curves 카테고리는 별도 글([CryptoHack · Elliptic Curves]({% post_url 2026-11-06-CryptohackECC %}))로, 최상위 카테고리인 Mathematics도 별도 글([CryptoHack · Mathematics]({% post_url 2026-11-20-CryptohackMathematics %}))로 정리했다. 이 글은 Introduction과 General 두 카테고리만 묶는다.
>
> 주의: General 카테고리 안에도 "Mathematics"라는 이름의 소주제(5문제)가 있는데, 이는 최상위 카테고리인 Mathematics(16문제, 별도 글)와는 **별개**다. 이 글에서는 혼동을 피하려고 General 안의 소주제는 "모듈러 연산"으로 부른다.
{: .prompt-info }

## 문제 설명

- Introduction: CryptoHack 사용법 자체를 익히는 챕터. flag 제출 방식, 로컬 스크립트 실행, 소켓 접속까지 세 문제로 맛만 본다.
- General: 인코딩(Encoding), XOR, 모듈러 연산, 데이터 포맷(Data Formats) 네 소주제, 총 19문제로 이루어져 있다.

## 진행 현황

| 카테고리 | 소주제 | 진행도 |
|---|---|---|
| Introduction | - | 3/3 완료 |
| General | Encoding | 5/5 완료 |
| General | 모듈러 연산 | 5/5 완료 |
| General | XOR | 5/5 완료 |
| General | Data Formats | 4/4 완료 |

## 분석

### 1. Introduction

#### Finding Flags (2pt)

문제 설명 자체에 flag가 그대로 적혀 있다. 코드 없이 바로 제출하면 끝.

#### Great Snakes (3pt)

첨부된 `great_snakes.py`를 그대로 실행하면 flag가 출력된다.

```bash
python3 great_snakes.py
# Here is your flag:
# crypto{z3n_0f_pyth0n}
```
{: file="great_snakes.py 실행" }

**Flag**: `crypto{z3n_0f_pyth0n}`

#### Network Attacks (5pt)

`socket.cryptohack.org:11112`에 접속하면 서버가 "I only speak JSON"이라고 안내한다. `{"buy": "flag"}`를 JSON으로 보내면 flag를 돌려준다.

```python
from pwn import remote
import json

r = remote("socket.cryptohack.org", 11112)
r.recvline()  # 안내 메시지
r.sendline(json.dumps({"buy": "flag"}).encode())
print(r.recvline().decode())
# {"flag": "crypto{sh0pp1ng_f0r_fl4g5}"}
```
{: file="network_attacks.py" }

**Flag**: `crypto{sh0pp1ng_f0r_fl4g5}`

### 2. General — Encoding

#### ASCII (5pt)

정수 리스트로 주어진 각 값을 `chr()`로 문자 하나씩 변환하면 flag 문자열이 나온다. 각 정수는 해당 문자의 ASCII 코드 값이다.

```python
# prob. ASCII
nums = [99, 114, 121, 112, 116, 111, 123, 65, 83, 67, 73, 73, 95, 112, 114, 49, 110, 116, 52, 98, 108, 51, 125]
flag = "".join(chr(n) for n in nums)
print(f"crypto: {flag}")
# crypto: crypto{ASCII_pr1nt4bl3}
```
{: file="ascii.py" }

**Flag**: `crypto{ASCII_pr1nt4bl3}`

#### Hex (5pt)

16진수 문자열은 `bytes.fromhex()`로 바로 바이트로 바꿀 수 있고, 그 바이트가 그대로 flag의 아스키 문자열이다.

```python
# prob. Hex
# 16진수 2글자 = 1바이트
hx = "63727970746f7b596f755f77696c6c5f62655f776f726b696e675f776974685f6865785f737472696e67735f615f6c6f747d"
flag = bytes.fromhex(hx).decode()
print(f"crypto: {flag}")
# crypto: crypto{You_will_be_working_with_hex_strings_a_lot}
```
{: file="hex.py" }

**Flag**: `crypto{You_will_be_working_with_hex_strings_a_lot}`

#### Base64 (10pt)

16진수 문자열을 바이트로 바꾼 뒤 base64로 인코딩하면 그 결과 문자열 자체가 flag다. (앞 두 문제와 달리 디코딩이 아니라 인코딩이 flag라는 점이 다르다.)

```python
import base64
txt = "72bca9b68fc16ac7beeb8f849dca1d8a783e8acf9679bf9269f7bf"
base64.b64encode(bytes.fromhex(txt))
```
{: file="base64.py" }

```
crypto/Base+64+Encoding+is+Web+Safe/
```

표준 base64 알파벳에는 `+`와 `/`가 섞여 있어서, 결과 문자열이 `crypto{...}` 형태가 아니라 `crypto/.../` 모양으로 나온다. 이름 그대로 "Base64 is Web Safe?"에 대한 반례 — URL이나 파일명에 표준 base64를 그대로 쓰면 안 되는 이유를 보여주는 문제다.

**Flag**: `crypto/Base+64+Encoding+is+Web+Safe/`

#### Bytes and Big Integers (10pt)

거대한 정수 하나가 주어지는데, 이건 바이트 문자열을 큰 정수로 본 것(빅엔디안)이다. `long_to_bytes()`로 되돌리면 flag가 나온다.

```python
# prob. Bytes and Big Integers
from Crypto.Util.number import long_to_bytes

n = 11515195063862318899931685488813747395775516287289682636499965282714637259206269
flag = long_to_bytes(n).decode()
print(f"crypto: {flag}")
# crypto: crypto{3nc0d1n6_4ll_7h3_w4y_d0wn}
```
{: file="bytes_and_big_integers.py" }

**Flag**: `crypto{3nc0d1n6_4ll_7h3_w4y_d0wn}`

#### Encoding Challenge (40pt)

앞의 네 인코딩(+ROT13)을 자동화해서 `socket.cryptohack.org:13377`에 접속, 100라운드를 통과하면 flag를 주는 문제다. 서버가 보내는 JSON 한 줄은 `{"type": "<인코딩종류>", "encoded": <값>}` 형태이고, `type`은 `base64` / `hex` / `rot13` / `bigint` / `utf-8` 중 하나다. `{"decoded": "<복원한 문자열>"}`로 응답하면 다음 라운드로 넘어가고, 100라운드를 다 통과하면 응답에 `flag` 키가 들어온다.

```python
# prob. Encoding Challenge
# socket.cryptohack.org:13377 에 접속해서 100라운드 자동 응답
from pwn import remote
import json, base64, codecs
from Crypto.Util.number import long_to_bytes

def decode(t, enc):
    if t == "base64":
        return base64.b64decode(enc).decode()
    elif t == "hex":
        return bytes.fromhex(enc).decode()
    elif t == "rot13":
        return codecs.decode(enc, "rot_13")
    elif t == "bigint":
        return long_to_bytes(int(enc, 16)).decode()
    elif t == "utf-8":
        return "".join(chr(c) for c in enc)
    else:
        raise ValueError(f"알 수 없는 type: {t}")

r = remote("socket.cryptohack.org", 13377)

while True:
    received = json.loads(r.recvline())

    if "flag" in received:
        print(f"crypto: {received['flag']}")
        break

    decoded = decode(received["type"], received["encoded"])
    r.sendline(json.dumps({"decoded": decoded}).encode())
```
{: file="encoding_challenge.py" }

> 이 문제는 실행 환경(샌드박스)에서 직접 돌려보지 못했다 — `socket.cryptohack.org`로 나가는 소켓 연결 자체가 DNS 단계에서 막혀서(`gaierror: Name or service not known`), 임의의 외부 호스트로 직접 접속하는 게 구조적으로 안 된다. 위 스크립트를 참고해서 직접 돌려 100라운드를 통과했다.
>
> 주의할 점 하나: 100라운드를 다 통과하면 오는 마지막 메시지는 `{"flag": ...}`뿐이고 `type`/`encoded` 키가 없다. 루프에서 `response['type']`을 먼저 읽어버리면 바로 그 지점에서 `KeyError: 'type'`이 난다 — `type`을 읽기 전에 `flag` 키부터 확인하는 분기를 넣어야 한다.
{: .prompt-tip }

**Flag**: `crypto{3nc0d3_d3c0d3_3nc0d3}`

### 3. General — 모듈러 연산

CryptoHack General의 "Mathematics" 소주제 5문제다. 최근 공부한 현대대수학(군론) 내용 — 유한군의 위수(order), 라그랑주 정리, $U(n)$, 페르마의 소정리 — 을 여기에 그대로 적용해본다.

#### GCD (15pt)

$\gcd(66528, 52920)$을 유클리드 호제법으로 구한다.

```python
# GCD
def GCD(a, b):
    if(b == 0):
        return a
    return GCD(b, a % b)

print(f"crypto: {GCD(66528, 52920)}")
# crypto: 1512
```
{: file="gcd.py" }

**Flag**: `crypto{1512}`

#### Extended GCD (20pt)

$p \cdot u + q \cdot v = \gcd(p,q)$를 만족하는 $u,v$를 확장 유클리드 호제법으로 구한다. $p=26513$, $q=32321$이고, 둘 중 더 작은 값을 제출한다.

```python
# 확장 유클리드 호제법: ax+by = GCD(a,b)을 만족하는 x,y를 구하는것
def complexGCD(a, b):
    if b == 0:
        return a, 1, 0  # gcd, x, y   GCD(a,0)=a, ax+by=a -> x=1, y=0
    gcd, xi, yi = complexGCD(b, a % b)
    x = yi
    y = xi - (a // b) * yi
    return gcd, x, y

gcd, u, v = complexGCD(26513, 32321)
print(f"crypto: {min(u, v)}")
# crypto: -8404
```
{: file="extended_gcd.py" }

**Flag**: `crypto{-8404}`

#### Modular Arithmetic 1 (20pt)

$11 \bmod 6$과 $8146798528947 \bmod 17$을 계산하고, 둘 중 더 작은 값을 제출한다. $m \mid (a-b)$이면 $a=mk+b$ 꼴이므로 그냥 `%` 연산으로 끝난다.

```python
x = 11 % 6
y = 8146798528947 % 17
print(f"crypto: {min(x, y)}")
# crypto: 4
```
{: file="modular_arithmetic_1.py" }

**Flag**: `crypto{4}`

#### Modular Arithmetic 2 (20pt)

$p=17$에서 $3^{17}, 5^{17}, 7^{16} \bmod 17$을 계산해보고, 그 다음 $p=65537$에서 $273246787654^{65536} \bmod 65537$을 계산하는 문제다.

$p$가 소수이므로 $U(p)=\{1,2,\dots,p-1\}$은 곱셈에 대해 닫힌 군이고, 그 위수(원소 개수)는 $|U(p)|=p-1$이다. 라그랑주 정리에 의해 $U(p)$의 모든 원소 $g$의 위수(order)는 군 전체 위수 $p-1$을 나눈다 — 즉 $g$의 정확한 위수를 몰라도, $g^{p-1} \equiv 1 \pmod p$는 항상 성립한다. 이게 바로 페르마의 소정리다.

그래서 $p=17$일 때:
- $7^{16} \bmod 17$: 지수가 정확히 $p-1=16$이므로 페르마의 소정리 그대로 적용 → $7^{16}\equiv 1 \pmod{17}$.
- $3^{17} \bmod 17$: $3^{17}=3^{16}\cdot 3 \equiv 1\cdot 3=3 \pmod{17}$. 지수가 $p-1$보다 1 크면 밑($3$)이 그대로 남는다.
- $5^{17} \bmod 17$: 같은 이유로 $5^{17}\equiv 5 \pmod{17}$.

$p=65537$에서도 지수가 정확히 $p-1=65536$이므로, $\gcd(273246787654, 65537)=1$이기만 하면 — 밑이 구체적으로 무슨 값이든 — 결과는 항상 $1$이다. 65536번 거듭제곱을 직접 계산할 필요 없이 군의 위수만 보고 답이 나온다는 게 이 문제의 포인트다.

```python
# 페르마의 소정리에 의해 a^(p-1) mod p 꼴이므로 1과 합동이다
p1 = 17
print(f"3^17 mod 17 = {pow(3, 17, p1)}")   # 3
print(f"5^17 mod 17 = {pow(5, 17, p1)}")   # 5
print(f"7^16 mod 17 = {pow(7, 16, p1)}")   # 1

p2 = 65537
flag = pow(273246787654, 65536, p2)
print(f"crypto: {flag}")
# crypto: 1
```
{: file="modular_arithmetic_2.py" }

**Flag**: `crypto{1}`

#### Modular Inverting (25pt)

$3 \cdot d \equiv 1 \pmod{13}$을 만족하는 $d=3^{-1} \bmod 13$을 구한다.

이전에 연습해본 "역원의 존재성 판별" 로직을 다시 보면:

```python
# a의 mod m 역원 찾기
# 우선 역원이 존재하는지 판별한 후 계산
# gcd(a,m)=1 이면 존재
def existence(a, m):
    if GCD(a, m) == 1:
        return True
    else:
        return False
```

$\gcd(a,m)=1$이 역원 존재 조건인 이유는 군론으로 보면 더 명확하다 — $\gcd(a,m)=1$인 것과 $a$가 $U(m)=\{x \in \mathbb{Z}_m : \gcd(x,m)=1\}$의 원소(단위, unit)인 것은 같은 말이고, 군의 원소는 반드시 역원을 갖는다. $m=13$은 소수라 $a=3$이 $0$이 아니기만 하면 자동으로 $\gcd(3,13)=1$, 즉 $3 \in U(13)$이 보장된다.

역원을 직접 구하는 방법도 Modular Arithmetic 2에서 쓴 라그랑주 정리를 그대로 쓸 수 있다. $U(13)$의 위수는 $12$이므로 $3^{12}\equiv 1 \pmod{13}$이 성립하고(3의 정확한 위수가 12의 약수 중 무엇이든 상관없다), 양변에 $3^{-1}$을 곱하면:

$$ 3^{11} \equiv 3^{-1} \pmod{13} $$

즉 $d \equiv 3^{p-2} \pmod p$로 역원을 바로 계산할 수 있다 — 이게 문제에서 준 "페르마의 소정리를 활용하라"는 힌트의 의미다. 느린 확장 유클리드 대신 `pow(a, p-2, p)` 한 줄로 끝난다.

```python
# d = 3^(13-2) mod 13 = 3^11 mod 13
d = pow(3, 13 - 2, 13)
print(f"crypto: {d}")
print(f"검증 3*d mod 13 = {(3 * d) % 13}")
# crypto: 9
# 검증 3*d mod 13 = 1
```
{: file="modular_inverting.py" }

**Flag**: `crypto{9}`

### 4. General — XOR

#### XOR Starter (10pt)

문자열 `"label"`의 각 문자를 13과 XOR하면 flag 문자열이 나온다.

```python
given_str = "label"
flag = ""

for c in given_str:
    flag += chr(ord(c) ^ 13)

print("crypto{"+flag+"}")
```
{: file="xor_starter.py" }

**Flag**: `crypto{aloha}`

#### XOR Properties (15pt)

XOR는 결합법칙·교환법칙이 성립하고 자기 자신과 XOR하면 0이 된다는 성질($a \oplus a = 0$, $a \oplus 0 = a$)을 그대로 이용하는 문제다. 주어지는 값은 `KEY1`과, `KEY1 ⊕ KEY2`, `KEY2 ⊕ KEY3`, `KEY1 ⊕ KEY2 ⊕ KEY3 ⊕ FLAG`다. `KEY1`을 알고 있으니 순서대로 XOR해서 `KEY2`, `KEY3`를 복원하고, 마지막 값에 셋을 전부 다시 XOR하면 FLAG만 남는다.

```python
def xor_bytes(a, b):
    return bytes([x ^ y for x, y in zip(a, b)])

KEY1 = bytes.fromhex("a6c8b6733c9b22de7bc0253266a3867df55acde8635e19c73313")
KEY2 = xor_bytes(KEY1, bytes.fromhex("37dcb292030faa90d07eec17e3b1c6d8daf94c35d4c9191a5e1e"))
KEY3 = xor_bytes(KEY2, bytes.fromhex("c1545756687e7573db23aa1c3452a098b71a7fbf0fddddde5fc1"))

cipher_flag = bytes.fromhex("04ee9855208a2cd59091d04767ae47963170d1660df7f56f5faf")
FLAG = xor_bytes(xor_bytes(xor_bytes(KEY1, KEY3), KEY2), cipher_flag)

print(FLAG.decode())
```
{: file="xor_properties.py" }

**Flag**: `crypto{x0r_i5_ass0c1at1v3}`

#### Favourite byte (20pt)

단일 바이트 키로 XOR된 암호문이다. 키가 될 수 있는 값은 0~255뿐이라 전부 brute-force로 돌려서 사람이 읽을 수 있는 줄을 찾으면 된다. 0~19까지 돌려보니 키 `0x10`(=16)에서 flag가 나왔다 — flag 내용 자체가 "0x10이 내가 제일 좋아하는 바이트"라는 말장난이다.

```python
hex="73626960647f6b206821204f21254f7d694f7624662065622127234f726927756d"
data=bytes.fromhex(hex)
flag=""
for i in range(20):
  for j in range(len(data)):
    print(chr(data[j]^i),end="")
  print("===")
```
{: file="favourite_byte.py" }

```
...
crypto{0x10_15_my_f4v0ur173_by7e}===
...
```

**Flag**: `crypto{0x10_15_my_f4v0ur173_by7e}`

#### You either know, XOR you don't (30pt)

반복 키(repeating-key) XOR다. 모든 CryptoHack flag가 `crypto{`로 시작한다는 걸 알고 있으니, 암호문 앞 7바이트와 `b"crypto{"`를 XOR하면 키의 앞부분이 그대로 나온다(known-plaintext 공격). 나온 `myXORke`를 보고 키가 `myXORkey`(8바이트)라는 걸 추측해서, 키를 반복시켜 전체를 복호화한다.

```python
hex_str = "0e0b213f26041e480b26217f27342e175d0e070a3c5b103e2526217f27342e175d0e077e263451150104"
data = bytes.fromhex(hex_str)

flag_format = b"crypto{"
partial_key = bytes([d ^ f for d, f in zip(data[:7], flag_format)])
print("key:", partial_key)

key = b"myXORkey"
flag = bytes([d ^ key[i % len(key)] for i, d in enumerate(data)])
print(flag.decode())
```
{: file="xor_know_or_dont.py" }

**Flag**: `crypto{1f_y0u_Kn0w_En0uGH_y0u_Kn0w_1t_4ll}`

#### Lemur XOR (40pt)

flag가 숨겨진 이미지(`flag.png`)가 원본 레뮤르 사진(`lemur.png`)과 픽셀 단위로 XOR되어 있다. 같은 좌표의 RGB 값을 그대로 다시 XOR하면(XOR는 자기 역산이므로) 숨겨진 텍스트가 이미지 위에 그대로 드러난다.

```python
from PIL import Image

# 1. 이미지 열기 및 RGB 모드 변환 (PNG 투명도 에러 방지)
img = Image.open('lemur.png').convert('RGB')
img2 = Image.open('flag.png').convert('RGB')
# 2. RGB추출
for x in range(img.width):
  for y in range(img.height):
    r, g, b = img.getpixel((x, y))
    r2, g2, b2 = img2.getpixel((x, y))
    img.putpixel((x, y), (r ^ r2, g ^ g2, b ^ b2))
img.save("Done.png")
# (참고) 이미지 전체 크기 확인
if img.size == img2.size:
  print(img.size)
```
{: file="lemur_xor.py" }

결과 이미지(`Done.png`) 위에 flag 텍스트가 그대로 찍혀 나온다.

**Flag**: `crypto{X0Rly_n0t!}`

### 5. General — Data Formats

#### Privacy-Enhanced Mail? (25pt)

PEM 형식으로 인코딩된 RSA **개인키** 파일이 주어진다. `Crypto.PublicKey.RSA.importKey()`로 바로 파싱해서 개인키 지수 `d`를 읽으면 그 값 자체가 flag다.

```python
# Privacy-Enhanced
from Crypto.PublicKey import RSA
with open('/Privacy.pem', 'r', encoding='utf-8') as f:
    content = f.read()
key = RSA.importKey(content)
print(int(key.d))
```
{: file="privacy_enhanced_mail.py" }

**Flag**: `crypto{15682700288056331364787171045819973654991149949197959929860861228180021707316851924456205543665565810892674190059831330231436970914474774562714945620519144389785158908994181951348846017432506464163564960993784254153395406799101314760033445065193429592512349952020982932218524462341002102063435489318813316464511621736943938440710470694912336237680219746204595128959161800595216366237538296447335375818871952520026993102148328897083547184286493241191505953601668858941129790966909236941127851370202421135897091086763569884760099112291072056970636380417349019579768748054760104838790424708988260443926906673795975104689}`

#### CERTainly not (30pt)

이번엔 DER 형식의 X.509 인증서(`Cert.der`)다. 인증서 안에 들어있는 RSA **공개키**를 파싱해서 모듈러스 `n`을 구하면 된다. DER은 바이너리라 텍스트 에디터로는 못 보지만, 같은 `RSA.importKey()`가 DER도 그대로 읽어준다.

```python
#CERTainely not
from Crypto.PublicKey import RSA

# 1. read file .der
with open('/Cert.der', 'rb') as f:
    der_data = f.read()

key = RSA.importKey(der_data)

# 2. DER data -> get e, n
print("Modulus (n):", key.n)
print("Exponent (e):", key.e)

# 3. 반대로 DER 데이터를 PEM 텍스트로 변환하기
pem_data = key.exportKey(format='PEM')
print(pem_data.decode('utf-8'))
```
{: file="certainly_not.py" }

**Flag**: `crypto{22825373692019530804306212864609512775374171823993708516509897631547513634635856375624003737068034549047677999310941837454378829351398302382629658264078775456838626207507725494030600516872852306191255492926495965536379271875310457319107936020730050476235278671528265817571433919561175665096171189758406136453987966255236963782666066962654678464950075923060327358691356632908606498231755963567382339010985222623205586923466405809217426670333410014429905146941652293366212903733630083016398810887356019977409467374742266276267137547021576874204809506045914964491063393800499167416471949021995447722415959979785959569497}`

#### SSH Keys (35pt)

`authorized_keys`에 들어가는 SSH 공개키(`.pub`) 포맷이다. `ssh-rsa` 뒤의 base64 블록이 SSH wire format으로 인코딩된 n,e를 담고 있는데, `RSA.importKey()`가 이 포맷도 바로 처리해준다. 구하는 값은 역시 `n`.

```python
# SSH Keys
from Crypto.PublicKey import RSA

# 1. read file .pub
with open("/Bruce.pub", "r") as f:
    content = f.read()
print(content)

key = RSA.importKey(content)

# 2. DER data -> get e, n
print("Modulus (n):", key.n)
print("Exponent (e):", key.e)
```
{: file="ssh_keys.py" }

**Flag**: `crypto{3931406272922523448436194599820093016241472658151801552845094518579507815990600459669259603645261532927611152984942840889898756532060894857045175300145765800633499005451738872081381267004069865557395638550041114206143085403607234109293286336393552756893984605214352988705258638979454736514997314223669075900783806715398880310695945945147755132919037973889075191785977797861557228678159538882153544717797100401096435062359474129755625453831882490603560134477043235433202708948615234536984715872113343812760102812323180391544496030163653046931414723851374554873036582282389904838597668286543337426581680817796038711228401443244655162199302352017964997866677317161014083116730535875521286631858102768961098851209400973899393964931605067856005410998631842673030901078008408649613538143799959803685041566964514489809211962984534322348394428010908984318940411698961150731204316670646676976361958828528229837610795843145048243492909}`

#### Transparency (50pt)

파일을 열어보면 그냥 평범한 PEM 공개키라, 앞 세 문제처럼 `n`,`e`를 읽는 걸로는 flag가 안 나온다. 이 문제는 로컬 계산만으로 안 끝나고, 공개키의 DER 인코딩(SubjectPublicKeyInfo)에 대한 SHA-256 해시를 [crt.sh](https://crt.sh)(Certificate Transparency 로그 검색 서비스)에서 찾아, 같은 키를 쓰는 다른 인증서(서브도메인)를 추적해야 한다. `cryptohack.org`로 검색해보면 이 공개키를 쓴 인증서 중 `thetransparencyflagishere.cryptohack.org`라는 서브도메인이 있다 — 서브도메인 이름 자체가 flag다. 공개키를 재사용하면서 인증서의 CN/SAN에 쓸 이름까지는 숨기지 못한다는, Certificate Transparency 로그의 실전 정찰(recon) 기법을 그대로 보여주는 문제.

```python
# Transparency - 파일을 열어보니 공개 파일이었음. 헤더가 --begin certificate-- 라면 인증서에 관한 정보(ca,san)가 있지만 아니므로
# 인증기관의 공개정보를 웹에서 찾아보자. crt.sh에 도메인 네임을 집어넣으면 서브도메인, 인증서등에 관한 정보를 알려준다.
from Crypto.PublicKey import RSA

# 1. read file .pub
with open("/transparency.pem", "r") as f:
    content = f.read()
print(content)

key = RSA.importKey(content)

# 2. DER data -> get e, n
print("Modulus (n):", key.n)
print("Exponent (e):", key.e)
```
{: file="transparency.py" }

**Flag**: `crypto{the_transparency_flag_is_here}`

## 정리

Introduction 3문제로 flag 제출 방식과 소켓 통신 기본을 확인했고, General의 Encoding/모듈러 연산 소주제에서는 인코딩 변환 자체보다 "왜 되는지"에 집중했다 — 특히 모듈러 연산 두 문제는 최근 정리한 라그랑주 정리·$U(n)$ 개념을 그대로 적용해, 페르마의 소정리가 왜 성립하는지와 모듈러 역원을 빠르게 구하는 방법이 같은 뿌리(군의 위수)에서 나온다는 걸 확인했다. Encoding Challenge는 소켓 자동화라 이 환경에서 직접 돌리진 못했지만, 작성한 스크립트를 로컬에서 실행해 100라운드를 통과하고 flag까지 확인했다. XOR 소주제는 결합법칙·자기소거 성질을 이용한 키 복원(XOR Properties, You either know XOR you don't)부터 brute-force(Favourite byte), 이미지 XOR(Lemur XOR)까지 XOR 연산 하나로 얼마나 다양한 공격이 가능한지 보여준다.

General의 Data Formats에서는 PEM/DER/SSH 세 포맷 모두 결국 `RSA.importKey()` 하나로 파싱된다는 걸 확인했고, Transparency는 로컬 계산이 아니라 crt.sh에서 같은 공개키를 쓴 서브도메인을 찾는 것으로 마무리됐다 — 이로써 **General 카테고리 19/19 완료**.

최상위 카테고리인 Mathematics는 별도 글([CryptoHack · Mathematics]({% post_url 2026-11-20-CryptohackMathematics %}))로 정리한다. 그 다음은 계획대로 Symmetric Ciphers 묶음 글과 RSA·Diffie-Hellman·Elliptic Curves 묶음 글로 이어간다.

## 참고 자료

- [CryptoHack - Introduction](https://cryptohack.org/challenges/introduction/)
- [CryptoHack - General](https://cryptohack.org/challenges/general/)
