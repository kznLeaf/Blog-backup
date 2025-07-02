---
title: Redis实战篇-秒杀
date: 2025-06-30 23:49:11
index_img:
tags:
  - Redis
  - 中间件
categories: Redis
---


## 雪花算法&全局ID生成器

雪花算法（Snowflake） 是一种由 Twitter 提出的**分布式唯一 ID 生成算法**，用来在**高并发、分布式**系统中快速生成**全局唯一、趋势递增的 64 位整数 ID**。

雪花算法的结构：`long`类型，64位

```
0 | 41位时间戳 | 10位机器信息 | 12位序列号
```

- 序列号：同一毫秒内的自增序列号，比如同一毫秒内的第`12`个请求的序列号就是`12`，最多4096个序列号

用途：

- 分布式订单号，用户ID，消息ID
- 数据库主键ID
- 替代UUID

本项目用到的算法和雪花算法类似，如下：

![全局ID生成器](https://s21.ax1x.com/2025/06/28/pVnnElt.png)

完成的工具类：

```java
public class RedisIdWorker {

    public static final long BEGIN_TIMESTAMP = 1640995200L;
    private StringRedisTemplate stringRedisTemplate;

    // 形参用于区分不同的业务
    public long nextId(String keyPrefix) {
        LocalDateTime now = LocalDateTime.now();
        long nowSecond = now.toEpochSecond(ZoneOffset.UTC);
        long timestamp = nowSecond - BEGIN_TIMESTAMP;

        // 生成序列号
        String date = now.format(DateTimeFormatter.ofPattern("yyyy:MM:dd"));
        // 每次调用都会让 icr:keyPrefix:date 这个键的值加一，然后利用获取到的数字作为唯一 ID 的一部分
        long count = stringRedisTemplate.opsForValue().increment("icr:" + keyPrefix + ":" + date);

        // 移位 + 拼接
        return timestamp << 32 | count;
    }

}
```

上面的算法还有一个好处：全局 ID 的`key`是包含日期的，根据 key 就能统计每一天的总订单量。

## 优惠券秒杀下单

### 初步思路

优惠券分为两类：

- 平价券：可以任意抢购
- 特价券：限时秒杀

添加秒杀券的接口：

```java
/**
 * 新增秒杀券
 * @param voucher 优惠券信息，包含秒杀信息
 * @return 优惠券id
 */
@PostMapping("seckill")
public Result addSeckillVoucher(@RequestBody Voucher voucher) {
    voucherService.addSeckillVoucher(voucher);
    return Result.ok(voucher.getId());
}
```

需要注意两点：

- 秒杀是否开始或者结束
- 剩余库存是否充足

![流程图](https://s21.ax1x.com/2025/06/29/pVn0iN9.png)

**几个技巧**：

1. 扣减库存：

```java
// 扣减库存
boolean success = seckillVoucherService.update()
        .setSql("stock = stock - 1")
        .eq("voucher_id", voucherId).update();
```

等价于：

```sql
UPDATE seckill_voucher
SET stock = stock - 1
WHERE voucher_id = ?;
```

这样写常常用于高并发库存的场景，直接在数据库层面`stock = stock - 1`**一次性**完成读取旧值、计算新值、写入新值的操作，没有读取、修改、写入的空隙。

完整的查询秒杀券信息、更新秒杀券库存、创建订单并将订单写入库存的操作如下：

```java
@Service
public class VoucherOrderServiceImpl extends ServiceImpl<VoucherOrderMapper, VoucherOrder> implements IVoucherOrderService {
    @Autowired
    private ISeckillVoucherService seckillVoucherService;

    @Autowired
    private RedisIdWorker redisIdWorker;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Result secKillVoucher(Long voucherId) {
        // 查询基本信息
        SeckillVoucher voucherSeckill = seckillVoucherService.getById(voucherId);
        // 检查开始时间
        if (voucherSeckill.getBeginTime().isAfter(LocalDateTime.now())) {
            return Result.fail("秒杀还没开始");
        }
        // 检查结束时间
        if (voucherSeckill.getEndTime().isBefore(LocalDateTime.now())) {
            return Result.fail("秒杀已经结束");
        }
        // 判断库存是否充足
        if(voucherSeckill.getStock() < 1) {
            return Result.fail("库存不够");
        }
        // 扣减库存
        boolean success = seckillVoucherService.update()
                .setSql("stock = stock - 1")
                .eq("voucher_id", voucherId).update();
        if(!success) {
            return Result.fail("库存又不足");
        }
        // 创建订单
        VoucherOrder voucher = new VoucherOrder();
        long OrderId = redisIdWorker.nextId("order");
        voucher.setId(OrderId);
        Long userId = UserHolder.getUser().getId();
        voucher.setUserId(userId);
        voucher.setVoucherId(voucherId);
        // 写入数据库
        save(voucher);
        // 返回订单 ID
        return Result.ok(OrderId);
    }
}
```

因为这里涉及两个对数据库的直接改动操作（修改库存、增加订单），所以加上一个事务注解。
 
### 解决高并发问题

以上代码存在**超卖**现象，原理如下：

![超卖](https://s21.ax1x.com/2025/06/29/pVnByid.png)

某一时刻只剩下了一张券，此时并发的三个线程1、2、3同时查询库存，都发现仍有剩余，于是三个线程都去做减库存的操作，导致超卖。这属于并发安全问题。

解决方案：**加锁**。

锁分为两种：

- **悲观锁**：认为**并发冲突一定会发生**，所以每次访问数据时都先加锁，防止别人同时操作。保证绝对安全，适用于并发很高、冲突频繁的场景。代表：`Synchronized`
- **乐观锁**：认为**并发冲突是极少数的**，所以操作时不加锁，而是在提交时检测数据有没有被别人改动。先干后验证，如果发现有冲突就重新再来，性能更好。

乐观锁的关键是**判断有没有冲突发生**，常见的判断方式——

**版本号法**，思路是定义一个版本号，每当发生修改操作的时候就把版本号加一。在查询的时候不但查库存量还要查出来版本号，紧接着修改操作前再检查一下版本号和先前查出来的是否一致，不一致则说明有人趁这个空隙把数据库修改了，重新再来。更进一步的，我们其实连版本号都不需要，直接把库存量当成版本号来用，前后查两次库存用于比较就行了，如果一致就说明可以放心修改。

对应到代码中：

```java
// 扣减库存
boolean success = seckillVoucherService.update()
        .setSql("stock = stock - 1") // set stock = stock - 1
        .eq("voucher_id", voucherId).gt("stock", 0) // 再次检查，只要满足剩余的数量大于零即可
        .update();
```

## 一人一单

需求：修改秒杀业务，要求每个人对于同一种券只能下一单


### 检测是否重复下单

思路：查询`voucher_order`表中是否存在当前用户`user_id`当前券对应的`voucher_id `（即：`user_id`代表的用户是不是已经下单过了`voucher_id`代表的产品），如下：

```java
// 一人一单功能
Long userId = UserHolder.getUser().getId();
// 查询订单
int count = query().eq("user_id", userId).eq("voucher_id", voucherId).count();
if (count > 0) {
    return Result.fail("用户已经购买过了");
}
```

等价的SQL语句

```sql
SELECT COUNT(*) 
FROM voucher_order 
WHERE user_id = ? AND voucher_id = ?;
```

### 按用户ID加锁

1. **按用户ID为用户加锁**（考虑到网络延迟，如果第一次请求还没返回就发出第二个请求，在不加锁的情况下会导致重复下单），**同一个用户的请求串行执行，不同的用户请求并发执行**，这样就提升了性能。
2. 把同步锁放到整个函数的外面，确保事务提交之后再释放锁，这是为了**防止 Spring 事务失效**（这里使用的处理思路不是特拨号，因此存在 Spring 事务失效的问题）

Spring 事务失效的原因如下。

### Spring事务失效

Spring 的`@Transactional`是通过**代理**实现的: Spring 通过代理拦截方法调用，在方法执行前开启事务，执行后根据结果提交或回滚。

```
调用业务方法
    │
    ▼
是否有 @Transactional 注解？
    │是
    ▼
代理对象开始事务（获取连接、设置隔离级别等）
    │
执行目标方法
    │
是否抛出异常？
 ┌──────────┬────────────┐
 │ 否       │ 是         │
 ▼         ▼
提交事务   回滚事务
    │
方法返回或抛出异常
```

举个例子：

```java
// Spring 会为你的 Service 创建一个代理对象
VoucherOrderServiceImpl originalObject = new VoucherOrderServiceImpl();
VoucherOrderServiceImpl proxyObject = createProxy(originalObject); // 代理对象

// 代理对象的方法调用流程：
public Result createVoucherOrder(Long voucherId) {
    // 1. 开启事务
    TransactionManager.begin();
    try {
        // 2. 调用原始对象的方法
        Result result = originalObject.createVoucherOrder(voucherId);
        // 3. 提交事务
        TransactionManager.commit();
        return result;
    } catch (Exception e) {
        // 4. 回滚事务
        TransactionManager.rollback();
        throw e;
    }
}
```

更一般地说，对于如下方法

```java
@Transactional
public void transfer() {
    updateA();  // 扣钱
    updateB();  // 加钱
}
```

调用时 Spring 实际做了这些事：

1. 生成代理对象，调用该方法时进入拦截器
2. 拦截器通过事务管理器开启事务
3. 依次执行内部的方法A和方法B
4. 如果正常结束没有抛出异常，则提交事务
5. 如果抛出异常，则回滚事务

---

下面是一个事务失效的例子：在一个类里面定义两个方法A和B，方法A直接调用方法B，则方法B的事务不生效

```java
@Service
public class UserService {
    @Transactional
    public void methodA() {
        methodB(); // 调用自己类的另一个事务方法
    }

    @Transactional
    public void methodB() {
        // 不生效 ❌（没有代理）
    }
}
```

这是因为自调用时不会经过代理对象，导致事务注解失效。

解决方法有两种：

1. 把方法B拆分到另一个`@Service`标识的类中
2. 如果不拆分，可以使用`AopContext.currentProxy()`强行调用代理（不推荐用于复杂逻辑）

第一种解决方案示例：创建一个新的类`SubUserService`

```java
@Service
public class SubUserService {

    @Transactional
    public void methodB() {
        // 写入数据库、更新、回滚等
    }
}
```

向原来的类注入`SubUserService`

```java
@Service
public class UserService {

    @Autowired
    private SubUserService subUserService;

    public void methodA() {
        // ✅ 通过代理调用 methodB，事务才会生效
        subUserService.methodB();
    }
}
```

第二种解决方案示例：

```java
((UserService) AopContext.currentProxy()).methodB();
```

如果条件允许的话。第一种方案应该会比较好。第二种方案的代码有点复杂了。



