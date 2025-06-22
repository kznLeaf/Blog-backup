---
title: Java SE-Stream API详解 by AlbertShen
date: 2025-04-18 18:08:36
index_img:
categories: Java SE
---

参考：[Java中的流、并行流](https://www.bilibili.com/video/BV1Vi421C73n/?spm_id_from=333.1387.list.card_archive.click&vd_source=918a6909c997fbaf818d1fbc55d65ca9)

本博文为视频内容的简单梳理。

# 目录

# 引入

已知一个列表

```java
List<Person> people = List.of(
        new Person("Neo", 1, "USA"),
        new Person("Blu", 12, "China"),
        new Person("Alex", 29, "Germany"),
        new Person("Bob", 25, "Germany"),
        new Person("Kurumi", 18, "Japan")
);
```

检查所有人的信息，找出年龄大于18岁的人。

**命令式编程**，使用for循环依次检查每一个人的信息，将年龄超过十八岁的人添加到新的名单中，

```java
    @Test
    public void test() {
        List<Person> people = List.of(
                new Person("Neo", 1, "USA"),
                new Person("Blu", 12, "China"),
                new Person("Alex", 29, "Germany"),
                new Person("Bob", 25, "Germany"),
                new Person("Kurumi", 18, "Japan")
        );
        //创建新的列表用来存放结果
        List<Person> adults = new ArrayList<>();
        for(Person p : people) {
            if(p.getAge() > 18) {
                adults.add(p);
            }
        }
        System.out.println(adults);
    }
```

使用**Stream API**可以实现相同的功能：

```java
    @Test
    public void test2() {
        List<Person> people = List.of(
                new Person("Neo", 1, "USA"),
                new Person("Blu", 12, "China"),
                new Person("Alex", 29, "Germany"),
                new Person("Bob", 25, "Germany"),
                new Person("Kurumi", 18, "Japan")
        );
        List<Person> adults = people.stream()
                .filter(person -> person.getAge() > 18)
                .toList();//或者.collect(Collectors.toList());
        System.out.println(adults);

    }
```
代码更加简洁。

Stream本身并不是数据结构，不会处理数据或改变数据源，它仅定义处理方式。不仅能够支持顺序处理，还能进行并行处理。

**Java的Stream只能使用一次**，一旦你调用了终结操作（比如 .forEach()、.collect() 等），这个流就被“消费掉”了，不能再用。

**三个步骤**：

- **创建流** Stream Creation
- **中间操作** Intermediate Operations
  - 中间操作是惰性执行的，只有遇到终端操作才会实际执行。
- **终端操作** Terminal Operations
  - 整个流的实际处理部分，他会触发之前所有定义中的中间操作，生成最终结果。
  
![](https://i.imgur.com/Pxty23E.png)

下面从这三个方面进行分析。


# 创建流





对于任何实现了`Collection`接口的集合，可以通过`stream()`方法直接创建流：

```java
    String[] array = {"a","b","c","d","e","f"};
    Stream<String> stream = Arrays.stream(array);
    
    stream.forEach(System.out::println);

    List<String> list = List.of("a", "b", "c");
    Stream<String> myStream = list.stream();
    myStream.forEach(System.out::println);

    //更直接的方法
    Stream<String> stream1 = Stream.of("a","b","c");
```

---

采用上述方法创建的stream对象自诞生之初就是写死的，无法修改。想要**动态创建流**，需要使用`Stream.Builder`:

```java
    //创建对象
    Stream.Builder<String> builder = Stream.builder();
    //添加元素
    //添加后无法删除
    builder.add("a");
    builder.add("b");
    //也可根据条件动态添加
    if(Math.random()<0.5){
        builder.add("c");
    }
    //通过build方法来创建stream对象
    Stream<String> stream = builder.build();
    //一旦调用了build就不能再添加元素，否则执行时报错
    stream.forEach(System.out::println);
```

---

使用Stream也可**从文件创建流**。

```java
    @Test
    public void test3() {
        Path path = Paths.get("D:\\develop\\code\\Practice\\chapter0\\hello_copy.txt");
        try(Stream<String> lines = Files.lines(path)){
            lines.forEach(System.out::println);//输出到控制台
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
```

其中：

- `Files.lines(path, StandardCharsets.UTF_8)`返回一个惰性读取的 Stream，可以逐行读取文本文件内容。
- `try-with-resources`保证资源及时关闭

---

StreamAPI也提供了`IntStream`等类用来方便地创建**基本数据类型的流**。

```java
IntStream intStream = IntStream.range(1,6);
IntStream intStream = IntStream.of(1,2);
//通过boxed可以把基本数据类型的流转换为对象流：
Stream<Integer> integerStream = intStream.boxed();
```

---

Stream.iterate可生成**无限流**（通常用limit限制生成的个数）：

**语法**：

```java
public static<T> Stream<T> iterate(final T seed, final UnaryOperator<T> f)
```

- `seed`:初始值
- `f`：作用于初始值的函数
- 返回值：一个新的Stream类型的序列

增强型：`public static<T> Stream<T> iterate(T seed, Predicate<? super T> hasNext, UnaryOperator<T> next) `，其中`hasNext`是终止条件

```java
 //生成一个等差数列
    Stream.iterate(0, i -> i + 1).limit(5).forEach(System.out::println);
```

---

**并行流**：把数据分成多个部分，并“同时”用多个线程来处理，从而加快处理速度。

- 对于集合，调用`list.parallelStraem()`可以直接得到一个并行流。例如`List.of("a", "b", "c", "d", "e", "f").parallelStream().forEach(System.out::println);`，输出是**乱序**的
- 对于已有的Stream，可以调用`.parallel()`得到并行流

```java
    @Test
    public void test5() {
        Stream<Integer> iterateStream = Stream.iterate(0, n -> n + 1).limit(5);
        iterateStream.parallel();
        iterateStream.forEach(System.out::println);
        //这时的打印顺序也是乱的，因为forEach是并发的。
        //forEachOrdered可以保证顺序。
    }
```

# 中间操作

中间操作用于对流中的元素进行处理，如筛选、排序等等。根据操作的性质可以分为以下几个类别：

- **筛选和切片**(Filtering and Slicing):过滤或缩减流中的元素的数量
- **映射**(Mapping):转换流中的元素或提取元素的特定属性
- **排序**(Sorting)

![中间操作图解](https://i.imgur.com/naZpiDN.png)

## 筛选和切片

例如开头处提到的

```java
List<Person> adults = people.stream()
        .filter(myperson -> myperson.getAge() > 18)
        .toList();//或者.collect(Collectors.toList());
```

**过滤器定义**:

`Stream<T> filter(Predicate<? super T> predicate);`

Predicate即**判断条件函数**，用lambda写出，返回布尔值。意思是:*给我一个叫 myperson 的参数，判断这个人年龄是否大于 18，返回一个 true/false 结果*。`myperson`的类型由前文自动推断出，所以省略。

这里等价于用更简洁的形式实现了`Predicate`接口的抽象方法`boolean test(T t);`

```java
Predicate<Person> predicate = new Predicate<Person>() {
    @Override
    public boolean test(Person person) {
        return person.getAge() > 18;
    }
};
```

---

可以用`.distinct()`为流中的元素**去重**，底层通过维护一个HashSet实现。

```java
    @Test
    public void test3() {
        //
        Stream.of("Origami", "Kurumi", "Kurumi", "Kurumi", "Kurumi", "Kurumi", "Kurumi", "Kurumi")
                .distinct()
                .forEach(System.out::println);
    }
```

如果是自定义的类的对象，需要确保正确地重写了`equals()``HashCode`方法，因为HashSet就是通过这两个方法判断元素是否相等。

---

Stream类中定义的`Stream<T> limit(long maxSize);`方法返回由此流的元素组成的截断长度不超过maxSize的流。

同样，`Stream<T> skip(long n);`跳过前n个元素。

limit和skip在有序的并行流中使用时可能会使性能变差，此时可以用 `.unordered()` 提高效率；如果顺序必须保留，那最好使用顺序流 `.sequential()`。

```java
    @Test
    public void test4() {
        Stream<Integer> s1 = Stream.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
        s1.limit(5).forEach(System.out::print);

        Stream<Integer> s2 = Stream.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
        s2.skip(5).forEach(System.out::print);
        //打印结果：12345678910
    }
```

## 映射

映射本质上是一个数据转换的过程

**定义**

```java
<R> Stream<R> map(Function<? super T, ? extends R> mapper);
```

`T`是Stream中元素的类型，`R`新的流的元素类型

map能够通过提供的函数`Function`将流中的每个元素转换成新的元素，最后生成一个新元素构成的流。

map接受的是一个**函数式接口**。

![利用映射层层提取数据的过程](https://i.imgur.com/Yk5xhTe.png)


示例：利用映射获得Person列表中所有人的name

```java
    @Test
    public void test6() {
        List<Person> people = List.of(
                new Person("Neo", 1, "USA"),
                new Person("Blu", 12, "China"),
                new Person("Alex", 29, "Germany"),
                new Person("Bob", 25, "Germany"),
                new Person("Kurumi", 18, "Japan"),
                new Person("Kurumi", 18, "Japan")
        );

        Stream<Person> peopleStream = people.stream();
        //peopleStream.map(myperson -> myperson.getName()).forEach(System.out::println);
        //方法引用的格式：类名或对象名::方法名
        peopleStream.map(Person::getName).forEach(System.out::println);
    }
```

打印结果：

```text
Neo
Blu
Alex
Bob
Kurumi
Kurumi
```

---

`map`结构适用于**单层结构**的流，进行元素**一对一**的转换。

对于嵌套的集合，数组等等，适合使用`flatMap`。

![](https://i.imgur.com/sq8UWmE.png)

**定义**：`Stream.java`中

```java
<R> Stream<R> flatMap(Function<? super T, ? extends Stream<? extends R>> mapper);
```

示例：将嵌套List转换成的流扁平化为单层流打印出来

```java
    @Test
    public void test7() {
        List<List<Person>> peopleGroups = List.of(
                List.of(
                        new Person("neo", 45, "USA"),
                        new Person("Stan", 10, "USA")
                ),
                List.of(
                        new Person("Grace", 16, "UK"),
                        new Person("Alex", 17, "UK")
                ),
                List.of(
                        new Person("Sebastian", 40, "FR")
                )
        );

        Stream<List<Person>> peopleGroupStream = peopleGroups.stream();
        //转换成单层流  扁平化  单一化
        Stream<Person> personStream = peopleGroupStream.flatMap(people -> people.stream());
        personStream.forEach(System.out::println);
    }
```

流操作返回的是一个新的流，原始流在第一次操作后就会被标记为已操作，不能再次进行操作。实际应用中通常会采用**链式操作**:

![](https://i.imgur.com/lZ0Yc3R.png)

嵌套流 -> 单层流 -> 提取name属性 -> 打印

---

`mapToInt`可以将对象流转换为基础类型的流`IntStream`。

---

## 排序

当流中的元素类型实现了`Comparable`接口时（自然排序），可直接调用`sorted()`。

定制排序：

```java
    @Test
    public void test10() {
        Stream.of("blueberry", "greenberry", "redberry", "pear", "apple", "orange")
                .sorted(Comparator.comparingInt(String::length).reversed())
                .forEach(System.out::println);
                //年龄降序
    }
```

关于`Comparator.comparingInt(String::length).reversed()`:

- `comparingInt`是Comparator的一个方法
- 相当于`Comparator.comparingInt(p -> p.getAge())`，将Age作为排序的标准
- `comparingInt`和`reversed()`并列定义，但是前者返回的仍然是一个`Comparator<T>`对象，后者是一个Comparator的默认方法，只要是`Comparator<T>`的对象就可以调用它。

---

中间操作只是定义了操作的规则，并不会立即执行，常常用变量保存和传递。

综合练习：

```java
    @Test
    public void test1() {
        List<List<Person>> peopleGroups = List.of(
                List.of(
                        new Person("neo", 45, "USA"),
                        new Person("Stan", 10, "USA")
                ),
                List.of(
                        new Person("Grace", 16, "UK"),
                        new Person("Alex", 19, "UK")
                ),
                List.of(
                        new Person("Sebastian", 40, "FR"),
                        new Person("Sebastian", 40, "FR")
                )
        );
        /**
         * 扁平化、去重、年龄大于18、映射到name、按照名字的长度排序
         */
        Stream<String> s= peopleGroups.stream()
                .flatMap(List::stream)
                .distinct()
                .filter(person -> person.getAge() > 18)//筛选
                .map(Person::getName)
                .sorted(Comparator.comparing(String::length));//映射为字符串类型的名字之后再按照字符串的长度排序;
        
        //触发执行操作
        s.forEach(System.out::println);
    }
```

# 终端操作

终端操作是流处理的最终步骤，实弹发生，流中的元素被消费，流不能再被使用。

终端操作包括查找与匹配、聚合操作、归约操作、收集操作、迭代操作。

![](https://i.imgur.com/mg7OIu4.png)

## 查找与匹配

属于短路操作(Short-circuiting Operations),也就是说这些操作在找到所需的元素后会立即返回结果,不会遍历整个流.

- `anyMatch`:如果流中任意元素满足给定的条件则返回true
- `noneMatch`:与前者相反
- `allMatch`:所有的都满足才会返回true

---

- `Optional<T> findFirst();`找到流中的第一个元素,类型为`Optional`.因为返回的元素可能为空,这样做的话更加安全.

```java
    @Test
    public void test2() {
        List<Person> people = List.of(
                new Person("Neo", 1, "USA"),
                new Person("Blu", 12, "China"),
                new Person("Alex", 29, "Germany"),
                new Person("Bob", 25, "Germany"),
                new Person("Kurumi", 18, "Japan")
        );
        Optional<Person> optionalPerson = people.stream().findFirst();
        //ifPresent:如果值存在，就执行括号里的操作，否则什么也不做.
        optionalPerson.ifPresent(System.out::println);
    }
```

打印结果:

```text
Person{name='Neo', age=1, country='USA'}
```

- `findAny`:返回任意一个元素

## 聚合操作

- `long count();`:计算元素的数量
- `Optional<T> max(Comparator<? super T> comparator);`:返回流中的最大元素,需要提供一个比较器.
- 同理还有`min`

---

- `sum()`用于求和,只能处理基本数据类型的流,所以使用之前要进行流类型的转换.
- `average`同上

本质上聚合操作是归约操作的一种特殊形式,适合快速简单的统计任务.归约操作reduce更加通用.

## 归约操作

整型的reduce定义如下:

```java
    int reduce(int identity, IntBinaryOperator op);
```

Java提供的注解:

> 对该流的元素执行归约操作，使用提供的标识值（identity）和一个关联的累积函数（accumulation function），并返回归约后的结果。其等价于以下代码：
> ```java
> int result = identity;
> for (int element : this stream)
>     result = accumulator.applyAsInt(result, element)
> return result;
> ``` 
> 即,先把 identity 的值赋给结果,然后再使用累计函数对结果和流中的元素进行运算.  
> 这种归约不一定按顺序执行（即它可以并行处理）。  
> identity 必须是一个**恒等元**,也就是说累计函数作用在它身上之后的结果仍然等于它本身.例如:  
> 加法的恒等元是0,因为 0 + x = x  
> 乘法的恒等元是1,因为1 * x = x  
> 此外，累积函数必须是**可结合的**（associative）函数,也就是符合结合律,计算顺序不影响结果.

**形参**:

- `identity`:累积函数的恒等元
- `op`:一个可结合的,无副作用(函数在处理值时不应该修改外部状态)的,无状态的函数

**返回值**:归约的结果

对一个流中的所有元素求和,可以写为`int sum = integers.reduce(0, (a, b) -> a+b);`  
或者更简洁一点`int sum = integers.reduce(0, Integer::sum);`

虽然相比于在循环中直接修改一个运行中的总和变量，这种方式看起来有些绕远路，但归约（reduction）操作在并行化时表现得更加优雅，
无需额外的同步（synchronization），并且大大降低了数据竞争（data races）的风险。

--- 

例:对流的所有元素的年龄求和,然后输出所有人名字的串接字符串

```java
    @Test
    public void test3() {
        List<Person> people = List.of(
                new Person("Neo", 1, "USA"),
                new Person("Blu", 13, "China"),
                new Person("Alex", 29, "Germany"),
                new Person("Bob", 25, "Germany"),
                new Person("Kurumi", 18, "Japan")
        );
        //计算年龄的和
        IntStream doubleStream = people.stream().mapToInt(Person::getAge);
        int sum = doubleStream.reduce(0, (a,b) -> (a + b));
        System.out.println(sum);

        //将所有人的名字串接起来
        String joinedName = people.stream()
                .map(Person::getName)
                .reduce("", (a, b) -> a + b);
        System.out.println(joinedName);
    }
```

打印结果

```text
86
NeoBluAlexBobKurumi
```

## 收集操作

把流处理后的元素汇集到新的数据结构中, 比如列表, map, 集合等等.

**定义**

```java
    <R, A> R collect(Collector<? super T, A, R> collector);
```

`Collectors.java`中提供了丰富的**静态方法**用作collector参数. 如`toList`,`toMap`.

```java
    //收集年龄大于18岁的人
    @Test
    public void test4() {
        List<Person> people = List.of(
                new Person("Neo", 1, "USA"),
                new Person("Blu", 13, "China"),
                new Person("Alex", 29, "Germany"),
                new Person("Bob", 25, "Germany"),
                new Person("Kurumi", 18, "Japan")
        );
        List<Person> adults = people.stream()
                .filter(person -> person.getAge() > 18)
                .collect(Collectors.toList());//使用Collectors提供的方法
        System.out.println(adults);
    }
```

---

**分组**:`Collectors`类提供的静态方法

```java
   public static <T, K> Collector<T, ?, Map<K, List<T>>>
    groupingBy(Function<? super T, ? extends K> classifier) {
        return groupingBy(classifier, toList());
    }
```

- `T`:流中元素的类型,例如`Person`
- `K`:用于分组的键的类型
- **形参**:`classifier`, 将输入元素映射到键的分类器函数
- **返回值**:实现分组操作的收集器, 将`Stream<T>`收集成一个`Map<K, List<T>>`.
  - key:由classifier生成
  - value:分到该组的`T`元素组成的列表

示例:根据国家分组

```java
    @Test
    public void test6() {
        List<Person> people = List.of(
                new Person("Neo", 1, "USA"),
                new Person("Blu", 13, "China"),
                new Person("Alex", 29, "Germany"),
                new Person("Bob", 25, "Germany"),
                new Person("Kurumi", 18, "Japan")
        );
        Map<String, List<Person>> collect = people.stream()
                .collect(Collectors.groupingBy(Person::getCountry));
        collect.forEach((k, v) -> System.out.println(k + " = " + v));
    }
```

- `T`在这里即`Person`
- 这里的分类器是`(Person::getCountry)`,所以键的类型是`String`
- 最终得到的Map泛型为`Map<String, List<Person>>`

打印结果

```text
USA = [Person{name='Neo', age=1, country='USA'}]
Japan = [Person{name='Kurumi', age=18, country='Japan'}]
China = [Person{name='Blu', age=13, country='China'}]
Germany = [Person{name='Alex', age=29, country='Germany'}, Person{name='Bob', age=25, country='Germany'}]
```

---

**分区**功能同理, 调用`Collectors.partitioningBy`即可, 不过这时传入的是一个条件判断式, map的第一个参数也变成了boolean变量.

```java
Map<Boolean, List<Person>> agePartition = people.stream()
                .collect(Collectors.partitioningBy(person -> person.getAge() > 18));
        agePartition.forEach((k, v) -> System.out.println(k + " = " + v));
```

---

`Collectors`也提供了拼接字符串的方法`joining`

```java
    String joinedName = people.stream()
            .map(Person::getName)
            .collect(Collectors.joining(","));
    System.out.println(joinedName);
```

打印结果

```text
Neo,Blu,Alex,Bob,Kurumi
```

也可以用`Collectors.joining`连接字符串.

---

使用`Collectors.summarizingInt`可以**汇总**指定的数据, 返回类型为`IntSummaryStatistics`, 使用`IntSummaryStatistics`的`get`方法可以快速获取最大值, 最小值, 平均值等等.

```java
    @Test
    public void test7() {
        List<Person> people = List.of(
                new Person("Neo", 1, "USA"),
                new Person("Blu", 13, "China"),
                new Person("Alex", 29, "Germany"),
                new Person("Bob", 25, "Germany"),
                new Person("Kurumi", 18, "Japan")
        );
        String joinedName = people.stream()
                .map(Person::getName)
                .collect(Collectors.joining(","));//输出合并的字符串
        System.out.println(joinedName);

        IntSummaryStatistics collect = people.stream()
                .collect(Collectors.summarizingInt(Person::getAge));
        //打印collect的所有属性(数量,和,最小值,平均值,最大值)
        System.out.println(collect);
        //指定获取最大值
        System.out.println(collect.getMax());
        //指定获取最小值
        System.out.println(collect.getMin());
    }
```

---

**自定义收集器**

`Collector.of(...)`的五个参数结构

```java
Collector.of(
    Supplier<R> supplier,                         // 创建中间结果容器
    BiConsumer<R, T> accumulator,                // 如何添加元素
    BinaryOperator<R> combiner,                  // 合并两个部分结果
    Function<R, R> finisher,                     // 最终变换结果（可选）
    Collector.Characteristics... characteristics // 特征标记
)
```

```java
    @Test
    public void customTest() {
        List<Person> people = List.of(
                new Person("Neo", 1, "USA"),
                new Person("Blu", 13, "China"),
                new Person("Alex", 29, "Germany"),
                new Person("Bob", 25, "Germany"),
                new Person("Kurumi", 18, "Japan")
        );
        ArrayList<Person> collect = people.stream()//.parallel()
                .collect(Collector.of(
                        () -> new ArrayList<>(), //创建空容器
                        (list, person) -> {      //累加器逻辑把一个 person 添加到当前线程维护的 list 里
                            System.out.println("Accumulator: " + person);
                            list.add(person);
                        },
                        (left, right) -> {       //合并多个线程的中间结果,只在并行流起作用
                            System.out.println("Combiner: " + left);
                            left.addAll(right);
                            return left;
                        },
                        Collector.Characteristics.IDENTITY_FINISH//表示不需要变换,中间操作的结果就是最终结果
                ));
        System.out.println(collect);
    }
```

打印结果

```text
Accumulator: Person{name='Neo', age=1, country='USA'}
Accumulator: Person{name='Blu', age=13, country='China'}
Accumulator: Person{name='Alex', age=29, country='Germany'}
Accumulator: Person{name='Bob', age=25, country='Germany'}
Accumulator: Person{name='Kurumi', age=18, country='Japan'}
[Person{name='Neo', age=1, country='USA'}, Person{name='Blu', age=13, country='China'}, Person{name='Alex', age=29, country='Germany'}, Person{name='Bob', age=25, country='Germany'}, Person{name='Kurumi', age=18, country='Japan'}]

```

（这一块没看太懂，先放到这里以后再来看）

# 并行流

Parallel Streams

能够借助**多核处理器**的**并行计算能力**加速数据处理, 特别适合大型数据集或计算密集型任务.

## 工作原理

- 并行流在开始时, Spliterator分割迭代器将数据分割成多个片段, 分割过程通常采用递归的方式动态进行, 以此平衡子任务的工作负载, 提高资源利用率.
- 然后Fork/Join框架将这些数据片段分配到多个线程和处理器核心上进行并行处理.
- 处理完成后, 结果将会被汇总合并, 其核心是[任务的分解Fork]和[结果的合并Join]
- 无论是并行流还是顺序流.二者都提供相同的中间操作和终端操作, 也就是说我们可以采用几乎相同的方式进行数据处理和结果收集

![并行流的工作原理](https://i.imgur.com/MMyKgBt.png)

## forEach & forEachOrdered

demo

```java
    @Test
    public void test1() {
        List<String> Example = List.of("A", "B", "C", "D", "E", "F", "G");
        Example.parallelStream()  //并行流
                .map(String::toLowerCase)  //转换为小写
                .forEach(System.out::println);
    }
```

打印出的字母是乱序的, 而且每次都不一样.

不像顺序流的执行是单线程的, 并行流采用多线程并发处理, 不保证元素的处理顺序.用`forEachOrdered`可以保证元素的出现顺序, 这归功于Spliterator和Fork/Join框架的协作:

- 在处理并行流时, 对于有序的数据源, Spliterator会对数据源进行递归分割, 通过划分数据源的索引范围来实现. 每次分割都会产生一个新的Spliterator实例, 其内部维护了指向原数据的索引范围, 这种分割机制可以让数据的出现顺序得以保持. 
- 然后, Fork/Join框架接手, 将分配后的数据块分配给不同的子任务执行. 对于forEachOrdered操作, 框架依据Spliterator维护的顺序信息来调度方法的执行顺序. 所以, 就算某个子任务提前完成了, 如果跟它关联的顺序还没到来, 系统将缓存该顺序, 并暂停执行该方法, 直到所有前序的任务都已经完成. 
- 上述机制确保了即使是并行处理也能保证原始的出现顺序, 代价是牺牲了一些并行执行的效率.

- 对于`forEach`, Fork/Join会**忽略顺序的信息**, 能够提高执行效率.
- forEach会在不同的线程上独立进行, 所以如果操作的是共享资源, 必须确保这些操作是**线程安全**的(同步). 所以`forEach`更适合执行无状态操作或资源独立的场景. 

一个关于多线程的测试:

```java
   /**
     * 并行流的多线程
     */
    @Test
    public void test2() {
        List<String> Example = List.of("A", "B", "C", "D", "E", "F", "G");
        Example.parallelStream().forEach(item -> {
            //打印正在处理的元素和对应的线程
            System.out.println("Item: " + item + "->" + "Thread: " + Thread.currentThread().getName());
        });
    }
```

打印结果

```text
Item: E->Thread: main
Item: D->Thread: main
Item: G->Thread: main
Item: A->Thread: main
Item: F->Thread: ForkJoinPool.commonPool-worker-2
Item: B->Thread: ForkJoinPool.commonPool-worker-1
Item: C->Thread: ForkJoinPool.commonPool-worker-2
```

- `main`:主线程
- `ForkJoinPool.commonPool-worker-x`:后台线程池中的工作线程

## collect收集

List使用`collect`**收集**输出结果, 最终合并得到的列表仍为**有序**(与第一个demo不同)

```java
    /**
     * List并行流为有序
     */
    @Test
    public void test3() {
        List<String> collect = List.of("A", "B", "C", "D", "E", "F", "G").parallelStream()
                .map(String::toLowerCase)     //转换为小写
                .collect(Collectors.toList());//收集不同线程的结果,合并为列表
        System.out.println();
        System.out.println(collect);//输出为[a, b, c, d, e, f, g]
    }
```

使用**自定义收集器**演示有序列表`List`在并行流的情况下合并后仍有序输出的过程:

 ```java
    @Test
    public void test4() {
        List<String> collect = List.of("A", "B", "C", "D", "E").parallelStream()
                .map(String::toLowerCase)
                .collect(Collector.of(
                        () -> {
                            System.out.println("Supplier: new ArrayList" + "Thread: " + Thread.currentThread().getName());
                            return new ArrayList<>();
                        },
                        (list,item) -> {
                            System.out.println("Accumulator: " + item + " Thread: " + Thread.currentThread().getName());
                            list.add(item);
                        },
                        (left, right) -> {//并行流需要有效地合并不同线程的处理结果
                            System.out.println("Combiner: " + left + " " + right + " Thread: " + Thread.currentThread().getName());
                            left.addAll(right);
                            return left;
                        },
                        Collector.Characteristics.IDENTITY_FINISH
                ));
        System.out.println(collect);

    }
 ```

打印内容:

```text
Supplier: new ArrayListThread: main
Accumulator: c Thread: main
Supplier: new ArrayListThread: ForkJoinPool.commonPool-worker-1
Accumulator: b Thread: ForkJoinPool.commonPool-worker-1
Supplier: new ArrayListThread: ForkJoinPool.commonPool-worker-2
Supplier: new ArrayListThread: ForkJoinPool.commonPool-worker-1
Accumulator: e Thread: ForkJoinPool.commonPool-worker-2
Accumulator: d Thread: ForkJoinPool.commonPool-worker-1
Supplier: new ArrayListThread: main
Accumulator: a Thread: main
Combiner: [d] [e] Thread: ForkJoinPool.commonPool-worker-1
Combiner: [a] [b] Thread: main
Combiner: [c] [d, e] Thread: ForkJoinPool.commonPool-worker-1
Combiner: [a, b] [c, d, e] Thread: ForkJoinPool.commonPool-worker-1
[a, b, c, d, e]
```

如果使用`Set`, 则结果仍然是无序的, 这是由**数据结构本身**的特点决定的, Spliterator和Fork/Join框架的分割合并策略并没有什么不同.

## UNORDERED & CONCURRENT

**UNORDERED**

即便Colector被标记为`UNORDERED`, 如果数据源或流操作本身是有序的, 系统的执行策略通常仍会保持这些元素的出现顺序. 只有在特定场景下系统才会针对那些被标记为`UNORDERED`的流进行优化从而打破顺序的约束.

**CONCURRENT**

- 在标准的并行流处理中, 每个线程处理数据的一个子集, 维护自己的局部结果容器. 在所有的数据处理完成后, 这些局部结果会通过Combiner函数合并成一个最终的结果. 
- 使用CONCURRENT特性后, 所有线程将**共享同一个结果容器**, 而不是维护独立的局部结果, 从而减少了合并的需要. 这通常会带来性能上的提升, 特别是合并操作较为复杂时. 这时只有一个结果容器, 这个容器必须是线程安全的(例如ConcurrentHashMap). 








