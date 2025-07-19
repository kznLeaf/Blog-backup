---
title: JUC-synchronized关键字
tags:
  - 并发
date: 2025-07-17 21:18:16
index_img:
categories: JUC
---


## 共享问题

- 多个线程访问**共享资源**，进行读写操作时发生指令的交错就会发生问题。
- 一段代码块内如果存在对共享资源的读写操作，称这段代码块为**临界区**。
- 多个代码在临界区内运行，由于代码的执行序列不同而导致结果无法预测，称之发生了**竞态条件**。

如何避免临界区的互斥条件的发生？两种方法：

1. 阻塞式的解决方法：`synchronized` `Lock`
2. 非阻塞式的：原子变量

## synchronized

`synchronized`：对象锁，同一时刻只能有一个线程持有对象锁，无法获取这个锁的线程就会被阻塞。

语法：

```java
synchronized(对象) {
    临界区
}
```

使用示例：

```java
@Slf4j(topic = "c.SynchronizedTest")
public class SynchronizedTest {
    static int counter = 0;
    static final Object lock = new Object();

    public static void main(String[] args) throws InterruptedException {
        Thread t1 = new Thread(() -> {
            for (int i = 0; i < 5000; i++) {
                synchronized (lock) {
                    counter++;
                }
            }
        });
        Thread t2 = new Thread(() -> {
            for (int i = 0; i < 5000; i++) {
                synchronized (lock) {
                    counter--;
                }
            }
        });

        t1.start();
        t2.start();
        t2.join();
        t1.join();

        log.debug("counter = {}", counter);
    }
}
```

打印结果为`0`。

**为什么锁必须是引用数据类型**：`synchronized`的底层机制依赖于对象头中的`Monitor`（监视器）锁结构。每个 Java 对象（引用类型）都有一个对象头，包含一些元信息，其中一部分用于实现锁（`Mark Word`）。基本类型没有对象头，无法存储锁的信息，JVM 不支持。

> Mark Word，在64位虚拟机中占据64个比特，用于存储对象自身的运行时数据，包括堆对象布局、类型、GC 状态、同步状态和身份哈希码的基本信息。

---

`synchronized`也可以用来修饰**方法**，等价于锁住了`this`对象，也就是**当前实例**，也就是说，每个对象实例各自有自己的锁。

```java
public synchronized void test() {

}

等价于:

public void test() {
    synchronized {

    }
}
```

如果用来修饰**静态方法**，等价于锁住了**类对象**（`xxx.class`）。

## 常见线程安全类

这里的线程安全指：多个线程调用它们同一个实例的某个方法时，是线程安全的。也可以理解为：

1. 他们的每个方法是原子的
2. 但是注意他们的多个方法的组合不是原子的

常见的线程安全类如`String`、包装类都属于不可变类。以`String`为例，`String.substring()`方法返回的是一个新的`String`对象，根本没有改动原对象的值。

`String`类是被`final`修饰的，如果`String`不是`final`，任何人都可以写一个子类改变 `String`的行为，从而破坏它的不可变性。这样一来，原本安全可预期的`String`行为就会崩溃。

## 复习：Java对象内存布局

Java对象保存在堆中时，由以下三部分组成：

