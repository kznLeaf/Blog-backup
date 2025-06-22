---
title: 为Fluid主题首页的副标题添加淡入效果
date: 2024-10-04 21:14:36
index_img:
categories: Theme
---

# 前言

最近又折腾了一下博客的美化。默认Fluid主题的首页副标题用的是打字机特效，不过我不太喜欢，于是琢磨了一下淡入效果。我并没有学过前端，一下代码主要靠chatgpt和其他网友得到。

# 过程
使用F12打开开发者模式，定位副标题：  
![Imgur](https://i.imgur.com/mgjRfJ2.jpg)
目标对应的元素为`.h2 #subtitle`，在外部CSS文件中加入下列代码：

```css
        @font-face {
        font-family: "Si Yuan";
        src: url("../fonts/Si Yuan.otf") format("truetype");
        font-weight: 400;
      }

    .h2 #subtitle {
        font-family: 'Si Yuan', sans-serif; /* 替换为你想要的字体 */
        font-size: 32px; /* 调整字体大小 */
        color: #ffffff; /* 设置字体颜色 */
        opacity: 0; /* 初始透明度为0，隐藏 */
        transition: opacity 1.5s linear; /* 设置过渡效果 */
      }

    .h2 #subtitle.visible {
      opacity: 1; /* 完全可见 */
      }
 ```
由于这里我使用的是思源宋体，并非系统自带的字体，因此额外使用`@font-face`引入外来字体。

另外，注意文章页的标题和首页的标题用的是同一个元素，二者会同时发生变更。

再向外部js文件中加入下列代码：
```js
document.addEventListener('DOMContentLoaded', function() {
    const subtitle = document.getElementById('subtitle');
    subtitle.classList.add('visible'); // 页面加载后添加 visible 类
});
```
完成。