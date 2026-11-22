#include <stdio.h>
#include <stdlib.h>

/* Write two distinct indices into result and return 1 when implemented.
   The input has exactly one valid pair. Either index order is accepted. */
int two_sum(const int *nums, int n, int target, int result[2]) {
    /* TODO: Implement your approach independently. */
    (void)nums;
    (void)n;
    (void)target;
    (void)result;
    return 0;
}

/* Input/output plumbing for the shared runner. Implement two_sum above. */
int main(void) {
    int n, target;
    if (scanf("%d %d", &n, &target) != 2 || n < 2) {
        fprintf(stderr, "expected n target followed by n integers\n");
        return 1;
    }
    int *nums = malloc((size_t)n * sizeof(*nums));
    if (nums == NULL) return 1;
    for (int i = 0; i < n; i++) {
        if (scanf("%d", &nums[i]) != 1) {
            free(nums);
            fprintf(stderr, "expected n integers\n");
            return 1;
        }
    }
    int result[2];
    if (two_sum(nums, n, target, result)) {
        printf("%d %d\n", result[0], result[1]);
    }
    free(nums);
    return 0;
}
