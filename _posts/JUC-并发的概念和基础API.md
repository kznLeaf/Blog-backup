---
title: JUC-并发的概念和基础API
tags:
  - 并发
date: 2025-07-15 22:50:40
index_img:
categories: JUC
---

## 线程

### 简单使用

目标：创建线程对象、运行线程

方式一：只用Thread

```java
@Slf4j(topic = "c.ThreadTest")
public class ThreadTest {
    public static void main(String[] args) {

        Thread thread = new Thread(){
            @Override
            public void run() {
                log.debug("run");

            }
        };
        thread.setName("ThreadTest");
        thread.start();

        log.debug("main");
    }
}
```

方式二：Runnable + Thread

```java
@Slf4j(topic = "c.ThreadTest2")
public class ThreadTest2 {
    public static void main(String[] args) {
        Runnable r = new Runnable(){
            @Override
            public void run() {
                log.debug("running");
            }
        };
        Thread t = new Thread(r, "ThreadTest2");
        t.start();

    }
}
```

### Thread和Runnable的关系

本质上都是重写了了`Runnable`的`run`方法。

推荐使用第二种方式，把`Runnable`和线程对象分离，因为前者更容易和线程池等API结合，而且更灵活。

### FutureTask+Thread

FutureTask 间接实现了 Runnable 和 Future 接口，后者可以返回执行的结果（run 方法是没有返回值的）

FutureTask 可以传入 Callable 类型的参数。Callable 的 call 可以有返回值，也可以抛出异常，但是 Runnable 的 run 无返回值，也不会抛出异常。。

`FutureTask`的定义如下：

```java
public class FutureTask<V> implements RunnableFuture<V> {...}
```

其中泛型`V`指定将来返回值的类型。

`FutureTask`的构造方法既可以只传入一个`Callable`类型（自带返回值），也可以传入一个`Runnable`和一个`result`（用来指定返回值）。前者的构造方法如下：

```java
/**
 * Creates a {@code FutureTask} that will, upon running, execute the
 * given {@code Callable}.
 *
 * @param  callable the callable task
 * @throws NullPointerException if the callable is null
 */
public FutureTask(Callable<V> callable) {
    if (callable == null)
        throw new NullPointerException();
    this.callable = callable;
    this.state = NEW;       // ensure visibility of callable
}
```

传入的参数类型`Callable`是一个**函数式接口**，内部提供了带返回值的抽象方法`call`需要自己实现：
```java
@FunctionalInterface
public interface Callable<V> {
    /**
     * Computes a result, or throws an exception if unable to do so.
     *
     * @return computed result
     * @throws Exception if unable to compute a result
     */
    V call() throws Exception;
}
```

因为 FutureTask 实现了 Runnable 接口，所以Thread的这个构造方法

```java
public Thread(Runnable task){...}
```

也可以传入 FutureTask 类型。 

```java
@Slf4j(topic = "c.ThreadTest2")
public class ThreadTest2 {
    public static void main(String[] args) throws ExecutionException, InterruptedException {
        FutureTask<Integer> futureTask = new FutureTask<>(new Callable<Integer>() {
            @Override
            public Integer call() throws Exception {
                log.debug("run!");
                Thread.sleep(1000);
                return 10;
            }
        });
        Thread thread = new Thread(futureTask);
        thread.start();

        log.debug("{}", futureTask.get());
    }
}
```

运行结果：

```
09:17:22 [Thread-0] c.ThreadTest2 - run!
09:17:23 [main] c.ThreadTest2 - 10
```

## 线程运行的原理

每个线程由多个栈帧构成，对应当前方法。每个线程只能有一个活动栈帧。

线程的上下文切换：

- 线程的cpu时间片用完
- 垃圾回收
- 更高优先级的线程需要运行
- 线程自己调用了`sleep`等方法

发生线程的上下文切换时，需要cpu保存当前线程的状态，恢复另一个线程的状态。这一点要通过程序计数器来实现。程序计数器可以保存下一条jvm指令的执行地址，是线程私有的。

## 方法

- `start()` 让线程就绪，每个线程对象只能调用一次
- `run()` 线程启动后会调用`Runnable`的`run()`方法
- `join()` 等待线程运行结束
- `yield()` 线程主动放弃

### start&run

