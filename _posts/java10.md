---
title: Java SE-FILE类与IO流
date: 2025-04-13 10:36:50
index_img:
categories: Java SE
tags:
  - Java
---

# File类的使用

**位置**：`package java.io`

**构造器**：

- `public File(String pathname)`
  - `pathname`可以用绝对路径或相对路径
- `public File(String parent, String child)`
  - `parent`:父路径名字符串，如果为null则等效于上一种构造器
  - `child`:子路径名字符串，如果它是绝对路径则直接忽略父路径名
  - 如果二者都是相对路径，则把`child`添加在`parent`的后面
- `public File(File parent, String child)`

## 方法

见`File.java`（快捷键：`Ctrl + N`查找类，`Ctrl + F12`查找当前文件中的方法）。

例：输出一个目录下的所有文件名（递归）

```java
public void printFileName(File file) {
    if(file.isFile()) {
        System.out.println(file.getName());
    } else if (file.isDirectory()) {
        File[] files = file.listFiles();//listFiles()返回当前目录下的所有文件+文件夹
        for (File f : files) {
            printFileName(f);
        }
    }
}
```

# IO流

IO流就是Java中用来“**读**”和“**写**”数据的通道。

- 按数据方向分
  - 输入流：读取数据到程序中
  - 输出流：写数据到外部设备
- 按数据类型分：
  - 字节流：以字节（8bit）为单位，如`InputStream`， `OutputStream`
  - 字符流：以字符（长度不定）为单位，如`Reader`， `Writer`

**节点流**是直接与 **数据源** 或 **数据目的地** 打交道的流，常用于最底层的 I/O 操作。

**处理流**是“套接”在已有的流（通常是节点流）上，对数据进行 **加工处理** 的流。

**注意**：字符流专门用于**处理文本内容**，字节流用于处理**所有类型的数据**（包括文本、图片、视频、音频等）。

核心类结构图：

```CSS
           ┌────────────┐            ┌────────────┐
           │ InputStream│ <-------- │ FileInputStream │
           └────────────┘            └────────────┘
                 ▲
                 │
         [处理字节输入]

           ┌────────────┐            ┌────────────┐
           │ OutputStream│ <--------│ FileOutputStream│
           └────────────┘            └────────────┘
                 ▲
                 │
         [处理字节输出]

           ┌────────┐             ┌───────────┐
           │ Reader │ <--------- │ FileReader │
           └────────┘             └───────────┘
                 ▲
         [处理字符输入]

           ┌────────┐             ┌───────────┐
           │ Writer │ <--------- │ FileWriter │
           └────────┘             └───────────┘
                 ▲
         [处理字符输出]

```

左列：抽象基类  
右列：节点流（文件流），直接连接数据源和数据目的地。

## FileReader、FileWriter
一般步骤：

1. 创建读取或写出的File类实例
2. 创建输入流或输出流
3. 具体的读或写的过程
   1. read(char[] cbuffer):int
   2. write(char[] cbuffer, 0, len):void
4. 关闭流资源

注意：
1. 处理异常
2. 对于输入流，File类的实例对应的文件必须已经存在
3. 对于输出流，可以不存在，会自动创建并写入数据到此文件中；如果文件已经存在，则`FileWriter(File file, true/false)`

## FileInputStream、FileOutputStream

1. 创建读取或写出的File类对象
2. 创建输入流或输出流
3. 具体的读入或写出过程，仍然是read和write
4. 关闭流资源

## 缓冲流

4个处理流：

- BufferedInputStream
- BufferedOutputStream
- BufferedReader
- BufferedWriter

缓冲流的作用：**提升文件读写的效率**。

直接使用`FileInputStream`读取文件时，每次 .read() 都会和磁盘打交道，这样效率会非常低。而**缓冲流会一次性从底层流中读取大量数据存入内存缓冲区，之后就从内存中读取，提高了效率**。

>磁盘 I/O 是非常慢的，如果你每次都去磁盘读 1 字节，CPU 会一直等，效率很低。而一次性读取一个 8KB 缓冲区，可以极大减少磁盘读取次数，提高程序运行效率。

```java
//将一个文件复制到另一个地方
//实际写的时候记得用try-catch
    @Test
    public void test1() throws IOException {
        File src = new File("Neuro.png");
        File dest = new File("E:\\edge_download\\Neuro.png");

        FileInputStream fis = new FileInputStream(src);
        FileOutputStream fos = new FileOutputStream(dest);

        BufferedInputStream bis = new BufferedInputStream(fis);
        BufferedOutputStream bos = new BufferedOutputStream(fos);

        int len;
        //bis.read():
        //如果8KB的缓冲区的数据还没读完：从缓冲区中读一个字节返回。
        //如果已经读完了：就会调用底层的输入流（例如 FileInputStream）的 read(byte[] buffer) 方法；
        // 一次性从磁盘中读很多字节（最多8KB），存入缓冲区；然后再从这个缓冲区中读一个字节返回过来。
        //如果底层输入流返回 -1（即文件已经读完了），则 bis.read() 也返回 -1 表示 EOF。
        while((len = bis.read()) != -1) {
            bos.write(len);
        }
        System.out.println("Done");

        //外层的流的关闭可以自动关闭内层的流
        bos.close();
        bis.close();
    }
}
```

