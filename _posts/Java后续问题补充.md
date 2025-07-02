---
title: 算法-Java常用API
date: 2025-05-08 20:12:15
index_img:
tags:
  - 数据结构与算法
  - java
categories: Algorithm
math: true
---

## Java Scanner

`java.util.Scanner` 是 Java5 的新特征，我们可以通过 Scanner 类来获取用户的输入。ACM 模式必备。

**注意**：JUnit 的测试方法（如`@Test`）默认不会连接控制台（`System.in`），一定要在`main()`方法中运行。

Scanner 类的UML 图如下：

![](https://s21.ax1x.com/2025/05/07/pELmNqI.png)

它实现了`AutoCloseable`接口，可以使用try-with-resources自动关闭资源。

创建一个 Scanner 对象：

```java
Scanner s = new Scanner(System.in);
```

**接收 String 类型输入**：

- `next()`
  - 一定要读取到有效字符后才可以结束输入。
  - 对输入有效字符之前遇到的空白，`next()`方法会自动将其去掉。
  - 只有输入有效字符后才将其后面输入的空白作为分隔符或者结束符。
  - `next()` 不能得到带有空格的字符串。
- `nextLine()`
  - 以Enter为结束符,也就是说`nextLine()`方法返回的是输入回车之前的所有字符。
  - 可以获得空白

**接收`int`、`long`类型的输入**，可以使用`nextInt()`、`nextLong()`等。但是有以下几点要注意的地方：

1. 这类方法不会消耗回车键产生的换行符，但是`nextLine()`会读取换行符，所以在二者混用的时候要注意：

```java
public class ScannerDemoTest {
    public static void main(String[] args) {
        Scanner scan = new Scanner(System.in);

        System.out.print("请输入一个数字：");
        int num = scan.nextInt();  // 输入：123

        System.out.print("请输入一句话：");
        String line = scan.nextLine();  // 问题出在这里

        System.out.println("你输入的数字是：" + num);
        System.out.println("你输入的话是：" + line);

        scan.close();
    }
}
```

控制台打印：

```text
请输入一个数字：123
请输入一句话：你输入的数字是：123
你输入的话是：
```

解释：输入`123`，按下回车键的时候，`123`赋值给了`num`，与此同时`line`接收到回车符，因此还没来得及输入一句话程序就结束了。

解决方法：在`int num = scan.nextInt(); `后面紧跟一个`scan.nextLine()`，把回车吸收掉。

2. `nextInt()`等接收特定数据类型**不能接收其他类型的数据**，否则运行时会报异常`Exception in thread "main" java.util.InputMismatchException`，所以在接收数据之前最好使用`hasNextInt()`判断输入的数据是否符合要求。
3. `nextInt`、`next()`等都可以把空格作为分隔符，这样方便我们在一行内输入一个数组，比如对于下面这种输入格式

```text
3
1 4 5 -1
1 3 4 -1
2 6 -1
```

利用`nextInt()`和适当的条件判断就能搞定。

## 测试类的命名

使用单元测试JUnit时，如果测试类的命名不规范，那么IDEA会报警告：

```text
Test class name 'methodTest' doesn't match regex '[A-Z][A-Za-z\d]*Test(s|Case)?|Test[A-Z][A-Za-z\d]*|IT(.*)|(.*)IT(Case)?'
```

某些测试框架（如 Maven Surefire、JUnit、IDE 插件）会用正则表达式来自动识别哪些类是“测试类”。

上面这个正则表达式规定了测试类必须符合以下格式之一：

- 以大写字母开头，并以 Test、Tests 或 TestCase 结尾，如：
  - LoginTest
  - CalculatorTests
  - NetworkTestCase
- 或者 以 Test 开头，如：
  - TestLogin
  - TestConnectionManager
- 或者包含 IT（通常代表集成测试）：
  - UserServiceIT
  - ITLoginFlow

## 实用方法

### split

定义：

```java
    public String[] split(String regex) {
        return split(regex, 0, false);
    }
```

作用：根据给定的正则表达式分割字符串。

- `参数`：定界正则表达式
- `返回值`：根据给定的正则表达式分割得到的`String[]`数组

举例：输入 IP 地址和子网掩码，输出网络地址和主机地址。第一步从给定的字符串中提取数字的过程可以用`split`完成：

```java
private static int[] parse(String str) {
    String[] newStr = str.split("\\.");
    int[] result = new int[4];
    for(int i = 0; i < 4; i++) {
        result[i] = Integer.parseInt(newStr[i]);
    }
    return result;
}
```

运行以下单元测试：

```java
@Test
public void test1() {
    String s = "192.168.1.10";
    int[] result = parse(s);
    System.out.println(Arrays.toString(result));
    // [192, 168, 1, 10]
}
```

可见原字符串中的小数点已经被成功去掉，四个数字被转换成整型变量保存在了数组中。

小数点属于正则表达式中的特殊字符，`.`用于匹配任意一个字符，想匹配它本身必须在前面加上`\\`。所以必须用`"\\."`来表示匹配小数点。类似的特殊字符还有：

| 字符 | 含义                         | 匹配自身需写作 |
|------|------------------------------|----------------|
| `.`  | 匹配任意单个字符（除换行）   | `\\.`         |
| `*`  | 匹配前面的内容零次或多次     | `\\*`         |
| `+`  | 匹配前面的内容一次或多次     | `\\+`         |
| `?`  | 匹配前面的内容零次或一次     | `\\?`         |
| `^`  | 匹配字符串的开头             | `\\^`         |
| `$`  | 匹配字符串的结尾             | `\\$`         |
| `[`  | 开始一个字符类               | `\\[`         |
| `]`  | 结束一个字符类               | `\\]`         |
| `{`  | 指定匹配次数（如 `{3}`）     | `\\{`         |
| `}`  | 结束指定次数                 | `\\}`         |
| `(`  | 开始一个分组                 | `\\(`         |
| `)`  | 结束一个分组                 | `\\)`         |
| `\|`  | 逻辑“或”                     | `\\\|`         |
| `\\` | 转义符本身                   | `\\\\`        |

### replaceAll

使用场景：[二叉树的序列化与反序列化](https://leetcode.cn/problems/serialize-and-deserialize-binary-tree/)

序列化，使用`StringBuilder`得到结果之后，需要删除尾部多余的`null`，这时可以使用`replaceAll`

语法：

```java
String newString = originalString.replaceAll(String regex, String replacement);
```

- `regex`：要匹配的正则表达式（pattern）
- `replacement：用于替换的字符串

在这道算法中的使用：

```java
String res = sb.toString();

String result = res.replaceAll("(null,)+$", "");

if(result.endsWith(","))
    result = result.substring(0, result.length()-1);

return result+"]";
```

- 正则表达式`"(null,)+$"`
  - `(null,)+`：匹配 一个或多个`"null,"`。`+`是定位符，表示一个或多个匹配。
  - `$`表示从文本的末尾位置开始匹配。

所以该正则的含义就是字符串末尾的连续多个`null,`。

## substring

语法：

```java
public String substring(int beginIndex, int endIndex) {...}

public String substring(int beginIndex) {
        return substring(beginIndex, length());
    }
```

- `beginIndex`：起始索引，包含
- `endIndex`：结束索引，不包含。如果没有该参数，则从起始索引开始截取到末尾（本质上还是调用的第一个方法）
- 返回值：指定的子字符串

## 栈应该用哪个实现类？

### 先说结论

`Stack.java`的文档注释中是这样解释的：

{% note secondary %}
Stack 类表示一个后进先出 (LIFO) 的对象堆栈。它扩展了 Vector 类，增加了五个操作，允许将向量视为堆栈。它提供了常见的 push 和 pop 操作，以及一个用于查看堆栈顶部元素的方法、一个用于测试堆栈是否为空的方法，以及一个用于在堆栈中搜索元素并确定其距离顶部距离的方法。

堆栈首次创建时不包含任何元素。

**Deque 接口及其实现提供了一套更完整、更一致的 LIFO 堆栈操作，应优先使用此类**。例如：

```java
Deque<Integer> stack = new ArrayDeque<Integer>();
```
{% endnote %}


`Deque`右两个常用实现类：`LinkedList`和`ArrayDeque`。

在`ArrayDeque.java`的开头文档注释：
 
{% note secondary %}  
Deque 接口的动态数组实现。数组双端队列没有容量限制；它们会根据需要扩容以支持使用。它们不是线程安全的；在没有外部同步的情况下，它们不支持多线程并发访问。禁止使用 Null 元素。**此类用作堆栈时可能比 Stack 更快，用作队列时可能比 LinkedList 更快**。  
{% endnote %}  

所以应该使用`ArrayDeque`模拟栈和队列。

### 为什么不使用Stack

Stack 的定义：

```java
public class Stack<E> extends Vector<E> {...}
```

`Stack`继承了`Vector`。`Vector`是一个线程安全的动态数组，但它使用的是同步方法（`synchronized`），这在单线程环境下反而造成了不必要的性能开销。查看`Vector`的源码会发现几乎每一个方法被都加上了`synchronized`修饰，比如添加和删除：

```java
public synchronized void addElement(E obj) {
    modCount++;
    add(obj, elementData, elementCount);
}
public synchronized boolean removeElement(Object obj) {
  modCount++;
  int i = indexOf(obj);
  if (i >= 0) {
      removeElementAt(i);
      return true;
  }
  return false;
}
```

这是非常粗暴且不合理的。

`Stack`作为它的子类也强制使用同步机制，就算是没有线程安全问题也是如此，这样会明显降低性能。

### 为什么ArrayDeque更优


`ArrayDeque`是一个基于**循环数组**实现的双端队列，访问速度非常快。而`LinkedList`是链表，每次访问的时候都必须从头节点开始往下找，明显慢得多。另一方面，`ArrayDeque`会自动扩容，而链表的扩容需要频繁创建新的节点对象，垃圾回收负担大。

## TreeSet和TreeMap

二叉搜索树是否平衡对二叉搜索树的时间效率至关重要。Java根据红黑树这种平衡的二叉搜索树实现TreeSet和TreeMap两种数据结构。

TreeSet 实现了接口Set，它内部的平衡二叉树中的每个节点只包含一个值，根据这个值的查找、添加和删除操作的时间复杂度都是$O(\log{n})$。除了Set接口定义的方法以外，常用方法如下：

| 序号 | 函数   | 函数功能                                               |
|------|--------|--------------------------------------------------------|
| 1    | ceiling | 返回键大于或等于给定值的最小键；如果没有则返回 null |
| 2    | floor   | 返回键小于或等于给定值的最大键；如果没有则返回 null |
| 3    | higher  | 返回键大于给定值的最小键；如果没有则返回 null       |
| 4    | lower   | 返回键小于给定值的最大键；如果没有则返回 null       |

TreeMap 实现了接口Map。和TreeSet 不一样，TreeMap内部的平衡二叉搜索树中的每个节点都是一个包含键值和值的映射。可以根据键值实现时间复杂度为$O(\log{n})$的查找、添加和删除操作。除了Map接口定义的方法以外，常用的方法如下：

| 序号 | 函数                        | 函数功能                                                             |
|------|-----------------------------|----------------------------------------------------------------------|
| 1    | ceilingEntry / ceilingKey   | 返回键大于或等于给定值的最小映射 / 键；如果没有则返回 null         |
| 2    | floorEntry / floorKey       | 返回键小于或等于给定值的最大映射 / 键；如果没有则返回 null         |
| 3    | higherEntry / higherKey     | 返回键大于给定值的最小映射 / 键；如果没有则返回 null               |
| 4    | lowerEntry / lowerKey       | 返回键小于给定值的最大映射 / 键；如果没有则返回 null               |

哈希表的增删改的时间复杂度都是$O(1)$，但是缺点是只能根据键来判断键是否存在以及获取键对应的值。如果需要根据数值的大小查找，如查找数据集合中比某个值大的所有数字中的最小的一个，哈希表就无能为力。

如果在一个已经排序的动态数组中根据数值的大小进行查找，二分查找也可以实现$O(\log{n})$，但是排序的动态数组的添加和删除操作的时间复杂度都是$O(n)$，不如`TreeSet`和`TreeMap`。

## copyOf和copyOfRange 

copyOf

```java
public static <T> T[] copyOf(T[] original, int newLength)
```

- `original`：原始数组
- `newLength`：复制后新的数组的长度，从0开始复制。如果 newLength 大于原始数组长度，多出来的部分用默认值填充。

copyOfRange

```java
public static <T> T[] copyOfRange(T[] original, int from, int to)
```

- `original`: 原始数组
- `from`: 起点（包含）
- `to`：终点（不包含）

新数组的长度 = to - from。如果`to`大于数组的长度，多出来的部分用默认值填充。

## Random

创建随机数对象

```java
Random random = new Random();
```

调用
```java
int r = random.nextInt(bound);
```

- 生成一个范围在`[0, bound)`范围内的整数

出现位置：[O(1) 时间插入、删除和获取随机元素](https://leetcode.cn/problems/insert-delete-getrandom-o1/description/)


## 如何将列表转换成特定类型的数组

### 引入

先看一个例子：

```java
List<ListNode> TempList = new ArrayList<>();
...
ListNode[] lists = TempList.toArray(new ListNode[0]);
```

`lists`是一个用于存放`ListNode`数据的数组，`Templist`是一个存放`ListNode`元素的列表。最后一行代码实现了从`TempList`列表向数组的转化。这里的关键是`toArray`方法，实际上`List`接口中定义了两个`toArray`抽象方法，一个空参一个有参，定义分别如下：

```java
Object[] toArray();
<T> T[] toArray(T[] a);
```

为了搞清楚这两个方法如何使用，需要先介绍一下`runtime type`（运行时类型）和`compile type`（编译时类型）。

### 编译时类型和运行时类型

运行时类型，指的是对象在程序运行的过程中真实的类型。之所以强调“真实”，是因为Java中的多态使得编译器认为的类型和程序运行时的类型可能不一样，例如

```java
Animal a = new Dog();
``` 

所谓*编译看左边，运行看右边*，`a`的编译时类型是`Animal`，运行时类型是`Dog`。

### Java标准库提供的注释

先看空参方法`Object[] toArray();`：

> 按照正确的顺序（从第一个到最后一个）返回一个包含原列表中所有元素的数组。
>
> 返回的数组是“安全的”，意思就是说它不包含任何对原列表的引用，是完全独立于原列表的。你可以放心地修改它，不用担心会对原列表产生任何影响。
>
> 这个方法是基于数组的 API 和基于集合的 API 之间的桥梁。

`返回值`: 一个以正确的顺序包含列表中的所有元素的`Object`数组

这个方法的返回值类型固定为`Object[]`，在实际应用中需要手动强转成我们需要的类型，很不方便。于是就有了后面这个带参数的方法

---

`<T> T[] toArray(T[] a);`

> 照正确的顺序（从第一个到最后一个）返回一个包含原列表中所有元素的数组。返回数组的运行时类型与指定数组相同。如果该列表可以装入指定的数组中，则直接把它放进数组并返回；否则，会分配一个具有与指定数组相同运行时类型的新数组，其大小等于列表的大小。
>
> 如果指定的数组比原列表需要的空间还大，那么空缺位置会被赋值为`null`。（*仅当*调用者确认原列表中不包含任何`null`元素时，这个特性才有助于判断列表的长度）
>
> 就像`toArray()`方法一样，该方法是基于数组的 API 和基于集合的 API 之间的桥梁。此外，该方法允许对输出数组的运行时类型进行精确的控制，在某些情况下或许可以节省内存开销。
>
> 假设`x`是一个已知只包含字符串的列表。以下代码可以用于将列表转存到新分配的String数组中：
>
> `String[] y = x.toArray(new String[0]);`
>
> 注意`toArray(new Object[0])`与上面的`toArray()`完全相同。

`参数`: `a`- 指定数组，如果足够大，原列表的元素将被直接存入该数组；否则，会分配一个与之相同运行类型的新数组。

`返回值`: 一个包含列表元素的数组

`抛出`: `ArrayStoreException` - 如果指定数组的运行时类型不是每一个列表元素的父类型   
`NullPointerException` - 如果指定数组是`null`

---

Java标准库中给出的解释已经非常详细了。对于开头处的语句`ListNode[] lists = TempList.toArray(new ListNode[0]);`，形参`new ListNode[0]`的主要作用是**确定返回数组的运行时类型**，它作为我们给出的指定数组，其容量为0，显然是不够用的，所以会分配一个运行时类型为`ListNode[]`的新数组，其容量等于列表的大小。然后，把返回的数组赋给相同类型的数组`lists`就没有任何问题了。