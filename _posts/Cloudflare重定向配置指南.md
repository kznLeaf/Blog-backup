---
title: Cloudflare配置将博客旧域名的请求重定向到新域名
date: 2025-05-30 23:07:40
index_img: https://s21.ax1x.com/2025/05/30/pV9ZSaQ.jpg
tags:
  - Cloudflare
  - 折腾记录
categories: Cloudflare
---

在博客更换域名之后利用Cloudflare将向旧域名的请求重定向到新域名，并且保留请求的资源路径和查询字符串

<!-- more -->

## 前言

最近为博客更换了域名，原域名为`kznep19.blog`，因为续费费用过高而更换为现在的`kznleaf.top`。现在遇到了几个问题：

1. 原域名虽然不再使用了，但是一直到2026年1月才过期；
2. Google 和必应搜索引擎仍在收录原域名下的文章页，如果马上废弃原域名，又要重新抓取一遍文章；
3. 有几篇博客在别的地方被引用了，我希望这些外链仍然能够生效

综上考虑，我希望获得的效果是：将博客切换为新域名，同时为旧域名配置重定向，使得对旧域名下的资源的请求会被自动重定向到新域名下对于的资源路径。

花了不少时间查资料，大部分的解决方案都是通过配置页面规则(Page Rules)配置的方式实现重定向，我经过尝试之后发现并没有效果。最后找到了这篇博客：

[Cloudflare配置站点重定向](https://appscross.com/blog/issues-resolved-during-cloudflares-configuration-site-redirection-process.html)

这个博客是把对旧域名下的任何资源的请求都重定向到一个固定的URL下，我在该博客的基础上做了一些补充，最后达到了理想的效果。

## 配置要点

### 配置重定向规则

先打开主页左侧的“规则”，然后点击右侧的创建规则——**重定向规则**。（注意不是最左边的页面规则，这两个不是一个东西，后面会说）

![重定向规则](https://s21.ax1x.com/2025/05/30/pV9F3fP.png)

这里为我们提供了三个选项：

![](https://s21.ax1x.com/2025/05/30/pV9FGSf.png)

应当选择**重定向到其他域**。[官方文档](https://developers.cloudflare.com/rules/url-forwarding/examples/redirect-all-different-hostname/)对它的描述为：

{% note secondary %}
创建重定向规则，将对`smallshop.example.com`的所有请求重定向到使用 HTTPS 的其他主机名，同时保留原始路径和查询字符串。
{% endnote %}

使用通配符匹配模式，如果请求的URL为`http*://smallshop.example.com/*`，那么：

- 目标URL：`https://globalstore.example.net/${2}`
- 状态码：301
- 保留查询字符串：启用

请求URL中的`*`是对零个或者多个字符进行匹配，这里表示使用 HTTP 或 HTTPS 协议对`smallshop.example.com`下的任意资源的请求都将被匹配。

目标URL即该请求将会被重定向到的URL，其中的`${2}`是对通配符捕获的内容的引用，这里代表的是请求URL中的第二个`*`，所以用户最终访问的是新域名`globalstore.example.net`下的对应资源。

从上面的描述可以看出这就是我们想要的东西。那接下来的配置就很简单了，按照刚才提到的三点：目标URL、状态码、启用保留查询字符串 配置即可。

![](https://s21.ax1x.com/2025/05/30/pV9FO7d.png)

### 使规则生效

光是配置规则是不够的，还要给这个域名添加DNS记录以使规则生效。创建一条A记录即可，IP地址可以随便写，我这里用的是保留IP地址`192.0.2.1`，写了两条

![](https://s21.ax1x.com/2025/05/30/pV9kn3V.png)

关于这一部分，Cloudflare文档在Page Rules一节中是这样说的：

![](https://s21.ax1x.com/2025/05/30/pV9kajO.png)

[原文链接](https://developers.cloudflare.com/rules/page-rules/)

也就是说如果IP地址作为占位符的话，最好使用保留IP地址`192.0.2.*`，避免把流量发到什么奇怪的地方。

## Page Rules和Redirects的区别

前面提到了，在搜索引擎中搜索“使用Cloudflare把旧域名重定向到新域名”，弹出来的结果大部分都是使用Page Rules的，但这其实不太合适。其实关键就是**转发**和**重定向**的区别。Page Rules中可以配置一个叫做`URL Forwarding(转发URL)`的东西：

![页面规则中的转发URL](https://s21.ax1x.com/2025/05/30/pV9Alxf.png)

如果你配置了目标地址，那么：

{% note secondary %}
If you enter the address above in the forwarding box and select Add Rule, within a few seconds any requests that match the pattern you entered will automatically be forwarded with an HTTP 302 redirect status code to the new URL.
{% endnote %}

即这样配置返回的状态码是`302`，而刚才的重定向状态码是301，至此熟悉计网的人应该清楚是怎么一回事了。不过还是再看看 [wiki](https://zh.wikipedia.org/wiki/HTTP%E7%8A%B6%E6%80%81%E7%A0%81) 对这两种状态码的表述：

![状态码301和302的区别](https://s21.ax1x.com/2025/05/30/pV9Amad.png)

- 301用于永久重定向的情况，发起请求的客户端收到这个状态码之后，除了收到一个用于重定向的地址以外，还会被告知把以后的请求目标地址也改成这个地址，而且这个地址默认是会被缓存的。
- 302用于临时重定向，而且这个响应不会被缓存，客户端以后继续向旧域名发送请求。

所以在考虑是选择页面规则中的转发URL还是创建重定向规则的时候，应当根据以上内容进行考虑。像我这种为网站更换域名的情况当然是选择重定向了。


