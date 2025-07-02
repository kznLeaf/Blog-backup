---
title: MyBatis配置过程和基本用法
date: 2025-05-14 19:34:18
index_img: https://s21.ax1x.com/2025/05/20/pExQR6x.jpg
tags:
  - 数据库
categories: MyBatis
--- 

# 什么是 MyBatis

MyBatis是一个Java持久化框架，它通过XML描述符或注解把对象与存储过程或SQL语句关联起来，映射成数据库内对应的纪录。[ 官方文档地址](https://mybatis.org/mybatis-3/zh_CN/index.html)

MyBatis 属于 SSM 框架的数据访问层，有了它就不必再写JDBC那种繁琐的操作数据库的代码，更简单易用。

```
Controller（控制层）       <-- SpringMVC
   ↓
Service（业务逻辑层）       <-- Spring
   ↓
DAO / Mapper（数据访问层） <-- MyBatis
   ↓
Database（数据库）
```

# 配置 MyBatis

1. 使用IDEA**创建**一个Maven工程，加入mybatis, junit, mysql-connector-j依赖：

```xml
<dependencies>
    <!-- https://mvnrepository.com/artifact/org.mybatis/mybatis -->
    <dependency>
        <groupId>org.mybatis</groupId>
        <artifactId>mybatis</artifactId>
        <version>3.5.16</version>
    </dependency>

    <!-- https://mvnrepository.com/artifact/junit/junit -->
    <dependency>
        <groupId>junit</groupId>
        <artifactId>junit</artifactId>
        <version>4.13.2</version>
        <scope>test</scope>
    </dependency>

    <!-- https://mvnrepository.com/artifact/com.mysql/mysql-connector-j -->
    <dependency>
        <groupId>com.mysql</groupId>
        <artifactId>mysql-connector-j</artifactId>
        <version>9.3.0</version>
    </dependency>
</dependencies>
```

2. 在resources目录下**创建**`mybatis-config.xml`配置文件（参数改成自己的）

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE configuration
        PUBLIC "-//mybatis.org//DTD Config 3.0//EN"
        "https://mybatis.org/dtd/mybatis-3-config.dtd">
<configuration>

    <!-- 设置实体类的别名，这样以后可以直接使用类名而不用再写全类名了 -->
    <typeAliases>
        <package name="com.kzn.pojo"/>
    </typeAliases>

    <environments default="development">
        <environment id="development">
            <transactionManager type="JDBC"/>
            <dataSource type="POOLED">
                <property name="driver" value="com.mysql.cj.jdbc.Driver"/>
                <property name="url" value="jdbc:mysql://localhost:3306/schedule_system"/>
                <property name="username" value="root"/>
                <property name="password" value="************"/>
            </dataSource>
        </environment>
    </environments>
    <mappers>
        <mapper resource="org/mybatis/example/BlogMapper.xml"/>
    </mappers>
</configuration>
```

3. 在java目录下**创建**pojo包和mapper包，分别存放表对应的实体类和处理映射关系的接口。存在这样的对应关系：`表——实体类——mapper接口——映射文件`。

然后创建映射文件。映射文件用于将我们创建的接口和sql语句建立联系。考虑到一个项目中会存在多个接口，因此在resources目录下创建mappers文件夹统一管理`.xml`文件：

![项目结构](https://s21.ax1x.com/2025/05/14/pEj8Phj.png)

4. **MyBatis 面向接口编程的两个一致**
   1. 映射文件的`namespace`和对应接口的**全类名**保持一致
   2. 映射文件中sql语句的id和mapper接口中定义的**方法名**一致

以上两点是如何体现的呢？先写`UserMapper.xml`配置（这里是sql的插入语句）：

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper
        PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "https://mybatis.org/dtd/mybatis-3-mapper.dtd">
        <!-- 命名空间是接口的全类名 -->
<mapper namespace="com.kzn.mapper.UserMapper">

    <insert id="insertUser">
        <!--这里就可以愉快地写 sql 语句啦-->
        <!-- 这里使用动态sql -->
        insert into sys_user (username, user_pwd)
        values (#{username}, #{user_pwd})
    </insert>
</mapper>
```

下面是对应的接口：

```java
public interface UserMapper {
    /**
     * 向表中插入新用户
     * @param user 新用户的实例
     * @return 对数据库影响的行数
     */
    int insertUser(User user);
}
```

写配置文件时就遵循了这两个原则：

- `namespace`改成对应接口的全类名：`com/kzn/mapper/UserMapper`
- `mapper`标签内部写映射语句，并且映射语句的标签名就是要对数据库进行的操作(`insert`)；`id`属性要和接口中定义的方法名(此处为`insertUser`)保持一致。

5. **向核心配置文件中引入映射文件**

`mappers`标签在刚才复制粘贴的模板中已经存在，只需要修改内容即可。

```xml
<mappers>
    <mapper resource="mappers/UserMapper.xml"/>
</mappers>
```

6. 测试功能是否可以正常使用

```java
public class TestMyBatis {
    @Test
    public void testSelect() throws IOException {
        //加载核心配置文件
        InputStream is = Resources.getResourceAsStream("mybatis-config.xml");
        // 获取SqlSessionFactoryBuilder （工厂模式）
        SqlSessionFactoryBuilder builder = new SqlSessionFactoryBuilder();
        // 获取SqlSessionFactory
        SqlSessionFactory factory = builder.build(is);
        // 获取SqlSession: Java程序和数据库之间的对话
        SqlSession sqlSession = factory.openSession();
        // 获取mapper接口的实现类的实例对象（底层采用代理模式）
        UserMapper userMapper = sqlSession.getMapper(UserMapper.class);
        // 然后利用接口的实现类对象，调用对应的方法
        int result = userMapper.insertUser(new User(null, "Origami", "123456"));
        // 提交事务
        sqlSession.commit();
        System.out.println(result);

        sqlSession.close();
    }
}
```

`factory.openSession();`可以传入`boolean`参数决定是否自动提交，`true`为开启自动提交，`false`为关闭自动提交。默认为`false`。

获取mapper接口的实现类的实例对象 之前的代码对于每个测试都是相同的，不妨把它封装成一个测试类`MyBatisUtils.java`：

```java
public class MyBatisUtils {
    private static final SqlSessionFactory sqlSessionFactory;

    static {
        try {
            InputStream is = Resources.getResourceAsStream("mybatis-config.xml");
            sqlSessionFactory = new SqlSessionFactoryBuilder().build(is);
        } catch (IOException e) {
            throw new RuntimeException("初始化SqlSessionFactory失败", e);
        }
    }

    // 获取 SqlSession（可以自动提交或手动提交）
    public static SqlSession getSqlSession(boolean autoCommit) {
        return sqlSessionFactory.openSession(autoCommit);
    }
    // 获取 SqlSession 默认手动提交
    public static SqlSession getSqlSession() {
        return getSqlSession(false);
    }
}
```

有了这样一个工具类以后，就可以在测试中直接使用

```java
try (SqlSession sqlSession = MyBatisUtils.getSqlSession()) {
    // 通过 sqlSession 获取接口的实现类的实例对象

    //调用接口中的方法

}
```

## 日志的配置

Mybatis 通过使用内置的日志工厂提供日志功能。内置日志工厂将会把日志工作委托给下面的实现之一：

- SLF4J
- Apache Commons Logging
- Log4j 2
- Log4j（3.5.9起废弃）
- JDK logging




这里使用的是 Log4j2 。

引入依赖：

```xml
<!-- https://mvnrepository.com/artifact/org.apache.logging.log4j/log4j-core -->
<dependency>
    <groupId>org.apache.logging.log4j</groupId>
    <artifactId>log4j-core</artifactId>
    <version>2.23.1</version>
</dependency>
```

向`log4j2.xml`中加入语句

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Configuration xmlns="http://logging.apache.org/log4j/2.0/config">

    <Appenders>
        <Console name="stdout" target="SYSTEM_OUT">
            <PatternLayout pattern="%5level [%t] - %msg%n"/>
        </Console>
    </Appenders>

    <Loggers>
        <Logger name="com.kzn.mapper.UserMapper" level="trace"/>
        <Root level="info" >
            <AppenderRef ref="stdout"/>
        </Root>
    </Loggers>

</Configuration>
```

其中`com.kzn.mapper.UserMapper`要换成自己接口的全类名。当然也可以将日志的记录方式从接口级别切换到语句级，只需将这一项改为对应方法的名称。`level`是日志级别，可以自己设置，日志的所有级别如下：

FATAL>ERROR>WARN>INFO>DUBUG

这时运行测试代码，得到的输出为：

```bash
DEBUG [main] - ==>  Preparing: insert into sys_user (username, user_pwd) values (?, ?)
DEBUG [main] - ==> Parameters: xQc(String), 123(String)
DEBUG [main] - <==    Updates: 1
1
```

# 查询

## 针对已知值的查询

目标：实现对`sys_user`表中的单个用户的查询和所有用户的查询。

如果查询的数据有多条，必须使用`List`接收。

### 基于 XML 的方式

#### 定义接口中的抽象方法

向`UserMapper.java`接口中添加如下代码

```java
    /**
     * 查询单个用户
     * @param uid 用户的唯一uid
     * @return 用户类的实例
     */
    User selectUserById(int uid);

    /**
     * 查询所有用户，返回用户组成的列表
     * @return 用户列表
     */
    List<User> selectAllUsers();
```

查询单个用户直接返回对应用户的`User`对象，查询所有用户就返回组成的列表。

#### XML 映射文件

在映射文件`UserMapper.xml`的`<mapper>`标签内部引入方法的映射：

```xml
    <!--User selectUserById(int uid);-->
    <select id="selectUserById" parameterType="Integer" resultType="com.kzn.pojo.User">
        SELECT *
        FROM sys_user
        WHERE uid = #{uid}
    </select>
    
    <!--List<User> selectAllUsers();-->
    <select id="selectAllUsers" resultType="com.kzn.pojo.User">
        SELECT *
        FROM sys_user
    </select>
```

第一个语句名为 selectUserById，接受一个 int（或 Integer）类型的参数，并返回一个 User 类型的对象。注意参数符号

```
#{id}
```

这就告诉 MyBatis 创建一个**预处理语句**（PreparedStatement）参数。这其实相当于JDBC中的预处理语句，当时我们是这样处理的：

```java
// 定义sql语句，参数值用？替代
String sql = "select * from sys_user where uid=?";
// 获取PreparedStatement 对象
PreparedStatement preparedStatement = connection.prepareStatement(sql);
// 设置参数值
// 第一个参数是编号，从 1 开始。第二个参数是赋值
preparedStatement.setInt(1, uid);
```

`select`元素允许你配置很多属性来配置每条语句的行为细节。这里用到的属性有：

- `id`: 在命名空间中唯一的标识符，一般写成方法名
- `parameterType`: 将会传入这条语句的**参数的类全限定名或别名**。这个属性是**可选**的，因为 MyBatis 可以根据语句中实际传入的参数计算出应该使用的类型处理器（TypeHandler），默认值为未设置（unset）。
- `resultType`: 期望从这条语句中**返回结果的类全限定名或别名**。 注意，如果返回的是集合，那应该设置为**集合包含的类型**（这里为`com.kzn.pojo.User`），而不是集合本身的类型。 `resultType`和`resultMap`之间只能同时使用一个。
  - MyBatis 中设置了默认的类型别名，例如`int`或`_int`都可正确地对应`Integer`。

#### 测试

得益于我们对`MyBatisUtils`工具类的封装，现在的测试代码会简洁很多：

对了，为了保证`userList.forEach(System.out::println);`能正确打印出用户所有字段的信息而不是具体的地址，在运行之前有必要重写`User`类的`toString()`方法。

```java
@Test
public void testSelectAllUsers() {
    try (SqlSession sqlSession = MyBatisUtils.getSqlSession()) {

        // 获取mapper接口的实现类的实例对象（底层采用代理模式）
        UserMapper mapper = sqlSession.getMapper(UserMapper.class);

        User user = mapper.selectUserById(1);
        System.out.println(user);

        List<User> userList = mapper.selectAllUsers();
        userList.forEach(System.out::println);

    }
}
```

打印结果：

```text
DEBUG [main] - ==>  Preparing: SELECT * FROM sys_user WHERE uid = ?
DEBUG [main] - ==> Parameters: 1(Integer)
TRACE [main] - <==    Columns: uid, username, user_pwd
TRACE [main] - <==        Row: 1, zhangsan, 114411
DEBUG [main] - <==      Total: 1
User{uid=1, username='zhangsan', user_pwd='114411'}
DEBUG [main] - ==>  Preparing: SELECT * FROM sys_user
DEBUG [main] - ==> Parameters: 
TRACE [main] - <==    Columns: uid, username, user_pwd
TRACE [main] - <==        Row: 1, zhangsan, 114411
TRACE [main] - <==        Row: 2, lisi, 223322
TRACE [main] - <==        Row: 3, CowBoy, 2233
TRACE [main] - <==        Row: 4, ddd, 1234
TRACE [main] - <==        Row: 5, Asuka, 456
TRACE [main] - <==        Row: 8, Spike, 123455
TRACE [main] - <==        Row: 11, Origami, 123456
TRACE [main] - <==        Row: 14, xQc, 123
DEBUG [main] - <==      Total: 8
User{uid=1, username='zhangsan', user_pwd='114411'}
User{uid=2, username='lisi', user_pwd='223322'}
User{uid=3, username='CowBoy', user_pwd='2233'}
User{uid=4, username='ddd', user_pwd='1234'}
User{uid=5, username='Asuka', user_pwd='456'}
User{uid=8, username='Spike', user_pwd='123455'}
User{uid=11, username='Origami', user_pwd='123456'}
User{uid=14, username='xQc', user_pwd='123'}
```

看起来比较长，这是因为我启用了日志打印功能。

### 基于注解的方式

```java
public interface UserMapper {
    @Select("SELECT id, username, password FROM users WHERE id = #{id}")
    User selectUserById(@Param("id") int id);

    @Select("SELECT id, username, password FROM users")
    List<User> selectAllUsers();
}
```

实现的功能和前面是一样的。

# 特殊 SQL

## 模糊匹配

上述查询操作中的所有操作符都是针对已知值进行过滤的，有时候并不好用，例如，怎样搜索产品名中包含文本anvil的所有产品？用简单的比较操作符肯定不行，必须使用通配符。MySQL 中使用`LIKE`关键字表名接下来要执行模糊匹配，与之对应的通配符有：

- 百分号`%`: 匹配多个字符（包括空字符和空格）
- 下划线`_`: 只匹配单个字符

在 MyBatis 中写sql语句时，下面这种赋值方式不可取：

```sql
select * from sys_user where username like '%#{username}'
```

因为这里的`#{}`被当成字符串处理了，无法引用传入的参数。如果把它换成`${}`，虽然可以运行，但是不推荐，因为这时存在**SQL注入**的问题。例如当 username=`"' or '1'='1"`时，sql语句实际上变成了

```sql
select * from sys_user where username like '%' or '1'
```

where 条件始终成立，这会导致整个表的数据都被返回。正确的做法是使用`#{}`配合文本处理函数`concat`：

```sql
select * from sys_user where username like concat('%', #{username})
```

这也是最常用的方式。

## 批量删除

考虑这样一个情景：用户在邮箱中一次性选中多个文件进行批量删除。用户按下删除按钮后，前端向后端发来被选中的序号构成的数组，后端根据这个数组执行数据库的删除操作。为此可以写出以下接口抽象方法：

```java
void deleteUsersByIds(@Param("ids") List<Integer> ids);
```

这里使用列表而不是数组储存数据，因为列表的话更具通用性。

重头戏是`.xml`配置文件。我使用的代码如下：

```xml
<delete id="deleteUsersByIds" parameterType="list">
    DELETE FROM sys_user
    WHERE uid IN
    <foreach collection="ids" item="id" open="(" separator="," close=")">
        #{id}
    </foreach>
</delete>
```

关键在于`foraeach`标签。`<foreach>`用于生成**动态SQL**，比如构造`IN (...)`子句，以支持批量操作（插入、删除、更新等）。

- `collection`: 指定要遍历的集合名称，也就是传入的集合名`ids`
- `item`: 遍历集合中的每个变量时使用的临时变量的名字，类似于增强型 for 循环。
- `open="xxx"`: 指定遍历开始前就输出的内容。因为我们要构造的是`IN(...)`字句，所以开始位置先放上一个左括号
- `separator="xxx"`: 每个元素之间的分隔符
- `close="xxx"`: 遍历结束后输出的内容，这里放一个右括号。

下面结合测试用例看一下效果：

```java
@Test
public void testDeleteUsersByIds() {
    // 删除uid为2，4的记录
    userMapper.deleteUsersByIds(List.of(2, 4));
    sqlSession.commit();
}
```

相当于执行`DELETE FROM sys_user WHERE uid IN(2, 4)`，打印结果：

```text
DEBUG [main] - ==>  Preparing: DELETE FROM sys_user WHERE uid IN ( ? , ? )
DEBUG [main] - ==> Parameters: 2(Integer), 4(Integer)
DEBUG [main] - <==    Updates: 2
```

成功删除两条记录。


# MyBatis 获取数据值的两种方式

## 细节

使用`#{}`参数语法时，MyBatis 会创建`PreparedStatement`参数占位符，并通过占位符安全地设置参数（就像使用`?`一样）。 这样做更安全，更迅速，通常也是首选做法，不过有时你就是想直接在 SQL 语句中直接插入一个不转义的字符串，这时候可以使用`${}`。

{% note secondary %}
`${}`的本质就是字符串的拼接`str1 + str2`，`#{}`的本质就是占位符赋值。
{% endnote %}

`${}`的使用情景主要是动态设置表名、列名、ORDER BY 动态排序等，例如：

```
ORDER BY ${columnName}
```

举个例子，如果你想`select`一个表任意一列的数据时，可以直接写成

```sql
@Select("select * from user where ${column} = #{value}")
User findByColumn(@Param("column") String column, @Param("value") String value);
```

`${column}` 引用一个动态的字段名，比如`uid`，`user_pwd`。这样就不必为每个字段都单独写一个查询方法了，这也适用于替换表名的情况。

但是，凡是使用`${}`出现的地方都有**SQL注入**的风险，如果要使用这种写法，因此，要么不允许用户输入这些字段，要么自行转义并检验这些参数。

---

`#{}`用于给参数赋值，MyBatis **默认只能识别单个参数**。

多个参数时，MyBatis会把这些参数放到一个map中，在没有显式命名参数的情况下：

- `${}`，以`param1, param2...`为键，参数为值  
- `#{}`，以`arg0, arg1...`为键，参数为值

此时最好在接口的方法中用`@Param`为参数**显式命名**，方便在sql语句中引用。这种情况下MyBatis创建的集合中实际上同时存在两种引用方式，默认和自定义都可使用，当然一般都是用自定义的名字。

对单参数和多参数各举一个例子：

```java
    /**
     * 查询单个用户
     * @param uid 用户的唯一uid
     * @return 用户类的实例
     */
    User selectUserById(int uid);

    /**
     * 检查用户名和密码对应的人是否存在（仅作为测试，实际数据库中不可能存储明文密码）
     * @param username 用户名
     * @param password 密码
     * @return 是否存在
     */
    boolean checkUserExists(@Param("username") String username, @Param("password") String password);
```

```xml
    <!--User selectUserById(int uid);-->
    <select id="selectUserById" parameterType="Integer" resultType="User">
        SELECT *
        FROM sys_user
        WHERE uid = #{uid}
    </select>

    <!-- boolean checkUserExists(@Param("username") String username, @Param("password") String password); -->
    <select id="checkUserExists" resultType="boolean">
        SELECT COUNT(*) > 0 <!--用于检测满足后面的记录是否存在，存在的话就返回true-->
        FROM sys_user
        WHERE username = #{username} AND user_pwd = #{password}
    </select>
```

`selectUserById`只有一个参数，所以无需显式命名，直接在配置文件中用`#{uid}`表示（这里的名字可以随便起，不一定是 uid ）。但是第二个方法传入了两个参数，显式命名为`username`和`password`，这样在xml配置文件中就可以使用`#{username}`和`#{password}`引用传入的值了。

---

还有一种情况是传入的参数刚好是某个实体类的类型，如果要使用sql访问实体类的属性值，使用`#{}`和`${}`都可。之前查询部分的代码就属于这种情况，不再赘述。

## 总结

**获取数据值的两种方式：**

- `${}`: 字符串拼接，不安全，少用
- `#{}`: 占位符赋值，安全，优先使用。

**接口方法中传入的参数也可以分成两大类：**

- 如果传入的参数是某个实体类的类型，sql语句可以直接使用`#{属性名}`访问某个实体类的值，如`insert into sys_user (username, user_pwd) values (#{username}, #{user_pwd})`
- 如果传入了一个或多个参数，建议都使用`@Param`显式命名参数，之后sql语句就可以直接使用别名来引用参数的值






