---
title: 为二手笔记本重装Arch Linux系统过程记录
tags:
  - 折腾记录
  - Linux
date: 2025-07-29 23:20:02
index_img: https://s21.ax1x.com/2025/07/29/pVYRJVf.png
categories: Linux
---

I use arch btw  

<!-- more -->

为什么要专门买一个破笔记本安装 GNU/Linux 系统？一方面是因为最近在看《操作系统导论》，这本书是基于 UNIX 系统讲解的，当然也完全适用于 GNU/Linux，但是不知道为什么虚拟机上的linux输入延迟比较大，早就想装到实体机上体验一下了；另一方面，最近几个月没少被win11恶心，包括但不限于：

- 强制启用hyper-v
- Alt+Tab打乱输入法
- 桌面图标每次开机后都会重新排列
- 睡眠模式概率睡死且硬盘通电次数暴增
- 越更新bug越多，在7月9日更新之后每次笔记本开机都有很大的概率蓝屏

所以我考虑转向 GNU/Linux。

## 选型

预算：1000￥以内，附加要求：能自由更换尽可能多的组件

去咸鱼上转了一大圈，能把价格压到1000以内的基本都是六七年以前的老笔记本，当然也有全新的但是我没捡到漏。最后盯上了两款：

- 一个专门卖 ThinkPad 的贩子的 e470，880￥
- 联想小新老型号，这个卖的人一大把，600￥

最后本着便宜优先的原则拍下了联想小新2019丐款。拆开后盖马上就后悔了...不如换成更方便折腾的thinkpad

