---
title: ThreadLocal使用场景+源码简析
date: 2025-06-07 23:44:37
index_img:
categories: Web Development
---


## 作用

1. 线程并发：多线程并发的场景
2. 传递数据：可以在同一个线程的不同组件中传递公共变量
3. 线程隔离：每个线程的变量都是独立的不会互相影响

## 用法

用来存储数据，而且线程安全。为每个线程单独创建一个存储空间。

创建对象

```java
ThreadLocal<String> tl = new ThreadLocal<>();
```

设置当前线程绑定的变量

```java
public void set(T value) {
    set(Thread.currentThread(), value);
    if (TRACE_VTHREAD_LOCALS) {
        dumpStackIfVirtualThread();
    }
}
```

获取当前线程绑定的变量

```java
public T get() {
    return get(Thread.currentThread());
}
```

移除当前线程绑定的局部变量

```java
public void remove(){...}
```

## 业务场景

在一个应用中，某些页面仅当用户登录以后才能访问，可以在每当用户登录成功时就为用户发放一个JWT令牌，随后的每次请求都在请求头里带上这个token，如果token校验通过，则说明用户的确已经登录，允许继续访问。

采用这种思路，查询用户的文章列表的处理方法如下：

```java
@RestController
@RequestMapping("/article")
public class ArticleController {

    @GetMapping("/list")
    public Result<String> list(@RequestHeader(name = "Authorization") String token, HttpServletResponse resp) {
       try {
            Map<String, Object> claims = JwtUtil.parseToken(token); // 解析token
            return Result.success("所有的文章数据");
        } catch (Exception e) {
            resp.setStatus(401);
            return Result.error("未登录");
        }
        return Result.success("所有的文章数据");
    }
}
```

在形参里主动接收请求头携带的token，然后手动解析。如果解析出错，则抛出异常，返回结果“未登录”。

上面的思路有一个问题：登录成功以后，每个和用户有关的功能都需要验证token，如果在每个页面的处理方法都写一遍解析 token 的方法未免太过冗余。为此，可以考虑使用`ThreadLocal`存储tokean解析后的结果，而 token 解析的工作放在拦截器的`preHandle`里进行，并在`afterCompletion`清除局部变量。

为此，先写一个 ThreadLocalUtil 工具类，封装了存储局部变量、获取局部变量、清除的方法：

```java
@SuppressWarnings("all")
public class ThreadLocalUtil {
    //提供ThreadLocal对象
    private static final ThreadLocal THREAD_LOCAL = new ThreadLocal();

    //根据键获取值
    public static <T> T get(){
        return (T) THREAD_LOCAL.get();
    }
	
    //存储与线程绑定的局部变量
    public static void set(Object value){
        THREAD_LOCAL.set(value);
    }

    //清除ThreadLocal 防止内存泄漏
    public static void remove(){
        THREAD_LOCAL.remove();
    }
}
```

再配置拦截器，在拦截器里解析token。此处token的解析结果是一个哈希表，包括

- `"id=用户id"`
- `"username=用户名"`

然后把解析得到的表作为`ThreadLocalMap`的value存储起来，后面执行方法的时候直接读取就可以了。

```java
@Component
public class LoginInterceptor implements HandlerInterceptor {
    // 在执行方法之前进行拦截
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String token = request.getHeader("Authorization");
        try {
            Map<String, Object> claims = JwtUtil.parseToken(token);
            // 把业务数据存储到 ThreadLocal 中
            ThreadLocalUtil.set(claims);
            return true; // 放行
        } catch (Exception e) {
            response.setStatus(401);
            return false; // 不放行
        }
    }

    // Spring DispatcherServlet 在完成一次 HTTP 请求的整个处理流程后，
    // 自动调用 afterCompletion() 方法
    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) throws Exception {
        // 这里清除 ThreadLocal 中已经使用过的数据，防止内存泄漏
        ThreadLocalUtil.remove();
    }
}
```

优化后的查询文章的处理方法：

```java
@RestController
@RequestMapping("/article")
public class ArticleController {

    @GetMapping("/list")
    public Result<String> list() {
        // 能够执行到这里的话一定是通过验证了
        return Result.success("所有的文章数据");
    }
}
```

同理，查询用户基本信息的话可以先从`ThreadLocalUtil`获取用户名或 id，然后调用业务层的方法查询信息并返回:

```java
// 获取用户的详细信息
@GetMapping("/userInfo")
public Result<User> Info(@RequestHeader(name = "Authorization") String token) {
    // 先从 token 中读取用户的用户名
    Map<String, Object> stringObjectMap = ThreadLocalUtil.get();
    String username = (String) stringObjectMap.get("username");
    // 调用业务层的方法，查询这个用户名的具体信息
    User u = userService.findByUserName(username);
    return Result.success(u);
}
```





