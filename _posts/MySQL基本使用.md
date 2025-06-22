---
title: MySQL基本使用
date: 2025-05-06 10:32:23
index_img:
categories: Database
--- 

# 数据库常识

## 数据库的关系模型

什么是关系数据库？

> 关系数据库是一种用于存储相互关联的数据点并提供数据点访问的数据库。它采用关系模型，直接、直观地在表中展示数据。
> 
> 在关系数据库中，表中的每一行都代表一条**记录**，每条记录都具有一个唯一的 ID（又被称为**键**），而表中的列则用于存储数据的**属性**——每条记录的每一个属性通常都有一个值。籍此，用户可以轻松在数据点之间建立关联。
> 
> 数据库的关系模型（Relational Model）是当前最广泛使用的数据模型，它由 IBM 的 E.F. Codd 在 1970 年提出。该模型使用**二维表格**来组织数据，具有强大的理论基础和良好的实用性。[^1]

举个例子：这是用来描述学生信息的关系表：

| student\_id (PK) | name    | age |
| ---------------- | ------- | --- |
| 1001             | Alice   | 20  |
| 1002             | Bob     | 21  |
| 1003             | Charlie | 19  |

- `student_id`是学生的**键**

这是可选课程表：

| course\_id (PK) | course\_name      | credits |
| --------------- | ----------------- | ------- |
| C001            | Database Systems  | 3       |
| C002            | Operating Systems | 4       |
| C003            | Networks          | 3       |

- `course-id`是课程的**键**

现在这些学生们需要选课，于是就有了选课表：

| student\_id (FK) | course\_id (FK) | grade |
| ---------------- | --------------- | ----- |
| 1001             | C001            | A     |
| 1001             | C002            | B     |
| 1002             | C001            | A-    |
| 1003             | C003            | B+    |

通过上表，借由学生id就可以查询到课程id进而查询课程信息，又可以查询到学生信息，这样就建立起了不同关系表之间的映射关系。

## 数据类型

关系数据库支持的数据类型主要包括数值、字符串、日期和时间、布尔、二进制。

> 通常来说，BIGINT能满足整数存储的需求，VARCHAR(N)能满足字符串存储的需求，这两种类型是使用最广泛的。

## SQL

SQL（Structured Query Language），即结构化查询语言，是一种用于**管理关系型数据库**的标准编程语言。不同的数据库都支持SQL，所以使用SQL这一种标准语言就可以操作不同的数据库。

除了 SQL 标准之外，大部分 SQL 数据库程序都拥有它们自己的私有扩展，这些扩展不能用在其他的数据库中。但是如果只使用SQL的核心功能的话，那不会有太大问题，常用的功能是相互兼容的。

SQL 定义了以下五种语句：

| 类别 | 关键作用                           | 常见关键字                   |
| ---- | ---------------------------------- | ---------------------------- |
| DDL  | 定义结构，通常由管理员执行         | `CREATE`, `DROP`, `ALTER`    |
| DML  | 操作数据，属于应用程序的日常操作   | `INSERT`, `UPDATE`, `DELETE` |
| DQL  | 查询数据，供用户查询使用，最为频繁 | `SELECT`                     |
| DCL  | 控制权限                           | `GRANT`, `REVOKE`            |
| TCL  | 管理事务                           | `COMMIT`, `ROLLBACK`         |


