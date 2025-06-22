---
title: Java SE(7)-集合框架
date: 2025-04-10 14:59:38
index_img:
categories: Java SE
---

修改历史：

- 2025/04/10 初次发布
- 2025/04/30 重新树立了结构，增加常用方法总结
- 2025/05/03 增加“如何将列表转换成特定类型的数组”部分

# Collection

**内存层面**需要针对多个数据进行存储，可以考虑的**容器**有：数组、集合类。

数组初始化后的长度不可变，存储数据为单一类型，可包含重复元素，不适用于不可重复的场景；可用的属性和方法都极少；不便删除和插入元素。

Java中的集合框架（Java Collections Framework，简称JCF）是一个 统一的架构，用于表示和操作一组对象。

Java集合框架体系：

- `java.util.Collection`:存储一个一个的数据
  - 子接口：**List**，存储**有序**的、**可重复**的数据（动态数组）
    - `ArrayList`,`LinkedList`,`Vector`
  - 子接口：**Set**，存储**无序**的、**不可重复**的数据（类似集合）
    - `HashSet`,`LinkedHashSet`,`TreeSet`
- `java.util.Map`:存储一对一对的数据
  - `HashMap`,`LinkedHashMap`,`TreeMap`,`Hashtable`,`Properties`



# List及其实现类

## 增强for循环

**作用**：遍历数组，集合

集合：底层使用迭代器

```java
    for (集合或数组的类型 临时变量 : 集合或数组变量) {
        操作临时变量的输出;
    }
```


## List及其实现类的特点

List存储有序的可重复的数据，动态数组，每增加一个对象容量就自动加一。

- ArrayList: List的**主要实现类**，底层使用Object[]数组存储，插入和删除数据时效率低
- LinkedList: 底层使用双向链表的方式存储，添加和查找数据时效率较低。适用于对集合中的数据进行频繁的删除和插入操作.
- Vector: 古老，不用

### `ArrayList`和普通数组的对比

| 特性           | ArrayList                        | 普通数组 (Array[])             |
|----------------|----------------------------------|--------------------------------|
| 长度           | 动态变化，可自动扩容            | 固定长度，创建后不可更改      |
| 添加元素       | 使用 `add()` 方法添加            | 需指定索引或使用循环添加      |
| 删除元素       | 使用 `remove()` 方法删除         | 不支持直接删除，需要移动元素 |
| 查找元素       | 使用 `get(index)` 获取元素       | 使用 `array[index]` 访问       |
| 是否支持泛型   | 支持，例如 `ArrayList<Integer>` | 不支持泛型                    |
| 是否支持基本类型 | 不支持，只能存对象（可装箱）     | 支持基本类型和对象类型        |
| 是否线程安全   | 默认**不是**线程安全的           | 不是线程安全                  |
| 使用场景       | 元素数量不确定、操作灵活         | 元素数量固定、结构简单        |

---

# Collection、List、ArrayList的对比：

| 特性             | Collection                    | List                                  | ArrayList                              |
|------------------|-------------------------------|----------------------------------------|-----------------------------------------|
| 类型             | 接口                          | 接口（继承自 Collection）              | 类（实现了 List 接口）                  |
| 是否可实例化     | ❌ 不能直接实例化             | ❌ 不能直接实例化                     | ✅ 可以直接实例化                       |
| 顺序性           | ❌ 不保证顺序（由子接口决定） | ✅ 保证元素顺序                       | ✅ 保证元素顺序                         |
| 是否允许重复     | ❓ 由具体实现决定              | ✅ 允许重复元素                       | ✅ 允许重复元素                         |
| 随机访问效率     | ❌ 无此功能                    | ✅ 有 `get(int)` 方法                | ✅ 快速随机访问（基于数组）            |
| 常见实现类       | List、Set、Queue 等            | ArrayList、LinkedList 等             | 自身是实现类                           |
| 典型使用场景     | 操作所有集合的通用方法        | 操作有序集合（如列表）               | 频繁查询、随机访问                     |
| 方法示例         | `add()`, `remove()`, `size()` | 加上 `get()`, `set()`, `indexOf()`等 | 同 List，同时还有优化的内部实现       |