今天看到了一个视频：[Building the ultimate ThinkPad!](https://www.youtube.com/watch?v=vtkQiLkNgOI)，视频里给Think Pad T440P里里外外都换了一圈，包括键盘、内存、硬盘、BIOS、屏幕、甚至就连 CPU 也是可拆卸的（插槽式CPU）😲

然后去某宝看了一眼，700+就能拿下，早知道买这个了。等找到实习攒够了钱就搞一个回来玩玩

## 拆机

![拆机](https://s21.ax1x.com/2025/07/28/pVYu5DS.jpg)

复古SATA固态，裸露的单热管，还有内存条的屏蔽罩跑哪儿去了😭算了能用就行。后盖上的防拆贴还在，从撬开后盖需要的力度来看这个笔记本不像是被拆过的，莫非是🐕‍🦺想在作妖

然后把风扇取下来清了清灰，发现基本没什么灰可以清。另外内存和网卡都太烂了，所以马上下单了一根16G内存和AX210网卡，过两天一到货马上开始换。系统信息：

![懒得截图了](https://s21.ax1x.com/2025/07/28/pVYKuUH.jpg)

## 装系统

主要参考[archlinux简明指南](https://arch.icekylin.online/)和[这个视频](https://www.bilibili.com/video/BV1L2gxzVEgs/?spm_id_from=333.337.search-card.all.click&vd_source=918a6909c997fbaf818d1fbc55d65ca9)。说一下分盘思路：

```
NAME   MAJ:MIN RM   SIZE RO TYPE MOUNTPOINTS
sda      8:0    0 238.5G  0 disk 
├─sda1   8:1    0     1G  0 part /boot/efi
└─sda2   8:2    0 237.5G  0 part /swap
                                 /home
                                 /
```

一共256G的硬盘，给 UEFI 分了1G，剩下的都用做根目录。没有为swap创建分区，因为用的是swap文件。文件系统使用 btrfs，方便快照和回滚。

## 升级内存&网卡

这个笔记本自带的内存是焊死的 4G 和一根可更换的DDR4 4G，一共 8G，实际工作频率是2400MHz。不过自带的内存条上写的是2666，估计是被压下去了。

8G内存感觉还是小了，因为还要给 GPU 分过去 2G。所以去pdd捡了根16G 2666MHz：

![内存](https://s21.ax1x.com/2025/07/28/pVYuJAJ.jpg)

是不是真货不知道，反正用着没毛病

----------------

自带的网卡是 QCA9377，有点太老了，换成AX210，简单比较一下：

| 参数          | **Intel AX210**             | **Qualcomm Atheros QCA9377** |
| ----------- | --------------------------- | ---------------------------- |
| 🆔 芯片代号     | Typhoon Peak                | Sparrow                      |
| 📶 Wi-Fi标准  | Wi-Fi 6E（802.11ax）          | Wi-Fi 5（802.11ac）            |
| 📡 频段支持     | 2.4 GHz + 5 GHz + 6 GHz（三频） | 2.4 GHz + 5 GHz（双频）          |
| 📊 MIMO配置   | 2x2 MU-MIMO                 | 1x1 SU-MIMO                  |
| 🚀 理论最大速率   | \~2.4 Gbps（802.11ax）        | \~433 Mbps（802.11ac）         |
| 📱 蓝牙版本     | 蓝牙 5.2                      | 蓝牙 4.1                       |
| 🔧 Linux 支持 | ✅ 新内核（5.10+）+ 最新固件          | ✅ 老内核（4.x）也支持                |
| 🔋 功耗       | 略高，但为高性能设计                  | 低功耗（适合移动设备）                  |
| 🧠 技术支持     | OFDMA, TWT, WPA3 等新特性       | 基础 802.11ac 功能               |
| 🧱 应用场景     | 高端笔记本、桌面、Wi-Fi 6E路由器        | 老旧笔电、Chromebook、便携设备         |


Linux内核已经内置了大量主流网卡的驱动，包括 AX210 在内，所以换上网卡之后什么也不用干就可以直接开始用了。（蓝牙鼠标要重新配对）

换完网卡感觉不仅网速变快，而且蓝牙鼠标的连接速度和灵敏度也快多了=w=

使用下面的命令可以查看当前的网卡信息：

```bash
lspci | grep -i net
```

- `lspci`：列出所有 PCI 总线上的设备
- `| grep -i net`对输出结果进行筛选，只保留包含`net`的行

输出：

```
╭─ ~                                                                          10:45:12
╰─❯ lspci | grep -i net
01:00.0 Network controller: Intel Corporation Wi-Fi 6E(802.11ax) AX210/AX1675* 2x2 [Typhoon Peak] (rev 1a)
```

也可以使用`lsmod | grep iwlwifi`查看 wifi 驱动加载情况。等以后组了台式机可以再把这张网卡换上，想想就爽

## 实用工具

### 代理

目前使用[v2raya](https://v2raya.org/)，速度尚可，使用方法参见[这篇博客](https://pengtech.net/network/v2rayA_install.html#3-1-%E9%85%8D%E7%BD%AE-v2rayA)。

### 图像查看

一开始用的是`gwenview`，感觉卡卡的，尝试好几种图像查看器之后发现`Okular`也可以用来看图像，而且流畅得多 =w=

### 硬盘测速

安装`hdparm`

```bash
sudo pacman -S hdparm
```

测试读取速度

```
sudo hdparm -Tt /dev/sdX
```

结果：

```
╰─❯ sudo hdparm -Tt /dev/sda

/dev/sda:
 Timing cached reads:   19300 MB in  1.98 seconds = 9725.01 MB/sec
 Timing buffered disk reads: 1328 MB in  3.01 seconds = 441.80 MB/sec
```

第一行是CPU缓存测试，第二行是顺序读速度。

### 文件互传

LocalSend 是一款跨平台的文件传输工具，可以直接从AUR安装：

```bash
yay -S localsend
```

windows、安卓、Linux，只要在同一个网络下，都可以非常方便地互传文件，强推

### 监视系统信息

btop，~~装b神器~~

![](https://s21.ax1x.com/2025/07/29/pVYTngS.png)

### 截图

Windows系统下最好用的截图工具无疑是 Snipaste，但是迟迟没有推出Linux版本。

`Spectacle`可以一用，虽然比不上Snipaste，但也够用了。

## 美化

- 主题美化参考[这个视频](https://www.bilibili.com/video/BV1WsGmzRECp/?spm_id_from=333.337.search-card.all.click&vd_source=918a6909c997fbaf818d1fbc55d65ca9)，使用 Nordic 主题，直接解决了毛玻璃效果无法使用的问题。
- Konsole 使用 zsh + [powerlevel10k](https://github.com/romkatv/powerlevel10k) 美化

效果图：

![](https://s21.ax1x.com/2025/07/29/pVYRJVf.png)

## 遇到的问题

### 锁屏动画失效问题

和 [Bug 499377](https://bugs.kde.org/show_bug.cgi?id=499377&utm_source=chatgpt.com) 反映的问题完全相同，同样的 error 日志也出现在[Bug 478601](https://bugs.kde.org/show_bug.cgi?id=478601)，表现为每次切换至锁屏界面的时候显示器都会变成左半边纯绿色、右半边纯黑，动画结束之后又会恢复正常。

先调用`journalctl -r`查看最近日志，定位锁屏出错信息

```
7月 26 12:10:03 Arch kscreenlocker_greet[3176]: Fai
led to write to the pipe: 错误的文件描述符.
7月 26 12:10:03 Arch kscreenlocker_greet[3176]: qt.
qpa.wayland: Could not create EGL surface (EGL error 0x3000)
```

`kscreenlocker_greet`：负责锁屏界面渲染，说明是锁屏界面在渲染 EGL 时失败，临时显示异常。上述日志的解释：

> 这是 Plasma 6 在 Wayland 锁屏程序 kscreenlocker_greet 里留下的已确认 bug（KDE Bug 478601/499377）。日志里 0x3000 实际代表 EGL_SUCCESS，但 Qt 仍把它当作警告打印出来。目前上游尚未合并修复补丁，很多用户都会在解锁或显示器重新点亮时看到同样的两行信息。

所以说这应该是目前 Wayland 的一个待修复 bug。于是我尝试切换为X11，发现`/usr/share/xsessions/`为空，后来才知道 X11 会话文件被拆成了独立的包`plasma‑x11‑session`提供，所以需要先单独安装这个软件包：

```bash
sudo -S plasma‑x11‑session
```

切换为X11后，需要重新设定屏幕缩放比例和鼠标灵敏度，其中屏幕缩放比例必须注销重新登录后才能生效；而且 x1 1情况下某些应用程序的动效变得十分卡顿？另外，锁屏动画也是不存在的，而是从原本的画面生硬地切换到锁屏画面，跟我预期的不一样。考虑到：

![](https://s21.ax1x.com/2025/07/26/pVJ5nzQ.png)

所以最后还是换回 Wayland 了QAQ 暂时的应对方案就是直接禁用掉自动锁屏（反正我也没什么锁屏的需求）

### Minecraft启动失败

见[/2025/07/25/ArchLinux%E5%90%AF%E5%8A%A8mc%E5%B4%A9%E6%BA%83/](/2025/07/25/ArchLinux%E5%90%AF%E5%8A%A8mc%E5%B4%A9%E6%BA%83/)

## 总结


高考完的暑假买了个联想拯救者 R7000P，作为一个游戏本对我来说性能有些冗余了，因为平时基本不打游戏，而且四五斤的重量和不存在的续航没少折磨我:(。 如果能回到那个暑假，我估计会买一个性能好点的轻薄本和一个thinkpad，一个用来糊弄课内毫无意义的课程，一个装上 Arch 用来折腾，当然最重要的是劝自己报考软件专业，别踏马盯着你那物理了。

刚才看到了[这个视频](https://www.youtube.com/watch?v=m_QAvGlh-Pg)，真正的 CS 大佬只需要花费300$，包括一个装了 Ubuntu 的 ThinkPad，刷了纯净系统的老式索尼收集，和几个电子阅读器(Kindle，NOOK)就足以满足日常学习需求。相比之下那群天天嫌弃自己的设备太垃圾（其实只是游戏打得不够爽罢了）互相攀比的大学生有够可笑的:)



