---
title: Redis-实现缓存机制
tags:
  - Redis
  - 中间件
date: 2025-06-29 23:13:11
index_img:
categories: Redis
---

## 缓存

缓存是数据交换的缓冲区，是存储临时数据的地方，读写性能较高。

目标：为下面这个控制器添加 Redis 缓存：

```java
/**
    * 根据id查询商铺信息
    * @param id 商铺id
    * @return 商铺详情数据
    */
@GetMapping("/{id}")
public Result queryShopById(@PathVariable("id") Long id) {
    return Result.ok(shopService.getById(id));
}
```

客户端发来的请求先发给 Redis，如果命中缓存则直接返回，如果没有命中才继续查询数据库，将查询到的数据写入Redis。

![缓存作用模型](https://s21.ax1x.com/2025/06/25/pVeRVaT.png)

根据id查询商铺信息时：

1. 用户提交商铺id，
2. 从Redis查询店铺缓存，判断缓存是否命中，
   1. 如果命中就直接返回
   2. 没有命中则继续根据id查询数据库
      1. 该店铺存在，将店铺数据写入Redis，返回商铺信息
      2. 该店铺不存在，返回404

```java
@Service
public class ShopServiceImpl extends ServiceImpl<ShopMapper, Shop> implements IShopService {

    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    // 根据店铺id从predis查询
    @Override
    public Result queryById(Long id) {
        String key = CACHE_SHOP_KEY + id;
        // 1. 从 Redis 查询商铺缓存，key是店铺的 id
        String shopJson = stringRedisTemplate.opsForValue().get(key);

        // 2. 判断是否存在

        // 3. 存在，返回
        if(StringUtils.hasLength(shopJson)){
            Shop shop = JSONUtil.toBean(shopJson, Shop.class);
            return Result.ok(shop);
        }

        // 4. 不存在，根据 id 查询数据库
        Shop shop = getById(id);
        if(shop == null) {
            // 5. 不存在，返回error
            return Result.fail("店铺不存在！");
        }
        // 6. 存在，把数据写入 Redis 然后返回
        stringRedisTemplate.opsForValue().set(key, JSONUtil.toJsonStr(shop));
        return Result.ok(shop);
    }
}
```

## 缓存更新

- Redis内存淘汰机制，内存不足的时候自动淘汰部分数据，一致性较差
- 超时删除：为缓存的数据添加TTL时间，到期后自动删除缓存，每次查询都更新缓存。一致性一般，如果缓存时间到期前数据库的数据又发生了变化还会造成脏读。
- 主动更新：在业务逻辑上，每次修改数据库的时候都更新缓存，一致性好

最常用的方案：

1. 由缓存的调用者，在更新数据库的同时更新缓存：**更新数据库的时候让缓存失效，查询时再更新缓存**。
2. 如何保证缓存与数据库操作的同时成功或失败：
   1. 单体系统，把缓存和数据库操作放到同一个事务里
   2. 分布式系统，利用TCC等分布式事务方案。 
3. 操作数据库和删除缓存的顺序：更推荐先操作数据库，再删除缓存

对于低一致性需求，使用Redis自带的内存淘汰机制即可；对于高一致性需求，用主动更新，并以超时剔除作为兜底方案。

原版：

```java
/**
    * 更新商铺信息
    * @param shop 商铺数据
    * @return 无
    */
@PutMapping
public Result updateShop(@RequestBody Shop shop) {
    // 写入数据库
    shopService.updateById(shop);
    return Result.ok();
}
```

修改后的实现类：

```java
@Override
@Transactional(rollbackFor = Exception.class) 
public Result update(Shop shop) {
    Long id = shop.getId();
    if (id == null) {
        return Result.fail("update店铺不存在");
    }
    // 更新数据库；删除缓存
    updateById(shop);
    stringRedisTemplate.delete(CACHE_SHOP_KEY + id);
    return Result.ok();
}
```

## 缓存穿透

**含义**：客户端请求的数据在缓存中和数据库中都不存在，这些请求都会传给数据库，这些请求都会打到数据库，最后数据库返回一个null

解决方案：

1. **缓存空对象**
   - 思路主动在数据库里缓存一个null
   - 缺点：额外的内存消耗；可能造成短期的不一致
2. **布隆过滤器**
   - 在客户端和Redis之间再加一个过滤器
   - 缺点：实现复杂，可能误判

![布隆过滤器](https://s21.ax1x.com/2025/06/25/pVe5SjH.png)

### 基于缓存空对象防止缓存穿透

![流程图](https://s21.ax1x.com/2025/06/25/pVe5uuj.png)

两处改动：

1. 如果数据库查询的结果为空，则将空值写入Redis；
2. 如果Redis里没有查询到需要的店铺，则直接结束整个流程

```java
// 根据店铺id从predis查询
@Override
public Result queryById(Long id) {
    String key = CACHE_SHOP_KEY + id;
    // 1. 从 Redis 查询商铺缓存，key是店铺的 id
    String shopJson = stringRedisTemplate.opsForValue().get(key);

    // 2. 判断是否存在

    // 3. 存在，返回
    if (StringUtils.hasLength(shopJson)) {
        Shop shop = JSONUtil.toBean(shopJson, Shop.class);
        return Result.ok(shop);
    }

    // 如果获取到的值是手动设置的空字符串：
    if (shopJson != null && shopJson.isEmpty()) {
        return Result.fail("是空值");
    }

    // 4. 不存在，根据 id 查询数据库
    Shop shop = getById(id);
    if (shop == null) {
        // 5. 不存在，将空值写入 Redis
        stringRedisTemplate.opsForValue().set(key, "", CACHE_NULL_TTL, TimeUnit.MINUTES);

        return Result.fail("店铺不存在！");
    }
    // 6. 存在，把数据写入 Redis 然后返回
    stringRedisTemplate.opsForValue().set(key, JSONUtil.toJsonStr(shop), CACHE_SHOP_TTL, TimeUnit.MINUTES);
    return Result.ok(shop);
}
```

## 缓存雪崩

**含义**：再同一时段大量的缓存key同时失效，或者Redis服务器宕机，导致大量的请求到达数据库，带来巨大压力。

![缓存雪崩](https://s21.ax1x.com/2025/06/25/pVe5Rrd.png)

1. 给不同的 Key 的 TTL 增加随机值
2. 利用 Redis 集群提高服务的可用性
3. 给缓存业务增加降级限流策略
4. 给业务添加多级缓存

## 缓存击穿

缓存击穿(Cache Breakdown)也叫热点key问题，指的是：

{% note info %}
某个**热点 key**在缓存中突然失效（过期或被删除），而此时大量请求同时访问这个 key，导致这些请求直接打到数据库，造成数据库压力激增，甚至被击垮。
{% endnote %}

举个例子：假设系统中有一个商品详情页，每秒有成千上万的人访问`商品ID = 123`。开始为这个商品设置了 Redis 缓存，缓存时间是 5 分钟。正常情况，请求都从 Redis 获取数据，数据库很轻松。但是第五分零一秒时，这个缓存刚好过期，大量的请求**同时**到达，发现 Redis 没有缓存，于是所有的请求同时到达数据库。数据库一下子收到这么多的请求，响应会变慢或者直接宕机。

| 名称       | 说明                               |
| -------- | -------------------------------- |
| **缓存击穿** | **热点数据**在某一时刻失效，导致大量请求同时打到数据库        |
| **缓存穿透** | 请求的是**不存在的数据**，缓存和数据库都没有，导致每次都打数据库   |
| **缓存雪崩** | 大量缓存同一时间**集体过期**，导致大量请求打到数据库（击穿的扩大版） |

结果都是一样的：大量请求达到数据库，到数据库造成冲击。

---

**解决方案**：

1. 加互斥锁，最常用，只允许一个线程去数据库加载数据，其它线程等待或稍后重试。伪代码：

```java
if (redis.get(key) == null) {
    if (tryLock(key)) {
        // 查询数据库
        String data = db.query(key);
        redis.set(key, data, 5分钟);
        unlock(key);
        return data;
    } else {
        // 其它线程等待或稍后重试
        sleep(50ms);
        return redis.get(key);
    }
}
```

1. 逻辑过期，为存储的数据增加一个过期时间字段，形如

```json
{
  "data": {...},
  "expireTime": "2025-06-25 16:00:00"
}
```

- 如果当前时间 < expireTime，直接返回；
- 否则异步更新，并返回旧值，具体来说就是创建一个新的线程，由它专门负责查询数据库、更新缓存。


两种解决方案的示意如下

![2](https://s21.ax1x.com/2025/06/25/pVeokp8.png)
![对比](https://s21.ax1x.com/2025/06/25/pVeo31U.png)

## 基于互斥锁方式解决缓存击穿问题

### 思路

需求：修改根据 id 查询商铺业务，基于互斥锁的方式解决缓存击穿问题

![互斥锁](https://s21.ax1x.com/2025/06/28/pVnPpCT.png)

互斥锁用的是 Redis 中的`SETNX`:

```bash

  SETNX key value
  summary: Set the value of a key, only if the key does not exist
  since: 1.0.0
  group: string

```

- 获取锁：调用`SETNX`设置一个key，之后如果有别的线程尝试获取锁，`SETNX`返回的结果是0，即获取失败
- 释放锁：删除该key

核心思想：使用Redis分布式锁确保同一时间只有一个线程能够重建缓存，其他线程等待并重试。

```java
    /**
     * 尝试获取锁的方法
     *
     * @param key key
     * @return 是否获取成功
     */
    private boolean tryLock(String key) {
        Boolean flag = stringRedisTemplate.opsForValue().setIfAbsent(key, "", LOCK_SHOP_TTL, TimeUnit.SECONDS);
        return flag != null && flag;
    }

    /**
     * 删除锁的方法
     *
     * @param key 待删除的锁
     */
    private void unlock(String key) {
        stringRedisTemplate.delete(key);
    }

    public Shop queryWithMutex(Long id) {
        String key = CACHE_SHOP_KEY + id;
        // 1. 从 Redis 查询商铺缓存，key是店铺的 id
        String shopJson = stringRedisTemplate.opsForValue().get(key);

        // 2. 判断是否存在
        // 3. 存在，返回
        if (StringUtils.hasLength(shopJson)) {
            return JSONUtil.toBean(shopJson, Shop.class);
        }

        // 4. 实现缓存重建
        String lockKey = LOCK_SHOP_KEY + id;
        Shop shop = null;

        try {
            // 获取互斥锁，带超时机制
            long startTime = System.currentTimeMillis();
            long timeout = 5000; // 重试获取锁最多5秒超时

            while (!tryLock(lockKey)) {
                if (System.currentTimeMillis() - startTime > timeout) {
                    throw new RuntimeException("获取锁超时，key: " + lockKey);
                }
                Thread.sleep(50);
            }

            // 成功获取锁后，再次检查缓存（双重检查）
            shopJson = stringRedisTemplate.opsForValue().get(key);
            if (StringUtils.hasLength(shopJson)) {
                return JSONUtil.toBean(shopJson, Shop.class);
            }

            // 查询数据库
            shop = getById(id);
            if (shop == null) {
                // 5. 查询到的店铺不存在，将空值写入 Redis
                stringRedisTemplate.opsForValue().set(key, "", CACHE_NULL_TTL, TimeUnit.MINUTES);
                return null;
            }

            // 6. 存在，把数据写入 Redis 然后返回
            stringRedisTemplate.opsForValue().set(key, JSONUtil.toJsonStr(shop), CACHE_SHOP_TTL, TimeUnit.MINUTES);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt(); // 恢复中断状态
            throw new RuntimeException("线程被中断", e);
        } finally {
            // 确保释放锁
            unlock(lockKey);
        }

        return shop;
    }
```

### 为什么要做双重检查

- 第一重检查：获取锁之前检查 Redis 缓存
- 第二重检查：获取锁之后再次检查 Redis 缓存

假设有100个并发线程同时访问同一个过期的缓存key：

- 第一个线程获取到锁，开始查询数据库并重建缓存
- 其余99个线程在while循环中等待锁释放
- 第一个线程完成缓存重建后释放锁
- 其余99个线程依次获取到锁后，如果没有双重检查，都会再次查询数据库，产生大量并发查询

时序图如下：

```
时间线：缓存过期 → 并发访问
        ↓
线程1:  获取锁 → 二次检查(空) → 查DB → 写缓存 → 释放锁
线程2:  等待... → 获取锁 → 二次检查(有值) → 直接返回
线程3:  等待... → 获取锁 → 二次检查(有值) → 直接返回
...
线程N:  等待... → 获取锁 → 二次检查(有值) → 直接返回
```

其实也好理解：如果某个线程发现缓存已经过期了，就会尝试获取锁，如果没有拿到锁，那只能说明某个线程已经在执行查询数据库、更新 Redis 缓存的操作了。所以拿到锁之后要再检查一下。

具体来说，在第二次检查中：

- 如果拿到锁的线程会发现缓存是空的，这就让它意识到自己的职责正是查询和重建；
- 如果拿到锁的线程发现缓存已经被更新过了，这就告诉它有人已经把该做的事做完了，所以它直接拿来用就行。

这就是二重检查的意义，这是分布式锁场景下的重要优化。

### JMeter测试

测试参数：

![测试参数](https://s21.ax1x.com/2025/06/28/pVnFDNq.png)

![测试结果汇总](https://s21.ax1x.com/2025/06/28/pVnFr40.png)

误码率为0，吞吐量 208.6/sec，符合预期。

回到 IDEA 的控制台，可以看到全程只做了一次查询：

```
   : ==>  Preparing: SELECT id,name,type_id,images,area,address,x,y,avg_price,sold,comments,score,open_hours,create_time,update_time FROM tb_shop WHERE id=?
   : ==> Parameters: 1(Long)
   : <==      Total: 1
```

说明缓存起作用了。

## 基于逻辑过期方式解决缓存击穿问题

### 思路

与上一种方法的共同点是，这里也需要一个互斥锁。

不同点是，这次不为 Redis 里的 key 设置 TTL，而是手动清除过期的key，具体而言每个key存储的都是一个带有`Data`和`ExpireTime`字段的对象，从Redis获取到key之后在 Java 代码中比较`ExpireTime`和当前时间，判断是否过期。

**热点key是人为提前添加好的**，如果从 Redis 中没有查到 key，只能说明这个商品不属于我们关注的热点 key，直接返回null。正常情况下都会命中的。

在上一种方法里，如果一个线程获取不到锁，就一直阻塞式地等待直到拿到锁；在基于逻辑过期的思路中，如果某个线程发现自己获取不到互斥锁，那就不等了，直接返回过期数据。成功获取锁、并且通过双重检查的人会开启一个新线程去查询数据和更新缓存，自己继续返回旧数据，也不会等待，避免像上一种方法一样卡在这里。

![流程图](https://s21.ax1x.com/2025/06/28/pVnVC26.png)

### 细节

为了实现**无侵入**地引入 Redis 数据格式（过期时间 + 携带的数据），需要单独定义一个类：

```java
@Data
public class RedisData {
    private LocalDateTime expireTime;
    private Object data;
}
```

然后考虑怎么存储和读取`RedisData`对象。

1. 将`RedisData`对象存入Redis的方法：

```java
// 设置逻辑过期时间的方法
public void setLogic(String key, Object value, Long expireTimeLogic, TimeUnit timeUnit) {
    RedisData redisData = new RedisData();
    redisData.setData(value);
    redisData.setExpireTime(LocalDateTime.now().plusSeconds(timeUnit.toSeconds(expireTimeLogic)));

    stringRedisTemplate.opsForValue().set(key, JSONUtil.toJsonStr(redisData));
}
```

需要把`RedisData`对象先转换为 JSON 格式，再存进去。


2. 从 Redis 中获取并解析 JSON 对象的思路：先获取 JSON，再解析成指定类型

```java
// 获取 JSON 字符串
String latestShopJson = stringRedisTemplate.opsForValue().get(key);
// 将 JSON解析成指定的数据类型
RedisData latestRedisData = JSONUtil.toBean(latestShopJson, RedisData.class);
```

注意，这里只是转化成`RedisData`类型了，如果想从`RedisData`获取`Data`，类型为`JSONObject`，还需要再转化一次才行。假设`Data`字段的最终类型是`type`:

```java
JSONUtil.toBean((JSONObject) latestRedisData.getData(), type);
```


---

基于逻辑过期的方式需要**创建新线程**，这里推荐使用**线程池**，效率更高。

下面的代码创建一个固定大小为 10 的线程池，用于执行缓存重建任务，并将其保存在一个`static final`变量中，表示这是一个全局共享且不可更改的线程池。

```java
private static final ExecutorService CACHE_REBUILD_EXECTOR = Executors.newFixedThreadPool(10);
```


