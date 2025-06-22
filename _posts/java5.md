---
title: Java SE(5)异常处理&多线程
date: 2025-04-06 09:21:59
index_img:
categories: Java SE
---

# 异常

指的是程序在执行过程中，出现的非正常情况，如果不处理最终会导致JVM的非正常停止。

一旦发生某种异常Java就创建该异常类型的对象，并且抛出(throw)。

**Error**:java虚拟机无法处理的严重问题，一般不编写针对性的代码。例如：栈内存溢出，堆内存溢出。

**Exception**:异常处理的情况，需要针对性的代码进行处理。

- 编译时异常
- 运行时异常

常见的运行时异常：角标越界异常 空指针异常 类别异常 输入类型不匹配异常 数字格式化异常

编译时异常：`ClassNotFoundException` `FileNotFoundException` `IOException`

## 处理异常的方式

### 1.try-catch-finally

1. 程序在执行的过程中，一旦出现异常，就创建该异常类的对象并抛出，然后虚拟机就终止程序。
2. 捕获异常对象，进行相应的处理，处理后可以继续执行代码

```java
try {
    // 可能会抛出异常的代码
    //try中声明的变量作用域只在try内部
} catch (ExceptionType1 e1) {
    // 异常类型1的处理代码
} catch (ExceptionType2 e2) {
    // 异常类型2的处理代码
} finally {
    // 可选的代码，无论是否发生异常都会执行
}
```

`catch`中异常处理的方式：

1. 自己编写输出语句
2. `printStackTrace()`打印异常的详细信息（推荐）
3. `getMessage()`获取发生异常的原因


- 运行时异常：开发时通常不进行显式的处理
- 编译时异常：**必须**进行处理，否则编译不通过

`fianlly`：无论try或catch中是否存在仍未被处理的异常，finally中的语句都一定会被运行。

在开发中有一些资源使用之后必须显式地进行关闭，.close放在finally中。

### 2.throws

```java
public void someMethod() throws ExceptionType1, ExceptionType2 {
    // 可能抛出异常的代码
}
```

该方法本身不会处理这些异常，交给调用这个方法的代码去处理。

对于编译时异常，子类重写的方法抛出的异常类型不能比父类被重写的方法抛出的异常更高级。如果父类没抛异常，则子类也不能抛。

- 如果代码重涉及到了资源的调用，则必须考虑使用try-catch-finally来处理，保证不出现内存泄漏。
- 如果父类被重写的方法没有throws，则子类只能使用try-catch-finally


### 3.throw

对于不满足实际场景，但不符合系统规定的异常的问题，手动抛出对象。

语法：
```java
throw new ExceptionType("错误信息");
```

其中`ExceptionType`可以是系统自带的标准异常类，也可以是自定义的异常类。

**throw和throws的区别**：

| **功能**               | **`throw`**                                              | **`throws`**                                                |
|------------------------|----------------------------------------------------------|------------------------------------------------------------|
| **作用**               | 用于手动抛出异常。                                        | 用于声明一个方法可能抛出的异常。                            |
| **使用位置**           | 用于方法内部。                                           | 用于方法声明中，表示该方法可能会抛出异常。                |
| **后面跟的内容**       | 后面跟一个异常对象（如 `new Exception()`）。              | 后面跟异常类型（如 `IOException`、`FileNotFoundException`）。 |
| **是否需要处理异常**   | 抛出的异常必须由调用该方法的代码来处理。                  | 调用方法的代码必须处理或声明这些异常。                    |

# 多线程

## 程序、进程与线程

程序(program) 进程(process) 线程(thread)

- **程序**：我们写的代码/应用都属于程序，是一个静态的东西，包含了要执行的指令，只有在运行时才会发挥作用，相当于菜谱。
- **进程**：运行程序时操作系统会为程序分配资源，这时程序就变成了一个进程。进程是操作系统在执行过程中的“活跃”表现，相当于看着菜谱做菜的厨师。
- **线程**：进程中的最小执行单元，负责执行具体的命令。一个进程可以有多个线程，共享进程的资源比如内存。多线程可以让程序同时执行多个任务。

