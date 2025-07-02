---
title: Java SE-面向对象-高级
date: 2025-04-01 15:16:48
index_img:
categories: Java SE
---

# 关键字static

**作用**：使得类的某一个成员变量被这个类的所有实例所共享（类变量、静态变量），使得我们不需要创建对象就可以调用某个方法（类方法）。

静态变量： 

- 在内存空间中只有一份，被类的多个变量共享。
- 在JDK8之前，静态变量存储在方法区(Method Area)；JDK8及以后，由于永久代(PermGen)被移除，静态变量存储在元空间(Metaspace)。
- 在类加载时就被初始化，分配内存，只加载一次，整个程序运行期间一直存在，直到类被卸载。

| 类别       | 存储位置                  | 生命周期                      | 归属                   |
|-----------|--------------------------|------------------------------|----------------------|
| 静态变量（static 变量） | 方法区（JDK 8+ 为元空间） | 类加载时分配，类卸载时释放  | 属于类，所有对象共享  |
| 实例变量   | 堆（Heap）                 | 对象创建时分配，垃圾回收时释放 | 属于对象，每个对象都有独立副本 |
| 局部变量   | 栈（Stack）                | 方法执行时分配，方法结束后释放 | 属于方法，只能在当前方法中访问 |

类方法：

- 随着类的加载而加载
- 静态方法内可以调用静态的属性或静态的方法，不可以调用非静态的结构。
- `static`修饰的方法内不能使用`this`和`super`，因为`static`是属于**类**的，而`this`和`super`代表的是当前对象和当前对象的父类部分，他们都需要依赖于**对象**。同理，就算对象是一个空指针，也能正常调用静态的属性和方法，因为`static`不依赖于对象。

什么时候需要`static`？

- 当前的多个实例需要共享此成员变量
- 一些常量，比如PI

什么时候要用静态方法？

- 方法内要操作的变量都是静态变量时
- 工具类中的方法，比如`Arrays`，`Math`类

# 单例设计模式

单例(Singleton)设计模式，即每个类只能存在一个实例（即只能通过特定方法获取实例，不可随意创建），并提供一个全局访问点来获取该实例。

## 饿汉式(Eager)


```java
class Singleton {
    private static final Singleton instance = new Singleton(); // 提前创建实例

    private Singleton() {} // 私有构造器，防止外部创建实例

    //使用getter方法获取当前实例
    public static Singleton getInstance() {
        return instance;
    }
}
```

**特点**：

- 线程安全，在类加载时就创建实例，但是占用了一定内存，生命周期过长。
- 适用于实例创建开销小且使用频繁的场景。

## 懒汉式(Lazy)

```java
class Singleton {
    private static Singleton instance;

    private Singleton() {} // 私有构造器，防止外部创建实例

    public static Singleton getInstance() {
        if (instance == null) { // 只有在需要时才创建
            instance = new Singleton();
        }
        return instance;
    }
}
```

**特点**：

- 延迟加载，在需要使用的时候再创建
- 线程不安全，如果多个线程同时调用`getInstance()`，可能会创建多个实例。

# 类的成员：代码块

Java的代码块可以分为**普通代码块、构造代码块、静态代码块、同步代码块**。

| 代码块类型     | 关键字          | 触发时机        | 执行次数         | 作用                           |
|--------------|--------------|--------------|--------------|------------------------------|
| 普通代码块   | `{}`         | 代码运行到该块时 | 多次         | 限定变量作用域，提高可读性       |
| 构造代码块   | `{}`（类中，不在方法内） | 每次创建对象时 | 每次创建对象时执行 | 初始化对象公共属性，避免构造方法重复代码 |
| 静态代码块   | `static {}`  | 类加载时       | 只执行一次     | 初始化静态变量，执行类级别的初始化  |
| 同步代码块   | `synchronized {}` | 代码执行时     | 多次         | 线程同步，保证线程安全         |

普通代码块也可以放在类内方法外，这时用于初始化属性。执行顺序是静态代码块-普通代码块-构造器-其余方法。

代码块的加载顺序**先于**构造器，功能大差不差，初始化的操作在构造器里也可以实现。

# 类的属性赋值

