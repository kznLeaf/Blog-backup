---
title: Java SE(1) 基本常识
date: 2025-03-22 16:18:54
index_img:
categories: Java SE
math: true 
---

学习顺序：javase、mysql、jdbc、javaweb、mybatis、springmvc、spring，这几样基本上就是学习java的骨架了。

# 变量与运算符

## 标识符的命名规范

- 包名：多单词组成时所有字母都小写 xxxyyyzzz
- 类名、接口名：多单词组成时，所有单词的首字母大写 XxxYyyZzz
- 变量名、方法名：多单词组成时，第一个单词首字母小写，第二个单词开始每个单词首字母大写age,name,bookName
- 常量名：所有字母都大写。多单词时每个单词用下划线连接 XXX_YYY_ZZZ

## 变量

变量（variable）定义：内存中的一个存储区域，该区域的数据可以在同一类型范围内不断变化。

构成：数据类型 变量名 = 变量值，例如：`int age = 10;`

java的变量按照数据类型分为：    

    基本数据类型（8种）：  

        整型：byte \ short \ int \ long  
        浮点型：float \ double  
        字符型：char  
        布尔型：boolean  

    引用数据类型（6种）：

        类（class）  
        数组（array）  
        接口（interface）  
        枚举（enum）  
        注解（annotation）  
        记录（record）

变量都有其**作用域**，只在其作用域内有效。

### 整型

byte \ short \ int \ long  分别占用1，2，4，8字节（有正负）。

| 数据类型  | 字节数 | 取值范围                                      | 默认值 |
|----------|------|---------------------------------|--------|
| `byte`   | 1    | `-128` ~ `127`                 | `0`    |
| `short`  | 2    | `-32,768` ~ `32,767`           | `0`    |
| `int`    | 4    | `-2,147,483,648` ~ `2,147,483,647` | `0`    |
| `long`   | 8    | `-9,223,372,036,854,775,808` ~ `9,223,372,036,854,775,807` | `0L`   |

- 定义`long`类型的变量，赋值时需要以“l”或“L”作为后缀。
- Java程序中变量通常声明为`int`。
- 整数常量**默认为int类型**。

### 浮点型

| 数据类型 | 字节数 | 取值范围 | 默认值 | 精度 |
|---------|------|-------------------------------------------|--------|------|
| `float`  | 4    | `±1.4E-45` ~ `±3.4028235E+38`  | `0.0f`  | 约 7 位 |
| `double` | 8    | `±4.9E-324` ~ `±1.7976931348623157E+308` | `0.0d`  | 约 15~16 位 |

- 定义`float`类型的变量，赋值时需要以“f”或“F”作为后缀。
- float的表示范围大于long，但是精度不高。
- Java的浮点型常量**默认为double型**。
- float、double不适用于不容许舍入误差的金融计算领域。如果需要精确数字计算或保留特定位数的精度，需要使用BigDecimal类。
- `IEEE 754标准`仍然不能实现“每一个十进制小数都对应一个二进制小数”，0.1+0.2不等于0.3

### 字符型

- 占用两个字节

字符型变量的三种表现形式：

1. 单引号`''`适用于**单个字符**
2. 直接使用Unicode值表示。例如`char c8 = '\u0043';`
3. 使用转义字符'\'将后面的字符转变为字符型常量。
4. ASCII码

### 布尔型

- 只有两个值：true、false，常常用在流程控制语句。
- 可以认为占4个字节（一般不谈布尔类型占用的空间大小）。具体来说：编译时不谈几个字节，但是JVM给boolean类型分配内存空间时，boolean类型的变量占据一个槽位（slot，等于4个字节）。

### 基本数据类型间的运算规则

1. **自动类型提升**：

规则：容量小的变量与容量大的变量做运算时，结果自动转换为容量大的数据类型。容量指可表示数据范围的大小。

byte--->short--->int--->long--->float--->double

- 特殊情况1：容量小于int做运算结果用int类型，否则报错，而且实际的开发中也基本用不上byte和short。
- 特殊情况2：char类型运算结果也用int类型，同上。

