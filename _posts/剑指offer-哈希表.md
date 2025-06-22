---
title: 剑指offer-哈希表
date: 2025-06-03 23:22:55
index_img:
categories:
hide: true
---



## 基础知识

哈希表有两个对应的类型，`HashSet`和 `HashMap`。如果每个元素都只有一个值，前者；如果每个元素都有映射，后者。

![HashSet常用函数](https://s21.ax1x.com/2025/06/02/pVCFkCt.png)

![HashMap常用函数](https://s21.ax1x.com/2025/06/02/pVCFi4I.png)

补充几个：

- `Set<K> keySet();`返回包含 map 中所有键的 Set 集合
- `Collection<V> values();`返回包含 map 中所有值的集合：`Collection<List<String>> values = groups.values();`
- `Set<Map.Entry<K, V>> entrySet();`返回 map 中的所有键值对构成的 Set 集合

尽管哈希表是很高效的数据结构，但这并不意味着哈希表能解决所有的问题。

- 如果用哈希表作为字典存储若干单词，那么只能输入完整的单词在字典中查找。
- 如果对数据集中的元素排序能够有助于解决问题，那么用 `TreeSet`或 `TreeMap`（第 8 章）可能更合适。
- 如果需要知道一个动态数据集中的最大值或最小值，那么堆（第 9 章）的效率可能更好。
- 如果希望能够根据前缀进行单词查找，如查找字典中所有以 `ex`开头的单词，那么应该用前缀树（第10章）作为实现字典的数据结构。

如果哈希表的键的数目是固定的，并且数目不太大，那么也可以用数组来模拟哈希表，数组的下标对应哈希表的键，而数组的值与哈希表的值对应。 


## 题目链接

P87 [O(1) 时间插入、删除和获取随机元素](https://leetcode.cn/problems/insert-delete-getrandom-o1/description/)

P90 [LRU缓存](https://leetcode.cn/problems/lru-cache/)

P94 [有效的字母异位词](https://leetcode.cn/problems/valid-anagram/)

P96 [字母异位词分组](https://leetcode.cn/problems/group-anagrams/)

P98 [验证外星语词典](https://leetcode.cn/problems/verifying-an-alien-dictionary/description/)




## 题解

### LRU缓存

用双向链表存储节点。哈希表存储节点的key和节点之间的映射关系，目的是快速根据key定位节点。

```java

class LRUCache {

    // 双向链表
    class ListNode {
        int key;
        int val;
        ListNode next;
        ListNode prev;
        public ListNode(ListNode prev,int val,ListNode next) {
            this.prev = prev;
            this.val = val;
            this.next = next;
        }

        public ListNode(int key, int val) {
            this.key = key;
            this.val = val;
        }
    }

    //哈希表，<key， 节点>
    private Map<Integer, ListNode> cache;
    private int capacity;// 缓存容量
    private ListNode head;
    private ListNode tail;

    // 初始化缓存容量和链表
    public LRUCache(int capacity) {
        this.capacity = capacity;
        this.cache = new HashMap<>();
        head = new ListNode(0,0);
        tail = new ListNode(0,0);
        head.next = tail;
        tail.prev = head;
    }
  
    public int get(int key) {
        if(!cache.containsKey(key))
        return -1;
        //获取这个键对应的节点
        ListNode node = cache.get(key);
        moveToHead(node);
        return node.val;
  
    }
  
    public void put(int key, int value) {
        //如果已经存在，就更新原来的值并且移动到头部
        if(cache.containsKey(key)) {
            ListNode target = cache.get(key);
            target.val = value;
            moveToHead(target);
        } else {
            // 创建新的节点
            ListNode newNode = new ListNode(key, value);
            // 把新节点加入哈希表
            cache.put(key, newNode);
            //把新的节点添加到头部
            addToHead(newNode);

            //判断缓存有没有满
            if(cache.size() > capacity) {
                removeTail();
            }
        }
  
    }

    // 把需要的节点添加到头部
    private void addToHead(ListNode target) {
        ListNode b = head.next;
        target.next = b;
        head.next = target;
        b.prev = target;
        target.prev = head;
    }

    //把节点移动到头部
    private void moveToHead(ListNode target) {
        ListNode prev = target.prev;
        ListNode nxt = target.next;
        prev.next = nxt;
        nxt.prev = prev;
        addToHead(target);
    }

    private void removeTail() {
  
        ListNode target = tail.prev;
        if(target == head) {
            return;
        }
        // 从链表移除节点
        ListNode prev = target.prev;
        ListNode nxt = target.next;
        prev.next = nxt;
        nxt.prev = prev;
        // 从哈希表移除节点
        cache.remove(target.key);
    }
}
```

### 有效的字母异位词加强版

这次使用的是**真哈希表**，可以处理包括中文字符在内的任意字符情况。时间复杂度和空间复杂度都是O(n)。

```java
public boolean isAnagram(String s1, String s2) {
    if (s1.length() != s2.length()) return false;
    Map<Character, Integer> map = new HashMap<>();

    for(char c : s1.toCharArray()) {
        map.put(c, map.getOrDefault(c, 0) + 1);
    }

    for(char c : s2.toCharArray()) {
        if(!map.containsKey(c) || map.get(c) == 0) return false;
        map.put(c, map.get(c) - 1);
    }
    return true;
}
```

### 验证外星语词典

叫它“外星语言是否排序 ”比较好。

如果输入n 个单词，每个单词的平均长度为m，那么该算法的时间复杂度是O(mn)，空间复杂度是O(1)。 

```java
class Solution {
    public boolean isAlienSorted(String[] words, String order) {
        // 将字典存储到数组中
        int[] dict = new int[26];

        for(int i = 0; i < order.length(); i++) {
            dict[order.charAt(i) - 'a'] = i;
        }

        for(int i = 0; i < words.length - 1; i++) {
            if(!isSorted(words[i], words[i+1], dict)) {
                return false;
            }
        }
        return true;
        
    }

    private boolean isSorted(String s1, String s2, int[] dict) {
        int length = Math.min(s1.length(), s2.length());

        for(int i = 0; i < length; i++) {
            if(s1.charAt(i) == s2.charAt(i)) continue;

            int index1 = s1.charAt(i) - 'a';
            int index2 = s2.charAt(i) - 'a';

            return dict[index1] <= dict[index2];
        }

        // 这里是精华。如果一个字符串是另一个字符串的前缀，那么这个作为前缀的字串肯定排在前面
        // 对于能走到这一步的字符串来说，就是比较短的哪一个
        return length == s1.length();
    }
}
```

### 最小时间差

挺有意思的一道题，典型的空间换时间。

`helper`用来从已经标记好的数组中找到最小的时间间隔。`prev`用来记录上一个索引，正常地遍历。考虑到相隔一天的时间，使用`first`和`last`来找到数组中的第一个数和最后一个数的索引，第一个索引加上一天的分钟数后再和第二个索引比较。循环结束后看看是正常遍历的时间间隔小还是隔天的时间间隔小。

```java
class Solution {
    public int findMinDifference(List<String> timePoints) {

        boolean[] minuteFlags = new boolean[1440];

        // 存在的时间标记为 1
        for (String s : timePoints) {
            String[] temp = s.split(":");
            int cur = Integer.parseInt(temp[0]) * 60 + Integer.parseInt(temp[1]);
            if (minuteFlags[cur]) {
                return 0;
            } // 这里做了优化
            minuteFlags[cur] = true;
        }
        return helper(minuteFlags);
    }

    private int helper(boolean[] minuteFlags) {
        int minDiff = minuteFlags.length - 1;
        int prev = -1;
        int first = minuteFlags.length - 1;
        int last = -1;

        for (int i = 0; i < minuteFlags.length; i++) {
            if (minuteFlags[i]) {
                if (prev >= 0) {
                    minDiff = Math.min(minDiff, i - prev);
                }
                prev = i;
                first = Math.min(first, i);
                last = Math.max(last, i);
            }
        }
        minDiff = Math.min(minDiff, first + minuteFlags.length - last);
        return minDiff;
    }
}
```
