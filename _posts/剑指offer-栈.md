---
title: 剑指offer-栈
date: 2025-05-31 13:36:49
index_img:
categories:
hide: true
---

# 栈

## 题目链接

P104 [逆波兰表达式求值](https://leetcode.cn/problems/evaluate-reverse-polish-notation/description/)

P107 [小行星碰撞](https://leetcode.cn/problems/asteroid-collision/description/)

P109 [每日温度](https://leetcode.cn/problems/daily-temperatures/description/) 单调栈

P111 [*柱状图中最大的矩形](https://leetcode.cn/problems/largest-rectangle-in-histogram/description/) 单调栈

P117 [*最大矩形](https://leetcode.cn/problems/maximal-rectangle/) 单调栈Plus


## Hard

### 柱状图中的最大矩形

> 给定 n 个非负整数，用来表示柱状图中各个柱子的高度。每个柱子彼此相邻，且宽度为 1 。求在该柱状图中，能够勾勒出来的矩形的最大面积。

```java
class Solution {
    public int largestRectangleArea(int[] heights) {
        Deque<Integer> stack = new ArrayDeque<>();
        stack.push(-1);
        int length = heights.length;
        int result = 0;

        for(int i = 0; i < length; i++) {
            while(stack.peek() != -1 && heights[i] <= heights[stack.peek()]) {
                int height = heights[stack.pop()];
                int width = i - stack.peek() - 1;
                result = Math.max(result, height*width);
            }
            stack.push(i);
        }
        while(stack.peek() != -1) {
            int height = heights[stack.pop()];
            int width = length - stack.peek() - 1;
            result = Math.max(result, height * width);
        }
        return result;
    }
}
```

- 时间复杂度：$O(n)$
- 空间复杂度：$O(n)$


### 最大矩形


> 给定一个仅包含 0 和 1 、大小为 rows x cols 的二维二进制矩阵，找出只包含 1 的最大矩形，并返回其面积。

```java
class Solution {
    public int maximalRectangle(char[][] matrix) {
        if(matrix.length == 0 || matrix[0].length == 0) {
            return 0;
        }
        // 用于保存每一个柱子的高度
        int[] heights = new int[matrix[0].length];
        int maxArea = 0;
        
        for(char[] row : matrix) {
            // 然后遍历每一行
            for(int i = 0; i < row.length; i++) {
                if(row[i] == '0') {
                    heights[i] = 0;
                } else {
                    heights[i]++;
                }
            }
            maxArea = Math.max(maxArea, fn(heights));
        }
        return maxArea;

    }

    private int fn(int[] heights) {
        Deque<Integer> stack = new ArrayDeque<>();
        stack.push(-1);
        int result = 0;
        int n = heights.length;

        for(int i = 0; i < n; i++) {
            while(stack.peek() != -1 && heights[i] <= heights[stack.peek()]) {
                int h = heights[stack.pop()];
                int width = i - stack.peek() - 1;
                result = Math.max(result, h * width);
            }
            stack.push(i);
        }

        while(stack.peek() != -1) {
            int h = heights[stack.pop()];
            int width = n - stack.peek() - 1;
            result = Math.max(result, h*width);
        }
        return result;
    }
}
```

- 时间复杂度：假设输入的矩形大小是$m\times n$，那么时间复杂度是$O(mn)$
- 空间复杂度：采用单调栈法，空间复杂度是$O(n)$


