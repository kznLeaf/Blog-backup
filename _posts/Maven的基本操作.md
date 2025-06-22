---
title: Maven的基本操作
date: 2025-04-27 18:45:37
index_img: https://s21.ax1x.com/2025/04/29/pE7s3Pe.jpg
categories: Web Development
---

# 概述

Maven解决了软件构建的两方面问题：一是软件是如何构建的，二是软件的依赖关系。

不同于Apache Ant等早期工具，Maven设定了构建流程的标准，在此之外只需要指定例外情况。XML文件描述了正在构建的软件项目、它对其他外部模块和组件的依赖关系、构建顺序、目录和所需的插件。该文件通常有预设的目标任务，例如代码编译和打包。Maven从一个或多个代码仓库（例如Maven 2 Central Repository）动态地下载Java库与Maven插件，并将其存储在本地缓存区中。[^1]

GAVP：为每个项目在maven仓库中做一个标识，类似于人的名字。

- Groupid是公司项目:公司项目-业务线
- ArtifactID:产品线名-模块名
- Version:主版本号.次版本号.修订号
- Packaging:打包方式，Java工程打jar包，Web工程打war包，pom代表不会打包，用来做继承的父工程

创建 Maven 项目时，jdk版本最好选择jdk17、jdk21这些长期稳定版本，不要使用最新版，因为很多插件都不支持。

Maven中的测试类，类名必须以test结尾，测试方法以test开头，否则无法被识别。

# 不同阶段

| 阶段（Lifecycle） | 作用                                      | 常用命令           |
|-------------------|-----------------------------------------|--------------------|
| clean             | 清理之前的构建产物，比如 `target/` 目录      | mvn clean          |
| validate          | 验证项目是否正确，准备编译                  | mvn validate       |
| compile           | 编译主代码（src/main/java）                | mvn compile        |
| test              | 编译并运行单元测试（src/test/java）          | mvn test           |
| package           | 打包成 jar/war 文件，输出到 target/          | mvn package        |
| verify            | 验证打包结果，比如执行集成测试               | mvn verify         |
| install           | 安装到本地仓库                              | mvn install        |
| site              | 生成项目文档网站（项目依赖、测试报告等）     | mvn site           |
| deploy            | 部署到远程仓库供别人使用                    | mvn deploy         |

手动引入依赖的格式：

```xml
    <dependency>
      <groupId>org.projectlombok</groupId>
      <artifactId>lombok</artifactId>
      <version>1.18.30</version>
      <scope>provided</scope>
    </dependency>
```
# 依赖范围

在pom文件中使用`<scope>`标签，英语控制该依赖起作用的阶段。一共有三个阶段：编译、测试、运行。

- compile
  - 编译、测试、运行阶段都可用
  - 适用于项目本身需要直接使用的库，比如`Spring Boot`、`Lombok`
- provided
  - 编译、测试可用，但是运行不可用，也就是不会被打包
  - 运行时由服务器等外部环境提供，如`Servlet API`可以由`Tomcat`提供，因此属于 provided 范围
- runtime
  - 仅在运行和测试可用，编译不可用
  - 适用于运行时所需要的库，比如数据库驱动、JDBC 适配器等。
  - 代码中通常只使用接口（如`java.sql.Connection`），编译时无需具体的 JDBC 实现。
- test
  - 仅在测试可用，例如 JUnit 等测试框架
- system
  - 类似`provided`，但是需要本地手动提供jar包，不会从Maven仓库下载，相比之下不如使用私有 Maven 仓库进行管理。不推荐使用
- import
  - 仅用于`dependencyManagement`依赖管理，引入一个具体的POM作为依赖版本管理。例如：引入 Spring Boot BOM

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-dependencies</artifactId>
            <version>3.0.0</version>
            <scope>import</scope>
            <type>pom</type>
        </dependency>
    </dependencies>
