---
title: Redis-分布式锁
tags:
  - Redis
  - 中间件
date: 2025-07-01 9:40:51
index_img:
categories: Redis
hide: true
---

# 分布式锁

通过分布式锁，让多个jvm可以共享一个锁监视器。

**分布式锁是满足分布式系统下或集群模式下多进程可见并且互斥的锁**。

目的：在 Tomcat 服务器集群的条件下，保证秒杀服务的一人一单。适用于高并发缓存/数据库保护/多服务部署任务控制/多线程并发。

![](https://s21.ax1x.com/2025/06/29/pVn6Ggs.png)

## 简单实现

- 获取锁：`SETNX`添加锁，`EXPIRE`添加锁的过期时间，可以合并为`SET lock thread NX EX 时间`
- 释放锁：可手动释放，也可超时释放（利用锁的超时时间）

业务流程：

![](https://s21.ax1x.com/2025/06/29/pVn605F.png)

在判断`Boolean`类型变量是否为真时，推荐使用`Boolean.TRUE.equals(xxx)`，可以有效避免空指针异常，且语义清晰。

工具类：基于`SET NX`实现了获取锁和释放锁两个方法

```java
/**
 * <p>Project: hm-dianping</p>
 * <p>Date: 2025/6/29 19:54</p>
 * Description: 用于分布式锁的获取和释放
 */
public class SimpledRedisLock implements ILock {

    private StringRedisTemplate stringRedisTemplate;
    private String name;

    public static final String KEY_PREFIX = "lock:";

    public SimpledRedisLock(String name, StringRedisTemplate stringRedisTemplate) {
        this.name = name;
        this.stringRedisTemplate = stringRedisTemplate;
    }

    // 获取锁（即设置key）
    // key: 前缀+业务名
    // value：当前线程ID
    @Override
    public boolean tryLock(long timeoutSec) {
        long ThreadId = Thread.currentThread().getId();
        Boolean success = stringRedisTemplate.opsForValue().setIfAbsent(KEY_PREFIX + name, ThreadId + "", timeoutSec, TimeUnit.SECONDS);
        return Boolean.TRUE.equals(success);
    }

    // 释放锁
    @Override
    public void unclock() {
        stringRedisTemplate.delete(KEY_PREFIX + name);
    }
}
```

基于分布式锁重写一人一单：

```java
Long userId = UserHolder.getUser().getId();
// 创建锁对象
SimpledRedisLock simpledRedisLock = new SimpledRedisLock("order:" + userId, stringRedisTemplate);
//获取锁
boolean isLocked = simpledRedisLock.tryLock(1200);
if (!isLocked) {
    // 获取失败，返回错误或重试
    return Result.fail("不允许重复下单");
}
// 获取成功，手动释放锁
try {
    IVoucherOrderService proxy = (IVoucherOrderService) AopContext.currentProxy();
    return proxy.createVoucherOrder(voucherId);
} catch (IllegalStateException e) {
    throw new RuntimeException(e);
} finally {
    simpledRedisLock.unclock();
}
```

与`synchronized`块相比，这次需要手动创建和释放锁。更复杂，但是适用性更好，能够处理多台 Tomcat 集群的情形，因为 Redis 服务器是由多台 Tomcat 共享的，把锁的数据存储在 Redis 即可实现分布式锁。

## 分布式锁的误删问题

上面释放锁的方式：

```java
public void unclock() {
    stringRedisTemplate.delete(KEY_PREFIX + name);
}
```

并没有检查**当前线程是否是锁的持有者**，如果线程 A 获取锁之后，由于业务阻塞，直到锁超时这个业务也没有完成，那么锁会被强制释放。这时如果有另一个线程 B 就可以顺利拿到锁，此时实际上**同时运行了多个线程**。

如果 B 还没有释放锁的时候，线程 A 的业务突然完成了，那么它会不加思考直接删掉线程 B 的锁，导致锁失效。这个过程可能会不断重复，最终多个线程并发执行下单逻辑，**不能保证一人一单**。

## 解决分布式锁的误删问题（一）

### 思路

**解决方法**：为锁设置一个标识，被不同线程拿到的时候标识也不同，线程在释放锁之前检查一下当前锁的标识跟自己是否一致，不一致的话就停手

![解决误删问题](https://s21.ax1x.com/2025/06/29/pVngk6A.png)

流程图：

![流程图](https://s21.ax1x.com/2025/06/29/pVngZ0P.png)

**线程标识怎么选**？

一种想法是像刚才一样直接将当前线程的 ID 作为标识，这不太好，因为多台服务器上对应多个 JVM，每个JVM上又有很多线程，完全有可能出现两台 JVM 上的线程标识冲突的情况。

更好的选择是结合 UUID 使用。核心是保证**全局唯一**，而线程 ID 已经保证了**单 JVM 唯一**，只需要区分不同的 JVM 即可，而这可以通过在线程 ID 前拼接一个 UUID 实现，每一个 JVM 对应一个独一无二的 UUID。

### 生成不带横线的UUID

`java.util.UUID`的`randomUUID`方法获得的 UUID 是带分隔线的，在Redis 锁、数据库主键的情形下常常把分隔线去掉。

```java
public String getUUID(){
    return UUID.randomUUID().toString().replace("-", "");
}
```

### 代码实现

```java
/**
 * <p>Project: hm-dianping</p>
 * <p>Date: 2025/6/29 19:54</p>
 * Description: 用于分布式锁的获取和释放
 */
public class SimpledRedisLock implements ILock {

    private final StringRedisTemplate stringRedisTemplate;
    private final String name;

    private static final String KEY_PREFIX = "lock:";
    private final static String ID_PREFIX = getUUID(); // 每一个 JVM 只加载一次 SimpledRedisLock 类，只拥有一个 UUID 前缀

    public SimpledRedisLock(String name, StringRedisTemplate stringRedisTemplate) {
        this.name = name;
        this.stringRedisTemplate = stringRedisTemplate;
    }

    /**
     * 获取锁的方法。
     * key：KEY_PREFIX + 业务名
     * value：UUID + 线程 ID
     *
     * @param timeoutSec Redis 中该锁的 TTL
     * @return 是否成功获取锁
     */
    @Override
    public boolean tryLock(long timeoutSec) {

        String ThreadId = ID_PREFIX + Thread.currentThread().getId();

        Boolean success = stringRedisTemplate.opsForValue().setIfAbsent(KEY_PREFIX + name, ThreadId, timeoutSec, TimeUnit.SECONDS);
        return Boolean.TRUE.equals(success);
    }

    // 释放锁
    @Override
    public void unclock() {
        // 获取当前锁的标识
        String LockID = stringRedisTemplate.opsForValue().get(KEY_PREFIX + name);
        // 获取当前线程的标识
        String currentThreadId = ID_PREFIX + Thread.currentThread().getId();
        // 判断是否一致
        if (currentThreadId.equals(LockID)) {
            stringRedisTemplate.delete(KEY_PREFIX + name);
        }
    }

    /**
     * 返回不带横线的 UUID
     *
     * @return UUID
     */
    public static String getUUID() {
        return UUID.randomUUID().toString().replace("-", "");
    }
}
```


## 解决分布式锁的误删问题（二）

上面的思路还有一个问题：线程【判断锁的ID和自己是否一致】与【释放锁】是两个分开的操作，如果不能保证这两个操作的原子性，比如判断无误之后经历了较长的阻塞过程，以至于锁自身被超时强制释放，那么其他线程可以趁虚而入拿到锁。如果在这之后原来的线程突然脱离了阻塞状态，这时仍然会把别人的锁给释放掉。

破局的关键是：确保`unlock`方法的【判断】和【释放】这两个步骤是原子性的。


![误删的另一种情况](https://s21.ax1x.com/2025/06/30/pVnIITs.png)

### Redis的Lua脚本

```bash
redis.call('命令名称', 'key', '其他参数', ...)
```

用 Redis 命令执行脚本：

![](https://s21.ax1x.com/2025/06/30/pVnok6O.png)

完成的 lua 脚本

```lua
-- 获取锁的线程标识
local id = redis.call('get', KEYS[1])
-- 比较
if(id == ARGV[1]) then
    -- 释放锁
    redis.call('del', KEYS[1])
end
return 0
```

### Java执行lua脚本

`RedisTemplate.java`

```java
/*
    * (non-Javadoc)
    * @see org.springframework.data.redis.core.RedisOperations#execute(org.springframework.data.redis.core.script.RedisScript, java.util.List, java.lang.Object[])
    */
@Override
public <T> T execute(RedisScript<T> script, List<K> keys, Object... args) {
    return scriptExecutor.execute(script, keys, args);
}
```

修改后的`unlock`方法：

```java
private final static DefaultRedisScript<Long> UNLOCK_SCRIPT;

static {
    UNLOCK_SCRIPT = new DefaultRedisScript<>();
    UNLOCK_SCRIPT.setLocation(new ClassPathResource("unlock.lua"));
    UNLOCK_SCRIPT.setResultType(Long.class);
}

// 调用 lua 脚本释放锁
@Override
public void unclock() {
    stringRedisTemplate.execute(
            UNLOCK_SCRIPT,
            Collections.singletonList(KEY_PREFIX + name),
            ID_PREFIX + Thread.currentThread().getId());
}
```

在脚本中一次完成判断和释放这两个操作，在java中只需要一行代码调用脚本，保证了操作的原子性。现在就得到了一个相对完善的分布式锁。

## 误删问题总结

解决思路：

- 利用`SET NX EX`设置带超时时间的`key`，即为获取锁
- 获取锁时先原子性地判断锁标识和当前线程标识是否一致，如果一致就删除，为了保证原子性调用了`lua`脚本

特性：

1. 利用`SET NX`满足互斥性
2. 利用`EX`设置超时时间，避免业务阻塞的时候无法释放锁，提高安全性
3. 利用 Redis 集群保证高可用和高并发

## 现成的分布式锁

答案是 Redission。

添加配置类：

```java
@Configuration
public class RedissionConfig {
    @Bean
    public RedissonClient redissonClient() {
        Config redission = new Config();
        redission.useSingleServer().setAddress("redis://192.168.199.129:6379").setPassword("23525943");
        return Redisson.create(redission);
    }
}
```

创建锁对象：

```java
RLock lock = redissonClient.getLock("lock:order:" + userId); // 使用现成的 Redission
```

然后就可以`lock.tryLock();`获取锁，`lock.unlock();`释放锁了。

## 秒杀业务总结

其实秒杀业务就做了两件事：

1. 扣减数据库中保存的优惠券的剩余数量
2. 将用户抢到的优惠券的订单信息写入数据库

但是，因为秒杀业务存在两个限制：

- 库存绝不能超卖
- 一个用户只能下一单，不能重复下单

所以实现逻辑变得复杂了。 

## 异步优化


![](https://s21.ax1x.com/2025/06/30/pVnzQCF.png)

![右侧是Tomcat负责的部分](https://s21.ax1x.com/2025/06/30/pVnzYHx.png)

同样，判断和扣减库存的操作要确保月自行，所以还是写到一个lua脚本里面。

### 把优惠券信息也保存到Redis

添加一行代码即可

```java
@Service
public class VoucherServiceImpl extends ServiceImpl<VoucherMapper, Voucher> implements IVoucherService {

    @Resource
    private ISeckillVoucherService seckillVoucherService;
    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    @Override
    public Result queryVoucherOfShop(Long shopId) {
        // 查询优惠券信息
        List<Voucher> vouchers = getBaseMapper().queryVoucherOfShop(shopId);
        // 返回结果
        return Result.ok(vouchers);
    }

    @Override
    @Transactional
    public void addSeckillVoucher(Voucher voucher) {
        // 保存优惠券
        save(voucher);
        // 保存秒杀信息
        SeckillVoucher seckillVoucher = new SeckillVoucher();
        seckillVoucher.setVoucherId(voucher.getId());
        seckillVoucher.setStock(voucher.getStock());
        seckillVoucher.setBeginTime(voucher.getBeginTime());
        seckillVoucher.setEndTime(voucher.getEndTime());
        seckillVoucherService.save(seckillVoucher);

        // 保存到 Redis
        stringRedisTemplate.opsForValue().set(SECKILL_STOCK_KEY + voucher.getId(), String.valueOf(voucher.getStock()));

    }
}
```

### 基于Lua脚本判断库存、一人一单

判断库存是否充足、用户是否重复下单，仅当用户没有下单且库存充足的时候返回数字`0`同时把用户 ID 放入当前优惠券的`SET`集合。

相关的 Redis 命令：

```bash
SADD key member
SISMEMBER key member
```

如果`key`集合中存在指定的`member`，则返回`1`，否则返回`0`。 根据流程图容易写出脚本：

```lua
-- 优惠券id
local voucherId = ARGV[1]
-- 用户ID
local userId = ARGV[2]

local stockKey = 'seckill:stock:' .. voucherId
local orderKey = 'seckill:order' .. voucherId

if(tonumber(redis.call('get', stockKey)) <= 0) then
    return 1
end

--  判断用户是否下单
if(redis.call('sismember', orderKey, userId) == 1) then
    return 2
end

-- 扣库存
redis.call('incrby', stockKey, -1)
-- 下单
redis.call('sadd', orderKey, userId)

return 0
```

然后重新实现秒杀部分代码：

```java
@Override
@Transactional
public Result secKillVoucher(Long voucherId) {
    // 获取用户
    Long userId = UserHolder.getUser().getId();
    // 1. 运行脚本
    Long result = stringRedisTemplate.execute(SECKILL_SCRIPT, Collections.emptyList(), String.valueOf(voucherId), String.valueOf(userId));
    // 判断脚本返回的结果
    int r = result.intValue();
    if(r != 0) {
        return Result.fail(r == 1 ? "库存不足" : "不能重复下单");
    }
    // 下单逻辑：
    // TODO 保存到队列
    long orderId = redisIdWorker.nextId("order");

    return Result.ok(orderId);

}
```

截至目前完成了红框区域的代码（包括lua脚本）：

![](https://s21.ax1x.com/2025/06/30/pVuCEGT.png)

消息队列可以使用 RabbitMQ 或者 Kafka 来实现，此处不赘述。