2. **强制类型转换**

规则：大范围类型转换为小范围类型。例如：

```Java

    double d1 = 12;
    int i2 = (int)d1;

```

### String类

1. String类属于引用数据类型，俗称字符串。
2. 可以使用一对双引号进行赋值。

String与基本数据类型间的运算：

1. 这里可以包含布尔变量在内共8种。
2. 只能做连接运算，用+。

## 运算符

### 逻辑运算符

| 逻辑运算符 | 名称 | 作用 | 示例 |
|------------|------|------|------|
| `&&` | 逻辑与（AND） | 只有两个操作数都为 `true` 时，结果才为 `true` | `true && false` → `false` |
| `\|\|` | 逻辑或（OR） | 只要有一个操作数为 `true`，结果就为 `true` | `true \|\| false` → `true` |
| `!` | 逻辑非（NOT） | 取反运算，将 `true` 变 `false`，反之亦然 | `!true` → `false` |
| `&` | 按位与（AND） | 与 `&&` 类似，但**不会发生短路** | `true & false` → `false` |
| `\|` | 按位或（OR） | 与 `\|\|` 类似，但**不会发生短路** | `true \| false` → `true` |
| `^` | 逻辑异或（XOR） | 只有两个操作数不相同时，结果才为 `true` | `true ^ false` → `true` |

- 逻辑运算符针对的是布尔型变量，结果也是布尔型。
- `&&`和`||`**具有短路特性**，即在某些情况下可以**提前确定最终结果**，从而跳过后续运算，提高效率并避免不必要的计算。例如，`A && B`只有当`A`为`true`时，才会计算`B`，如果`A`为`false`，那么结果必然为`false`，所以`B`会被直接跳过。对于`||`则反过来，如果`A`为`true`，那么不会计算`B`。

### 位运算符

难点、非重点

| 运算符 | 名称 | 作用 | 示例 |
|--------|------|------|------|
| `&`  | 按位与（AND） | 两个位都为 `1`，结果才为 `1` | `5 & 3` → `101 & 011 = 001` → `1` |
| `\|`  | 按位或（OR） | 只要有一个位为 `1`，结果就是 `1` | `5 \| 3` → `101 \| 011 = 111` → `7` |
| `^`  | 按位异或（XOR） | 两个位不同则为 `1`，相同则为 `0` | `5 ^ 3` → `101 ^ 011 = 110` → `6` |
| `~`  | 按位取反（NOT） | 0 变 1，1 变 0（取反补码） | `~5` → `~00000101` → `11111010`（即 `-6`） |
| `<<` | 左移（Left Shift） | 将二进制位左移 `n` 位，右侧补 `0` | `5 << 2` → `101` → `10100` → `20` |
| `>>` | 右移（Arithmetic Right Shift） | 保持符号位，左侧补 `1` 或 `0` | `-5 >> 2` → `11111011` → `11111110` → `-2` |
| `>>>` | 无符号右移（Logical Right Shift） | 左侧统一补 `0`，不保持符号位 | `-5 >>> 2` → `11111011` → `00111110`（即 `1073741822`） |

**案例**：如何交换两个int变量的值？String呢？

```Java
public class Main {
    public static void main(String[] args) {

        int m = 10;
        int n = 20;

        System.out.println("m=" + m + ", n=" + n);

        //声明一个临时变量
        int temp = m;
        m = n;
        n = temp;

        System.out.println("m=" + m + ", n=" + n);

    }
}
```

### 条件运算符

(条件表达式) ? 表达式1 : 表达式2

条件表达式的结果是布尔类型。

# 流程控制

## if-else

与C语言相同，不赘述。

如何从键盘获取不同类型的变量：使用Scanner类。Scanner类中提供了获取不同类型变量的方法，除了char，需要使用`scan.next().charAt(0)`