- 假设有一个线程`t1`，如果执行命令`t1.run()`，那么实际上是由`main`主线程调用了`run()`重写的方法，而不是`t1`线程。
- 必须用`t1.start()`启动`t1`线程，由这个新线程调用`run()`方法。

### sleep&yield

**sleep**

- 使当前线程进入`TIMED_WAITING`状态
- 可以使用`interrupt`打断睡眠，强制退出睡眠模式，并且抛出异常`java.lang.InterruptedException: sleep interrupted`
- 睡眠时间结束以后的线程未必会立刻执行，分到时间片才可以。
- 推荐使用`TimeUnit.SECONDS.sleep(1);`代替`Thread.sleep(1000)`，可读性更强。

**yield**

- 使当前线程进入`RUNNABLE`就绪状态，仍然可以被分配时间片。无参数。如果没有其他线程，这个线程仍然可以继续运行。
- 具体的实现依赖于操作系统的任务调度器

**线程优先级**

- 优先级的数字越大，表示优先级越高。优先级可以**提示**调度器优先执行这个线程。（不一定真的优先使用）。

**应用**：在无需锁同步的场景，使用`sleep`或者`yield`可以防止 cpu 过度空转：

```java
while(true) {
    try {
        Thread.sleep(50);
    } catch (InterruptedException e) {
        ...
    }
}
``` 

### join

#### 基本用法

```java
th.join()
```

作用是当前线程等待线程`th`运行结束后才会继续执行后面的代码。例如：

```java
@Slf4j(topic = "c.JoinTest")
public class JoinTest {
    static int r = 1;

    public static void main(String[] args) throws InterruptedException {
        Thread t1 = new Thread(() -> {
            try {
                Thread.sleep(1000);
                r = 10;
            } catch (InterruptedException e) {
                throw new RuntimeException(e);
            }
        });
        t1.start();
        t1.join();
        log.debug("r: {}", r);
    }
}
```

执行结果：

```
19:34:06 [main] c.JoinTest - r: 10
```

`t1.join();`迫使主线程等待`t1`结束，赋值完成后才打印日志，因此打印结果为`10`。

#### 同步和异步

上面代码的时序如下：

