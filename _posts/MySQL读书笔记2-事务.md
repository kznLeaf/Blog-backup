---
title: 《MySQL技术内幕》读书笔记2-事务
tags:
  - 数据库
date: 2025-08-17 18:55:43
index_img:
categories: Database
---

## 目录

1. [事务的特性](#事务的特性)
2. [事务的分类](#事务的分类)
3. [redo](#redo)
   1. [binlog](#binlog)
   2. [log block 重做日志存储格式](#log-block-重做日志存储格式)
   3. [log group](#log-group)
   4. [重做日志内容格式](#重做日志内容格式)
   5. [LSN](#lsn)
4. [undo](#undo)
   1. [undolog的格式](#undolog的格式)
   2. [purge](#purge)
5. [group commit](#group-commit)
6. [事务的隔离级别](#事务的隔离级别)
7. [分布式事务](#分布式事务)
   1. [XA事务](#xa事务)
   2. [两阶段提交](#两阶段提交)
8. [长事务](#长事务)


## 事务的特性

ACID

| 特性  | 英文缩写 | 关键点               | 实现机制     |
| --- | ---- | ----------------- | -------- |
| 原子性 | A    | 全部成功或全部失败         | undo log |
| 一致性 | C    | 数据从一种一致状态到另一种一致状态 | 依赖 A、I、D |
| 隔离性 | I    | 并发事务互不干扰          | 锁、MVCC   |
| 持久性 | D    | 提交的数据不会丢          | redo log |

## 事务的分类

- 扁平事务 Flat
- 带有保存点的扁平事务 Savepoints
- 链事务 Chained
- 嵌套事务 Nested
- 分布式事务 Distributed

**扁平事务**：最简单的一种，BEGIN开始，COMMIT结束，要么都提交，要么都不提交。

带有保存点的扁平事务允许部分回滚，这是通过设置保存点来实现的。用法：`SAVEPOINT 保留点的名称`，回滚`ROLLBACK TO 保留点的名字`

扁平事务的保存点在系统崩溃后会丢失，而**链事务**解决了这一问题。当一个事务提交（COMMIT）或回滚（ROLLBACK）后，数据库会**立即自动开启一个新的事务**，提交事务的操作和开启下一个事务的操作是一个原子操作，就好像在一个事务中进行的一样。而且，链事务只能回滚到最近的一个保存点。

**嵌套事务**：嵌套结构，顶层事务控制着下面的子事务，子事务既可以是扁平的也可以是嵌套的，形成一个树状结构，如图所示：

![嵌套事务的层次结构](https://s21.ax1x.com/2025/08/11/pVdrlJe.png)

类似数据结构中的树，处于根节点的事务被称为顶层事务，其他事务被称为儿子事务；事务的前驱被称为父事务，下一层被称为儿子事务。

任何子事务在顶层事务提交后才会真正被提交；树中的任意一个事务的回滚会引起它的所有的子事务一同回滚。

**InnoDB并不原生支持嵌套事务**

## redo

重做日志用来实现**事务**的**持久性**，由两部分组成：

- 内存中的**重做日志缓冲**
- 硬盘中的**重做日志文件**

*事务提交时，必须将所有的缓冲重做日志都写入到磁盘中*。为了确保这一点，InnoDB引擎会调用`fsync`，目的是将文件系统写缓冲区的数据立即写入磁盘。

`innodb_flush_log_at_trx_commit`控制重做日志刷新到磁盘的策略。默认情况下，值为1，事务提交时必须调用fsync。0表示把写入重做日志的操作交给主线程，每隔1秒执行一次；2表示事务提交时把重做日志写入文件系统的写缓冲中，由文件系统决定延迟写入。

手动关闭`fsync`（把参数设置成0或者2）可以明显提高数据库的性能，代价是丧失了事务的ACID特性。

### binlog

binlog，二进制日志，用于**主从复制和数据恢复**。binlog有三种模式：

- ROW: 记录每一行的变化
- STATEMENT：记录原始SQL语句
- MIXED：默认该模式，优先使用STATEMENT，如果可能导致主从不一致才会使用ROW。

如果是STATEMENT，binlog 的原理和操作系统的文件系统日志差不多，都属于逻辑日志，与 redo 日志的区别：

- 管辖范围：redo日志由 InnoDB 存储引擎产生，不记录存储引擎以外的操作；binlog在MySQL数据库的上层产生，一个数据库可以使用多个存储引擎，任何存储引擎对数据库更改都会产生二进制日志。
- binlog是一种逻辑日志，记录SQL语句；redo日志是物理日志，记录具体的修改数据。
- 二进制日志只在事务提交完成后写入一次，redo日志在执行时就不断写入缓冲区

| 特性   | binlog           | redo log           |
| ---- | ---------------- | ------------------ |
| 写入时机 | 事务提交时一次性写入       | 执行过程中不断写入          |
| 记录内容 | 逻辑操作（SQL 或行变更事件） | 物理页修改              |
| 顺序   | 严格按事务提交顺序        | 按物理修改产生的先后顺序（可能交错） |
| 作用   | 归档、复制            | 崩溃恢复（保证持久性）        |

具体解释一下，对于 redo 日志来说，事务执行时，每条修改语句立即把对应的物理页修改记录写入 redo log buffer 缓冲区中，这里借用了文件系统的缓冲区，一旦写入，文件系统就会根据自身的规则延迟将其写入磁盘。因此事务没提交时，redo log 也可能**已经部分写入磁盘**，提交时调用`fsync`是为了确保所有尚未写入磁盘的数据都能被写入完毕。

对于 binlog 来说，每条会产生 binlog 的语句会把对应的逻辑操作记录写入`binlog cache`，**事务提交前永远也不会写入磁盘**，事务提交时才开始写入（缓冲写），避免记录未提交的事务。

### log block 重做日志存储格式

> 磁盘提供的原子性保证：磁盘保证任何 512 字节的写入都会发生或不发生。

重做日志是以**日志块**（redo log block）为单位进行存储的，而一个日志块的大小是（512字节），原因就在上面。得益于此，日志块 512 字节的写入也都是原子的，而且不管是缓存中还是磁盘中，重做日志都是以块的方式存储的。所以重做日志不需要doublewrite机制维护页的完整性，因为磁盘本身已经保证了。

**redo buffer的结构**（磁盘上的结构跟这个差不多）

![](https://s21.ax1x.com/2025/08/11/pVd6kRg.png)

- 块头部：12字节
- 数据块：492字节
- 块尾部：8字节

**日志块头部**又由四部分组成，从上到下一次占用4、2、2、4字节。从上到下的作用依次为：

1. 标记该块在缓冲区中的位置，循环使用
2. 该块已经被使用的大小，最大`0x200`即512字节
3. 该日志块中，第一个新日志的偏移量。因为一个数据块中可能包含某个较大的重做日志的后半部分，所以需要加一个偏移量用来标记下一个日志的起点位置。
4. 检查点的编号，检查点的意思是在次之前的数据和元数据都已经写入磁盘，全局递增

**尾部**字段和头部的第一个字段的值相同，可用于**完整性校验**，因为写入 redo 日志时是先写头部、数据块，再写尾部，如果尾部还没写完，就能判断这个块不完整。

### log group

**重做日志组**，是由一组 redo 日志文件构成的集合。磁盘中的的 redo log 并不是一个文件，而是**一组大小相等的日志文件**，也就是日志组。日志组和日志文件之间的关系：

![](https://s21.ax1x.com/2025/08/11/pVd6ISg.png)

日志组中的第一个日志文件还保存了2KB的元数据，用于恢复存储引擎。其余日志文件保留2KB的区域，但是不写入数据。这2KB区域的结构如下：

|名称 | 大小（字节） | 作用 |
|-------| ------ |  --- |
|log file header | 512 |记录日志组的配置信息，如groupID、LSN |
| 检查点1 | 512 | 第一份检查点信息 |
| 空 | 512 | 保留区 |
| 检查点2 | 512 | 第二份检查点的信息 |

其中检查点信息用于存储最近一次检查点的 LSN 位置，即已经持久化到磁盘的 redo 日志的位置。

![逻辑结构](https://s21.ax1x.com/2025/08/11/pVdNdmD.png)

### 重做日志内容格式

**InnoDB基于页进行管理，所以重做日志的格式也是基于页的**。下面讨论重做日志的log block里存储的内容是按照什么格式进行的。

- 通用头部
  - redo_log_type：重做日志的类型
  - space：表空间的id
  - page_no：页的偏移量。
- redo log body：内容根据重做日志的类型而不同

log buffer 根据一定的规则持久化到磁盘中的日志文件中，而且属于**追加写入**。

### LSN

前面提到，日志组的第一个重做日志文件存储的 log file header 存储了LSN。LSN 的全称是 Log Sequence Number，**日志序列号**，是数据库中为每条日志记录分配的唯一且递增的编号，通常以字节偏移量表示日志在日志文件中的位置。**在 InnoDB 里，LSN 记录了 重做日志写入的总字节数，从数据库实例启动时开始累计递增**。

日志、页、检查点都有自己的LSN。

LSN不仅位于重做日志，也位于每个页的头部，页头部的LSN表示该页最后一次被修改时 LSN 的大小，用于检测是否需要恢复操作。如果页的 LSN 小于重做日志，说明需要恢复。

使用`show engine innodb status`查看LSN的情况：

```
---
LOG
---
Log sequence number 116339
Log flushed up to   116339
Pages flushed up to 116339
Last checkpoint at  116323
```

解释：

- LSN序列号，表示重做日志的进度
- 刷新到重做日志文件的LSN，这里表示日志文件中已经包含了所有的最新记录。
- 缓存到 Buffer Pool 中的数据页已经写入磁盘的进度，实时刷新。这里表示所有的数据页都已经刷新到磁盘。
- 检查点是崩溃恢复的起始标记，检查点按照一定规则定期刷新

InnoDB引擎会记录最后一次检查点的位置，每次在启动引擎时，都会进行恢复操作，**从上一次检查点开始读取重做日志**进行恢复。又因为重做日志是物理日志，记录的是具体的数据，所以恢复速度要快得多。而且重做日志是可以多线程**并行**进行的，具体的实现方法是把日志分成无冲突的不同分区，交给不同的线程并行执行，而有冲突的操作必须顺序执行。

## undo

redo 用于数据库的恢复，而 undo 用于**回滚**，属于逻辑日志。对数据库的修改既会产生 redo 日志，也会产生 undo，同时 undo 日志也有对应的 redo 日志，因为 undo 也是需要持久化，保证断电或崩溃后能正确回滚。

uodo日志主要有两个作用：

- **逻辑回滚**rollback
- **MVCC实现非锁定读**。当读取记录时，若该记录被其他事务加锁，或当前版本对该事务不可见，则可以通过 undo log 读取之前的版本数据，以此实现非锁定读。

执行回滚操作时读取 undo 日志，将数据库**逻辑地**恢复到原来的样子。比如，一个用户插入了10W条数据，这会导致表空间的增大，但是 undo 日志只是记录相反的操作`DELETE`，并不会把表空间的大小也缩小到原来的状态。

**存储位置：** 表空间的`undo segment`。**管理方式**：`rollback segment`，一个rollback段包含1024个 undo segment。以段为单位申请页。

事务提交时，undo log的去向：

- 将 undo log 放入一个链表(History List)
- 判断 undo log 所在的页是否可以重用，可以就继续分配给下一个事务

由 purge 线程负责最终删除 undo log。

### undolog的格式

分为两种，一种是针对不存在的数据，一种是针对已经存在的数据

- insert undo log。
- update undo log，包含 update 和 delete 两个操作

insert日志可以在事务提交后直接删除，但是update不行，还要用于MVCC机制，所以先放入历史链表中，链表头部是最新的记录。

用下面的命令可以查看事务状态：

```sql
SELECT * FROM information_schema.innodb_trx\G
```

### purge

清理思路：清理之前的delete和update，使其最终完成。适用于已经不被任何事务引用的操作。

先从History List找到第一个需要被清理的日志，然后从该日志所在的页继续找别的需要清理的日志，找不到就回到链表往下找。

![](https://s21.ax1x.com/2025/08/12/pVdoKGn.png)


## group commit

- 对于只读事务，不涉及磁盘文件的更改，所以提交时不需要fsync
- 对于非只读事务，必须在事务提交时立即执行fsync，保证 redo 日志都已经写入磁盘。

传统单事务提交每个事务都要调用一次fsync，group commit是为了提高fsync的效率，一次性将多个重做日志写入磁盘。**工作原理**：

- 当第一个事务请求提交时，会发起磁盘同步请求。
- 在磁盘同步完成前，如果有其他事务也发起提交，这些事务不会立即调用 fsync，而是等待第一个事务的同步结果。
- 这样，多个事务的日志写入可以被合并到一个磁盘写入操作中，一次 fsync 同时保证了多个事务的持久化。
- 等待的事务在磁盘同步完成后，统一收到提交成功的通知，完成提交流程。

同时提交的事务越多，group commit的效果越明显，数据库性能的提升就越大。

---

InnoDB 1.2 之前，开启 binlog 会让事务提交流程串行执行，`binlog fsync` 和 `redo log fsync` 不能并行或者合并执行，从而让 group commit 失效。MySQL 5.6 引入 binlog group commit 才解决了这个问题：

![](https://s21.ax1x.com/2025/08/12/pVwPUxK.png)

## 事务的隔离级别

有四种事务隔离的级别标准，但是很少有数据厂商遵循这些标准，比如Oracle不支持RR隔离级别。

- RU：READ UNCOMMITED
- RC: READ COMMITED
- RR: REPEATABLE READ
- SERIALIZABLE

InnoDB存储引擎默认RR，但是附带Next-key算法，避免了幻读。默认RR没有幻读保护。

## 分布式事务

分布式事务允许多个不同的事务来源参与到一个全局事务中。使用分布式事务必须把InnoDB引擎的事务隔离等级提升为SERIALIZABLE。

### XA事务

XA事务是一种分布式事务协议，它扫描多个资源来源，比如数据库、消息队列，可以确保不同资源之间的一致性。XA事务使用**两阶段提交协议**，由全局事务管理器控制，可以确保要么更改全部被提交，要么全部不提交。

XA事务分为**外部和内部两种**：

- 外部XA事务：**由外部事务管理器负责协调**，MySQL也只是一个参与者（RM），MySQL不负责全局事务的协调
- 内部XA事务：**MySQL本身就是协调器**，主要发生在 MySQL 的内部，InnoDB存储引擎和binlog之间，用于主从复制。

XA 的组成：

- AP，Application Program，事务发起方，应用程序
- TM，Transaction Manager，事务管理器，也叫协调器，负责调度多个资源的提交和回滚，与所有参与全局事务的资源管理器进行通信。
- RM，Resource Manager，资源管理器，也叫参与者，提供访问事务资源的方法，比如数据库，消息队列

### 两阶段提交

参考：https://en.wikipedia.org/wiki/Two-phase_commit_protocol

Two-phase commit, 2PC

2PC是一种**分布式算法**，用于协调参与到分布式原子事务的进程是否提交或者终止/回滚事务。为了从故障中恢恢复，参与者需要记录日志。

**外部XA：**

1. 预提交请求阶段：应用程序发起事务，每个资源管理器执行事务但不真正提交，并记录足够的日志以保证之后可以安全提交或回滚。所有参与者告诉事务管理器准备就绪或者失败。
2. 如果所有的参与者都返回准备就绪，事务管理器就发送commit请求，有任何一个失败则发送终止或回滚请求。

**内部XA：**用于保证**主从复制的一致性**

![](https://s21.ax1x.com/2025/08/12/pVwPIaj.png)

1. 主库把事务的修改写入 redo log buffer，调用`fsync`，然后标记为`prepare`状态，**先不提交事务**。
2. MySQL服务层将事务的SQL语句写入binlog cache，然后`fsync`持久化到binlog文件。
3. （仅限主从复制同步）主库把binlog文件发送给从库，从库IO线程将其写入`relay log`，这一步是为了复制同步
4. 服务层调用commit，InnoDB 将之前准备状态的redo log改成commit状态，正式提交事务。此时redo log和 binlog 都持久化。
 
> - redo log目的是恢复已经提交，但是还没有完全写入磁盘的事务，循环写，会覆盖旧日志，只能恢复到最近一次崩溃前的状态。只限于InnoDB内部使用。目的是保证事务持久性。
> - binlog记录MySQL的所有逻辑操作，文件无限追加，可长期保存，所以可以恢复到任意时间点。主从复制时，从库可以读取binlog用于复制。能够跨引擎使用。负责复制和历史恢复（尤其是从机）。只能从头重放，速度非常慢，所以不适合用来崩溃恢复。

重启恢复时，MySQL先检查 binlog，如果找不到事务的记录就直接回滚到原来的状态；如果能找到，说明第二步已经执行过了,继续看 redo log 的状态：如果是`preapare`，说明两个日志都已经写入磁盘，就差最后一步提交了，那就直接补一个`commit`指令即可。

## 长事务

例如：更新表中的一亿条数据。采用分批处理的思想比较好。伪代码如下：

```sql
void ComputeInterest(double interest_rate) {
    long last_account_done, max_account_no, log_size;
    int batch_size = 100000;

    -- 检查是否存在上下文
    EXEC SQL SELECT COUNT(*) INTO log_size FROM batchcontext;

    -- 首次执行的逻辑
    if (SQLCODE != 0 || log_size == 0) {
        EXEC SQL DROP TABLE IF EXISTS batchcontext;
        EXEC SQL CREATE TABLE batchcontext (last_account_done BIGINT);

        last_account_done = 0;
        INSERT INTO batchcontext SELECT 0;
    } else {
      -- 从上下文表中获取上次处理的位置
        EXEC SQL SELECT last_account_no
                 INTO last_account_done
                 FROM batchcontext;
    }

    
    EXEC SQL SELECT COUNT(*) INTO max_account_no
             FROM account LOCK IN SHARE MODE;

    WHILE (last_account_no < max_account_no) {
        EXEC SQL START TRANSACTION;

        EXEC SQL UPDATE account
                 SET account_total = account_total * (1 + interest_rate)
                 WHERE account_no BETWEEN last_account_no
                                       AND last_account_no + batch_size;

        EXEC SQL UPDATE batchcontext
                 SET last_account_done = last_account_done + batch_size;

        EXEC SQL COMMIT WORK;

        last_account_done = last_account_done + batch_size;
    }
}
```

**核心设计思想：**

1. 分批处理策略：设定一个固定批次大小，分批处理
2. 断点续传机制：使用`batchcontext`表**记录处理进度**，支持中断后从上次停止的位置继续执行。