## 与同步代码块的区别

**作用机制**

- `ThreadLocal`为多个线程提供**独立的变量副本**，每个线程互不干扰
- `synchronized`多个线程**共享**资源，通过锁实现同步访问
- `ThreadLocal`实现线程隔离，各个线程保存自己的变量（常用于用户上下文）
- `synchronized`实现线程互斥，防止多个线程同时修改资源，造成数据不一致

**线程安全方式**

- `ThreadLocal`各个线程拥有自己的变量副本，不需要加锁就可以访问
- `synchronized`通过加互斥锁防止多个线程同时访问共享变量

**性能**

- `ThreadLocal`性能更好，避免了锁竞争；`synchronized`性能较差


## ThreadLocal底层实现

核心思想：

每个线程维护一个`ThreadLocalMap`，用来存储自己的局部变量副本。

这个`Map`的`key`是`ThreadLocal`对象本身，`value`是为它设置的值。

声明：

```java
public class ThreadLocal<T> {...}
```

### set方法

```java
public void set(T value) {
    // 获取当前线程
    Thread t = Thread.currentThread();
    // 获取当前线程的 ThreadLocalMap
    ThreadLocalMap map = getMap(t);
    if (map != null) {
        // 不为空，则将ThreadLocal作为键，value作为值
        map.set(this, value);
    } else {
        // 为空则创建
        createMap(t, value);
    }
}

// 获取指定线程 t 维护的 ThreadLocalMap 的方法
ThreadLocalMap getMap(Thread t) {
    return t.threadLocals;
}

// 为线程创建ThreadLocalMap
void createMap(Thread t, T firstValue) {
    t.threadLocals = new ThreadLocalMap(this, firstValue);
}
```

`threadLocals`在`Thread.java`定义：

```java
// 与此线程相关的 threadLocal 值。此映射由 ThreadLocal 类维护
ThreadLocal.ThreadLocalMap threadLocals = null;
```

### get方法
 
```java
// 返回当前线程绑定的局部变量的副本。
// 如果该变量在当前线程中没有值，则首先将其初始化为调用 initialValue 方法返回的值。
public T get() {
    // 获取当前线程
    Thread t = Thread.currentThread();
    // 获取当前线程的 ThreadLocalMap
    ThreadLocalMap map = getMap(t);
    // 已经创建过 map 继续看里面是否存放的有映射
    if (map != null) {
        ThreadLocalMap.Entry e = map.getEntry(this);
        // 存放的有映射，则把映射中的值取出来返回
        if (e != null) {
            @SuppressWarnings("unchecked")
            T result = (T)e.value;
            return result;
        }
    }
    // 没有创建过map，或者没有entry，则延迟初始化当前线程绑定的局部变量的值
    return setInitialValue();
}

private T setInitialValue() {
    T value = initialValue(); // 即 value = null
    Thread t = Thread.currentThread();
    ThreadLocalMap map = getMap(t);
    if (map != null) {
        map.set(this, value); // 有map，就把null存进去，否则新建map
    } else {
        createMap(t, value);
    }
    if (this instanceof TerminatingThreadLocal) {
        TerminatingThreadLocal.register((TerminatingThreadLocal<?>) this);
    }
    return value;
}
```

先获取当前线程的ThreadLocalMap，再根据调用者ThreadLocal（键）找到存储的值

### remove方法

```java
public void remove() {
        ThreadLocalMap m = getMap(Thread.currentThread());
        if (m != null) {
            // 移除这个entry
            m.remove(this);
        }
    }
```

为什么要手动移除？因为 ThreadLocalMap 的键是**弱引用**的 ThreadLocal 实例，值是实际的值（Object value）。

`ThreadLocalMap.Entry`的键是用弱引用包装的，**但是它的值是强引用**。如果键不再被任何地方引用，但是值引用的对象还在被强引用，占着内存，必须手动清除。

## ThreadLocalMap

为什么不用 HashMap 而用 ThreadLocalMap？

ThreadLocalMap 是 ThreadLocal 的私有静态内部类，它是专门为 ThreadLocal 定制的：

- 它的 key 是 ThreadLocal 弱引用
- 如果 ThreadLocal 没有外部引用，key 会被 GC 掉；但如果不清理 value，会造成内存泄漏。

---

ThreadLocalMap是ThreadLocal的**内部静态实现类**，没有实现 Map 接口，独立实现了 Map 的功能。

声明：

