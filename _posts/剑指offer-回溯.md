---
title: 剑指offer-回溯
date: 2025-06-19 12:49:00
index_img:
categories:
hide: true
---

回溯有两种记录路径的方式：

- `List<Integer>` + `add` / `remove(size-1)`
- `Deque<Integer>` + `push` / `poll`

第一种用得最多。

---

**集合的组合、排列**


P237 [子集](https://leetcode.cn/problems/subsets/) start

P239 [组合](https://leetcode.cn/problems/combinations/description/) start

P240 [组合总和](https://leetcode.cn/problems/combination-sum/description/?envType=study-plan-v2&envId=top-100-liked)

P241 [组合总和II](https://leetcode.cn/problems/combination-sum-ii/description/) 涉及不重复结果时就先排序再剪枝

P243 [全排列](https://leetcode.cn/problems/permutations/) 从所有中人选，**需要记录状态**，避免重复选择

P244 [全排列II](https://leetcode.cn/problems/permutations-ii/)

**其他类型的问题**

用字符串存储路径时，考虑`StringBuilder() path`+`path.deleteCharAt(path.length() - 1);`

P246 [括号生成](https://leetcode.cn/problems/generate-parentheses/)

P247 [分割回文串](https://leetcode.cn/problems/palindrome-partitioning/description/)

P249 [复原IP地址](https://leetcode.cn/problems/restore-ip-addresses/description/)

## 题解

### 组合

给定两个整数 n 和 k，返回范围 [1, n] 中所有可能的 k 个数的组合。  
你可以按 任何顺序 返回答案。

---

题目中限定了组合的长度必须为`k`，所以要做两件事：

- 在`dfs`的开头先写终止条件，stack为`k`时就记录结果，结束递归；
- 在`for`循环中考虑剪枝，当剩余可用的数字个数不足时，直接结束循环。

这里记录路径用的是栈`ArrayDeque`。书上的题解写得不好理解

```java
public class Solution {
    public List<List<Integer>> combine(int n, int k) {
        List<List<Integer>> result = new ArrayList<>();
        dfs(1, n, k, new LinkedList<>(), result);

        return null;
    }

    private void dfs(int start, int n, int k, LinkedList<Integer> stack, List<List<Integer>> result) {
        if (stack.size() == k) {
            result.add(new ArrayList<>(stack));
            return;
        }
        for (int i = start; i < n; i++) {
            // n - i + 1 剩余可用数字个数
            // k - stack.size()  需要的数字个数
            // 剪枝：
            if (k - stack.size() > n - i + 1) {
                break;
            }
            stack.push(i);
            dfs(i + 1, n, k, stack, result);
            stack.pop(); // 回溯
        }
    }
}
```

### 子集

给你一个整数数组 nums ，数组中的元素 互不相同 。返回该数组所有可能的子集（幂集）。  
解集 不能 包含重复的子集。你可以按 任意顺序 返回解集。

---

子集的长度没有限制，所以`for`循环中**不需要再额外写终止条件**。

这次用`List`记录路径，用到了尾部添加和尾部删除这两个操作。

```java
class Solution {
    public List<List<Integer>> subsets(int[] nums) {
        List<List<Integer>> result = new ArrayList<>();
        if(nums.length == 0) {
            return result;
        }
        backtrack(0, nums, new ArrayList<>(), result);
        return result;
    }

    private void backtrack(int start, int[] nums, List<Integer> path, List<List<Integer>> res) {
        res.add(new ArrayList(path)); // 每一层都是一个子集，直接加入结果集

        for(int i = start; i < nums.length; i++) {
            path.add(nums[i]);
            backtrack(i + 1, nums, path, res);
            path.remove(path.size()-1);
        }
    }
}
```

### 组合总和II

```java
class Solution {
    public List<List<Integer>> combinationSum2(int[] candidates, int target) {
        List<List<Integer>> res = new ArrayList<>();

        Arrays.sort(candidates);

        dfs(0, candidates, target, new ArrayList<>(), res);
        return res;
        
    }

    private void dfs(int start, int[] candidates, int target, List<Integer> path, List<List<Integer>> res) {
        if(target < 0) {
            return;
        } else if (target == 0) {
            res.add(new ArrayList<>(path));
            return;
        } else {
            // target > 0
            for(int i = start; i < candidates.length; i++) {
                int c = candidates[i];

                // 剪枝1：提前判断是否合适
                if(target < c) break;
                // 剪枝2：跳过重复元素
                if(i > start && candidates[i] == candidates[i - 1]) {
                    continue;
                }
                path.add(c);
                dfs(i+1, candidates, target - c, path, res);
                path.remove(path.size() - 1);
            }
        }

    }
}
```

### 括号生成

```java
class Solution {
    public List<String> generateParenthesis(int n) {
        List<String> res = new ArrayList<>();

        fn(n, n, new StringBuilder(), res);
        return res;
    
    }

    // left: 还需要生成的 ( 的个数
    // right: 还需生成的 ) 的个数
    private void fn(int left, int right, StringBuilder path, List<String> res) {
        if(left == 0 && right == 0) {
            res.add(path.toString());
            return;
        }
        if(left > 0) {
            fn(left - 1, right, path.append("("), res);
            path.deleteCharAt(path.length() - 1);
        }
        // 只要现有的 ） 比 （ 少，就继续增加 ）
        if(left < right) {
            fn(left, right - 1, path.append(")"), res);
            path.deleteCharAt(path.length() - 1);
        }
    }
}
```

### 分割回文串

```java
class Solution {
    public List<List<String>> partition(String s) {
        List<List<String>> res = new ArrayList<>(); // 结果集合
        backtrack(s, 0, new ArrayList<>(), res);    // 回溯开始
        return res;
    }

    private void backtrack(String s, int start, List<String> path, List<List<String>> res) {
        if (start == s.length()) {
            res.add(new ArrayList<>(path)); // 添加一条合法路径
            return;
        }   

        for (int end = start; end < s.length(); end++) {
            if (isPalindrome(s, start, end)) {
                path.add(s.substring(start, end + 1)); // 添加回文子串
                backtrack(s, end + 1, path, res);      // 继续递归
                path.remove(path.size() - 1);          // 回溯
            }
        }
    }

    private boolean isPalindrome(String s, int left, int right) {
        while (left < right) {
            if (s.charAt(left++) != s.charAt(right--)) return false;
        }
        return true;
    }
}

```