## 创建和启动线程

### 方式一：继承Thread类

1. 创建一个继承于Thread类的子类
2. 重写Thread类的run()，补充方法体
3. 创建子类的对象
4. 调用start():1.启动线程 2.调用当前线程的run()方法

```java
class PrintNumber extends Thread {
    @Override
    public void run() {
        for (int i = 0; i < 100; i++) {
            if(i % 2 == 0) {
                System.out.println("i = " + i);
            }
        }
    }
}
```

**注意**：不能让已经启动的线程再次启动，否则报异常`Exception in thread "main" java.lang.IllegalThreadStateException`

要开启另一个线程需要重新创建一个对象。

### 方式二：实现Runnable接口

*Runnable.java*

```java
@FunctionalInterface
public interface Runnable {
    /**
     * Runs this operation.
     */
    void run();
}
```

1. 创建一个实现Runnable接口的类
2. 实现run()，补全操作
3. 创建对象
4. 将此对象作为参数传递到Thread类的构造器中，创建Thread实例
5. 实例调用start()

例如：

```java
public class Runtest {
    public static void main(String[] args) {
        NumberPrint numberPrint = new NumberPrint();//创建类的实现对象
        /*Thread的其中一个构造函数接受一个Runnable接口类型的参数，而NumberPrint类实现了这个接口，因此可以直接传入。
        * */

        Thread thread = new Thread(numberPrint);
        thread.start();
    }
}

class NumberPrint implements Runnable {
    @Override
    public void run() {
        for (int i = 0; i < 10; i++) {
            System.out.println(Thread.currentThread().getName() + i);
        }
    }
}
```

④之所以成立，是因为Thread类有如下构造器

```java
    public Thread(Runnable task) {
        this(null, null, 0, task, 0);
    }
```
        
形参为接口`Runnable`类型。`Runnable`是`Thread`类可以接受的类型，而`numberPrint`实现了`Runnable`接口，因此`Thread`类可以接受`numberPrint`类型的对象。

`Thread`类并不关心具体传入的是哪一个实现`Runnable`接口的类，`numberPrint`只是其中的一个实现。

**多态性**体现在，`Thread`类能够接受任何实现了`Runnable`接口的对象，实际执行的是实现类中的`run()`方法。

## Thread的常用方法

- `start()`:启动线程，调用线程的run()
- `run()`:将线程要执行的操作声明在run()中
- `currentThread()`:获取当前执行代码对应的线程
- `getName()`:获取线程名
- `setName()`:设置线程名
- `sleep(long millis)`:Thread类的**静态**方法，使当前线程睡眠指定的毫秒数
- `yield()`:一旦执行此方法，则提示当前线程让出CPU资源，让其他同优先级的线程有机会先执行（它只是一个**提示**，**不能保证**当前线程就一定会被挂起或其他线程就一定会立即执行）。调用该方法的线程会：
  - 实际开发中，yield() **很少用**来做线程调度控制，因为它行为不确定。
- `join()`:**非静态**方法，等指定线程执行完毕，再继续执行当前线程。一般用于main等子线程执行完，而不会用于main，因为main的结束通常就意味着整个程序的结束。
- `isAlive()`:判断当前线程是否存活。

## 线程的优先级

线程优先级（Thread Priority）是 Java 中用于提示操作系统调度器：哪个线程应该“更重要”，**更可能获得 CPU 时间片先运行的**一种机制。

**线程优先级是建议，不是命令！**操作系统可以参考，也可以无视它。

- getPriority():获取线程的优先级
- setPriority():1~10
- 优先级的三个常量：
  - MIN_PRIORITY = 1;最低优先级
  - NORM_PRIORITY = 5;默认优先级
  - MAX_PRIORITY = 10;最高优先级
- 实际项目中很少用，一般由操作系统决定线程调度。

## 线程的生命周期

现成的不同状态被定义在`Thread.java`的枚举类中。这些状态是Java虚拟机层面定义的状态，不一定等同于操作系统的线程状态。

