---
title: 结合Valkey聊聊Redis的持久化机制
tags:
  - 中间件
date: 2025-08-20 19:04:43
index_img: https://s21.ax1x.com/2025/08/19/pVBsNL9.jpg
categories: Redis
---

## 参考资料

Valkey上关于持久化的很好的参考资料：[https://valkey.io/topics/persistence/](https://valkey.io/topics/persistence/)

Valkey的全面介绍：[推陈出新 – 内存 key-value 数据库 Valkey 介绍和剖析](https://aws.amazon.com/cn/blogs/china/introduction-and-analysis-of-the-in-memory-key-value-database-valkey/)

关于`fork`：https://linux.die.net/man/2/fork

## 前言

2024 年 3 月 20 日，Redis Labs 宣布从 Redis 7.4 开始，将 BSD-3-clause 源码使用协议修改为 RSAv2 和 SSPLv1 协议。该变化意味着 Redis 在 OSI（开放源代码促进会）定义下不再是严格的开源产品。实际上，Redis 项目的贡献除了 Redis Labs 的成员外，还有多位来自于其他公司的成员，贡献比例逐年上升，今年甚至达到了 50% 左右。这些核心成员对 Redis Labs 更改 Redis 协议的变动并不认可，所以由 Linux 基金会组织成立了 Valkey 开源项目。Valkey 采用 BSD 源码使用协议，在 2024 年 4 月 16 日推出了 7.2.5 版本，该版本从 Redis 7.2.4 fork 而来，可以帮助用户无缝完成切换。

Arch Linux于今年上半年正式将官方仓库中的 redis 替换为 Valkey。

Arch Linux安装 Valkey 的方式非常简单，只需要执行一条命令：

```
sudo pacman -S redis
```

软件包只有不到10MB，非常非常精简

(虽然软件包的名字还是redis，但是软件包本身已经被换成Valkey了)

然后启用Valkey服务即可。

```
sudo systemctl start valkey
```

使用命令`valkey-cli`即可进入Valkey客户端工具。

Valkey和Redis的命令是完全兼容的，所以下面涉及到Valkey的部分同样也适用于Redis。

## 持久化方式简介

两种方式：RDB和AOF。RDB记录数据本身，AOF追加记录文本命令。默认只启用了RDB，AOF不建议单独使用。

处理这两种持久化的进程统一称为`background saving process`，细分为`background save`和`AOF log background rewriting`，前者在后台向磁盘写入RDB文件，后者在后台重写AOF文件。

## RDB

全称：Redis Database Backup File，redos数据备份文件，也被称为**快照**，也就是把内存中的所有数据记录到磁盘中，默认保存到`/var/lib/valkey/dump.rdb`。有两个命令可以刷盘RDB：

- `save`：由**主进程**执行RDB写入磁盘，同步保存，产生一个时间点的快照。 
- `bgsave`：创建子进程`background saving child`负责保存RDB，主进程不受影响。

### bgsave创建快照流程

技术：**写时复制**

- 创建 RDB 快照文件，使用写时复制技术，父进程调用`fork()`创建子进程（复制了父进程的页表，指向同一块物理内存区域），然后子进程把读到的数据写入硬盘，替换旧的rdb文件。而主进程继续处理命令。
- 从这块物理内存的角度来看，子进程只有读操作，但是父进程不一定，可能会产生修改。
- 主进程如果有新的写操作，操作系统会把该物理区域复制一份，主进程的页表改为指向新的物理空间，然后主进程对这个物理页进行写操作和读操作。
- 缺点：若快照期间主进程有大量写入，会频繁复制页面，导致内存占用翻倍。

![](https://s21.ax1x.com/2025/07/20/pV8Q6Z4.png)

**精简版：**

- Redis fork 一个子进程。我们现在有一个子进程和一个父进程。
- 子进程开始将数据集写入临时 RDB 文件。
- 当子进程完成写入新的 RDB 文件时，它将**替换旧的 RDB 文件**。

**RDB的缺点**

- RDB的执行时间间隔长。两次RDB之间的写入数据有丢失的风险
- for子进程、RDB文件的压缩和写入都比较耗时

## AOF

### 1.基础

启用 AOF 的命令：`valkey-cli config set appendonly yes`

全称：Append Only File，仅追加文件。每一个命令都会记录在AOF文件，类似于逻辑日志。默认配置下，每秒系统自动执行一次`fsync`，将AOF文件同步到磁盘。

在新版本中，AOF不单单只有一个文件。Valkey 将 AOF 拆分成多个部分，也就是说，原始的单个 AOF 文件被拆分为**基本文件**（最多只有一个）和**增量文件**（可能不止一个）。基本文件表示 AOF 重写时数据的初始快照（RDB 或 AOF 格式）。增量文件包含自上一个基本 AOF 文件创建以来的增量更改。所有这些文件都放在单独的目录中，并由**清单文件**进行跟踪。

由于AOF会不加思考地记录用户输入的每一调命令，AOF文件的体积往往比较大。为了去掉冗余的命令，精简 AOF 大小，引入了 **AOF 重写机制**，重新生成体积更小的 AOF 文件，覆盖原来的文件。`bgrewriteaof`可以手动异步执行重写功能，不过也有自动执行的机制。自动机制见配置文件章节。

### 2.重写原理

和RDB一样，日志重写（Log rewriting）也使用了相同的**写时复制**技巧。

- Valkey fork一个子进程，于是现在我们有一个父进程和一个子进程
- 子进程开始向临时文件中写入新的 base AOF文件
- 父进程打开一个新的增量AOF文件，往这里写入更新。**如果子进程的重写失败了**，那么：旧基本文件、旧增量文件（如果有的话），再加上新打开的增量文件，三者形成了新的完整的AOF文件，所以没有安全问题
- **子进程重写成功以后**，父进程会收到一个信号，用`新打开的增量文件`和`子进程生成的基本文件`构建一个**临时清单文件**（temp manifest），并将其持久化到磁盘。
- Valkey对清单文件进行原子交换，使得 AOF 重写的结果生效。Valkey还会清理旧的基本文件和所有未使用的增量文件。

### 3.查看AOF本地文件

如图所示，在Linux系统中查看`/var/lib/valkey/appendonlydir/`目录下的AOF文件。

![](https://s21.ax1x.com/2025/08/18/pVBmjeI.png)

```bash
[root@Arch ~]# cd /var/lib/valkey/
[root@Arch valkey]# ls
appendonlydir  dump.rdb
[root@Arch valkey]# cd appendonlydir/
[root@Arch appendonlydir]# ls
appendonly.aof.1.base.rdb  appendonly.aof.1.incr.aof  appendonly.aof.manifest
[root@Arch appendonlydir]# cat appendonly.aof.1.base.rdb 
REDIS0011�
valkey-ver8.1.3�
[root@Arch appendonlydir]# cat appendonly.aof.1.incr.aof 
*2
$6
SELECT
$1
0
*3
$3
set
$4
Aket
$3
111
[root@Arch appendonlydir]# cat appendonly.aof.manifest 
file appendonly.aof.1.base.rdb seq 1 type b
file appendonly.aof.1.incr.aof seq 1 type i
```

如前文所述，AOF不止一个文件，位于单独的目录`/var/lib/valkey/appendonlydir/`下。这里生成了三个文件：

- appendonly.aof.1.base.rdb 基本文件
- appendonly.aof.1.incr.aof, appendonly.aof.2.incr.aof 增量文件
- appendonly.aof.manifest 清单文件

查看文件的具体内容，发现：

- 基本文件的内容出现乱码，这很好理解，因为这里是以RDB格式存储的，`REDIS0011`表示RDB文件头，虽然扩展名是`.aof`，但它其实就是一个RDB文件。
- 增量文件保存的是文本命令，采用**RESP协议**记录命令
- 描述AOF的组成，包括：
  - `...base.rdb seq 1 type b`：指明base文件（RDB格式），序号为1
  - `...incr.aof seq 1 type i`：指明增量文件，序号1
  - valkey启动时，会先加载`type b`的RDB文件，再回放增量文件。

从上面可以看出，清单文件的目的就是记录哪个文件是基本文件，哪个文件是增量文件。这为我们带来了极大的灵活性————如果要更改AOF基本文件，只需修改清单文件即可。


### 4.触发机制

见配置文件参数章节。

## RDB和AOF的比较

![](https://s21.ax1x.com/2025/07/20/pV8l5hn.png)

结合Valkey手册再补充几点：

- RDB非常适合备份，相当于存档，比如可以每天保存一个快照，出什么事就直接回档
- RDB的重启速度更快
- RDB最大化了Valkey的性能，因为父进程只需要 fork 一个子进程，由子进程完成所有的持久化工作。
- AOF可以设置不同的fsync策略，数据一致性更强
- AOF是仅追加日志，不会出现磁盘的**寻道**
- 当 AOF 文件过大时，Valkey 能够在后台**自动重写**。重写过程非常安全，因为 Valkey 会在继续向旧文件追加数据的同时，使用创建当前数据集所需的最少操作生成一个全新的 AOF 文件。一旦第二个文件准备就绪，Valkey 就会切换两个 AOF 文件，并开始向新文件追加数据。
- 不推荐单独使用AOF，因为RDB的数据库备份作用还是很重要的。

## 配置文件的参数

以下内容来自Valkey/Redis的配置文件及注释。

### RDB

除非另有规定，服务器将会自动保存DB：

- 执行了至少一次修改的1h以后
- 执行了至少100次修改的5min后
- 10000修改的60s后

```
save 3600 1 300 100 60 10000
```

如果RDB最近一次的后台保存（background save）失败了，那么服务器将会停止接受写入，以提醒用户持久化失败。

```
stop-write-on-bgsave-error yes
```

默认情况下，生成`.rdb`文件采用 LZF 压缩，以节省空间，代价是增高了子进程的CPU占用率。

```
rdbcompression yes
```

默认开启校验和，rdb文件的末尾包含一个校验和，这样在保存和加载rdb文件的时候都会校验这个校验和，造成大约10%的性能损失。

```
rebchecksum yes
```


### APPEND ONLY MODE



AOF是一种更安全的策略，默认情况下最多只丢失1s的数据。AOF和RDB可以同时启用，而AOF提供了更好的持久性保障，所以**服务器启动的时候会优先加载AOF**。

```
appendonly no
```

AOF文件的名字。AOF文件由多个文件组成，包含两种基本类型：

- **Base files**，基本文件，就是代表所有数据集在该文件被创建的时刻的完整状态的一个快照。细分为两种格式：RDB（二进制序列化的） 或者 AOF（文本命令）
- **Incremental files**，增量文件，包含了应用于数据集的额外命令

除此之外，**manifest files**（清单文件）用来追踪文件被创建、应当被使用的顺序。

AOF文件是按照一定的规则命名的，其中文件名的前缀就是下面定义的`appendonly.aof`，例如下面几个文件可能会被创建：

- appendonly.aof.1.base.rdb 基本文件
- appendonly.aof.1.incr.aof, appendonly.aof.2.incr.aof 增量文件
- appendonly.aof.manifest 清单文件

```
appendfilename "appendonly.aof"
```

为了方便期间，服务器会把所有的持久化AOF文件放到一个专用的目录下，该目录的名字由下面的参数决定:

```
appenddirname "appendonlydir"
```

`fsync()`调用告诉操作系统将数据立即写入磁盘，而不是先放到缓冲区积攒更多的数据。Valkey支持以下三种刷盘模式：

- `no`：不主动调用`fsync()`，让操作系统自己决定什么时候刷盘。最快。
- `always`：每次`write`都会调用`fsync()`，最安全，最慢。
- `everysec`：每秒调用一次`fsync()`。折中。

默认是第三种，毕竟在速度和安全性之间折中往往是正确的选择。

```
# appendfsync always
appendfsync everysec
# appendfsync no
```

但是在 AOF 重写（BGREWRITEAOF）的过程中，磁盘 I/O 压力很大，如果这时还频繁执行 fsync，可能会导致性能急剧下降。如果启用下面的参数，在执行AOF重写时，不执行`fsync`，而是只写入操作系统缓存。这样可以避免IO阻塞，但是也会带来安全风险。

```
no-appendfsync-on-rewrite no
```

**AOF自动重写机制**：

- 当前 AOF 文件大小比上次重写后的大小翻倍（增加 100%），就会触发自动重写
- 大前提：当前AOF文件大于64MB。

```bash
# 自动重写 AOF 文件。
# Redis 能够在 AOF 日志文件增大到指定百分比后，自动调用 BGREWRITEAOF 来进行重写。

# 工作原理如下：Redis 会记住最近一次重写后的 AOF 文件大小（如果重写还未发生过，则使用启动时 AOF 文件的大小）。

# 这个基准大小会与当前 AOF 文件大小进行比较。如果当前大小超过了指定百分比，就会触发重写操作。
# 同时你还需要设置一个 AOF 文件的最小大小，以避免文件虽然增长了指定百分比，但总体仍然太小就进行重写。

# 如果将百分比设为 0，就会禁用 AOF 自动重写功能。

auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```


**AOF 文件加载与重写机制**：

如果启动过程中发现AOF文件末尾被截断，就会用到这个参数。服务器将发出以下日志：

```
* Reading RDB preamble from AOF file...
* Reading the remaining AOF tail...
# !!! Warning: short read while loading the AOF file !!!
# !!! Truncating the AOF at offset 439 !!!
# AOF loaded anyway because aof-load-truncated is enabled
```

默认情况下只是会丢弃最后一条不正确的命令，继续加载，

- aof-load-truncated 控制 Redis 在 AOF 文件末尾损坏时是否仍然加载有效数据并启动，默认开启增强容错性；
- aof-use-rdb-preamble 允许 Redis 在 AOF 重写时使用 RDB 格式开头，加速数据恢复，提升性能。两者结合使 AOF 更可靠和高效。

```bash
# Redis 启动过程中在加载 AOF 数据时，可能会发现 AOF 文件末尾被截断。
# 这种情况通常出现在 Redis 所在的系统崩溃时，特别是在 ext4 文件系统未启用 data=ordered 选项的情况下。
# 但如果只是 Redis 自身崩溃，而操作系统仍正常，这种问题通常不会发生。

# 当 Redis 发现 AOF 文件末尾被截断时，可以选择两种行为：
# 1. 报错并停止启动（默认不是这样）
# 2. 或者尽可能加载有效数据，并继续启动（默认行为）

# 这个配置项控制上面提到的行为：
# 如果设置为 yes，Redis 会加载尽可能多的有效数据并启动，同时记录日志提醒用户。
# 如果设置为 no，Redis 会报错并拒绝启动，要求用户使用 redis-check-aof 工具修复 AOF 文件。

# 注意：如果 AOF 文件中间部分损坏，无论这个选项设置为 yes 或 no，Redis 都会拒绝启动。
# 此选项仅适用于 AOF 文件**末尾**不完整的情况。

aof-load-truncated yes

# Redis 在重写 AOF 文件时，可以在 AOF 文件开头使用 RDB 格式的数据来加快重写和恢复过程。
# 启用这个选项后，重写后的 AOF 文件由两个部分组成：

#   [RDB 数据部分][AOF 命令部分]

# RDB格式往往更快更高效，推荐开启

aof-use-rdb-preamble yes

```

服务器支持把时间戳注解记录在AOF文件中，但是启用的话改变AOF的格式，可能和先存在AOF转换器不兼容。

```
aof-timestamp-enable
```

valkey附带的有工具修复的原始文件：

```bash
valkey-check-aof --fix <filename>
```






