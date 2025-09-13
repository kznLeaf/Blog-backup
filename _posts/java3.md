---
title: Java SE-面向对象-中级
date: 2025-03-30 18:29:02
index_img:
categories: Java SE
hide: true
---

# this关键词

用`this`关键词可用来避免形参名和属性名**重名**的问题。简单来说，**哪个对象调用，`this`就指向这个对象**。

`this`还可以用来**调用构造器**（即构造方法重载）：

- 必须是构造方法的**第一行**
- 在一个构造器中最多声明一个`this(形参列表)`

```JAVA
public class This {

    private final String name;
    private int age;

    public This(){
        this("Unknown",0);//此处this调用了This()构造器
        //等价于：this.name = "Unknown";this.age=0;
        System.out.println("This is the default constructor");
    }
    
    //以下为this调用属性：
    public This(String name, int age) {
        this.name = name;
        this.age = age;
    }
    
    public  void setAge(int age) {
        this.age = age;
    }
    
    public String getInfo(){
        return "name: " + name + ", age: " + age;
    }
}
```

`Getter`和`Setter`方法的快速调用：`alt + Insert`。

# 面向对象的继承性

继承(inheritance)，关键词：`extends`，子类(subclass)继承父类(superclass)的属性和方法。

## 优势

1. 减少代码冗余，提高代码的复用性
2. 更利于功能的扩展
3. 为多态的使用创造了前提
4. 描述事物之间的所属关系，父类更为通用
5. 继承不影响父类的封装性

## 语法

```JAVA
class A{
 
}

class B extends A {

}
```

- Java中声明的类，如果没有显式的声明其父类，则默认继承于`java.lang.object`
- Java只支持单继承，不支持多继承，一个子类只能有一个父类

## protected 权限修饰符

声明为 protected 的成员可以被以下范围访问：

1. 同一个类 ✅（当然可以访问）
2. 同一个包中的其他类 ✅（包内可以访问）
3. 子类（无论是否在同一个包） ✅（继承后可以访问）
4. 不同包中的非子类 ❌（不能访问）

应用场景：

- 用于子类的继承，子类可以访问`protected`的方法和变量。

# 方法的重写

方法重写(override)指的是子类对从父类继承的方法进行重新实现，提供不同的功能。

- 必须发生在父类和子类之间
- 方法名和参数列表必须相同
- 子类的访问权限不能比父类更严格，不能重写`private`方法
- 只能重写非static方法，static方法不能被重写
- 可使用`@Override`注解
- 关于返回值类型：  
父类void，则重写必须void;  
父类基本数据类型，则子类重写必须相同数据类型；  
父类引用数据类型，则子类的返回值数据类型可以相同或是其子类  

区分方法的重载与重写：

| 特性          | 方法重写（Override）     | 方法重载（Overload）     |
|--------------|----------------------|----------------------|
| **发生范围**  | 子类和父类             | 同一个类             |
| **方法名**    | 必须相同               | 必须相同             |
| **参数列表**  | 必须相同               | 必须不同（参数个数或类型不同） |
| **返回值类型** | 必须兼容（可以是协变返回类型） | 可以不同             |
| **访问修饰符** | 不能比父类更严格       | 没有限制             |
| **关键字**    | 可以使用 `@Override`   | 不需要 `@Override`   |

- 关键词`super`可以在存在重写的情况下调用父类中的方法，或是用来区分子类和父类中同名的属性。
- 子类不会继承父类的构造器，`super(形参列表)`可以调用父类的构造器，放在构造器的**首行**。
- 子类构造器默认隐式调用父类的无参构造器，`super()`，
- 若父类为有参构造器，则子类必须也显式调用父类的有参构造器
- 子类中使用`this`调用同一类中的其他构造器，用`super`调用父类的构造器，**二者不能共存**

# 面向对象的多态性

多态性(Polymorphism)的使用前提：
1. 要有类的继承关系
2. 要有方法的**重写**

多态性适用于方法，不适用于属性。

缺陷：父类引用的子类无法调用子类特有的方法。

如果要判断某个对象是否属于某个类的实例，可以用`instanceof`关键字：`A instanceof B`，直接用于条件判断。

多态可以通过向下转型提取出子类，从而可以调用子类的方法。在向下转型之前，可以使用`instanceof`进行判断，避免出现异常。

多态的好处：减少了大量的重载的方法的定义；开闭原则

# Object类

`java.lang.Object`是类层次结构的根类，是所有其他类的父类。

![](https://i.imgur.com/aJ69aSq.png)

重点方法：`equals()` `toStriung()`   
了解方法：`clone()` `finalize()`  
其他：`getClass()` `hashCode()` `notify()` `wait()`

## equals()
 
- 自定义的类，在没有重写Object和equals()方法的情况下，调用的就是Object中声明的equals()，即比较两个引用对象的**地址**是否相同
- 对于`String` `File` `Date`和包装类等，都重写了Object中的equals()方法，用于比较两个对象的实体**内容**是否相等。
- 通常需要重写equals()，以便按照值（内容）进行比较，可用IDEA自动生成。

**IDEA自动生成的格式**：

以Customer类为例:

| Customer       |
|---------------|
| - name: String |
| - age: int     |
| - acct: Account |

```JAVA
    @Override //注解
    public boolean equals(Object o) { //声明
        if (o == null || getClass() != o.getClass()) return false;//若对象为空，或者不属于同一个类，则直接false
        Customer customer = (Customer) o;//在确定同类的情况下，向下转型
        return age == customer.age && Objects.equals(name, customer.name) && Objects.equals(acct, customer.acct);
        //如果两个对象的所有属性全部相同，则返回true
    }
```

### 区分`==`和`equals()` 

`==`：运算符

1. 适用范围：基本数据类型，引用数据类型
2. 基本数据类型：判断数据值是否相等
3. 引用数据类型：比较两个引用变量地址值是否相等

`equals()`：

1. 只能用于引用数据类型
2. 具体使用：见上

## toString()

Object类中toString的定义：

```Java
    public String toString() {
        return getClass().getName() + "@" + Integer.toHexString(hashCode());
    }
```

开发中的使用场景：

- `System.out.println()`打印的其实就是对象的`toString()`
  
子类使用说明：

- 自定义的类没有重写该方法的情况下，默认返回的是对象的地址值。
- `String` `File` `Date`等Object的子类都重写了该方法，调用时返回当前对象的实体内容。

开发使用说明：

- 习惯上，自定义的类会重写toString。

仍以Customer类为例，自动生成

```JAVA
    @Override
    public String toString() {
        return "Customer{" +
                "name='" + name + '\'' +
                ", age=" + age +
                ", acct=" + acct +
                '}';
    }
```





