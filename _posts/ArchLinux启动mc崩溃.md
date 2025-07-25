---
title: ArchLinux运行 1.8.9 Minecraft失败解决方法
tags:
  - Linux
  - 折腾记录
date: 2025-07-25 20:25:10
index_img:
categories: Linux
---


## 问题描述

用 HTML 启动1.8.9版本，需要下载Java 8，使用命令`sudo pacman -S jdk8-openjdk`成功安装，然后用 java8 运行游戏，启动失败，`./minecraft/crash-resources`目录下的崩溃日志完整内容如下：

```
---- Minecraft Crash Report ----
// Don't be sad, have a hug! <3

Time: 25-7-25 下午6:03
Description: Initializing game

java.lang.ExceptionInInitializerError
	at Config.getDisplayModes(Config.java:1862)
	at net.minecraft.client.settings.GameSettings$Options.<clinit>(GameSettings.java:3384)
	at net.minecraft.client.settings.GameSettings.<init>(GameSettings.java:313)
	at net.minecraft.client.Minecraft.func_71384_a(Minecraft.java:395)
	at net.minecraft.client.Minecraft.func_99999_d(Minecraft.java:329)
	at net.minecraft.client.main.Main.main(SourceFile:124)
	at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
	at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
	at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.lang.reflect.Method.invoke(Method.java:498)
	at net.minecraft.launchwrapper.Launch.launch(Launch.java:135)
	at net.minecraft.launchwrapper.Launch.main(Launch.java:28)
Caused by: java.lang.ArrayIndexOutOfBoundsException: 0
	at org.lwjgl.opengl.LinuxDisplay.getAvailableDisplayModes(LinuxDisplay.java:951)
	at org.lwjgl.opengl.LinuxDisplay.init(LinuxDisplay.java:738)
	at org.lwjgl.opengl.Display.<clinit>(Display.java:138)
	... 12 more


A detailed walkthrough of the error, its code path and all known details is as follows:
---------------------------------------------------------------------------------------

-- Head --
Stacktrace:
	at Config.getDisplayModes(Config.java:1862)
	at net.minecraft.client.settings.GameSettings$Options.<clinit>(GameSettings.java:3384)
	at net.minecraft.client.settings.GameSettings.<init>(GameSettings.java:313)
	at net.minecraft.client.Minecraft.func_71384_a(Minecraft.java:395)

-- Initialization --
Details:
Stacktrace:
	at net.minecraft.client.Minecraft.func_99999_d(Minecraft.java:329)
	at net.minecraft.client.main.Main.main(SourceFile:124)
	at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
	at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
	at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.lang.reflect.Method.invoke(Method.java:498)
	at net.minecraft.launchwrapper.Launch.launch(Launch.java:135)
	at net.minecraft.launchwrapper.Launch.main(Launch.java:28)

-- System Details --
Details:
	Minecraft Version: 1.8.9
	Operating System: Linux (amd64) version 6.15.7-arch1-1
	Java Version: 1.8.0_462, Arch Linux
	Java VM Version: OpenJDK 64-Bit Server VM (mixed mode), Arch Linux
	Memory: 130908928 bytes (124 MB) / 301989888 bytes (288 MB) up to 7952400384 bytes (7584 MB)
	JVM Flags: 17 total; -Xmx7559m -XX:+UnlockExperimentalVMOptions -XX:+UnlockDiagnosticVMOptions -XX:+UseG1GC -XX:G1MixedGCCountTarget=5 -XX:G1NewSizePercent=20 -XX:G1ReservePercent=20 -XX:MaxGCPauseMillis=50 -XX:G1HeapRegionSize=32m -XX:-OmitStackTraceInFastThrow -XX:MaxInlineLevel=15 -XX:-DontCompileHugeMethods -XX:MaxNodeLimit=240000 -XX:NodeLimitFudgeFactor=8000 -XX:TieredCompileTaskTimeout=10000 -XX:ReservedCodeCacheSize=400M -XX:NmethodSweepActivity=1
	IntCache: cache: 0, tcache: 0, allocated: 0, tallocated: 0
	FML: 
	Loaded coremods (and transformers): 
	Launched Version: 1.8.9-Forge-OptiFine
	LWJGL: 2.9.4
	OpenGL: ~~ERROR~~ RuntimeException: No OpenGL context found in the current thread.
	GL Caps: 
	Using VBOs: ~~ERROR~~ NullPointerException: null
	Is Modded: Definitely; Client brand changed to 'fml,forge'
	Type: Client (map_client.txt)
	Resource Packs: ~~ERROR~~ NullPointerException: null
	Current Language: ~~ERROR~~ NullPointerException: null
	Profiler Position: N/A (disabled)
	CPU: <unknown>
	OptiFine Version: OptiFine_1.8.9_HD_U_M5
	OptiFine Build: 20210124-163719
	Shaders: null
	OpenGlVersion: null
	OpenGlRenderer: null
	OpenGlVendor: null
	CpuCount: 0
```

关键在这两行：

```
Caused by: java.lang.ArrayIndexOutOfBoundsException: 0
	at org.lwjgl.opengl.LinuxDisplay.getAvailableDisplayModes(LinuxDisplay.java:951)

OpenGL: ~~ERROR~~ RuntimeException: No OpenGL context found in the current thread.
```

对应两个问题：

1. **lwjgl 获取不到任何显示模式**
2. **找不到 OpenGL**

硬件信息：

![硬件信息](https://s21.ax1x.com/2025/07/25/pVJ0yPx.png)

## 问题排查

先排查openGL相关的问题：

1. 查看显卡信息、加载的内核模块

```bash
lspci -k | grep -A 3 -E "(VGA|3D)"
lsmod | grep amdgpu
```

2. 检查openGL是否工作正常

```bash
glxgears
```
出现一个转动的齿轮窗口，说明 OpenGL 渲染正常。前两步的运行结果如下：

![](https://s21.ax1x.com/2025/07/25/pVJwZX4.png)

都没有问题。

下面排查LWJGL。在一番查找后我找到了[这个issue](https://github.com/PolyMC/PolyMC/issues/1533)，里面提到：

> LWJGL 在底层使用 xrandr，通过解析 xrandr -q 命令的输出来获取屏幕分辨率。
>
> 我安装了 xrandr，各个版本加载都没有问题。

Arch Linux安装xrandr的指令：

```bash
sudo pacman -S xorg-xrandr
```

安装后成功启动游戏。游戏截图：

![截图](https://s21.ax1x.com/2025/07/25/pVJ03an.png)

（六年前的牢核显低端笔记本还能稳定在60Hz，满足了）


