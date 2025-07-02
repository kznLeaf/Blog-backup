---
title: MyBatis-结果映射（resultMap）详解
date: 2025-05-18 22:32:05
index_img:
tags:
  - 数据库
categories: MyBatis
---

# MyBatis-结果映射（resultMap）详解

## 前言

看MyBatis网课的时候这一部分把我听红温了，遂自己梳理。

resultMap的作用是什么？如果JavaBean的属性名和数据库中的列名（字段名）刚好一一对应并且名字也相同，那么就不需要什么映射关系了，可以直接通过SQL查询出表中的所有信息。但是事实往往没那么理想，很多情况下这两个的名字并不相同，甚至不存在一一对应的关系；而且我们可能并不满足于仅查询一张表，而是要把两张表的关键信息合在一起。不管是那种情况，都需要手动处理映射关系。

## 目录

1. [MyBatis的结果映射（resultMap）详解](#mybatis的结果映射resultmap详解)
   1. [前言](#前言)
   2. [目录](#目录)
   3. [resultMap](#resultmap)
   4. [id和result](#id和result)
   5. [constructor](#constructor)
      1. [为什么需要构造方法](#为什么需要构造方法)
      2. [用法](#用法)
   6. [association](#association)
      1. [嵌套 Select 查询（按需加载）](#嵌套-select-查询按需加载)
         1. [概念](#概念)
         2. [实战](#实战)
         3. [反思](#反思)
      2. [嵌套结果映射](#嵌套结果映射)
   7. [resultSet](#resultset)

## resultMap

一个映射关系由`<resultMap>`标签包裹，而这个标签本身也有它的属性：

- `id`: `resultMap`标签的唯一标识。
- `type`: 返回值的 Java 全限定类名，或类型别名（在已经处理好别名的情况下）。
- `autoMapping `: MyBatis 用来控制是否自动映射数据库字段到 Java 对象属性的开关。`autoMapping="true"`时，MyBatis 会自动匹配列名与属性名相同的字段。匹配规则：
  - 数据库的列名与 Java 的属性名匹配（忽略大小写、支持下划线转驼峰）；
  - 没有被`<result>`明确指定
  - 必须依赖`<setting>`中的全局配置项：` <setting name="mapUnderscoreToCamelCase" value="true"/>`

## id和result

> id 和 result 元素都将一个列的值映射到一个简单数据类型（String, int, double, Date 等）的属性或字段。

两个元素的常用属性有：

- `property`: 映射到列结果的字段或属性。如果 JavaBean 有这个名字的属性（property），会先使用该属性。可以理解为“Java的实体类的属性”。
  - `id`元素的`property`往往取表中的主键对应的Java1实体类的属性名，例如`<id property="id" column="user_id" />`意思就是表的主键名字是`user_id`，与之对应的Java属性名为`id`。
  - `result`元素的`property`用来定义其他普通元素和表中的列的一一对应的映射关系。
- `column`：已经存在的数据库中的列名，如果有别名的话也可以是别名。
- `javaType`: Java类的全限定名，对于内置的类型别名，如`java.lang.String`，可以写为`String`。如果映射到一个 JavaBean，MyBatis 通常可以推断类型，此项忽略不写。


简而言之，`id`用于设置主键字段与领域模型属性的映射关系，`result`用于设置普通字段与领域模型属性的映射关系。

## constructor

### 为什么需要构造方法

首先明确一点，当我们执行查询操作的时候，MyBatis 不会直接返回数据库原始数据，它会把查询结果“映射”成**Java对象**返回给你。例如，`SELECT id, name FROM user;`这一sql语句，如果在MySQL中直接运行，返回的是一张表格，但你总不能让 Java 返回原始的 SQL 表格吧？你希望得到的是 **Java对象**，对应下面的接口：

```java
List<User> users = userMapper.selectAll();
```

MyBatis 会把那张表的每一行构造成一个 User 对象，然后放到 List 里返回。

对于一般的可变对象，JavaBean会提供一个`setter`方法，有了这个方法之后事情就很好办了，只需要这样：

```java
User u = new User();
u.setId(1);
u.setName("Alice");
```

MyBatis 先通过空参构造器构建一个`User`对象，然后通过 setter 为这个对象一一赋值。

但是，有时我们希望一个类的对象一旦创建就不能更改（即不可变类），例如用户的 id ，名字和年龄在特定时间段内是固定不变的，那么 JavaBean 如下：

```java
public class User {
    private final int id;
    private final String username;
    private final int age;

    // 全参构造器
    public User(String name, String username, int age) {
        this.id = id;
        this.username = username;
        this.age = age;
    }
    // 没有 setter 方法
}

```

这时想给对象的属性赋值，最直接的一种方式就是使用构造函数，在初始化的时候就赋好值。

因为 MyBatis 不能像原来一样调用 setter 来赋值，所以需要使用构造函数赋值。“赋值”这个操作也就是所谓的**注入**(injection)，官方文档是这样说的：

> MyBatis 也支持私有属性和私有 JavaBean 属性来完成注入，但有一些人更青睐于通过构造方法进行注入。

这句话的意思就是：*MyBatis 也可以通过反射直接修改私有字段的值，但这不总是最好的做法。很多程序员更喜欢只允许通过构造函数设置属性值*。

上面提到，MyBatis 也可以通过反射直接注入私有字段，不过有些程序员还是喜欢使用构造方法达成目的，而`constructor`就是为此而生的。

### 用法

假设我们的数据库中的字段为：user_id, user_name, user_age。

先把`User`需要用到的方法补充完整：

```java
public class User {
    private final int id;
    private final String username;
    private final int age;

    public User(@Param("id") int id,
                @Param("username") String username,
                @Param("age") int age) {
        this.id = id;
        this.username = username;
        this.age = age;
    }

    // getter 方法
    public int getId() { return id; }
    public String getUsername() { return username; }
    public int getAge() { return age; }
}
```

Mapper接口：`User selectUserById(int id);`

然后为上面那个`User`写一个XML映射吧：

```xml
<resultMap id="userMap" type="com.example.User">
<!-- 构造器 -->
    <constructor>
        <idArg column="user_id" name="id" />
        <arg column="user_name" name="username" />
        <arg column="user_age" name="age" />
    </constructor>
</resultMap>

<select id="selectUserById" resultMap="userMap" parameterType="int">
    SELECT user_id, user_name, user_age FROM users WHERE user_id = #{id}
</select>
```

- `column=数据库字段名`   
- `name=构造器参数名`
- `idArg`是主键，`arg`是普通字段
- 因为我们在接口中使用`@Param`显式为参数起名，所以`<constructor>`内部的顺序可以是任意的。

## association 

关联（association）元素处理一对一类型的关系。MyBatis 有两种不同的方式加载关联：

### 嵌套 Select 查询（按需加载）

#### 概念

- 嵌套 Select 查询：也叫**延迟加载**、**按需加载**。它是通过调用另一个 SQL 映射语句，来加载关联对象的。

**嵌套Select查询的特点**：按需加载，也就是“懒汉式”；执行效率稍慢。

假如我们现在有两个表：

```sql
users(id, name, dept_id)
departments(id, dept_name)
```

Java对象：

```java
class User {
    int id;
    String name;
    Department dept;  // 关联属性
}
```

假如我们定义一个`selectAllById`方法`User selectAllById(Integer id)`，User 的前两个属性都是基本数据类型，查询起来很简单。但是`dept`属于引用类型，**MyBatis 不会自动填充这种关联字段**，除非我显式地配置了关联查询。

按照嵌套 Select 查询的思路，我们可以在映射关系中将`dept`属性和`selectDeptById`方法关联起来，需要查询时就调用`selectDeptById`部门查询语句：

```xml
<!-- 定义映射关系 -->
<resultMap id="userMap" type="User">
  <id column="id" property="id"/>
  <result column="name" property="name"/>
  <association property="dept" javaType="Department"
               select="selectDeptById" column="dept_id"/>
</resultMap>

<!-- 部门查询语句 -->
<select id="selectDeptById" resultType="Department">
  SELECT id, dept_name AS deptName
  FROM departments
  WHERE id = #{id}
</select>
```

- `javaType`用于修饰`dept`属性，指定该属性的数据类型；
- `select`指定关联的是查询方法，且方法名为`selectDeptById`，意思就是`dept`这个属性是靠这个查询语句查出来的。
- `column`为数据库中的列名，这里表示将数据库中的这一字段作为参数**传递**给`selectDeptById`语句，由`#{id}`接收。`column`往往是多个表共有的列。

然后利用`resultMap`定义查询语句就OK：

```xml
<select id="selectAllById" resultMap="userMap">
SELECT * FROM users WHERE id = #{id};
</select>
```

这样依赖调用`selectAllById`就能获取用户的所有信息了。

#### 实战

好了下面是实战环节🥰

现在我的数据库中有两张表：

- sys_user

| uid | username | user_pwd |
|-----|----------|------------|
| 1   | zhangsan | 114411     |
| 2   | 测试     | 111        |
| 3   | CowBoy   | 2233       |

- sys_schedule

| id | uid | title     | completed |
|----|-----|-----------|--------|
| 1  | 1   | 学习Java  | 0      |
| 2  | 2   | 吃饭      | 1      |

目标：写一个查询语句，能够把所有用户本身的属性及其对应的事务一次性查询出来。

根据两张表的字段名，定义两个Java类：

- `User.java`

```java
public class User {
    private Integer uid;
    private String username;
    private String user_pwd;

    private Schedule schedule;

    public User() {
    }

    public User(Integer uid, String username, String user_pwd) {
        this.uid = uid;
        this.username = username;
        this.user_pwd = user_pwd;
    }

    public User(String username, String user_pwd) {
        this.username = username;
        this.user_pwd = user_pwd;
    }

    @Override
    public String toString() {
        return "User{" +
                "uid=" + uid +
                ", username='" + username + '\'' +
                ", user_pwd='" + user_pwd + '\'' +
                ", schedule=" + schedule +
                '}';
    }
}
```

- `schedule.java`

```java
public class Schedule {
    private Integer sid;
    private Integer uid;
    private String title;
    private Integer completed;

    public Schedule() {
    }

    @Override
    public String toString() {
        return "Schedule{" +
                "sid=" + sid +
                ", uid=" + uid +
                ", title='" + title + '\'' +
                ", completed=" + completed +
                '}';
    }
}
```

下面开始考虑接口。

`sys_user`记录了每一个用户的信息，`sys_schedule`记录了用户的事务，两张表通过主键`uid`关联起来。现在的目标是：写一个查询语句，能够把所有用户的所有自带属性及其对应的事务一次性查询出来。编写接口如下：

```java
    /**
     * 打印所有的用户及其对应的日程
     * @return 包含所有属性的用户实体类
     */
    List<User> getAllUserAndSchedule();
```

既然要查询日程，那就少不了查询日程的方法，所以在`ScheduleMapper.java`添加接口

```java
public interface ScheduleMapper {
    // 根据uid查询用户的事务
    Schedule getScheduleByUid(@Param("uid") Integer uid);
}
```

OK下面可以配置XML了。先从最简单的日程的查询开始，在`ScheduleMapper.xml`：

```xml
<!--Schedule getScheduleByUid(Integer uid);-->
<select id="getScheduleByUid" parameterType="Integer" resultType="Schedule">
    SELECT *
    FROM sys_schedule
    WHERE uid = #{uid}
</select>
```

这是很简单的根据`uid`查询指定日程的sql语句。

接下来在`UserMapper.xml`配置映射关系和查询语句：

```xml
<!--获取所有的用户及其实体类，测试associate标签-->
<!--  User getAllUserAndSchedule();-->
<resultMap id="ScheduleAndUser" type="User">
    <id column="uid" property="uid"/>
    <result column="username" property="username"/>
    <association property="schedule" select="com.kzn.mapper.ScheduleMapper.getScheduleByUid" column="uid"/>
</resultMap>

<select id="getAllUserAndSchedule" resultMap="ScheduleAndUser">
    SELECT * FROM sys_user LIMIT 3
</select>
```

注意：因为在映射关系中引用的`getScheduleByUid`方法的XML配置位于另一个XML文件中，所以这里对该方法的引用要使用`全类名.方法名`的形式。

所有的代码都准备完毕之后就可以测试了。准备单元测试：

```java
@Test
public void testGetUserAndSchedule() {
    List<User> allUserAndSchedule = userMapper.getAllUserAndSchedule();
    allUserAndSchedule.forEach(System.out::println);
}
```

运行结果（附带日志功能，这里我手动加了空行方便阅读）：

```text
DEBUG [main] - ==>  Preparing: SELECT * FROM sys_user LIMIT 3
DEBUG [main] - ==> Parameters: 
TRACE [main] - <==    Columns: uid, username, user_pwd
TRACE [main] - <==        Row: 1, zhangsan, 114411
DEBUG [main] - ====>  Preparing: SELECT * FROM sys_schedule WHERE uid = ?
DEBUG [main] - ====> Parameters: 1(Integer)
TRACE [main] - <====    Columns: sid, uid, title, completed
TRACE [main] - <====        Row: 1, 1, 学习Java, 0
DEBUG [main] - <====      Total: 1

TRACE [main] - <==        Row: 2, 测试, 111
DEBUG [main] - ====>  Preparing: SELECT * FROM sys_schedule WHERE uid = ?
DEBUG [main] - ====> Parameters: 2(Integer)
TRACE [main] - <====    Columns: sid, uid, title, completed
TRACE [main] - <====        Row: 2, 2, 吃饭, 1
DEBUG [main] - <====      Total: 1

TRACE [main] - <==        Row: 3, CowBoy, 2233
DEBUG [main] - ====>  Preparing: SELECT * FROM sys_schedule WHERE uid = ?
DEBUG [main] - ====> Parameters: 3(Integer)
DEBUG [main] - <====      Total: 0
DEBUG [main] - <==      Total: 3

User{uid=1, username='zhangsan', user_pwd='114411', schedule=Schedule{sid=1, uid=1, title='学习Java', completed=0}}
User{uid=2, username='测试', user_pwd='111', schedule=Schedule{sid=2, uid=2, title='吃饭', completed=1}}
User{uid=3, username='CowBoy', user_pwd='2233', schedule=null}
```

从日志中可以直观地发现一共执行了4次查询操作（每一组`==>`都对应一次查询请求）。

#### 反思

嵌套 Select 的复用性更很好，结构也很清晰，方便维护，但是它会导致所谓的**N+1查询问题**，结合上面的例子就很好说明：

- `1`，指的是操作者调用了一次查询语句`getAllUserAndSchedule`，操作者期望一次返回所有的用户及其日程
- `N`，为了完成`getAllUserAndSchedule`的查询命令，对于N个用户，MyBatis一共需要调用N次`getScheduleByUid`查询语句以获取日程信息。

宏观调用的一次加上MyBatis内部调用的N次，合起来就是N+1次。显然，这个问题会导致成百上千的 SQL 语句被执行，效率是非常低下的。

> 好消息是，MyBatis 能够对这样的查询进行**延迟加载**，因此可以将大量语句同时运行的开销分散开来。然而，如果你加载记录列表之后立刻就遍历列表以获取嵌套的数据，就会触发所有的延迟加载查询，性能可能会变得很糟糕。

所以还有另外一种方法——**嵌套结果映射**。

### 嵌套结果映射

- 嵌套结果映射：使用嵌套的结果映射来处理连接结果的重复子集。

嵌套结果映射的查询方式本质上还是MySQL的[多表查询](/2025/05/06/MySQL基本使用/#多表查询联结表)。仍然以上面的情况为例，要把用户的基本信息和日程放在一起并且保证用户的信息一个不少，那不就是外部链接查询吗：

```sql
SELECT user.uid, user.Username, schedule.title
FROM sys_user AS user
LEFT JOIN sys_schedule AS schedule
ON schedule.uid = user.uid
ORDER BY user.uid
LIMIT 3
```

（这是利用ORDER BY是因为不这样做的话输出会乱序）

所以只要把剩下的xml配置做好就行了，如下：

```xml
<!--嵌套映射方式-->
<!--List<User> getAllUserAndSchedule_mapping();-->

<resultMap id="ScheduleAndUserMapping" type="User">
    <id column="uid" property="uid"/>
    <result column="username" property="username"/>
    <!--第三列使用映射解决-->
    <association property="schedule">
        <!--把表中的title字段映射到Schedule的title属性-->
        <result column="title" property="title"/>
    </association>

</resultMap>

<select id="getAllUserAndSchedule_mapping" resultMap="ScheduleAndUserMapping">
    SELECT user.uid, user.Username, schedule.title
    FROM sys_user AS user
    LEFT JOIN sys_schedule AS schedule
    ON schedule.uid = user.uid
    ORDER BY user.uid
    LIMIT 3
</select>
```



测试结果：

```text
DEBUG [main] - ==>  Preparing: SELECT user.uid, user.Username, schedule.title FROM sys_user AS user LEFT JOIN sys_schedule AS schedule ON schedule.uid = user.uid ORDER BY user.uid LIMIT 3
DEBUG [main] - ==> Parameters: 
TRACE [main] - <==    Columns: uid, Username, title
TRACE [main] - <==        Row: 1, zhangsan, 学习Java
TRACE [main] - <==        Row: 2, 测试, 吃饭
TRACE [main] - <==        Row: 3, CowBoy, null
DEBUG [main] - <==      Total: 3

User{uid=1, username='zhangsan', user_pwd='null', schedule=Schedule{sid=null, uid=null, title='学习Java', completed=null}}
User{uid=2, username='测试', user_pwd='null', schedule=Schedule{sid=null, uid=null, title='吃饭', completed=null}}
User{uid=3, username='CowBoy', user_pwd='null', schedule=null}
```

查询出的数据只有三列：uid, username, title，没有查询的数据均显示为null，这样只查询了必要的数据。

而且，从日志可以发现全程只执行了一次查询操作，大大提高执行的效率。

## resultSet
{% note secondary%}
某些数据库允许存储过程返回多个结果集(resultSet)，或一次性执行多个语句，每个语句返回一个结果集。 我们可以利用这个特性，在不使用连接的情况下，只访问数据库一次就能获得相关数据。
{% endnote %}

比如，下面这个存储过程一次性执行了用户基本信息的查询和日程的查询：

```sql
DELIMITER //

CREATE PROCEDURE get_student_by_id (
    IN p_uid INT
)
BEGIN
    SELECT * FROM sys_user WHERE uid = p_uid;
    SELECT uid, title, completed FROM sys_schedule WHERE uid = p_uid;
END //

DELIMITER ;
```

在DBeaver中调用这个存储过程：

```sql
{ CALL schedule_system.get_student_by_id(1) }
```

得到下面的结果：

![第一张表](https://s21.ax1x.com/2025/05/19/pEvL4Cq.png)

![第二张表](https://s21.ax1x.com/2025/05/19/pEvLbb4.png)

这是两张独立的表，也就是两个**结果集**。

我们要考虑的是如何用MyBatis完成对存储过程的调用，以及调用完成之后如何使用这两个结果集。这样做的目的是**避免使用连接查询**，改用“多个独立结果集”，来减少数据库的负担。

---

定义以下接口：

```java
User getUserByResultSet(@Param("uid") Integer uid);
```

数据库中已经有存储过程`get_student_by_id(IN p_uid INT)`，想要使用这个存储过程，映射语句如下；

```xml
    <!--通过结果集查询-->
    <resultMap id="selectByResultSet" type="User">
        <!--定义第一个结果集-->
        <id property="uid" column="uid"/>
        <result property="username" column="username"/>
        <result property="user_pwd" column="user_pwd"/>

        <!--定义第二个结果集-->
        <!--column 表示第一个结果集中的字段（通常是主表字段），
             foreignColumn 表示第二个结果集中的字段（通常是子表字段）。-->
        <association property="schedule" javaType="Schedule" resultSet="resultSet2" column="uid" foreignColumn="uid">
            <!--这里必须和存储过程的第二个语句完全对应-->
            <id property="uid" column="uid"/>
            <result property="title" column="title"/>
            <result property="completed" column="completed"/>
        </association>
    </resultMap>

    <!--getUserByResultSet-->
    <select id="getUserByResultSet"
            resultMap="selectByResultSet"
            statementType="CALLABLE"
            resultSets="resultSet1,resultSet2">
        <!--#{传入参数名, jdbcType=类型, mode=模式}-->
        {CALL get_student_by_id(#{uid, jdbcType=INTEGER, mode=IN})}
    </select>
```

几个注意点：

- `association`的`column`表示**主结果集**（父结果集，也就是第一个结果集`sys_user`表）中的字段，`foreignColumn`表示**关联结果集**（子结果集，比如`sys_schedule`表）中的字段匹配。
- `resultSets`结果集的命名默认为`resultSet1, resultSet2, ...`，这里没有起别名，直接用默认的了

然后测试输出结果如下：

```text
DEBUG [main] - ==>  Preparing: {CALL get_student_by_id(?)}
DEBUG [main] - ==> Parameters: 1(Integer)
TRACE [main] - <==    Columns: uid, username, user_pwd
TRACE [main] - <==        Row: 1, zhangsan, 114411
DEBUG [main] - <==      Total: 1
TRACE [main] - <==    Columns: uid, title, completed
TRACE [main] - <==        Row: 1, 学习Java, 0
DEBUG [main] - <==      Total: 1
DEBUG [main] - <==    Updates: 0
User{uid=1, username='zhangsan', user_pwd='114411', schedule=Schedule{sid=null, uid=1, title='学习Java', completed=0}}
```

因为这里没有查询`sid`，所以显示为null。
