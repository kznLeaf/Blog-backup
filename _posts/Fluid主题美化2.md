---
title: Hexo + Fluid博客美化记录
date: 2025-04-20 13:04:51
index_img:
tags:
  - Hexo
  - Fluid
  - 折腾记录
categories: Theme
---
简单的博客美化记录
<!-- more -->

# 美化清单

1. [添加博客加载页面](#添加博客加载页面)
2. [Github状态和活跃曲线](#github状态和活跃曲线)
3. [mac风格代码块](#mac风格代码块)
4. [艺术字签名](#艺术字签名)
5. [更换图床](#更换图床)
6. [遗留问题](#遗留问题)


# 添加博客加载页面

Fluid主题本身是不支持固定背景图的，强行固定会导致加载页面时明显观察到背景图“瞬移”，而且不适配移动端。

现在移动端我先不管了，这里通过添加加载页面的方式规避背景图瞬移的问题。

代码源自该[实例](https://www.zywvvd.com/notes/hexo/theme/fluid/fluid-loading/fluid-loading/)

关于第一步，“在bodyBegin注入元素代码”，即把下面这段代码加到博客目录下的`\Blogs\node_modules\hexo-theme-fluid\layout\layout.ejs`的`<body>`开头的部分：

![](https://i.imgur.com/SGhKbvj.png)

剩下的CSS和js代码分别添加到自定义CSS和js文件中即可。

# Github状态和活跃曲线

项目地址：

- [github-readme-stats](https://github.com/anuraghazra/github-readme-stats?tab=readme-ov-file)
- [github-readme-activity-graph](https://github.com/Ashutosh00710/github-readme-activity-graph)

复制粘贴到关于页即可。

# mac风格代码块

参考：[HexoFluid主题代码块样式修改](https://qingshaner.com/HexoFluid%E4%B8%BB%E9%A2%98%E4%BB%A3%E7%A0%81%E5%9D%97%E6%A0%B7%E5%BC%8F%E4%BF%AE%E6%94%B9/)

# 艺术字签名

参考链接

- [【Hexo】Fluid主题美化](https://mrna16.github.io/2024/11/14/%E3%80%90Hexo%E3%80%91Fluid%E4%B8%BB%E9%A2%98%E7%BE%8E%E5%8C%96/#%E6%A0%87%E7%AD%BE%E5%8F%98%E5%8C%96)
- [使用 CSS 和 JS 实现博客导航栏线条动画效果](https://4rozen.github.io/archives/Hexo/38001.html)（这个的讲解更详细）

签名动画似乎与加载页面不兼容，我没有看到动画效果，所以把动画部分的代码去掉了。

对`sign.css`部分:

```css
.svg {
    width: 100%;
    height: auto;
  }
  
  .svg path {
    stroke: white;
    stroke-width: 3pt;
    stroke-linecap: round;
    stroke-dasharray: var(--l);
    stroke-dashoffset: var(--l);
    fill: none;
    fill-rule: nonzero;
    animation: stroke 25s forwards;
    -webkit-animation: stroke 25s forwards;
  }
  
  @keyframes stroke {
    to {
      stroke-dashoffset: 0;
    }
  }
```

`width`和`height`两个属性可以改为`100%`和`auto`，我经过尝试发现影响签名大小的主要还是[Google Font to Svg Path](https://danmarshall.github.io/google-font-to-svg-path/)的Size数值，所以不用纠结宽和高到底应该填多少了，直接自适应。这里Size取的是35。

`sign.js`:

```js
const  navbarBrand  =  document.querySelector('.container a');

navbarBrand.innerHTML = `
  <object type="image/svg+xml" data="/img/banyee's Blog.svg"></object>
`;

// const  paths  =  document.querySelector('.container .navbar-brand .svg .g path')

// const  len  =  paths.getTotalLength()

// paths.style.setProperty('--l', len)
```

动画部分的代码已经被注释。另外，引入`.svg`文件时可以用上面的这种方法，先把svg文件下载到source目录下的一个img文件夹中，再引用，这样可以让代码看起来简洁一些。

# 更换图床

之前用的一直是imgur，国外的老牌免费图床网站，稳定安全可靠。但是被墙了，至于为什么被墙啊俺也不知道

鉴于国内用户无法访问托管在imgur上的图片，所以我打算换个图床

一开始打算打算使用腾讯COS存储，主要是冲着访问速度快+长期稳定去的，跟着[教程](https://cloud.tencent.com/developer/article/1834573)走了几步，到了要绑定域名的时候

![](https://i.imgur.com/5nHrB3T.png)

本来想着来都来了，那就备案啊，然后备案需要实名认证。。。

这时候我才意识到貌似国内的域名都要备案之后才能使用。

然后我又尝试了SM.MS图床，这个图床的来历：

![SM.MS诞生于互联网精神](https://i.imgur.com/4RJjAug.png)

然后我试着访问了主站

![](https://i.imgur.com/BOutTZH.png)

>"Due to network issues, users from China Mainland are unable to access SM.MS, we have added an alternate domain name smms.app"

又被大陆墙了，而且这个图床已经关闭了注册功能

最后我转向了[路过图床](https://imgse.com/page/about)。这个图床也是蛮幽默的，注册时如果挂着VPN，会马上触发安全机制：

![](https://i.imgur.com/bfFspUp.png)

不过这个图床已经稳定运行了14年，最大支持10M的图片，同时具有全球 CDN 加速以确保高速、稳定。暂时就先用着这个好了。

向路过图床上传图片的时候也要求关闭VPN代理，所以最好的办法就是直接在clash新建规则，检测到imgse关键词就走直连

![](https://s21.ax1x.com/2025/04/21/pE5lxs0.png)







