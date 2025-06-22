---
title: 剑指offer-链表
date: 2025-06-07 23:41:35
index_img:
categories: 
hide: true
---

## 题目链接

**双指针**

P61 [删除链表的倒数第k个节点](https://leetcode.cn/problems/remove-nth-node-from-end-of-list/description/?envType=study-plan-v2&envId=top-100-liked)

P63 [环形链表 II](https://leetcode.cn/problems/linked-list-cycle-ii/?envType=study-plan-v2&envId=top-100-liked)

P66 [相交链表](https://leetcode.cn/problems/intersection-of-two-linked-lists/?envType=study-plan-v2&envId=top-100-liked)

**反转链表**

P69 [反转链表](https://leetcode.cn/problems/reverse-linked-list/?envType=study-plan-v2&envId=top-100-liked)

P71 [两数相加](https://leetcode.cn/problems/add-two-numbers/?envType=study-plan-v2&envId=top-100-liked)

P74 [重排链表](https://leetcode.cn/problems/reorder-list/description/)

P76 [回文链表](https://leetcode.cn/problems/palindrome-linked-list/?envType=study-plan-v2&envId=top-100-liked) 难度欺诈，起码得算中等难度吧

**双向链表和循环链表**

[扁平化多级双向链表](https://leetcode.cn/problems/flatten-a-multilevel-doubly-linked-list/description/) 递归

## 部分题解

几个套路模板：

1. **快慢指针找到链表的中间节点**

第一种写法：

```java
// 找中点
ListNode fast = head.next; // fast先走一步
ListNode slow = head;

while (fast.next != null && fast.next.next != null) {
    fast = fast.next.next;
    slow = slow.next;
}
```

- 偶数: `1 2 3 4` 则`slow`指向`2`，`fast`指向最后一个节点
- 奇数: `1 2 3 4 5` 则`slow`指向`2`，`fast`指向倒数第二个节点

即 slow 永远指向第二段链表的前一个节点，方便执行切割；并且可以根据`fast.next`是否为空来判断是奇数还是偶数。

第二种写法：

```java
ListNode fast = head;
ListNode slow = head;

while (fast != null && fast.next != null) {
    fast = fast.next.next;
    slow = slow.next;
}

// 如果 fast != null，说明是奇数个节点，跳过中间节点
if (fast != null) {
    slow = slow.next;
}
```

- 偶数: `1 2 3 4` 则`slow`指向`3`，`fast`为`null`
- 奇数: `1 2 3 4 5` 则`slow`指向`3`，`fast`指向最后一个节点

不太推荐这种，感觉不够直观，虽然后续的处理代码会简洁一点。

采用第一种写法的完整代码如下：

```java
// 分割两个链表，返回中间节点
private ListNode split(ListNode head) {
    ListNode slow = head;
    ListNode fast = head.next;
    while (fast.next != null && fast.next.next != null) {
        fast = fast.next.next;
        slow = slow.next;
    }
    ListNode head2 = slow.next; 
    slow.next = null;
    return head2;
}
```

2. **反转链表**

不多说

```java
private ListNode reverse(ListNode head) {
    ListNode prev = null;
    while (head != null) {
        ListNode temp = head.next;
        head.next = prev;
        prev = head;
        head = temp;
    }
    return prev;
}
```

### 两数相加

给你两个 非空 的链表，表示两个非负的整数。它们每位数字都是按照 逆序 的方式存储的，并且每个节点只能存储 一位 数字。

请你将两个数相加，并以相同形式返回一个表示和的链表。

你可以假设除了数字 0 之外，这两个数都不会以 0 开头。

```java
class Solution {
    public ListNode addTwoNumbers(ListNode l1, ListNode l2) {
        ListNode dummy = new ListNode(-1);
        ListNode cur = dummy;
        int carry = 0;

        while(l1 != null || l2 != null || carry != 0) {
            int v1 = l1 == null ? 0 : l1.val;
            int v2 = l2 == null ? 0 : l2.val;

            int sum = v1 + v2 + carry;
            carry = sum / 10;

            cur.next = new ListNode(sum % 10);
            cur = cur.next;
            // 移动节点
            if(l1 != null) l1 = l1.next;
            if(l2 != null) l2 = l2.next;
        }
        return dummy.next;
    }
}
```

### 重排链表

给定一个单链表 L 的头节点 head ，单链表 L 表示为：

> L0 → L1 → … → Ln - 1 → Ln

请将其重新排列后变为：

> L0 → Ln → L1 → Ln - 1 → L2 → Ln - 2 → …

不能只是单纯的改变节点内部的值，而是需要实际的进行节点交换。

思路是先把整个链表从中间切开，然后把后面那一段链表反转，最后把第一段链表和第二段反转后的链表交错连接起来。这道题没必要使用哨兵节点。

切开链表的过程可以使用快慢指针搞定，注意循环条件一般是`fast.next != null && fast.next.next != null`，但是在这道题里也可以是`fast != null && fast.next != null`，举个例子:

```
1 2 3 4 5 6
```

slow 指向4，断开链表后，第一段链表为`1 2 3 4`第二段链表为`5 6`，合并后变成`1 5 2 6 3 4`，特殊就特殊在，偶数情况下最中间两边的两个数在处理后仍然相邻。

```java
class Solution {
    public void reorderList(ListNode head) {
        if(head == null) return;
        // 第一步：找中间节点

        ListNode fast = head;
        ListNode slow = head;

        while(fast.next != null && fast.next.next != null) {
            fast = fast.next.next;
            slow = slow.next;
        }
        // 现在slow指向中间节点
        ListNode l2 = slow.next;
        // 这里一定要记得断开两个链表
        slow.next = null;
        ListNode p1 = head;

        // 反转l2
        ListNode p2 = reverse(l2);

        // 连接两个链表
        while(p1 != null && p2 != null) {
            ListNode temp1 = p1.next;
            ListNode temp2 = p2.next;

            p1.next = p2;
            p2.next = temp1;

            p1 = temp1;
            p2 = temp2;
        }

    }

    // 用于反转链表
    private ListNode reverse(ListNode head) {
        if(head == null) return null;
        ListNode cur = head;
        ListNode prev = null;

        while(cur != null) {
            ListNode temp = cur.next;
            cur.next = prev;
            prev = cur;
            cur = temp;
        }
        return prev;
    }

}
```

### 回文链表

先拆分，然后反转、比较即可。

```java
class Solution {
   public boolean isPalindrome(ListNode head) {
        if (head == null || head.next == null) return true;

        // 找中点
        ListNode fast = head.next; // fast先走一步
        ListNode slow = head;

        while (fast.next != null && fast.next.next != null) {
            fast = fast.next.next;
            slow = slow.next;
        }

        ListNode p1 = head;
        ListNode p2;

        // 如果是奇数节点，slow 会刚好到中间，fast 不为空
        if (fast.next == null) {
            // 偶数，无需跳过节点
            p2 = slow.next;
            slow.next = null;
        } else {
            // 奇数，跳过中间节点
            p2 = slow.next.next;
            slow.next = null;
        }

        // 反转后半部分
        ListNode secondHalf = reverse(p2);
        ListNode firstHalf = p1;

        // 比较前后两部分
        while(firstHalf != null && secondHalf != null) {
            if(firstHalf.val != secondHalf.val) {
                return false;
            }
            firstHalf = firstHalf.next;
            secondHalf = secondHalf.next;
        }

        return true;
    }

    private ListNode reverse(ListNode head) {
        ListNode prev = null;
        while (head != null) {
            ListNode temp = head.next;
            head.next = prev;
            prev = head;
            head = temp;
        }
        return prev;
    }
}
```