---
title: 剑指offer-动态规划
date: 2025-07-14 21:46:30
index_img:
categories:
hide: true
---

## 题目

P254 [使用最小花费爬楼梯](https://leetcode.cn/problems/min-cost-climbing-stairs/description/)

**单序列问题**

P259 [打家劫舍](https://leetcode.cn/problems/house-robber/description/)

P264 [打家劫舍II](https://leetcode.cn/problems/house-robber-ii/description/)

P268 [将字符串翻转到单调递增](https://leetcode.cn/problems/flip-string-to-monotone-increasing/description/)

P271 [*最长的斐波那契子序列的长度](https://leetcode.cn/problems/length-of-longest-fibonacci-subsequence/description/)

P274 [*分割回文串II](https://leetcode.cn/problems/palindrome-partitioning-ii/)

**双序列问题**

P277 [最长公共子序列](https://leetcode.cn/problems/longest-common-subsequence/description/)（几乎一样的题：[两个字符串的删除操作](https://leetcode.cn/problems/delete-operation-for-two-strings/description/)）

[最长递增子序列](https://leetcode.cn/problems/longest-increasing-subsequence/description/) 贪心+二分

P282 [交错字符串](https://leetcode.cn/problems/interleaving-string/description/)

P287 [不同的子序列](https://leetcode.cn/problems/distinct-subsequences/description/)

P311 [零钱兑换](https://leetcode.cn/problems/coin-change/)

**矩阵路径问题**

P292 [不同路径](https://leetcode.cn/problems/unique-paths/?envType=study-plan-v2&envId=top-100-liked)

P296 [最小路径和](https://leetcode.cn/problems/minimum-path-sum/)

P299 [三角形最小路径和](https://leetcode.cn/problems/triangle/)（从下往上，用一个数组记录前一行的数字）

**背包问题**

给定一组物品，每种物品都有其重量和价格，在限定的总重量内如何选择才能使物品的总价格最高。

如果每种物品只有一个，可以选择将之放入或不放入背包，那么可以将这类问题称为 0-1 背包问题。0-1 背包问题是最基本的背包问题，其他背包问题通常可以转化为 0-1 背包问题。 

如果第`i`种物品最多有`Mi`个，也就是每种物品的数量都是有限的，那么这类背包问题称为有界背包问题（也可以称为多重背包问题）。如果每种物品的数量都是无限的，那么这类背包问题称为无界背包问题（也可以称为完全背包问题）。 

P305 [分割等和子集](https://leetcode.cn/problems/partition-equal-subset-sum/?envType=study-plan-v2&envId=top-100-liked) 倒序遍历

P309 [目标和](https://leetcode.cn/problems/target-sum/description/) 倒序遍历，记录组合数

- 求组合数：外层为数组元素，内层为目标值。
- 求排列数：外层为目标值，内层为数组元素。先确定需要凑出来多大的值，然后

P313 [组合总和 Ⅳ](https://leetcode.cn/problems/combination-sum-iv/description/) 求排列数

## 题解

### 粉刷房子

会员专享题

一排`n`幢房子要粉刷成红色、绿色和蓝色，不同房子被粉刷成不同颜色的成本不同。用一个`n×3`的数组表示`n`幢房子分别用3种颜色粉刷的成本。要求**任意相邻的两幢房子的颜色都不一样**，请计算粉刷这`n` 幢房子的最少成本。例如，粉刷3幢房子的成本分别为`[[17, 2, 16], [15, 14, 5], [13, 3, 1]]`，如果分别将这 3 幢房子粉刷成绿色、蓝色和绿色，那么粉刷的成本是10，是最少的成本。   

```java
public int minCost(int[][] costs) {
    if (costs.length == 0) return 0;
    for (int i = 1; i < costs.length; i++) {
        costs[i][0] += Math.min(costs[i - 1][1], costs[i - 1][2]); // 红色
        costs[i][1] += Math.min(costs[i - 1][0], costs[i - 1][2]); // 绿色
        costs[i][2] += Math.min(costs[i - 1][0], costs[i - 1][1]); // 蓝色
    }
    int n = costs.length - 1;
    return Math.min(costs[n][0], Math.min(costs[n][1], costs[n][2]));
}
```

- 时间复杂度：O(n)
- 空间复杂度：O(1)

### 字符串翻转

```java
class Solution {
    public int minFlipsMonoIncr(String s) {
        // dp0[i]：将前 i 个字符变成 全是 '0' 的最小翻转次数
        // dp1[i]：将前 i 个字符变成 单调递增（最后以 '1' 结尾） 的最小翻转次数
        int n = s.length();
        int dp0 = 0;
        int dp1 = 0;

        for(int i = 0; i < n; i++) {
            char c = s.charAt(i);
            int newDp0 = dp0 + (c == '1' ? 1 : 0);
            int newDp1 = Math.min(dp0, dp1) + (c == '0' ? 1 : 0);
            dp0 = newDp0;
            dp1 = newDp1;
        }

        return Math.min(dp0, dp1);
    }
}
```

### 最长的斐波那契子序列的长度

```java
public class LeetCode873 {
    public int lenLongestFibSubseq(int[] arr, int[][] dp) {
        int n = arr.length;
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < n; i++) {
            map.put(arr[i], i);
            // 数值 -> 下标
        }
        int maxLen = 0;
//        int[][] dp = new int[n][n];
        // .....arr[k], arr[j], arr[i]
        // 如果满足 arr[k] + arr[j] == arr[i]，那么 dp[j][i] = dp[k][j] + 1
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < i; j++) {
                int k_value = arr[i] - arr[j];
                int k = map.getOrDefault(k_value, -1);

                if (k != -1 && arr[k] < arr[j]) {
                    // 找到了符合条件的 k 并且满足递增
                    dp[j][i] = dp[k][j] + 1;
                    maxLen = Math.max(maxLen, dp[j][i] + 2);
                }
            }
        }
        return maxLen;
    }

    @Test
    public void test() {

        int[] arr = {1, 2, 3, 4, 5, 6, 7, 8};
        int[][] dp = new int[arr.length][arr.length];
        System.out.println(lenLongestFibSubseq(arr, dp));

        for (int[] a : dp) {
            System.out.println(Arrays.toString(a));
        }
    }
}
```

### 最长公共子序列

**状态转移方程**：

```java
if (text1.charAt(i - 1) == text2.charAt(j - 1)) {
    dp[i][j] = dp[i - 1][j - 1] + 1;
} else {
    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
}
```

**情况一**：当前字符匹配

- 把这两个字符加到它们前面部分`(i-1,j-1)`的最长子序列里

**情况二**：当前字符不匹配，两种选择：

1. 忽略`text1`的当前字符，即只看`dp[i - 1][j]`
2. 忽略`text2`的当前字符，即只看`dp[i][j - 1]`

取这两个子问题中较长的那个作为`dp[i][j]`。

```java
class Solution {
    public int longestCommonSubsequence(String text1, String text2) {
        int m = text1.length(); // 行数
        int n = text2.length(); // 列数

        int[][] dp = new int[m + 1][n + 1];
        int res = 0;

        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (text1.charAt(i - 1) == text2.charAt(j - 1)) { // 条件可以优化，先把text转化成char数组
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }
        return dp[m][n];
    }
}
```

优化后的 LeetCode583

```java
class Solution {
    public int minDistance(String word1, String word2) {
        int m = word1.length();
        int n = word2.length();

        int[][] dp = new int[m + 1][n + 1];

        char[] w1 = word1.toCharArray();
        char[] w2 = word2.toCharArray();

        for (int i = 1; i <= m; i++) {

            char x = w1[i-1];

            for (int j = 1; j <= n; j++) {
                if (x == w2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }
        return m + n - 2 * dp[m][n];
    }
}
```

### 最长递增子序列

这里涉及到求一个有序数组中大于等于某个数的最小值的下标：

```java
public int lowerBound(int[] nums, int target) {
    int left = 0;
    int right = nums.length; // 注意这里是 nums.length 而不是 nums.length - 1

    while (left < right) { // 当 left == right 的时候，退出循环
        int mid = left + (right - left) / 2; // 防止溢出
        if (nums[mid] < target) {
            left = mid + 1;
        } else {
            right = mid; // nums[mid] >= target，mid 有可能是答案
        }
    }
    return left;
}
```

完全解答：

我们维护一个数组`tails[]`：

- `tails[i]`表示长度为`i+1`的递增子序列中，结尾最小的那个数。
- 为什么维护“最小的结尾”？因为结尾越小，后面越容易接上更大的数，从而组成更长的递增序列。

时间复杂度：O(n log n)

```java
class Solution {
    public int lengthOfLIS(int[] nums) {

        // 贪心 + 二分解法
        // 维护一个数组tail[]
        int[] tails = new int[nums.length];
        int size = 0;
        for(int num : nums) {
            int left = 0;
            int right = size;

            while(left < right) {
                int mid = (left + right) / 2;
                if(tails[mid] < num) {
                    left = mid + 1;
                } else {
                    right = mid;
                }
            }
            tails[left] = num;
            if(left == size) size++; // num比所有的数都大，增加序列的长度
        }
        return size;
    }
}
```

### *交错字符串

给定三个字符串 `s1`、`s2` 和 `s3`，判断 `s3` 是否由 `s1` 和 `s2` 交错组成。交错：保持原有字符顺序，但可以交替取字符。

---

设 `dp[i][j]` 表示 `s1` 的前 `i` 个字符和 `s2` 的前 `j` 个字符，能否组成 `s3` 的前 `i+j` 个字符。

**状态转移方程：**

```java
dp[i][j] = true，如果满足：
    （1）dp[i-1][j] == true 且 s1.charAt(i-1) == s3.charAt(i+j-1)
 或 （2）dp[i][j-1] == true 且 s2.charAt(j-1) == s3.charAt(i+j-1)
```

* `dp[0][0] = true`：空串可以构成空串
* 首行：只取 `s2` 来组成 `s3` 前 j 个字符
* 首列：只取 `s1` 来组成 `s3` 前 i 个字符

---

* 时间复杂度：O(m × n)
* 空间复杂度：O(m × n)，可以优化为一维数组（滚动数组）

```java
class Solution {
    public boolean isInterleave(String s1, String s2, String s3) {
        int m = s1.length();
        int n = s2.length();
        if (s3.length() != m + n)
            return false;
        // 设 dp[i][j] 表示 s1 的前 i 个字符和 s2 的前 j 个字符，能否组成 s3 的前 i+j 个字符。
        boolean[][] dp = new boolean[m + 1][n + 1];
        char[] s1_char = s1.toCharArray();
        char[] s2_char = s2.toCharArray();
        char[] s3_char = s3.toCharArray();

        dp[0][0] = true;

        // 第一行：仅 s2 用于组合
        for (int j = 1; j <= n; j++) {
            dp[0][j] = dp[0][j - 1] && s2_char[j - 1] == s3_char[j - 1];
        }

        // 第一列：仅 s1 用于组合
        for (int i = 1; i <= m; i++) {
            dp[i][0] = dp[i - 1][0] && s1_char[i - 1] == s3_char[i - 1];
        }

        // 遍历
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                char c = s3_char[i + j - 1];
                dp[i][j] = (dp[i - 1][j] && s1_char[i - 1] == c) || (dp[i][j - 1] && s2_char[j - 1] == c);
            }
        }
        return dp[m][n];
    }
}
```

### *不同的子序列

状态转移方程：

如果`s[i - 1] == t[j - 1]`，那么：

```
dp[i][j] = dp[i - 1][j - 1] + dp[i - 1][j]
```

第一项：用当前这个字符来匹配；第二项：忽略这个字符。

否则：

```
dp[i][j] = dp[i - 1][j]
```

```java
class Solution {
    public int numDistinct(String s, String t) {
        int m = s.length();
        int n = t.length();
        if(m < n) return 0;

        char[] s_char = s.toCharArray();
        char[] t_char = t.toCharArray();

        //dp[i][j] 表示：s 的前 i 个字符中有多少个子序列等于 t 的前 j 个字符。
        // dp[0][0] = 1：空串匹配空串
        // dp[i][0] = 1：任意字符串 s 的前 i 个字符匹配空字符串 t 的唯一方式是全都删掉
        // dp[0][j > 0] = 0：空字符串 s 无法匹配非空字符串 t

        int[][] dp = new int[m + 1][n + 1];

        // 初始化第一列 dp[i][0]
        for(int i = 0; i <= m; i++) {
            dp[i][0] = 1;
        }
        // 状态转移
        for(int i = 1; i <= m; i++) {
            for(int j = 1; j <= n; j++) {
                if(s_char[i - 1] == t_char[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + dp[i - 1][j];
                } else {
                    dp[i][j] = dp[i - 1][j];
                }
            }
        }
        return dp[m][n];
        
    }
}
```

### 目标和

把数组分成两个子集 P 和 N，其中 P 是加号部分，N 是减号部分。

```
sum(P) + sum(N) + sum(P) - sum(N) = target + sum
==> 2 * sum(P) = target + sum
==> sum(P) = (target + sum) / 2
```

于是问题转化为：从数组中选出一些元素，使它们的和等于`(target + sum) / 2`，问有多少种选法。

0/1 背包问题（每个数只能用一次），所以要**倒序遍历**。否则会让同一个数被重复使用，变成完全背包。

```java
class Solution {
    public int findTargetSumWays(int[] nums, int target) {
        // 记所有+的数字之和为p，所有-的数字之和为q
        int sum = 0;
        for (int num : nums) {
            sum += num;
        }
        if ((sum + target) % 2 != 0 || Math.abs(target) > sum)
            return 0;
        int p = (sum + target) / 2;
        // int q = (sum - target) / 2;
        // 现在的目的是求子集和为p的子集

        int[] dp = new int[p + 1];
        dp[0] = 1; // 和为 0 的方法只有一种：什么都不选

        for (int num : nums) {
            for (int i = p; i >= num; i--) {
                dp[i] += dp[i - num];
            }
        }
        return dp[p];

    }
}
```

- 时间复杂度：O(n * target)
- 空间复杂度：O(target)

## 卡特兰数专题

**卡特兰数（Catalan Number）** 相关的题目通常涉及一些特定的结构性计数问题，比如：

* 有效括号生成
* 不同的二叉搜索树
* 有效的出栈序列
* 组合数学中的递归计数问题

---


| 题号                                                                                  | 标题                                                 | 对应卡特兰结构           | 难度 |
| ----------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------- | -- |
| [22](https://leetcode.cn/problems/generate-parentheses/)                            | **Generate Parentheses**（括号生成）                     | 有效括号组合数           | 中等 |
| [96](https://leetcode.cn/problems/unique-binary-search-trees/)                      | **Unique Binary Search Trees**                     | 不同 BST 数目         | 中等 |
| [95](https://leetcode.cn/problems/unique-binary-search-trees-ii/)                   | **Unique Binary Search Trees II**                  | 不同 BST 结构（生成）     | 中等 |
| [331](https://leetcode.cn/problems/verify-preorder-serialization-of-a-binary-tree/) | **Verify Preorder Serialization of a Binary Tree** | 卡特兰式结构验证          | 中等 |
| [886](https://leetcode.cn/problems/possible-bipartition/)                           | **Possible Bipartition**                           | 不直接是卡特兰，但和图分割计数有关 | 中等 |
| [1191](https://leetcode.cn/problems/k-concatenation-maximum-sum/)                   | **K-Concatenation Maximum Sum**                    | 一些子问题涉及组合结构       | 中等 |

---

**推荐刷题顺序**：

1. **[22. 括号生成](https://leetcode.cn/problems/generate-parentheses/)**：递归回溯 + 卡特兰数结构
2. **[96. 不同的二叉搜索树](https://leetcode.cn/problems/unique-binary-search-trees/)**：DP + 卡特兰数（只算个数）
3. **[95. 不同的二叉搜索树 II](https://leetcode.cn/problems/unique-binary-search-trees-ii/)**：递归生成所有结构
4. **[331. 验证二叉树的前序序列化](https://leetcode.cn/problems/verify-preorder-serialization-of-a-binary-tree/)**：验证有效结构（考察卡特兰括号匹配思想）

---

#### 括号生成

数字`n`代表生成括号的对数，请你设计一个函数，用于能够生成所有可能的并且 有效的 括号组合。

思路：回溯

最后的结果中应当包含`n`个`(`和`n`个`)`，不妨用`left`和`right`来记录剩余需要的括号数量，每生成一个就减一。

对于`left`来说，只要剩余的还大于零，就尝试添加左括号；对于`right`，只要剩余的右括号比左括号多，就添加右括号。

```java
class Solution {
    public List<String> generateParenthesis(int n) {
        List<String> res = new ArrayList<>();
        fn(n, n, new StringBuilder(), res);
        return res;
    }

    private void fn(int left, int right, StringBuilder path, List<String> res) {
        if(left == 0 && right == 0) {
            res.add(path.toString());
            return;
        }
        if(left > 0) {
            fn(left - 1, right, path.append("("), res);
            path.deleteCharAt(path.length() - 1);
        }
        if(left < right) {
            fn(left, right - 1, path.append(")"), res);
            path.deleteCharAt(path.length() - 1);
        }
    }
}
```




