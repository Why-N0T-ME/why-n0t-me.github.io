---
title: "Abstract-algebra-Notes/01"
date: 2026-10-29
categories: ['misc']
tags: [Math, Abstract-Algebra]
description: 현대대수학 정리하면서 정리한거 올리는 글
math: true          
---

# Introduction to Abstract Algebra (Math 113) - Alexander Paulin

these notes are revisions of the notes I took while studied Introduction to Abstract Algebra by myself with youtube videos learnifyable - Abstract Algebra, 현대대수학1 강의 by 이상준 경희대 교수 and etc. the visuals are drawn by me or was made by claude to represent what i'm trying to tell and what the book is saying. there might be some errors probably a lot, that's almmost certainely mine.(A.I. is used to only help my understanding and creating images) so, if any of readers find errors in my notes, contact me via my email.

# 1. Introduction - what i coverd and my words left to readers
when i heard Abstract Algebra first, i thought it's something horrible to do with x,y,z. the book told me that `"Algebra is teh abstract encapsulation of intuition for composition. By composition, it means the concept of two object coming together to form a new one."` I honestly had no idea waht it means. but, I'm starting to understand as i take the courses. To say, composition means any structure that create oen output with two inputs like binary operations.

## 2. what is algebra? 
Algebra is the abstract encapsulation of our intuition for composition. as described above. Abstract Algebra literally means abstract things. like, groups, rings, fields and many propositions related to them. Followings summarize the basic mathematical education:

- \mathbb{N} := {1,2,3,...}, the natural numbers. \mathbb{N} comes with two natural operations + and x.

- \mathbb{Z}:= {...,-2,-1,0,1,2,...}, the integers. you can think of \mathbb{N} as sitting one line.
![represnting Z](/assets/img/posts/misc/AbstractAlgebra/note01/n-to-z-numberline.png)
> additive inverse exists on set of \mathbb{Z}
{: .prompt-tip }

- \mathbb{Q} := {a/b | a,b \in \mathbb{Z}, b \not 0}, the rational numbers. we form these by taking \mathbb{Z} and formally dividing through by non-negative integers. it has multiplicative inverses.

and it continues by going to form \mathbb{R}, the real numbers and \mathbb{C}, the Complex numbers. each stage the operations of + and x gain additional properties. we will spend years to understand how + and x behave in several sets.

For example,
a + b = b + a for all a,b \in \mathbb{Q},
or
a x (b+c) = a x b + a x c for all a,b,c \in \mathbb{Q}.

Key idea is `to define a larger class of objects`.

- (Z, +) -> Gruops
- (Z, +, x) -> Rings
- (Q, +, x) -> Fields

## 3. Sets and Functions 

A set is any collection of objects. For example a set of Animals = {dog, cat, lion, crocodile...}.
There's basics sets we'll see often.
- N := {1,2,3...}, 
- Z:= {...-2,-1,0,1,2...}, 
- Q := {a/b | for all a,b \in Z}, 
- R := {}, 
- C := {a + bi | for all a,b \in R , i is squre root of -1}

### Basic Logic and Set Notation
Think writing Mathematic as a language which has certain rules which must be followed to accurately express what we mean. it must be used with simplest notation for frequently occuring concepts.

- If P and Q are two statements, then P \Rightarrow Q means that if P is true then Q is true either P implies Q. as we can say that the statement "P and Q are wto statements" and "P \Rightarrow Q means..." as P and Q, the statement itself can be written as P \Righrarrow Q or P implies Q, If P, then Q

- P \iff Q means If P \Rightarrow Q and vice versa, which should be read as P(is true) if and only if Q(is true).

|symbols|meaning|
|---|---|
|\forall|forall|
|\exsists|there exists|
|\exists!|there exists unique|

Let S and T be two sets.
if s is an object of S then we say s is an element, or a member of S.
- s \in S.
For example, 5 \in N, 1.2 \in Q.
conversly, s \notin S means s is not an element of S. like 0.1 \notin Z

- If S has finitely many elements then we say it is a finite set. and demote its cardinality or size by |S|

- `Standard way of writing down a set S`
S = { Notation for elements in S| Properties which specifies being in S}
For example,
S = {x \in \mathbb{N} | x \mod 2 = 1}
S = {1, 3, 5, 7, 9...}

- Subset: if every object in S is also an object in T, then we say S is subset of T. and we write it as S \subset T. Note that S \subset T and T \subset S => S=T.
If S is not contained in T, we write S \subsetneq T.

- Complement set: IF S \subset T then T \setminus S := {x \in T| x \notin S}. T \setminus S is called the compliment of S in T.

- Union set: The collection of objects which are in either T ans S is called the Union on S and T.
notation by S \setunion T

- Cartesian: S \times T = {(a,b)|a \in S, b \in T}. we call this new set the product of S and T.

- Empty set: \emptyset, it's literally `empty` set

- if S \setunion T \noteq \emptyset \Rightarrow S and T are `disjoint`

- Union of two disjoint sets S and T is denoted as S \DSU T

### Definition of a map and notation.
A map from S to T is a rule which assigns to each element of S a unique elements of T.

f: S \to T
x \mapsto f(x)

examples of maps of sets:
1. S=T=\mathbb{N},
f: N \to N
a \maps to a^2
2. S=\mathbb{Z} \times \mathbb{Z}, T = \mathbb{Z},
f: \mathbb{Z} \to \mathbb{Z}
(a,b) \mapsto a + b

Def. Let S and T be two sets, and f: S \to T be a map.
- S is `the domain` of f and T is `the codomain` of f.
- f is `identity map` if S=T and f(x) = x, \forall x \in S. we write as `f=Id_S.`
- f is `injective` if f(x)=f(y) \Rightarrow x=y for all x,y \in S
- f is `surjective` if given y \in T, there exists x \in S such that f(x)=y. i say the codomain and f(x) is same.
- if f is both injective and surjective, then f is `bijective`.


## 4. Equivalant Relations 