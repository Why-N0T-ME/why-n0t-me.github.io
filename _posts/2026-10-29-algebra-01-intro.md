---
title: "Abstract-algebra-Notes/01"
date: 2026-10-29
categories: ['잡동사니']
tags: [Math, Abstract-Algebra]
description: 현대대수학 정리하면서 정리한거 올리는 글
math: true
---

**Introduction to Abstract Algebra (Math 113) - Alexander Paulin**

These notes are revisions of the notes I took while studying *Introduction to Abstract Algebra* by myself, with YouTube videos (learnifyable - Abstract Algebra, 현대대수학1 강의 by 이상준 경희대 교수) and others. The visuals were drawn by me or made by Claude to represent what I'm trying to say and what the book is saying. There might be some errors, probably a lot, and they are almost certainly mine. (A.I. was used only to help my understanding and to create images.) So, if any readers find errors in my notes, please contact me via email.

## 1. Introduction - what I covered and my words left to readers

When I first heard of Abstract Algebra, I thought it was something horrible to do with $$ x, y, z $$. The book told me that `"Algebra is the abstract encapsulation of our intuition for composition. By composition, we mean the concept of two objects coming together to form a new one."` I honestly had no idea what that meant, but I'm starting to understand as I take the courses. To put it simply, composition means any structure that creates one output from two inputs, like a binary operation.

## 2. What is algebra?

Algebra is the abstract encapsulation of our intuition for composition, as described above. Abstract Algebra literally deals with abstract things, like groups, rings, fields and many propositions related to them. The following summarizes basic mathematical education:

- $$ \mathbb{N} := \{1, 2, 3, \dots\} $$, the natural numbers. $$ \mathbb{N} $$ comes with two natural operations, $$ + $$ and $$ \times $$.

- $$ \mathbb{Z} := \{\dots, -2, -1, 0, 1, 2, \dots\} $$, the integers. You can think of $$ \mathbb{N} $$ as sitting inside $$ \mathbb{Z} $$ on one line.

![Number line showing the natural numbers, 0 and the negative integers](/assets/img/posts/misc/AbstractAlgebra/note01/n-to-z-numberline.png)
*The natural numbers on the number line, their mirror images and 0 together form the integers.*

> Every $$ n \in \mathbb{Z} $$ has an additive inverse $$ -n \in \mathbb{Z} $$, that is, $$ n + (-n) = 0 $$.
{: .prompt-tip }

- $$ \mathbb{Q} := \{ a/b \mid a, b \in \mathbb{Z},\ b \neq 0 \} $$, the rational numbers. We form these by taking $$ \mathbb{Z} $$ and formally dividing through by nonzero integers. Every nonzero element has a multiplicative inverse.

It continues by going on to form $$ \mathbb{R} $$, the real numbers, and $$ \mathbb{C} $$, the complex numbers. At each stage the operations $$ + $$ and $$ \times $$ gain additional properties. We will spend years understanding how $$ + $$ and $$ \times $$ behave in several sets.

For example,

$$
a + b = b + a \quad \text{for all } a, b \in \mathbb{Q},
$$

or

$$
a \times (b + c) = a \times b + a \times c \quad \text{for all } a, b, c \in \mathbb{Q}.
$$

The key idea is `to define a larger class of objects`:

- $$ (\mathbb{Z}, +) $$ → Groups
- $$ (\mathbb{Z}, +, \times) $$ → Rings
- $$ (\mathbb{Q}, +, \times) $$ → Fields

## 3. Sets and Functions

A set is any collection of objects. For example, a set of animals = $$ \{\text{dog}, \text{cat}, \text{lion}, \text{crocodile}, \dots\} $$. There are basic sets we'll see often:

