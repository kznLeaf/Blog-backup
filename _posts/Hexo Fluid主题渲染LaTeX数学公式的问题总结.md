---
title: Hexo Fluid主题渲染LaTeX数学公式的问题总结
date: 2024-09-15 14:24:59
index_img:
tags:
  - Hexo
  - Fluid
categories: Hexo
math: true
---

在Fluid的[官方指南文档](https://hexo.fluid-dev.com/docs/guide/#latex-%E6%95%B0%E5%AD%A6%E5%85%AC%E5%BC%8F)中已经做了详尽的说明，一步一步跟着做就没问题。值得注意的是，在主题配置的代码  

```
    post:
    math:
    enable: true
    specific: false
    engine: mathjax
```

中，要想使用数学公式，`enable`一项必须是`true`才行，否则会出现渲染错误.

另外，Hexo中无法使用换行符`\\`，原因是`\`在 Markdown属于特殊字符，用于字符转义，所以两个`\`经过 Markdown引擎处理为html后，只剩下一个，等到LaTex渲染引擎处理时，实际上只看到一个`\`，渲染引擎把它当作 LaTeX 中的空格。

在不改动现有代码的情况下，我的解决方法是直接改变公式的写法。比如下边这个公式

    $$
    a_11=b_11 \\
    a_22=b_22+c_22
    $$

改为

    $$
    \begin{aligned}
    a_{11}& =b_{11}\\
    a_{22}& =b_{22}+c_{22}
    \end{aligned}
    $$

渲染效果如下：
$$
\begin{aligned}
a_{11}& =b_{11}\\
a_{22}& =b_{22}+c_{22}
\end{aligned}
$$
更复杂的公式同理：
$$
\begin{aligned}
    F_x'&=\gamma\{q[\frac{-i\gamma}{c}(u_t'+i\beta u_x')E_x+u_y'B_z-u_z'B_y]
    +i\beta\frac{iq}{c}[\gamma(u_x'-i\beta u_t')E_x+u_y'E_y+u_z'E_z] \}\\
    &=\frac{-iq\gamma^2}{c}(1-\beta^2)E_xu_t'-q\gamma(B_y+\frac{\beta}{c}E_z)u_z'+q\gamma(B_z-\frac{\beta}{c}E_y)u_y'
\end{aligned}
$$