# Set

## 实现类

`Set`接口是`Collection`接口的子接口：

```java
public interface Set<E> extends Collection<E> 
```

它存储**无序的不可重复的数据**。常用实现类：

- `HashSet`:**主要实现类**，底层使用`HashMap`，即数组+单向链表+红黑树
  - `LinkedHashSet`:`HashSet`的子类；在现有的结构的基础上又添加了一组双向链表，用于记录添加元素的先后顺序，便于频繁的查询操作。
- `TreeSet`:底层使用红黑树存储。可以按照添加元素的指定的属性大小顺序进行自动排序，从而进行有序遍历。
  - 底层：红黑树。可以按照指定的大小顺序自动排序。
  - 要求TreeSet中的元素必须是**同一个类型**，否则类型转换错误。
  - 处理对象比较方法，排序的标准就是自然排序或定制排序对应方法的返回值。如果是零则认为是相等，不添加新元素。
  - 不需要重写`hashCode()`和`equals()`方法。

**常用方法**：`Collection`中常用的方法，**无新增方法**。

主要作用：**去除重复数据**。

## 重写两个方法

添加到HashSet/LinkedHashSet中的元素的要求：元素所在的类要重写两个方法：`equal()`和`hashCode()`。

`hashmap`中依据`key`的`hash`值来确定`value`存储位置（hash值就是数组的索引），所以一定要重写`hashCode`方法；

而重写`equals`方法，是为了解决`hash`冲突：我们在重写`hashcode()`方法时已经尽量保证了哈希值不会重复，如果发现两个不同的`key`的`hash`值相同，那么就会调用`equals`方法，继续比较`key`值是否相同。

在存储时：如果`equals`结果相同，说明是同一个键，那么就覆盖更新`value`值；如果键不同，但是哈希值相同，就用`List`把他们都存储在同一个位置。在取出时：如果`equals`结果相同就直接返回当前`value`值，如果不同就遍历`List`中下一个元素。即要`key`与`hash`**同时匹配**才会认为是同一个`key`。

JDK中用于判断是否是同一个key的源码:`if(e.hash == hash && ((k = e.key) == key || (key != null && key.equals(k)))){ops;}`


# Map

## Map及其实现类对比

`java.util.Map`:存储一对一对的**键值对**.

```text
               ┌──────────────┐
               │   Map接口    │
               └─────┬────────┘
                     │
        ┌────────────┴─────────────┐
        │                          │
  ┌─────▼─────┐              ┌─────▼─────┐
  │ HashMap   │              │ SortedMap │（接口）
  └─────┬─────┘              └─────┬─────┘
        │                          │
┌───────▼────────┐           ┌─────▼─────┐
│ LinkedHashMap  │           │ TreeMap   │
└────────────────┘           └───────────┘

┌──────────────┐
│ Hashtable    │（古老的线程安全实现）
└─────┬────────┘
      │
┌─────▼─────┐
│Properties │（子类，专用于配置文件）
└───────────┘
```

| 特性             | HashMap                      | LinkedHashMap               | TreeMap                        | Hashtable                     | Properties                    |
|------------------|-------------------------------|------------------------------|--------------------------------|-------------------------------|-------------------------------|
| 所属接口         | Map                          | Map                         | Map, SortedMap, NavigableMap  | Map                          | Hashtable                    |
| 是否线程安全     | 否                            | 否                           | 否                             | 是                            | 是                            |
| 是否允许 null 键 | 是（最多一个）               | 是（最多一个）              | 否（键不能为 null）           | 否                            | 否                            |
| 是否有序         | 否                            | 有插入顺序                   | 有自然顺序或指定 Comparator    | 否                            | 否                            |
| 底层结构         | 哈希表                        | 哈希表 + 双向链表            | 红黑树                         | 哈希表                        | 哈希表                        |
| 性能             | 查询快，一般推荐              | 查询快，顺序操作性能略低     | 查询较慢，适合排序需求         | 查询快，但并发性能不佳        | 主要用于配置文件加载           |
| 用途             | 通用 Map 容器                | 保留插入顺序的 Map           | 需要排序的 Map                 | 早期线程安全 Map，已过时       | 存储配置信息（key/value 字符串）|