```java
static class ThreadLocalMap {...}
```

### Entry

```java
static class Entry extends WeakReference<ThreadLocal<?>> {
    /** The value associated with this ThreadLocal. */
    Object value;

    Entry(ThreadLocal<?> k, Object v) {
        super(k);
        value = v;
    }
}
```

`Entry`继承了`WeakReference`，是`ThreadLocalMap`的底层。


`ThreadLocal`被弱引用，这种引用不会影响 GC 过程。构造器`Entry(ThreadLocal<?> k, Object v)`内部的`super(k);`调用了父类的构造器。这里的泛型`T`对应`ThreadLocal<?>`，父类构造器定义如下：

```java
/**
 * Creates a new weak reference that refers to the given object.  The new
 * reference is not registered with any queue.
 *
 * @param referent object the new weak reference will refer to
 */
public WeakReference(T referent) {
    super(referent);
}
```

于是就创建了一个指向`ThreadLocal`的弱引用`k`。另一个参数`v`使用的是强引用：`value = v`。

### 成员变量

```java
/**
 * 初始容量——必须是 2 的次幂
 */
private static final int INITIAL_CAPACITY = 16;

/**
 * M用于存储元素的Entry数组，容量必须是2的次幂
 */
private Entry[] table;

/**
 * 现存的entry的个数
 */
private int size = 0;

/**
 * 扩容阈值
 */
private int threshold; // Default to 0

```

### 基本方法

```java

/**
 * 扩容阈值取为当前数组长度的2/3
 */
private void setThreshold(int len) {
    threshold = len * 2 / 3;
}

/**
 * 返回当前索引 i 的下一个索引，如果到头了就绕回数组起始处（0）。
 * 这是用于线性探测的一个辅助方法
 */
private static int nextIndex(int i, int len) {
    return ((i + 1 < len) ? i + 1 : 0);
}

/**
 * 跟上面的反过来，找到前一个索引，到头了就绕回尾部。
 */
private static int prevIndex(int i, int len) {
    return ((i - 1 >= 0) ? i - 1 : len - 1);
}

// 从上面两个取索引的方法可以看出，这里的数组相当于一个环形数组
```

负载因子之所以取2/3，是因为 ThreadLocalMap 内部使用的是**开放地址法**（线性探测），这种策略对负载因子比较敏感，在高负载下的插入和查找都会变慢，所以需要提前扩容。

{% note info %}  
什么是开放地址法？

开放地址法也是一种哈希冲突的解决策略：当我们向哈希表中插入一个键时，如果它映射到的位置已经被占用了，就在表中继续寻找下一个空位置。

例如，如果 key1 和 key2 都映射到了索引3，那么key2插入的时候会继续向后寻找索引 4 ，索引 4 也不为空的话就找索引 5 ，直到找到一个空位置。这个继续寻找的过程就称之为**探测**。探测的方法有很多种，ThreadLocalMap 使用的是线性探测法，也就是刚才描述的每次索引加一的思路。

开放地址法的好处是节省内存，仅用一个数组存储所有的元素，无需额外的数据结构，但缺点也很明显：数组中存储的个数越接近数组长度，空位越少，哈希冲突的概率会迅速上升，每次插入/查找的效率迅速下降。所以说它对负载因子是很敏感的，一般不能超过0.7。  
{% endnote %}

总结：开放地址法是指哈希冲突时，通过在数组中继续找下一个空位来解决冲突的方法。
它不使用链表，所有数据都存在数组中，因此对负载因子非常敏感，一旦太满，性能会迅速下降。为了尽可能减小哈希冲突的概率，对哈希值的选取采用了特殊的处理办法。

相比之下，哈希表采用**链地址法**，发生哈希冲突时将冲突的元素存储到链表或红黑树中，对负载更耐受，对负载因子不那么敏感，所以取0.75。

### 弱引用和内存泄漏

再详细地介绍一下这两个概念：

内存泄漏：程序中已经分配的动态堆内存由于某种原因未释放或者无法释放，造成系统内存的浪费，导致程序运行减慢甚至系统崩溃等严重后果。内存的堆积最终将导致内存溢出。

然后回顾一下JVM对象引用的四种类型：

- 强引用：比如`Object obj = new Object()`，只要强引用还存在，该对象就永远也不会被回收
- 软引用：描述一些有用，但是并非必须的对象。被软引用的对象，在系统的内存快要溢出的时候会被回收，如果回收之后内存还是不够才会抛异常
- 弱引用：只要垃圾收集器开始工作，只具有弱引用的对象就会被回收。
- 虚引用：虚引用完全不会对一个对象是否被回收造成影响，它是为了让系统知道这个对象被回收了