```java
//导包
import java.util.Scanner;
public class Main {
    public static void main(String[] args) {

        //提供（或创建）一个Scanner类的实例，这里创建了一个Scanner对象sc，用于接收用户的输入
        Scanner sc = new Scanner(System.in);

        //调用Scanner类中的方法，获取指定类型的变量，这里使用nextLine()读取整行文本
        String s = sc.nextLine();

        System.out.println("name=" + s);

        //关闭资源，调用Scanner类的close()
        scan.close();
    }
}    

```

## 获取随机数

可以使用Java提供的API：Math类的random()（不用额外导包），返回一个[0.0,1.0)范围内的double随机数。

进一步的可以得到其他范围的随机数，例如[0,100]

```Java
int num1 = (int)(Math.random()*101);
```

获取一个[a,b]范围的随机数：  `(int)(Math.random() * (b - a + 1)) + a;`

## switch-case

语法格式：
```Java
switch(表达式){

    case 常量1:
        //执行语句1
        break;
    case 常量2:
        //执行语句2
        break;
    ...
    default:
        //执行语句
        break;
}
```

- switch中的表达式只能是特定的数据类型：byte \ short \ char \ int \ 枚举(JDK5.0新增) \ String(JDK7.0新增)
- 开发中使用switch-case时，通常case匹配的情况都有限。
- default的位置是灵活的。

## 循环语句

共三种：for,while,do-while

循环的4个要素：

1. 初始化条件
2. 循环条件
3. 循环体
4. 迭代部分

### for循环

for(1;2;4){   
    3  
}

迭代部分含有多条语句时，可以用逗号连接。

```Java
public class Main {
    public static void main(String[] args) {
        /*
        输入两个正整数m和n，求最大公约数和最小公倍数。
         */
        int m = 12;
        int n = 20;
        int min = m<n?m:n;

        //最大公约数
        for(int i=min;i>=1;i--){
            if(n%i==0 && m%i==0){
                System.out.println("最大公约数"+i);
                break;
            }
        }
        //最小公倍数
        int max = m>n?m:n;
        for (int i=max;i<=m*n;i++){
            if(i%m==0 && i%n==0){
                System.out.println("最小公倍数为" + i);
                break;
            }
        }
        
    }
}
```

- 我们可以在循环结构中使用break，用于跳出循环结构。
- 循环条件不满足/循环体中执行了break

### while循环

1
while(2){  
    3  
    4  
}

练习：猜数字小游戏
```Java
import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        /*
        随机生成一个1到100以内的整数，用户输入一个整数，记录猜了几次才正确
         */
        //生成随机数
        int randomNumber = (int) (Math.random() * 100)+1;
        //记录尝试的次数
        int guessNumber = 1;
        //创建对象sc
        Scanner scanner = new Scanner(System.in);
        //输入数字
        System.out.println("Please enter a number between 1 and 100");
        int yourNumber = scanner.nextInt();
        //循环
        while(yourNumber != randomNumber){
            if(yourNumber > randomNumber){
                System.out.println("Your number is greater than random number");
            }
            else {
                System.out.println("Your number is less than random number");
            }
            guessNumber++;
            //重新输入数字
            System.out.println("Please try again");
            yourNumber = scanner.nextInt();
        }
        //结束游戏
        System.out.println("congratulations!you have tried " + guessNumber + " guesses");
        scanner.close();
    }
}
```

### do-while 循环
1  
do{   
    3  
    4  
}while(2);
  
执行过程：1 - 3 - 4 - 2 - 3 - 4 - ··· - 2

至少会执行一次循环体，用得相对来说比较少。

### “无限”循环结构

格式： while(true) 或 for(;;)，中途使用break跳出循环。

示例：九九乘法表

```Java
ublic class Main {
    public static void main(String[] args) {
        /*
        案例：九九乘法表
         */
        for(int i = 1; i <= 9; i++){

            for(int j = 1; j <= i; j++){
                System.out.print(i + "*" + j + "=" + i*j + "\t");
            }
            System.out.println();
        }
    }
}
```

