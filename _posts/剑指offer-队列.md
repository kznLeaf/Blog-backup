---
title: 剑指offer-队列
date: 2025-06-01 23:22:23
index_img:
categories:
hide: true
---


# 队列

## 题目链接

**队列的应用**

P122 数据流中的移动平均值，VIP尊享

P123 [最近的请求次数](https://leetcode.cn/problems/number-of-recent-calls/description/)

**二叉树的广度优先搜索**

如果关于二叉树的面试题提到层这个概念，那么基本上可以确定该题目需要运用广度优先搜索。这一部分的题都比较简单。

P126 [完全二叉树插入器](https://leetcode.cn/problems/complete-binary-tree-inserter/description/) 重点在如何优化

P130 [在每个树行中找最大值](https://leetcode.cn/problems/find-largest-value-in-each-tree-row/description/)

P133 [找树左下角的值](https://leetcode.cn/problems/find-bottom-left-tree-value/description/)

P134 [二叉树的右视图](https://leetcode.cn/problems/binary-tree-right-side-view/)



## Hard&VIP

### 数据流中的移动平均值

> 请实现如下类型`MovingAverage`，计算滑动窗口中所有数字的平均值，该类型构造函数的参数确定滑动窗口的大小，每次调用成员函数`next`时都会在滑动窗口中添加一个整数，并返回滑动窗口中所有数字的平均值。 

```java
class MovingAverage {     
    public MovingAverage(int size); 
    public double next(int val); 
} 
```

很简单，答案：

```java
public class MovingAverage {
    private final Queue<Integer> queue;
    private final int capacity; 
    private int sum; 

    public MovingAverage(int size) {
        queue = new LinkedList<Integer>();
        capacity = size;

    }

    public double next(int val) {
        queue.offer(val);
        sum += val;
        if (queue.size() > capacity) {
            Integer removed = queue.poll();
            if (removed != null) { //
                sum -= removed; // 这里是为了避免IDEA出现检查警告才多判断一步的
            }
        }
        return sum * 1.0 / queue.size();
    }

}
```