---
title: 使用Cloudflare for SaaS加速博客国内访问速度
tags:
  - Hexo
  - Fluid
  - Cloudflare
  - 危
  - 折腾博客
date: 2025-06-27 14:05:01
index_img:
categories: Theme
hide: true
---

最近又折腾了一下博客，

<!-- more -->

## 为预加载设定超时时间

老早就想完善这个洗细节了，结果最近才想起来😑

在网络环境比较差，尤其是**不使用代理**的情况下，我这个博客的访问速度是非常慢滴， DOM 结构迟迟加载不完，结果就是用户盯着屏幕上的圈圈了半天也没看见博客，于是愤然退出😡

最根本的解决方案，如果以国内的访问者为优先的话自然是备案，但这是不可能滴，这辈子都不可能备案滴😋我也不打算专门为国内的访问者花费太多精力，所以直接给预加载动画设定一个超时时间算了，照顾那些挂了代理但是网速不好的访问者。

```js
$(document).ready(function() {
    let timeoutId = setTimeout(function() {
        $("#Loadanimation").fadeOut(700);
    }, 5000); // 5秒超时
    
    $(window).on('load', function() {
        clearTimeout(timeoutId); // 清除超时
        $("#Loadanimation").fadeOut(700);
    });
});
```

实现思路：

- 设置一个定时器`timeoutId`，如果 5 秒内没有触发`window.load`，就自动执行`fadeOut(700)`，强制隐藏加载动画。
- 当页面所有资源加载完毕后，出发下面的代码，先取消定时器`clearTimeout`，防止`fadeOut`多次触发，然后正常执行隐藏动画。


## 用Hexo注入器单独修改首页副标题字体

我觉得首页副标题首先要的是**美观**，要契合首页壁纸的风格。我一直想把这里的日语字体修改成游明朝，或者 A1 明朝体之类的有衬线字体，但是遇到了比较尴尬的地方：文章页副标题和首页副标题公用同一个`id`和`class`，像下面这样：

```html
<span id="subtitle" class="visible">副标题</span>
```

直接修改`id`或者`class`的 CSS 样式的话会殃及文章页，这是我不想看到的。

解决方案是使用 Hexo 注入器，实现无侵入地注入 HTML 片段。具体用法参见[Hexo 注入代码](https://hexo.fluid-dev.com/docs/advance/#hexo-%E6%B3%A8%E5%85%A5%E4%BB%A3%E7%A0%81)，我采用的注入方式如下：

```js
/* 为首页的副标题插入class */
hexo.extend.injector.register('body_begin', 
     `
      <style>
        .banner-text .h2 > #subtitle.visible {
          font-family: "Yu Mincho", "游明朝", serif !important;
        }
      </style>
    `,
     'home');
```

在`home`（首页）的`<head>`标签之后，注入内部 CSS 用于修改字体，非常简单。

## 借助 Inkscape 完善艺术字签名

看了一些大网站的页面设计，每一个页面的左上角往往都是网站的图标，比如：