- $$ \mathbb{N} := \{1, 2, 3, \dots\} $$, the natural numbers
- $$ \mathbb{Z} := \{\dots, -2, -1, 0, 1, 2, \dots\} $$, the integers (정수). Listing them in the order $$ 0, -1, 1, -2, 2, -3, 3, \dots $$ reaches every integer.
- $$ \mathbb{Q} := \{ a/b \mid a, b \in \mathbb{Z},\ b \neq 0 \} $$, the rational numbers (유리수)
- $$ \mathbb{R} $$, the real numbers (실수)
- $$ \mathbb{C} := \{ a + bi \mid a, b \in \mathbb{R},\ i^2 = -1 \} $$, the complex numbers (복소수), where $$ i $$ is a square root of $$ -1 $$
- $$ T^{+} $$, the positive elements of $$ T $$. For example, $$ \mathbb{R}^{+} = \{ x \in \mathbb{R} \mid x > 0 \} $$. Note that $$ 0 \notin T^{+} $$.

### Basic Logic and Set Notation

Think of writing mathematics as a language which has certain rules that must be followed to express accurately what we mean. It must be used with the simplest notation for frequently occurring concepts.

- If $$ P $$ and $$ Q $$ are two statements, then $$ P \Rightarrow Q $$ means that if $$ P $$ is true then $$ Q $$ is true. We say "$$ P $$ implies $$ Q $$", or "if $$ P $$, then $$ Q $$". Note that $$ P $$ and $$ Q $$ are themselves statements, and "$$ P \Rightarrow Q $$" is again a statement.

- $$ P \iff Q $$ means $$ P \Rightarrow Q $$ and vice versa ($$ Q \Rightarrow P $$). It should be read "$$ P $$ (is true) if and only if $$ Q $$ (is true)".

| symbols | meaning |
|---|---|
| $$ \forall $$ | for all |
| $$ \exists $$ | there exists |
| $$ \exists! $$ | there exists a unique |

Let $$ S $$ and $$ T $$ be two sets.

- If $$ s $$ is an object of $$ S $$, then we say $$ s $$ is an element, or a member, of $$ S $$, and write $$ s \in S $$. For example, $$ 5 \in \mathbb{N} $$ and $$ 1.2 \in \mathbb{Q} $$. Conversely, $$ s \notin S $$ means $$ s $$ is not an element of $$ S $$, like $$ 0.1 \notin \mathbb{Z} $$.

- If $$ S $$ has finitely many elements, then we say it is a finite set, and denote its cardinality (size) by $$ \lvert S \rvert $$.

- `Standard way of writing down a set` $$ S $$:

$$
S = \{ \text{notation for elements in } S \mid \text{properties which specify being in } S \}
$$

For example,

$$
S = \{ x \in \mathbb{N} \mid x \bmod 2 = 1 \} = \{1, 3, 5, 7, 9, \dots\}.
$$

- `Subset`: if every object in $$ S $$ is also an object in $$ T $$, then we say $$ S $$ is a subset of $$ T $$, and write $$ S \subset T $$. Note that $$ (S \subset T \text{ and } T \subset S) \Rightarrow S = T $$. If $$ S $$ is not contained in $$ T $$, we write $$ S \not\subset T $$. (A subset which is not the whole set is a proper subset, written $$ S \subsetneq T $$.)

- `Complement`: if $$ S \subset T $$, then $$ T \setminus S := \{ x \in T \mid x \notin S \} $$. $$ T \setminus S $$ is called the complement of $$ S $$ in $$ T $$.

- `Union`: the collection of objects which are in either $$ S $$ or $$ T $$ is called the union of $$ S $$ and $$ T $$, denoted by $$ S \cup T $$.

- `Intersection`: the collection of objects which are in both $$ S $$ and $$ T $$ is called the intersection of $$ S $$ and $$ T $$, denoted by $$ S \cap T $$.

- `Cartesian product`: $$ S \times T := \{ (a, b) \mid a \in S,\ b \in T \} $$. We call this new set the product of $$ S $$ and $$ T $$.

- `Empty set`: $$ \emptyset $$, it's literally the `empty` set.

- If $$ S \cap T = \emptyset $$, then $$ S $$ and $$ T $$ are `disjoint`.

- The union of two disjoint sets $$ S $$ and $$ T $$ is denoted by $$ S \sqcup T $$ (the `disjoint union`).

### Definition of a map and notation

A `map` from $$ S $$ to $$ T $$ is a rule which assigns to each element of $$ S $$ a unique element of $$ T $$.

$$
\begin{aligned}
f : S &\to T \\
x &\mapsto f(x)
\end{aligned}
$$

