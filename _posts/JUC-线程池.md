---
title: JUC-线程池部分源码&API总结
tags:
  - 并发
date: 2025-07-18 19:20:27
index_img:
categories: JUC
---

## 线程池简介

Java中的线程池是运用场景最多的并发框架，几乎所有需要异步或者并发执行任务的程序都可以使用线程池。

Java线程池按照以下步骤处理任务：

1. 优先使用核心线程
2. 核心线程满了使用工作队列
3. 工作队列满了使用非核心线程
4. 都满了执行拒绝策略

![线程池的主要处理流程](https://s21.ax1x.com/2025/07/16/pV1bCGD.png)

**线程池在系统中的应用**：

- Web服务器处理HTTP请求
- 数据库连接和IO操作，例如查询和插入数据库、文件读写操作、Netty实用线程池处理网络事件
- 异步任务处理，例如 RabbitMQ、Kafka 消息队列的消费者使用线程池处理消息
- 计算密集场景，例如并行计算：Fork/Join框架、parallel streams底层使用线程池

## ThreadPoolExecutor基本源码

![ThreadPoolExecutor执行示意图](https://s21.ax1x.com/2025/07/16/pV1bixH.png)

ThreadPoolExecutor 执行`execute`方法分为四种情况，依据当前运行的线程数量：

1. 少于`corePoolSize`
2. 大于等于`corePoolSize`，且阻塞队列还没满
3. 阻塞队列已经满了
4. 线程池能容纳的最大线程数也不够了

其中1，2步会先获取全局锁，然后创建新线程。这样设计的目的是尽量减少获取锁的次数，提高效率。

**预热**，指的是当前运行的线程数大于等于`corePoolSize`，此时几乎所有的获取线程操作都会走第二步，排队等着拿到线程。注意核心线程是始终保持活动的，而非核心线程只在任务高峰期创建，空闲一段时间`keepAliveTime `后就会被销毁。

不管是核心线程还是非核心线程，一旦被创建并成功加入线程池的`workers`集合中，它们都会进入一个循环——反复从任务队列中获取任务来执行，直到被终止为止。

### 线程池状态

这一部分属于`ThreadPoolExecutor`的基本字段，如下：

```java
private final AtomicInteger ctl = new AtomicInteger(ctlOf(RUNNING, 0));
private static final int COUNT_BITS = Integer.SIZE - 3; // 也就是29
private static final int COUNT_MASK = (1 << COUNT_BITS) - 1; 
// COUNT_MASK 是掩码常量，用于移位
// COUNT_MASK 的低29位全是1，其余为0

// runState is stored in the high-order bits
private static final int RUNNING    = -1 << COUNT_BITS;
private static final int SHUTDOWN   =  0 << COUNT_BITS;
private static final int STOP       =  1 << COUNT_BITS;
private static final int TIDYING    =  2 << COUNT_BITS;
private static final int TERMINATED =  3 << COUNT_BITS;
```

用一个原子整数`ctl`的`高3位`保存**线程池的状态**`runState`；`低29位`保存`workerCount`，表示有效的线程数量，即**已经启动但还没有结束的线程数量**。

`runState`**是线程池生命周期控制的核心，其取值包括**：

- `RUNNING`（**运行中**）：接受新任务，并处理队列中的任务。
- `SHUTDOWN`（**关闭中**）：不接受新任务，但处理队列中已有的任务。
- `STOP`（**停止**）：不接受新任务，不处理队列任务，并中断正在执行的任务。
- `TIDYING`（**整理中**）：所有任务都已终止，workerCount 为 0，负责转入该状态的线程将执行`terminated()`钩子方法。
- `TERMINATED`（**已终止**）：terminated() 钩子方法已执行完毕。

这些状态的数值顺序很重要，用于实现有序比较。runState 的值是单调递增的，但不会保证每个状态都会经历一遍。

---

**状态转移路径如下：**

- `RUNNING` → `SHUTDOWN`：调用 `shutdown()` 方法。
- `RUNNING` 或 `SHUTDOWN` → `STOP`：调用 `shutdownNow()` 方法。
- `SHUTDOWN` → `TIDYING`：当任务队列为空且线程池为空时。
- `STOP` → `TIDYING`：当线程池为空时。
- `TIDYING` → `TERMINATED`：`terminated()` 钩子方法执行完毕时。
调用 `awaitTermination()` 等待的线程会在状态变为 `TERMINATED` 时返回。

---

**用于装箱/拆箱`ctl`的方法：**

```java
// Packing and unpacking ctl
private static int runStateOf(int c)     { return c & ~COUNT_MASK; }
private static int workerCountOf(int c)  { return c & COUNT_MASK; }
private static int ctlOf(int rs, int wc) { return rs | wc; }
```

`COUNT_MASK`的低 29 位全是`1`，逐一来看：

- `runStateOf(int c)`取出整数`c`的高 3 位，即线程池的状态`runState`；
- `workerCountOf(int c)`取出低 29 位，即有效线程数量；
- `ctlOf`: `rs`代表线程池状态，`wc`代表有效线程的数量，按位或即可拼接成`int`形式的`ctl`（还没有转化成原子整数）。

### execute()

**方法概述**

`execute()`方法是线程池执行任务的入口点，它会根据当前线程池状态决定如何处理提交的任务。**按优先级处理任务**：

1. 优先使用核心线程
2. 核心线程满了使用工作队列
3. 工作队列满了使用非核心线程
4. 都满了执行拒绝策略

![执行任务示意图](https://s21.ax1x.com/2025/07/16/pV1qs1g.png)

已经在注释中标出：

```java
public void execute(Runnable command) {
    if (command == null)
        throw new NullPointerException();

    int c = ctl.get(); // 获取原子整数的int值

    // 1. 工作线程数小于核心线程数，则创建线程并执行当前任务：
    if (workerCountOf(c) < corePoolSize) {
        if (addWorker(command, true)) // true表示创建核心线程
            return;
        // 如果创建成功直接返回，失败则重新获取状态继续后续步骤
        c = ctl.get();
    }

    // 2. 线程池处于RUNNING状态，尝试将任务加入队列
    if (isRunning(c) && workQueue.offer(command)) {
        // 成功将任务加入队列
        // 双重检查
        int recheck = ctl.get(); 
        if (! isRunning(recheck) && remove(command))
            reject(command);
        else if (workerCountOf(recheck) == 0)
            addWorker(null, false);
    }
    // 3. 队列已满，创建非核心线程处理命令
    else if (!addWorker(command, false))
    // 4. 如果创建失败，说明线程池已饱和或关闭，执行拒绝策略
        reject(command);
}
```

第二步的细节比较多，下面再补充说明几句。

第二步尝试将任务加入队列，通过判断后，继续采用**双重检查**的方式，目的是防止在多线程条件下的竞态条件：

- 任务入队后线程池可能被关闭
- 任务入队后所有工作线程可能都终止了

相应对策：

- 重新检查线程池状态(`! isRunning(recheck)`)，如果已关闭则移除任务(`remove(command)`)并拒绝(`reject(command);`)
- 如果工作线程数为0，创建一个非核心线程来处理队列中的任务`addWorker(null, false);`

另外，关于最后当工作线程数为 0 时为什么调用`addWorker(null, false);`：

因为第二步的判断条件中已经把当前任务加入了队列，所以现在需要的不是再次提交这个任务，而是确保**有工作线程**来处理队列中的任务，所以当最后发现工作线程数为0时，添加命令为`null`；又因为前面逻辑上我们已经"尝试过"创建核心线程了，现在应该按照正常的扩容逻辑创建非核心线程，所以第二个参数为`false`。

回顾一下线程池的设计哲学：

```
核心线程 -> 队列 -> 非核心线程 -> 拒绝策略
```

判断到这一步发现工作线程为0，只能说明原来的核心线程死亡了，即便如此也不能破坏上边这个顺序，这里只能创建非核心线程。

---

最后补充一下`addWorker()`方法的简化原理：

```java
private boolean addWorker(Runnable firstTask, boolean core) {
    // 简化版本
    for (;;) {
        int c = ctl.get();
        int rs = runStateOf(c);
        int wc = workerCountOf(c);
        
        // 检查线程数限制
        if (wc >= (core ? corePoolSize : maximumPoolSize))
            return false;
            
        // 线程数合法，创建工作线程...
    }
}
```

- `core = true`：检查是否超过`corePoolSize`
- `core = false`：检查是否超过`maximumPoolSize`

以及`Worker`的简化工作流程：

```java
// 简化的Worker工作流程
class Worker {
    Worker(Runnable firstTask) {
        this.firstTask = firstTask;
    }
    
    public void run() {
        Runnable task = firstTask;  // 首先执行传入的任务
        firstTask = null;
        
        while (task != null || (task = getTask()) != null) {  // 然后从队列获取任务来执行
            task.run();
            task = null;
        }
    }
}
```

### 构造方法

```java
public ThreadPoolExecutor(int corePoolSize,
                            int maximumPoolSize,
                            long keepAliveTime,
                            TimeUnit unit,
                            BlockingQueue<Runnable> workQueue) {
    this(corePoolSize, maximumPoolSize, keepAliveTime, unit, workQueue,
            Executors.defaultThreadFactory(), defaultHandler);
}
```

- `corePoolSize`：最大核心线程数，每提交到一个任务到线程池都会创建一个核心线程，直到满为止。也叫线程池的基本大小。
- `maximumPoolSize`：线程池可容纳的最大线程数，包含核心线程数和非核心线程数。
- `keepAliveTime`：非核心线程空闲后，保持存活的时间，如果空闲超过这个时间就会被销毁。核心线程即使一直空闲也不会被销毁
- `unit`：上面时间的单位
- `workQueue`：工作队列（阻塞队列）

值得注意的是一共有 4 个重载的构造方法，传入的参数也不同。还有两个参数在上面没有展示出来：

- `RejectedExecutionHandler handler`：饱和策略，当队列和线程池都满了的时候，必须采用一种策略去处理提交的任务，默认情况下是抛出异常，也可以自定义。
- `ThreadFactory threadFactory`：用于设置创建线程的工厂，可以通过线程工厂给每个创建出来的线程设置更有意义的名字。

## 静态工厂方法

静态工厂方法提供了一些快速使用线程池模板的途径。

### 固定大小线程池

`newFixedThreadPool`创建一个固定大小的线程池

```java
public static ExecutorService newFixedThreadPool(int nThreads) {
    return new ThreadPoolExecutor(nThreads, nThreads,
                                    0L, TimeUnit.MILLISECONDS,
                                    new LinkedBlockingQueue<Runnable>());
}
```

- `nThreads`指定核心线程的数量
- 没有非核心线程，无需超时时间
- 阻塞队列是可选无界的，可以放任意数量的任务。链式队列通常比基于数组的队列具有更高的吞吐量，但在大多数并发应用中性能较难预测。

不推荐使用。

### 带缓存的线程池

```java
public static ExecutorService newCachedThreadPool(ThreadFactory threadFactory) {
    return new ThreadPoolExecutor(0, Integer.MAX_VALUE,
                                    60L, TimeUnit.SECONDS,
                                    new SynchronousQueue<Runnable>(),
                                    threadFactory);
}
```

- 无核心线程，只有非核心线程，**按需创建**
- 最大空闲时间`60s`
- `SynchronousQueue`：一个**不存储元素**的阻塞队列，每一个`put()`操作，必须等待另一个线程的`take()`操作配对完成，否则就会阻塞，反之亦然。
  
适合任务比较密集，每个任务的执行时间比较短的情况。

### 单线程线程池

```java
public static ExecutorService newSingleThreadExecutor() {
    return new FinalizableDelegatedExecutorService
        (new ThreadPoolExecutor(1, 1,
                                0L, TimeUnit.MILLISECONDS,
                                new LinkedBlockingQueue<Runnable>()));
}
```

- 1个核心线程，无非核心线程
- `LinkedBlockingQueue`表现为无界

适合多个任务排队进行。与自己手动创建一个线程相比，单线程线程池可以保证就算线程因为某些原因挂掉，也能立刻重新重建一个线程，保证始终有可用的线程。

### 任务调度线程池

```java
public static ScheduledExecutorService newScheduledThreadPool(int corePoolSize) {
    return new ScheduledThreadPoolExecutor(corePoolSize);
}
```

创建一个线程池，可以调度命令在**指定延迟**后运行，或定期执行。

- 参数：`corePoolSize` – 保留在池中的线程数，都是核心线程
- 返回：新创建的调度线程池

向线程池提交**一次性**任务的方法（重载了两个）：

```java
public ScheduledFuture<?> schedule(Runnable command,
                                    long delay, TimeUnit unit);

public <V> ScheduledFuture<V> schedule(Callable<V> callable,
                                        long delay, TimeUnit unit);
```

注意：任务中发生的异常会被吞掉，直接终止对应线程而不会抛出异常。

示例代码：

```java
@Slf4j(topic = "c.TestSchedule")
public class TestSchedule {
    public static void main(String[] args) {
        ScheduledExecutorService pool = Executors.newScheduledThreadPool(2);
        log.debug("start");

        pool.schedule(() -> {
            log.debug("Task1");
            try {
                Thread.sleep(2000);
            } catch (InterruptedException e) {
                throw new RuntimeException(e);
            }
        }, 1, TimeUnit.SECONDS);

        pool.schedule(() -> {
            log.debug("Task2");
        }, 1, TimeUnit.SECONDS);
        
    }
}
```

```
10:20:13.902 [main] c.TestSchedule - start
10:20:14.918 [pool-1-thread-2] c.TestSchedule - Task2
10:20:14.918 [pool-1-thread-1] c.TestSchedule - Task1
```

也可以设置**周期任务**：（只能是无返回值的任务）

```java
public ScheduledFuture<?> scheduleAtFixedRate(Runnable command,
                                                long initialDelay,
                                                long period,
                                                TimeUnit unit);
```

提交一个周期性操作，该操作首先在给定的初始延迟后启用，然后周期性被调用。

`period`指的是从上一次任务的开始时间到下一次任务的开始时间之间的间隔。如果人物本身的执行时间大于这个间隔，那么会在上一个任务结束后马上执行下一个，不会重叠。

设置固定延时`delay`的方法，`delay`是上一个任务的终止到下一个任务的开始之间的固定时间间隔。

```java
public ScheduledFuture<?> scheduleWithFixedDelay(Runnable command,
                                                     long initialDelay,
                                                     long delay,
                                                     TimeUnit unit);
```

---

## 线程池API

### 向线程池提交任务

从JDK5开始，工作单元与执行机制分离开来。工作单元包括：`Runnable`和`Callable`，执行机制由`Executor`框架提供。

`execute()`用于提交不需要返回值的任务，无法判断任务是否被线程池执行成功。输入的任务是一个`Runnable`实例。举个例子：

```java
ThreadPoolExecutor executor = new ThreadPoolExecutor(
        1, 3, 60L, TimeUnit.SECONDS,
        new LinkedBlockingQueue<>(1)  // 容量为1的队列
);

// 提交第一个任务：创建核心线程
executor.execute(() -> {
    System.out.println("Task 1 by core thread");
    throw new RuntimeException("Core thread dies!");
});
```

---

`submit()`用于提交需要返回值的任务，线程池返回一个`Future`类型的对象。`get()`方法会**阻塞当前线程直到任务完成**，也可以设置超时时间。

```java
public class Test2 {
    public static void main(String[] args) throws ExecutionException, InterruptedException {
        ThreadPoolExecutor executor = new ThreadPoolExecutor(
                1, 3, 60L, TimeUnit.SECONDS,
                new LinkedBlockingQueue<>(1)  // 容量为1的队列
        );
        Future<String> res = executor.submit(() -> {
            try {
                Thread.sleep(1000);
                return "end";
            } catch (InterruptedException e) {
                throw new RuntimeException(e);
            }
        });

        System.out.println(res.get());
    }
}
```

**一次性提交多个任务，返回所有结果**

```java
<T> List<Future<T>> invokeAll(Collection<? extends Callable<T>> tasks)
    throws InterruptedException;
```

`invokeAll()`方法可以**一次性提交一组任务**（只能是 Callable），并等待所有任务执行完成，然后返回包含每个任务执行结果的 Future 对象集合。适合有一批并发任务需要同时提交，然后在所有任务都完成之后统一处理结果的场合。示例：

```java
public class Test2 {
    public static void main(String[] args) throws ExecutionException, InterruptedException {
        ThreadPoolExecutor executor = new ThreadPoolExecutor(
                1, 3, 60L, TimeUnit.SECONDS,
                new LinkedBlockingQueue<>(1)  // 容量为1的队列
        );

        List<Future<Object>> futures = executor.invokeAll(Arrays.asList(
                () -> {
                    System.out.println("Task 1 by core thread");
                    return "OK1";
                },
                () -> {
                    System.out.println("Task 2 by core thread");
                    return "OK2";
                }
        ));

        Thread.sleep(1000);

        futures.forEach((res) -> {
            try {
                System.out.println(res.get());
            } catch (InterruptedException | ExecutionException e) {
                throw new RuntimeException(e);
            }
        });
    }
}
```

**一次提交多个任务，返回最快的结果**

`invokeAny`：提交所有任务，返回最快结果。**只有一个返回值**。返回结果后，其他任务立刻取消。


### 关闭线程池

- `shutdown()`：拒绝新的任务提交，已经提交的任务（包括正在执行的和等待执行的）会继续处理完。线程池会等待所有任务执行完毕后关闭，是一种**温和的关闭方式**。
- `shutdownNow()`：不会等待正在执行的任务完成，强制关闭。

调用两者任意一个，`isShutdown`就会返回`true`。当所有的任务都关闭以后，调用`isTerminaed`方法会返回`true`。

## 合理配置线程池

- **CPU密集型任务**：主要耗费 CPU 资源，几乎不涉及 I/O 操作，CPU 始终在执行指令，线程基本不会被阻塞。例如：数学计算、图像处理、加解密等。线程数推荐：核数+1
- **IO密集型任务**：任务大部分时间在等待外部 I/O 设备响应，例如读取大文件、HTTP请求、数据库查询和写入。线程经常阻塞，应当尽量多开线程。
- **混合型任务**：将其拆分成CPU密集型任务和IO密集型任务
- 建议使用有界队列
- 优先级不同的任务可以使用优先级队列处理
