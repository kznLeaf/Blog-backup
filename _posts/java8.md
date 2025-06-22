---
title: Java SE(8)-泛型
date: 2025-04-12 14:29:26
index_img:
categories: Java SE
---

修改历史：

2025/4/12 初次发布

2025/4/22 补充静态泛型方法，完善了通配符部分的内容

# 概述

**泛型**（Generics）是Java提供的一种机制，**让类、接口、方法在定义时可以指定类型参数**，从而实现类型安全和代码复用。

`HashMap<String,Integer> map = new HashMap<>();`

`ArrayList<String> strList = new ArrayList<>();`

`ArrayList<Person> personList = new ArrayList<>();`

都是使用泛型的例子。

# 静态泛型方法

静态方法的泛型和普通方法的泛型的写法不同：

```java
//定义一个泛型类，表示一对相同类型的值
public class Pair<T> {
    private T first;
    private T last;
    //构造器，传入两个相同类型的值
    public Pair(T first, T last) {
        this.first = first;
        this.last = last;
    }
    //getter and setter
    public T getFirst() { ... }
    public T getLast() { ... }

    // 静态泛型方法应该使用其他类型区分:K不同于T
    public static <K> Pair<K> create(K first, K last) {
        return new Pair<K>(first, last);
    }
}
```

注意这里的泛型方法用得泛型参数是`K`，这是因为**泛型类型参数 T 是在类实例化时才确定的，而静态方法属于类本身，不依赖于实例化，所以它无法访问实例相关的泛型类型**。因此需要另外设一个泛型参数`K`，可以把这个`K`看成是静态方法自己专用的类型参数，和类的`T`没有任何关系，只是刚好做的事相似而已。

而且，可以注意到静态方法的泛型参数`K`在声明中出现了两次，这是因为普通方法的`T`在类的声明中已经出现过，编译器知道它是什么；但是静态方法使用的`K`**从未出现**，所以需要事先声明。第二次出现的`K`就是正常的使用了。

静态泛型方法的这种写法在普通方法中也可能出现，比如下边这个：

![](https://s21.ax1x.com/2025/04/21/pE5lfxI.png)

这句方法声明是 Java Stream API 中的`map`方法，用于将一个流中的每个元素「映射」成另一个类型，返回一个新的流。

因为这里出现**另一个类型**，为了表示这个类型，需要预先声明`<R>`才行。

所以说在方法名前面出现的泛型参数的作用其实就是**声明新参数**，需要新参数了就写一下，防止后面调用的时候编译器不认识它报错，这在普通方法和静态方法中是一致的。

# 擦拭法(Type Erasure)

见https://liaoxuefeng.com/books/java/generics/type-erasure/index.html

>所谓擦拭法是指，虚拟机对泛型其实一无所知，所有的工作都是编译器做的。编译器内部永远把所有类型 T 视为 Object 处理，但是，在需要转型的时候，编译器会根据 T 的类型自动为我们实行**安全地强制转型**。

在不使用泛型的时候，一般使用`instanceOf` + 强制转型来处理不同传入参数的情况，泛型使用的其实还是这个逻辑，只不过包装了一下方便用户编写代码。

# 通配符

## 概述

**Java 泛型的类型是严格的类型检查**，并不允许不同类型的泛型直接相互赋值。例如，`ArrayList<Object>`和`ArrayList<String>`是两种完全不同的泛型类型，即使String是Object的子类。

解决方法：

1. 使用通配符(Wildcard):

```java
    //使用通配符?，表示可以接受任何类型
    List<?> list = null;
    //创建一个泛型string的list1
    List<String> list1 = new ArrayList<>();

    //将list1传给list
    list1.add("AA");
    list = list1;

    //这时list成功获取了list1中的元素
    Object obj = list.get(0);//读取使用Object
    System.out.println(obj);

    //但是list不能写入数据（因为不能确定到底该放哪个类型），除了null
    list.add(null);
```

**上界通配符**(Upper Bounds Wildcards)：`List<? extends T> list`，list是某种`T`的子类的列表。这样传入的参数可以是T或者T的子类。**可以读，不能写**，因为编译器不知道list是哪个子类。**读取安全但是写入不安全**

**下界通配符**：`List<? super T> list`，list是`T`的某个父类的列表。方法参数接受所有泛型类型为T及其父类的类型。读出只能被视为为Object（因为不知道具体是哪个父类），可以写入T或其子类。写入安全但是读取受限

总之：

- `<? extends T>`允许调用读方法`T get()`获取`T`的引用，但不允许调用写方法`set(T)`传入`T`的引用（传入`null`除外）；
- `<? super T>`允许调用写方法`set(T)`传入`T`的引用，但不允许调用读方法`T get()`获取`T`的引用（获取`Object`除外）。

作为另一个例子，看看`Collections`工具类中的`copy`方法是怎么定义的：

```java
public static <T> void copy(List<? super T> dest, List<? extends T> src)
```

这个方法的作用是把src列表的元素复制到dest列表中。

可以看到，源列表的泛型是上界通配符，因为我们要获取源列表的每一个元素，使用上界通配符的话源列表的每一个元素都不可能比`T`的等级“高”，可以安全地利用向上转型原则通过`T`来get它们。

与之相反，dest目标列表使用的是super，因为我们要对目标列表进行写入操作，使用super可以保证目标列表中的每一个元素都不会比`T`等级低，这样只要set一个`T`类型的元素就可以保证成功向上转型。

## PECS原则

**Producer Extends Consumer Super**

生产者（源）用`extends`，消费者（目标）用`super`，就是上边说过的东西

## 无限定通配符

**Unbounded Wildcard Type**

`<?>`

既没有extends，也没有super，也就是说既不能读也不能写，可以用于逻辑判断。

`<?>`是等级最高的存在，可以保证顺利向上转型，比如

```java
@Test
public void test4() {
    Pair<Integer> p = new Pair<>(123, 456);
    Pair<?> p2 = p; // 安全地向上转型
    System.out.println(p2.getFirst() + ", " + p2.getLast());
}
```