For this to make sense, the rule has to be `well-defined`: it assigns to every $$ x \in S $$ exactly one element $$ f(x) \in T $$. (잘 정의됨) The rule is `not well-defined` if, for some $$ x \in S $$,

- (1) $$ f(x) $$ is not defined at all,
- (2) $$ f(x) $$ is defined, but $$ f(x) \notin T $$, or
- (3) the rule gives more than one value for $$ f(x) $$. For example, the rule "send $$ x $$ to a number $$ y $$ with $$ y^2 = x $$" gives both $$ 2 $$ and $$ -2 $$ at $$ x = 4 $$.

Examples of maps of sets:

1. $$ S = T = \mathbb{N} $$, $$ f : \mathbb{N} \to \mathbb{N},\ a \mapsto a^2 $$
2. $$ S = \mathbb{Z} \times \mathbb{Z} $$, $$ T = \mathbb{Z} $$, $$ f : \mathbb{Z} \times \mathbb{Z} \to \mathbb{Z},\ (a, b) \mapsto a + b $$

**Definition.** Let $$ S $$ and $$ T $$ be two sets, and $$ f : S \to T $$ be a map.

- $$ S $$ is `the domain` of $$ f $$, and $$ T $$ is `the codomain` of $$ f $$.
- $$ f $$ is the `identity map` if $$ S = T $$ and $$ f(x) = x $$ for all $$ x \in S $$. We write $$ f = \mathrm{Id}_S $$, the identity map of $$ S $$.
- $$ f $$ is `injective` if $$ f(x) = f(y) \Rightarrow x = y $$ for all $$ x, y \in S $$. Equivalently, $$ x \neq y \Rightarrow f(x) \neq f(y) $$. (단사함수, 일대일 함수; one-to-one function)
- $$ f $$ is `surjective` if, given $$ y \in T $$, there exists $$ x \in S $$ such that $$ f(x) = y $$. In other words, the codomain $$ T $$ and the image $$ f(S) $$ are the same. (전사함수, 공역 = 치역, 위로의 함수; onto function)
- If $$ f $$ is both injective and surjective, then $$ f $$ is `bijective`. (전단사함수)

### Maps as pictures

Draw $$ S $$ and $$ T $$ as two sets of dots, and $$ f $$ as arrows from $$ S $$ to $$ T $$ (every dot of $$ S $$ has exactly one arrow leaving it).

- `injective`: no two arrows end at the same dot.
- `surjective`: every dot of $$ T $$ has an arrow arriving.
- `bijective`: both, so every dot of $$ T $$ receives exactly one arrow.

![Set diagrams of an injective map and a map that is not injective](/assets/img/posts/misc/AbstractAlgebra/note01/injective.png)
*Left: an injective map, where different elements of S go to different elements of T. Right: not injective, since b and c both go to 2.*

![Set diagrams of a surjective map and a map that is not surjective](/assets/img/posts/misc/AbstractAlgebra/note01/surjective.png)
*Left: a surjective map, where every element of T is hit (b and c both go to 2, which is allowed). Right: not surjective, since nothing goes to 4.*

![Set diagrams of a bijective map f and its inverse g](/assets/img/posts/misc/AbstractAlgebra/note01/bijective.png)
*Left: a bijective map f from S to T. Right: reversing all the arrows gives the inverse map g from T to S.*

> To show that a map $$ f : S \to T $$ is `not surjective`, we have to show that $$ \exists\, y \in T $$ such that $$ f(x) \neq y $$ for all $$ x \in S $$. That is, there is some $$ y \in T $$ with $$ y \notin f(S) $$ (also written $$ y \notin \operatorname{Im}(f) $$).
{: .prompt-tip }

> To show that a map $$ f : S \to T $$ is `not injective`, we have to show that $$ \exists\, \alpha, \beta \in S $$ such that $$ \alpha \neq \beta $$ and $$ f(\alpha) = f(\beta) \in T $$.
{: .prompt-tip }

### Exercises

For maps between sets of real numbers, we can read injectivity and surjectivity off the graph. Draw the horizontal line $$ y = c $$ for each $$ c $$ in the codomain. Then $$ f $$ is injective if every such line meets the graph at most once, and surjective if every such line meets the graph at least once.

