---
title: Redis-短信登录功能
date: 2025-06-17 23:08:00
index_img:
tags:
  - Redis
  - 中间件
categories: Redis
hide: true
---


![总览](https://s21.ax1x.com/2025/06/15/pVAvgPI.png)

![项目架构](https://s21.ax1x.com/2025/06/15/pVAxkz6.png)

# 短信登录

## 回顾：cookie&session基础

`cookie`是一种客户端会话技术, cookie 由服务端产生,它是服务器存放在浏览器的一小份数据,浏览器以后每次访问该服务器的时候都会将这小份数据携带到服务器去。

+ **服务端**创建cookie,将cookie放入响应对象中,Tomcat容器将cookie转化为set-cookie响应头,响应给客户端
+ **客户端**在收到服务端发来的cookie的响应头后,在以后每次请求该服务的资源时,会以cookie请求头的形式携带之前收到的Cookie
+ cookie是一种**键值对**格式的数据,从 tomcat8.5 开始可以保存中文,但是不推荐
+ 由于cookie是存储于客户端的数据,比较容易暴露,**一般不存储一些敏感或者影响安全的数据**

![原理图](https://s21.ax1x.com/2025/05/13/pEX78OA.png)

`HttpSession`是一种保留更多信息在服务端的一种技术,服务器会为每一个客户端开辟一块内存空间,即session对象. 客户端在发送请求时,都可以使用自己的session. 这样服务端就可以通过session来记录某个客户端的状态了。

- Session 依赖 Cookie 来实现识别用户身份。
- 通常，服务器在创建一个 Session 时，会生成一个唯一的 Session ID。
- 这个 Session ID 会通过 Set-Cookie 响应头被发送到客户端，客户端会把这个 ID 保存在 Cookie 中。
- 后续客户端的请求会自动携带这个 Session ID 的 Cookie，服务器就可以用这个 ID 找回之前保存的 Session 数据，从而识别用户状态。

![Session的原理图](https://s21.ax1x.com/2025/05/14/pEjl0Cn.png)


**示例**：假如有一个表单name属性为`username`，现在使用 ServeletA 将表单提交的用户名存入Session：

```java
@WebServlet("/servletA")
public class ServletA extends HttpServlet {
    @Override
    protected void service(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        // 获取请求中的参数
        String username = req.getParameter("username");
        // 获取session对象
        HttpSession session = req.getSession();
         // 获取Session的ID
        String jSessionId = session.getId();
        System.out.println(jSessionId);
        // 判断session是不是新创建的session
        boolean isNew = session.isNew();
        System.out.println(isNew);
        // 向session对象中存入数据
        session.setAttribute("username",username);
    }
}
```

上面的代码调用了`getSession()`方法，使用`getSession()`方法可以**获取当前会话的实例**，同时为会话创建一个新的`cookie`，获取的逻辑如下：

![getSession方法的操作逻辑](https://s21.ax1x.com/2025/05/14/pEjluAH.png)

于是， ServletA 执行以后，返回给客户端的响应中会包含一个键为`JSESSIONID`的cookie。以后客户端向服务器发出的请求头都会包含该cookie。

然后在另一个ServletB中就可以取出用户名：

```java
@WebServlet("/servletB")
public class ServletB extends HttpServlet {
    @Override
    protected void service(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        // 获取session对象
        HttpSession session = req.getSession();
         // 获取Session的ID
        String jSessionId = session.getId();
        System.out.println(jSessionId);
        // 判断session是不是新创建的session
        boolean isNew = session.isNew();
        System.out.println(isNew);
        // 从session中取出数据
        String username = (String)session.getAttribute("username");
        System.out.println(username);
    }
}
```

## 系统框图

![系统框图](https://s21.ax1x.com/2025/06/16/pVEAkAf.png)

## 发送短信验证码

业务逻辑：

1. 用户提交手机号，后端的`UserController`接收该手机号和用户所在的会话
2. 在服务层中做出如下判断：
   1. 校验手机号是否合法
   2. 如果手机号不存在，返回错误信息
   3. 如果手机号存在，生成验证码
   4. 保存验证码到当前会话
   5. 向用户发送验证码

控制层代码：

```java
/**
 * 发送手机验证码
 */
@PostMapping("code")
public Result sendCode(@RequestParam("phone") String phone, HttpSession session) {
    // TODO 发送短信验证码并保存验证码
    return userService.sendCode(phone, session);
}
```

这里调用了服务层的`sendCode`方法，如下：

```java
@Slf4j
@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements IUserService {
    @Override
    public Result sendCode(String phone, HttpSession session) {
        // 校验手机号
        if (RegexUtils.isPhoneInvalid(phone)) {
            // 如果手机号不合法，返回错误信息
            return Result.fail("手机号错误");
        }
        // 手机号合法，生成验证码
        String code = RandomUtil.randomNumbers(6);// 生成6位随机数

        // 保存验证码到 session
        session.setAttribute("code", code);

        // 发送验证码
        log.debug("发送短信验证码成功，验证码：{}", code);
        return Result.ok();
    }
}
```

使用`log.debug`代替实际的发送验证码功能（因为要花钱）

## 基于Session实现登录

这一块将登录和注册合二为一。

控制层：接收登录参数，包含手机号、验证码；或者手机号、密码。

```java
/**
 * 登录功能
 * @param loginForm 登录参数，包含手机号、验证码；或者手机号、密码
 */
@PostMapping("/login")
public Result login(@RequestBody LoginFormDTO loginForm, HttpSession session){
    // TODO 实现登录功能
    return userService.login(loginForm, session);
}
```

服务层的代码使用**反向嵌套**，防止嵌套越嵌越深。具体如下：（UserServiceImpl）

```java
@Override
public Result login(LoginFormDTO loginForm, HttpSession session) {
    // 校验手机号
    String phone = loginForm.getPhone();
    if (RegexUtils.isPhoneInvalid(phone)) {
        // 如果手机号不合法，返回错误信息
        return Result.fail("手机号错误");
    }
    // 校验验证码
    String correctCode = (String) session.getAttribute("code"); // 会话保存的验证码
    String userCode = loginForm.getCode(); // 用户提交的验证码
    if (correctCode == null || !correctCode.equals(userCode)) {
        // 验证码不一致
        return Result.fail("验证码错误");
    }
    // 通过验证，根据手机号查询用户
    User user = query().eq("phone", phone).one();

    // 用户不存在，创建新用户
    if (user == null) {
        user = createUserWithPhone(phone);
    }
    // 这样确保user一定有值

    // 保存用户信息到session
    session.setAttribute("user", user);

    return null;
}

private User createUserWithPhone(String phone) {
    // 创建用户
    User user = new User();
    user.setPhone(phone);
    user.setNickName(USER_NICK_NAME_PREFIX + RandomUtil.randomString(10));
    save(user); // mybatisPlus 提供的save方法
    return user;
}
```

如前所述，访问服务器的时候，服务器返回给客户端的响应头中包含键为 Session ID 的cookie 字段，后续客户端的请求会自动携带这个 Session ID 的 Cookie，服务器就可以用这个 ID 找回之前保存的 Session 数据，从而识别用户状态。所以这里**不需要**JWT令牌。

- 在服务层，仍然要先校验手机号是否合法，然后再校验验证码。
- 手机号+验证码校验通过之后：  
  - 如果数据库中能查到这个手机号用户，就赋值给`user`对象
  - 如果没有，就INSERT新用户，然后赋值给`user`对象
- 到这里`user`对象必定不为空，保存到会话中。

---

发送验证码——填写验证码——按下登录按钮后，后台打印部分日志：

```
HikariPool-1 - Starting...
HikariPool-1 - Start completed.
==>  Preparing: SELECT id,phone,password,nick_name,icon,create_time,update_time FROM tb_user WHERE (phone = ?)
==> Parameters: xxxxxxxxx(String)
<==      Total: 0
==>  Preparing: INSERT INTO tb_user ( phone, nick_name, icon ) VALUES ( ?, ?, ? )
==> Parameters: xxxxxxxxx(String), user_dvz2bph7ax(String), (String)
<==    Updates: 1
```

一共对数据库进行两次操作：`SELECT`查询用户是否存在，和`INSERT`添加新用户。

这里用到了`HikariCP`连接池，这是 Java 中速度最快的连接池的实现，是 SpringBoot 的默认连接池。连接池是用来复用数据库连接的一种机制，创建和关闭数据库连接是很昂贵的操作，连接池提前维护好一组可用连接，供应用程序重复使用。

## 基于Session+ThreadLocal的登录验证

### 处理思路

登录成功后，用户的每一次请求都会带上包含 session id 的cookie，服务端从这里识别用户状态。考虑到后续每个功能都需要识别用户状态之后才能执行，所以这里要配置一个拦截器，通过验证才放行。

> 过滤器是tomcat实现的，拦截器是springmvc实现的，过滤器的功能拦截器也能做到，且拦截器的功能更全，一般都是用拦截器。

![拦截器](https://s21.ax1x.com/2025/06/16/pVEV3pF.png)

还有一个问题：拦截器是能完成用户校验不假，但是在后续的业务中其他的模块也需要用到用户信息，所以需要把拦截得到的用户信息向后传递，同时保证线程安全，使用`ThreadLocal`可以做到这一点。

`ThreadLocal`具体介绍详见[https://kznleaf.top/2025/06/07/ThreadLocal%E5%89%96%E6%9E%90/](https://kznleaf.top/2025/06/07/ThreadLocal%E5%89%96%E6%9E%90/)

有了 ThreadLocal ，校验登录状态的流程图如下：

![校验登录状态](https://s21.ax1x.com/2025/06/16/pVEVs6H.png)

### ThreadLocal工具类

```java
public class UserHolder {
    // ThreadLocal<T> 此处 T 即 UserDTO 实体类，
    // 即 ThreadLocalMap 的键值对的 value 的类型为 UserDTO
    private static final ThreadLocal<UserDTO> tl = new ThreadLocal<>();

    public static void saveUser(UserDTO user){
        tl.set(user);
    }

    public static UserDTO getUser(){
        return tl.get();
    }

    public static void removeUser(){
        tl.remove();
    }
}
```

`tl`全局唯一，并且随类对象的加载一起被加载。

### Entity与DTO

Entity，**实体类**，它的字段与数据库中的列一一对应，用于数据库操作；

DTO，Data Transfer Object，即**数据传输对象**，是 Java 编程中很常见的设计模式。

DTO 用来在不同系统或模块之间传递数据的对象。在实际开发中，尤其是 Web 项目里，我们常常要在控制器、服务层、数据库层之间传递数据。为了避免直接暴露数据库实体（如 UserEntity），我们会用 DTO 来进行封装。

总之，之所以专门再封装一遍，有两个主要原因：

1. 数据库实体可能包含像用户密码这样的敏感信息，这类信息应当被隐藏
2. 很多情况下我们只需要用到一部分实体类的信息，那么就只把有用的信息记录下来，只传输封装后的对象，这样可以减轻数据传输的压力

**实体类用于与数据库交互，与数据库结构强绑定；DTO用于数据传输，可以根据业务场景灵活配置**。

以本项目为例，在验证用户登录状态的过程中，需要传输字段其实只有三个：

- id
- nickName
- icon

`User`实体类的其他字段在这里都不重要。所以不妨再定义一个专门用于数据传输的实体类`UserDTO`：

```java
package com.hmdp.dto;

import lombok.Data;

@Data
public class UserDTO {
    private Long id;
    private String nickName;
    private String icon;
}
```

其实上面的`ThreadLocal`保存的也是这里的`UserDTO`对象。

在服务层或控制器层，需要把实体类对象转化为对应的 DTO 对象，幸运的是 Spring 已经准备好了对应的工具类：`BeanUtils`，它包含以下方法：

```java
public static void copyProperties(Object source, Object target) throws BeansException {
    copyProperties(source, target, (Class)null, (String[])null);
}
```

第一个参数是实体类，第二个参数是 DTO。这样就可以把实体类中的字段复制到 DTO 对象的相应字段上。

### 登录验证实现

手续需要修改登录的服务层方法，将`UserDTO`对象存入 session 而不是 User：

```java
UserDTO userDTO = new UserDTO();
BeanUtils.copyProperties(user, userDTO);
// 保存用户信息到session
session.setAttribute("user", userDTO);

return Result.ok(); // 别返回null！
```

然后配置拦截器，尝试获取当前会话中的用户，如果获取失败就拦截并返回401，获取成功就把DTO对象放入ThreadLocal：

```java
@Component
public class LoginInterceptor implements HandlerInterceptor {
    // 前置拦截
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // 1. 获取session
        HttpSession session = request.getSession();
        // 2. 获取用户
        UserDTO userDTO = (UserDTO) session.getAttribute("user");
        // 3. 不存在，拦截
        if (userDTO == null) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED); // 401
            return false;
        }
        // 4. 保存到 ThreadLocal
        UserHolder.saveUser(userDTO); // 保存用户信息
        return true; // 放行
    }

    // Spring DispatcherServlet 在完成一次 HTTP 请求的整个处理流程后，
    // 自动调用 afterCompletion
    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) throws Exception {
        UserHolder.removeUser();
    }
}
```

使用自动装配的方式注册拦截器：

```java
@Configuration
public class MVCconfig implements WebMvcConfigurer {

    @Autowired
    private LoginInterceptor loginInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(loginInterceptor)
                .excludePathPatterns(
                        "/user/login",
                        "/user/code",
                        "/blog/hot", "/shop/**",
                        "/shop-type/**",
                        "/voucher/*"
                );
    }
}
```

## 集群的session共享问题

前面提到过，`HttpSession`是一种保留更多信息在服务端的一种技术,服务器会为每一个客户端开辟一块内存空间,即session对象。客户端在发送请求时,都可以使用自己的session. 这样服务端就可以通过session来记录某个客户端的状态了。

但是，多台Tomcat服务器并不共享session存储空间，当用户请求切换到不同服务器的时候会导致数据丢失。

![集群](https://s21.ax1x.com/2025/06/16/pVEn68f.png)

解决方案：**Redis**

Redis是如何解决这三个问题的？

1. 数据共享：所有的tomcat都可以访问Redis，所以Redis的数据是被共享的；
2. 内存存储：Redis就是在内存中运行的；
3. key-value结构：天然符合。

![Redis](https://s21.ax1x.com/2025/06/16/pVEnfbj.png)

## 基于Redis实现共享session登录

### 方案

Redis代替SESSION要考虑的问题：

1. 选择合适的数据结构
   1. `key-String`，后者是用户对象的 JSON 字符串
   2. `key-{field=value}`，Hash结构，一个`key`可以有多个`field=value`键值对；内存占用更少
2. 选择合适的key：唯一性，以及需要用的时候能不能快速找到
3. 选择合适的存储粒度，很多时候没必要存储完整的用户信息

采用 Hash 的方案：

![](https://s21.ax1x.com/2025/06/16/pVEnzI1.png)

- 发送验证码之前，把验证码以**特定前缀+手机号**为key存储到Redis（防止与其他业务冲突）；
- 用户使用验证码登录注册，根据用户输入的手机号为key从Redis读取验证码，比较读取的验证码和输入的验证码是否匹配；
- 如果匹配成功，把用户DTO对象以**随机token**为key存储到Redis

还有一个问题：如何确保前端能拿到登录凭证？解决方法是每次把用户DTO对象存储到Redis后，把存储用的token**返回给前端**，这样前端每次发来请求的时候都可以拿着这个token进行登录校验。流程如下图：

![](https://s21.ax1x.com/2025/06/16/pVEuCRK.png)

前端收到token以后会直接把它保存到浏览器，所以这里的 token 不能用手机号，会有泄露的风险。校验工作还是后端做的，，以 HTTP 请求中保存的 token 为 key 从 Redis 获取用户 DTO 对象，找到对应用户的话就保存一份到 ThreadLocal，然后放行。

下面基于以上方案重写功能。

### 发送短信

以前把验证码保存在session中，现在把验证码保存到Redis。

```java
@Override
public Result sendCode(String phone, HttpSession session) {
    // 校验手机号
    if (RegexUtils.isPhoneInvalid(phone)) {
        // 如果手机号不合法，返回错误信息
        return Result.fail("手机号错误");
    }
    // 手机号合法，生成验证码
    String code = RandomUtil.randomNumbers(6);// 生成6位随机数

    // 保存验证码到 Redis  |  SET key value ex
    stringRedisTemplate.opsForValue().set(LOGIN_CODE_KEY + phone, code, LOGIN_CODE_TTL, TimeUnit.MINUTES);

    // 发送验证码
    log.debug("发送短信验证码成功，验证码：{}", code);
    return Result.ok();
}
```

核心是这一句

```java
// 保存验证码到 Redis  |  SET key value ex
stringRedisTemplate.opsForValue().set(LOGIN_CODE_KEY + phone, code, LOGIN_CODE_TTL, TimeUnit.MINUTES);
```

保存到Redis，key的格式类似于`login:code:手机号`，值就是验证码，有效时间为2min。

发送短信的过程不需要查询Redis，只检查手机号是否合法，然后把验证码存起来用于登录。

### 登录

业务逻辑：

- 用户发来登录用的手机号和验证码，服务器从 Redis 获取正确的验证码和用户提交的`loginForm`里的验证码比较，匹配则进行下一步
- 查询数据库是否存在这个手机号，如果存在就直接把用户 DTO 对象存到 Redis，不存在则向数据库插入数据之后再把 DTO 存到 Redis，存储的 key 的格式类似`login:token:e64c7c4b-af46-428b-896b-26d0d18e6d6c`，value为 field value 键值对。
- 初次登陆会为 Redis 里的 token 设置一个有效期30分钟，如果三十分钟内用户没有进行操作则登录过期。在拦截器里更新过期时间，每当用户操作就刷新有效期。
- login 控制器结束的时候为前端返回 token，以后前端每次发请求都会包含这个 token。

具体代码就不贴了，这里比较重要的有：

生成随机token：

```java
String uuid = UUID.randomUUID().toString();
```

把一个DTO对象以Hash类型存储到Redis里面：`StringRedisTemplate`包含下面的方法，可以一次插入包含多个键值对的Hash类型数据：

```java
void putAll(H key, Map<? extends HK, ? extends HV> m);
```

key不必多说，Map的话可以单独定义一个方法，将UserDTO的字段放入一个哈希表中，再调用putAll。

先自动装配StringRedisTemplate：

```java
@Autowired
private StringRedisTemplate stringRedisTemplate;
```

考虑到放入、取出 UserDTO 对象的方法都会被用到，所以写两个工具方法：

- `saveUserToRedis`：将`userDTO`对象的所有字段格式化为哈希表，然后以Hash类型存入Redis
- `getUserFromRedis`：根据请求头中的`token`从Redis中尝试获取对应的用户，如果获取到了就返回用户的DTO对象，如果没有获取到就返回`null`

```java
// 存储用户信息到Redis
private void saveUserToRedis(String token, UserDTO userDTO) {
    Map<String, String> userMap = new HashMap<>();
    userMap.put("id", userDTO.getId().toString());
    userMap.put("nickName", userDTO.getNickName());
    userMap.put("icon", userDTO.getIcon());
    
    String tokenKey = LOGIN_USER_KEY + token;
    stringRedisTemplate.opsForHash().putAll(tokenKey, userMap);
    stringRedisTemplate.expire(tokenKey, LOGIN_USER_TTL, TimeUnit.MINUTES);
}

// 从Redis读取用户信息
private UserDTO getUserFromRedis(String token) {
    String tokenKey = LOGIN_USER_KEY + token;
    Map<Object, Object> userMap = stringRedisTemplate.opsForHash().entries(tokenKey);
    
    if (userMap.isEmpty()) {
        return null;
    }
    
    UserDTO userDTO = new UserDTO();
    userDTO.setId(Long.parseLong((String) userMap.get("id")));
    userDTO.setNickName((String) userMap.get("nickName"));
    userDTO.setIcon((String) userMap.get("icon"));
    
    return userDTO;
}
```

登录用的是`saveUserToRedis`。

### 拦截器

这个拦截器只拦截需要登录的路径。

`preHandle`里一共做四件事：

1. 获取请求头中的 token，获取失败则拦截，可以使用`StringUtils.hasLength(token)`判断
2. 调用`getUserFromRedis`查询Redis保存的用户信息
3. 如果获取为null则继续拦截，不为null就保存到ThreadLocal
4. 刷新token的有效期
5. 放行

`afterCompletion`只做一件事：清除ThraedLocal绑定的局部变量，防止内存泄漏。




### 登录状态刷新-双拦截器

之前的拦截器只拦截了需要登录的路径，只有用户访问了这些页面才会刷新token有效时间。如果用户在登录后一直在不被它拦截的页面停留，token还会过期，不合理。

所以在原来的拦截器的前面再加上一个拦截器，拦截一切路径。

用户请求先经过第一个拦截器，拦截所有路径，但是全部放行；第二个拦截器只拦截登录后才能查看的页面，然后查询ThreadLocal的用户，查不到就拦截。

![](https://s21.ax1x.com/2025/06/17/pVEGm2n.png)

`order`设置拦截器的执行顺序，越小先执行，默认都是0.按照添加顺序执行。

第一个拦截器：

```java
@Component
public class preInterceptor implements HandlerInterceptor {

    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    // 前置拦截
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // TODO 1. 获取请求头中的 token(uuid)
        String token = request.getHeader("authorization");
        if (!StringUtils.hasLength(token)) {
            return true; // 没有获取到 token ，放行
        }
        // TODO 2. 从 Redis 利用 token 获取用户信息
        UserDTO userDTO = getUserFromRedis(token);

        // 3. 用户不存在，放行
        if (userDTO == null) {
            return true;
        }

        // 4. 保存到 ThreadLocal
        UserHolder.saveUser(userDTO); // 保存用户信息

        // TODO 刷新 token 的有效期
        stringRedisTemplate.expire(LOGIN_USER_KEY + token, LOGIN_USER_TTL, TimeUnit.MINUTES);
        return true; // 放行
    }

    // Spring DispatcherServlet 在完成一次 HTTP 请求的整个处理流程后，
    // 自动调用 afterCompletion
    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) throws Exception {
        UserHolder.removeUser();
    }

    // TODO 从Redis读取用户信息
    private UserDTO getUserFromRedis(String token) {
        String tokenKey = LOGIN_USER_KEY + token;
        Map<Object, Object> userMap = stringRedisTemplate.opsForHash().entries(tokenKey);

        if (userMap.isEmpty()) {
            return null; // 获取失败
        }

        UserDTO userDTO = new UserDTO(); // 创建 UserDTO 对象
        userDTO.setId(Long.parseLong((String) userMap.get("id")));
        userDTO.setNickName((String) userMap.get("nickName"));
        userDTO.setIcon((String) userMap.get("icon"));

        return userDTO; // 返回获取的 UserDTO对象
    }
}
```

第二个拦截器：

```java
@Component
public class LoginInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        UserDTO user = UserHolder.getUser();
        if (user == null) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return false;
        }
        return true;
    }
}
```

注册两个拦截器，设置`order`分别为0和1：

```java
@Configuration
public class MVCconfig implements WebMvcConfigurer {

    @Autowired
    private LoginInterceptor loginInterceptor;

    @Autowired
    private preInterceptor preInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(loginInterceptor)
                .excludePathPatterns(
                        "/user/login",
                        "/user/code",
                        "/blog/hot", "/shop/**",
                        "/shop-type/**",
                        "/voucher/*"
                ).order(1);
        registry.addInterceptor(preInterceptor).addPathPatterns("/**").order(0);
    }
}
```