![对象的内存布局](https://s21.ax1x.com/2025/05/31/pV9uJ1A.png)

### 对象头（Object Header）

1. **Mark Word**，在64位虚拟机中占据64个比特，用于存储对象自身的运行时数据，包括堆对象布局、类型、GC 状态、同步状态和身份哈希码的基本信息
2. **Klass Pointer**，类型指针，指向它的类型元数据，用于确定该对象是哪个类的实例。
3. **对于数组对象，还有一块用于存储数组长度的区域**。因为以后的JVM 需要进行边界检查、GC 需要知道对象占多大空间等等，数组长度的值是要被多次使用的，所以数组对象自身必须也保存一个长度。

64位JVM的Mark Word结构：

![Mark Word](https://s21.ax1x.com/2025/05/31/pV9Koa8.png)

### 实例数据（Instance Data）

实例数据是对象真正存储的有效信息，包括：

- 从父类继承的各种类型的字段
- 在子类中定义的各种类型的字段

如果对象没有属性字段，那么这里不会有信息。

### 对齐填充（Padding）

并非必要信息，起到占位符的作用，原因是Java的自动内存管理系统要求对象的起始地址必须是 8 字节的整数倍，而对象的实例数据可能不满足，所以需要对齐填充一下。

至于为什么起始地址会有这个要求:[^1]

{% note success %}  
字段内存对齐的其中一个原因，是让字段只出现在同一CPU的缓存行中。如果字段不是对齐的，那么就有可能出现跨缓存行的字段。也就是说，该字段的读取可能需要替换两个缓存行，而该字段的存储也会同时污染两个缓存行。这两种情况对程序的执行效率而言都是不利的。其实对其填充的最终目的是为了计算机高效寻址。  
{% endnote %}  

## synchronized在Monitor层面的原理

Monitor 被翻译为监视器/管程，是操作系统中的一种同步机制，是一个封装了很多东西的抽象结构，可以把它看作是带有**互斥锁**机制和**条件变量**机制的对象。具备三要素：

- 互斥锁`Mutex Lock`：保证同一时间只有一个线程进入 Monitor 内执行临界区代码
- 等待队列`WaitSet`：存放已经进入 Monitor、但因为条件不满足而等待的线程。
- 入口队列`EntryList`：其他尝试进入 Monitor、但发现已经有线程持有锁而被阻塞的线程。

每个 Java 对象都可以关联一个 Monitor 对象，使用`synchronized`给对象加上互斥锁之后，如果获取锁成功，2bit 锁标志位会被置为`10`，MarkWord 的前62位都会被替换为指向互斥锁的指针，这个线程成为`Owner`。如果获取锁失败，这个线程就进入了 Monitor 的阻塞队列`EntryList`，处于`BLOCKED`阻塞状态。

![synchronized机制](https://s21.ax1x.com/2025/07/12/pVlUib8.png)

解锁流程：按照 Monitor 的地址找到 Monitor 对象，设置 Owner 为 null，唤醒队列中的 BLOCKED 线程。

## synchronized关键字在字节码层面的原理

对于**同步代码块**，编译器会生成`monitorenter`和`monitorexit`指令：

```java
public class MyTest {
    public static void main(String[] args) {
        synchronized (MyTest.class) {

        }
    }
}
```

`main`方法的字节码为：

```
0 ldc #2 <com/kzn/test/synchronous/MyTest>  // 从常量池加载Class对象到栈顶
2 dup                                       // 复制栈顶的Class对象引用
3 astore_1                                  // 将复制的引用存储到局部变量1
4 monitorenter                              // 获取监视器锁（使用栈顶的Class对象）
5 aload_1                                   // 加载局部变量1（为monitorexit准备）
6 monitorexit                               // 释放监视器锁
7 goto 15                                   // 跳转到return，正常结束
10 astore_2                                 // 存储异常对象到局部变量2
11 aload_1                                  // 加载监视器对象引用
12 monitorexit                              // 释放监视器锁（确保异常时也释放）
13 aload_2                                  // 重新加载异常对象
14 athrow                                   // 抛出异常
```

- 类锁机制：`ldc`加载了类锁对象
- 双重释放：`monitorexit`调用两次，保证在正常情况和异常情况都能释放。
- `monitorenter`消耗栈顶的对象引用
- `monitorexit`也需要相同的对象引用
- 两个`monitorexit`使用的都是同一个对象引用（局部变量1），确保了锁的获取和释放操作的对象一致性。

总结：

1. 先加载锁对象到栈顶，获取到锁对象的引用
2. 然后将锁对象的引用复制一份储存到局部变量1中
3. 获取锁，消耗栈顶的锁对象的引用，同时将锁对象的 Mark Word 的高62位替换成指向互斥锁的指针
4. 加载局部变量1，也就是锁对象的引用，准备释放锁
5. 释放监视器锁





