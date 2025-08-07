---
title: 操作系统-虚拟化CPU知识梳理
tags:
  - 操作系统
date: 2025-08-07 23:17:20
index_img: https://s21.ax1x.com/2025/08/07/pVaMftU.jpg
categories: 
---

《操作系统导论》官网：https://pages.cs.wisc.edu/~remzi/OSTEP/

作业代码下载地址： https://pages.cs.wisc.edu/~remzi/OSTEP/Homework/homework.html

参考解答：https://github.com/xxyzz/ostep-hw

# 目录

1. [全书主要内容一览](#全书主要内容一览)
2. [一、虚拟化的概念和API](#一虚拟化的概念和api)
   1. [抽象：进程](#抽象进程)
   2. [进程API](#进程api)
      1. [fork](#fork)
      2. [wait](#wait)
      3. [exec](#exec)
      4. [应用：shell](#应用shell)
3. [二、虚拟化CPU](#二虚拟化cpu)
   1. [受限直接执行（limited direct execution）](#受限直接执行limited-direct-execution)
      1. [直接运行协议](#直接运行协议)
      2. [受限的控制权](#受限的控制权)
      3. [在进程之间切换](#在进程之间切换)
         1. [协作方式](#协作方式)
         2. [非协作方式](#非协作方式)
         3. [保存和恢复上下文](#保存和恢复上下文)
4. [三、进程调度（一）单处理器进程调度](#三进程调度一单处理器进程调度)
      1. [最短任务优先SJF](#最短任务优先sjf)
      2. [最短完成时间优先STCF](#最短完成时间优先stcf)
      3. [轮转(RR)](#轮转rr)
      4. [IO操作](#io操作)
   1. [多级反馈队列MLFQ调度](#多级反馈队列mlfq调度)
      1. [基本规则](#基本规则)
      2. [优先级调整算法](#优先级调整算法)
      3. [“饥饿”问题——自动提升优先级](#饥饿问题自动提升优先级)
   2. [比例份额调度](#比例份额调度)
      1. [基本概念](#基本概念)
      2. [实现彩票调度算法](#实现彩票调度算法)
      3. [步长调度算法](#步长调度算法)
      4. [番外：查看CPU具体信息](#番外查看cpu具体信息)
5. [四、进程调度（二）多处理器进程调度](#四进程调度二多处理器进程调度)
   1. [多处理器架构](#多处理器架构)
   2. [单队列多处理器调度SQMS](#单队列多处理器调度sqms)
   3. [多队列多处理器调度](#多队列多处理器调度)
   4. [GNU/Linux采用的策略](#gnulinux采用的策略)
   5. [总结](#总结)


# 全书主要内容一览

**虚拟化**：操作系统将物理资源，转换成更通用、更强大更易于使用的形式.

- **虚拟化CPU**：就算只有一个处理器，操作系统也能做到有很多CPU在同时运行的“**假象**”(illusion)，让很多程序看似同时运行，这就是所谓的**虚拟化CPU**（virtualizing the CPU）
- **虚拟化内存**：
  - 程序将所有数据结构保存在内存中，因此每次读取指令都必须访问内存；
  - `malloc()`动态分配一块指定大小的内存，并返回指向这块内存的指针。
  - 好像每个正在运行的程序都有自己的私有内存，而不是与其他正在运行的程序共享相同的物理内存
  - 本质：每个进程都在访问自己的**私有虚拟地址空间**，操作系统以某种方式映射到机器的物理内存上，不同进程的内存引用互不影响。]]
- **并发**, 例如:

```c
#include <stdio.h>
#include <stdlib.h>
#include <pthread.h> // 可能在 common.h 中已经包含了
#include <unistd.h>

// #include "common.h"  // 假设这个头文件定义了 Pthread_create 和 Pthread_join 的包装宏

volatile int counter = 0; // 全局共享变量，使用 volatile 避免编译器优化
int loops;

// 线程执行函数
void *worker(void *arg) {
    for (int i = 0; i < loops; i++) {
        counter++; // 注意：此处存在竞态条件（race condition）
        // sleep(1);
    }
    return NULL;
}

int main(int argc, char *argv[]) {
    // 传入的参数即 counter 增加的次数
    if (argc != 2) {
        fprintf(stderr, "usage: threads <value>\n");
        exit(1);
    }

    loops = atoi(argv[1]); // 将参数转换为整数
    pthread_t p1, p2, p3, p4;

    printf("Initial value : %d\n", counter);

    pthread_create(&p1, NULL, worker, NULL);
    pthread_create(&p2, NULL, worker, NULL);
    pthread_create(&p3, NULL, worker, NULL);
    pthread_create(&p4, NULL, worker, NULL);

    pthread_join(p1, NULL);
    pthread_join(p2, NULL);
    pthread_join(p3, NULL);
    pthread_join(p4, NULL);

    printf("Final value   : %d\n", counter);

    return 0;
}
```

- 磁盘，另外没有虚拟磁盘一说，磁盘中的信息可以随时共享。而持久化指的是如何把内存中的数据保存到硬盘上

# 一、虚拟化的概念和API

## 抽象：进程

- **进程**（process）就是操作系统为正在运行的程序提供的抽象
- **地址空间**：进程可以访问的私有内存
- **时间片**：操作系统为线程或者进程**分配的CPU执行时间的最小单位**
  - 时间片太小，则上下文切换开销较大
  - 时间片太大，则相应变慢，实时性差
  - Linux查看时间片大小：`cat /proc/sys/kernel/sched_latency_ns`
- **时分共享**（time sharing）：操作系统共享资源的最基本的技术之一，资源由一个进程运行一小段时间后切换到另一个进程使用
- **空分共享**：比如磁盘，把资源从空间上划分给需要的数据

---

**进程API**

- 创建 create
- 销毁 destroy
- 等待 wait
- 其他控制 miscellaneous control：例如暂停线程然后恢复
- 状态 statu

**创建进程的细节**

-  操作系统从磁盘读取代码和静态数据，加载到内存中该进程的地址空间中，如下图：

![](https://s21.ax1x.com/2025/07/22/pVGC8mV.png)

-  采用**惰性加载**，只有程序执行期间用得上的的代码或数据片段，才会被加载
-  加载到内存后，操作系统必须先为**运行时栈**分配内存，用于存放局部变量、函数参数和返回地址。
- 为**堆**分配内存，显式请求内存的指令（如`malloc()`）会申请堆中的空间
- 还要执行与**IO设置**相关的任务

最后，启动程序，从`main()`入口开始执行，OS将CPU的控制权转移到新创建的进程，程序开始运行。

**进程状态**

- 运行 running：正在执行指令
- 就绪 ready
- 阻塞 blocked：主动等待资源，

就绪 -> 运行 称之为被调度（scheduled）;     
运行 -> 就绪 称之为取消调度（descheduled）

一个进程被阻塞时，CPU控制权可以交给其他线程，例如

![阻塞](https://s21.ax1x.com/2025/07/22/pVGPtDP.png)

从磁盘读取数据和等待网络数据包就是典型的IO阻塞过程。关于`Process1`完成后是否立即切换回去，这是一个决策的问题，这里只是举了一个例子。

**上下文切换** (context switch)：任务的执行上下文包括寄存器内容、程序计数器、堆栈指针，为了能之后恢复任务的执行状态，系统必须保存当前任务的执行上下文（寄存器内容、程序计数器、堆栈指针等），再加载另一个任务的上下文。进程和线程都有上下文切换，线程切换更快一些。


## 进程API

### fork

fork，英文动词，意为派生。在父进程的基础上派生出来一个新的进程，新的进程的内从空间指向和父进程同一块物理内存，直到某一方试图修改物理内存的数据才会开始复制物理内存

示例代码

```c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

int main(int argc, char *argv[]) {
    printf("hello world (pid:%d)\n", (int) getpid());

    int rc = fork();  // 创建一个子进程

    if (rc < 0) {
        // fork 失败
        fprintf(stderr, "fork failed\n");
        exit(1);
    } else if (rc == 0) {
        // 子进程执行这里
        printf("hello, I am child (pid:%d)\n", (int) getpid());
    } else {
        // 父进程执行这里
        printf("hello, I am parent of %d (pid:%d)\n", rc, (int) getpid());
    }

    return 0;
}
```

输出：

```
hello world (pid:29146) 
hello, I am parent of 29147 (pid:29146)  
hello, I am child (pid:29147) 
```

- `int rc = fork();`这一行`fork`了一个**子进程**，子进程和父进程几乎完全相同，但是有区别：
  - 子进程是从`fork()`指令以后开始执行的
  - 子进程获得的`rc`为`0`
  - 父进程获得的  `rc`为子进程的pid

### wait

可用于父进程等待子进程运行结束。示例代码：

```c
#include <stdio.h>      // 标准输入输出
#include <stdlib.h>     // exit() 函数
#include <unistd.h>     // fork()、getpid()
#include <sys/wait.h>   // wait()

int main(int argc, char *argv[]) 
{
    // 打印当前进程的 PID
    printf("hello world (pid:%d)\n", (int) getpid());

    // 创建子进程
    int rc = fork();

    if (rc < 0) {
        // fork 失败
        fprintf(stderr, "fork failed\n");
        exit(1);
    } else if (rc == 0) {
        // 子进程执行的代码
        printf("hello, I am child (pid:%d)\n", (int) getpid());
    } else {
        // 父进程执行的代码
        int wc = wait(NULL);  // 等待子进程结束
        printf("hello, I am parent of %d (wc:%d) (pid:%d)\n", rc, wc, (int) getpid());
    }

    return 0;
}
```

### exec

`exec`函数的作用是为fork的子进程分配不同于父进程的任务，它有多个实现，下面以`execvp`为例：

```c
#include <stdio.h>      // 标准输入输出函数
#include <stdlib.h>     // exit() 函数
#include <unistd.h>     // fork(), execvp(), getpid()
#include <string.h>     // strdup()
#include <sys/wait.h>   // wait()

int main(int argc, char *argv[]) 
{
    printf("hello world (pid:%d)\n", (int) getpid());

    int rc = fork(); // 创建子进程

    if (rc < 0) {
        // fork 失败
        fprintf(stderr, "fork failed\n");
        exit(1);
    } else if (rc == 0) {
        // 子进程 exec()
        printf("hello, I am child (pid:%d)\n", (int) getpid());

        char *myargs[3];
        myargs[0] = strdup("wc");       // 命令名："wc"（单词计数程序）
        myargs[1] = strdup("p3.c");     // 参数：文件名 "p3.c"
        myargs[2] = NULL;               // 参数数组结束标志

        execvp(myargs[0], myargs);      // 执行 wc 命令，统计 p3.c 文件的行/词/字节数

        // 如果 execvp 执行失败，才会执行下面这一行
        printf("this shouldn't print out\n");
    } else {
        // 父进程执行
        int wc = wait(NULL);  // 等待子进程结束
        printf("hello, I am parent of %d (wc:%d) (pid:%d)\n", rc, wc, (int) getpid());
    }

    return 0;
}
```

给定参数`myargs[0], myargs`后，直接将当前的子进程替换为给定的运行程序，在这里是`wc`；子进程在执行该`exec()`之后，不会返回结果。

### 应用：shell

shell 本质上也是一个用户程序，和上面实例中的父进程一样。当我们向shell输入命令的时候，shell 会从文件中找到需要的程序，并且`fork`一个子进程出来，子进程调用`exec()`来具体地执行我们传入的命令，同时shell也会调用`wait`等待子进程执行完成。子进程结束以后， shell 会打印返回值并再次输出提示符，提示用户继续输入下一条命令。

下面的示例代码描述了**输出重定向的实现原理**

```c
#include <stdio.h>      // 标准输入输出
#include <stdlib.h>     // exit()
#include <unistd.h>     // fork(), execvp(), close()
#include <string.h>     // strdup()
#include <fcntl.h>      // open() 的文件控制选项
#include <sys/wait.h>   // wait()

int main(int argc, char *argv[]) 
{
    int rc = fork(); // 创建子进程

    if (rc < 0) {
        // fork 失败
        fprintf(stderr, "fork failed\n");
        exit(1);
    } else if (rc == 0) {
        // 子进程：将标准输出重定向到文件
        close(STDOUT_FILENO); // 关闭标准输出（文件描述符1）
        open("./p4.output", O_CREAT | O_WRONLY | O_TRUNC, S_IRWXU);
        // 打开文件作为新的标准输出（文件描述符将是 1）

        // 执行 wc 命令，统计 p4.c 文件的行、词、字节数
        char *myargs[3];
        myargs[0] = strdup("wc");     // 命令名
        myargs[1] = strdup("p4.c");   // 参数：文件名
        myargs[2] = NULL;             // 参数数组结束标志NULL

        execvp(myargs[0], myargs);   // 执行命令
    } else {
        // 父进程：等待子进程完成
        int wc = wait(NULL);
    }

    return 0;
}
```

这段代码相当于直接在shell输入`wc p4.c > ./p4.output`，解释：

- `STDOUT_FILENO`是在`<unistd.h>`中定义的宏常量，数值为 0，代表**标准输出**，类似的还有：
  - `STDIN_FILENO`：标准输入，数值 = 1
  - `STDERR_FILENO`：标准错误，数值 = 2
- 运行该程序后，控制台并没有任何输出，实际上父进程先 fork 了一个子进程来负责将运行结果重新写入指定的文件`./p4.output`，并且子进程一上来就关掉了标准输出，而是`open`目标文件作为新的标准输出，所以shell中看不到任何打印的信息。

管道符`|`的实现原理也类似，但是这时候一个进程的输出通过一个管道直接连接到另一个进程的输入，实现无缝连接。

# 二、虚拟化CPU


虚拟化CPU存在两个挑战：

- 性能，尽可能地提高运行效率
- 控制权，防止程序危害系统

## 受限直接执行（limited direct execution）

受限直接执行的目的就是限制程序的权限，因为每个程序都会有需要调用内核权限的情况，比如硬盘IO操作，如果不加以限制，很可能会危害系统。

### 直接运行协议

当操作系统希望启动程序时，会做以下步骤：

![简单，但是有问题](https://s21.ax1x.com/2025/07/23/pVGWVzR.png)

有两个仍待解决的问题：

1. 如何控制程序的权限
2. 如何切换进程，以实现CPU虚拟化

### 受限的控制权

硬件层面提供了多种不同的执行模式，具有不同的权限：

- **用户模式**(user mode)：用户模式下，程序不能完全访问硬件资源，例如不能发出IO请求
- **内核模式**(kernel mode)：操作系统就运行在内核模式，具有最高的权限
- 如果用户也需要执行某些特权操作（系统调用）：程序执行**陷阱（trap）指令**，该指令进入内核，**获得内核模式的权限**，完成操作后操作系统调用**从陷阱返回（return-from-trap）指令**，该指令返回到用户程序，回到用户模式
- 内核在启动的时候会设置一个叫做**陷阱表**（trap table）的东西，告诉硬件在发生异常的时候需要执行哪些代码，然后硬件就会记住这些位置，于是硬件就会知道发生系统调用和异常时需要跳转到哪些位置

**为什么叫“陷阱”指令**？因为程序需要执行系统调用的时候掉都需要陷入内核中，由内核执行系统调用的工作，然后再浮出来。

受限的直接运行协议的全过程如图：

![LDE协议](https://s21.ax1x.com/2025/07/23/pVGWIfJ.png)

### 在进程之间切换

关键：进程是在CPU上运行的，控制权在进程手里，想要切换进程，操作系统必须重新拿到CPU的控制权。为了实现进程之间的切换，有两种方式：协作方式和非协作方式。

#### 协作方式

这是一种乐观的思路，它假定所有进程都会合理地**主动让出CPU地控制权**。

唯一的例外是非法操作，如果发生非法操作，这时CPU的控制权也会转移给操作系统，执行非法活动的进程会被操作系统直接终止。

但是协作方式存在一个**缺陷**：如果某个程序因为自身原因陷入了死循环，既没有执行非法操作也不会让出控制权，怎么办？所以更为通用的是非协作方式：

#### 非协作方式

**时钟中断**

硬件功能——时钟中断，可以通过编程控制时钟中断产生的周期。产生中断时，**中断处理程序**（interrupt handler）会被运行，**控制权返还给操作系统**。中断发生时，硬件也要把各种寄存器保存在内核栈，和主动系统调用的情况类似。

所以说，一旦时钟开始运行，操作系统就不用再担心控制权回不到自己手中了。

#### 保存和恢复上下文

**调度程序：scheduler**，它属于操作系统的一部分。

调度程序的作用：决定操作系统拿到控制权以后是继续运行当前进程还是切换进程。

在上下文切换时需要保存原线程的：

- 通用寄存器
- 程序计数器
- 当前进程的内核栈指针

同时恢复新进程的通用寄存器、程序计数器、新进程的内核指针。

---

A进程切换到B进程的具体过程：

1. 时钟中断（或者是别的）操作系统获得CPU的控制权
2. 将A进程的寄存器保存到A的内核栈
3. 启用内核模式，跳到陷阱处理程序
4. 将A的寄存器值保存到A的进程结构，恢复B的进程结构
5. 从陷阱返回
6. 从内核栈恢复B的寄存器，进入用户模式，跳到B的程序计数器
7. 进程B开始运行

# 三、进程调度（一）单处理器进程调度

### 最短任务优先SJF

Shortest Job First

这是一种非抢占式的策略，**先运行耗时最短的任务，再运行耗时较长的任务**

> 补充一个概念：**抢占式**，指的是操作系统可以强制中断正在运行的进程或线程，并把 CPU 分配给另一个更“合适”的进程或线程。

### 最短完成时间优先STCF

最短完成时间优先（Shortest Time-to-Completion First，**STCF**）或抢占式最短作业优先（Preemptive Shortest Job First ，PSJF）调度程序

含义：每当新工作进入系统时，它就会确定剩余工作和新工作中，谁的剩余时间**最少**，然后调度该工作

{% note info %}

**响应时间**定义为从任务到达系统到首次运行的时间，以STCF为例：

![](https://s21.ax1x.com/2025/07/24/pVG7pUx.png)

A和B的响应时间都是0，C的响应时间是10

**周转时间**则指的是任务从到达，到彻底完成的时间。上面这个例子的总周转时间为120。STCF可以降低周转时间，但是牺牲了响应时间。

{% endnote %}

STCF的响应时间不是很好，为了改善响应时间，提出了**轮转**（Round-Robin）调度。

### 轮转(RR)

基本含义：**在一个时间片内运行一个任务后马上切换到下一个任务（而不用等待任务结束），这样交替进行**。交替周期是时钟周期的整数倍。

![SJF和轮转的对比，时间片为1s](https://s21.ax1x.com/2025/07/24/pVG7kxe.png)

时间片的选择：折中，因为

- 时间片太短会导致频繁的上下文切换，成本上升
- 时间片太长会导致响应时间变慢

轮转调度对于周转时间很不友好，毕竟轮转的目的正是**均摊**每个任务的时间。轮转是一种**公平**的政策，公平的政策往往要以周转时间为代价，换取响应时间。周转时间和响应时间不可兼得。

---

以上的所有讨论都是建立在**任务没有IO操作**、且**每个任务的运行时间都是已知的**基础上。下面专门来讨论这两个条件：

### IO操作

- 发起IO指令的程序，在结果返回之前不会执行任何操作，只是**阻塞**地等待任务完成。在此期间CPU应当去执行别的任务以提高执行效率，避免空闲。
- IO完成时会触发**中断**，CPU可以将阻塞的进程转移到就绪状态。

高效使用CPU的例子：A一共要执行4个IO操作，B是纯粹的CPU密集型任务：

![](https://s21.ax1x.com/2025/07/24/pVG7ssJ.png)

交替执行可以最大化CPU的利用。

## 多级反馈队列MLFQ调度

多级反馈队列（Multi-level Feedback Queue，MLFQ）

我们的目标是，在不知道进程的运行时间的情况下，构建出一个良好的调度程序；调度程序在运行时可以学习进程的特征，从而做出更好的决策。**用历史经验预测未来**。

### 基本规则

- MLFQ中有很多队列，**每个队列都有不同的优先级**，MLFQ1优先执行高优先级队列中的工作
- 同一个队列中的工作采用轮转调度处理

对CPU占用时间越短的进程，优先级越高；CPU占用时间越长，优先级越低。MLFQ有两条基本规则：

> 1. 如果 A 的优先级 > B 的优先级，运行A
> 2. 如果 A 的优先级 = B 的优先级，轮转运行 A 和 B

### 优先级调整算法

不同的工作主要可以分为两类：

1. 运行时间短，频繁放弃CPU的交互型工作，比如键盘输入
2. 运行时间长，占用CPU时间长，响应时间不重要的计算密集型工作

优先级调整算法：

> 工作初次进入系统，先把它放到最高优先级队列：
> - 每当分给工作的整个时间片被用完，就降低它的优先级
> - 每当在时间片内就释放了CPU，那么保持当前优先级不变

这样一来，CPU计算密集型工作的优先级会逐次递减，直至最低优先级。如果此时来了一个交互型工作，因为初始优先级是最高的，所以优先执行交互型工作，并且很快就执行完毕。可见，**MLFQ具有 SJF 的优点**。

混合IO工作也是同理，CPU占用时间较短所以一直维持在高优先级，一旦执行IO让出CPU就会把控制权交给低优先级的计算密集型工作，循环往复。

![](https://s21.ax1x.com/2025/07/24/pVGbu38.png)

### “饥饿”问题——自动提升优先级

交互型工作太多的情况下，会持续占用CPU，不给低优先级任务运行的机会，称之为**饥饿**；另一方面，如果某些进程使点小花招，比如在自己的时间片快用完之前主动调用IO操作，这样就能一直维持自己的高优先级，即使自己其实是长时间的任务。以上种种均表明，目前的 MLFQ 算法仍然是有缺陷的。

首先，为了防止饥饿现象：

> - 每经过一段时间 S，就把系统中的所有工作重新加入最高优先级队列

缺陷：S的值不好把控。

其次，防止程序耍花招的方式：

> 一旦任务用完了在**某一层**中被分配的时间（不管中途放弃了多少次控制权），就降低它的优先级

实际上，大多数MLFQ都支持不同队列具有不同的时间片长度。有的采用时分调度程序，也有的采用数学公式调整优先级。

## 比例份额调度

比例份额（proportional-share）是一种不同于MLFQ的调度程序，也被称为公平份额（fair-share）。目标：**确保每个工作都能获得一定比例的CPU时间**。比例份额算法在容易确定比例的情况下比较实用。

### 基本概念

每个进程持有一定数量的“彩票(ticket)”，比如进程A持有1到75，B进程持有76到100，那么调度程序不断定时地抽取数字，数字位于哪个范围就执行哪个进程。

### 实现彩票调度算法

只需要这几样东西：

- 随机数生成器
- 单向链表，用于记录所有的进程
- 票的总数

每个进程（或称作任务/job）都有一个`tickets`字段，代表它拥有的“彩票票数”。系统会从 0 到总票数之间随机抽取一个“中奖号”。然后遍历所有进程的票数，累计票数，当累计值超过中奖号时，当前进程即为“中奖者”，获得 CPU 使用权。

### 步长调度算法

假如A、B、C的票数分别为100、50、250，用一个大数1000作为总行程，为了确保A、B、C的运行时间维持为2:1:5，取步长分别为10，20，4。每个调度周期，如果发现某个进程的行程比较小，下一次就运行这个行程，使得所有进程的行程始终相同。

**步长调度算法的目的是尽可能是的所有进程的运行时间调整为预期的比例。步长调度依赖于全局状态，不适合处理新加入的进程。**

### 番外：查看CPU具体信息

迄今为止已经学了一堆关于CPU虚拟化和内存虚拟化的理论，下面就来看看真实存在的例子。

在 GNU/Linux 系统中使用`lscpu`命令可以直接查看CPU的具体信息，以我自己的4核8线程 R5 3500U 为例：

```
╰─❯ lscpu
架构：                       x86_64
  CPU 运行模式：             32-bit, 64-bit
  Address sizes:             43 bits physical, 48 bits virtual
  字节序：                   Little Endian
CPU:                         8
  在线 CPU 列表：            0-7
厂商 ID：                    AuthenticAMD
  型号名称：                 AMD Ryzen 5 3500U with Radeon Vega Mobile Gfx
    CPU 系列：               23
    型号：                   24
    每个核的线程数：          2
    每个座的核数：            4
    座：                     1
    步进：                   1
    Frequency boost:        启用
    CPU(s) scaling MHz:     80%
    CPU 最大 MHz：           2100.0000
    CPU 最小 MHz：           1400.0000
    BogoMIPS：               4192.15
    标记：                   fpu vme de pse tsc msr pae mce cx8 apic sep mtrr pge mca c
                             mov pat pse36 clflush mmx fxsr sse sse2 ht syscall nx mmxe
                             xt fxsr_opt pdpe1gb rdtscp lm constant_tsc rep_good nopl n
                             onstop_tsc cpuid extd_apicid aperfmperf rapl pni pclmulqdq
                              monitor ssse3 fma cx16 sse4_1 sse4_2 movbe popcnt aes xsa
                             ve avx f16c rdrand lahf_lm cmp_legacy svm extapic cr8_lega
                             cy abm sse4a misalignsse 3dnowprefetch osvw skinit wdt tce
                              topoext perfctr_core perfctr_nb bpext perfctr_llc mwaitx 
                             cpb hw_pstate ssbd ibpb vmmcall fsgsbase bmi1 avx2 smep bm
                             i2 rdseed adx smap clflushopt sha_ni xsaveopt xsavec xgetb
                             v1 clzero xsaveerptr arat npt lbrv svm_lock nrip_save tsc_
                             scale vmcb_clean flushbyasid decodeassists pausefilter pft
                             hreshold avic v_vmsave_vmload vgif overflow_recov succor s
                             mca sev sev_es
Virtualization features:     
  虚拟化：                   AMD-V
Caches (sum of all):         
  L1d:                       128 KiB (4 instances)
  L1i:                       256 KiB (4 instances)
  L2:                        2 MiB (4 instances)
  L3:                        4 MiB (1 instance)
NUMA:                        
  NUMA 节点：                1
  NUMA 节点0 CPU：           0-7
Vulnerabilities:             
  Gather data sampling:      Not affected
  Ghostwrite:                Not affected
  Indirect target selection: Not affected
  Itlb multihit:             Not affected
  L1tf:                      Not affected
  Mds:                       Not affected
  Meltdown:                  Not affected
  Mmio stale data:           Not affected
  Reg file data sampling:    Not affected
  Retbleed:                  Mitigation; untrained return thunk; SMT vulnerable
  Spec rstack overflow:      Mitigation; Safe RET
  Spec store bypass:         Mitigation; Speculative Store Bypass disabled via prctl
  Spectre v1:                Mitigation; usercopy/swapgs barriers and __user pointer sa
                             nitization
  Spectre v2:                Mitigation; Retpolines; IBPB conditional; STIBP disabled; 
                             RSB filling; PBRSB-eIBRS Not affected; BHI Not affected
  Srbds:                     Not affected
  Tsa:                       Not affected
  Tsx async abort:           Not affected
```

- `AMD-V`表示这颗CPU支持虚拟化技术，可以运行虚拟机
- `L1d`是数据缓存，每个核心 32KB，共128KB，每个核心都有独立的数据缓存
- `L1i`是指令缓存，同样每个核心都有独立的指令缓存
- `L2`是二级缓存，速度略慢于L1，但是更大，每个核私有
- `L3`是三级缓存，所有核心共享

# 四、进程调度（二）多处理器进程调度

## 多处理器架构

多CPU和单CPU的主要区别在**对硬件缓存的应用**。

首先，缓存之所以有用，是因为**局部性（locality）原理**：

- **时间局部性**：当一个数据被访问后，它很有可能在不久的将来再次被访问。
- **空间局部性**：当程序访问地址 x 的数据后，很可能会紧接着访问 x 附近的数据。（比如：遍历数组）

![](https://s21.ax1x.com/2025/07/24/pVGXMin.png)

在单CPU的架构下，如果缓存未命中，只需要把从内存读到的数据存入CPU缓存；但是在多CPU架构下，不同CPU的缓存共享一个内存区域，会发生**缓存一致性问题**（cache coherence）：一个CPU修改内存中的某个值后，另一个CPU并不知情，仍然从自己的缓存中读取旧值。硬件的解决方案是通过一条**总线**让缓存监控内存的访问，如果内存的值被修改，马上更新自己缓存的数据。

在多个CPU并发访问共享的数据时，需要使用锁才能保证数据的一致性（无锁数据结构较少使用）

**缓存亲和度**（cache affinity）：P88，指的是不同CPU上如果缓存的情况不同，运行速度也不一样，已经有对应缓存的CPU运行速度会快得多。

## 单队列多处理器调度SQMS

![SQMS示意图](https://s21.ax1x.com/2025/07/24/pVGj3tA.png)

`Single Queue Multiprocessor Scheduling，SQMS`

将所有需要调度的工作放入一个单独的队列中，每次由一个CPU取出一个任务。

- 优点：负载均衡较好，容易构建
- 缺点：1. 加锁的开销较大，扩展性差，CPU核越多效率越低2. 不同的进程不断在不同的CPU上转移，缓存的亲和性较差

## 多队列多处理器调度

![](https://s21.ax1x.com/2025/07/24/pVGj8fI.png)

每个CPU都有一个任务队列，不同CPU的调度之间相互独立。除此之外，通过迁移技术，把工作分配给空闲的CPU；或者通过工作窃取，让工作量较少的CPU偷看其他CPU的工作情况，拿到工作。但是检查间隔如何选取又是一个问题。

## GNU/Linux采用的策略

- **O(1)调度程序**：多队列，基于优先级。类似于MLFQ
- **完全公平调度程序（CFS）**：多队列、比例调度
- **BF调度程序（BFS）**：单队列、比例调度

这里可以参考：

[M11]“Towards Transparent CPU Scheduling”Joseph T. Meehean   
Doctoral Dissertation at University of Wisconsin—Madison, 2011 

GNU/Linux系统查看指定进程的调度策略的命令：

```bash
chrt -p <pid>
```

调度策略一览：

| 策略名             | 参数值 | 简介                     |
| --------------- | --- | ---------------------- |
| SCHED\_OTHER    | 0   | 普通时间共享策略（默认）           |
| SCHED\_FIFO     | 1   | 先进先出实时策略               |
| SCHED\_RR       | 2   | 实时轮转调度策略               |
| SCHED\_BATCH    | 3   | 批处理策略                  |
| SCHED\_IDLE     | 5   | 空闲任务调度（最低优先级）          |
| SCHED\_DEADLINE | 6   | Deadline 策略（用于确定性需求场景） |

测试一下：

![](https://s21.ax1x.com/2025/07/24/pVJp9Ig.png)

## 总结

- 单队列多处理器调度：负载均衡性较好，但是因为加锁，扩展性差，因为进程频繁在多个CPU切换，缓存亲和度差
- 多队列多处理器调度：扩展性和缓存亲和度好，但是负载均衡性较差