```java
    public enum State {

        NEW,

        RUNNABLE,//就绪+运行,Ready+Running=Runnable

        BLOCKED,//阻塞，A thread that is blocked waiting for a monitor lock is in this state.

        WAITING,//无限期等待

        TIMED_WAITING,//限时等待

        TERMINATED;//终止
    }
```

![线程状态图解](https://i.imgur.com/eTf0YbI.png)

## 线程的安全问题

多个线程访问同一资源时，如果都对资源有读和写的操作，可能会出现线程安全问题。

### 解决方法

1. **同步代码块**

```java
synchronized(同步监视器){
    //需要被同步的代码，即操作共享数据的代码
}
```

- 作用：需要被同步的代码，当一个线程在操作这些代码的过程中其他线程必须等待。
- 同步监视器，俗称锁(Lock)。哪个线程获取了锁，哪个线程就能执行需要被同步的代码。
- 同步监视器可以使用任何一个类的实例充当。多个线程必须共用**同一个**同步监视器，是唯一的。

2. **同步方法**

直接把方法声明为同步方法。相当于同步代码块的简化写法。

- `synchronized`（实例方法）的同步监视器是this当前对象
- `static synchronized`（静态方法）的同步监视器是当前类的class对象

synchronized弊端：串行执行，性能会低一些。

### 线程安全的懒汉式

方式一：声明为同步方法即可。

```java
class Bank {

    private Bank(){}
    private static Bank bank = null;

    public static synchronized Bank getBank() {
        /*相当于
        synchronized (Bank.class) {
            if(bank == null) {
                bank = new Bank();
            }
        }
        */
        if(bank == null) {
            bank = new Bank();
        }
        return bank;
    }
}
```

方式二：同步代码块，与方式一等价。

方式三：避免指令重排的方式

```java
class Bank {
    private static volatile Bank bank = null; // 加 volatile 防止指令重排

    private Bank() {}

    public static Bank getBank() {
        if (bank == null) { // 第一次检查
            synchronized (Bank.class) {
                if (bank == null) { // 第二次检查
                    bank = new Bank();
                }
            }
        }
        return bank;
    }
}
```

## 死锁

两个或多个线程在执行过程中，互相等待对方释放资源，结果谁也不释放，谁也无法继续执行，程序就“卡住”了。
## Lock

`import java.util.concurrent.locks.ReentrantLock;`

1. 创建Lock的实例，确保多个线程共用一个lock实例:`private final Lock mylock = new ReentrantLock();`
2. 执行lock方法：`mylock.lock`
3. 调用unlock()，释放对共享数据的锁定。

Lock更加灵活，推荐。

## 线程间的通信机制

常用方法：

- wait():执行此方法的线程进入等待状态，**同时会释放对同步监视器的调用**，这一点与sleep()不同。“不干了，等通知”
- notify():用来**唤醒一个正在等待这个对象锁的线程**。这个线程必须是因为`wait()`暂停的，别的不会受影响（在多个线程存在的情况下，唤醒优先级最高的那一个）。“*你可以起来干了*”。被唤醒的线程从当初被wait的位置继续执行。
- **注意**:wait()和notify()在调用时都应当让同步监视器(synchronized(obj)的obj)调用，否则报`IllegalMonitorStateException`

```java
synchronized(obj) {
    obj.wait();
}
```

- notifyAll():唤醒所有被wait的线程
  
以上三个方法**必须**用于**同步代码块或同步方法**中。


不同点：
- 声明的位置: 
  - wait():声明在Object类中
  - sleep()：声明在Thread类中，静态的

- 使用的场景不同：
  - wait()：只能使用在同步代码块或同步方法中
  - sleep():可以在任何需要使用的场景

- 使用在同步代码块或同步方法中：
  - wait()：一旦执行，会释放同步监视器
  - sleep()：一旦执行，不会释放同步监视器

- 结束阻塞的方式： 
  - wait()：到达指定时间自动结束阻塞 或 通过被notify唤醒，结束阻塞
  - sleep():到达指定时间自动结束阻塞


# 线程池

提前创建好多个线程，放入线程池中，使用时直接获取。不在java基础的范围之内


