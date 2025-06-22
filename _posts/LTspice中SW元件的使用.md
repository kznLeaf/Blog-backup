---
title: LTspice中SW元件的使用
date: 2024-10-14 21:21:36
index_img:
categories: EE
---

LTspice不像Multisim那样有现成的手动开关。开关功能可以用**S. Voltage Controlled Switch**（压控开关）实现。

![](https://i.imgur.com/1EAGN5i.png)

1. 按P键打开元件库，搜索"SW"，放置在图纸中
2. 插入指令定义SW元件的行为，例如：`.model MYSW SW(Ron=1 Roff=1Meg Vt=.5 Vh=-.4)`，其中`Ron`是导通电阻（**导通电阻不能为0！**），`Roff`为断开电阻，Vt和Vh决定了开关的阈值电压，在本例中为0.9V和0.1V
3. 将开关模型的名称改成MYSW
4. 放置一个电压源用来控制开关，这里用的是Pulse，开关在闭合1s后保持关断状态。

SW相关的所有参数如下表格：

| Name    | Description      | Units      | default  |
|:-----------:|:-----------:|:-----------:|:-----:|
| Vt | 阈值电压 |    V     |  0.0 |
| Vh | 滞后电压 |    V     |  0.0 |
| Ron | 导通电阻 | Ω |  1.0 |
| Roff | 关断电阻 | Ω |  1/Gmin |
| Lser | 串联电感 | H |  0.0 |
| Vser | 串联电压 | V |  0.0 |
| Ilimit | 限制电流 | A | Infin.  |

**该开关根据滞回电压 Vh 的值，具有三种不同的电压控制模式:**

- 如果 Vh 为零，开关将始终完全导通或关断，具体取决于输入电压是否超过阈值电压。
- 如果 Vh 为正值，开关将表现出滞回现象，就像通过施密特触发器控制一样，触发点为 Vt - Vh 和 Vt + Vh。需要注意的是，Vh 是触发点之间电压的一半，这与常见的实验室术语有所不同。
- 如果 Vh 为负值，开关将在导通和关断阻抗之间平滑过渡。过渡发生在控制电压 Vt - Vh 和 Vt + Vh 之间，且平滑过渡遵循开关导通行为的对数的低阶多项式拟合。

平时设Vh为负值就好。



参考链接：  
[LTspice: Voltage Controlled Switches](https://www.analog.com/cn/resources/technical-articles/ltspiceiv-voltage-controlled-switches.html#:~:text=To%20insert%20and%20configure%20a%20switch%20in%20LTspice%E2%80%A6,this%20example%3A.model%20MYSW%20SW%20%28Ron%3D1%20Roff%3D1Meg%20Vt%3D.5%20Vh%3D-.4%29)