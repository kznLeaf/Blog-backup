---
title: Java SE(2) 面向对象-基础
date: 2025-03-28 13:41:15
index_img:
categories: Java SE
hide: true
---



# 面向对象的基本概念

类（class）和对象（object）是面向对象的核心概念。

**类**：具有相同特征的一大类事物

**对象**：实际存在的该类事物的每个个体，也被称为实例（instance）。

面向对象内容的三大主线：

- Java类及类的成员：属性，方法，构造器；代码块、内部类。
- 面向对象的特征：封装、继承、多态、（抽象）
- 其他关键词的使用：this,super,package,import,static,final,interface,abstract等

类，是一组相关**属性**和**行为**的集合，属性(field)即成员变量，行为即方法(method)。

# 内存结构

- 栈（stack）：方法内定义的变量，储存在栈中
- 堆（heap）：new创建的结构

例如：

创建单个对象：

![](https://i.imgur.com/Q9v6R16.png)

创建多个对象：

![](https://i.imgur.com/IdTtXZe.png)

# 类的成员：属性

Field:字段/域/成员变量

>Java 中，一个类包含的变量被称为字段（Field）或成员变量。当这些变量通过 getter/setter 方法暴露时，我们称其为“属性”（Property）。

实例变量：类的对象拥有的变量，每个对象都有自己的一份。

**变量的分类**：  

按照数据类型来分：基本数据类型、引用数据类型

按照声明的位置来分：

- 在方法体外，类体内声明的变量为**成员变量**
- 在方法体内部等位置声明的变量为**局部变量**

![](https://i.imgur.com/xx6LrzF.png)

成员变量和局部变量在内存中分配的位置不同：

- 成员变量（属性）存储在堆空间
- 局部变量存储在栈空间

**生命周期**：

- 属性在对象创建时分配，销毁时释放。
- 局部变量随着方法对应的栈帧入栈，出栈而消亡。

**是否有默认值**：属性都有默认值，局部变量都没有默认值，必须先赋值再调用。

声明变量时，`static`关键字用**于静态变量**，访问时不需要创建对象，所有对象访问的是同一个变量，例如：

```JAVA

class Example {//声明
    static int num = 10; // 静态变量
}

public class Main {
    public static void main(String[] args) {
        Example.num = 20; // 直接用类名访问
        Example obj1 = new Example();
        Example obj2 = new Example();
        System.out.println(obj1.num); // 20
        System.out.println(obj2.num); // 20（所有对象访问的是同一个变量）
    }
}
```

静态变量在程序运行期间一直存在，类加载时分配，程序结束时释放。

# 类的成员：方法

作用：类似C语言的函数，简化代码。

Java的方法**不能独立存在**，必须定义在类里。  


## 1.声明的格式

```
权限修饰符 [其他修饰符] 返回值类型 方法名(形参列表) [throws 异常类型] { //方法头
    //方法体
}
```

> **权限修饰符**：private \ 缺省 \ protected \ public 

> 形参列表的格式：(类型1 形参1,类型2 形参2, ...)

## 2.对象调用方法时的内存分配情况

在 Java 中，当对象调用方法时，内存主要分为三个区域：

1. 堆（Heap） - 存放对象实例和实例变量。
2. 栈（Stack） - 存放方法调用时的局部变量、方法执行环境（方法帧）。
3. 方法区（Method Area） - 存放类的字节码信息、静态变量、方法元信息。

```java
class Person {
    String name; // 实例变量（存放在堆内存）
    
    // 构造方法
    public Person(String name) {
        this.name = name;
    }
    
    // 实例方法
    public void sayHello() {
        String greeting = "Hello, " + name; // 局部变量（存放在栈内存）
        System.out.println(greeting);
    }
}

/***************************************************/

public class Main {
    public static void main(String[] args) {
        Person p1 = new Person("Alice"); // 创建对象，存入堆
        p1.sayHello(); // 调用方法
    }
}
/*
* 方法调用遵循“先入后出”的栈规则
* main入栈-sayHello入栈-sayHello出栈-main出栈-程序结束，JVM退出
*/


```

**总结**：

1. 对象 (`Person`) 创建在堆内存，实例变量 (`name`) 也存放在堆。
2. 方法调用时，会创建**栈帧**，局部变量存入栈内存，方法执行完后自动释放。
3. 类的字节码信息存储在方法区，所有对象共享。
4. `p1` 变量存放在栈内存，指向堆中的 `Person` 对象。

# 对象数组

当数组的元素是引用类型的类(class)时，称之为对象数组。

创建方式：

```java
类名[] 数组名 = new 类名[数组大小];
```

# 方法的应用


## 1.方法的重载

方法重载（Method Overloading）指的是在**同一个类**中，**多个方法的名字相同，但参数列表不同**（参数的类型、个数或顺序不同）。

方法的重载与形参名、权限修饰符、返回值的类型都没有关系。

编译器如何确定调用的是哪一个具体的方法？：先通过方法名，再通过形参列表。

坑：

```JAVA
        char[] arr = new char[]{'a','b','c','d','e','f'};
        System.out.println(arr);
```

打印出来的结果是`abcdef`，而不是地址值。

## 2.可变个数形参的方法

在 Java 中，**可变参数**（Varargs，Variable Arguments）允许一个方法接受**可变数量的参数**，使代码更加灵活。

**语法**

```JAVA
返回值类型 方法名(数据类型... 变量名) {
    // 方法体
}
```

1. 可变参数在方法内部被当作**数组**处理，如`int... numbers`实际上等价于`int[] numbers`。
2. 可变参数必须是方法的最后一个参数。
3. 一个方法只能有一个可变参数。

**举例**

```JAVA
public class Varargs2 {
    public static void main(String[] args) {
        overload2 test = new overload2();
        String info = test.concat("=","new","world");
        System.out.println(info);
    }
}

class overload2 {

    public String concat(String operator,String ... strs){

        StringBuilder result = new StringBuilder(); //拼接字符串时使用 StringBuilder可以避免频繁创建新的对象，性能更好
        for (int i = 0; i < strs.length; i++) {
            if (i==0){
                result.append(strs[i]);
            } else {
                result.append(operator).append(strs[i]);
            }
        }
        return result.toString();

    }
}
```

## 3.方法的值传递机制

Java中方法的参数传递机制是**按值传递(pass by value)**

方法体内声明的变量为局部变量，存储在栈空间。

- 对于基本数据类型的变量来说，传递的是此变量保存的数据值。
- 对于引用型数据变量来说，传递的是此变量保存的地址值。

```JAVA
/**
 * Description:
 * 方法的值传递机制
 * @author ep19
 * @version 1.0
 * @since 2025/3/29 15:45
 */
public class PassByValue {
    public static void main(String[] args) {

        method test = new method();
        int num = 10;
        test.change(num);
        System.out.println("num = " + num);

    }
}

class method {

        void change (int m) {
        m ++;
        System.out.println("m: " + m);
    }
}
```

结果：
```JAVA
m: 11
num = 10
```

图例：

![](https://i.imgur.com/upVuJnq.png)



## 4.递归方法

**递归(Recursion)**是指 **一个方法在其内部调用自己**，直到满足某个终止条件（基准条件），否则会无限递归，导致`StackOverflowError`。

递归示例：计算阶乘

```JAVA
public class compute{
    /**
     * 计算一个数的阶乘（递归）
     * @param n 输入一个整数
     * @return 返回输入值的阶乘结果
     */
    int factorial (int n) {

        if(n == 0){ //终止条件
            return 1;
        } else {
            return n * factorial(n-1);
        }

    }
}
```

**注意**：递归的内存耗用较多，占用大量的系统堆栈，需要**慎用**，高性能情况下尽量避免使用递归，不如循环迭代。

# package和import

用于**定义类的所属包**，必须写在**Java文件的第一行**（除了注释）。

- package命名全部小写
- 通常使用公司域名的倒置

例：**MVC(Model-Vie-Controller)**软件架构模式：

| 组件          | 作用                            | 示例（以 Java Web 应用为例）            |
|--------------|--------------------------------|--------------------------------|
| **Model（模型）** | 处理 **数据和业务逻辑**，与数据库交互 | Java Bean、DAO（数据访问对象） |
| **View（视图）**  | 负责 **用户界面**，展示数据       | HTML、JSP、Thymeleaf、前端框架（Vue、React） |
| **Controller（控制器）** | 负责 **接收用户请求**，调用 Model 处理数据，并返回 View | Servlet、Spring Controller |

- `import`用于引入其他包中的类，以便可以直接使用类名，而不必写完整路径。
- 在同一个包中的类不需要导入。
- 如果使用不同的包下的同名的类，需要使用类的全名的方式指明是哪个类例如：
- 
```JAVA
java.util.Date date = new Date();
java.sql.date1 date1 = new java.sql.Date(121212L);
```

# 面向对象的封装性

面向对象编程(OOP)的三大特性：**封装、继承、多态**。

## 含义

**封装(Encapsulation)**，指的是**将对象的状态（属性）和行为（方法）封装在一起，并隐藏对象的内部实现细节**，只向外界暴露必要的接口，以提高代码的**安全性**和**可维护性**。

`高内聚、低耦合`

## 数据封装的方法

**权限修饰符**：`private`、`default`、`protected`、`public`，这体现了Java的封装性。我们可以用4种权限修饰符来修饰类和类的内部成员

**作用**：体现被调用时的可见性的大小。声明为`private`的变量只能通过暴露的方法间接访问(赋值或取值)。例如：

```JAVA
    public int getnum(){
        return num;
    }
```

**四种权限修饰符的总结**(按照可见性从小到大)：

| 访问修饰符   | 同包访问 | 跨包访问 | 子类访问 | 适用场景 |
|------------|------------|------------|------------|------------|
| `private` | ❌ 不能访问 | ❌ 不能访问 | ❌ 不能访问 | 适用于 **完全封装**，只能内部访问 |
| `default`（无修饰符） | ✅ 可以访问 | ❌ 无法访问 | ❌ 不能访问 | 适用于 **包内使用** |
| `protected` | ✅ 可以访问 | ❌ 无法访问 | ✅ 继承后可访问 | 适用于 **子类继承但不暴露给外部** |
| `public` | ✅ 可以访问 | ✅ 可以访问 | ✅ 可以访问 | 适用于 **完全公开** |

**封装性的体现**：

 1. 私有化类的属性，提供公共的get和set方法，对此属性进行获取或修改。
 2. 将类中不需要对外暴露的方法设置为private。
 3. 单例模式中构造器为private，避免在类的外部创建实例。

# 类的成员：构造器

构造器（Constructor）是**用于创建对象**的特殊方法，它在创建对象时会自动调用，一般用于**初始化对象的属性**。

构造器的声明格式：

```JAVA
权限修饰符 类名(形参列表){

}
```

创建类以后，在没有显式声明构造器的情况下，系统会默认提供一个构造器。且权限修饰符与类相同。

构造器可以重载。

---

**问1：main方法的public权限修饰符能不能换成private？**

- `main`方法是 Java 程序的入口点，Java 虚拟机（JVM）在执行程序时会调用`main`方法。如果`main`方法是`private`，JVM 就无法访问它，导致程序启动失败。
- 同理，也不能是`protected`或缺省，否则JVM无法调用。

**问2：为什么main方法必须是static?**

- `main`方法是程序的入口，JVM 在启动程序时不会自动创建类的对象，而是直接调用`main`方法。如果`main`不是`static`，那么JVM需要创建该类的对象，但没有默认构造方法可调用，因此会报错。