#### Exercise 1

$$ f : \mathbb{R} \to \mathbb{R},\ x \mapsto x^2 $$. Is $$ f $$ injective? **No.** Is $$ f $$ surjective? **No.**

![Graph of f(x) = x² with the horizontal lines y = 1 and y = -1](/assets/img/posts/misc/AbstractAlgebra/note01/ex1-x-squared.png)
*Left: the line y = 1 meets the graph at x = −1 and x = 1, so f is not injective. Right: the line y = −1 never meets the graph, so f is not surjective.*

- Not injective: suppose $$ f(x) = f(y) $$. Then $$ x^2 = y^2 $$, so $$ x = y $$ or $$ x = -y $$. So $$ x $$ is not unique. For example, $$ f(-1) = f(1) = 1 $$ but $$ -1 \neq 1 $$.
- Not surjective: $$ f(x) = x^2 \ge 0 $$ for every $$ x \in \mathbb{R} $$, so there is no $$ x $$ with $$ f(x) = -1 $$. That is, $$ -1 \notin f(\mathbb{R}) = [0, \infty) $$.
- If we shrink the codomain to $$ [0, \infty) $$, the same rule becomes surjective: for $$ y \ge 0 $$, $$ x = \sqrt{y} $$ satisfies $$ f(x) = y $$.

#### Exercise 2

$$ g : \mathbb{C} \to \mathbb{C},\ x \mapsto \lvert x \rvert $$. Is $$ g $$ injective? **No.** Is $$ g $$ surjective? **No.**

- Not injective: $$ g(1) = g(-1) = 1 $$.
- Not surjective: $$ g(x) \ge 0 $$ for every $$ x \in \mathbb{C} $$, so for example $$ -1 \notin g(\mathbb{C}) $$.

#### Exercise 3

$$ h : \mathbb{C} \to \mathbb{R}^{+},\ x \mapsto x^2 $$. In this case, we say the function $$ h $$ is `not well-defined`.

![Map diagram of h from C to R+, where i is sent to -1 outside R+](/assets/img/posts/misc/AbstractAlgebra/note01/ex3-not-well-defined.png)
*Each x in ℂ is sent to x², but i goes to −1, which is not an element of ℝ⁺.*

- Since $$ i \in \mathbb{C} $$ but $$ h(i) = i^2 = -1 \notin \mathbb{R}^{+} $$, the rule does not give an element of the codomain for every element of the domain. This is case (2) of the definition of well-defined.

#### Exercise 4

1. $$ f : [0, \tfrac{\pi}{2}] \to [0, \infty),\ f(x) = \tan x $$ is `not well-defined`.
2. $$ f : [0, \tfrac{\pi}{2}) \to [0, \infty),\ f(x) = \tan x $$ is `bijective`. ($$ \tan $$ is continuous and strictly increasing, with $$ \tan 0 = 0 $$ and $$ \tan x \to \infty $$ as $$ x \to \tfrac{\pi}{2} $$.)
3. $$ f : [0, \tfrac{\pi}{2}) \to \mathbb{R},\ f(x) = \tan x $$ is not surjective.

![Graphs of tan x for the three maps in Exercise 4](/assets/img/posts/misc/AbstractAlgebra/note01/ex4-tan-graphs.png)
*Left: the domain contains π/2, but tan is not defined there. Middle: on [0, π/2) every height y ≥ 0 is reached exactly once. Right: the line y = −1 never meets the graph.*

For 1, the reason it is not well-defined: the domain $$ [0, \tfrac{\pi}{2}] $$ contains $$ x = \tfrac{\pi}{2} $$, but $$ \tan \tfrac{\pi}{2} = \tfrac{\sin(\pi/2)}{\cos(\pi/2)} = \tfrac{1}{0} $$ is not defined. So the rule gives no value at $$ x = \tfrac{\pi}{2} $$, which is case (1) of the definition. Removing $$ \tfrac{\pi}{2} $$ from the domain, as in 2, fixes this.

For 3, there are two ways to say it:

