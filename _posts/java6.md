---
title: Java SE-常用类与基础API
date: 2025-04-08 12:34:28
index_img:
tags:
  - Java
categories: Java SE
---

# String

特性：不可变，创建后不能改变内容，任何修改其实是创建了新对象

```java
    String s1 = "hello";
    String s2 = new String("hello");
```

`String s1 = "hello";`使用**字面量**，在常量池里创建一个对象。如果有同样的字面量，会复用，效率更高

`String s2 = new String("hello");`使用new在堆内存里创建一个对象，

`s1==s2`判断为`false`,`s1.equals(s2)`判断为`true`

## String的连接操作

常量+常量 = 常量池中的常量

常量+变量 = 堆空间中该字符串对象的地址

`intern()`返回字符串常量池中对应的地址。

`concat()`必然返回一个新对象

## 常用方法

`getBytes()`：将字符串转换成字节数组，储存的数字与编码有关，需要指定编码方式使用：

```java
byte[] bytes = str.getBytes(StandardCharsets.UTF_8);
```

utf-8或gbk都向下兼容ascii。

**解码**：

```java
String str1 = new String(bytes, 字符集名称);
```

---

`indexOf`:查找某个字符或子字符串在字符串中**第一次**出现的位置。没有找到则返回-1

```java
int index = str.indexOf(String s);
int index = str.indexOf(char ch);
int index = str.indexOf(String s, int fromIndex);
int index = str.indexOf(char ch, int fromIndex);
```

记录某个字符串在另一个字符串中出现的次数：（复杂度大）

```java
    int getSubStringCount(String str,String subStr) {
        int count = 0;

        int index = str.indexOf(subStr);//第一次出现的索引

        while(index != -1) {
            count++;
            index = str.indexOf(subStr, index+subStr.length());
        }

        return count;
    }
```

## String,StringBuffer,StringBuilder

String:不可变的字符序列；

StringBuffer:可变的字符序列；线程安全，效率低

StringBuilder:可变的字符序列；线程不安全，效率高

以上三者底层均为byte[].

增:append

删:delete(int start, int end)  
    deleteCharAt(int index)

改:replace(int start, int end, String str)
    setCharAt(int index, char c)

查:charAt(inr index)

插:insert(int index, xx)

长度:length()

# 日期时间API

旧API

1. currentTimeMillis():与1970.1.1日0时0分0秒之间的毫秒数
2. Date()类
3. Calendar抽象类

**新API**：

最常用的API：

| 类名               | 说明                                                                 |
|--------------------|----------------------------------------------------------------------|
| `LocalDate`        | 表示日期（如：2025-04-09），不含时间和时区                         |
| `LocalTime`        | 表示时间（如：12:30:45），不含日期和时区                           |
| `LocalDateTime`    | 表示日期和时间（如：2025-04-09T12:30:45），不含时区                |
| `ZonedDateTime`    | 表示带时区的日期和时间（如：2025-04-09T12:30:45+09:00[Asia/Tokyo]） |
| `Instant`          | 表示时间戳，精确到纳秒（从1970-01-01T00:00:00Z开始）（重写为ISO-8601标准的字符串）               |
| `Duration`         | 表示两个时间之间的间隔（单位：秒、纳秒）                           |
| `Period`           | 表示两个日期之间的间隔（单位：年、月、日）                         |
| `DateTimeFormatter`| 用于格式化和解析日期时间                                           |

# 自定义类的对象的排序

## 1.自然排序：实现Comparable接口

1. 定义一个类实现`Comparable`接口这个泛型接口

```java
public interface Comparable<T> {
    /**
     * 返回负数: 当前实例比参数o小
     * 返回0: 当前实例与参数o相等
     * 返回正数: 当前实例比参数o大
     */
    int compareTo(T o);
}
```

2. 实现`public int compareTo(T o);`方法，指明比较的标准
3. 创建实例，调用`Arrays.sort`或`compareTo`比较大小。

实现compareTo方法之后，`Arrays.sort(arr)`的比较标准也会改变。

> `Arrays.sort()` 会自动使用元素类中定义的 `compareTo()` 方法，所以当你重写了这个方法，排序逻辑自然也随之改变了。

实例：让Person对象按照名字排序

```java
// sort
import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        Person[] ps = new Person[] {
            new Person("Bob", 61),
            new Person("Alice", 88),
            new Person("Lily", 75),
        };
        Arrays.sort(ps);
        System.out.println(Arrays.toString(ps));
    }
}

class Person implements Comparable<Person> {
    String name;
    int score;
    Person(String name, int score) {
        this.name = name;
        this.score = score;
    }
    //实现 compareTo 方法
    public int compareTo(Person other) {
        return this.name.compareTo(other.name);
    }
    public String toString() {
        return this.name + "," + this.score;
    }
}
```

## 2.定制排序

适用情况：

- 元素类型没有实现Comparable接口，而且不方便修改代码
- 实现了接口，但是以后不想用这个比较方法，又不能影响已有的使用

1. 创建一个实现Comparator接口的实现类A
2. 类A要重写compare方法
3. 创建实现类A的实例，并传入`Arrays.sort(arr,类A的实例)`





