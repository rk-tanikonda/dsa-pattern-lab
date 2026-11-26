# 001 — Two Sum

## 1. Problem Statement

**Difficulty:** Easy  
**Category:** Arrays & Hashing  
**Platform:** LeetCode  
**Problem:** [Two Sum — LeetCode #1](https://leetcode.com/problems/two-sum/)  
**Started:** November 22, 2026  
**Status:** In Progress  
**Primary language:** Go (other languages use the same shared cases)

### Description

Given an array of integers `nums` and an integer `target`, return the indices of two distinct elements whose sum equals the target.

Assume exactly one valid solution exists. The same array element cannot be used twice.

### Example

```text
Input:
nums = [3, 2, 4]
target = 6

Output:
[1, 2]
```

**Explanation:** The elements at indices `1` and `2` are `2` and `4`. Their sum is `6`.

---

## 2. My Initial Thought Process

My first idea was to use two nested loops.

The outer loop selects one element from the array. The inner loop compares that element with the remaining elements to check whether their sum equals the target.

Initially, I considered comparing adjacent elements. However, I realized that the solution could involve elements that are not adjacent.

Therefore, I need to check every possible pair of distinct elements.

**My initial approach:**

Check every possible pair of different elements and see if any pair sums to the target.

---

## 3. Brute-Force Approach

I decided to use two nested loops.

- The outer loop selects an element at index `i`.
- The inner loop starts at index `i + 1`.
- For every pair, I check whether the sum equals the target.
- If a matching pair is found, I return the two indices.

### Why does the inner loop start at `i + 1`?

Starting the inner loop at `i + 1` ensures that:

1. An element is never compared with itself.
2. The same pair is not checked twice.
3. Only elements appearing after the current element are considered.

For example:

```text
Outer index = 0 → Inner starts at 1
Outer index = 1 → Inner starts at 2
Outer index = 2 → Inner starts at 3
```

This avoids unnecessary comparisons.

**Implementation:** Pending — I will write the solution independently.

---

## 4. Understanding Pair Combinations

Initially, I tried calculating all possible pairs manually using four elements.

Consider:

```text
[A, B, C, D]
```

If I compare each element with every other element, excluding itself, I get 12 ordered pairs.

However, some pairs are repeated in reverse order.

For example, `(A, B)` and `(B, A)` represent the same unordered pair.

After removing these reversed duplicates, only six unique pairs remain:

```text
(A, B)
(A, C)
(A, D)
(B, C)
(B, D)
(C, D)
```

### Formula for Unique Pairs

For an array containing `n` elements, the number of unique unordered pairs of distinct indices is:

**n × (n − 1) / 2**

Here, `n` represents the number of elements in the array.

### Example 1: Four Elements

```text
n = 4

4 × (4 − 1) / 2
= 4 × 3 / 2
= 6 pairs
```

### Example 2: Ten Elements

```text
n = 10

10 × (10 − 1) / 2
= 10 × 9 / 2
= 90 / 2
= 45 pairs
```

### Example 3: One Hundred Elements

```text
n = 100

100 × (100 − 1) / 2
= 100 × 99 / 2
= 4,950 pairs
```

### What I Learned

Instead of manually counting every pair, I can use this formula whenever I need to calculate the number of unordered pairs of distinct elements.

The formula counts all possible unique pairs, not just the pairs whose values add up to the target.

---

## 5. Time Complexity Analysis

### Brute-Force Time Complexity: O(n²)

My brute-force approach uses two nested loops to examine pairs of elements.

In the worst case, the algorithm checks:

```text
n × (n − 1) / 2
```

Expanding the expression:

```text
(n² − n) / 2
```

Big O notation describes how an algorithm's resource usage grows as the input size increases.

For large inputs, the `n²` term dominates the growth. Constant factors and lower-order terms are ignored when expressing Big O.

Therefore, the worst-case time complexity is:

**O(n²) — Quadratic Time**

### Why Quadratic and Not Exponential?

Initially, I described the growth as exponential because the number of comparisons increases rapidly.

I learned that quadratic growth and exponential growth are different.

For quadratic growth, doubling the input size makes the work approximately four times larger.

| Array size | Maximum pairs |
|---|---:|
| 4 | 6 |
| 10 | 45 |
| 20 | 190 |
| 50 | 1,225 |
| 100 | 4,950 |
| 200 | 19,900 |

The number of comparisons grows approximately in proportion to the square of the input size.

**Key takeaway:** Nested loops do not automatically mean O(n²), but in this particular algorithm, the total number of comparisons grows quadratically.

---

## 6. Space Complexity Analysis

**Expected brute-force auxiliary space complexity: O(1)**

The nested-loop approach only needs a fixed number of variables, such as the loop indices.

It does not require an additional data structure that grows with the input size.

I will verify this after implementing my solution.

---

## 7. My Mistakes and Corrections

### Mistake 1: Considering Only Adjacent Elements

**Initial thought:** Compare each element with its immediate neighbor.

**Correction:** A valid pair can contain elements at any two distinct indices.

**Lesson:** Understand the problem's requirements before choosing an approach.

### Mistake 2: Counting Duplicate Pairs

**Initial thought:** For four elements, I counted ordered pairs in both directions.

**Correction:** Reversed pairs do not need to be checked again.

**Lesson:** Starting the inner loop at `i + 1` avoids self-pairs and reversed duplicates.

### Mistake 3: Not Knowing How to Count Pairs for Large Arrays

**Initial thought:** I could manually count pairs for small arrays, but I didn't know how to calculate them for 100 elements.

**Correction:** I learned the formula `n × (n − 1) / 2`.

**Lesson:** Derive a general mathematical relationship from a smaller example.

### Mistake 4: Confusing Quadratic and Exponential Growth

**Initial thought:** The number of comparisons grows exponentially.

**Correction:** The number of comparisons grows quadratically.

**Lesson:** For O(n²) growth, doubling the input size produces approximately four times the work.

---

## 8. Optimization

**Status: Not attempted yet**

Questions to investigate:

- Can I avoid comparing every possible pair?
- Am I repeating work unnecessarily?
- Can a data structure help me find the required pair faster?
- What time-space trade-offs would an optimized approach introduce?

I will explore these questions after successfully implementing and testing the brute-force solution.

---

## 9. Implementation and Testing

**Implementation:** Pending  
**Automated tests:** Seven shared cases ready

**Independent solution:** Pending

### Files

- `solution.go` — My Go starter (unsolved)
- `c/solution.c` — Optional C starter (unsolved)
- `cases.json` — Shared language-neutral test cases
- `README.md` — My reasoning and learning journal

### Test Command (from the repository root)

```bash
python3 tools/run.py
```

### Completion Criteria

- [ ] Implement the brute-force solution independently
- [ ] Pass the shared cases
- [ ] Add an edge-case test of my own
- [ ] Explain why the implementation works
- [x] Understand unique pair combinations
- [x] Understand O(n²) worst-case time complexity
- [ ] Derive an optimized solution
- [ ] Compare the brute-force and optimized approaches
- [ ] Complete a timed independent retry

---

## 10. Review Log

| Review | Date | Status |
|---|---|---|
| Initial learning | Nov 22, 2026 | In progress |
| Day 1 review | Pending | Not started |
| Day 3 review | Pending | Not started |
| Day 7 review | Pending | Not started |
| Day 14 review | Pending | Not started |

---

## 11. My Key Takeaways

1. Brute force is a useful starting point for understanding a problem.
2. Two nested loops can be used to examine every unique pair.
3. Starting the inner loop at `i + 1` prevents unnecessary comparisons.
4. The number of unique unordered pairs is `n × (n − 1) / 2`.
5. The brute-force Two Sum approach has O(n²) worst-case time complexity.
6. Quadratic growth is different from exponential growth.
7. Understanding *why* an approach works matters more than memorizing its implementation.

---

## 12. Final Reflection

**To be completed after solving the problem independently.**

Questions I will answer:

- What was my original intuition?
- Which parts did I figure out independently?
- Where did I need help?
- What was the most important insight?
- Can I explain the algorithm without looking at my code?
- Can I solve a similar unseen problem using the same reasoning?

**Current status:** I understand the brute-force strategy and its complexity. My next task is to implement it independently in Go.
