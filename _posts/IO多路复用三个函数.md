---
title: IO多路复用-select, poll, epoll的区别
tags:
  - 操作系统
date: 2025-08-10 12:00:43
index_img:
categories: 
---

## 目录

1. [select](#select)
   1. [函数原型](#函数原型)
   2. [作用](#作用)
   3. [应用示例](#应用示例)
2. [poll](#poll)
   1. [函数原型](#函数原型-1)
   2. [示例代码](#示例代码)
   3. [与select的区别](#与select的区别)
3. [epoll](#epoll)
   1. [三个核心系统调用](#三个核心系统调用)
   2. [示例代码](#示例代码-1)
   3. [两种触发模式](#两种触发模式)
   4. [工作原理](#工作原理)
   5. [三个函数的区别](#三个函数的区别)


## select

### 函数原型

```c
int select(int nfds, 
           fd_set *restrict readfds,  
           fd_set *restrict writefds,  
           fd_set *restrict errorfds, 
           struct timeval *restrict timeout);
```

- 在每个集合中都会检查前`nfds`个文件描述符。`select()`内部会遍历`0 ~ nfds-1`之间的**所有** fd（至于需要重点关注哪个，取决于后面传入的fds），所以 nfds 必须是`所有监听的 fd 中最大值 + 1`。
- `readfds`：指定需要监控的可读时间的fd。常用方法有：

```c
FD_ZERO(&readfds);      // 清空集合
FD_SET(fd, &readfds);   // 把 fd 加入集合
```

- `writefds`：指定需要监控可写事件的fd
- `errorfds`：指定需要监控的异常事件的fd
- `timeout`结构体：`NULL`表示无限等待。

```c
struct timeval {
    long tv_sec;   // 秒
    long tv_usec;  // 微秒（百万分之一秒）
};
```

- 用于在**一个线程**中**监听多个文件描述符**
- 返回值：大于零表示已经准备好的 IO 文件描述符的个数；等于零表示超时；-1表示出错

### 作用

`select`**用于同时监控多个文件描述符，可以同时处理多个输入源；当任何一个IO准备就绪的时候，select就会返回，否则一直阻塞，不会浪费CPU。**

- 优点：只有一个线程，所以不存在并发问题；资源消耗量低，因为避免了为每个IO创建单线程的开销。
- 缺点：可传入文件描述符的数量有限制；每次需要遍历所有的文件描述符；不允许阻塞调用，否则这个系统都会被阻塞。

### 应用示例

应用示例：监控终端的输入（为简单起见只有一个IO操作）

```c
#include <stdio.h>
#include <unistd.h>
#include <sys/select.h>

/**
 * 最简单的select例子：只监控标准输入
 * 演示select如何等待输入事件
 */

int main() {
    printf("请输入一些文字（输入quit退出）：\n");
    
    fd_set read_fds;
    char buffer[100];
    
    while (1) {
        // 1. 清空并设置文件描述符集合
        FD_ZERO(&read_fds);
        FD_SET(STDIN_FILENO, &read_fds);  // 只监控标准输入
        
        printf("等待输入...\n");
        
        // 2. select等待输入事件
        int result = select(STDIN_FILENO + 1, &read_fds, NULL, NULL, NULL);
        
        if (result > 0) {
            // 3. 检查标准输入是否有数据
            if (FD_ISSET(STDIN_FILENO, &read_fds)) {
                printf("检测到输入！\n");
                
                if (fgets(buffer, sizeof(buffer), stdin) != NULL) {
                    printf("你输入了: %s", buffer);
                    
                    if (strncmp(buffer, "quit", 4) == 0) {
                        break;
                    }
                }
            }
        }
    }
    
    printf("程序结束\n");
    return 0;
}
```

运行结果：

```
╭─ ~/Desktop/c-dev          
╰─❯ ./main
请输入一些文字（输入quit退出）：
等待输入...
我输入了一段文字。
等待结束！检测到输入！
你输入了: 我输入了一段文字。
等待输入...
^C
```

这个例子说明：
1. `select(STDIN_FILENO + 1, &read_fds, NULL, NULL, NULL)`
   - 监控标准输入（文件描述符0）
   - 程序会阻塞在这里，等待用户输入
   
2. 当用户按下回车键时：
   - `select`检测到有输入数据
   - 返回值 > 0，表示有事件发生
   - `FD_ISSET`检查确认是标准输入有数据
   - 然后读取并处理数据

3. 如果没有select：
   - `fgets`会直接阻塞地等待输入
   - 无法同时处理多个输入源
   - 这就是`select`的价值所在


## poll

跟`select`相比，它的优点是**没有传入文件描述符数量的限制**，`select`收到`FD_SETSIZE`的影响，监控的数量是有限的（通常是1024）；而且精简了传入参数的数量，将原来的读文件描述符、写文件描述符、错误文件描述符封装到使`pollfd`结构体数组。

### 函数原型

```c
#include <poll.h>

int poll(struct pollfd *fds, nfds_t nfds, int timeout);
```

- `fds`：一个`struct pollfd`**数组**，每个元素都描述一个要监视的文件描述符及其事件类型
- `nfds`：数组的元素个数
- `timeout`：等待时间，单位：毫秒，`0`表示立即返回，`-1`表示一直阻塞

`struct pollfd`结构如下，在调用`poll()`之前应该赋值完毕，而且可以按需直接修改数组中的`events`属性值。

```c
struct pollfd {
    int fd;         // 文件描述符
    short events;   // 关心的事件（输入事件）
    short revents;  // 实际发生的事件（输出事件）；调用返回后由内核写回该值
};
```

- `fd`应当传入诸如`STDIN_FILENO`的文件描述符
- `events`赋值为输入的事件，调用`poll()`后，**内核**会监视这些fd，直到发生了事件/超时（`timeout`）/被信号中断
- `revents`：当`poll()`返回时，**内核**会清空`fds[i].revents`的值，然后把实际发生事件的值写进去，**读取时要用按位与**：例如`fds[i].revent & POLLIN`。

常用事件（`events`/`revents`）：

- POLLIN → 数据可读
- POLLOUT → 可以写入数据
- POLLERR → 发生错误
- POLLHUP → 对端关闭连接
- POLLNVAL → 无效的 FD

### 示例代码

```c
#include <poll.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>

// 改写后的poll版本
int main()
{
    printf("=== POLL 版本 ===\n");
    printf("请输入一些文字（输入quit退出）：\n");

    // 定义pollfd结构体数组，只监控一个文件描述符
    struct pollfd fds[1];
    char buffer[100];

    // 设置要监控的文件描述符和事件
    fds[0].fd = STDIN_FILENO; // 监控标准输入
    fds[0].events = POLLIN; // 监控可读事件

    while (1) {
        printf("等待输入...\n");

        // poll等待输入事件，-1表示无限等待
        printf("revents at beginning: %d\n", fds[0].revents);
        int result = poll(fds, 1, -1);

        if (result > 0) {
            // 检查标准输入是否有数据可读
            if (fds[0].revents & POLLIN) {
                printf("检测到输入！\n");

                if (fgets(buffer, sizeof(buffer), stdin) != NULL) {
                    printf("你输入了: %s", buffer);

                    if (strncmp(buffer, "quit", 4) == 0) {
                        break;
                    }
                }
            }
            printf("revents at end: %d\n", fds[0].revents & POLLIN);
            // 清除事件标志（可选，因为下次poll会重新设置revents）
            fds[0].revents = 0;
        }
    }

    printf("程序结束\n");
    return 0;
}
```

运行结果：

```
╭─ ~/Desktop/c-dev              
╰─❯ ./main                 
=== POLL 版本 ===
请输入一些文字（输入quit退出）：
等待输入...  
测试输入   
检测到输入！
你输入了: 测试输入
revents at end: 1
等待输入...
revents at beginning: 0
^C
```

### 与select的区别

| 方面    | `select`                  | `poll`             |
| ----- | ------------------------- | ------------------ |
| 监控对象数 | 受 `FD_SETSIZE` 限制（通常1024） | 理论无限制              |
| 数据结构  | `fd_set`（位图）              | `struct pollfd` 数组 |
| 修改方式  | 每次调用前都要重置集合               | 可以直接改数组中的 events   |
| 兼容性   | POSIX 标准                  | POSIX 标准           |

## epoll

epoll，它算是 **Linux** 下 I/O 多路复用的“高配版”，比 select 和 poll 更高效，尤其适合同时监控大量文件描述符的场景。

`select`和`poll`每次调用都要手动传入所有用到的fd（不记录状态），而且返回后又手动逐个检查全部的fd才知道哪个就绪（前者循环检查`if (FD_ISSET(指定文件描述符, &read_fds))`，后者循环检查`if (fds[i].revents & POLLIN)`）。`epoll`对这两点都做了改进，体现在：

1. fd集合可以只注册一次，后面可以**反复调用**（由内核记住），相比之下每次调用`select / poll`都必须重新传入整个FD集合。
2. 只返回**已经就绪的fd列表**，不用遍历所有监控的fd
3. 支持水平触发（LT）和边缘触发（ET）两种模式
4. 理论上FD的数量没有限制

### 三个核心系统调用

1. **创建 epoll 实例**

两种方式：

```c
int epfd = epoll_create(int __size); // 返回一个 epoll 文件描述符
int epfd = epoll_create1(int __flags);
```

- `epoll_create`返回新 epoll 实例的文件描述符，在新版本中`size`已经被忽略，但是必须大于0。
- `epoll_create1`与`epoll_create`相同，不过带有`FLAGS`参数，而且移除了用不上的`size`参数。

2. **添加/修改/删除 监听的 FD**

```c
#include <sys/epoll.h>

int epoll_ctl(int epfd, int op, int fd, struct epoll_event *event);
```

- `epfd`：刚才创建实例返回的epfd
- `op`：三种取值，`EPOLL_CTL_ADD` `EPOLL_CTL_MOD` `EPOLL_CTL_DEL`
- `fd`：要操作的文件描述符
- `event`：事件的信息

3. **等待事件的发生**

```c
int epoll_wait(int epfd, struct epoll_event *events, int maxevents, int timeout);
```

等待事件发生，返回**就绪的文件描述符数量**。可以看到这里不需要传入监听的事件集合，因为已经保存到内核中了，不需要重新传入。

- `epfd`: epoll实例
- `events`: 用于接收就绪事件的数组
- `maxevents`: 最多返回的事件数
- `timeout`: 超时时间（毫秒），-1表示阻塞等待所有事件完成

`epoll_event`结构体：位于`sys/epoll.h`

```c
typedef union epoll_data
{
  void *ptr;
  int fd;
  uint32_t u32;
  uint64_t u64;
} epoll_data_t;

struct epoll_event
{
  uint32_t events;	/* Epoll events */
  epoll_data_t data;	/* User data variable 一般用来存fd*/ 
} __EPOLL_PACKED;
```

比较常用的有两个：`ev.events = EPOLLIN`，`ev.data.fd = 文件描述符`。用于接收就绪事件的数组 events 的字段`events[i].data.fd`等于注册时`ev.data.fd`里放的值，常见做法是放 FD 本身，但也可以放别的。

### 示例代码

```c
#include <stdio.h>
#include <string.h>
#include <sys/epoll.h>
#include <unistd.h>

#define MAX_EVENTS 10
#define BUFFER_SIZE 1024

void simple_epoll_example()
{
    printf("=== 简单epoll示例：监控标准输入 ===\n");
    printf("请输入文字（输入quit退出）：\n");

    // 1. 创建epoll实例
    int epfd = epoll_create(1);
    if (epfd == -1) {
        perror("epoll_create失败");
        return;
    }

    // 2. 准备要监控的事件
    struct epoll_event ev;                 // ev 用于监控可读事件
    struct epoll_event events[MAX_EVENTS]; // events 用于接收就绪事件

    // 设置要监控标准输入的读事件
    ev.events = EPOLLIN;       // 监控可读事件
    ev.data.fd = STDIN_FILENO; // 关联的文件描述符

    // 3. 将标准输入添加到epoll监控中
    if (epoll_ctl(epfd, EPOLL_CTL_ADD, STDIN_FILENO, &ev) == -1) {
        perror("epoll_ctl失败");
        close(epfd);
        return;
    }

    char buffer[BUFFER_SIZE];

    while (1) {
        printf("--------------\n");
        printf("等待输入...\n");

        // 4. 等待事件发生
        int nfds = epoll_wait(epfd, events, MAX_EVENTS, -1);

        if (nfds == -1) {
            perror("epoll_wait失败");
            break;
        }

        printf("nfds: %d\n", nfds);

        // 5. 处理就绪的事件
        for (int i = 0; i < nfds; i++) {
            if (events[i].data.fd == STDIN_FILENO) {
                if (events[i].events & EPOLLIN) {
                    printf("检测到输入！\n");

                    if (fgets(buffer, sizeof(buffer), stdin) != NULL) {
                        printf("你输入了: %s", buffer);

                        if (strncmp(buffer, "quit", 4) == 0) {
                            goto cleanup;
                        }
                    }
                }
            }
        }
    }

cleanup:
    close(epfd);
    printf("程序结束\n");
}

int main()
{
    simple_epoll_example();
    return 0;
}
```

运行结果：

```c
=== 简单epoll示例：监控标准输入 ===
请输入文字（输入quit退出）：
--------------
等待输入...
这是一个句子
nfds: 1
检测到输入！
你输入了: 这是一个句子
--------------
等待输入...
```

### 两种触发模式

- 水平触发：只要有数据就通知。只要还有没读完的数据/没写满的空位，`epoll_wait`就会返回可读/可写。
- 边缘触发：只在状态变化时通知一次（比如已经读完-有未读消息），这时只要读过一次，`epoll_wait`就不会提示还有事件，即使这一次没有读完。

### 工作原理

**内核事件表**

```
epoll实例维护一个内核事件表：
┌─────────────────┐
│ fd1 → 可读事件  │
│ fd2 → 可写事件  │  
│ fd3 → 可读事件  │
│ ...             │
└─────────────────┘
```

**就绪队列**

```
当fd就绪时，内核将其加入就绪队列：
┌──────────────┐    ┌──────────────┐
│ 事件表       │───→│ 就绪队列      │
│ fd1,fd2,fd3  │    │ fd1,fd3      │
└──────────────┘    └──────────────┘
                           ↓
                    epoll_wait返回队列中的元素个数
```

### 三个函数的区别

| 特性 | select | poll | epoll |
| ---- | -------| -----| ------|
|时间复杂度 | O(n) | O(n) | O(1) |
|文件描述符限制 | 1024 | 无 | 无 |
| 内存拷贝 | 每次调用 | 每次调用 | 只在注册时 |
|跨平台 | 是 | 是 | 仅Linux |
|最大连接数 | ~1000 | ~10000 | >100000 |


