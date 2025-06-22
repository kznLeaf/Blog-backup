---
title: 剑指offer-排序
date: 2025-06-14 23:37:41
index_img:
categories:
hide: true
---

## 题目链接

[合并区间](https://leetcode.cn/problems/merge-intervals/description/)

[数组的相对排序](https://leetcode.cn/problems/relative-sort-array/) 值域已知(0~1000)，直接从建立辅助数组开始

[数组中的第K个最大元素](https://leetcode.cn/problems/kth-largest-element-in-an-array/description/)

[排序链表](https://leetcode.cn/problems/sort-list/?envType=study-plan-v2&envId=top-100-liked)

[合并k个升序链表](https://leetcode.cn/problems/merge-k-sorted-lists/description/?envType=study-plan-v2&envId=top-100-liked)

## 常见的排序算法

### 计数排序

计数排序的基本思想是先统计数组中每个整数在数组中出现的次数，然后按照从小到大的顺序将每个整数按照它出现的次数填到数组中。代码如下。

- 假设数组的长度为`n`，数组中最大整数和最小整数的差值是`k`。找最大值和最小值耗时O(n)，建立辅助计数数组耗时O(k)，回写排序结果也是O(n)，所以总时间复杂度是O(n+k)。
- 使用了一个辅助数组`counts`，大小为`k`，所以空间复杂度是`k`

可见，当`k`较小时(1000以内)，排序速度非常高效，适用于整数排序 + 值域不大 + 不要求原地排序，例如对所有员工的年龄排序。

```java
public int[] sortArray(int[] nums) {
    // 先遍历数组得到最大值和最小值
    int min = Integer.MAX_VALUE;
    int max = Integer.MIN_VALUE;
    for(int number : nums) {
        if(number < min) min = number;
        if(number > max) max = number;
    }
    // 建立辅助计数数组
    int[] counts = new int[max - min + 1];
    for(int number : nums) {
        counts[number - min]++;
    }
    int i = 0;
    // 回写排序结果
    for (int number = min; number <= max; number++) {
        int count = counts[number - min];
        for (int j = 0; j < count; j++) {
            nums[i++] = number;
        }
    }
    return nums;
}
```

### 归并排序

个人觉得比较好理解的思路：

```java
class Solution {
    // 手搓归并排序
    public int[] sortArray(int[] nums) {
        if(nums == null || nums.length == 1) {
            return nums;
        }

        int[] temp = new int[nums.length];

        merge(nums, temp, 0, nums.length - 1);

        return nums;
    }

    private void merge(int[] nums, int[] temp, int start, int end) {
        // [sart, end]
        if(start >= end) return;
        int mid = start + (end - start) / 2;
        // 保证子区间有序：
        merge(nums, temp, start, mid);
        merge(nums, temp, mid + 1, end);

        // 下面合并两个有序子区间。
        // 先对 temp 数组赋值
        for(int i = start; i <= end; i++) {
            temp[i] = nums[i];
        }
        int i = start, j = mid + 1;
        int k = start;

        // i, j 用于逐个比较两个子区间数字的大小，比较的结果保存在nums
        // 这里用了3个while，感觉这样更好理解。后面两个while是因为两个子区间的长度可能不相等，需要补漏
        while(i <= mid && j <= end) {
            if(temp[i] <= temp[j]) {
                nums[k++] = temp[i++];
            } else {
                nums[k++] = temp[j++];
            }
        }
        while(i <= mid) {
            nums[k++] = temp[i++];
        }
        while(j <= end) {
            nums[k++] = temp[j++];
        }

    }
}
```

### 数组中的第K个最大元素

给定整数数组 nums 和整数 k，请返回数组中第 k 个最大的元素。

请注意，你需要找的是数组排序后的第 k 个最大的元素，而不是第 k 个不同的元素。

你必须设计并实现时间复杂度为 O(n) 的算法解决此问题。

---

这道题有两种思路，对应剩下的两个排序思路。

#### 方法一：最小堆

堆（用优先队列实现）的插入、删除的时间复杂度都是log k，遍历一遍数组。

时间复杂度：O(n*log k)

空间复杂度：O(k)

```java
class Solution {
    public int findKthLargest(int[] nums, int k) {
        PriorityQueue<Integer> minHeap = new PriorityQueue<>();

        for(int number : nums) {
            if(minHeap.size() < k) {
                minHeap.offer(number);
            } else if (number > minHeap.peek()) {
                minHeap.poll();
                minHeap.offer(number);
            }
        }
        return minHeap.peek();
        
    }
}
```

#### 方法二：快排

这个解法思路上没问题，但是无法通过第二个测试用例，而且又臭又长。。。所以练练手好了。

快速排序思路是每次随机生成一个区间内的索引，然后根据这个索引上的数字分组，左边的数字都比这个数小，右边的数字都比这个数大，这样递归地进行下去。

这道题没必要真的对整个数组排序，因为从小到大排序后的数组中，第k大的数字刚好是索引`n-k`的数字。所以每次分组之后看看中间值的索引，比目标小的话就向右缩小区间，大的话就向左缩小区间。

 
```java
class Solution {
    private Random random = new Random();
    public int findKthLargest(int[] nums, int k) {
        int len = nums.length;
        int target = len - k;
        int start = 0;
        int end = len - 1;
        int index = part(nums, start, end);
        while(index != target) {
            if(index < target) {
                start = index + 1;
            } else {
                end = index - 1;
            }
            index = part(nums, start, end);
        }
        return nums[index];
        
    }

    private int part(int[] nums, int start, int end) {
        int r = random.nextInt(end - start + 1) + start;
        swap(nums, end, r);
        int small = start - 1;
        for(int i = start; i < end; i++) {
            if(nums[i] < nums[end]) {
                small++;
                swap(nums, small, i);
            }
        }
        small++;
        swap(nums, small, end);
        return small;
    }

    private void swap(int[] nums, int i, int j) {
        if(i != j) {
        int temp = nums[i];
        nums[i] = nums[j];
        nums[j] = temp;

        }
       
    }
}
```