![](https://s21.ax1x.com/2025/05/03/pEbWCOe.png)

SQL 的关键字不区分大小写，但是对于表名和列名，不同数据库的规定不同，所以最好关键词一律大写。表名和列名一律小写。

# 关系模型构成


用于唯一区分不同记录的字段就是主键。不能使用业务相关的字段作为主键。

将数据与另一张表联系起来的字段称为外键。

索引：加快查询速度。

> 在关系数据库中，索引是用于提高查询效率的重要数据结构。索引可以让数据库在查询时不必遍历整个表，而是快速定位到符合条件的记录，从而显著提升检索速度。
>
> 然而，索引也有其局限性。索引的主要缺点是在执行插入、更新和删除操作时，数据库需要同时调整所有相关的索引，这会增加系统开销。索引数量越多，数据修改的速度就越慢。因此，在设计数据库时，必须在查询优化和修改性能之间权衡。

数据库会自动为主键创建索引，**主键索引的查询效率最高**，因为主键保证每条记录的唯一性。

唯一索引：可以通过命令为需要确保唯一的数据创建唯一索引，或者添加唯一约束。

# 基本的查询操作

## 基本查询

`SELECT <定义列的名字> FROM <表名>`

例如：`SELECT * FROM students;` 查询`students`表中的所有列

## 条件查询

`SELECT * FROM <表名> WHERE <条件表达式>`

使用`WHERE`指定搜索条件。条件表达式可以用

- `<条件1> AND <条件2>`表达满足条件1并且满足条件2
- `<条件1> OR <条件2>`表示满足条件1或者满足条件2。

应当注意，`AND`比`OR`有更高的运算优先级，某些情况下需要使用圆括号`()`指明运算先后顺序。

`BETWEENT AND`：查询位于两个值之间的数据，两边都是闭区间。

`IN`操作符用来指定条件范围，范围中的每个条件都可以进行匹配。例如：

```sql
SELECT cust_id, cust_name
FROM customers
WHERE cust_id IN (10001, 10003)
ORDER BY cust_name;
```

把 customers 表中的`cust_id`为 10001 **或** 10003 的数据查询出来。`IN`的作用实际上和`OR`没有差别，它的优点体现在：

- IN操作符的语法更清楚且更直观；
- 在使用IN时，计算的次序更容易管理（因为使用的操作符更少）；
- IN操作符一般比OR操作符清单执行更快；
- IN的最大优点是可以包含其他SELECT语句，使得能够更动态地建立WHERE子句。

还有一个关键字是`NOT`。WHERE子句中的NOT操作符有且只有一个功能，那就是否定它之后所跟的任何条件。例如：

```sql
WHERE vend_id NOT IN (1002, 1003)
```

筛选所有 vend_id 不是1002或1003的数据。NOT实际上是MySQL的特性：

{% note primary %}
MySQL支持使用NOT对IN、BETWEEN和EXISTS**子句**取反，这与多数其他DBMS允许使用NOT对各条件取反有很大的差别。 
{% endnote %}

## 排序

`SELECT id, name, gender, score FROM students ORDER BY score DESC, gender;`

`DESC`表示倒序，默认为`ASC`即升序。

`ORDER BY`要放到`WHERE`的后面。

## 分页查询

在 SQL 中，分页查询用于从大型数据集中按页提取一部分数据，以便在应用程序或网页上逐步显示。

分页实际上就是从结果集中“截取”出第M~N条记录。这个查询可以通过`LIMIT <N-M> OFFSET <M>`子句实现。我们先把所有学生按照成绩从高到低进行排序：

例如：

```sql
-- 查询第1页:
SELECT id, name, gender, score
FROM students
ORDER BY score DESC
LIMIT 3 OFFSET 0;
```

上面的语句表示：选取`students`中 id, name, gender, score的列，按照分数从高到低排序，**最多只取**前3条（第1页的3条记录，从第0条开始）。

所以`LIMIT`语句其实是一个**截取**的过程，输出的结果在外界看来好像实现了分页效果。

- LIMIT总是设定为pageSize；
- OFFSET计算公式为pageSize * (pageIndex - 1)。

如果查询结果为空，则会返回`Empty set`。`OFFSET`是可选的，默认为0。

## 聚合查询

对于统计总数、平均数这类计算，SQL提供了专门的聚合函数（也叫数据处理函数），使用聚合函数进行查询，就是聚合查询，它可以快速获得结果。

### 文本处理函数

- `Trim()`: 去除文本两端的空格，也有`RTrim()`去除右边的空格，`LTrim()`去除左边的空格。
- `Upper()`: 将文本转换为大写。
- `Left()`: 返回串最左边的字符
- `Length()`: 返回串的长度
- `Locate()`: 找出串的第一个字串
- `Lower()`: 将串转换为小写
- `Ltrim()`: 去掉串左边的空格
- `Right()`: 返回串右边的字符
- `Soundex()`: 返回串的SOUNDEX值
- `SubString()`: 返回串的字符

### 数据处理函数

MySQL 给出了5个以`row`为单元运行的聚集函数，如下表：

| 聚合函数  | 说明     |
| --------- | -------- |
| `COUNT()` | 返回指定列的行数 |
| `SUM()`   | 返回指定列值之和   |
| `AVG()`   | 返回特定数值列的平均值 |
| `MAX()`   | 返回指定列的最大值 |
| `MIN()`   | 返回指定列的最小值 |

> COUNT 有两种使用方式：
> - 使用 COUNT(*) 对表中行的数目进行计数，不管表列中包含的是空值（NULL）还是非空值
> - 使用 COUNT(列名) 对特定列中具有值的行进行计数，忽略 NULL 值。

经常与之结合使用的还有:

- `CEILING()`: 向上取整
- `FLOOR()`: 向下取整

例如`SELECT MAX(score), MIN(score) FROM students;`用于计算学生的最高分和最低分。


使用聚合查询时可以给结果起一个别名，使用`AS`标记：

```sql
SELECT COUNT(*) AS num FROM students;
```

返回结果：

```text
+-----+
| num |
+-----+
|  10 |
+-----+
1 row in set (0.024 sec)
```


聚合查询语句同样可以和条件语句等一起使用。

> 要特别注意：如果聚合查询的WHERE条件没有匹配到任何行，COUNT()会返回0，而SUM()、AVG()、MAX()和MIN()会返回NULL：

如果在列名的前面加上`DISTINCT`关键字，那么只会计算不同的数据，相同的数据不会被重复计算。

- `SELECT COUNT(DISTINCT department_id) FROM employees;`统计有多少个不同的 `department_id`。

但是`COUNT(DISTINCT *)`是非法的，因为`COUNT(*)`的计算结果固定为总行数。


# 分组

## GROUP BY

关键词：`GROUP BY`。分组操作常常需要把分组标准也加入表中，例如：

```sql
-- 第一列是性别，第二列是对应的数量，起一个新名字total
SELECT gender, COUNT(*) AS total
FROM students
GROUP BY gender;
```

查询结果：

```text
+--------+-------+
| gender | total |
+--------+-------+
| M      |     5 |
| F      |     5 |
+--------+-------+
2 rows in set (0.013 sec)
```

GROUP BY 子句指示 MySQL 分组数据，然后对每个组而不是整个结果集进行聚集。 

**注意**：

- 除聚集计算语句外，SELECT 语句中的每个列都必须在 GROUP BY 子句中给出。
- GROUP BY 子句必须出现在 WHERE 子句之后，ORDER BY 子句之前。 
- 在GROUP BY后面紧接`WITH ROLLUP`关键字可以在最后一行加上合计。

## HAVING

HAVING 关键字的作用是**对分好的组进行过滤**。之前我们使用 WHERE 对表中的行进行过滤，但是WHERE不能用于分组的情况，这时应该使用HAVING。他们的唯一区别是**WHERE过滤行，HAVING过滤组**。

例：

```sql
select vend_id, count(*) from products group by vend_id with rollup having count(*)>=3;
```

将`products`表中按照 vend_id 分组后，只保留行数大于等于3的组别。

## SELECT 子句顺序

1. SELECT
2. FROM
3. WHERE
4. GROUP BY
5. HAVING
6. ORDER BY
7. LIMIT

# 多表查询（联结表）

SQL最强大的功能之一就是能在数据检索查询的执行中联结（join）表。联结是利用SQL的 SELECT 能执行的最重要的操作，很好地理解联结及其语法是学习 SQL 的一个极为重要的组成部分。 

关键是，一个表中的相同数据出现多次决不是一件好事，此因素是关系数据库设计的基础。**关系表的设计就是要保证把信息分解成多个表，一类数据一个表**。各表通过某些常用的值（即关系设计中的关系（relational））互相关联。 

现在我们手上有两个表格：**班级表**

| id  | name   |
| --- | ------ |
| 1   | class1 |
| 2   | class2 |
| 3   | class3 |
| 4   | class4 |

和**学生表**

| id  | class_id | name | gender | score |
| --- | -------- | ---- | ------ | ----- |
| 1   | 1        | ming | M      | 90    |
| 2   | 1        | hong | F      | 95    |
| 3   | 1        | jun  | M      | 88    |
| 4   | 1        | mi   | F      | 73    |
| 5   | 2        | bai  | F      | 81    |
| 6   | 2        | bing | M      | 55    |
| 7   | 2        | ling | M      | 85    |
| 8   | 3        | xin  | F      | 91    |
| 9   | 3        | wang | M      | 89    |
| 10  | 3        | li   | F      | 85    |

这里的外键是`class_id`，它包含了班级表的主键值

连接是一种机制，用来在一条SELECT语句中关联表，因此称之为连接(JOIN)。采用连接的查询称之为**SQL JOIN连接查询**。[^2]


![联结的分类](https://s21.ax1x.com/2025/05/04/pEbjEAP.png)


## 等值联结

等值联结基于两个表之间的相等数据进行连接。应当确保所有的联结都有 WHERE 子句

```sql
select classes.name, students.name from classes, students where classes.id = students.class_id;
```

执行结果如下：

![](https://s21.ax1x.com/2025/05/17/pEvKwWt.png)


## INNER JOIN 内连接

对上述sql语句使用不同的语法，也可以实现相同的功能：

```sql
select classes.name, students.name from classes join students on classes.id = students.class_id;
```

此语句中的SELECT与前面的SELECT语句相同，但FROM子句不同。这里，两个表之间的关系是FROM子句的组成部分，以INNER JOIN指定。在使用这种语法时，联结条件用特定的ON子句而不是WHERE子句给出。传递给ON的实际条件与传递给WHERE的相同。

{% note secondary %}
ANSI SQL规范首选INNER JOIN语法。此外，尽管使用WHERE子句定义联结的确比较简单，但是使用明确的联结语法能够确保不会忘记联结条件，有时候这样做也能影响性能。
{% endnote %}

---

下面正式给出内连接的语法：

```sql
SELECT A.id, A.name, B.name
FROM classes A
JOIN students B
ON A.id = B.class_id;
```

当然，内连接也适用于只有一个表的情况。假如已知students表中一个学生的名字为 bai， 现在要查询和他在同一班级中的其他所有学生的信息，可以使用以下sql语句：

```sql
select p1.class_id, p1.name
from students as p1 join students as p2
on p1.class_id = p2.class_id
and p2.name = 'bai';
```

这里使用的是两个完全相同的表，但是使用了别名。

## OUTER JOIN 外部连接

左连接是**外部连接**的一种，考虑下面的业务情景：我们有一个表`customers`，其中存储了所有客户的id等基本信息。现在另有一个表`orders`记录了客户所下的订单信息。现在我们要查询客户的下单情况，包括没有下单的客户也要记录在内。

这时如果使用内连接，会直接忽略没有下单的用户。解决方法是使用外部联结，保留客户表中的所有记录，即使订单表中没有记录与之匹配。

与内部联结关联两个表中的行不同的是，**外部连接还包括没有关联行的行**。在使用OUTER JOIN语法时，必须使用RIGHT或LEFT关键字指定包括其所有行的表（RIGHT指出的是OUTER JOIN右边的表，而LEFT指出的是OUTER JOIN左边的表）。它们之间的唯一差别是所关联的表的顺序不同。

左连接：获取左表中的**所有记录**，即使在右表没有对应匹配的记录。

```sql
-- 左连接：显示A表所有记录，即使在B表中没有匹配
-- 没有匹配的项则以NULL值代替
SELECT A.col1, B.col2
FROM A
LEFT JOIN B ON A.id = B.a_id;
```

以学生表和班级表举例：将班级表作为左表，学生表作为右表，统计每个班中的学生情况。sql语句如下：


```sql
SELECT classes.name, students.name
FROM classes
LEFT JOIN students ON classes.id = students.class_id;
```

结果：

```text
+--------+------+
| name   | name |
+--------+------+
| class1 | mi   |
| class1 | jun  |
| class1 | hong |
| class1 | ming |
| class2 | ling |
| class2 | bing |
| class2 | bai  |
| class3 | li   |
| class3 | wang |
| class3 | xin  |
| class4 | NULL |
+--------+------+
```

`class4`没有学生，但是它已经出现在了表格中。这样能够找到没有关联的孤儿数据。

---

右连接的语法如下，和左连接基本相同：

```sql
-- 和左连接相反，返回 B 表所有记录，A 表不匹配的显示 NULL。
SELECT A.col1, B.col2
FROM A
RIGHT JOIN B ON A.id = B.a_id;
```
## CROSS JOIN 交叉连接

每一条 A 表记录都会和 B 表的每一条组合，结果是 A 表记录数 × B 表记录数（笛卡尔积），用得不多。

```sql
SELECT A.col1, B.col2
FROM A
CROSS JOIN B;
```

**MySQL 没有内建的 FULL JOIN（全连接）语法关键词**。想实现全连接，要用`LEFT JOIN + RIGHT JOIN + UNION`：

```sql
-- 模拟 FULL OUTER JOIN
SELECT A.id, B.id
FROM A
LEFT JOIN B ON A.id = B.id

UNION

SELECT A.id, B.id
FROM A
RIGHT JOIN B ON A.id = B.id;

```

# 组合查询

目的：通过操作符将多个 SELECT 查询的结果合并在一起。

## UNION

UNION 的作用相当于包含`WHERE...OR...`的语句，不过在复杂的情况下写起来更加简洁。使用 UNION 查询`class_id`为 1 或 2 的学生，可以使用以下sql语句：

```sql
select * from students 
where class_id = 1
union
select * from students
where class_id = 2;
```

这里包含了两个select语句，第一个查询所有`class_id`为1的学生，第二个查询所有为 2 的学生。`union`关键词将两次查询的结果直接合并（如果有重复的数据会自动去除）。上述语句相当于：

```sql
select * from students 
where class_id = 1 or class_id = 2
```

UNION几乎总是完成与多个WHERE条件相同的工作。它的一种变体是`union all`，与 union 的唯一区别是`union all`不会自动去重。

如果确实需要每个条件的匹配行全部出现（包括重复行），则必须使用UNION ALL而不是WHERE。 

---

**总结**：利用UNION，可把多条查询的结果作为一条组合查询返回，不管它们的结果中包含还是不包含重复。使用UNION可极大地简化复杂的WHERE子句，简化从多个表中检索数据的工作。

# 通配符

查询操作中的所有操作符都是针对已知值进行过滤的，有时候并不好用，例如，怎样搜索产品名中包含文本anvil的所有产品？用简单的比较操作符肯定不行，必须使用通配符。

{% note info %}
**通配符**（wildcard） 用来匹配值的一部分的特殊字符。

**搜索模式**（search pattern） 由字面值、通配符或两者组合构成的搜索条件。 
{% endnote %}

## LIKE操作符

LIKE 用于告诉 MySQL 接下来将会使用通配符进行匹配。LIKE 一定要搭配通配符使用， 否则 MySQL 会认为使用的是完全匹配而非模糊匹配。

### 百分号(%)通配符

百分号（%）通配符 ：**用于匹配多个字符**，例如：

```sql
SELECT prod_id, prod_name
FROM products
WHERE prod_name LIKE 'jet%';
```

这样就找出了找出所有以词`jet`起头的产品:

```text
+---------+--------------+
| prod_id | prod_name    |
+---------+--------------+
| JP1000  | JetPack 1000 |
| JP2000  | JetPack 2000 |
+---------+--------------+
2 rows in set (0.017 sec)
```

`'jet%'`可以这样理解：`%`代表的其实是一个字符串剩余的其他字符，整个字符串必须以`jet`开头。类似地，`%jet%`代表的是包含`jet`的字符串，因为`jet`的前后都有字符。注意`%`匹配的也可以是空字符和空格，但是不能匹配`NULL`。

### 下划线(_)通配符

下划线的用途与%一样，但下划线只匹配**单个字符**而不是多个字符。

---

通配符虽然使用方便，但是通配符搜索的速度比一般的操作符要慢，所以不可以滥用通配符。在能达到相同目的睇情况下，应该优先使用其他操作符。

# 正则表达式

正则表达式是用来匹配文本的特殊的串（字符集合），功能非常强大。。MySQL用WHERE子句对正则表达式提供了初步的支持，只是正则表达式的一个很小的子集。

**关键字**：`REGEXP`

## 字符匹配

```sql
SELECT prod_name
FROM products
WHERE prod_name REGEXP '.000'
ORDER BY prod_name;
```

这里使用了正则表达式`.000`，小数点表示*匹配任意一个字符*，因此 1000 和 2000 都会被匹配。

正则表达式匹配默认是不区分大小写【1的，如果需要区分，在正则表达式之前加上`BINARY`，例如`REGEXP BINARY 'JetPack .000'`。

## OR 匹配

搜索两个字符串之一，使用`|`。例如：`REGEXP '1000|2000'`匹配所有包含 1000 或 2000 的字符串。可以连续使用多个`|`。

## 匹配多个字符之一

`[]`可以匹配中括号中出现的字符之一：

```sql
SELECT prod_name
FROM products
WHERE prod_name REGEXP '[123] Ton'
ORDER BY prod_name;
```

结果：

```text
+-------------+
| prod_name   |
+-------------+
| 1 ton anvil |
| 2 ton anvil |
+-------------+
```

成功匹配 1 或 2 或 3。这是另一种形式的 OR 语句。`[^123]`可以匹配除了这三个字符以外的任何东西。

## 匹配范围

属于上一个例子的加强版：`[0-9]`匹配数字 0 到 9，不必把数字一个一个列举出来了。

`[a-z]`匹配任意英文字母。

## 特殊字符

匹配任意字符可以用小数点`.`，那匹配小数点呢？

对于这种特殊字符，需要在前面加上`\\`转义(escaping)来匹配它本身，和Java中的处理方法相同。

## 字符类

有预先定义待的字符集可供使用：

![](https://s21.ax1x.com/2025/05/11/pEXCWg1.png)

## 匹配多个实例

对匹配的次数加以指定。例如：

- `'[[:digit:]]{4}'` 匹配连在一起的任意4位数字。

![](https://s21.ax1x.com/2025/05/11/pEXCIHO.png)

## 定位符

用于匹配特定位置的文本。

- ^ 文本的开始
- $ 文本的结尾
- [[:<:]] 词的开始
- [[:>:]] 词的结尾

# 修改数据

CRUD：Create、Retrieve、Update、Delete

增、删、改、查

前面的`SELECT`用于查，增删改对应的操作是：

  - INSERT
  - UPDATE
  - DELETE

## INSERT

```sql
INSERT INTO 表名 (字段1, 字段2, ...) VALUES (值1, 值2, ...);
```

有默认值的字段在插入的时候可以不屑，自动附上默认值，但是没有默认值的话必须显式赋值。

可以同时使用多条INSERT语句，这时不同的语句之间用分号隔开。如果每条INSERT语句中的`表名(字段1, 字段2...)`相同，只需要在后面补充`VALUES`，并且用逗号隔开，这样可以提高数据库处理的性能，因为MySQL用单条INSERT语句处理多个插入比使用多条INSERT语句快。 

## UPDATE

```sql
UPDATE 表名 SET 字段1=值1, 字段2=值2, ... WHERE ...;
```

`WHERE`可以涵盖多个对象，同时修改多个对象的值。

如果不写`WHERE`条件，整张表的记录都会被修改。

## DELETE

```sql
DELETE FROM 表名 WHERE ...;
```

如果不写`WHERE`条件，整张表的记录都会被删除。

# MySQL 引擎

- InnoDB是一个可靠的事务处理引擎（参见第26章），它不支持全文
本搜索，默认使用此引擎；
- MEMORY在功能等同于MyISAM，但由于数据存储在内存（不是磁盘）
中，速度很快（特别适合于临时表）； 
- MyISAM是一个性能极高的引擎，它支持全文本搜索（参见第18章），
但不支持事务处理。 


# 视图

## 用法

在 SQL 中，视图（View）是一种**虚拟表**，它并不存储实际数据，而是基于一条 SELECT 查询语句动态生成的“结果集”。视图就是**可重用**的查询语句结果，它看起来像表，但不真正存储数据。

例如，现在我们要把每个学生所在班级的名字和学生的姓名放在一起，可以使用以下查询语句：

```sql
select c.name, s.name
from classes as c
join students as s on c.id = s.class_id;
```

查询结果：

| 班级   | 学生名   |
|--------|----------|
| class1 | 小明     |
| class1 | hong     |
| class1 | jun      |
| class1 | mi       |
| class2 | bai      |
| class2 | bing     |
| class2 | ling     |
| class3 | xin      |
| class3 | wang     |
| class3 | li       |
| class4 | Spike    |
| class4 | Elma     |
| class4 | Amy      |

现在，假如经常需要这个格式的结果。不必在每次需要时执行连接，只需创建一个视图，每次需要时使用它即可。为把此语句转换为视图，很简单，

- 在查询语句开头加上`create view 视图名 as`
- 这里有两个 name 字段，分别来自 classes 和 students 表，但列名都叫 name。
所以视图就会有两个叫 name 的列，这在 SQL 中是不允许的，解决方法是为两个字段分别起一个别名

```sql
create view class_student as
select c.name as class_name, s.name as student_name
from classes as c
join students as s on c.id = s.class_id;
```

以后要想查询班级名和学生名构成的表格，只需要调用以下语句

```sql
select * from class_student;
```

这样就完成了对固定连接查询结果的封装和重用。可以看出，视图极大地简化了复杂SQL语句的使用。利用视图，可一次性编写基础的SQL，然后根据需要多次使用。

除了重用以外，视图还有以下作用：

1. 使用表的组成部分而不是整个表;
2. 保护数据。可以给用户授予表的特定部分的访问权限而不是整个表的访问权限;
3. 更改数据格式和表示。视图可返回与底层表的表示和格式不同的数据。

最后一点可以举个例子来说明：

```sql
select concat(name, '(', gender, ')') as student
from students 
where gender = 'M'
order by name;
```

上述语句将所有的男性信息按照`名字(性别)`的格式重建，如下：

| student   |
|------------------|
| bing (M)         |
| jun (M)          |
| ling (M)         |
| wang (M)         |
| xQc (M)          |

如果需要的话也可以把这个表格封装成一个视图。

## 视图的规则和限制 

1. 视图必须唯一命名;
2. 为了创建视图，必须具有足够的访问权限;
3. 视图可以嵌套，即可以利用从其他视图中检索数据的查询来构造一个视图;
4. ORDER BY 可以用在视图中，但如果从该视图检索数据 SELECT 中也含有 ORDER BY ，那么该视图中的 ORDER BY 将被覆盖。 
5. 视图不能索引，也不能有关联的触发器或默认值。

## 管理视图

- 查看创建视图的语句：`show create view 视图名`
- 删除视图：`drop view 视图名`
- 更新视图时，可以先删除`deop`再创建`create`, 也可以直接使用`create or replace view`

# 存储过程

在 MySQL 中，存储过程（Stored Procedure）是一种预编译的 SQL 语句集合，可以像调用函数一样执行它。它通常用于封装重复执行的操作，比如一组查询、更新或逻辑判断等。

使用存储过程有3个主要的好处，即简单、安全、高性能。

## 创建

如果使用的是MySQL命令行，先创建一个存储过程：

```sql
DELIMITER $$

CREATE PROCEDURE GetNameById(
  IN custId INT
)

BEGIN
    SELECT * FROM students WHERE id = custId;
END $$

```

- `DELIMITER`的存在意义是改变 SQL 语句的“语句结束符”。考虑不使用`DELIMITER`的情况：

```sql
CREATE PROCEDURE demo()
BEGIN
    SELECT 'hello';
    SELECT 'world';
END;
```

每一个语句的结束处都必须有一个分号，其结果就是刚执行完`SELECT 'hello';`MySQL就认为语句已经结束了，从而报错。解决方法就是使用`DELIMITER`手动修改结束符，`DELIMITER $$`将结束符临时修改成`$$`，最后`END $$`把结束符改回默认的分号。

创建完毕之后，执行语句`call GetNameById(12);`，可以正确得到id为 12 的学生的信息。

## 参数问题

SQL 语句支持三种参数类型：

| 参数类型    | 说明                       |
| ------- | ------------------------ |
| `IN`    | 调用时传入的只读参数               |
| `OUT`   | 存储过程执行后返回的输出值            |
| `INOUT` | 可读可写，调用时传入，过程内可以更改，并返回结果 |

为了方便对存储过程传入参数或接收输出结果，往往需要定义变量。在MySQL中，所有的变量必须以`@`开头，定义变量使用`SET`关键字。

下面举一个使用了参数的存储过程的例子：根据传入的`id`输出对应学生的名字

```sql
DELIMITER //

create procedure get_student_by_id (
	in student_id INT,
	out student_name varchar(100)
)
begin
	select name into student_name
	from students
	where students.id = student_id;
end //

DELIMITER ;
```

调用该存储过程：

```sql
set @sname = '';

call get_student_by_id(1, @sname);

select @sname;
```

## 删除

```sql
DROP PROCEDURE 存储过程名
```

如果指定的存储过程不存在，那么该语句会报错。为了防止报错，可以使用`DROP PROCEDURE IF EXISTS`

# 触发器

MySQL 5 添加了对触发器的支持。

触发器是MySQL响应以下任意语句而自动执行的一条MySQL语句（或位于BEGIN和END语句之间的一组语句）：

- DELETE
- INSERT
- UPDATE

其他sql语句都不支持触发器。

## 如何使用

创建触发器需要给出四条信息：

- 唯一的触发器名（MySQL规定每个表中唯一，但是推荐在整个数据库范围内使用唯一的触发器名）； 
- 触发器关联的表； 
- 触发器应该响应的事件（DELETE、INSERT或UPDATE）； 
- 触发器何时执行（处理之前或之后）。

MySQL 规定**触发器中不能有任何返回结果集的行为**，包括：

- SELECT
- CALL 含有 SELECT 的存储过程
- 返回游标

关键字：`CREATE TRIGGER`。下面的sql脚本创建了一个触发器，每当`students`表发生插入操作时就会执行，执行的结果是向用于记录日志的表`student_insert_log`插入一条日志。

```sql
DELIMITER //

CREATE TRIGGER insert_test
AFTER INSERT ON students
FOR EACH ROW
BEGIN
    INSERT INTO student_insert_log (student_id)
    VALUES (NEW.id);
END;
//

DELIMITER ;
```

触发器中还有`NEW`和`OLD`这两个特殊的关键字：

- 在 INSERT 触发器中可以通过`NEW`访问被插入的行，例如`NEW.id`获取被插入记录的id值。
- 在 DELETE 触发器代码内，可以引用`OLD`访问被删除的行
- 在 UPDATE 触发器代码内，可以引用`OLD`引用原来的行，用`NEW`引用新的行

BEFORE 和 AFTER 的使用场景：BEFORE 用于对插入数据的数据验证，确保插入/更新/删除操作处理的是正确的数据。AFTER 用于在操作完成后执行日志记录等。

## 总结

- 应该用触发器来保证**数据的一致性**（大小写、格式等）。在触发器中执行这种类型的处理的优点是它总是进行这种处理，而且是透明地进行，与客户机应用无关。
- 触发器的一种非常有意义的使用是创建**审计跟踪**。使用触发器，把更改（如果需要，甚至还有之前和之后的状态）记录到另一个表非常容易。
- MySQL 触发器中**不支持** CALL 语句。这表示不能从触发器内调用存储过程。所需的存储过程代码需要复制到触发器内。

# 事务处理

## 概述

事务处理(Transaction Processing)一共有两个操作：提交(**COMMIT**)和回滚(**ROLLBACK**)。它可以用来维护数据库的完整性，保证成批的MySQL操作要么完全执行，要么完全不执行。

举个例子：现在我们用一个`orders`表用来记录客户订单的编号和下单日期，另一个表`orders_item`用来记录每个订单包含的物品、数量、价格的具体细节，这两个表通过主键`order_num`关联。显然，当我们收到新订单的时候，需要同时往两个表添加记录。但是如果两次插入操作中有某一个发生了错误，就会导致“空订单”的产生，这是不被允许的。

解决方法是将一个事务的所有操作统一管理起来。上述收到新订单后添加记录的就是一个事务，它包含两个操作：向`orders`插入订单编号和日期，向`orders_item`插入其它细节。

如果没有错误发生，将整组语句提交给（写到）数据库表。如果发生错误，则进行回退（撤销）以恢复数据库到某个已知且安全的状态。

## 常用术语

- 事务（transaction）指一组SQL语句； 
- 回滚（rollback）指撤销指定SQL语句的过程； 
- 提交（commit）指将未存储的SQL语句结果写入数据库表； 
- 保留点（savepoint）指事务处理中设置的临时占位符（place-holder），你可以对它发布回滚（与回退整个事务处理不同）。 

## 控制事务处理

MySQL 使用以下语句表明事务的开始：

```sql
START TRANSACTION
```

开启事务后，可以在事务处理内部使用ROLLBACK。ROLLBACK 命令用来撤销 INSERT, UPDATE, DELETE 语句。CREATE 和 DROP不能被回退。

在事务处理中，提交不会隐含地进行，必须显式调用 COMMIT。看下面的例子：从账户 A 扣 100 元，给账户 B 加 100 元 —— 中间任何一步失败都要回滚。

```sql
START TRANSACTION;

UPDATE accounts SET balance = balance - 100 WHERE id = 1;  -- A账户扣款
UPDATE accounts SET balance = balance + 100 WHERE id = 2;  -- B账户加款

-- 检查是否都成功执行
-- 可加上判断逻辑，比如检查余额 >= 0，再决定是否提交

COMMIT;  -- 提交事务

-- 若发生异常，如余额不足
-- ROLLBACK;  -- 回滚事务
```

实际上，如果第一条UPDATE语句成功执行，但是第二条出错，那么整个事务也会被自动撤销。这就保证了最后提交的结果一定是没有错误的。

当COMMIT或ROLLBACK语句执行后，事务会**自动关闭**（将来的更改会隐含提交）。

## 保留点

上面的回滚和提交的操作都针对整个事务。对于更复杂的事务而言，可能需要部分提交或者回滚。

为了支持回退部分事务处理，必须能在事务处理块中合适的位置放置占位符。这样，如果需要回退，可以回退到某个占位符。 

用法：`SAVEPOINT 保留点的名称`

保留点的名字不可以重复，在回滚时，MySQL根据名字精确判断该回滚到哪个位置。为了回滚到已知的保留点，使用以下语句

```sql
ROLLBACK TO 保留点的名字
```

保留点设置得越多越好，这样可以充分按照自己的意愿进行回退。在事务处理完成以后，所有的保留点会被自动释放。

## 更改默认提交行为

`autocommit`标志决定是否自动提交更改，0 代表手动提交，1 代表自动提交。使用`SET`修改即可。该标志的作用范围是一个连接内。


# 参考链接

[^1]: https://www.oracle.com/cn/database/what-is-a-relational-database/

[^2]: https://zhuanlan.zhihu.com/p/68136613