## HashMap

`HashSet`就是基于`HashMap`实现的。两者的对比如下：

| 特性         | `HashSet`                         | `HashMap`                                   |
|--------------|-----------------------------------|----------------------------------------------|
| 存储结构     | 只存储元素（作为键）              | 存储键值对（key-value）                     |
| 是否允许重复 | ❌ 不允许重复元素                 | ✅ 键不允许重复，值可以重复                |
| 内部实现     | 基于 `HashMap` 实现               | 使用数组+链表（或红黑树）实现               |
| 查找效率     | O(1)                               | O(1)                                         |
| 底层结构     | 实际是 `HashMap<E, Object>`       | 实际是 `HashMap<K, V>`                      |

`HashSet`中只存储元素（值），而不是键值对。

为了实现这一点，它把元素作为`HashMap`的键，用一个统一的对象（比如`PRESENT`）作为值。

所以其实每次你往`HashSet`添加一个元素时，它是在底层的`HashMap`中添加了一条键值对：
`map.put(element, PRESENT);`

---

- HashMap中的key用Set来存放，无序而且不允许重复，所以同一个Map对象所对应的类**需要重写hashCode和equals**。
- HashMap中的Value可重复、无序。**不强制重写任何方法**。
- 每一个键值对构成一个**entry**，所有的entry构成了一个Set集合

## TreeMap

- 底层使用红黑树，按照**key**指定的大小顺序排序。
- 需要考虑使用对象排序
- 必须是**同一个类型**的对象

## Properties

- Hashtable的子类
- 键和值都是String类型，用来处理属性文件







# Queue

队列(Queue)实现了一个先进先出的有序表。Queue只有两个操作：

- 把元素添加到末尾
- 从头部取出元素

接口`Queue`定义了以下几个方法：

- `size(): int`:返回队列中的元素的数量
- `add(E e)`: 添加元素到队尾，添加失败的话抛出`IllegalStateException`
- `offer(E e): boolean`: 添加元素到队尾，添加失败返回`false`。**更安全，推荐**
- `remove(): E`: 获取并移除队首元素，如果队列为空则抛异常`NoSuchElementException`
- `poll(): E`: 获取并移除队首元素，如果为空返回`null`。**更安全，推荐**
- `element(): E`: 获取但不移除队首元素，队列为空抛异常`NoSuchElementException`
- `peek(): E`: 获取但不移除队首元素，队列为空返回`null`。**更安全，推荐**

## LinkedList

```java
public class LinkedList<E>
    extends AbstractSequentialList<E>
    implements List<E>, Deque<E>, Cloneable, java.io.Serializable
```

`LinkedList`是最常用的实现类，底层使用双向链表的方式存储，添加和查找数据时效率较低。适用于对集合中的数据进行频繁的删除和插入操作。

注意`LinkedList`同时实现了`Queue`和`List`接口，使用时该用哪个用哪个。

## PriorityQueue

```java
public class PriorityQueue<E> extends AbstractQueue<E> implements java.io.Serializable
```

一个优先队列，元素的顺序按照**优先级的大小**排列，它并不遵循严格的先进先出。所谓优先级的大小，指的是它会根据提供的比较器对队列中的元素进行排序，或者使用自然排序（空构造器的情况）。

声明：

```java
Queue<E> q = new PriorityQueue<>();
```

上面的声明使用了空的构造器，这种情况下队列中的元素按照**自然排序**。也可以使用一个lambda表达式重写比较方法实现定制排序：

```java
    @Test
    public void test2() {

        PriorityQueue<Integer> pq = new PriorityQueue<>((a,b) -> b - a);

        pq.offer(5);
        pq.offer(1);
        pq.offer(3);

        while (!pq.isEmpty()) {
            System.out.println(pq.poll());  // 输出顺序：5, 3, 1
        }
    }
```

## Deque

