---
title: "基于RMDB源码的C++学习笔记"
description: "RMDB数据库源码里用到的C++模板、友元、运算符重载、虚函数、流、unique_ptr与文件描述符梳理"
pubDate: 2026-11-15
category: 技术笔记
tags: [C++, RMDB, 数据库, 模板, OOP]
kind: tech
epigraph: 轮子要造一遍，才知道轮子为什么是圆的。
---

111

<!-- more -->

## 模板
### 基础模板 · 模板函数
```cpp
template <typename T>
T add(T a, T b){
	return a+b;
}
```

- `template <>` 声明这是模板
- `T` 是占位符，代表某个未知类型
- 使用时编译器自动推导类型：

```cpp
int a = add(1, 2);        // T = int → 生成 int add(int, int)
double b = add(1.1, 2.2); // T = double → 生成 double add(double, double)
```

#### 多个模板参数（不止一个类型）:

```cpp
template <typename T1, typename T2>
void print_two(T1 x, T2 y) {
    std::cout << x << " " << y << "\n";
}
// 使用
print_two(10, "hello");
```

### 类模板

函数模板是 “模板函数”；类模板是**模板类**，给类做图纸。

```cpp
template <typename T>
class MyBox {
public:
    T data;
    void set(T v) { data = v; }
    T get() { return data; }
};
```

使用的时候**必须传类型参数**（类模板一般不能自动推导，C++17 之后才有类模板参数推导）

```cpp
MyBox<int> int_box;
int_box.set(100);

MyBox<std::string> str_box;
str_box.set("rmdb");
```

👉 编译器生成两个类：`MyBox<int>`、`MyBox<string>`

#### ### 类模板的成员函数，写在类外面的写法

```cpp
template <typename T>
class MyBox {
public:
    T data;
    void set(T v);
};

// 外面定义，前面必须再写 template
template <typename T>
void MyBox<T>::set(T v) {
    data = v;
}
```
### 模板特化

模板默认是一套逻辑；**特化 = 对某个特定类型，单独写一套不一样的逻辑**。 分为：**全特化**、偏特化（偏特化只针对类模板）

#### 全特化（函数模板）

```cpp
template <typename T>
void show(T x) {
    std::cout << "通用版本：" << x << "\n";
}

// 专门给 std::string 单独写一份
template <>
void show<std::string>(std::string x) {
    std::cout << "字符串特殊处理：" << x << "\n";
}
```

调用 `show("abc")` 会走特化版本，而不是通用版本。

> 用途：大部分类型逻辑一样，某一个类型需要特殊处理。

#### 偏特化（类模板才有，只固定一部分参数）

```cpp
template <typename K, typename V>
class Map { };

// 偏特化：V 固定成 int，K仍然任意
template <typename K>
class Map<K, int> { };
```

### 模板约束

不加约束的模板是 “万能模板”，会匹配所有类型，很容易和标准库冲突。 两种写法：

1. C++11~C++17：`std::enable_if` + SFINAE（RMDB 在用的）
2. C++20：`requires` 约束（更简单）

```cpp
template<typename T, typename = typename std::enable_if<std::is_enum<T>::value, T>::type> std::ostream &operator<<(std::ostream &os, const T &enum_val);
```

>第二个模板参数是一个 “开关”，只有 `T` 是枚举，`enable_if` 才有 ::type，这个模板才合法；否则直接丢弃这个模板，不参与重载。

## std::ostream与istream
它们都在头文件 `<iostream>` 里，是**标准库定义的类**，用来做流式输入输出。

- `istream` = input stream：**输入流**，从外面读数据到程序里
- `ostream` = output stream：**输出流**，把程序里的数据输出到外面

> stream（流）：你可以想象成一根管道，数据顺着管道流动


### cin和cout

`cout` 就是 `std::ostream` 的现成对象（标准输出，屏幕）

```
int x = 10;
cout << x;
```

`<<` 叫**插入运算符**，把数据放进流里。

它的子类：

- `ofstream`：往文件写
- `ostringstream`：写到内存字符串（序列化、拼接字符串很常用，RMDB 序列化经常用到）

`cin` 就是 `std::istream` 的一个现成对象（标准输入，键盘）

```
int x;
cin >> x;
```

`>>` 叫**提取运算符**，从流里拿数据放到变量。

`std::istream` 是一个**父类**，后面很多别的输入流都继承它：

- `ifstream`：从文件读（文件输入流）
- `istringstream`：从字符串读

## 友元

默认规则： 类 / 结构体里，`private`成员**只能被自己的成员函数访问**，外面普通函数不能碰。 **友元：打破这个访问权限限制，授权某个外部函数 / 类，可以访问这个结构体所有成员（public、private 都能读、改）**

> 注意：友元**不是成员函数！不属于这个类**，只是被 “授权” 了。

```cpp
struct Rid {
    int page_no;
    int slot_no;

    // 这是友元函数，不是Rid的成员函数
    friend bool operator==(const Rid &x, const Rid &y) {
        return x.page_no == y.page_no && x.slot_no == y.slot_no;
    }
};
```

