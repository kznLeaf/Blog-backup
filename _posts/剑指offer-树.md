---
title: 剑指offer-树&堆-力扣链接合集+Hard题解
date: 2025-05-23 22:55:56
index_img:
categories: Algorithm
hide: true
---

# 树

注意：每一项之前的页号是**PDF文档的页号**，而非书的内页标明的页号，这样处理是为了快速定位电子书的对应位置。

## 题目链接

**二叉树**

P143 [二叉树剪枝](https://leetcode.cn/problems/binary-tree-pruning/)

P145 [*序列化和反序列化二叉树](https://leetcode.cn/problems/serialize-and-deserialize-binary-tree/description/)

P147 [求根节点到叶节点数字之和](https://leetcode.cn/problems/sum-root-to-leaf-numbers/description/)

P148 [路径总和 III](https://leetcode.cn/problems/path-sum-iii/description/)

P150 [*二叉树中的最大路径和](https://leetcode.cn/problems/binary-tree-maximum-path-sum/description/?envType=study-plan-v2&envId=top-100-liked)

---

**二叉搜索树**

P153 [二叉树展开为链表](https://leetcode.cn/problems/flatten-binary-tree-to-linked-list/description/) 书上要求按照中序遍历的顺序，力扣要求前序遍历

P155 二叉搜索树的下一个节点（即后继节点），题号510，付费题目，相应知识点参见[这个视频](https://www.bilibili.com/video/BV1Lv4y1e7HL/?spm_id_from=333.788.videopod.episodes&vd_source=918a6909c997fbaf818d1fbc55d65ca9&p=167)

P157 [把二叉搜索树转换为累加树](https://leetcode.cn/problems/convert-bst-to-greater-tree/description/)

P159 [二叉搜索树迭代器](https://leetcode.cn/problems/binary-search-tree-iterator/description/)

P161 [两数之和 IV - 输入二叉搜索树](https://leetcode.cn/problems/two-sum-iv-input-is-a-bst/description/)

---

**TreeSet 和 TreeMap 的应用**

[基础知识](/2025/05/08/Java%E5%90%8E%E7%BB%AD%E9%97%AE%E9%A2%98%E8%A1%A5%E5%85%85/#treeset%E5%92%8Ctreemap)

P166 [*存在重复元素 III](https://leetcode.cn/problems/contains-duplicate-iii/description/)

P168 [我的日程安排表 I](https://leetcode.cn/problems/my-calendar-i/description/)

# 堆

堆经常用来解决在数据集合中找出 k 个最大值或最小值相关的问题。通常用最大堆找出数据集合中的 k 个最小值，用最小堆找出数据集合中的 k 个最大值。

P178 [前 K 个高频元素](https://leetcode.cn/problems/top-k-frequent-elements/description/)

P176 [数据流的第k大数字](https://leetcode.cn/problems/kth-largest-element-in-a-stream/description/)

P178 [前k个高频元素](https://leetcode.cn/problems/top-k-frequent-elements/description/)

P180 [查找和最小的 K 对数字](https://leetcode.cn/problems/find-k-pairs-with-smallest-sums/)

# 前缀树

前缀树，又称为字典树，它用一个树状的数据结构存储一个字典中的所有单词。前缀树是一棵多叉树，一个节点可能有多个子节点。前缀树中除根节点外，每个节点表示字符串中的一个字符，而字符串由前缀树的路径表示。前缀树的根节点不表示任何字符。

P186 [实现 Trie (前缀树)](https://leetcode.cn/problems/implement-trie-prefix-tree/description/)

P191 [单词替换](https://leetcode.cn/problems/replace-words/description/)

P192 [*实现一个魔法字典](https://leetcode.cn/problems/implement-magic-dictionary/description/)

P194 [*单词的压缩编码](https://leetcode.cn/problems/short-encoding-of-words/description/)

P198 [键值映射](https://leetcode.cn/problems/map-sum-pairs/description/)

P200 [数组中两个数的最大异或值](https://leetcode.cn/problems/maximum-xor-of-two-numbers-in-an-array/description/) 前缀树+贪心


# Hard

## 序列化和反序列化二叉树

相当硬核的题目。

P134

[题目链接](https://leetcode.cn/problems/serialize-and-deserialize-binary-tree/description/)

请设计一个算法将二叉树序列化成一个字符串，并能将该字符串反序列化出原来二叉树的算法。 

剑指offer采用的是dfs的方式，但是力扣上限值必须按照和力扣二叉树规范相同的层序遍历完成。这里遵循力扣的规定。

参考：https://support.leetcode.cn/hc/kb/article/1567641/

### 序列化

采用层序遍历必然会用到队列`Queue`。基本思路就是使用`StringBuilder`负责拼接，刚开始先拼一个`[`，在层序遍历的过程中每遇到一个`null`就添加为字符串`"null"`，否则拼接数值。处理完毕后使用`replaceAll()`和正则表达式去除多余的`null`。

```java
/**
 * 将一个二叉树序列化为力扣的格式，如本例：[1,2,3,null,null,4,5]
 * @param root 二叉树的根节点
 * @return 序列化的字符串
 */
public String serialize(TreeNode root) {
    if(root == null) return "[]";

    Queue<TreeNode> queue = new LinkedList<>();
    queue.offer(root);
    StringBuilder sb = new StringBuilder();

    // 处理开头
    sb.append("[");

    // 核心代码
    while(!queue.isEmpty()) {
        TreeNode node = queue.poll();
        if(node == null) {
            sb.append("null,");
            continue;
        }
        sb.append(node.val).append(",");
        queue.offer(node.left);
        queue.offer(node.right);
    }

    // 处理多余的null
    String res = sb.toString();
    String result = res.replaceAll("(null,)+$", "");
    if(result.endsWith(","))
        result = result.substring(0, result.length()-1);
    return result+"]";
}
```

### 反序列化

先将序列化的结果分割成数组。观察该数组，除了第一个头节点以外，剩下的节点都是左节点和右节点**交替排列**的，这是由二叉树的特征决定的。利用这个特性，在循环中拿到父节点之后先添加左孩子，再添加右孩子，每次添加之前检查`i`是否已经遍历完和新节点是否为空，否则不再添加新节点。

```java
// Decodes your encoded data to tree.
    public TreeNode deserialize(String data) {
        if (data.equals("[]")) return null;

        // 分割字符串
        String[] values = data.substring(1, data.length() - 1).split(",");
        // 利用根节点的值建树
        TreeNode root = new TreeNode(Integer.parseInt(values[0]));

        Queue<TreeNode> queue = new LinkedList<>();
        queue.offer(root);

        int i = 1; // i 用于标记已处理的节点个数
        while (!queue.isEmpty()) {
            TreeNode node = queue.poll();// node 是父节点，建树只能从上到下

            // 先左
            if (i < values.length && !values[i].equals("null")) {
                node.left = new TreeNode(Integer.parseInt(values[i]));
                queue.offer(node.left);
            }
            i++;

            // 后右
            if (i < values.length && !values[i].equals("null")) {
                node.right = new TreeNode(Integer.parseInt(values[i]));
                queue.offer(node.right);
            }
            i++;
        }

        return root;
    }

```

这道题的测试流程是：将一个给定的二叉树输入你写的序列化函数，然后将序列化函数的输出结果送给反序列化函数，检查最后的输出。所以这两个方法只要有一个写错了就无法通过测试（汗）。

## 二叉树中的最大路径和

> 二叉树中的 路径 被定义为一条节点序列，序列中每对相邻节点之间都存在一条边。同一个节点在一条路径序列中 至多出现一次 。该路径 至少包含一个 节点，且不一定经过根节点。
> 
> 路径和 是路径中各节点值的总和。
> 
> 给你一个二叉树的根节点 root ，返回其 最大路径和 。

```java
class Solution {
    // 后序遍历
    public int maxPathSum(TreeNode root) {
        fn(root);
        return result;
    }
    int result = Integer.MIN_VALUE;

    private int fn(TreeNode root) {
        if(root == null) return 0;

        // 找左右子树路径之和的最大值
        int leftMax = Math.max(0, fn(root.left));
        int rightMax = Math.max(0, fn(root.right));

        // 根节点
        result = Math.max(result, root.val + leftMax + rightMax);
        
        return root.val + Math.max(leftMax, rightMax);
    }
}
```

这里返回值的选择要从父节点的角度考虑，毕竟后序遍历是从子节点向上传到父节点的。

当路径到达某个节点时，该路径既可以前往它的左子树，也可以前往它的右子树。但如果路径同时经过它的左右子树，那么就不能经过它的父节点。所以返回值能够向上传，要么该路径是经过了当前节点与左子树，要么是经过了当前节点与右子树。因此取当前节点的值与左右子树中较大的那一个子路径和的求和结果。

## 存在重复元素 III

P166 [存在重复元素 III](https://leetcode.cn/problems/contains-duplicate-iii/description/)

**解法一**：`TreeSet`，时间复杂度：$O(n\log{\rm{indexDiff }})$

遍历数组，因为只需要把数组完整地遍历一遍即可，所以假设`i`始终大于`j`。每次循环都从`set`寻找大小与`nums[i]`**最相近**的两个值，也就是`lower`和`upper`，判断它们是否满足`abs(nums[i] - nums[j]) <= valueDiff`即可。循环的最后将数组的值放入`set`，并把超出索引范围的数移除，维护set中的数字个数始终不大于`indexDiff`。

```java
class Solution {
    public boolean containsNearbyAlmostDuplicate(int[] nums, int indexDiff, int valueDiff) {
        TreeSet<Long> set = new TreeSet<>();

        for (int i = 0; i < nums.length; i++) {
            // 小于等于nums[i]的最大的键
            Long lower = set.floor((long) nums[i]);
            if (lower != null && ((long) nums[i] - lower) <= valueDiff) {
                return true;
            }
            // 大于等于nums[i]的最小键
            Long upper = set.ceiling((long) nums[i]);
            if (upper != null && (upper - (long) nums[i] <= valueDiff)) {
                return true;
            }
            // 把数组值加入set
            set.add((long) nums[i]);
            // 超过范围则移除
            if (i - indexDiff >= 0) {
                set.remove((long) nums[i - indexDiff]);
            }
        }
        return false;
    }
}
```



**解法二**：**桶排序法**，时间复杂度$O(n)$


1. 按大小将元素映射到桶中
每个桶的大小为`valueDiff + 1`，因为如果两个数在同一个桶中，它们的差值一定不超过`valueDiff`。定义：

- **一个桶最多包含一个元素**。
- **元素可能与“相邻桶”的元素差值也满足要求，所以还要检查相邻桶（ID-1和ID+1）**。

2. 滑动窗口大小为`indexDiff`
我们维护一个 `Map<bucketId, value>`，只保留最近 k 个元素的桶信息。

```java
class Solution {
    private long bucketSize = 0;

    public boolean containsNearbyAlmostDuplicate(int[] nums, int indexDiff, int valueDiff) {
        if(valueDiff < 0) return false;

        Map<Long, Long> buckets = new HashMap<>();
        bucketSize = (long)valueDiff + 1;

        for(int i = 0; i < nums.length; i++) {
            long num = (long) nums[i];
            long id = getBucketID(num);

            if(buckets.containsKey(id)) {
                // 已经存在这个桶
                return true;
            }

            // 检查相邻的桶
            if(buckets.containsKey(id - 1) && Math.abs(buckets.get(id - 1) - num) <= valueDiff ) {
                return true;
            }

            if(buckets.containsKey(id + 1) && Math.abs(buckets.get(id + 1) - num) <= valueDiff) {
                return true;
            }

            // 添加新值到桶中
            buckets.put(id, num);
            // 移除老旧的元素，维护滑动窗口的大小
            if(i >= indexDiff) {
                long oldID = getBucketID((long)nums[i - indexDiff]);
                buckets.remove(oldID);
            }
        }
        return false;
    }

    private long getBucketID(long num) {
        return num >= 0
        ? num / bucketSize
        : (num + 1) / bucketSize - 1;
    }
}
```

两种解法相同点：都使用**滑动窗口**，在每一次循环先判断是否符合答案要求，然后把新的元素加入窗口，最后把老旧的元素移出窗口。


## 路经总和 III

虽然不是Hard，但是因为很经典所以也放到这里了。

时间复杂度最优的解法是前缀和+前序遍历+回溯，这里使用`long`类型是因为测试用例比较刁钻，用`int`会溢出。

具体代码如下：

```java
class Solution {
    public int pathSum(TreeNode root, int targetSum) {
        //key-前缀和，value-该节点值之和的出现次数
        Map<Long, Integer> map = new HashMap<>();
        map.put(0L, 1);
        return fn(root, (long)targetSum, map, 0L);
    }

    // 递归函数
    // path: 当前路径的前缀和
    // 返回值：以当前节点为起点，符合题意的路径个数
    private int fn(TreeNode root, long targetSum, Map<Long, Integer> map, long path) {
        if(root == null) return 0;

        // 处理根节点
        // 计算前缀和
        path += root.val;
        // 获取目标值出现的次数，也就是符合条件的路径的个数
        int count = map.getOrDefault(path-targetSum, 0);
        // 更新哈希表 map 保存的累加节点值之和 path，及其出现的次数。
        map.put(path, map.getOrDefault(path, 0) + 1);

        // 递归左右子树
        count += fn(root.left, targetSum, map, path);
        count += fn(root.right, targetSum, map, path);

        // 回溯到原来的状态
        map.put(path, map.get(path) - 1);

        return count; // 将目标值出现的次数返回给父节点
    }
}
```

