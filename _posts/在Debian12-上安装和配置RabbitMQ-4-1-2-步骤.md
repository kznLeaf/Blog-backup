---
title: Debian12 虚拟机安装 RabbitMQ 4.1.2 详细步骤
tags:
  - Linux
  - 中间件
date: 2025-08-02 19:44:27
index_img: https://s21.ax1x.com/2025/08/02/pVNybTO.png
categories:
hide: true
---

## 透明代理

`rabbitmq.com`在国内的访问速度较慢，为了保证后续的安装能够顺利进行，建议先配置透明代理（全局代理）。一开始我安装的是 Clash-Verge，但是不知道为什么在 Clash 内开启系统代理之后，系统的流量并不会经过Clash，所以后来换成了v2ray。

### curl

下一步要用curl直接拉取安装脚本，所以要确保curl已经安装完成

```bash
sudo apt update
sudo apt install curl -y
```

### v2ray

```bash
sudo -i
bash <(curl -Ls https://raw.githubusercontent.com/v2fly/fhs-install-v2ray/master/install-release.sh)
```

### v2rayA

先用能够访问 github 的宿主机在[这里](https://github.com/v2rayA/v2rayA/releases)下载`installer_debian_x64_2.2.6.7.deb`，然后拖到虚拟机内的目录下执行

```bash
sudo apt install ./installer_debian_x64_2.2.6.7.deb
```

安装完毕后启用服务

```bash
sudo systemctl enable v2raya
sudo systemctl start v2raya
```

因为 v2rayA 的透明代理功能依赖 iptables，所以还需要下载

```bash
sudo apt update
sudo apt install iptables
```

> iptables 是 Linux 系统中的一个用户空间工具，用于配置 Linux 内核中的 netfilter 防火墙子系统。它主要用于设置和管理网络数据包的过滤规则，比如防火墙策略、NAT 转发等。简而言之，iptables 决定了哪些网络流量允许通过、哪些要被阻止。

然后重启v2rayA：

```bash
sudo systemctl restart v2raya
```

现在可以使用代理了。

## RabbitMQ 4.1.2


参考官方安装指南： https://www.rabbitmq.com/docs/install-debian

将下面的所有命令运行一遍即可：

```bash
#!/bin/sh

sudo apt-get install curl gnupg apt-transport-https -y

## 下载签名密钥，验证软件包的合法性
curl -1sLf "https://keys.openpgp.org/vks/v1/by-fingerprint/0A9AF2115F4687BD29803A206B73A36E6026DFCA" | sudo gpg --dearmor | sudo tee /usr/share/keyrings/com.rabbitmq.team.gpg > /dev/null

## 添加 RabbitMQ 官方 APT 源
sudo tee /etc/apt/sources.list.d/rabbitmq.list <<EOF
## Modern Erlang/OTP releases
##
deb [arch=amd64 signed-by=/usr/share/keyrings/com.rabbitmq.team.gpg] https://deb1.rabbitmq.com/rabbitmq-erlang/debian/bookworm bookworm main
deb [arch=amd64 signed-by=/usr/share/keyrings/com.rabbitmq.team.gpg] https://deb2.rabbitmq.com/rabbitmq-erlang/debian/bookworm bookworm main

## Latest RabbitMQ releases
##
deb [arch=amd64 signed-by=/usr/share/keyrings/com.rabbitmq.team.gpg] https://deb1.rabbitmq.com/rabbitmq-server/debian/bookworm bookworm main
deb [arch=amd64 signed-by=/usr/share/keyrings/com.rabbitmq.team.gpg] https://deb2.rabbitmq.com/rabbitmq-server/debian/bookworm bookworm main
EOF

## 更新软件包索引
sudo apt-get update -y

## 安装 Erlang 软件包，这一步需要代理
sudo apt-get install -y erlang-base \
                        erlang-asn1 erlang-crypto erlang-eldap erlang-ftp erlang-inets \
                        erlang-mnesia erlang-os-mon erlang-parsetools erlang-public-key \
                        erlang-runtime-tools erlang-snmp erlang-ssl \
                        erlang-syntax-tools erlang-tftp erlang-tools erlang-xmerl

## rabbitmq-server 及其依赖
sudo apt-get install rabbitmq-server -y --fix-missing
```

至此成功安装rabbitMQ。启动服务：

```bash
sudo systemctl start rabbitmq-server
```

启用管理插件：

```bash
sudo rabbitmq-plugins enable rabbitmq_management
```

这个插件提供了 HTTP API，可以使用 Web 浏览器访问管理 UI 界面`http://localhost:15672/`，默认账号密码都是`guest`，登录成功看到以下界面

![RabbitMQ登录界面](https://s21.ax1x.com/2025/08/02/pVNUSaR.png)

## 注意事项

### 配置端口转发

如果虚拟机网络用的是 NAT 模式，虚拟机的 IP 地址是虚拟网卡分配的一个私有 IP，**通常宿主机是无法直接访问虚拟机的服务**，除非做了端口映射（port forwarding）。下面逐步说明：

使用命令

```bash
ip addr
```

查看NAT模式下的ip地址。然后在虚拟机设置中配置端口转发：编辑（Edit） > 虚拟网络编辑器（Virtual Network Editor）-> VMnet8，添加端口转发规则（`192.168.x.y`换成自己虚拟机的ip地址）

| 名称       | 协议  | 主机端口  | 虚拟机 IP          | 虚拟机端口 |
| -------- | --- | ----- | --------------- | ----- |
| RabbitMQ | TCP | 5672  | 192.168.**x**.y | 5672  |
| RabbitUI | TCP | 15672 | 192.168.**x**.y | 15672 |

然后就可以在宿主机的浏览器访问UI界面了✌️

{% note primary %}  
如果仍然无法访问，检查虚拟机是否开启了`firewalld`，在开启的状态下防火墙会拦截外部请求。  
{% endnote %} 

### 其他问题

- rabbitmq的日志位于`/var/log/rabbitmq`（需要切换到 root 用户访问），出什么问题都可以去看一眼日志。
- rabbitmq Web初始可以用 guest 登录，但是**guest 只能通过 localhost 访问**，就算配置了端口转发也不能在其他机器上登录，所以最好先创建一个新用户。
- rabbitmq的虚拟主机只能由创建者访问，同样地新创建的队列只能加入到有访问权限的虚拟主机中。



