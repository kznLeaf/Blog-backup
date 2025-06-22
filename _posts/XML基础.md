---
title: XML基础
date: 2025-04-29 14:00:54
index_img:
categories: Web Development
---

# XML

XML 还没有被淘汰，应用的地方还有不少，比如说 Maven 的 pom.xml 文件里就还在用。但是作为一种数据传输格式，它正在被 JSON 替代。所以以下简单列举一些XML的基础知识，更深层次的目前没必要去学。

## 什么是XML

XML(eXtensible Markup Language，可扩展标记语言)，其设计目的就是存储和传输数据。XML也是一种标记语言，类似于HTML，但是HTML只负责显示数据，而且XML的标签不像HTML一样预先被定义。在许多 HTML 应用程序中，XML 用于存储或传输数据，而 HTML 用于格式化和显示这些数据。

**可扩展性**就体现在，允许用户自定义任何需要的标签，而且即使添加了（或删除了）新数据，大多数 XML 应用程序也会按预期工作，输出不受影响。**XML 的优势之一，就是可以经常在不中断应用程序的情况进行扩展**。

和JSON一样，XML以纯文本格式存储数据，这样就避免了在不同的计算机系统上交换数据时的不兼容问题。

这是博客的站点地图文件`sitemap.xml`的一部分：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  
  <url>
    <loc>https://kznep19.blog/2025/04/27/Maven%E7%9A%84%E4%BD%BF%E7%94%A8/</loc>
    
    <lastmod>2025-04-28</lastmod>
    
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>  

</urlset>
```

- 第一行是XML声明
- `urlset`是指定该文档遵循 sitemaps.org 的 Sitemap 0.9 标准。，表示这是一个网址列表。`xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`指定该文档遵循 sitemaps.org 的 Sitemap 0.9 标准。
- `<loc>`:页面URL
- `<lastmod>`:页面的最后修改时间
- `<changefreq>`:建议搜索引擎多久抓取一次
- `<priority>`:页面在站点中的相对重要性(0.0–1.0)

## XML树结构

XML 中的元素形成了一种树状结构：

![](https://www.w3school.com.cn/i/xml/nodetree.png)

从最上面的根元素开始，扩展到枝叶。

## 语法

1. XML 文档必须包含一个根元素，作为其他所有元素的父元素

```xml
<root>
  <child>
    <subchild>.....</subchild>
  </child>
</root>
```

2. XML 标签区分大小写
3. 一些符号不能直接写在元素中，使用**实体引用**

| 字符 | 替代写法 |
|------|----------|
| `<` | `&lt;`（less than） |
| `>` | `&gt;`（greater than） |
| `&` | `&amp;`（ampersand） |
| `"` | `&quot;`（双引号） |
| `'` | `&apos;`（单引号） |

4. 多个连续的空格不会被裁剪

## 元素

类似`<lastmod>2025-04-28</lastmod>`被称为一个**元素**。元素的内容可以是文本内容，也可以是其他的子元素。

**空元素**：形如`<element></element>`，可以使用自关闭标签记为`<element />`。

元素的命名约定：

| 样式   | 例子         | 描述                                      |
|--------|--------------|-------------------------------------------|
| 小写   | `<firstname>` | 所有字母小写                             |
| 大写   | `<FIRSTNAME>` | 所有字母大写                             |
| 蛇形   | `<first_name>`| 下划线分隔单词（常用于 SQL 数据库）     |
| 帕斯卡 | `<FirstName>` | 每个单词的第一个字母大写（C 程序员常用）|
| 驼峰   | `<firstName>` | 除第一个之外的每个单词首字母大写（常用于 JavaScript）|


## 属性

**Attribute**

XML 属性必须加引号：`<person gender="female">`，单双都可。属性的扩展性很差。

数据本身应当存储为元素，元数据（用于描述数据的信息）应当存储为属性。

## 命名空间

**Namespace**

当两个不同的文档使用相同的元素名称时，就会发生**命名冲突**。例如，table 既可以作为桌子的名称，也可以作为表格的名称。

```xml
<table>木头餐桌</table>
<table>员工工资表</table>
```

这样就很难区分了。解决方法：**名称前缀**

在xml中使用前缀，必须定义命名空间。命名空间可以通过元素开始标记中的`xmlns`属性来定义，也就是 XML Namespace。

**语法**：`xmlns:前缀="命名空间的唯一标识符（一般是 URL）"`

其中“命名空间的唯一标识符”即为 URI ，最常见的URI是URL(Uniform Resource Locator)，也就是网址。加上名称前缀之后上面的例子变成:

```xml
<a:table xmlns:a="http://example.com/furniture">木头餐桌</a:table>
<b:table xmlns:b="http://example.com/database">员工工资表</b:table>
```

这样就能区分开来了。

然后回到开头的例子：

```xml
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
```

这似乎不符合命名空间的语法，其实这里用的是**默认命名空间**，意思是：文档中**所有没有前缀的元素**（如`<url>`、`<loc>`）**都属于这个命名空间**。

## XMLHttpRequest

{% note secondary %}
`XMLHttpRequest`是浏览器中的一个 JavaScript 对象，用于在网页与服务器之间交换数据，而无需刷新整个页面。
{% endnote %}

`XMLHttpRequest`是 2000 年代早期的 API，不过现在有使用起来更简洁方便的`fetch`。使用xhr发送GET请求的实例：

```js
//创建请求对象
var xhttp = new XMLHttpRequest();

//事件处理函数，每当xhr的对象的状态发生变化时调用
xhttp.onreadystatechange = function() {
    //请求已完成，且返回的状态码为200
    if (this.readyState == 4 && this.status == 200) {
       // 更新网页
       document.getElementById("demo").innerHTML = xhttp.responseText;
    }
};
//设置请求方式和请求地址以及是否异步
xhttp.open("GET", "filename", true);
//发送请求
xhttp.send();
```

**执行顺序**：

```lua
请求已发送
（稍后）onreadystatechange 被触发，当状态变为 4 且 status 为 200 时执行回调
```

由于是异步方式，`xhttp.send();`一开始就会被执行，浏览器异步地等待响应，期间可以去做别的事情，当xhr状态发生变化的时候才会更新网页。

## XML 解析

### DOM

将 XML 文档转换为XML DOM 对象 - 可通过 JavaScript 操作的对象。

JS使用`DOMParser`解析xml字符串实例如下：

```js
const xmlString = "<note><to>Alice</to><from>Bob</from></note>";
const parser = new DOMParser();
const xmlDoc = parser.parseFromString(xmlString, "application/xml");
console.log(xmlDoc.getElementsByTagName("to")[0].textContent); // 输出 "Alice"
```

以上代码必须放到浏览器中才能运行。

上面使用解析器将XML文件转换为XML DOM对象，对于XML DOM对象也有可用的访问方法。例如`getElementsByTagName`，`getElementById`等。因为XML DOM呈现树状结构，我们从根元素出发一定可以遍历所有子节点，获取这个XML文件的所有信息。

### SAX

DOM方式固然省事，但是内存开销太大，因为整个XML文件必须加载到内存中之后才能使用。SAX是另一种解析XML的方式，即`Simple API for XML`，它是一种基于**事件流**的间隙方式，解析时逐个读取XML文件的元素并触发相应事件。但是使用起来依然很麻烦。

### Jackson

Jackson是一个第三方库，它主要用于Java对象和JSON之间的转化，也可以实现XML到JavaBean的转换。[仓库地址](https://github.com/FasterXML/jackson)