`BufferedInputStream`**原理**：

- 他有一个内部的`byte[]`缓冲区，默认大小8192字节
- 当调用`.read()`时，**如果缓冲区有数据**，就直接从缓冲区读；**如果缓冲区空了**，就从底层流中**读取一大块**（比如8192字节）放入缓冲区
- 类似地，`BufferedOutputStream`也是把数据先写入缓冲区，等缓冲区满了或调用`.flush()`时才真正写到文件。

---

从文本文件读取文本到控制台（一次读一行）：

```java
    @Test
    public void test1(){
        File file = new File("hello.txt");
        BufferedReader br = null;
        try {
            //一次性创建流+缓冲流
            br = new BufferedReader(new FileReader(file));
            String Line;//一次读取一行，直到文件结束
            while( (Line = br.readLine()) != null) {
                System.out.println(Line);
            }
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            try {
                if(br != null) br.close();
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }
```

## 转换流

转换流（Conversion Streams）是连接**字节流**和**字符流**之间的桥梁，它们的作用是：

>将“字节”转换成“字符”，或相反地将“字符”转换成“字节”。

如果能够确认文件的编码格式与你的程序使用的编码一致，那确实可以不显式使用转换流（InputStreamReader / OutputStreamWriter），直接用字符流 FileReader / FileWriter也是没问题的。

| 类名               | 方向         | 用途                                         |
|--------------------|--------------|----------------------------------------------|
| InputStreamReader  | 字节 → 字符  | 把字节输入流转换成字符输入流（读文件）      |
| OutputStreamWriter | 字符 → 字节  | 把字符输出流转换成字节输出流（写文件）      |

举一个例子：

```java
    /**
     * 将gbk格式的文件转换为utf-8格式的文件
     */
    @Test
    public void test2() throws IOException {
        File file1 = new File("GB18030.txt");
        File file2 = new File("GB18030_to_utf8.txt");

        FileInputStream fis = new FileInputStream(file1);
        InputStreamReader isr = new InputStreamReader(fis,"GB18030");//使用gbk格式解码

        FileOutputStream fos = new FileOutputStream(file2);
        OutputStreamWriter osw = new OutputStreamWriter(fos,"utf-8");//把解码得到的字符以utf8输出为字节

        //读写过程
        char[] cBuffer = new char[1024];
        int len;
        while((len = isr.read(cBuffer)) != -1){
            osw.write(cBuffer,0,len);
        }
        System.out.println("OVER");

        isr.close();
        osw.close();//关闭缓冲流后，缓冲的数据才会被真正写入
    }
```


注意，`OutputStreamWriter`**也是带缓冲的流**，只有当缓冲区满了或者调用`flush()`或者关闭流时，才会向硬盘中写入数据。`.write()`方法只是写到了它的缓冲区中，并不一定写到了磁盘中。`OutputStreamWriter.close()`方法会自动调用`flush()`方法，并且关闭底层的`FileOutputStream`。

但是`InputStreamReader`**本身不带缓冲区**，它只是一个“编码解码器”，用来把字节流转换为字符流。`BufferedReader`才带有缓冲读取功能。如果要提高读取的效率，应该给转换流外面套上一层缓冲流：

```java
BufferedReader br = new BufferedReader(
    new InputStreamReader(new FileInputStream("xxx.txt"), "UTF-8")
);
```

英文字符不会出现乱码问题。

---

**在内存中的字符问题**：内存中的长度与编程语言有关，Java的一个`char`**在内存中**占用两个字节。在硬盘中占用多少字节取决于编码方式。

## 对象流

将内存中定义的变量保存在文件中。

`ObjectInputStream`从字节流中中还原出对象

`ObjectOutputStream`将对象转换成字节流

- ObjectOutputStream 写入的内容**不是纯文本格式**，而是包含了**Java 序列化头信息 + 字符串内容**的**二进制数据**。

### 对象的序列化过程

对象的**序列化**机制（Object Serialization）是指将对象转换成一连串字节的过程，以便：

1. 保存到磁盘（例如写入文件）；
2. 通过网络传输；
3. 缓存；
4. 后续还原（反序列化）为原始对象。

在内存中的对象不能直接写到硬盘或通过网络发送，必须先转成可传输的格式（字节流），这就是序列化的目的。

**反序列化**：将字节流还原为对象

---

- 序列化的对象的类必须实现接口。
- 要求自定义类声明一个全局常量`static final long serialVersionUID = xxxxxxL`用来唯一地标识当前的类;虽然系统会自动生成UID，但是因为容易变化所以不推荐。
- 要求自定义类的各个属性也是可以序列化的
  - 基本数据类型默认可序列化
  - 引用数据类型也实现了接口Serializable

```java
import java.io.Serializable;

public class Person implements Serializable {
    String name;
    int age;
}
```

项 | 说明
|--------------------|--------------|
`transient`关键字 | 修饰的字段不会被序列化
静态字段 | `static`修饰的变量不会被序列化（它属于类，不属于实例）
父类未实现`Serializable`| 则父类的字段不会被序列化
`serialVersionUID` | 建议手动指定版本号，防止类结构变化导致反序列化失败