---
title: MyBatis-缓存
date: 2025-05-20 13:32:42
index_img:
tags:
  - 数据库
categories: MyBatis
---



# MyBatis的缓存

参考链接：

[聊聊MyBatis缓存机制-美团技术团队](https://tech.meituan.com/2018/01/19/mybatis-cache.html)

[MyBatis用户指南](https://itmyhome.com/mybatis-pdf/MyBatis-3-User-Guide-Simplified-Chinese.pdf)

[Mybatis深入浅出之缓存机制](https://www.cnblogs.com/gavincoder/p/13977037.html)



## 一级缓存

### 使用

一级缓存默认开启，是sqlSession级别的。同一个 sqlSession 对象在执行查询时，如果执行过相同的 SQL 且参数也一样，MyBatis 会将结果缓存起来，后续再查相同内容时直接从缓存中取，而不是再访问数据库。

```java
SqlSession session = sqlSessionFactory.openSession();

User u1 = session.selectOne("getUserById", 1);
User u2 = session.selectOne("getUserById", 1);
```

`u1`正常查询数据库，`u2`直接从一级缓存中读取查询过的数据。

![一级缓存流程图](https://s21.ax1x.com/2025/05/20/pExKhgx.png)

每个SqlSession中持有Executor，每个Executor中有一个LocalCache。当用户发起查询时，MyBatis根据当前执行的语句生成MappedStatement，在Local Cache进行查询，如果缓存命中的话，直接返回结果给用户，如果缓存没有命中的话，查询数据库，结果写入Local Cache，最后返回结果给用户。

<!-- ![一级缓存时序图](https://s21.ax1x.com/2025/05/20/pExKIKK.jpg) -->

### 失效

一级缓存不是永久有效的，它在以下几种情况下会失效：

1. 不同的sqlSession。**每个sqlSession都有自己的一级缓存**，互不影响，不同的session不会共享缓存。
2. 执行了增删改操作。这些操作可能会修改数据，为了保证数据的一致性，MyBatis 会清除缓存。不管是否真的改动了数据库、也不管是否提交事务，一级缓存都会被清除。
3. 手动清除缓存，调用`session.clearCache()`清除一级缓存。
4. 同一条SQL但是查询参数不同。

**手动清除缓存测试**

```java
@Test
public void test1() {
    Student student = userMapper.getStudentById(1);
    System.out.println(student);
    sqlSession.clearCache();
    Student student2 = userMapper.getStudentById(1);
    System.out.println(student2);
}
```

运行结果：

```text
DEBUG [main] - ==>  Preparing: SELECT * FROM students WHERE id = ?;
DEBUG [main] - ==> Parameters: 1(Integer)
TRACE [main] - <==    Columns: id, class_id, name, gender, score
TRACE [main] - <==        Row: 1, 1, 小明, F, 100
DEBUG [main] - <==      Total: 1
Student{id=1, class_id=1, name='小明', gender='F', score=100}
DEBUG [main] - ==>  Preparing: SELECT * FROM students WHERE id = ?;
DEBUG [main] - ==> Parameters: 1(Integer)
TRACE [main] - <==    Columns: id, class_id, name, gender, score
TRACE [main] - <==        Row: 1, 1, 小明, F, 100
DEBUG [main] - <==      Total: 1
Student{id=1, class_id=1, name='小明', gender='F', score=100}
```

因为两次查询之间手动清除了缓存，所以第二次查询的时候仍然要连接数据库，发送sql语句至数据库进行查询。

**增删改清除缓存测试**

单元测试

```java
@Test
public void test2() {
    Student student = userMapper.getStudentById(1);
    System.out.println("第一次查询：" + student);

    int result = userMapper.deleteStudentById(12);

    Student student2 = userMapper.getStudentById(1);
    System.out.println("第二次查询：" + student2);
}
```

运行结果：

```text
DEBUG [main] - ==>  Preparing: SELECT * FROM students WHERE id = ?;
DEBUG [main] - ==> Parameters: 1(Integer)
TRACE [main] - <==    Columns: id, class_id, name, gender, score
TRACE [main] - <==        Row: 1, 1, 小明, F, 100
DEBUG [main] - <==      Total: 1
第一次查询：Student{id=1, class_id=1, name='小明', gender='F', score=100}
DEBUG [main] - ==>  Preparing: DELETE FROM students WHERE id = ?;
DEBUG [main] - ==> Parameters: 12(Integer)
DEBUG [main] - <==    Updates: 1
DEBUG [main] - ==>  Preparing: SELECT * FROM students WHERE id = ?;
DEBUG [main] - ==> Parameters: 1(Integer)
TRACE [main] - <==    Columns: id, class_id, name, gender, score
TRACE [main] - <==        Row: 1, 1, 小明, F, 100
DEBUG [main] - <==      Total: 1
第二次查询：Student{id=1, class_id=1, name='小明', gender='F', score=100}
```

可以清楚地看到，虽然删除操作并没有被提交，但是第二次查询还是要重新连接数据库。



## 二级缓存

一级缓存是 **SqlSession** 级别的缓存，每个 SqlSession 拥有自己的缓存。

二级缓存是 **namespace** 级别的缓存，**它是可以被多个 SqlSession 共享的缓存**。因为一个Mapper映射配置文件往往对应一个 namespace，所以也可以说它是  **Mapper** 级别的缓存。

![二级缓存流程图](https://s21.ax1x.com/2025/05/20/pExM3GR.png)

二级缓存开启后，同一个namespace下的所有操作语句，都影响着同一个Cache，即二级缓存被多个SqlSession共享，是一个全局的变量。

当开启二级缓存后，数据的查询执行的流程就是`二级缓存 -> 一级缓存 -> 数据库`，更新执行顺序：`数据库->一级缓存->二级缓存`。

### 二级缓存配置

MyBatis默认情况下只开启局部的session 缓存，二级缓存需要手动开启。

1. 在`<setting>`标签中设置`cacheEnabled`属性的值为`true`;
2. 在MyBatis的映射XML中配置cache：`<cache/>`;
3. 二级缓存必须在sqlSession关闭或提交后才有效；
4. 查询数据所转换的实体数据类型必须实现序列化接口`Serializable`。

完成上述配置之后，查询语句会默认使用缓存。效果如下：

- XML映射语句文件中的所有`select`都会被缓存，所有增删改关键字都会刷新缓存。
- 缓存会使用[LRU算法](https://leetcode.cn/problems/lru-cache/)来收回。
- 缓存没有刷新间隔，不会根据时间自动刷新。

二级缓存依赖于一级缓存，`sqlSession.close()`执行完，Mybatis会将一级缓存对象拷贝存储到二级缓存，然后二级缓存才会起作用。

测试代码：

```java
@Test
public void test3() throws IOException {
    // 1. 加载配置
    InputStream is = Resources.getResourceAsStream("mybatis-config.xml");
    SqlSessionFactory sqlSessionFactory = new SqlSessionFactoryBuilder().build(is);

    // 2. 创建两个 sqlSession 进行数据库操作

    SqlSession sqlSession1 = sqlSessionFactory.openSession();
    SqlSession sqlSession2 = sqlSessionFactory.openSession();

    CacheMapper sqlSession1Mapper = sqlSession1.getMapper(CacheMapper.class);
    CacheMapper sqlSession2Mapper = sqlSession2.getMapper(CacheMapper.class);

    // 第一次查询
    Student s1 = sqlSession1Mapper.getStudentById(1);
    System.out.println(s1);
    // 关闭一级缓存,将数据从内存存储到硬盘
    sqlSession1.close();
    // 第二次查询，相同 namespace 下查询，二级缓存命中
    Student s2 = sqlSession2Mapper.getStudentById(1);
    System.out.println(s2);
}
```

运行结果

```text
DEBUG [main] - Cache Hit Ratio [com.kzn.mapper.CacheMapper]: 0.0
DEBUG [main] - ==>  Preparing: SELECT * FROM students WHERE id = ?;
DEBUG [main] - ==> Parameters: 1(Integer)
TRACE [main] - <==    Columns: id, class_id, name, gender, score
TRACE [main] - <==        Row: 1, 1, 小明, F, 100
DEBUG [main] - <==      Total: 1
Student{id=1, class_id=1, name='小明', gender='F', score=100}
 WARN [main] - As you are using functionality that deserializes object streams, it is recommended to define the JEP-290 serial filter. Please refer to https://docs.oracle.com/pls/topic/lookup?ctx=javase15&id=GUID-8296D8E8-2B93-4B9A-856E-0A65AF9B8C66
DEBUG [main] - Cache Hit Ratio [com.kzn.mapper.CacheMapper]: 0.5
Student{id=1, class_id=1, name='小明', gender='F', score=100}
```

第二次查询使用了缓存，缓存命中率0.5.

注意：

- **二级缓存依赖于一级缓存写入**，不关闭sqlSession1，不会写入当前namespace的二级缓存，造成二级缓存失效。
- Mybatis二级缓存对象存储在**硬盘**中，因此需要namespace下实体对象序列化，如果不序列话运行会报错。