### 案例
```Java
public class Main {
    public static void main(String[] args) {
        /*
        案例：找出100000以内的所有质数
         */
        long startTime = System.currentTimeMillis();
        for(int i=2;i<=100000;i++){

            boolean isFlag = true;

            for(int j=2;j<Math.sqrt(i);j++){
                if(i%j==0){
                    isFlag = false;
                    break;
                }
            }
            if(isFlag){
                System.out.println(i);
            }
        }
        long endTime = System.currentTimeMillis();

        System.out.println("time spend: " + (endTime - startTime));

    }
}
```

结果：`time spend: 35`，注意这里的Math.sqrt(i)可以大大提升运算速度，因为一个数的因数关于它的算术平方根对称。

# 数组

## 基础知识

多个相同类型数据按一定顺序排列的集合，并使用一个名字命名，通过编号统一管理。

Java中的**容器**：数组、集合框架：在**内存**中对多个数据的存储。

数组属于**引用数据类型**，声明格式：
```JAVA
    //如果已知初始值：
    int[] arr1 = {1,2,3,4,5};

    //如果未知初始值，需要动态创建：
    int[] arr = new int[5];
    //后续赋值时，直接引用元素，例如
    arr[0] = 10;
    arr[1] = 20;
    arr[2] = 30;
    arr[3] = 40;
    arr[4] = 50;

```

- 数组一旦初始化完成，其长度确定，并且无法更改。
- 内存中一整块连续的空间。
- 数组长度可以使用arr.length获取

**数组元素的默认初始化值**

- 整型：`0`
- 浮点型：`0.0`
- 字符型：`0`（对应`'\u0000'`）
- boolean型：`false`
- 引用数据类型：`null`

## 算法案例

### 生成回行数

```JAVA
import java.util.Scanner;

public class SpiralMatrix {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        System.out.print("请输入一个数字: ");
        int n = scanner.nextInt();
        scanner.close();
        
        int[][] matrix = new int[n][n];
        int num = 1, left = 0, right = n - 1, top = 0, bottom = n - 1;
        
        while (num <= n * n) {
            // 从左到右
            for (int i = left; i <= right; i++) matrix[top][i] = num++;
            top++;
            
            // 从上到下
            for (int i = top; i <= bottom; i++) matrix[i][right] = num++;
            right--;
            
            // 从右到左
            for (int i = right; i >= left; i--) matrix[bottom][i] = num++;
            bottom--;
            
            // 从下到上
            for (int i = bottom; i >= top; i--) matrix[i][left] = num++;
            left++;
        }
        
        // 打印结果
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                System.out.printf("%3d ", matrix[i][j]);
            }
            System.out.println();
        }
    }
}

```

###  数组的扩容
```JAVA
/**
 * Description:
 * 现有数组 int[] arr = new int []{1,2,3,4,5}
 * 将数组的长度扩容1倍，将10，20，30添加到数组中，如何操作？
 * @author ep19
 * @version 1.0
 * @since 2025/3/26 21:52
 */
public class expansion {
    public static void main(String[] args) {
        int[] arr = new int []{1,2,3,4,5};

        //扩容1倍容量
        int[] newArr = new int [arr.length*2];

        //复制到新的数组中
        for (int i = 0; i < arr.length; i++) {
            newArr[i] = arr[i];
        }

        //添加新的数字
        newArr[arr.length] = 10;
        newArr[arr.length+1] = 20;
        newArr[arr.length+2] = 30;

        //将新的数组地址赋值给原有的数组变量
        arr = newArr;

        for (int i = 0; i < newArr.length; i++) {
            System.out.print(newArr[i] + "\t");
        }

    }
}
```

### 查找

1. 线性查找：遍历数组返回索引 复杂度：O(N)
2. 二分法查找（适用于**有序**数组）复杂度：O(log₂N)

