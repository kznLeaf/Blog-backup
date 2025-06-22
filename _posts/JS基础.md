---
title: JS基础
date: 2025-04-23 19:25:48
index_img:
categories: Web Development
---

JS基础知识，先速通一遍，以后再慢慢补充细节

<!-- more -->

# 引入方式

## 内部脚本

将JS代码定义在HTML中。可以在任意地方放置任意数量的js，但是一般会把脚本位于`<body>`元素的底部，可以改善显示速度。

```html
<script>
    alert("Hello JavaScript")
</script>
```

## 外部脚本

定义在外部js文件中，HTML文档通过以下格式引用，不能自闭合。外部js文件不需要`<script>`

```html
<script src="js/demo.js"></script>
```

# 基本语法

- 每行结尾的分号可有可无（但是建议加上）
- 输出语句
  - `window.alert()`弹出窗口（/əˈlɜːrt/ 意思是警示）
  - `document.write()`写入HTML文档（开发很少用）
  - `console.log()`输出到控制台


# 变量

在 JavaScript 中定义变量的方法有三种，分别是

1. `let`（推荐）

```js
let name = "初音ミク";
```

- `let`定义的是可以**更改值**的变量
- 代码块内有效

2. `const`（推荐）

```js
const PI = 3.14159;
```

- `const`定义的是**常量**，**不能重新赋值**
- 一旦赋值就不能改变
- 代码块内有效

3. `var`⚠️（不推荐）

```js
var age = 16;
```

- 旧语法（ES5之前），写老代码、或者兼容旧浏览器才用
- 允许修改
- 变量会提升（hoisting），且是函数作用域，容易出 bug
- 出代码块还可以访问，属于全局变量
- 可以重复定义，前两个都不行。例如

```js
    {
        var x = 1;
        var x = 'A';
    }
    alert(x);
```

不报错。

# 数据类型、运算符、流程控制语句

## 数据类型

- **原始类型（Primitive Types）**

对应Java中的基本数据类型，但是分得没那么细

| 数据类型   | 示例值                          | 说明                        |
|------------|----------------------------------|-----------------------------|
| `number`   | `42`, `3.14`, `NaN`, `Infinity` | 数字类型，包含整数和浮点数 |
| `string`   | `"Hello"`, `'世界'`              | 字符串，单双引号都可         |
| `boolean`  | `true`, `false`                 | 布尔值                      |
| `undefined`| `let x;` → `x === undefined`    | 声明未赋值时的默认值        |
| `null`     | `let x = null`                  | 表示“无”或“空值”           |
| `bigint`   | `12345678901234567890n`         | 大整数类型（ES2020+）      |
| `symbol`   | `Symbol("id")`                  | 独一无二的标识符            |

- **引用类型（Reference Types）**

对应Java中的引用数据类型，但是少得多

| 数据类型   | 示例                              | 说明                            |
|------------|-----------------------------------|---------------------------------|
| `object`   | `{ name: "Miku", age: 16 }`       | 普通对象，键值对结构            |
| `array`    | `[1, 2, 3, "初音"]`               | 数组，JS 中是一种对象类型       |
| `function` | `function greet() {}`             | 函数也是对象                    |
| `date`     | `new Date()`                      | 日期对象                        |
| `regexp`   | `/abc/`, `new RegExp("abc")`      | 正则表达式对象                  |


使用`typeof`运算符可以得到数据类型。




## 运算符

算术运算符，逻辑运算符同Java。

比较运算符：

```js
==    // 相等，会进行类型转换
===   // 全等（值和类型都相等），不进行类型转换✅推荐
!=    // 不等
!==   // 全不等（值和类型都不相等）
< > <= >=
```

赋值运算符：
```js
= **
+=   -=   *=   /=   %=   **=
```

- `**`：**指数运算符Exponentiation Operator）**，例如`2**3`表示2的三次方。它是**左结合**运算符，比如`2 ** 3 ** 2`的计算顺序是`2 ** (3 ** 2)`。
- `**=`是**指数赋值运算符（Exponentiation assignment operator）**，ES7加入。举个例子：`x **= y`，意思就是`x = x ** y;`，意思就是把x的y次方赋给x本身。例如：

```js
let a = 2;
a **= 3;
```

