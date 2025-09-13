---
title: Redis实战篇-探店
tags:
  - Redis
date: 2025-07-2 21:44:50
index_img:
categories: Redis
hide: true
---

## 查询blog内容

- tb_blog: 文字部分
- tb_blog_comments: 评论部分

easy！

```java
@Service
public class BlogServiceImpl extends ServiceImpl<BlogMapper, Blog> implements IBlogService {

    @Autowired
    private UserServiceImpl userServiceImpl;

    @Override
    public Result queryBlogById(Long id) {
        Blog blog = getById(id);
        if(blog == null) return Result.fail("博客不存在");
        Long userId = blog.getUserId();
        User user = userServiceImpl.getById(userId);
        blog.setName(user.getNickName());
        blog.setIcon(user.getIcon());
        return Result.ok(blog);
    }
}
```

## 点赞功能

目标：

- 实现一人**最多点一个赞**，再次点击**取消点赞**
- 如果已经点赞，则点赞按钮高亮显示，前端已经实现

实现步骤：

1. 给 Blog 类添加一个`isLike`字段用于记录当前访问的用户是否已经点过赞，利用 Redis 的 SET 集合判断是否点赞过。
2. 分页查询时，查询set集合有没有用户id，代表了用户是否已经点过赞，把结果赋值给`isLike`字段
3. 点击某一篇笔记的详情时，查询 set 集合有没有用户id，代表了用户是否已经点过赞，把结果赋值给`isLike`字段
4. 由`isLike`决定每次点击是增加点赞数还是取消点赞。增加点赞数：先修改数据库存储的`liked`列的数值减一，然后加入 Redis 的set 集合。取消点赞：同样先修改数据库，再动缓存。

用户点击点赞按钮时，调用下面的控制器：

```java
@PutMapping("/like/{id}")
public Result likeBlog(@PathVariable("id") Long id) {
    // 修改点赞数量
    return blogService.likeBlog(id);
}
```

这个控制器会调用下面实现类中的`likeBlog`修改点赞数：

```java
@Service
public class BlogServiceImpl extends ServiceImpl<BlogMapper, Blog> implements IBlogService {

    @Autowired
    private UserServiceImpl userServiceImpl;

    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    @Override
    // 修改点赞数
    public Result likeBlog(Long id) {
        Long userId = UserHolder.getUser().getId();
        String LikeId = BLOG_LIKED_KEY + id;
        Boolean isMember = stringRedisTemplate.opsForSet().isMember(LikeId, userId.toString());// 把用户 id 存入对应的集合
        // 判断有没有点赞过
        if (Boolean.FALSE.equals(isMember)) {
            // 更新数据库的点赞数
            boolean isSuccess = update().setSql("liked = liked + 1").eq("id", id).update();
            // 如果数据库更新成功，就把用户 id 记录到 Redis里面
            if (isSuccess) {
                stringRedisTemplate.opsForSet().add(BLOG_LIKED_KEY + id, userId.toString());
            }
        } else {    // 用户已经点过赞了
            // 修改数据库
            boolean isSuccess = update().setSql("liked = liked - 1").eq("id", id).update();
            if (isSuccess) {
                stringRedisTemplate.opsForSet().remove(BLOG_LIKED_KEY + id, userId.toString());
            }
        }
        return Result.ok();
    }
}
```

## 显示点赞用户列表

### 基本实现

按照点赞时间显示最先5个点赞的用户。为了按照时间排序，需要用到**有序列表**(SortedSet)，根据`score`的值排序。

把**时间戳**作为`score`，把用户 id 作为`member`保存到 Redis 的代码：

```java
stringRedisTemplate.opsForZSet().add(LikeId, userId.toString(), System.currentTimeMillis());
```

判断用户是否点过赞的思路是先尝试获取用户的`score`，如果获取不到说明用户没有点过赞。

```java
Double score = stringRedisTemplate.opsForZSet().score(LikeId, userId.toString());// 通过 key 和 member 尝试获取 score
```

然后判断`score`是否为`null`即可。

从有序列表查询前五名的思路的代码：

```java
Set<String> top5 = stringRedisTemplate.opsForZSet().rangeByScore(key, 0, 4);
```

