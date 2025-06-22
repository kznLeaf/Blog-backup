---
title: Java集合底层源码
date: 2025-04-12 19:59:07
index_img:
categories: Java SE
---

# ArrayList

`ArrayList`是 Java 中基于数组实现的一个可变长度的动态数组，它实现了`List`接口。位置：`java.util.ArrayList`

Java 8及之后的版本：

**底层数据结构**：

创建一个Object数组，默认为空数组（懒汉式）

```java
transient Object[] elementData; // 实际存储元素的数组
private int size;               // 当前元素个数（不是数组长度）
```

**构造方法**

```java
// 默认构造函数
public ArrayList() {
    this.elementData = DEFAULTCAPACITY_EMPTY_ELEMENTDATA;
}

// 指定初始容量
public ArrayList(int initialCapacity) {
    if (initialCapacity > 0) {
        this.elementData = new Object[initialCapacity];
    } else if (initialCapacity == 0) {
        this.elementData = EMPTY_ELEMENTDATA;
    } else {
        throw new IllegalArgumentException("Illegal Capacity: "+
                                           initialCapacity);
    }
}
```

- 默认构造函数用于扩容为默认大小10，**只有第一次添加元素时才扩容**。
- 带参的构造函数用于自己指定初始大小。

**添加元素**

```java
public boolean add(E e) {
    ensureCapacityInternal(size + 1); // 确保容量足够
    elementData[size++] = e;
    return true;
}
```

- `size`表示添加元素之前已有的元素数量，`size+1`即添加之后所需要的最小容量
- `ensureCapacityInternal`用于判断是否需要扩容，如果需要扩容，那么`elementData`扩容为`elementData = Arrays.copyOf(elementData, newCapacity);`，是原来的1.5倍，旧数组拷贝到新数组。

扩容操作的源码如下：

```java
private void ensureCapacityInternal(int minCapacity) {
    //如果第一次添加的元素数量和默认长度10做对比，取较大的数
    if (elementData == DEFAULTCAPACITY_EMPTY_ELEMENTDATA) {
        minCapacity = Math.max(DEFAULT_CAPACITY, minCapacity);
    }
    //后续添加元素的时候使用下面这个判断
    ensureExplicitCapacity(minCapacity);
}

private void ensureExplicitCapacity(int minCapacity) {
    modCount++;
    //如果所需最小容量大于现有容量，则扩容
    if (minCapacity - elementData.length > 0)
        grow(minCapacity);
}

// 扩容逻辑
private void grow(int minCapacity) {
    int oldCapacity = elementData.length;
    int newCapacity = oldCapacity + (oldCapacity >> 1); // 扩容1.5倍
    if (newCapacity - minCapacity < 0)//1.5倍仍然不够用的话就直接取元素的长度
        newCapacity = minCapacity;
    if (newCapacity - MAX_ARRAY_SIZE > 0)//极端情况特殊处理
        newCapacity = hugeCapacity(minCapacity);
        //拷贝旧数组到原数组
    elementData = Arrays.copyOf(elementData, newCapacity);
}
```

**删除元素**

```java
public E remove(int index) {
    Objects.checkIndex(index, size);//检查index是否越界，抛出异常
    final Object[] es = elementData;//为了写法更短、性能稍微好一点

    //忽略编译器的泛型转换警告，将es强转为泛型类型E
    @SuppressWarnings("unchecked") E oldValue = (E) es[index];
    fastRemove(es, index);//将index+1及其后面的元素全部向前挪动一位，覆盖要删除的元素，最后一位记为null

    return oldValue;//返回oldvalue
}
```

- E是泛型类型参数，用来表示`ArrayList`中存储的元素的类型。

**ArrayList的查找和（尾部）添加元素效率高，删除和插入操作效率低**。