就是把`a`的3次方赋值给`a`，结果为8。

### 类型转换

#### 转换成字符串

`.toString()`

Boolean值、数字(number)和字符串(string)都是**伪对象**，它们实际上具有属性和方法，`.toString()`就是其中一种可供调用的方法。

另外number类型的`toString()`方法比较特殊，如果不传入任何参数，那么采用的是**默认模式**，返回的是数字的十进制表示。如果传入参数，即为**基模式**，可以用不同的基(radix)输出数字。

例如，以下代码

```js
    let x = 9;
    alert(x.toString(2));
```

得到的结果为`1001`，也就是十进制数字9的二进制表示。

#### 转换成数字

转换为整数：`parseInt`
转换为小数：`parseFloat()`

从开头开始从左到右读取是数字的部分。如果开头就不是数字，则转换失败，返回`NaN`(Not a Number)。

字符串中包含的数字字面量会被正确转换为数字，例如"0xA"会被转换成数字10。但是"22.5"会被转换成22，因为小数点被当成无效字符处理了。`parseFloat()`会把遇到的第一个小数点当成小数点处理。

`parseInt()`方法也有基模式，定义为`parseInt(string: string, radix?: number): number`，但是`parseFloat()`没有。

相比之下，Java使用`Integer.parseInt()` `Float.parseFloat` `Double.parseDouble()` `Long.parseLong`等方法进行转换，如果转换失败会抛出`NumberFormatException`异常。

### 强制类型转换

**type casting**

<p class="note note-info">cast有“铸造”之意，很贴合“强制转换”的意思</p>

**ECMAScript 中可用的3种强制类型转换**：

- Boolean(value) - 把给定的值转换成 Boolean 型；空字符串、数字 0、undefined 或 null，返回 false。
- Number(value) - 把给定的值转换成数字（可以是整数或浮点数）；处理**整个值**。
- String(value) - 把给定的值转换成字符串；

# 函数

使用**function**进行定义，语法为

```js
function functionName(para1, para2,...) {
    //函数体
}
```

- 形参不需要类型，因为js弱类型
- 返回值也不需要定义类型，有return就说明有返回值
- 调用的时候可以传递任意个数的参数

函数作为形参时，使用lambda表达式会舒服很多。

## *闭包(closure)

### 引入

JS比较独特的一个特性。

{%note secondary %}
JavaScript 变量属于 本地 或 全局 作用域。
全局变量能够通过 闭包 实现局部（私有）。
{% endnote %}

- 在网页中，全局变量属于`window`对象，全局变量能够被页面中（以及窗口中）的所有脚本使用和修改。
- 而局部变量只能用于其被定义的函数内部，对于其他函数和脚本代码来说它是不可见的。

考虑下面这种情况：我们想做一个计数器用来计数函数被调用的次数。如果使用下面这种方式

```js
// 初始化计数器
var counter = 0;

// 递增计数器的函数
function add() {
  counter += 1;
}

// 调用三次 add()
add();
add();
add();

//此时计数器为3
```

虽然能实现计数的功能，但是**不够安全**，因为作为全局变量的`counter`可以被任意函数随意更改。为了防止随意更改，考虑把它声明为局部变量：

```js
function add() {
    var counter = 0;
    function plus() {counter += 1;}
    plus();     
    return counter; 
}
```

显然仍然存在问题，因为每次调用这个函数时都会给`counter`重新赋值为0，不能实现计数的功能，我们必须保证初始化函数之被调用一次

在Java中，我们可以使用权限修饰符`private`和`getter`解决安全性问题，但是JS中没有权限修饰符，怎么办？有没有什么东西可以实现类似的功能？

答案是有的，那就是闭包。

---

### 使用

```js
var add = () => {
    let counter = 0;
    return () => {
        return counter += 1;
    }
};

const conterFunc = add(); // 获得内层函数

console.log(conterFunc());
console.log(conterFunc());
console.log(conterFunc());
console.log(conterFunc());

//控制台： 1  2  3  4
```

- `add`是外层函数，内部定义了一个内部匿名函数，并且`add`的返回值就是内部函数的引用，或者说句柄；
- `const conterFunc = add();`调用了一次外层函数，创建一个`counter`并初始化为0；
- 之后每次调用`conterFunc()`实际上调用的是内层函数，因为`counter`还是第一次创建好的那个，所以可以正常计数；
- 又因为`counter`是函数内部定义的局部变量，所以不会被外界访问到，足够安全。