注意，这里查询到返回的**具体实现类**是`java.util.LinkedHashSet`，是**有序**的。在 Redis 查询时，Spring 会把从 Redis 查询出来的顺序按顺序加入到`LinkedHashSet`中，它是一种有序的SET集合，**保留了元素的插入顺序**（所以说 Set 集合不一定是无序的）。

这里泛型是**字符串**类型，需要再解析成`Long`类型。目前为止的逻辑如下：

```java
String key = BLOG_LIKED_KEY + id;
// 查询用户 id
Set<String> top5 = stringRedisTemplate.opsForZSet().rangeByScore(key, 0, 4);
List<Long> LikeList = top5.stream().map(Long::valueOf).collect(Collectors.toList());
// 根据 id 列表获取用户列表
List<User> users = userServiceImpl.listByIds(LikeList);
// 3. 返回 UserDTO 列表
```

还差最后一步：**把`User`列表转换成`UserDTO`列表**。可以考虑使用**流式编程**。如果是处理单个用户，方法为：

```java
UserDTO userDTO = new UserDTO();
BeanUtils.copyProperties(user, userDTO);
```

现在处理多个用户，只需要让`map`返回每一个用户的`UserDTO`对象。使用`Stream`的`map()`操作可以对每个元素进行转换，最后用`collect()`收集结果。

```java
List<User> users = userServiceImpl.listByIds(LikeList);
// 3. 返回 UserDTO
List<UserDTO> userDTOs = users.stream()
        .map(user -> {
            UserDTO userDTO = new UserDTO();
            BeanUtils.copyProperties(user, userDTO);
            return userDTO;
        })
        .collect(Collectors.toList());
```

这一部分的完整代码如下：

`BlogController.java`控制器：

```java
/**
 * 查询文章的点赞用户top5集合
 *
 * @param id 文章 ID
 * @return 包含点赞集合的 Result 结果
 */
@GetMapping("/likes/{id}")
public Result queryBlogLikesById(@PathVariable("id") Long id) {
    return blogService.queryBlogLikes(id);
}
```

`queryBlogLikes`的实现方法：

```java
/**
 * 查询指定文章的点赞集合
 *
 * @param id 文章 id
 * @return 包含点赞用户的前五名
 */
@Override
public Result queryBlogLikes(Long id) {
    String key = BLOG_LIKED_KEY + id;
    // 查询用户 id
    Set<String> top5 = stringRedisTemplate.opsForZSet().range(key, 0, 4);

    // 避免 top5 空指针导致的异常，提高健壮性
    if (top5 == null || top5.isEmpty()) {
        return Result.ok(Collections.emptyList());
    }

    List<Long> LikeList = top5.stream().map(Long::valueOf).collect(Collectors.toList());
    // 根据 id 列表获取用户列表
    List<User> users = userServiceImpl.listByIds(LikeList);
    // 3. 返回 UserDTO
    List<UserDTO> userDTOs = users.stream()
            .map(user -> {
                UserDTO userDTO = new UserDTO();
                BeanUtils.copyProperties(user, userDTO);
                return userDTO;
            })
            .collect(Collectors.toList());

    return Result.ok(userDTOs);
}
```

### 改进-MySQL查询结果顺序问题

举个例子，执行下面的命令：

```sql
select * from tb_seckill_voucher where voucher_id in (13, 12) 
```

查询顺序是`13`或`12`，但是返回顺序可能是先`13`后`12`，这是因为默认情况下**数据库查询不保证返回顺序**。

一种解决方法是添加子句`ORDER BY FIELD(voucher_id, 5, 1)`，意思是按照指定的`voucher_id`顺序排序：先显示`voucher_id = 5`的记录，再显示`voucher_id = 1`的记录。

---

如果不想修改数据库的查询操作的话，也可以通过手动修改查询结果来解决：

```java
List<Long> LikeList = top5.stream().map(Long::valueOf).collect(Collectors.toList());
// 根据 id 列表获取用户列表
List<User> users = userServiceImpl.listByIds(LikeList);
// 按照 LikeList 里用户 id 的顺序对查询得到的结果进行排序，防止乱序
Map<Long, User> userMap = users.stream()
        .collect(Collectors.toMap(User::getId, Function.identity()));

// 返回 UserDTO
List<UserDTO> userDTOs = LikeList.stream()
        .map(userMap::get)
        .filter(Objects::nonNull)           // 过滤可能的空值
        .map(user -> {
            UserDTO userDTO = new UserDTO();
            BeanUtils.copyProperties(user, userDTO);
            return userDTO;
        })
        .collect(Collectors.toList());
```