垃圾回收器一旦发现了只具有弱引用的对象，就会回收它的内存。

---

ThreadLocal 相关变量的引用关系如下：

Thread ───▶ ThreadLocalMap ───▶ Entry[] ───▶ (WeakReference<ThreadLocal>, value)

所有对象的实例都保存在 Java 堆中，引用类型的字段由于是对象的一部分，所以也在堆里。

`Thread`类持有一个 `ThreadLocalMap`字段：

```java
ThreadLocal.ThreadLocalMap threadLocals = null;
```

ThreadLocalMap 的实例也位于堆中，它被当前线程（CurrentThread）引用。

下面这张图展示了 ThreadLocal 持有的局部变量有效时的情况：

![](https://s21.ax1x.com/2025/06/07/pViDMnI.png)

- 当`ThreadLocalRef`不再被使用的时候，`ThreadLocal`只具备一个来自`k`的弱引用，所以马上会被GC回收，于是`k`变为空。
- 但是`value`是由强引用`value = v;`创建的，`ThreadLocalMap`中的`Entry`数组持有对`value`的强引用，因此无法被 GC，必须手动清除。

**ThreadLocal内存泄漏的根源**：ThreadLocalMap 是 Thread 的字段，生命周期和 Thread 相同，当 ThreadLocal 使用完毕之后，线程并没有结束。比如，在线程池中，线程结束之后是不会被销毁的，这种情况下如果不手动清除 entry，会造成严重的内存泄漏问题。

使用弱引用还有一个好处：

如果在执行`ThreadLocalMap`的 set 或者 get 方法的时候找不到`key`，就会分别执行`expungeStaleEntry((int staleSlot))`方法和`replaceStaleEntry`方法，前者的作用是清除过期的 entry， 后者的作用是把过期的 entry 更新为新的 entry，而判断 entry 是否过期就是看它是否满足`key == null && value != null`。**所以使用弱引用的方式实际上为我们添加了一层保障，就算是忘记了手动清除过期的 entry， 调用 get 或 set 方法也会自动帮我们把它们清理掉**。


### 减轻哈希冲突

ThreadLocalMap 的构造方法：

```java
ThreadLocalMap(ThreadLocal<?> firstKey, Object firstValue) {
    table = new Entry[INITIAL_CAPACITY]; // 初始容量16
    int i = firstKey.threadLocalHashCode & (INITIAL_CAPACITY - 1); // 计算索引
    table[i] = new Entry(firstKey, firstValue); // 先创建一个entry
    size = 1;
    setThreshold(INITIAL_CAPACITY); // 设置阈值
}
```

`threadLocalHashCode`是`ThreadLocal`的字段：

```java
private final int threadLocalHashCode = nextHashCode();
```

nextHashCode：

```java
private static int nextHashCode() {
    return nextHashCode.getAndAdd(HASH_INCREMENT);
}
```

```java
private static AtomicInteger nextHashCode = new AtomicInteger();
```

`AtomicInteger`是一个提供原子操作的 Integer 类，通过线程安全的方式加减。`nextHashCode()`是通过把原来的值不断加上`HASH_INCREMENT`得来的。`HASH_INCREMENT`与黄金分割数有关，目的是让哈希码均匀地分布在2的n次方的数组里。

> `HASH_INCREMENT = 黄金分割 * 2^32` 是目前被认为最接近完美均匀散列的方式。

所有的 ThreadLocal 实例的哈希值就是一个等差数列：

```
0
0 + HASH_INCREMENT
0 + 2*HASH_INCREMENT
0 + 3*HASH_INCREMENT
...
```

## 总结

- ThreadLocal 让每个线程都有自己的变量副本，互不干扰，适合线程复用环境下保存线程私有数据，比如在一次请求中保存用户信息，避免层层方法传参；
- 每个线程维护一个`ThreadLocalMap`，`ThreadLocalMap`是 ThreadLocal 的内部静态类，将`ThreadLocal`对象作为key，将需要与线程绑定的局部变量作为value，其中`key`为弱引用，`value`为强引用，因为存在强引用所以需要手动清除内存，避免内存泄漏
- `ThreadLocalMap`独立实现了 Map 的功能，底层是`Entry`数组，容量是 2 的次幂，但是负载因子取 2/3，减轻哈希冲突的方法是开放地址法中的线性探测法，相比之下 HashMap 采用链地址法
- `ThreadLocalMap`的哈希值等距分布，间隔为`HASH_INCREMENT = 黄金分割*2^32`，目的是让哈希值尽可能均匀分布，减小哈希冲突的概率



