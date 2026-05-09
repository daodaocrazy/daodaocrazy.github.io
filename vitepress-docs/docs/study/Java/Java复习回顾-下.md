# Java复习回顾（下）

[返回上篇](./Java复习回顾)

# 2. Java虚拟机(JVM)





> [String的内存和intern()方法](https://www.cnblogs.com/wangshen31/p/10404353.html) <= 推荐
>
> ```java
> public static void main(String[] args) {
> String str1 = new StringBuilder("计算机").append("软件").toString();
> System.out.println(str1.intern() == str1);
> 
> String str2 = new StringBuilder("ja").append("va0008").toString();
> System.out.println(str2.intern() == "java0008");
> // jdk8的常量池和常量对象的引用都在堆中
> }
> ```
>
> ```shell
> Connected to the target VM, address: '127.0.0.1:57704', transport: 'socket'
> true
> true
> Disconnected from the target VM, address: '127.0.0.1:57704', transport: 'socket'
> ```
>
> 
>
> [[Java字节码指令收集大全](https://www.cnblogs.com/longjee/p/8675771.html)](https://www.cnblogs.com/longjee/p/8675771.html)
>
> [Java直接内存原理](https://blog.csdn.net/zxcc1314/article/details/87826665) <= 推荐阅读
>
> 直接内存也是在用户空间（和堆内存不相同位置）
>
> IO操作需要内核态，普通堆内存写回文件，需要堆内存copy到直接内存（Native堆），然后native堆再copy到内核态内存（2次复制）
>
> 而直接内存就是在native堆上的，IO操作只经历一次内存复制（native堆copy到内核态内存）
>
> [一看你就懂，超详细java中的ClassLoader详解](https://blog.csdn.net/briblue/article/details/54973413)
>
> [【JAVA核心】Java GC机制详解](https://blog.csdn.net/laomo_bible/article/details/83112622)
>
> [如何查看Java程序使用内存的情况](https://blog.csdn.net/Marmara01/article/details/85225308)
>
> ```java
> package InterView;
> 
> public class Test9 {
> 
> 	public static void main(String[] args) {
> 		// 得到JVM中的空闲内存量（单位是字节）
> 		System.out.println(Runtime.getRuntime().freeMemory());
> 		// 的JVM内存总量（单位是字节）
> 		System.out.println(Runtime.getRuntime().totalMemory());
> 		// JVM试图使用额最大内存量（单位是字节）
> 		System.out.println(Runtime.getRuntime().maxMemory());
> 		// 可用处理器的数目
> 		System.out.println(Runtime.getRuntime().availableProcessors());
> 
> 	}
> 
> }
> ```
>
> [循序渐进理解Java直接内存回收](https://blog.csdn.net/qq_39767198/article/details/100176252) 
>
> 本地内存（包括jdk8的元数据区和直接内存）
>
> 
>
> [JDK1.8之前和之后的方法区](https://blog.csdn.net/qq_41872909/article/details/87903370)
>
> jdk1.7之前：方法区位于永久代(PermGen)，永久代和堆相互隔离，永久代的大小在启动JVM时可以设置一个固定值，不可变；
> jdk.7：存储在永久代的部分数据就已经转移到Java Heap或者Native memory。但永久代仍存在于JDK 1.7中，并没有完全移除，譬如符号引用(Symbols)转移到了native memory；字符串常量池(interned strings)转移到了Java heap；类的静态变量(class statics variables )转移到了Java heap；
> jdk1.8：仍然保留方法区的概念，只不过实现方式不同。取消永久代，方法存放于元空间(Metaspace)，元空间仍然与堆不相连，但与堆共享物理内存，逻辑上可认为在堆中。
>
> 1）移除了永久代（PermGen），替换为元空间（Metaspace）；
> 2）永久代中的 class metadata 转移到了 native memory（本地内存，而不是虚拟机）；
> 3）永久代中的 interned Strings 和 class static variables 转移到了 Java heap；
> 4）永久代参数 （PermSize MaxPermSize） -> 元空间参数（MetaspaceSize MaxMetaspaceSize）。
>
> 
>
> [依赖包中System.gc()导致Full GC](https://www.cnblogs.com/cuizhiquan/p/11537678.html)
>
> [Prometheus](https://www.jianshu.com/p/93c840025f01)
>
> 
>
> [疯狂Java笔记之Java的内存与回收](https://www.jianshu.com/p/b6e7ba99593d)
>
> 
>
> [院长告诉你Java堆和本地内存到底哪个更快！（转载）](https://www.cnblogs.com/jixp/articles/6666448.html)
>
> 结论：堆内存快（因为纯用户内存，本地内存需要内核态切换慢一点，但是本地内存不依赖JVM的GC，如果需要大块内存区域，频繁GC的情况下，本地内存可以效率更高。
>
> 
>
> [一个Java对象到底占用多大内存？](https://www.cnblogs.com/zhanjindong/p/3757767.html) <== 推荐
>
> ![img](https://images0.cnblogs.com/i/288950/201405/281956463229130.png)
>
> [一个java对象占多少个字节的总结和理解](https://blog.csdn.net/jccg1000196340/article/details/79171321)
>
> [一个对象占用多少字节？](https://blog.csdn.net/jccg1000196340/article/details/79171321)
>
> 
>
> [concurrent mode failure](https://blog.csdn.net/muzhixi/article/details/105274542)
>
> CMS垃圾收集器特有的错误，CMS的垃圾清理和引用线程是并行进行的，如果在并行清理的过程中老年代的空间不足以容纳应用产生的垃圾（**也就是老年代正在清理，从年轻代晋升了新的对象，或者直接分配大对象年轻代放不下导致直接在老年代生成，这时候老年代也放不下**），则会抛出“concurrent mode failure”。
>
> 出现该错误时，老年代的垃圾收集器从CMS退化为Serial Old，所有应用线程被暂停，停顿时间变长。
>
> 
>
> [JVM：可达性分析算法](https://blog.csdn.net/qq_30757161/article/details/100524679) <== 推荐阅读
>
> 
>
> [PretenureSizeThreshold的默认值和作用](https://blog.csdn.net/qianfeng_dashuju/article/details/94456781)
>
> XX:PretenureSizeThreshold=字节大小可以设分配到新生代对象的大小限制。
>
> 　　任何比这个大的对象都不会尝试在新生代分配，将在老年代分配内存。
>
> 　　The threshold size for 1) is 64k words. The default size for PretenureSizeThreshold is 0 which says that any size can be allocated in the young generation.
>
> 　　**PretenureSizeThreshold 默认值是0，意味着任何对象都会现在新生代分配内存。**
>
> 
>
> [JVM内存区域与垃圾回收](https://zhuanlan.zhihu.com/p/99205555)
>
> [【JAVA核心】Java GC机制详解](https://blog.csdn.net/laomo_bible/article/details/83112622)
>
> [Tracing garbage collection--wiki](https://en.wikipedia.org/wiki/Tracing_garbage_collection)
>
> 
>
> [static 静态变量和静态代码块的执行顺序](https://blog.csdn.net/sinat_34089391/article/details/80439852)
>
> 总之就是按顺序，但是静态代码块里的变量要是还未初始化，时没法使用的。（虽然提前静态代码块赋值不报错，但是实际还是先等到后面的静态成员变量初始化之后才能赋值。不然未初始化就赋值的静态代码块内无法对变量进行读写操作）
>
> 
>
> [内存映射文件原理](https://blog.csdn.net/mengxingyuanlove/article/details/50986092)



[jvm](https://cyc2018.github.io/CS-Notes/#/notes/Java%20%E8%99%9A%E6%8B%9F%E6%9C%BA?id=_4-%e8%a7%a3%e6%9e%90)

接口中不可以使用静态语句块，但仍然有类变量初始化的赋值操作，因此接口与类一样都会生成 \<clinit\>() 方法。但接口与类不同的是，执行接口的 \<clinit\>() 方法不需要先执行父接口的 \<clinit\>() 方法。只有当父接口中定义的变量使用时，父接口才会初始化。另外，接口的实现类在初始化时也一样不会执行接口的 \<clinit\>() 方法。

虚拟机会保证一个类的 \<clinit\>() 方法在多线程环境下被正确的加锁和同步，如果多个线程同时初始化一个类，只会有一个线程执行这个类的 <clinit>() 方法，其它线程都会阻塞等待，直到活动线程执行 \<clinit\>() 方法完毕。如果在一个类的 \<clinit\>() 方法中有耗时的操作，就可能造成多个线程阻塞，在实际过程中此种阻塞很隐蔽。





final的静态变量，初始值直接为final指定的，而不是先初始化为0再赋值为我们指定的值。

两个都是`int value = 123`，不过后者使用`final`修饰value

```shell
Compiled from "TestObject001.java"
public class TestObject001 {
  public static int value;

  public TestObject001();
    Code:
       0: aload_0
       1: invokespecial #1                  // Method java/lang/Object."<init>":()V
       4: return

  static {};
    Code:
       0: bipush        123
       2: putstatic     #2                  // Field value:I
       5: return
}
```



```shell
Compiled from "TestObject002.java"
public class TestObject002 {
  public static final int value;

  public TestObject002();
    Code:
       0: aload_0
       1: invokespecial #1                  // Method java/lang/Object."<init>":()V
       4: return
}

```









虚引用PhatomReference

```java
import org.junit.jupiter.api.Test;

import java.lang.ref.PhantomReference;
import java.lang.ref.ReferenceQueue;

public class PhatomTest {

    @Test
    public void test001() throws InterruptedException {
        Test71283 test71283 = new Test71283();
        ReferenceQueue<Object> queue = new ReferenceQueue<>();
        // (1) 新建queue确认是否为空
        print(queue);
        PhantomReference<Test71283> phantomReference = new PhantomReference<>(test71283, queue);
        // (2) 创建虚引用后，查看queue是否为空
        print(queue);
        test71283 = null;
        // (3) 虚引用指向的引用对象为null时，查看queue是否为空
        print(queue);
        // (4) sleep(1000)等待GC线程执行，查看queue是否为空
//        Thread.sleep(1000);
        print(queue);
        // (5) 要求gc，查看queue是否为空
        System.gc();
        print(queue);
        // (6) 主线程休眠一段时间，查看queue是否为空
//        Thread.sleep(1000);
        print(queue);
    }

    public void print(ReferenceQueue<Object> queue) {
        Object obj = null;
        boolean isEmpty = true;
        while ((obj = queue.poll()) != null) {
            System.out.println("queue不为空: " + obj);
            isEmpty = false;
        }
        if (isEmpty) {
            System.out.println("queue为空!!!!!");
        }
    }
}

class Test71283 {
}
```

输出

```shell
queue为空!!!!!
queue为空!!!!!
queue为空!!!!!
queue为空!!!!!
queue为空!!!!!
queue不为空: java.lang.ref.PhantomReference@79924b
```