逐行分析：

```java
Map<Long, User> userMap = users.stream()
        .collect(Collectors.toMap(User::getId, Function.identity()));
```

创建一个映射关系`userMap`，用来把用户 id 构成列表映射成用户实体类构成的列表。

```java
List<UserDTO> userDTOs = LikeList.stream()
        .map(userMap::get)
        .filter(Objects::nonNull)           // 过滤可能的空值
        .map(user -> {
            UserDTO userDTO = new UserDTO();
            BeanUtils.copyProperties(user, userDTO);
            return userDTO;
        })
        .collect(Collectors.toList());
```

分为5步：

1. 把`LikeList`作为**源**，`Stream`会按照**源集合的顺序**逐个处理元素
2. 对于每个用户 id，通过`userMap.get(id)`把 id 映射成用户实体类的列表
3. 过滤不存在的`null`用户
4. 把用户类组成的列表中的每一个`User`对象转换成`UserDTO`对象
5. 收集结果，构成符合要求的列表返回

修改后的代码如下：

```java
/**
 * 查询指定文章的点赞集合
 *
 * @param id 文章 id
 * @return 包含点赞用户的前五名
 */
@Override
public Result queryBlogLikes(Long id) {
    String key = BLOG_LIKED_KEY + id; // blog:liked:23
    // 查询用户 id
    Set<String> top5 = stringRedisTemplate.opsForZSet().range(key, 0, 4);

    // 避免 top5 空指针导致的异常，提高健壮性
    if (top5 == null || top5.isEmpty()) {
        return Result.ok(Collections.emptyList());
    }

    List<Long> LikeList = top5.stream().map(Long::valueOf).collect(Collectors.toList());
    // 根据 id 列表获取用户列表
    List<User> users = userServiceImpl.listByIds(LikeList);
    // 按照 LikeList 里用户 id 的顺序对查询得到的结果进行排序，防止乱序
    Map<Long, User> userMap = users.stream()
            .collect(Collectors.toMap(User::getId, Function.identity()));

    // 返回 UserDTO
    List<UserDTO> userDTOs = LikeList.stream()
            .map(userMap::get)
            .filter(Objects::nonNull)           // 过滤可能的空值
            .map(user -> {
                UserDTO userDTO = new UserDTO();
                BeanUtils.copyProperties(user, userDTO);
                return userDTO;
            })
            .collect(Collectors.toList());

    return Result.ok(userDTOs);
}
```

## 关注功能



### 关注和取关

借助数据库里的一个中间表：`tb_follow`,一共四个字段：

- `id`自增主键
- `user_id`用户id
- `follow_user_id`关注的用户的id
- `create_time`创建时间

**关注、取关**，就是对这张表的**插入**和**删除**。

完整的控制器：

```java
@RestController
@RequestMapping("/follow")
public class FollowController {

    @Autowired
    private IFollowService followService;

    /**
     * 关注/取关功能
     * @param followUserId 对方的用户 id
     * @param isFollow 当前的状态，如果是关注则下一步取关，如果是没关注则下一步关注
     * @return Result
     */
    @PutMapping("/{id}/{isFollow}")
    public Result follow(@PathVariable("id") Long followUserId, @PathVariable("isFollow") Boolean isFollow) {
        return followService.follow(followUserId, isFollow);
    }

    /**
     *
     * @param followUserId
     * @return
     */
    @GetMapping("/or/not/{id}")
    public Result isFollow(@PathVariable("id") Long followUserId) {
        return followService.isFollow(followUserId);
    }
}
```

实现类：