```JAVA
public class dichotomy {
    public static void main(String[] args) {
        int[] arr = new int[]{2,3,6,7,8,9,10,22};

        int target = 10;

        boolean flag = false;//是否找到了

        int head = 0;//默认的首索引
        int end = arr.length - 1;//默认的尾索引

        while (head <= end) {

            int mid = head + (end - head) / 2;

            if(target == arr[mid]) {
                System.out.println("found it, the index is " + mid);
                flag = true;
                break;
            }

            else if (target > arr[mid]) {
                head = mid + 1;
            } else {
                end = mid - 1;
            }

        }

        if (!flag) {
            System.out.println("not found");
        }

    }
}
```

### 排序算法

1. 时间复杂度：分析关键字的比较次数和记录移动的次数，记为$O(n)$
2. 空间复杂度：分析排序算法中需要多少辅助内存，记为$S(n)$
3. 稳定性：若两个值相等的A和B在排序后的前后顺序不变，则这种排序算法是稳定的

**冒泡排序**：

时间复杂度：$O(n^2)$

```JAVA
public class bubbling {
    public static void main(String[] args) {
        int[] arr = {5,7,2,33,55,43,22,4,9,1};

        //打印初始数组
        for(int k : arr) {
            System.out.print(k + "\t");
        }

        System.out.println();

        for (int i = 0; i < arr.length; i++) {

            for (int j = 0; j < arr.length - 1 - i; j++) {
                if(arr[j] > arr[j+1]){
                    int temp = arr[j];
                    arr[j] = arr[j+1];
                    arr[j+1] = temp;
                }
            }
            
        }
        //打印排序后的结果
        for (int k : arr) {
            System.out.print(k + "\t");
        }
    }
}
```

**快速排序**

时间复杂度： $O(n\log(n))$

## Arrays工具类

**判断两个数组是否相等**

位置：java.util
   
boolean equals(int[] a,int[] b) :比较两个数组的元素是否**依次相等**。相等时返回true。

```JAVA
import java.util.Arrays;

boolean isEquals = Arrays.equals(arr1,arr2);
```
**输出数组信息**

`System.out.println(Arrays.toString(arr1));`

**填充**

将数组中的所有元素填充为指定的数值，例如：`Arrays.fill(arr1,22);`

**排序**

`Arrays.sort(arr3);`，使用快速排序算法

数组的索引，表示数组元素距离首地址的偏移量，第一个元素地址与首地址相同，偏移量为0，索引是0

案例：

>  输入一个整型数组，数组里既有正数也有负数，数组中连续的一个或多个整数成一个子数组，每个子数组都有一个和，求所有子数组的和的最大值。要求时间复杂度为O(n)。

**卡丹算法**(Kadane's Algorithm)，用 `currentSum`记录以当前位置为结尾的子数组的最大和，`maxSum`记录所有子数组中的最大和。遍历数组，对于数组中的每个元素，最大子数组和只有两种可能：

1. `nums[i]`自己构成一个子数组，最大子数组和就是它自己
2. `nums[i]`与前面的最大子数组和相加之后，得到的结果才是最大子数组和

所以，`currentSum`每次都取以上两种情况中最大的一个。之后，更新`maxSum`，记录下这个最大值即可。实现的代码如下：

```JAVA
/**
 * Description:
 * 输入一个整型数组，数组里既有正数也有负数，数组中连续的一个或多个整数成一个子数组，每个子数组都有一个和，
 * 求所有子数组的和的最大值。要求时间复杂度为O(n)。
 * @author ep19
 * @version 1.0
 * @since 2025/3/27 21:31
 */
public class sum {
    public static void main(String[] args) {
        //创建数组
        int[] nums = new int[]{1,-3,-2,1,-1};

        int maxSum = nums[0];//子数组和的最大值
        int currentSum = nums[0];//当前的子数组的和

        for (int i = 1; i < nums.length; i++) {//注意i从1开始计数，而不是0
            currentSum  = Math.max(currentSum + nums[i], nums[i]);
            maxSum = Math.max(maxSum, currentSum);
        }

        System.out.println("maxSum is " + maxSum);

    }
}
```

卡丹算法只需要对数组进行一次遍历，因此时间复杂度是$O(n)$。
