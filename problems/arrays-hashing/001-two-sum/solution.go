package main

import (
	"bufio"
	"fmt"
	"os"
)

// TwoSum returns the indices of two distinct elements whose sum is target.
// Assume nums contains exactly one valid pair. Either index order is accepted.
func TwoSum(nums []int, target int) []int {
	// TODO: Implement your approach independently.
	return nil
}

// Input/output plumbing for the shared runner. Implement TwoSum above.
func main() {
	in := bufio.NewReader(os.Stdin)
	var n, target int
	if _, err := fmt.Fscan(in, &n, &target); err != nil || n < 2 {
		fmt.Fprintln(os.Stderr, "expected n target followed by n integers")
		os.Exit(1)
	}
	nums := make([]int, n)
	for i := range nums {
		if _, err := fmt.Fscan(in, &nums[i]); err != nil {
			fmt.Fprintln(os.Stderr, "expected n integers")
			os.Exit(1)
		}
	}
	for _, index := range TwoSum(nums, target) {
		fmt.Printf("%d ", index)
	}
	fmt.Println()
}