```java
@Service
public class FollowServiceImpl extends ServiceImpl<FollowMapper, Follow> implements IFollowService {
    @Autowired
    FollowMapper followMapper;

    /**
     * 关注/取关功能
     *
     * @param followUserId 对方的用户 id
     * @param isFollow     当前的状态，如果是 true 则下一步关注，如果是 false 则下一步取关
     * @return Result
     */
    @Override
    public Result follow(Long followUserId, Boolean isFollow) {
        Long userId = UserHolder.getUser().getId();
        if (isFollow) {
            // 关注 insert tb_follow
            Follow follow = new Follow();
            follow.setUserId(userId);
            follow.setFollowUserId(followUserId);
            save(follow);
        } else {
            // 取关 delete from tb_follow where user_id = ? and follow_user_id = ?
            remove(new QueryWrapper<Follow>().eq("user_id", userId).eq("follow_user_id", followUserId));
        }
        return Result.ok();
    }

    // 判断是否已经关注
    @Override
    public Result isFollow(Long followUserId) {
        Long userId = UserHolder.getUser().getId(); // 获取登录用户

        // SELECT EXISTS(SELECT 1 FROM tb_follow WHERE user_id = #{userId} AND follow_user_id = #{followUserId})
        Boolean isFollow = followMapper.isFollow(userId, followUserId);

        return Result.ok(isFollow);
    }
}
```

一个技巧：“判断是否已经关注”，用的是SQL语句

```sql
SELECT EXISTS (
SELECT 1 
FROM tb_follow 
WHERE user_id = #{userId} 
AND follow_user_id = #{followUserId} 
)
```

这样做效率最高. 用 Mapper 来完成这个语句：

```java
@Mapper
public interface FollowMapper extends BaseMapper<Follow> {
    @Select("SELECT EXISTS(SELECT 1 FROM tb_follow WHERE user_id = #{userId} AND follow_user_id = #{followUserId})")
    Boolean isFollow(@Param("userId") Long userId, @Param("followUserId") Long followUserId);
}
```

然后向`FollowServiceImpl `注入`FollowMapper`。

### 共同关注

类似的功能有主页上显示“你关注的某某人也关注了他/她”，实现方法有两种：

1. 数据库多表查询，主要利用`JOIN...ON...`联结查询，适用于小规模
2. 在 Twitter 等高性能场景中，通常使用**Redis 的 Set 类型**维护关注关系。

求**我关注的人**和**目标用户粉丝的交集**：

```bash
SINTER follow:me fans:targetUser
```

另一个功能是查看目标用户和当前用户**共同关注**的人，这也是这次要实现的功能。

Redis 的 Set 数据结构能够求**交集**：

```bash
  SINTER key [key ...]
  summary: Intersect multiple sets
  since: 1.0.0
  group: set
```



用户`A`的关注列表本质上就是`tb_follow`表中`user_id`为该用户的id的所有记录中`follow_user_id`的集合。为了利用 Redis 求交集的特性，需要把关注用户的 id 加载到 Redis中。

进一步地，既然迟早要把用户的关注 id 加载到 Redis，那干脆从用户点击关注的时候就把它加载进去。下面修改一下用户关注接口的实现：

```java
public static final String FOLLOW = "follow:";
/**
 * 关注/取关功能
 *
 * @param followUserId 对方的用户 id
 * @param isFollow     当前的状态，如果是 true 则下一步关注，如果是 false 则下一步取关
 * @return Result
 */
@Override
public Result follow(Long followUserId, Boolean isFollow) {
    Long userId = UserHolder.getUser().getId(); // 我的 id
    String currentKey = FOLLOW + userId;

    if (isFollow) {
        // 关注 insert tb_follow
        Follow follow = new Follow();
        follow.setUserId(userId);
        follow.setFollowUserId(followUserId);
        boolean isSuccess = save(follow);
        if (isSuccess) {
            // 存入Redis   我的userId - 关注的人的 id
            stringRedisTemplate.opsForSet().add(currentKey, String.valueOf(followUserId));
        }
    } else {
        // 取关 delete from tb_follow where user_id = ? and follow_user_id = ?
        boolean isSuccess = remove(new QueryWrapper<Follow>().eq("user_id", userId).eq("follow_user_id", followUserId));
        if (isSuccess) {
            stringRedisTemplate.opsForSet().remove(currentKey, String.valueOf(followUserId));
        }
    }
    return Result.ok();
}

// 判断是否已经关注
@Override
public Result isFollow(Long followUserId) {
    Long userId = UserHolder.getUser().getId(); // 获取登录用户

    // SELECT EXISTS(SELECT 1 FROM tb_follow WHERE user_id = #{userId} AND follow_user_id = #{followUserId})
    Boolean isFollow = followMapper.isFollow(userId, followUserId);

    return Result.ok(isFollow);
}
```