![流程图](https://s21.ax1x.com/2025/07/07/pVMrXhF.png)

何为同步？在本例中，`main`线程等待`t1`线程执行完毕返回结果之后才会继续运行，这就属于同步。反之，如果`main`不等另一个线程执行完就继续执行后面的命令，那就属于异步。

#### 最大等待时间

```java
thread.join(long n)
```

设置**最大等待时间**为`n`毫秒

### interrupt

- `sleep` `wait` `join`被打断时，抛出异常，打断标志位是`false`。
- 正常运行的线程被打断时不会停止运行，但是会置标志位`isInterrupted`为`true`。
- `isInterrupted()`获取标志位，并且不会清除标志位；`Interrupted()`获取标志位同时清除标志位，置为`false`

## 守护线程

默认情况下，Java线程需要等待所有的线程都运行结束后才会结束。但是，守护线程除外，不管守护线程的代码执行完没有，只要非守护线程走完了，程序就会结束。

```java
t1.setDaemon(true);
```

垃圾回收器线程就是一种守护线程。如果程序停止了，垃圾回收线程也会被停止。

## 线程的状态

五种状态的说法：

![五种状态](https://s21.ax1x.com/2025/07/08/pVMO534.png)

六种状态的说法：

![](https://s21.ax1x.com/2025/07/08/pVMXY24.png)

操作系统层面的阻塞属于`RUNNABLE`的类别。

## wait notify

### 原理

![](https://s21.ax1x.com/2025/07/12/pVlUib8.png)

- 如果某个线程拿到了某个对象的 Monitor 锁，就会成为Owner。
- 如果线程获取了锁，但发现**程序逻辑上无法继续执行，必须等待某个条件的变化**，需要我们主动调用`wait()`进入`WaitSet`，当逻辑满足时调用`notify()`唤醒。
- `BLOCKED` `WAITING`都处于阻塞状态，不占用 CPU 时间片。
- `BLOCKED`在锁释放的时候**被唤醒**；`WAITING`在执行`notify()`或者`notifyAll()`时被唤醒，唤醒后的线程会进入`EntryList`阻塞队列重新竞争。

### API

- `obj.wait()`让已经获取锁的线程进入`WaitSet`等待
- `obj.wait(long n)`设置一个超时时间`n`毫秒，超时强制唤醒
- `obj.notify()`从正在等待的线程中挑一个唤醒，不保证唤醒顺序
- `obj.norifyAll()`唤醒所有正在等待的线程

必须获得锁对象之后，才能调用这几个方法。示例：

```java
@Slf4j(topic = "c.TestWait")
public class TestWait {
    static final Object lock = new Object();

    public static void main(String[] args) throws InterruptedException {

        new Thread(() -> {
            synchronized (lock) {
                log.debug("第一个线程");
                try {
                    lock.wait();
                } catch (InterruptedException e) {
                    throw new RuntimeException(e);
                }
                log.debug("t1被唤醒");
            }
        }, "t1").start();

        new Thread(() -> {
            synchronized (lock) {
                log.debug("第二个线程");
                try {
                    lock.wait();
                } catch (InterruptedException e) {
                    throw new RuntimeException(e);
                }
                log.debug("t2被唤醒");
            }
        }, "t2").start();

        Thread.sleep(1000);
        log.debug("唤醒其他线程");
        synchronized (lock) {
            lock.notify(); // 唤醒一个线程
        }

    }
}
```

运行结果

```
13:12:39.383 [t1] c.TestWait - 第一个线程
13:12:39.385 [t2] c.TestWait - 第二个线程
13:12:40.387 [main] c.TestWait - 唤醒其他线程
13:12:40.387 [t1] c.TestWait - t1被唤醒
```

这时程序还没有推出，因为`t2`没有被唤醒。如果执行的是`lock.notifyAll();`程序可以正常结束。

`wait`和`sleep`的重要区别是前者会释放当前的锁，而后者不会。

### sleep和wait的区别

- sleep 是 Thread 方法，wait 是 Object 方法
- sleep 不需要和`synchronized`配合使用，但是 wait 需要和它配合使用
- `wait`会释放对象锁
- 它们的状态都是`TIMED_WAITING`

### 虚假唤醒

在 Java 多线程编程中，虚假唤醒（Spurious Wakeup） 是一个非常重要但容易被忽视的概念。

虚假唤醒指的是：线程在没有被`notify()`或`notifyAll()`显式唤醒的情况下，突然从`wait()`返回了。

换句话说，线程明明没有被人叫醒，也没有超时，却自己醒来了。

举例：

```java
synchronized (lock) {
    if (!condition) {
        lock.wait();  // ❌ 只判断一次
    }
    // 条件成立，开始执行
}
```

因为值判断了一次条件，所以被错误唤醒之后，不管条件是否成立都会继续执行。解决方法是把`if`换成`while`:

```java
synchronized (lock) {
    while (!condition) {
        lock.wait();  // 被挂起等待唤醒
    }
    // 条件成立，开始执行
}
``` 

## park unpark

都是`LockSupport.java`提供的两个底层线程阻塞/唤醒方法，它们是构建高级并发工具（如 AQS、ReentrantLock、CountDownLatch 等）的基础。相比`wait()`/`notify()`，它们更灵活、低级且**不需要同步块**。

`unpark`既可以在`park`之前调用，也可以之后。如果先调用`unpark(t)`，再`park()`，这个线程**不会被挂起**。

### 用法

- `LockSupport.park()`挂起**当前**线程
- `LockSupport.unpark(thread)`恢复**指定**线程

用法示例：

```java
@Slf4j(topic = "c.Park")
public class TestPark {
    public static void main(String[] args) throws InterruptedException {
        Thread t = new Thread(() -> {
            log.debug("Child thread parking...");
            LockSupport.park();  // 阻塞在这里
            log.debug("Child thread resumed!");
        });

        t.start();

        Thread.sleep(1000); // 主线程睡 1 秒

        log.debug("Main thread unparking child...");
        LockSupport.unpark(t); // 唤醒子线程
    }
}
```

输出：

```
20:27:12.106 [Thread-0] c.Park - Child thread parking...
20:27:13.119 [main] c.Park - Main thread unparking child...
20:27:13.119 [Thread-0] c.Park - Child thread resumed!
```

### 原理

每个线程内部都有一个“许可标志”：

- 初始为`false`
- `park()`调用时检查许可：
- 为`false`→ 阻塞
- 为`true`→ 消耗许可，继续执行
- `unpark(thread)`：设置该线程的许可为`true`

所以如果先调用`unpark`，该线程的许可已经为`true`，调用`park`不会再阻塞线程。