```java
public interface Deque<E> extends Queue<E>, SequencedCollection<E>
```
{% note secondary %}
`Deque`是一个支持在队列两端插入和删除操作的线性集合。它的名字"deque"是"double ended queue"（双端队列）的简称。大部分`Deque`的实现对包含的元素的数量没有固定限制，但是这个接口也支持有容量限制的队列和无限容量队列。
{% endnote %}

### 实现类

| 实现类名称            | 说明                                  |
|------------------------|----------------------------------------|
| `ArrayDeque`           | 常用，基于数组，效率高，适合栈/队列操作 |
| `LinkedList`           | 也实现了 `Deque`，但效率略低             |
| `LinkedBlockingDeque`  | 线程安全，可设置容量限制（在并发场景使用） |

这里又出现了`LinkedList`。所以说使用`LinkedList`的时候最好使用它的接口来引用：

```java
// 不推荐的写法:
LinkedList<String> d1 = new LinkedList<>();
d1.offerLast("z");
// 推荐的写法：
Deque<String> d2 = new LinkedList<>();
d2.offerLast("z");
```

### 方法

**添加元素的方法**：

| 方法名           | 功能                       | 抛异常版本 | 安全返回版本 |
|------------------|----------------------------|------------|----------------|
| `addFirst(e)`    | 添加到队头（栈顶）         | ✅         | ❌（无）       |
| `offerFirst(e)`  | 添加到队头（栈顶）         | ❌         | ✅             |
| `addLast(e)`     | 添加到队尾（队列尾部）     | ✅         | ❌（无）       |
| `offerLast(e)`   | 添加到队尾（队列尾部）     | ❌         | ✅             |
| `add(e)`         | 默认添加到队尾（等同 `addLast`） | ✅     | ❌             |
| `offer(e)`       | 默认添加到队尾（等同 `offerLast`） | ❌     | ✅             |
| `push(e)`        | **栈操作**，添加到头部（等同 `addFirst`）| ✅     | ❌             |


**删除元素的方法**

| 方法名             | 功能                       | 抛异常版本 | 安全返回版本 |
|--------------------|----------------------------|------------|----------------|
| `removeFirst()`    | 删除并返回队头元素         | ✅         | ❌             |
| `pollFirst()`      | 删除并返回队头元素         | ❌         | ✅             |
| `removeLast()`     | 删除并返回队尾元素         | ✅         | ❌             |
| `pollLast()`       | 删除并返回队尾元素         | ❌         | ✅             |
| `remove()`         | 默认删除队头（等同 `removeFirst`） | ✅     | ❌             |
| `poll()`           | 默认删除队头（等同 `pollFirst`） | ❌     | ✅             |
| `pop()`            | **栈操作**，删除头部（等同 `removeFirst`） | ✅  | ❌             |


**查看元素的方法**

| 方法名             | 功能                       | 抛异常版本 | 安全返回版本 |
|--------------------|----------------------------|------------|----------------|
| `getFirst()`       | 获取队头元素               | ✅         | ❌             |
| `peekFirst()`      | 获取队头元素               | ❌         | ✅             |
| `getLast()`        | 获取队尾元素               | ✅         | ❌             |
| `peekLast()`       | 获取队尾元素               | ❌         | ✅             |
| `element()`        | 默认获取队头（等同 `getFirst`） | ✅     | ❌             |
| `peek()`           | 默认获取队头（等同 `peekFirst`） | ❌     | ✅             |

**其他方法**

| 方法名             | 功能说明                           |
|--------------------|------------------------------------|
| `isEmpty()`        | 判断队列是否为空                   |
| `size()`           | 返回当前元素数量                   |
| `contains(Object)` | 判断队列中是否包含指定元素         |
| `clear()`          | 清空所有元素                       |
| `iterator()`       | 从头到尾遍历                       |
| `descendingIterator()` | 从尾到头遍历                   |

## Stack

Stack(栈)的特点：后进先出，相当于把队列的一端堵死，只留一个出口。

使用Deque可以实现后进先出的栈操作：