**注意**：每次调用`add()`会生成新的独立包，相互独立互不影响，所以只在开头调用了一次。

闭包还可以把多参数的函数变成单参数的函数，例如平方和立方的计算：

```js
/* 把x和n分配到外层函数和内层函数即可实现 */
function make_pow(n) {
    return function (x) {
        return Math.pow(x, n);
    }
}
// 创建两个新函数:
let pow2 = make_pow(2);
let pow3 = make_pow(3);

console.log(pow2(5)); // 25
console.log(pow3(7)); // 343
```

## 生成器(generator)

ES6标准引入的新的数据类型。另外，

{% note primary %}
生成器函数 是一种可以“暂停执行”的函数，通过 function* 定义，用 yield 控制流程，返回的是一个 可迭代对象（iterator）。
{% endnote %}

- `yield`: 返回一个值给外部，同时暂停函数的执行。
- `next()`: 一旦调用就执行到下一个`yield`


调用这个函数不会直接执行函数体内部的代码，而是返回一个**生成器对象**（generator object）。每次调用它都会重开一个生成器。

为了让生成器能往下跑，需要采用类似闭包的方法：先获取句柄

```js
function* countUp() {
    let i = 0;
    while (true) {
        yield i++; // 返回i的值，然后i+1
    }
}

const counter = countUp(); // 先创建一个“可以暂停的执行器” 
console.log(counter.next().value); // 0
console.log(counter.next().value); // 1
console.log(counter.next().value); // 2

console.log(countUp().next().value);//0
```


# 对象

- Array
- String
- JSON
- BOM(Browser Object Model, 浏览器对象模型)
- DOM(Document Object Model, 文档对象模型)

## 包装类对象

```js
console.log(123..toString()); // 不报错
console.log(123.toString()); // 报错
```

**别用**

## Date

```js
var d = new Date(2018, 11, 24, 10, 33, 30, 0);
console.log(d);
//控制台输出：Mon Dec 24 2018 10:33:30 GMT+0800 (中国标准时间)
```

{% note warning %}
JavaScript 从 0 到 11 计算月份。
一月是 0。十二月是11。
6个数字指定年、月、日、小时、分钟、秒：
{% endnote %}




## Array

- **定义**

```js
// 一般方式
var arr = new Array(1,2,3,4);
// 简化的方式
var cars = ["Saab", "Volvo", "BMW"];
```

- **访问**

```js
arr[index] = value;
```

- **遍历**：推荐`forEach`方法（相当于Java中的forEach+lambda表达式）

```js
    var arr = [1, 2, 3, 4];

    arr.forEach(element => {
        console.log(element);
    });
```


JS数组长度可变，类型可变，可以存储任意类型的数据。没有赋值的位置记为undefined。

**属性**：`length`，用法同Java

**方法**：

- `forEach`:遍历**有值**的元素，并调用传入的函数
- `push()`:将新的元素添加到数组的末尾，并返回新的长度
- `splice(start: number, deleteCount?: number): number[]`:从数组中删除元素，左闭右开。问号表示可选参数

```js
    var arr = [1, 2, 3, 4];
    arr.splice(0, 2)
    for (let i = 0; i < arr.length; i++) {
        console.log(arr[i]);
    }
```

控制台：3  4

## String

**创建**

```js
var 变量名 = new String("...");
var 变量名 = "...";
```

**属性**：`length`

**方法**：

- `charAt(index)`:返回字符串中 指定位置的字符。
- `indexOf(searchValue, fromIndex?)`:从fromIndex开始查找某个子字符串第一次出现的位置，找不到就返回 -1。
- `trim()`:去除字符串两边的空格（不包括中间的空格）。
- `substring(startIndex, endIndex?)`:截取字符串的一部分，左闭右开。

### 对字符串做一些补充

1. **多行字符串**：

```js
let s = `这是一个
多行
字符串
`;
```

通过反引号的形式声明多行字符串，可以省去换行字符。

2. **模板字符串**：

要把多个字符串连接起来，可以用+号连接；ES6新增了一种模板字符串，连接字符串更方便：（注意使用反引号包裹）