- 这个 `operator==` 是一个全局函数，不在 Rid 里面
- 加了 `friend`，编译器允许它读取 `x.page_no`、`y.slot_no`
- 如果去掉 friend，假如 page_no、slot_no 改成 private，这个函数就访问不了、编译报错

### 两种友元：友元函数、友元类

#### 1. 友元函数（你现在看的这种）

可以是普通全局函数，也可以是运算符重载函数（`==`、`!=`、`<<` 最常见） 我们之前枚举的 `operator<<` 一般也写成友元：

```cpp
struct Test {
    int val;
    friend ostream& operator<<(ostream &os, const Test &t) {
        os << t.val;
        return os;
    }
};
```

为什么 `operator<<` 经常写成友元？ 因为 `<<` 第一个参数必须是 `ostream`，不能写成类的成员函数（成员函数第一个隐式参数是 this），所以只能写成外部函数，如果要访问私有成员，就加 friend。

#### 2. 友元类（了解即可）

```cpp
class A {
    friend class B; // B这个类所有函数都能访问A的私有成员
};
```


## 运算符重载

### 两种重载形式：成员函数版 VS 全局 / 友元函数版

以RMDB的记录物理地址的结构体为例
```cpp
struct Rid {
    int page_no;
    int slot_no;
};
```

#### 方式 1：成员函数重载（写在结构体里面）

```cpp
struct Rid {
    int page_no;
    int slot_no;
    // 成员函数版本
    bool operator==(const Rid &other) const {
        return page_no == other.page_no && slot_no == other.slot_no;
    }
};
```

调用：`r1 == r2` 等价于：`r1.operator==(r2)`

- 左边的 `r1` 是 `this`（隐式的，函数里面直接访问 `page_no` 就是 r1 的）
- 参数只有**右边那一个**
- 后面加 `const`：代表这个函数**不会修改当前对象（this）**，只读，写比较运算符必须加 const！

> 适合：`== != < > += -=` 这类，**左边一定是本类对象的运算符**

#### 方式 2：全局 / 友元函数重载（你源码里的版本）

```cpp
struct Rid {
    int page_no;
    int slot_no;
    friend bool operator==(const Rid &x, const Rid &y) {
        return x.page_no == y.page_no && x.slot_no == y.slot_no;
    }
};
```

调用：`r1 == r2` 等价于：`operator==(r1, r2)`

- **两个显式参数**：左边 x，右边 y
- 写成 `friend` 只是为了拿到私有成员权限；函数本身是全局函数，不属于 Rid
- 好处：**左右对称**，`x==y` 和 `y==x` 观感完全一致，写 `==`、`!=` 很推荐

✅ 对比：

- 成员版：左操作数必须是 Rid，不能是别的类型
- 友元全局版：左右参数都可以灵活设计（比如 `int == Rid` 这种特殊场景）

> 对于 `==`：两种写法**效果几乎一样**，RMDB 源码两种都能见到。

## 虚函数

**虚函数，就是用来实现「子类重写父类的函数」，并且用父类指针 / 引用调用时，自动跑到子类的版本。** 这叫 **多态（polymorphism**

### 1. 先看没有 virtual 的普通函数（没有多态）

```cpp
class Base {
public:
    void hello() {
        cout << "Base hello" << endl;
    }
};

class Son : public Base {
public:
    void hello() {
        cout << "Son hello" << endl;
    }
};
```

```cpp
Base *p = new Son();
p->hello(); // 输出 Base hello！
```

> 编译器看指针的类型（Base*），直接调用 Base 的 hello，**不会看它实际指向的是 Son 对象**。 这叫静态绑定：编译的时候就确定调用哪个函数。

### 2. 加上 virtual，变成虚函数（开启多态）

```cpp
class Base {
public:
    virtual void hello() {
        cout << "Base hello" << endl;
    }
};

class Son : public Base {
public:
    void hello() { // 重写（override）父类虚函数
        cout << "Son hello" << endl;
    }
};
```

```cpp
Base *p = new Son();
p->hello(); // ✅ 输出 Son hello
```

> 运行的时候，看这个指针**实际指向对象是什么类型**，自动调用子类版本。 这叫动态绑定（运行时决定调用哪个）。

> C++11 之后可以写 `override` 标记，推荐加上，防止写错函数签名：

```cpp
void hello() override { ... }
```

### 3. 纯虚函数：`virtual void next() = 0;`

`=0` 代表：**这个虚函数没有实现，只是一个接口规范**。

- 包含纯虚函数的类 → **抽象类**
- 抽象类 **不能直接 new 创建对象**
- 继承它的子类，**必须把这个纯虚函数全部实现**，不然子类也还是抽象类，不能实例化

拿你代码：

```
class RecScan {
public:
    virtual ~RecScan() = default;
    virtual void next() = 0;
    virtual bool is_end() const = 0;
    virtual Rid rid() const = 0;
};
```

RecScan 是抽象类，它只是定规矩：所有扫描器都要有 `next`、`is_end`、`rid`。 `SeqScan（全表扫描）`、`IndexScan（索引扫描）` 继承它，各自实现这三个函数。