![Youtube](https://s21.ax1x.com/2025/06/27/pVmLdij.png)

![Github](https://s21.ax1x.com/2025/06/27/pVmLwJs.png)

1. 都是**图标+文字**的形式，
2. 点击图标就会**跳转到首页**。

下面解释一下第一项：*把图标添加到页面左上角* 是怎么实现的。

原来采用的方案是直接在 [Google Font to Svg Path](https://danmarshall.github.io/google-font-to-svg-path/) 生成需要的字体 svg 文件，所以下一步只需要把图标的图像文件跟这个 svg 合并在一起，生成一个大小合适的新的 svg 文件即可。

嘛，目标很明确，但是关键是选择合适的**用于编辑 svg 图像的工具**。我最开始是尝试了好几个在线编辑 svg 的网站，要么是乱收费，要么是功能欠佳。花了不少时间，最后终于让我找到了 **Inkscape**，一个**免费开源**的矢量图形编辑软件，功能相当强大，只需要把已有的图标`img2`和艺术字`path2`导入即可开始编辑：

![编辑页面](https://s21.ax1x.com/2025/06/27/pVmqvrT.png)

把图标和文字放到合适的位置，调整一下大小，最后使用界面右下角的`文档属性`修改图形大小就可以裁剪掉多余的部分了，非常的傻瓜😂当然这只是最基础的操作，这个软件的功能远比它多得多，留到以后俺再慢慢研究。

最终效果如下（左上角）：

![满昏](https://s21.ax1x.com/2025/06/27/pVmOnXV.jpg)

## 点击图标跳转到首页

下面解释第二个功能。

这里的图标和艺术字是由一个 svg 文件呈现的，只要点击这一块就会跳转。

其实 Hexo Fluid 主题默认配置下，点击左上角的文字是可以跳转首页的，但是替换成艺术字就不奏效了，为什么？不妨看看以前是怎么把文字替换成 svg 艺术字的：

```js
const  navbarBrand  =  document.querySelector('.container a');

navbarBrand.innerHTML = `
  <object type="image/svg+xml" data="/img/banyee's Blog.svg"></object>
`;
```

注意：`<object>`标签会阻止点击事件传递到父元素。这是因为`<object>`内部的内容会被当成一个**独立的文档**加载进来，它和父页面是**隔离**的，自然不会继承点击跳转的功能。

**解决方案**：

```js
const  navbarBrand  =  document.querySelector('.container a');

/* <object> 标签会阻止点击事件传递到父元素。这是因为 <object> 内部的内容（SVG）会"吸收"点击事件。
使用 pointer-events: none 可以解决这个问题 */

navbarBrand.innerHTML = `
  <object type="image/svg+xml" data="/img/banyee's Blog.svg" style="pointer-events: none;"></object>
`;

navbarBrand.addEventListener('click', function() {
  window.location.href = 'https://kznleaf.top';
});
```

只添加了一点点代码：`style="pointer-events: none`，原理是规定我们插入的元素不会响应任何鼠标交互事件，也就是说插入的 svg 对于鼠标来说是**透明**的，你对它的点击都会穿透到下面去，这样一来就能正常跳转了。


## 加快国内访问速度

Cloudflare 被称为赛博活佛，向用户提供**不需要实名认证的、免费的** CDN 加速服务。但是呢，由于天朝奇葩的网络环境，使用 Cloudflare 提供的服务反而会**拖慢**国内的加载速度，近年来不少 Cloudflare 为用户分配的节点都已经被 GFW 屏蔽（包括俺使用的节点）。为了规避 GFW，有人想出了使用优选域名/ IP 的解决方案，但是现在很多优选域名也被 GFW 屏蔽了😂这也符合 GFW 的一贯原则：宁可滥杀错杀，也绝不漏掉任何一个【**可能**】包含政治敏感信息的网站。

嘛，要想享受国内的加速服务，最符合【国家意志】的做法就是域名备案:

> 根据国务院令第292号《互联网信息服务管理办法》和 《非经营性互联网信息服务备案管理办法》规定，国家对经营性互联网信息服务实行许可制度，对非经营性互联网信息服务实行备案制度。未获取许可或者未履行备案手续的，不得从事互联网信息服务，否则属于违法行为。

优点：运营商大发慈悲为你提供大陆加速服务

缺点：

1. 备案流程**又臭又长**，以腾讯云为例：
    - 验证备案类型 
    - 填写主体信息
    - 填写网站/域名或 APP 信息
    - 上传补充材料（比如身份证，连盒武器都不需要了😂）
    - 提交备案
    - 短信核验
    - 管局审核
2. 备案就意味着把网站的所有内容【主动】提交给天朝审查，这俺可没法接受。

---

在不备案的情况下，稍稍提高国内访问速度的一个方法是使用 Cloudflare 的**自定义主机名**服务。

![](https://s21.ax1x.com/2025/06/27/pVmh91g.png)

在源站的 Cloudflare 页面添加自定义主机名，验证通过之后，自定义主机名对应的网站的流量都会被引向源站。