- (recommended) Let's say $$ y = -1 \in \mathbb{R} $$. Since the range of $$ f(x) $$ is $$ [0, \infty) $$, there is no $$ x \in [0, \tfrac{\pi}{2}) $$ such that $$ f(x) = -1 $$. Therefore, $$ f $$ is not surjective.
- Or, since the range of $$ f $$ is $$ f([0, \tfrac{\pi}{2})) = [0, \infty) $$, we have $$ f([0, \tfrac{\pi}{2})) \subsetneq \mathbb{R} $$ (so $$ \mathbb{R} \setminus f([0, \tfrac{\pi}{2})) \neq \emptyset $$). Hence $$ f $$ is not surjective.

#### Exercise 5

$$ f : \mathbb{R} \to \mathbb{R},\ f(x) = 2x + 1 $$.

![Graph of f(x) = 2x + 1 with the horizontal lines y = 3 and y = -3](/assets/img/posts/misc/AbstractAlgebra/note01/ex5-linear-graph.png)
*Every horizontal line meets the graph of y = 2x + 1 exactly once, so f is bijective.*

- Injective: let's say $$ f(x) = f(y) $$. Then $$ 2x + 1 = 2y + 1 $$, so $$ x = y $$.
- Surjective: say $$ y \in \mathbb{R} $$. If $$ 2x + 1 = y $$, then $$ 2x = y - 1 $$ and $$ x = \tfrac{y - 1}{2} $$. Indeed, $$ f\left(\tfrac{y-1}{2}\right) = 2 \cdot \tfrac{y-1}{2} + 1 = y \in \mathbb{R} $$.
- So the map $$ f $$ is bijective.

### Exercise: bijection and the inverse map

**Exercise.** Let $$ S $$ and $$ T $$ be two sets, and let $$ f $$ be a map from $$ S $$ to $$ T $$. Show that $$ f $$ is a bijection if and only if there exists a map $$ g : T \to S $$ such that

$$
f \circ g = \mathrm{Id}_T \quad \text{and} \quad g \circ f = \mathrm{Id}_S.
$$

**Proof.** First, we are going to show that $$ f $$ bijective $$ \Rightarrow $$ such a $$ g $$ exists. And then, we show the opposite way.

($$ \Rightarrow $$) If $$ f $$ is a bijection, then

- (injective) $$ f(x) = f(y) \Rightarrow x = y $$, and
- (surjective) $$ \forall y \in T,\ \exists x \in S $$ such that $$ f(x) = y $$.

Define $$ g : T \to S $$ as follows. For $$ y \in T $$, surjectivity gives some $$ x \in S $$ with $$ f(x) = y $$, and by injectivity this $$ x $$ is unique (if $$ f(x) = f(x') = y $$, then $$ x = x' $$). Let $$ g(y) := x $$. Then $$ g $$ is a map from $$ T $$ to $$ S $$, and $$ f(g(y)) = y $$ for all $$ y \in T $$.

Then we can say that $$ f \circ g $$ is a composition of two maps, from $$ T $$ to $$ S $$ and from $$ S $$ to $$ T $$:

$$
f \circ g : T \to S \to T,\ \text{that is, } f \circ g : T \to T.
$$

Therefore $$ f \circ g = \mathrm{Id}_T $$. In the same way, for $$ x \in S $$, $$ g(f(x)) $$ is the unique $$ x' \in S $$ with $$ f(x') = f(x) $$, and $$ x' = x $$ by injectivity. So $$ g \circ f = \mathrm{Id}_S $$.

($$ \Leftarrow $$) Suppose $$ f : S \to T $$ and $$ g : T \to S $$ satisfy $$ f \circ g = \mathrm{Id}_T $$ and $$ g \circ f = \mathrm{Id}_S $$.

- (injective) If $$ f(x) = f(y) $$, then $$ g(f(x)) = g(f(y)) $$. Since $$ g \circ f = \mathrm{Id}_S $$, this says $$ x = y $$.
- (surjective) Let $$ y \in T $$ and put $$ x := g(y) \in S $$. Then $$ f(x) = f(g(y)) = y $$, because $$ f \circ g = \mathrm{Id}_T $$.

Hence $$ f $$ is a bijection. ∎

## 4. Equivalence Relations
