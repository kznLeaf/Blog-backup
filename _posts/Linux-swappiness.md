---
title: 关于Linux的swap分区的广泛误解-swappiness参数
tags:
  - Linux
  - 操作系统
date: 2025-08-28 22:01:35
index_img:
categories: Linux
---


`swappiness`是一个和Linux系统交换分区的行为有关的函数。通过下面的命令可以查看该参数的值：

```bash
cat /proc/sys/vm/swappiness
```

`sudo nano /etc/sysctl.conf`可永久修改此参数。默认值是60. 很多人认为这个参数给物理内存设定了一个阈值，当使用的内存超过(100-60)%时，就会开始内存交换，把内存中最远未使用的数据写入 swap 分区。然而这样的说法其实是有很大问题的。

![[阿里云也干了](https://www.alibabacloud.com/help/zh/ecs/support/how-do-i-configure-the-swap-partition-of-a-linux-instance)](https://s21.ax1x.com/2025/08/28/pV60hm4.png)

## 问题发现

今天在 Debian 虚拟机上测试 ElasticSearch，因为 es 本身内存占用较大，而我只给虚拟机分了 6G 内存，所以总内存占用一直维持在 90% 左右。后来使用`btop`命令发现 swap 分区已经满了：

![](https://s21.ax1x.com/2025/08/28/pV6wKVs.png)

然后我去查阅了以一下，排名靠前的搜索结果都说 `swappiness` 默认设定当内存占用超过 60% 的时候就会开始把文件写入 swap 分区。但是又过了一段时间（期间只执行过几条 es 命令，没有开启新的进程），`btop`显示：

![](https://s21.ax1x.com/2025/08/28/pV6wMan.png)

总内存占用几乎保持不变，但是 swap 分区被清空了？按理来说不应该是内存占用降下去之后才把swap的数据写回内存吗。这说明这个说法多少是有点问题的。

## 排查

在Google上搜索"Linux如何使用swap分区"，然后找到了[ArchWiki的条目](https://wiki.archlinuxcn.org/wiki/Swap)，里面提到：

> 有一个常见的误解是`swappiness`会影响内存阈值或阻止使用交换空间，但它只影响释放文件页面而不是交换的偏好。有关更详细的解释，请参阅[这篇文章](https://www.howtogeek.com/449691/what-is-swapiness-on-linux-and-how-to-change-it/)或[内核源代码](https://github.com/torvalds/linux/blob/v6.2/mm/vmscan.c#L3000-L3014)中它的使用。  

下面简单总结一下。

## 前置知识

### Linux的内存结构

Linux系统并不会把内存看作一整个巨大的内存池，而是把内存划分成不同的**区域**（`Zone`）。x86架构的简化内存区域如下：

- DMA：物理内存的低16MB区域
- DMA32：**只存在于64位 Linux 中**，目的是兼容32位的DMA硬件设备。对应物理内存的低4GB。这是一种**逻辑上的分区**，64位DMA设备可以访问全部的内存，32位DMA设备只能访问低4GB的内存。
- Normal：在 64 位计算机上，Normal 区是所有 高于 4 GB 的内存（大致上）。在 32 位计算机上，它是 16 MB 到 896 MB 之间的 RAM。
- HighMem：这个区域**只存在于 32 位 Linux 中**。它指的是 所有高于 896 MB 的内存，在拥有足够大内存的机器上，还包括高于 4 GB 的部分。

### 区域(Zone)和节点(Node)

**区域（Zone）与节点（Node）相关联，节点又与CPU关联。内核通过与 CPU 关联的节点为进程分配内存。**

一般的Linux计算机只有一个`Node 0`节点，所有的 Zone 都属于这个节点。要查看计算机中的节点和区域，可以使用下面的命令：

```bash
less /proc/buddyinfo
```

6GB双核虚拟机输出如下：

```
Node 0, zone      DMA      0      0      0      0      0      0      0      0      0      1      3 
Node 0, zone    DMA32    388    213    142    143     56     20      6      7      3      1      5 
Node 0, zone   Normal    195   1297    966    279    116     55     37     13      6      0      0 
```

从左到右，每一列分别表示4KB 8KB 16KB 等等（因为内存是以4KB为单位进行分配的），数字表示不同块的数量。

如果总物理内存小于4GB，那么将不会有`Normal`区域。

### 文件页和匿名页

页表中的内存映射可以是：

- **文件页(File backed)**: 页表项来源于磁盘中的文件，这种内存映射包含已经从任意类型文件中读取的数据。如果系统释放了这块内存，下次读取该文件的时候就必须访问磁盘。在释放内存之前，如果内存中的数据已被修改，需要先同步到磁盘，然后才能释放，防止修改丢失。
- **匿名页(Anonymous)**：匿名内存不映射到任何文件和设备，一般是程序动态请求的内存、堆栈等。这种数据并非来自磁盘文件或设备，而是动态产生的，所以必须在磁盘单独留一个专门的空间来存储它们，这个空间就是 swap 分区或者 swap 文件。在匿名数据页被内存释放之前，其中的数据会被写入swap空间。
- **设备页**(Device backed)：Linux系统通过块设备文件访问设备，这样可以像处理文件一样从中读取或者写入数据。设备支持的内存映射（device backed memory mapping），就是指映射的内存区域背后实际存放的是某个设备的数据。
- **共享页**(Shared)：不同的页表项可以映射到内存的同一区域，这样不同的进程可以非常高效地通信。
- **写时复制**： 一种惰性分配技术，如果请求复制内存中已有的资源，则返回指向原始资源的映射。如果共享该资源的某个进程尝试写入该资源，才会把资源真正复制到另一块内存中，然后才能允许修改。即，写入命令只在第一个写入命令时进行。

为了理解`swappiness`，只需要关心前两项。

## Swappiness

Linux内核文档是这样描述 swappiness 的：

> 此参数用于定义内核交换内存页的积极程度，值为 0 表示在空闲页面和文件页面的数量低于高水位线之前，内核不会启动swap过程。默认值是60.

这里指出，将`swappiness`设置为 0 的话并不会关闭交换功能，只是告诉内核在满足某些条件之前（“高水位线”）不会启动交换，但是最后还是会发生交换的。

在[内核源文件](https://github.com/torvalds/linux/blob/master/mm/vmscan.c#L176)中包含下面几行：

```c
/*
 * From 0 .. MAX_SWAPPINESS.  Higher means more swappy.
 */
int vm_swappiness = 60;
```

这里提到`swappiness`的取值范围是 0 .. MAX_SWAPPINESS。在`linux/include/linux/swap.h`可以找到这个宏定义

```c
#define MAX_SWAPPINESS 200
```

[代码地址](https://github.com/torvalds/linux/blob/master/include/linux/swap.h#L417)

> 顺便一提，`MAX_SWAPPINESS`在更早的版本是硬编码在代码中的，而且取值为100，而不是200。 这一部分的源码在5.8版本后发生了比较大的修改，与[这篇文章](https://www.howtogeek.com/449691/what-is-swapiness-on-linux-and-how-to-change-it/)展示的代码差别很大。

**也就是说`swappiness`的取值范围是0到200**，所以之前所谓的`swappiness`是为内存交换设定了一个阈值的说法是**不成立的**，如果我把它设为大于 100 会发生什么？负数阈值嘛。

继续挖`vmscan.c`这个源文件，可以找到下面的[代码](https://github.com/torvalds/linux/blob/master/mm/vmscan.c#L2448)：

```c
static inline void calculate_pressure_balance(struct scan_control *sc,
			int swappiness, u64 *fraction, u64 *denominator)
{
	unsigned long anon_cost, file_cost, total_cost;
	unsigned long ap, fp;

	/*
	 * Calculate the pressure balance between anon and file pages.
	 *
	 * The amount of pressure we put on each LRU is inversely
	 * proportional to the cost of reclaiming each list, as
	 * determined by the share of pages that are refaulting, times
	 * the relative IO cost of bringing back a swapped out
	 * anonymous page vs reloading a filesystem page (swappiness).
	 *
	 * Although we limit that influence to ensure no list gets
	 * left behind completely: at least a third of the pressure is
	 * applied, before swappiness.
	 *
	 * With swappiness at 100, anon and file have equal IO cost.
	 */
    // 计算成本
	total_cost = sc->anon_cost + sc->file_cost;
	anon_cost = total_cost + sc->anon_cost;
	file_cost = total_cost + sc->file_cost;
	total_cost = anon_cost + file_cost;

	ap = swappiness * (total_cost + 1); // 匿名页压力，随swappiness增大而增大
	ap /= anon_cost + 1;                // 成本越大，压力越小

	fp = (MAX_SWAPPINESS - swappiness) * (total_cost + 1);//文件页压力，随swappiness增大而减小
	fp /= file_cost + 1;

	fraction[WORKINGSET_ANON] = ap; // 匿名页压力比例
	fraction[WORKINGSET_FILE] = fp; // 文件页压力比例
	*denominator = ap + fp;         // 总压力
}
```

> 压力指的是LRU列表被扫描和回收的强度，压力最终会被转换为扫描的页数。压力越大，**释放页**的优先级就越高。对于文件页，释放意味着写入磁盘；对于匿名页，释放意味着写入交换区。

最关键的有两行：

- `ap = swappiness * (total_cost + 1)`
- `fp = (MAX_SWAPPINESS - swappiness) * (total_cost + 1)`

压力代表的是回收的优先级，压力越大就意味着IO成本越小，越优先进行。**上面两行说明匿名页和文件页的压力是此消彼长的关系，并且当swappiness=100时，两边的压力相等，即匿名页和文件页的释放成本相同**。这就是为什么注释的最后一行说 *With swappiness at 100, anon and file have equal IO cost.*

## 黄金比例

对于文件页来说，我们总是可以通过从**磁盘**中读取文件来填充内存中的数据页，**所以文件页是完全没有必要写入swap区的**，释放文件页的话直接写入它在磁盘中的原来位置就行了。

对于匿名页，内存中的数据没有与磁盘相关联，因为是动态获取的。为了在释放以后能够把匿名页面恢复过来，需要把它存储在交换区。

无论文件页还是匿名页，释放内存的时候都会写入磁盘，由文件系统管理，读数据的话都要调用文件系统read，所以说这两种页面回收操作的成本都很高。从前面也可以看出，文件页和匿名页的回收强度是此消彼长的，试图通过最小化匿名页的交换来减少磁盘IO只会增加文件页读写的IO。

`swappiness`不会设置任何阈值来决定何时使用交换空间，它主要是决定了内核释放数据页的**倾向**。当需要释放内存时，回收和交换算法会考虑`ap`和`fp`以及它们之间的比率，以确定优先考虑释放哪些类型的页面。这确定了硬盘是先处理磁盘文件，还是处理匿名页的交换分区/交换文件。

至于什么时候才会真正启用交换空间，根据上面的分析暂时确定的是`swappiness`决定了Linux内核会优先考虑释放内存中的文件页还是匿名页。实际上决定交换空间何时启用的是**水位线**。每个内存区域都有一个高水位线和一个低水位线。这些值由系统产生，是每个区域 RAM 的百分比，被用作交换空间的触发阈值。要检查高水位线和低水位线，使用以下命令查看 ` less /proc/zoneinfo` 每个区域都有一组以页为单位的内存值，例如下面是DMA32区域的情况：

```
Node 0, zone    DMA32
  pages free     17298
        boost    0
        min      8525
        low      10656
        high     12787
        spanned  1044480
        present  782304
        managed  765920
        cma      0
        protection: (0, 0, 2875, 2875, 2875)
      nr_free_pages 17298
      nr_zone_inactive_anon 715717
      nr_zone_active_anon 1144
      nr_zone_inactive_file 9386
      nr_zone_active_file 11214
      nr_zone_unevictable 0
      nr_zone_write_pending 0
      nr_mlock     0
      nr_bounce    0
      nr_zspages   0
      nr_free_cma  0
      numa_hit     1135816
      numa_miss    0
      numa_foreign 0
      numa_interleave 2
      numa_local   1135816
      numa_other   0
  pagesets
    cpu: 0
              count: 591
              high:  5328
              batch: 63
  vm stats threshold: 24
    cpu: 1
              count: 2495
              high:  5328
              batch: 63
  vm stats threshold: 24
  node_unreclaimable:  0
  start_pfn:           4096

```

> 在正常运行条件下，当某个内存区域（zone）的可用内存低于该区域的低水位线（low water mark）时，交换（swap）算法就会开始扫描内存页，寻找可以回收的内存。
> 
> 如果 Linux 的 swappiness 值被设置为 0，那么只有当文件页和空闲页两者的总和低于高水位线（high water mark） 时，才会触发 swap。


## 总结

**交换分区不仅仅是内存空间不够用时释放内存的机制，而是系统正常运行的重要组成部分**，没有它。Linux很难实现合理的内存管理。`swappniess`并不会设置所谓的交换阈值，`swappniess`代表了内核对于写入交换空间的偏好，较低的值会导致内核更倾向于释放打开的文件，较高的值会导致内核倾向于将匿名页写入交换空间，而值 100 意味着IO成本被假定为相等。不存在最合适的`swappniess`，因为不同的设备情况是不一样的。对于大部分的桌面用户，不需要改动该值，