![](https://i.imgur.com/0g6owHM.png)

# 关键字final

`final`可用来修饰类、方法、变量。

1. `final`修饰类；表示此类不能被继承。例如：`String` `StringBuilder`
2. `final`修饰方法：表示此方法不能被重写。例如：`getClass()`
3. `final`修饰变量：成员变量或局部变量。此时变量其实就变成了常量，一旦赋值就不可更改。

`final`修饰成员变量可以显式赋值、构造器赋值、代码块赋值。

`final`修饰局部变量：一旦赋值就不可更改。形参/方法内的局部变量。

`final`与`static`搭配：成员变量称之为**全局常量**，例如`Math.PI`

# Abstract Class

抽象类是 Java 中的一种特殊类，**不能被实例化**，通常用作**基类**，用于定义通用的行为和结构。它可以包含**抽象方法**（没有方法体的方法）和**具体方法**（有方法体的方法）。例如：

```java
abstract class Animal {
    abstract void makeSound(); // 抽象方法（无方法体）
    
    void sleep() { // 具体方法（有方法体）
        System.out.println("Sleeping...");
    }
}
```

- 使用`abstract`关键字。
- 抽象类其实是包含构造器的，因为子类对象实例化时，需要调用父类的构造器。
- 抽象类中可以没有抽象方法。
- 子类必须重写抽象类中的所有抽象方法之后才能实例化，否则子类仍然是抽象类。

**使用场景**：

- 定义统一的接口，让不同的子类提供具体的实现。抽象类中只提供通用的逻辑，至于扩展特定的功能则交给子类的重写(Implement)。

# 接口

## 概述
接口(interface)的本质是一组方法的规范。关键字：`interface`，

接口内部的说明：

- 属性：不能包含实例变量，但可以有用`public static final`修饰（默认自带）。例如：

```java
public interface Animal{
    void eat();
    void sleep();
    int MAX_AGE = 100;  // 等价于 public static final int MAX_AGE = 100;
}
```

- 方法：声明抽象方法，修饰为`public abstract`（可以省略，默认自带）。
- **不能有构造器**（接口**不能被实例化**）。

**接口与类的关系**：使用`implements`关键字让一个类实现接口：

```java
public class Dog implements Animal {
    @Override
    public void eat() {
        System.out.println("Dog is eating...");
    }

    @Override
    public void sleep() {
        System.out.println("Dog is sleeping...");
    }
}
```

**规则**：

1. 类必须实现接口中的**所有**方法，否则必须将类定义为`abstract`。
2. 一个类可以实现**多个接口**（不像继承，Java只能单继承）。
3. 类可以同时继承和实现：`class A extends SuperA implements B,C{}`

接口与接口可以多继承，类只能单继承。

## 接口的多态性

`接口名 变量名 = new 实现类` 非常常用

```java
public class test {
    public static void main(String[] args) {
        Animal a = new Dog();//多态
        a.eat();
        a.sleep();
    }
}
```

**区分抽象类和接口**：

- 共性：都可以声明抽象方法，都不能实例化
- 不同：抽象类一定有构造器，接口没有构造器；
  
接口中声明的静态方法（java8引入）只能被接口调用，不能被其实现类调用。

从java8开始，接口可以有`default`方法，允许提供默认实现。默认方法可以被实现类继承，可以被实现类重写，不过在多实现时要注意重名问题（接口冲突），接口冲突时必须重写该方法。

java9允许接口定义**私有方法**，只在内部使用。

# 类的成员：内部类

## 概述

**内部类(inner Class)**：某个类A的内部还有一个部分需要一个完整的结构B来描述，B只为A服务，不在其他地方使用。A称为外部类，B称为内部类。

举例：`Thread`类内部的`State`类，表示线程的生命周期。

## 分类

### 1.成员内部类(Member Inner Class)

- 直接声明在外部类的里面，和成员变量一个位置。
  - 使用static修饰的：静态成员内部类
  - 不使用static修饰的：非静态的成员内部类

- 从类的角度看：
  - 内部可以声明类应有的结构
  - 此内部类可以声明父类，实现接口
  - 可以使用final修饰
  - 也可以使用abstract

- 从外部类的成员的角度：
  - 内部可以调用外部的结构
  - 可以使用4种权限修饰符
  - 可以使用static


### 2.局部内部类(Local Inner Class)

- 声明在方法内部内、构造器内或代码块内的内部类
  - 匿名的成员内部类
  - 非匿名的成员内部类

<mark>匿名内部类的创建</mark> 

例：

```java
public class ObjectTest {
    public static void main(String[] args) {

        new Object(){//创建一个继承于Object的匿名子类
            public void test() {
                System.out.println("test");
            }
        }.test();

    }
}
```

以上代码可以无错误无警告地运行。

# 枚举类

## 概述

枚举属于**引用数据类型**，关键词：`enum`，枚举里面定义的是已经生成且固定下来的对象，实际上枚举中的每一个枚举值都是一个`public static final`实例。

> 当我们使用“enum”定义枚举类型时，实质上我们定义出来的类型继承自java.lang.Enum类型，而枚举的成员其实就是我们定义的枚举类型的一个实例（Instance），他们都被预设为final，所以我们无法改变他们，他们也是static成员，所以我们可以通过类型名称直接使用他们，当然最重要的，他们都是公开的（public）。

## enum的比较

一般来说引用数据类型的中比较要使用`.equals()`，但是`enum`类型是例外，也可以使用`==`，这是因为每个枚举类型的常量在JVM中只有唯一的一个实例，所以两种比较方法都完全正确。

## enum类型

`enum`定义的类型与一般的`class`没有任何区别，`enum`就是`class`。有以下特点：

- `enum`继承自`java.lang.Enum`，**不可以显式地定义其父类**，而且无法被继承；
- 无法使用`new`创建新的枚举，因为枚举类型在编译时就已经固定下来。

使用`enum`关键词创建的枚举类

```java
public enum Color {
    RED, GREEN, BLUE;
}
```

与下面这种写法基本等价：

```java
public final class Color extends Enum { // 继承自Enum，标记为final class
    // 每个实例均为全局唯一:
    public static final Color RED = new Color();
    public static final Color GREEN = new Color();
    public static final Color BLUE = new Color();
    // private构造方法，确保外部无法调用new操作符:
    private Color() {}
}
```

显然每一个枚举的值都是`enum`类的一个实例。既然是实例，就应当可以调用方法；实际上`Enum.java`中已经提供了一些用于枚举值的方法。

## enum的常用方法

`name()`:返回常量名，定义：

```java
    public final String name() {
        return name;
    }
```

`ordinal()`:返回定义的常量的定义的顺序（整型），从0开始计数。

`values()`:数组变量，储存枚举类所有对象的信息。

## 枚举类实现接口的操作

1. 枚举类实现接口，在枚举类中实现所需方法，通过枚举类的对象调用的是**同一个**方法（与普通类一样）
2. 让每一个枚举类的对象**分别**重写方法，匿名的内部类。

# 注解(Annotation)

常见的Java内置注解：

`@override`用于检查重写方法是否写对。

`@Deprecated`表示某个类或方法已经**不推荐使用**，调用时会有警告提示。调用被它标记的类或方法时会出现删除线。

`@SuppressWarnings`告诉编译器**忽略特定类型的警告**。

框架 = 注解 + 反射 + 设计模式

元注解：注解的注解

# 包装类

包装类是为每种基本数据类型提供的一个形式封装，让基本数据类型可以像引用数据类型一样使用。

| 基本类型 | 包装类     |
|----------|------------|
| int      | Integer    |
| double   | Double     |
| char     | Character  |
| boolean  | Boolean    |
| byte     | Byte       |
| short    | Short      |
| long     | Long       |
| float    | Float      |

包装类和对应的基本数据类型的内存地址也不一样：

![](https://i.imgur.com/DIlCOZj.png)

`xxx.valueOf(...)`**手动**将基本数据类型转化为引用数据类型，返回一个引用数据类型的新实例。

- 已经创建的包装类的值可以修改吗？
**不可以**，例如`Interger`是不可变对象，一旦被创建，值不可修改。

- **装箱**：Boxing，将一个基本数据类型转换为对应的包装类对象。
```java
int a = 10;
Integer b = Integer.valueOf(a);  // 手动装箱
```

- **自动装箱**：Autoboxing，Java5引入，直接把基本类型赋给包装类变量，Java编译器会自动帮你调用装箱的方法。
```java
int a = 10;
Integer b = a;  // 自动装箱：相当于 Integer.valueOf(a)
```

# String数据类型转换

## 基本数据类型、包装类——>String

1. 直接调用`String xxx = String.valueOf(...);`
2. 也可以`String = xxx + "";`

## String——>基本数据类型、包装类

调用包装类的静态方法`pasrsexxx`

```java
    String s = "123";
    int i = Integer.parseInt(s);
```

# 常量池机制

例如：自动装箱使用的`valueOf()`方法有缓存机制，`Integer`缓存-128~127，超出这个范围才会新建对象。

Java 中的“常量池(Constant Pool)”是一种**优化内存使用和执行效率的机制**。它的本质是一个用于存放常量（字面量、符号引用等）的特殊内存区域，目的是为了重用相同的值，避免重复创建对象。

# IDEA常用快捷键

| 功能说明                                       | 快捷键                     |
|------------------------------------------------|----------------------------|
| 智能提示 - *edit*                              | `Alt + Enter`              |
| 提示代码模板 - *insert live template*          | `Ctrl + J`                 |
| 使用 xx 块环绕 - *surround with...*           | `Ctrl + Alt + T`           |
| 调出生成 getter/setter/构造器等结构            | `Alt + Insert`             |
| 自动生成返回值变量 - *introduce variable*     | `Ctrl + Alt + V`           |
| 复制指定行的代码 - *duplicate line*           | `Ctrl + D`                 |
| 删除指定行的代码 - *delete line*              | `Ctrl + Y`                 |
| 切换到下一行代码空位 - *start new line*       | `Shift + Enter`            |
| 切换到上一行代码空位 - *start new line before current* | `Ctrl + Alt + Enter` |
| 向上移动代码 - *move statement up*            | `Ctrl + Shift + ↑`         |
| 向下移动代码 - *move statement down*          | `Ctrl + Shift + ↓`         |
| 向上移动行 - *move line up*                   | `Alt + Shift + ↑`          |
| 向下移动行 - *move line down*                 | `Alt + Shift + ↓`          |
| 查看方法参数提示 - *parameter info*          | `Ctrl + P`                 |
| 重写父类的方法          | `Ctrl + O`                 |
| 实现接口的方法          | `Ctrl + I`                 |
| 查看继承树          | `Ctrl + H`                 |
| 类的UML关系图          | `Ctrl + Alt + U`                 |
| 定位某行、列          | `Ctrl + G`                 |
| 搜索          | `Ctrl + F`                 |
| 查找替换          | `Ctrl + R`                 |
| 全项目搜索文本          | `Ctrl + Shift + F`                 |