```java
    @Test
    public void test3() {
        Deque<String> stack = new ArrayDeque<>();

        // push “压入” 栈操作添加到头部
        stack.push("A");
        stack.push("B");
        stack.push("C");

        // pop “弹出” 栈操作删除头部
        while (!stack.isEmpty()) {
            System.out.println(stack.pop()); // 输出顺序：C B A
        }

    }
```

当我们把Deque作为Stack使用时，注意只调用`push()`/`pop()`/`peek()`方法，不要调用`addFirst()`/`removeFirst()`/`peekFirst()`方法，这样代码更加清晰。


# Iterator

Iterator,获取迭代器的对象：`Iterator itr = 集合.iterator();`

遍历集合的所有元素：`itr.hasNext()`+`itr.next()`

![迭代器图解](https://i.imgur.com/uRaHFI0.png)

使用迭代器的好处在于，调用方总是以统一的方式遍历各种**集合**类型，而不必关心它们内部的存储结构。


# 集合框架常用方法总结

## Collection接口

`Collection`接口作为集合框架最上层的接口，所有的集合数据类型都可以使用其中定义的方法。如下：

| 方法签名 | 描述 |
|----------|------|
| `boolean add(E e)` | 向集合中添加一个元素 |
| `boolean addAll(Collection<? extends E> c)` | 将指定集合中的所有元素添加进来 |
| `void clear()` | 清空集合中所有元素 |
| `boolean contains(Object o)` | 判断集合中是否包含某个元素 |
| `boolean containsAll(Collection<?> c)` | 判断集合是否包含另一个集合中的所有元素 |
| `boolean isEmpty()` | 判断集合是否为空 |
| `Iterator<E> iterator()` | 返回一个迭代器，用于遍历集合元素 |
| `boolean remove(Object o)` | 删除集合中首次出现的指定元素 |
| `boolean removeAll(Collection<?> c)` | 删除集合中与指定集合中相同的所有元素 |
| `boolean retainAll(Collection<?> c)` | 仅保留集合中也包含在指定集合中的元素（交集） |
| `int size()` | 返回集合中元素的数量 |
| `Object[] toArray()` | 返回一个包含集合中所有元素的数组 |
| `<T> T[] toArray(T[] a)` | 返回一个包含集合中所有元素的指定类型数组 |


## List接口

![](https://s21.ax1x.com/2025/04/30/pEHswkT.png)

`List`作为一个接口，也是Collection的子接口。`Collection`定义的所有方法都可以继续使用，除此之外还有一些特有的方法：

| 方法签名 | 说明 |
|----------|------|
| `void add(int index, E element)` | 在指定索引插入元素 |
| `E get(int index)` | 获取指定索引的元素 |
| `E set(int index, E element)` | 替换指定索引位置的元素 |
| `E remove(int index)` | 删除指定索引处的元素 |
| `int indexOf(Object o)` | 返回元素首次出现的索引 |
| `int lastIndexOf(Object o)` | 返回元素最后一次出现的索引 |
| `ListIterator<E> listIterator()` | 获取支持双向遍历的迭代器 |
| `ListIterator<E> listIterator(int index)` | 从指定索引开始的 ListIterator |
| `List<E> subList(int fromIndex, int toIndex)` | 获取子列表 `[from, to)` |


## Set接口

`Set`接口也是`Collection`的子接口,但是它**没有额外定义新的方法**。

![](https://s21.ax1x.com/2025/04/30/pEHsNmq.png)

## Map接口

`Map`专门用于存储键值对，它与`Collection`接口无直接关联，常用方法如下：

| 方法签名 | 描述 |
|----------|------|
| `V put(K key, V value)` | 将指定的键值对插入到 Map 中（若键已存在则更新值，返回旧值） |
| `V get(Object key)` | 根据键获取对应的值 |
| `V remove(Object key)` | 根据键移除键值对，返回被删除的值 |
| `boolean containsKey(Object key)` | 判断是否包含指定键 |
| `boolean containsValue(Object value)` | 判断是否包含指定值 |
| `int size()` | 返回键值对数量 |
| `boolean isEmpty()` | 判断 Map 是否为空 |
| `void clear()` | 清空 Map 中所有内容 |
| `Set<K> keySet()` | 返回所有键的集合 |
| `Collection<V> values()` | 返回所有值的集合 |
| `Set<Map.Entry<K, V>> entrySet()` | 返回所有键值对的集合（每个 Entry 是一个键值对） |
| `V putIfAbsent(K key, V value)` | 如果键不存在，则插入键值对（JDK 1.8+） |

# 如何将列表转换成特定类型的数组

## 引入

先看一个例子：

```java
List<ListNode> TempList = new ArrayList<>();
...
ListNode[] lists = TempList.toArray(new ListNode[0]);
```

`lists`是一个用于存放`ListNode`数据的数组，`Templist`是一个存放`ListNode`元素的列表。最后一行代码实现了从`TempList`列表向数组的转化。这里的关键是`toArray`方法，实际上`List`接口中定义了两个`toArray`抽象方法，一个空参一个有参，定义分别如下：

```java
Object[] toArray();
<T> T[] toArray(T[] a);
```

为了搞清楚这两个方法如何使用，需要先介绍一下`runtime type`（运行时类型）和`compile type`（编译时类型）。

## 编译时类型和运行时类型

运行时类型，指的是对象在程序运行的过程中真实的类型。之所以强调“真实”，是因为Java中的多态使得编译器认为的类型和程序运行时的类型可能不一样，例如

```java
Animal a = new Dog();
``` 

所谓*编译看左边，运行看右边*，`a`的编译时类型是`Animal`，运行时类型是`Dog`。

## Java标准库提供的注释

先看空参方法`Object[] toArray();`：

> 按照正确的顺序（从第一个到最后一个）返回一个包含原列表中所有元素的数组。
>
> 返回的数组是“安全的”，意思就是说它不包含任何对原列表的引用，是完全独立于原列表的。你可以放心地修改它，不用担心会对原列表产生任何影响。
>
> 这个方法是基于数组的 API 和基于集合的 API 之间的桥梁。

`返回值`: 一个以正确的顺序包含列表中的所有元素的`Object`数组

这个方法的返回值类型固定为`Object[]`，在实际应用中需要手动强转成我们需要的类型，很不方便。于是就有了后面这个带参数的方法

---

`<T> T[] toArray(T[] a);`

> 照正确的顺序（从第一个到最后一个）返回一个包含原列表中所有元素的数组。返回数组的运行时类型与指定数组相同。如果该列表可以装入指定的数组中，则直接把它放进数组并返回；否则，会分配一个具有与指定数组相同运行时类型的新数组，其大小等于列表的大小。
>
> 如果指定的数组比原列表需要的空间还大，那么空缺位置会被赋值为`null`。（*仅当*调用者确认原列表中不包含任何`null`元素时，这个特性才有助于判断列表的长度）
>
> 就像`toArray()`方法一样，该方法是基于数组的 API 和基于集合的 API 之间的桥梁。此外，该方法允许对输出数组的运行时类型进行精确的控制，在某些情况下或许可以节省内存开销。
>
> 假设`x`是一个已知只包含字符串的列表。以下代码可以用于将列表转存到新分配的String数组中：
>
> `String[] y = x.toArray(new String[0]);`
>
> 注意`toArray(new Object[0])`与上面的`toArray()`完全相同。

`参数`: `a`- 指定数组，如果足够大，原列表的元素将被直接存入该数组；否则，会分配一个与之相同运行类型的新数组。

`返回值`: 一个包含列表元素的数组

`抛出`: `ArrayStoreException` - 如果指定数组的运行时类型不是每一个列表元素的父类型   
`NullPointerException` - 如果指定数组是`null`

---

Java标准库中给出的解释已经非常详细了。对于开头处的语句`ListNode[] lists = TempList.toArray(new ListNode[0]);`，形参`new ListNode[0]`的主要作用是**确定返回数组的运行时类型**，它作为我们给出的指定数组，其容量为0，显然是不够用的，所以会分配一个运行时类型为`ListNode[]`的新数组，其容量等于列表的大小。然后，把返回的数组赋给相同类型的数组`lists`就没有任何问题了。