</dependencyManagement>
```

# 依赖下载失败

如果引入依赖后没有联网，依赖将下载失败，即使再次联网也不会开始下载，因为本地仓库中已经存在了`.lastUpdated`后缀的文件。Maven 只要检测到这个文件就不会开始下载，需要手动删除。

# build标签

## 指定打包文件

`pom.xml`文件中的`<build>`主要用于对构建相关的信息进行配置。

{% note primary %}
项目构建是指将源代码、依赖库和资源文件等转换成可执行或可部署的应用程序的过程，在这个过程中包括编译源代码、链接依赖库、打包和部署等多个步骤
{% endnote %}

如果需要在src/main/java中放入非java文件，并且要求能够被打包：

```xml
  <build>
    <resources>
      <resource>
        <!--设置资源所在目录-->
        <directory>src/main/java</directory>
        <includes>
          <!--设置包含的资源类型-->
          <include>**/*.xml</include>
        </includes>
      </resource>
    </resources>
  </build>
```
可以将java目录下的任意`.xml`文件打包。

## 引入插件

使用标签`<plugin>`

# 依赖传递和依赖冲突

## 传递

如果A依赖B，B又依赖C，那么A也间接依赖C，那么在执行项目A时，会自动把其他两个项目下载导入到jar包文件夹中。这就是**依赖的传递性**。

另一方面，依赖能否成功传递还取决于依赖范围：

- `<optional>true</optional>`手动终止依赖传递
- 非compile范围无法进行依赖传递
- 依赖冲突（传递的依赖已经存在）

## 冲突

```text
项目A -> 依赖B（B依赖X:1.0）
    └──> 依赖C（D依赖X:2.0）
```

这里B和C都依赖了X的不同的版本，出现依赖冲突。Maven 的自动选择原则如下：

- 短路优先（路径最短优先）哪个近用哪个
- 路径长度相同的情况下，声明优先，在`<dependencies>`中先声明的被使用

```
A
├── B
│    └── C:1.0
└── D
     └── C:2.0
```

如果B在D声明之前，则使用C1.0。

也可以手动排除依赖冲突：`<exclusions>`

# 工程继承

Maven 工程继承指的是在 Maven 项目中让一个项目从另一个项目继承配置信息的机制。继承可以让我们在多个项目中共享同一配置信息，简化项目的管理和维护工作。

- 对一个大型的项目进行了模块的拆分
- 每个项目下面又很多个模块，每一个模块都需要配置自己的依赖信息。

父工程主要用来做依赖的管理或配置信息的管理，不需要写源代码，编译时父工程中的类不会被打包。对父工程进行的清理、编译等操作也会同步进行到子工程中，可以一键管理。

子工程应当在父工程目录下被创建，子工程的配置文件中会出现

```xml
    <parent>
        <groupId>com.atguigu.maven</groupId>
        <artifactId>maven_java</artifactId>
        <version>1.0-SNAPSHOT</version>
    </parent>
```

表明了父工程的坐标。子工程的GroupId和父工程自动保持一致。

父工程的`<dependencies>`会**无条件**地被子工程继承，所以一般在`<properties>`的下面加上`<dependencyManagement>`，然后在这个标签内部声明依赖，这样子工程不会默认继承它。如果需要继承，在子工程的配置文件中只需要复制groupId和artifactId就可以使用了，不用写版本号。

# 工程聚合

聚合是指**将多个项目组织到一个父级项目中**，以便一起构建和管理的机制。聚合可以帮助我们更好地管理一组相关的子项目，同时简化它们的构建和部署的过程。

目标：**一键操作、一键构建**。

语法：在GAVP之后加入

```xml
  <modules>
    <module>子工程的相对路径</module>
  </modules>
```

例如，如果子工程就在父工程的目录下，可以直接写`maven_son`

# Maven 私服

## 简介

Maven私服是一种特殊的Maven远程仓库，它是架设在**局域网**内的仓库服务，用来代理位于外部的远程仓库。

> 当然并不是说私服只能建立在局域网，很多公司会把私服直接部署到公网，方便员工居家办公。

建立了Maven私服后，当局域网内的用户需要某个构建时，会按照如下的顺序进行请求和下载：

1. 请求本地仓库，若不存在则下一步
2. 请求Maven私服，将所需构件下载到本地仓库，若不存在则下一步
3. 请求外部的远程仓库，将所需构件下载并缓存到私服，若不存在则报错

Maven用户既可以从私服下载构件，也可以上传构件。

**私服的优势**：降低外网带宽压力；下载速度更快；便于部署第三方构件（有些构件无法从第三方仓库获得）；提高项目的稳定性，增强对项目的控制。

## Sonatype Nexus

使用最广泛的 Maven 私服产品是**Nexus**。Nexus Repository Manager（通常简称 Nexus）是由一家叫 Sonatype 的公司开发的，它本质上是一个 Maven 仓库管理器。

> Sonatype Nexus Repository 是一款软件仓库管理器，既有开源许可版本，也有商业许可版本。它能够将多种编程语言的仓库整合在一起，使得可以通过一个服务器作为构建软件时的统一来源。开源版使用的是 H2 数据库。  
> Tamás Cservenák 最初在 2005年 开发了 Proximity，原因是他当时使用的是较慢的 ADSL互联网连接。
后来，他被 Sonatype 公司聘请，开发了一个类似的产品，即 Nexus。[^2]

安装过程比较烦人，先进入 https://www.sonatype.com/nexus-repository-oss 填写信息下载，下载好之后解压。

按照网上的方法进入bin目录输入`nexus.exe /run`，报错：

```
E:\nexus-3.79.1-04-win-x86_64\nexus-3.79.1-04\bin>nexus.exe /run
[2025-04-28 15:40:49] [error] [ 1048] Unrecognized cmd option /run
[2025-04-28 15:40:49] [error] [ 1048] Invalid command line arguments.
[2025-04-28 15:40:49] [error] [ 1048] Apache Commons Daemon procrun failed with exit value: 1 (failed to parse command line arguments).
```

说明网上的方法失效了。再看一眼解压后的目录

![](https://s21.ax1x.com/2025/04/28/pE7iUJ0.png)

看看第一个文件。

嗯？有点怪，这不是安装脚本嘛。再翻翻官方文档[^3]

![](https://s21.ax1x.com/2025/04/28/pE7AuJ1.png)

{% note primary %}
Nexus Repository 在 3.78.0 版本进行了大量构建方式的更改。
3.78.0 及以后版本使用了上面列出的 //ES//、//SS//、//DS// 这种新格式。
{% endnote %}

总之很折腾，不建议使用最新版本，最好使用3.78.0之前的。

从这个链接下载历史版本：https://help.sonatype.com/en/download-archives---repository-manager-3.html

下载之前记得看一下自己的电脑上有没有对应的jdk版本。

成功启动之后通过localhost:8081访问。

后续利用Nexus搭建私服和Maven联动的内容到了后期才会用到，这里先歇一歇。

放几个参考链接。以后再来看：

https://www.easyblog.vip/detail/58

https://www.bilibili.com/video/BV1854y1F7Lt/?spm_id_from=333.337.search-card.all.click&vd_source=918a6909c997fbaf818d1fbc55d65ca9

https://wiki.eryajf.net/pages/1815.html#_1-%E5%88%9B%E5%BB%BA-blob-%E5%AD%98%E5%82%A8%E3%80%82

https://www.hangge.com/blog/cache/detail_2844.html

# 参考链接

[^1]: https://zh.wikipedia.org/wiki/Apache_Maven
[^2]: https://en.wikipedia.org/wiki/Sonatype_Nexus_Repository
[^3]: https://help.sonatype.com/en/sonatype-nexus-repository.html