```js
const person = {
    name: "sss",
    age: 17,
}
console.log(`名字是：${person.name}, 年龄是${person.age}`);
```

## JSON

基于 JavaScript 语言的轻量级的数据交换格式（JavaScript Object Notation）

意义：

{% note success %}
当数据在浏览器与服务器之间进行交换时，这些数据只能是文本。

JSON 属于文本，并且我们能够把任何 JavaScript 对象转换为 JSON，然后将 JSON 发送到服务器。

我们也能把从服务器接收到的任何 JSON 转换为 JavaScript 对象。

以这样的方式，我们能够把数据作为 JavaScript 对象来处理，无需复杂的解析和转译。
{% endnote %}

虽然名字里有 JavaScript，但它是语言无关的格式，可以被几乎所有语言（如 Python、Java、C#）支持。

---

先说说JS自定义对象：

```js
var 对象名 = {
    属性名：属性值,
    ...
    函数名:function(形参列表){执行代码}
    // :function 可以省略

};
```

---

如何定义一个JSON：

```json
{
  "name": "Hưng",
  "age": 21,
  "languages": ["Vietnamese", "Japanese", "Chinese"],
  "isStudent": true,
  "details": {
    "city": "Ho Chi Minh",
    "hobbies": ["music", "anime", "games"]
  }
}
```

- **把 JSON 字符串转为对象**：`const obj = JSON.parse(jsonStr);`
- **把对象转为 JSON 字符串**：`const jsonStr = JSON.stringify(obj);`


# 面向对象编程

参看这位大佬的博客：

[深入理解javascript原型和闭包](https://www.cnblogs.com/wangfupeng1988/p/3977924.html)

# BOM

浏览器对象模型允许 JavaScript 与浏览器对话。

- `window`:窗口对象，去除占位符后的净宽高为（IE<=8不支持）
  - `innerWidth`
  - `innerHeight`
- `screen`:表示屏幕的信息（宽，高，位宽）
- `location`:当前页面的URL信息
  - `location.href`:当前页面的URL



  - `setInterval`持续重复执行该函数。
  - `setTimeout`在等待指定的毫秒数后执行函数。


**Cookie**

{% note secondary %}
浏览器用来存储小块数据（最多约 4KB）的一种机制。
它可以在用户浏览网页时，在本地保存数据，并在之后访问时自动携带到服务器。
{% endnote %}

我们登录了一个网站，关闭网页后第二天再来，不用重新登录了，就是因为Cookie。


# DOM

当网页被加载时，浏览器会创建页面的文档对象模型（Document Object Model）。

HTML DOM 模型被结构化为对象树：

![https://www.w3school.com.cn/js/js_htmldom.asp](https://www.w3school.com.cn/i/ct_htmltree.gif)

通过`document`对象的方法可以找到对象树上的节点，常用的有：

- `getElementById()`
- `getElementsByTagName()`

## 更新

获取对象后，可以对对象进行操作：

- `innerHTML`
- `innerText`
- `textContent`


也可以修改css样式（和css的命名方式不一样）

- `.style.color`
- `.style.fontSize`
- `.style.paddingTop`

格式：

```js
document.getElementById(id).style.property = newstyle
```

## 插入

- `appendChild`
- `insertBefore`
## 删除

父节点调用`removeChild`删除子节点

# Async

## 回调

回调函数（Callback Function），将一个函数作为参数传递给另一个参数

# JS事件

事件绑定的方式：

- 通过HTML中的事件属性。例如`<button onclick="displayDate()">试一试</button>`
- 通过DOM分配事件，例如

```js
<script>
document.getElementById("myBtn").onclick = displayDate;
</script> 
```

## *事件监听

{% note secondary %}
在 JavaScript 中，事件监听（Event Listener） 是指你为一个 HTML 元素绑定一个函数（监听器），当某个事件发生时（比如点击、键盘输入、鼠标悬停等），这个函数就会被自动调用。
{% endnote %}

语法：

```js
element.addEventListener(event, function, useCapture);
```

- 事件类型
- 事件发生时调用的函数
- 布尔值，指定事件是使用冒泡还是事件捕获，可选参数，默认是冒泡阶段（用得很少）

可以向一个元素添加多个事件处理程序。