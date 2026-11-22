# Two Sum

Given a list of integers and a target, return the zero-based indices of two
distinct elements whose values add up to the target. Exactly one valid pair
exists. Either index order is accepted.

## Input

Read whitespace-separated integers from stdin. The first two integers are
`n target`, followed by the `n` elements. There are at least two elements.
The shared starter cases use values within the range of a signed 32-bit integer.

```text
3 6
3 2 4
```

## Output

Write exactly two integer indices to stdout, separated by whitespace. Send any
debugging output to stderr. The same index cannot appear twice.

```text
1 2
```

The values at indices 1 and 2 are 2 and 4, whose sum is 6.

Implement the solution independently. Start with an approach you can explain,
then test it and describe its time and space complexity.
