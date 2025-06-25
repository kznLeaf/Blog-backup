---
title: 安装ArchLinux虚拟机过程记录
date: 2025-06-25 23:13:24
index_img: https://s21.ax1x.com/2025/06/25/pVeqly8.png
categories: Linux
---

![Arch Linux](https://s21.ax1x.com/2025/06/25/pVeqEee.jpg)

## 前言

最近给手上的两个笔记本都装上了 Arch Linux 虚拟机，来来回回重装了大概四五次，这里把比较重要的地方记录一下。主要参考：[archlinux简明指南](https://arch.icekylin.online/guide/)、[Arch Linux 安装使用教程 - ArchTutorial - Arch Linux Studio](https://archlinuxstudio.github.io/ArchLinuxTutorial/#/)

## 屏幕分辨率

第一次我是在外界24寸2k显示屏的游戏本上安装的 Arch Linux，在装好 KDE 桌面环境和虚拟机增强功能之后，虚拟机的界面分辨率跟宿主机差不多，算是清晰。但是在另一个14寸 2880x1880 分辨率的轻薄本上安装之后，界面看起来有点糊，像这样：

![糊](https://s21.ax1x.com/2025/06/25/pVe2GCQ.jpg)

应该属于正常现象，玩虚拟机的话还是推荐用大屏

## 无法连接校园网

桥接方式中虚拟机是一个独立的机器，相当于一个真实机器，而此机器在校园网中并未注册，在校园网中是**需要验证**的，导致无法联网。

使用 NAT 方式可以联网，因为 NAT 模式下虚拟机通过宿主机来联网。

![NAT模式和桥接模式](https://s21.ax1x.com/2025/06/24/pVeecCt.png)

## Linux磁盘分区

前置知识：Linux是通过目录树的方式来管理文件的，形如

```
/
├── bin
├── boot
├── etc
├── home
│   ├── user1
│   └── user2
├── var
└── usr
    └── local
```

对于 Linux 的分区和目录来说，需要理解两个概念：

1. 目录是树状层级结构的。
2. 分区可以通过挂载的方式指定为任何层级下的目录。

举个例子，假如现在我们手上有两块硬盘：

- `/dev/sda1` 主分区，作为根目录
- `/dev/sdb1`第二块磁盘

我们可以把第二块盘挂载到`/home`目录，运行命令：

```bash
mount /dev/sdb1 /home
```

这样`/home`的文件就全部来自`/dev/sdb1`磁盘分区了。理论上来说，安装 Linux 系统，只需要给硬盘分一个区，然后挂载`/`根分区目录即可正常安装和使用。

**fdisk命令**：

作用：格式化磁盘，用于分区操作。纯命令行交互。一般不用它来分区，而是用`fdisk -l`来查看当前分区状态。

**cfdisk命令**

相当于图形化版本的fdisk，用方向键选择分区，Tab键切换操作按钮，然后选`[New]`、`[Delete]`、`[Write]`等进行操作。一般用这个来分区。

## 分区

先设定分区方案，对于虚拟机来说可以设置三个分区：

- **EFI 分区**：512M
- Swap 分区：4G
- 文件系统分区：剩余全部

然后通过`fdisk -l`命令，确定需要分区的磁盘是`/dev/sda`。

在分区之前，**首先将磁盘转换为 gpt 类型**：

```bash
fdisk -l                    #显示分区情况 找到你想安装的磁盘名称
parted /dev/sda             #执行parted，进入交互式命令行，进行磁盘类型变更
(parted)mktable             #输入mktable
New disk label type? gpt    #输入gpt 将磁盘类型转换为gpt 如磁盘有数据会警告，输入yes即可
(parted)quit                        #最后quit退出parted命令行交互
```

然后调用`cfdisk`命令对磁盘分区：

```bash
cfdisk /dev/sda
```

具体的的分区如下：

- `/dev/sda1`：**EFI 分区**，512M
- `/dev/sda2`：Swap 分区，4G
- `/dev/sda3`：文件系统分区。其余全部

`[write]`后，退出，使用`fdisk -l`再次检查分区情况。

![分区](https://s21.ax1x.com/2025/06/24/pVemSa9.png)

**注意**：这一步不要忘记配置 EFI 分区！在简明指南中，直到【安装详解】一文才描述了怎么配置 EFI 分区，实际上 EFI 分区在这里就创建好了，应该放到前边就讲才对。

## 格式化分区

划定分区后就是格式化分区，分三步：

- 将 EFI 分区格式化为`FAT32`格式：`mkfs.vfat /dev/sda1`
- 格式化 Swap 分区：`mkswap /dev/sdxn`
- 将文件系统分区格式化为`Btrfs`文件系统：`mkfs.btrfs -L myArch /dev/sda3`，其中`-L`后的标签名可以随意起。



### 关于挂载

挂载可分为**永久性挂载**和**临时性挂载**两种方式。`mount`命令为临时性挂载，在操作系统重启时就会失效。而永久性挂载则需要修改配置文件`/etc/fstab`，将需要挂载的文件系统写入这个配置文件中，再使用命令`mount -a`让配置信息生效，挂载的文件即可使用，重启后挂载仍然有效。


在 Btrfs 文件系统上为 Linux 安装准备分区，并使用子卷（subvolume）来组织根目录（/）和用户目录（/home）。这是 Arch Linux 和其他一些 Linux 发行版中常用的分区方式，特别需要 Btrfs 的高级功能（如快照、压缩、复制）时。本次分区就采用了子卷的方式。

### 引导程序的位置

[archlinux简明指南](https://arch.icekylin.online/guide/)将 GRUB 引导程序安装在`/boot`目录下，不过经过查找资料发现并不推荐这样做，应该把 EFI 分区挂载到`/boot/efi`分区下，然后把 GRUB 引导程序安装到`/boot/efi`。

实际执行的指令：

```bash
# 挂载根目录子卷（@）
mount -t btrfs -o compress=zstd,subvol=/@ /dev/sda3 /mnt

# 创建 home 和 boot 目录
mkdir /mnt/home
mkdir -p /mnt/boot/efi

# 挂载 home 子卷
mount -t btrfs -o compress=zstd,subvol=/@home /dev/sda3 /mnt/home

# 挂载 EFI 分区
mount /dev/sda1 /mnt/boot/efi

# 启用 swap 分区
swapon /dev/sda2
```

挂载后的结构如下：

```
/mnt
├── home/        ← 挂载了 @home 子卷
├── boot/
│   └── efi/     ← 挂载了 /dev/sda1（EFI System Partition）
```

传统的 BIOS 启动方式是习惯将引导程序放到`/boot`，但是 UEFI 启动方式一般放到`/boot/efi`（也有直接放到`/efi`的）。关于 BIOS 和 UEFI 这两种启动方式的区别，参见：[https://www.partitionwizard.com/partitionmagic/uefi-vs-bios.html](https://www.partitionwizard.com/partitionmagic/uefi-vs-bios.html)

## 安装引导程序

### 安装grub软件包

```bash
pacman -S grub efibootmgr os-prober
```

`os-prober`主要是为引导双系统中的 windows 系统使用的，如果只安装一个Linux虚拟机系统，那就可以省略，直接写成：

```bash
pacman -S grub efibootmgr
```

同样，后面编辑`/etc/default/grub`文件的时候也不用添加新的一行`GRUB_DISABLE_OS_PROBER=false`了。

### 将grub安装到EFI分区

之前我已经把RFI分区挂载到了`/boot/efi`目录下，所以这里也把grub安装到这个目录：

```bash
grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=ARCH
```

## 安装完毕

![123](https://s21.ax1x.com/2025/06/24/pVeA3WT.png)

装完桌面环境以后最好先把虚拟机增强功能加上，这样以后可以直接从宿主机复制命令了，省下不少时间。

安装输入法的话先执行以下命令：

```bash
sudo pacman -S fcitx5-im #基础包组
sudo pacman -S fcitx5-chinese-addons #官方中文输入引擎
sudo pacman -S fcitx5-anthy #日文输入引擎
yay -S fcitx5-pinyin-moegirl #萌娘百科词库 由于中国大陆政府对github封锁，你可能在此卡住。如卡住，可根据后文设置好代理后再安装
sudo pacman -S fcitx5-pinyin-zhwiki #中文维基百科词库
sudo pacman -S fcitx5-material-color #主题
```

然后需要配置环境变量。经过我的测试，[archlinux简明指南](https://arch.icekylin.online/guide/)中为输入法配置环境变量的方法已经失效。正确的操作是：

在终端输入命令`EDITOR=vim sudoedit /etc/environment`，加入以下内容：

```bash
GTK_IM_MODULE=fcitx
QT_IM_MODULE=fcitx
XMODIFIERS=@im=fcitx
SDL_IM_MODULE=fcitx
```

目的是为 konsole 以及 dolphin 提供中文输入支持。

然后，打开`系统设置 > 区域设置 > 输入法`，先点击运行`Fcitx`即可，拼音为默认添加项，也可以添加双拼输入法，包含多种可选的双拼方案，比如我用的小鹤。

接下来点击拼音右侧的配置按钮，点选云拼音和在程序中显示预编辑文本，最后应用。

回到输入法设置，点击配置附加组件，找到经典用户界面，在主题里选择一个你喜欢的颜色，最后应用。

最后重启就可以正常使用输入法了。

### 从github下载文件

有时候需要直接从 github 仓库拉取所需的安装脚本，比如`zim`：

```bash
curl -fsSL https://raw.githubusercontent.com/zimfw/install/master/install.zsh | zsh
```

github.io 与 raw.githubusercontent.com 已经被天朝政府盯上了，虽然封锁力度暂时还没有很大，但是运行上述命令的时候多半会连接失败。最根本的方法当然是配置全局代理，不过如果还没配置全局代理的话，可以考虑暂时借助 [Github Proxy](https://ghproxy.link/) 下载。

### 保持系统为最新

Arch Linux 采用滚动式更新，最新版本一经发布马上会推送给用户。应当经常更新系统，防止系统滚挂。

使用`pacman`更新系统，用到的选项：

| 命令    | 含义                              |
| ----- | ------------------------------- |
| `-S`  | 安装软件包（sync）                     |
| `-y`  | **同步软件包数据库**（从服务器更新本地的包列表）      |
| `-yy` | **强制重新下载**软件包数据库（即使系统认为是最新的也强制） |
| `-u`  | 升级所有可升级的软件包（update）             |

- `pacman -Syu`用于正常更新，如果本地的数据库和远程一致的话就不再重复下载数据库。
- `pacman -Syyu`强制更新，当数据库损坏或同步出错、更新镜像源（`/etc/pacman.d/mirrorlist`）之后的第一次强制同步应执行。不要经常用。