上层代码：

```
RecScan *scan = new SeqScan(...);
scan->next();      // 自动调用 SeqScan 的 next
```

后面换成索引扫描，只需要 `new IndexScan`，`scan->next()` 这一行代码不用改，自动调用 IndexScan 的 next。 这就是数据库这里用虚函数、多态的目的。

### 4. 虚析构函数：`virtual ~RecScan() = default;`

```cpp
virtual ~RecScan() = default;
```

如果父类指针指向子类对象，delete 的时候：

- 如果析构不是 virtual：只会调用父类析构，子类资源没释放 → **内存泄漏**
- 如果析构是 virtual：先调用子类析构，再父类析构，正常释放

> **只要一个类打算被继承、并且用父类指针管理子类对象，析构函数一定要写 virtual**

`=default`：让编译器帮你生成默认空析构，等价于：

```cpp
virtual ~RecScan() {}
```

### 三个容易混淆概念整理

1. **普通成员函数**：编译时绑定，指针类型决定调用哪个
2. **virtual 虚函数**：运行时绑定，看对象真实类型，子类可以重写
3. **virtual ... =0 纯虚函数**：没有实现，抽象类，强制子类必须实现

### 6. 简单对比小例子

```cpp
#include <iostream>
using namespace std;

class RecScan {
public:
    virtual void next() = 0;
    virtual ~RecScan() = default;
};

// 全表扫描子类
class SeqScan : public RecScan {
public:
    void next() override {
        cout << "全表扫描：下一条记录" << endl;
    }
};

// 索引扫描子类
class IndexScan : public RecScan {
public:
    void next() override {
        cout << "索引扫描：下一条记录" << endl;
    }
};

int main() {
    RecScan *s1 = new SeqScan();
    RecScan *s2 = new IndexScan();
    s1->next();
    s2->next();
    delete s1;
    delete s2;
    return 0;
}
```




































## ifstream
```cpp
std::ifstream ifs(DB_META_NAME);
```
std::fstream = input file stream
from `<fstream>`
```
文件 ──[ifstream 管道]──► 你的程序
```

## map<>
## unique_ptr
- `unique_ptr` **禁止拷贝、只能移动**，保证"一个文件只有一个句柄对象拥有它"
## 句柄
- `RmFileHandle` 内部持有**文件描述符**这种系统资源，拷贝一个句柄会导致两个对象同时管一个 fd，关一个另一个就废了

## 文件描述符
**文件描述符是操作系统分配给"已打开文件"的一个非负整数编号，程序之后用这个编号来指代那个文件，进行读、写、关闭等操作**

进程打开文件时，**操作系统内核**会在内核里维护一张表，叫**打开文件表**（open file table）。每打开一个文件，就占一个表项。fd 就是**这个表项在表里的下标**。

```text
进程的"文件描述符表"（内核里，每个进程一份）：
┌─────┬──────────────────────────────┐
│ fd  │ 指向内核的"打开文件表项"        │
├─────┼──────────────────────────────┤
│  0  │ ──► 标准输入（键盘/终端）       │
│  1  │ ──► 标准输出（屏幕/终端）       │
│  2  │ ──► 标准错误（屏幕/终端）       │
│  3  │ ──► student.dat 的打开文件表项  │  ← 你的数据库打开的表文件
│  4  │ ──► course.dat 的打开文件表项   │
│ ... │ ...                          │
└─────┴──────────────────────────────┘
```

- **fd 是整数**：因为它是数组下标，当然用整数
    
- **fd 是进程私有的**：A 进程的 fd=3 和 B 进程的 fd=3 可能指向完全不同的文件
    
- **fd 是"句柄"**：程序不直接碰文件，而是拿 fd 让内核代办

```text
你的程序
  │  持有 fd = 3（一个整数）
  ▼
┌─────────────────────────────────────────────┐
│ 进程 A 的 fd 表（内核里，每个进程一份）          │
│  ┌─────┬──────────────────────────┐          │
│  │  0  │ ──► stdin 的打开文件表项   │          │
│  │  1  │ ──► stdout 的打开文件表项  │          │
│  │  2  │ ──► stderr 的打开文件表项  │          │
│  │  3  │ ──► ┐                    │          │
│  │ ... │     │                    │          │
│  └─────┴─────┼────────────────────┘          │
└──────────────┼───────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ 系统级"打开文件表"（open file description）    │
│  ┌──────────────────────────────────────┐    │
│  │ 偏移量 = 0                            │    │
│  │ 模式 = O_RDWR                         │    │
│  │ 引用计数 = 1                          │    │
│  │ inode 指针 ──► ┐                      │    │
│  └───────────────┼──────────────────────┘    │
└──────────────────┼───────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ inode 表（文件系统级）                         │
│  ┌──────────────────────────────────────┐    │
│  │ student.dat 的 inode                  │    │
│  │   大小 = 4096 字节                     │    │
│  │   权限 = rw-r--r--                    │    │
│  │   数据块 ──► 磁盘块 100, 101, ...      │    │
│  └──────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```