然后是查询目标用户和自己的共同关注对象，以`Result.ok(UserDTO列表)`的形式返回，代码如下：

```java
/**
 * 查询目标用户和自己的共同关注对象
 *
 * @param followUserId 关注用户的ID
 * @return 包含共同关注用户的 UserDTO 列表的 Result 结果（如果有）或者空集合（没有）
 */
@Override
public Result followCommons(Long followUserId) {
    // 获取当前用户
    Long currentUserId = UserHolder.getUser().getId();
    String currentKEY = FOLLOW + currentUserId;
    String followKey = FOLLOW + followUserId;
    // 求交集
    Set<String> commonFollow = stringRedisTemplate.opsForSet().intersect(currentKEY, followKey);
    if (commonFollow == null || commonFollow.isEmpty()) {
        return Result.ok(Collections.emptyList());
    }
    // 解析
    List<Long> commonIds = commonFollow.stream().map(Long::valueOf).collect(Collectors.toList());
    // 查询
    List<User> users = userServiceImpl.listByIds(commonIds);
    List<UserDTO> userDTOs = users.stream()
            .map(user -> {
                UserDTO userDTO = new UserDTO();
                BeanUtils.copyProperties(user, userDTO);
                return userDTO;
            })
            .collect(Collectors.toList());
    return Result.ok(userDTOs);
}
```


### Feed流的模式

关注推送也叫**Feed流**，通过无限下拉刷新获取新的信息。

Feed 流的常见模式：

1. Timeline：不做筛选，根据内容发布时间排序
2. 智能排序：通过推荐算法

Timeline模式的实现方式有三种：拉，推，推拉结合。下面分别介绍。

#### 拉模式

- 含义：每个博主拥有一个发件箱，发送的信息包含时间戳。粉丝拥有收件箱，平时是空的，只有当用户查看收件箱内的内容的时候才会一个一个拉取博主发出的信息的副本，并按照时间戳排序。
- 优点：节省内存
- 缺点：每次读消息的时候都要拉取消息，延迟大，关注的人越多延迟越大。

![拉模式](https://s21.ax1x.com/2025/07/02/pVu2YOs.png)

#### 推模式

- 含义：不设置发件箱，只设置收件箱，每当博主发送信息的时候都会直接推送到粉丝的收件箱。
- 优点：延迟低。
- 缺点：内存占用高，对于大v来说粉丝量特别大，每次要发送非常多的数据。

![推模式，用户量少，低延迟](https://s21.ax1x.com/2025/07/02/pVu2wkV.png)

#### 推拉结合（读写混合）模式

- 含义：普通小博主采用推模式，大v区别对待：活跃粉丝推模式，普通粉丝拉模式。

![](https://s21.ax1x.com/2025/07/02/pVu26X9.png)

后面采用的都是推模式。

需求：

1. 修改新增探店笔记的业务，在保存blog到数据库的同时，推送到粉丝的收件箱
2. 收件箱可以满足按照时间戳排序，必须用Redis的数据结构实现
3. 查询收件箱的数据的时候，可以实现分页查询

#### 新增笔记推送到粉丝收件箱

```java
@Override
public Result saveBlog(Blog blog) {
    UserDTO user = UserHolder.getUser();
    blog.setUserId(user.getId());
    // 保存探店博文
    boolean success = save(blog);
    if (!success) {
        return Result.fail("新增笔记失败");
    }
    // 查询所有粉丝 select user_id from tb_follow follow_user_id = ?
    List<Follow> followers = followService.query().eq("follow_user_id", user.getId()).list();
    // 推送
    String BlogId = blog.getId().toString();
    for (Follow follow : followers) {
        Long followerId = follow.getId();
        String key = FEED_KEY + followerId;
        stringRedisTemplate.opsForZSet().add(key, BlogId, System.currentTimeMillis());
    }

    // 返回id
    return Result.ok(blog.getId());

}
```
