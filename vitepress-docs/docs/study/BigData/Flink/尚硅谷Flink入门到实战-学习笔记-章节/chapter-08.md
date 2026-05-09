> 文档：尚硅谷Flink入门到实战-学习笔记

[返回总览](../尚硅谷Flink入门到实战-学习笔记) | [上一章：7. 时间语义和Watermark](./chapter-07) | [下一章：9. ProcessFunction API(底层API)](./chapter-09)

# 8. Flink状态管理

> [Flink_Flink中的状态](https://blog.csdn.net/dongkang123456/article/details/108430338)
>
> [Flink状态管理详解：Keyed State和Operator List State深度解析](https://zhuanlan.zhihu.com/p/104171679)	<=	不错的文章，建议阅读

+ 算子状态（Operator State）
+ 键控状态（Keyed State）
+ 状态后端（State Backends）

## 8.1 状态概述

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200906125916475.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2RvbmdrYW5nMTIzNDU2,size_16,color_FFFFFF,t_70#pic_center)

- 由一个任务维护，并且用来计算某个结果的所有数据，都属于这个任务的状态
- 可以认为任务状态就是一个本地变量，可以被任务的业务逻辑访问
- **Flink 会进行状态管理，包括状态一致性、故障处理以及高效存储和访问，以便于开发人员可以专注于应用程序的逻辑**

---

- **在Flink中，状态始终与特定算子相关联**
- 为了使运行时的Flink了解算子的状态，算子需要预先注册其状态

**总的来说，有两种类型的状态：**

+ **算子状态（Operator State）**
  + 算子状态的作用范围限定为**算子任务**（也就是不能跨任务访问）
+ **键控状态（Keyed State）**
  + 根据输入数据流中定义的键（key）来维护和访问

## 8.2 算子状态 Operator State

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200906173949148.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2RvbmdrYW5nMTIzNDU2,size_16,color_FFFFFF,t_70#pic_center)

+ 算子状态的作用范围限定为算子任务，同一并行任务所处理的所有数据都可以访问到相同的状态。

+ 状态对于**同一任务**而言是共享的。（**不能跨slot**）

+ 状态算子不能由相同或不同算子的另一个任务访问。

### 算子状态数据结构

+ 列表状态(List state) 
  +  将状态表示为一组数据的列表

+ 联合列表状态(Union list state)
  + 也将状态表示未数据的列表。它与常规列表状态的区别在于，在发生故障时，或者从保存点(savepoint)启动应用程序时如何恢复

+ 广播状态(Broadcast state)
  + 如果一个算子有多项任务，而它的每项任务状态又都相同，那么这种特殊情况最适合应用广播状态

### 测试代码

实际一般用算子状态比较少，一般还是键控状态用得多一点。

```java
package apitest.state;

import apitest.beans.SensorReading;
import org.apache.flink.api.common.functions.MapFunction;
import org.apache.flink.streaming.api.checkpoint.ListCheckpointed;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;

import java.util.Collections;
import java.util.List;

/**
 * @author : daodaocrazy email: daodaocrazy@outlook.com
 * @date : 2021/2/2 4:05 AM
 */
public class StateTest1_OperatorState {

  public static void main(String[] args) throws Exception {
    StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
    env.setParallelism(1);

    // socket文本流
    DataStream<String> inputStream = env.socketTextStream("localhost", 7777);

    // 转换成SensorReading类型
    DataStream<SensorReading> dataStream = inputStream.map(line -> {
      String[] fields = line.split(",");
      return new SensorReading(fields[0], new Long(fields[1]), new Double(fields[2]));
    });

    // 定义一个有状态的map操作，统计当前分区数据个数
    SingleOutputStreamOperator<Integer> resultStream = dataStream.map(new MyCountMapper());

    resultStream.print();

    env.execute();
  }

  // 自定义MapFunction
  public static class MyCountMapper implements MapFunction<SensorReading, Integer>, ListCheckpointed<Integer> {
    // 定义一个本地变量，作为算子状态
    private Integer count = 0;

    @Override
    public Integer map(SensorReading value) throws Exception {
      count++;
      return count;
    }

    @Override
    public List<Integer> snapshotState(long checkpointId, long timestamp) throws Exception {
      return Collections.singletonList(count);
    }

    @Override
    public void restoreState(List<Integer> state) throws Exception {
      for (Integer num : state) {
        count += num;
      }
    }
  }
}
```

输入(本地开启socket后输入)

```shell
sensor_1,1547718199,35.8
sensor_1,1547718199,35.8
sensor_1,1547718199,35.8
sensor_1,1547718199,35.8
sensor_1,1547718199,35.8
```

输出

```shell
1
2
3
4
5
```

## 8.3 键控状态 Keyed State

> [Flink_Flink中的状态](https://blog.csdn.net/dongkang123456/article/details/108430338)

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200906182710217.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2RvbmdrYW5nMTIzNDU2,size_16,color_FFFFFF,t_70#pic_center)

+ 键控状态是根据输入数据流中定义的键（key）来维护和访问的。

+ **Flink 为每个key维护一个状态实例，并将具有相同键的所有数据，都分区到同一个算子任务中，这个任务会维护和处理这个key对应的状态。**

+ **当任务处理一条数据时，他会自动将状态的访问范围限定为当前数据的key**。

### 键控状态数据结构

+ 值状态(value state)
  + 将状态表示为单个的值

+ 列表状态(List state)
  + 将状态表示为一组数据的列表

+ 映射状态(Map state)
  + 将状态表示为一组key-value对

+ **聚合状态(Reducing state & Aggregating State)**
  + 将状态表示为一个用于聚合操作的列表

### 测试代码

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200906183806458.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L2RvbmdrYW5nMTIzNDU2,size_16,color_FFFFFF,t_70#pic_center)

*注：声明一个键控状态，一般在算子的open()中声明，因为运行时才能获取上下文信息*

+ java测试代码

  ```java
  package apitest.state;
  
  import apitest.beans.SensorReading;
  import org.apache.flink.api.common.functions.RichMapFunction;
  import org.apache.flink.api.common.state.*;
  import org.apache.flink.configuration.Configuration;
  import org.apache.flink.streaming.api.datastream.DataStream;
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/2 5:41 PM
   */
  public class StateTest2_KeyedState {
  
    public static void main(String[] args) throws Exception {
      // 创建执行环境
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      // 设置并行度 = 1
      env.setParallelism(1);
      // 从本地socket读取数据
      DataStream<String> inputStream = env.socketTextStream("localhost", 7777);
  
      // 转换成SensorReading类型
      DataStream<SensorReading> dataStream = inputStream.map(line -> {
        String[] fields = line.split(",");
        return new SensorReading(fields[0], new Long(fields[1]), new Double(fields[2]));
      });
  
      // 使用自定义map方法，里面使用 我们自定义的Keyed State
      DataStream<Integer> resultStream = dataStream
        .keyBy(SensorReading::getId)
        .map(new MyMapper());
  
      resultStream.print("result");
      env.execute();
    }
  
    // 自定义map富函数，测试 键控状态
    public static class MyMapper extends RichMapFunction<SensorReading,Integer>{
  
      //        Exception in thread "main" java.lang.IllegalStateException: The runtime context has not been initialized.
      //        ValueState<Integer> valueState = getRuntimeContext().getState(new ValueStateDescriptor<Integer>("my-int", Integer.class));
  
      private ValueState<Integer> valueState;
  
  
      // 其它类型状态的声明
      private ListState<String> myListState;
      private MapState<String, Double> myMapState;
      private ReducingState<SensorReading> myReducingState;
  
      @Override
      public void open(Configuration parameters) throws Exception {
        valueState = getRuntimeContext().getState(new ValueStateDescriptor<Integer>("my-int", Integer.class));
  
        myListState = getRuntimeContext().getListState(new ListStateDescriptor<String>("my-list", String.class));
        myMapState = getRuntimeContext().getMapState(new MapStateDescriptor<String, Double>("my-map", String.class, Double.class));
        //            myReducingState = getRuntimeContext().getReducingState(new ReducingStateDescriptor<SensorReading>())
  
      }
  
      // 这里就简单的统计每个 传感器的 信息数量
      @Override
      public Integer map(SensorReading value) throws Exception {
        // 其它状态API调用
        // list state
        for(String str: myListState.get()){
          System.out.println(str);
        }
        myListState.add("hello");
        // map state
        myMapState.get("1");
        myMapState.put("2", 12.3);
        myMapState.remove("2");
        // reducing state
        //            myReducingState.add(value);
  
        myMapState.clear();
  
  
        Integer count = valueState.value();
        // 第一次获取是null，需要判断
        count = count==null?0:count;
        ++count;
        valueState.update(count);
        return count;
      }
    }
  }
  ```

### 场景测试

假设做一个温度报警，如果一个传感器前后温差超过10度就报警。这里使用键控状态Keyed State + flatMap来实现

+ java代码

  ```java
  package apitest.state;
  
  import apitest.beans.SensorReading;
  import org.apache.flink.api.common.functions.RichFlatMapFunction;
  import org.apache.flink.api.common.state.ValueState;
  import org.apache.flink.api.common.state.ValueStateDescriptor;
  import org.apache.flink.api.java.tuple.Tuple3;
  import org.apache.flink.configuration.Configuration;
  import org.apache.flink.streaming.api.datastream.DataStream;
  import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.util.Collector;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/2 6:37 PM
   */
  public class StateTest3_KeyedStateApplicationCase {
  
    public static void main(String[] args) throws Exception {
      // 创建执行环境
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      // 设置并行度 = 1
      env.setParallelism(1);
      // 从socket获取数据
      DataStream<String> inputStream = env.socketTextStream("localhost", 7777);
      // 转换为SensorReading类型
      DataStream<SensorReading> dataStream = inputStream.map(line -> {
        String[] fields = line.split(",");
        return new SensorReading(fields[0], new Long(fields[1]), new Double(fields[2]));
      });
  
      SingleOutputStreamOperator<Tuple3<String, Double, Double>> resultStream = dataStream.keyBy(SensorReading::getId).flatMap(new MyFlatMapper(10.0));
  
      resultStream.print();
  
      env.execute();
    }
  
    // 如果 传感器温度 前后差距超过指定温度(这里指定10.0),就报警
    public static class MyFlatMapper extends RichFlatMapFunction<SensorReading, Tuple3<String, Double, Double>> {
  
      // 报警的温差阈值
      private final Double threshold;
  
      // 记录上一次的温度
      ValueState<Double> lastTemperature;
  
      public MyFlatMapper(Double threshold) {
        this.threshold = threshold;
      }
  
      @Override
      public void open(Configuration parameters) throws Exception {
        // 从运行时上下文中获取keyedState
        lastTemperature = getRuntimeContext().getState(new ValueStateDescriptor<Double>("last-temp", Double.class));
      }
  
      @Override
      public void close() throws Exception {
        // 手动释放资源
        lastTemperature.clear();
      }
  
      @Override
      public void flatMap(SensorReading value, Collector<Tuple3<String, Double, Double>> out) throws Exception {
        Double lastTemp = lastTemperature.value();
        Double curTemp = value.getTemperature();
  
        // 如果不为空，判断是否温差超过阈值，超过则报警
        if (lastTemp != null) {
          if (Math.abs(curTemp - lastTemp) >= threshold) {
            out.collect(new Tuple3<>(value.getId(), lastTemp, curTemp));
          }
        }
  
        // 更新保存的"上一次温度"
        lastTemperature.update(curTemp);
      }
    }
  }
  ```

+ 启动socket

  ```shell
  nc -lk 7777
  ```

+ 输入数据，查看结果

  + 输入

    ```shell
    sensor_1,1547718199,35.8
    sensor_1,1547718199,32.4
    sensor_1,1547718199,42.4
    sensor_10,1547718205,52.6   
    sensor_10,1547718205,22.5
    sensor_7,1547718202,6.7
    sensor_7,1547718202,9.9
    sensor_1,1547718207,36.3
    sensor_7,1547718202,19.9
    sensor_7,1547718202,30
    ```

  + 输出

    *中间没有输出（sensor_7,9.9,19.9)，应该是double浮点数计算精度问题，不管它*

    ```shell
    (sensor_1,32.4,42.4)
    (sensor_10,52.6,22.5)
    (sensor_7,19.9,30.0)
    ```

## 8.4 状态后端 State Backends

> [Flink_Flink中的状态](https://blog.csdn.net/dongkang123456/article/details/108430338)

### 8.4.1 概述

+ 每传入一条数据，有状态的算子任务都会读取和更新状态。

+ 由于有效的状态访问对于处理数据的低延迟至关重要，因此每个并行任务都会在本地维护其状态，以确保快速的状态访问。

+ 状态的存储、访问以及维护，由一个可插入的组件决定，这个组件就叫做**状态后端( state backend)**

+ **状态后端主要负责两件事：本地状态管理，以及将检查点(checkPoint)状态写入远程存储**

### 8.4.2 选择一个状态后端

+ MemoryStateBackend
  + 内存级的状态后端，会将键控状态作为内存中的对象进行管理，将它们存储在TaskManager的JVM堆上，而将checkpoint存储在JobManager的内存中
  + 特点：快速、低延迟，但不稳定
+ FsStateBackend（默认）
  + 将checkpoint存到远程的持久化文件系统（FileSystem）上，而对于本地状态，跟MemoryStateBackend一样，也会存在TaskManager的JVM堆上
  + 同时拥有内存级的本地访问速度，和更好的容错保证
+ RocksDBStateBackend
  + 将所有状态序列化后，存入本地的RocksDB中存储

### 8.4.3 配置文件

`flink-conf.yaml`

```yaml
#==============================================================================
# Fault tolerance and checkpointing
#==============================================================================

# The backend that will be used to store operator state checkpoints if
# checkpointing is enabled.
#
# Supported backends are 'jobmanager', 'filesystem', 'rocksdb', or the
# <class-name-of-factory>.
#
# state.backend: filesystem
上面这个就是默认的checkpoint存在filesystem


# Directory for checkpoints filesystem, when using any of the default bundled
# state backends.
#
# state.checkpoints.dir: hdfs://namenode-host:port/flink-checkpoints

# Default target directory for savepoints, optional.
#
# state.savepoints.dir: hdfs://namenode-host:port/flink-savepoints

# Flag to enable/disable incremental checkpoints for backends that
# support incremental checkpoints (like the RocksDB state backend). 
#
# state.backend.incremental: false

# The failover strategy, i.e., how the job computation recovers from task failures.
# Only restart tasks that may have been affected by the task failure, which typically includes
# downstream tasks and potentially upstream tasks if their produced data is no longer available for consumption.

jobmanager.execution.failover-strategy: region

上面这个region指，多个并行度的任务要是有个挂掉了，只重启那个任务所属的region（可能含有多个子任务），而不需要重启整个Flink程序
```

### 8.4.4 样例代码

+ 其中使用RocksDBStateBackend需要另外加入pom依赖

  ```xml
  <!-- RocksDBStateBackend -->
  <dependency>
    <groupId>org.apache.flink</groupId>
    <artifactId>flink-statebackend-rocksdb_${scala.binary.version}</artifactId>
    <version>${flink.version}</version>
  </dependency>
  ```

+ java代码

  ```java
  package apitest.state;
  
  import apitest.beans.SensorReading;
  import org.apache.flink.api.common.restartstrategy.RestartStrategies;
  import org.apache.flink.api.common.time.Time;
  import org.apache.flink.contrib.streaming.state.RocksDBStateBackend;
  import org.apache.flink.runtime.state.filesystem.FsStateBackend;
  import org.apache.flink.runtime.state.memory.MemoryStateBackend;
  import org.apache.flink.streaming.api.CheckpointingMode;
  import org.apache.flink.streaming.api.datastream.DataStream;
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/2 11:35 PM
   */
  public class StateTest4_FaultTolerance {
      public static void main(String[] args) throws Exception {
          StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
          env.setParallelism(1);
  
          // 1. 状态后端配置
          env.setStateBackend(new MemoryStateBackend());
          env.setStateBackend(new FsStateBackend("checkpointDataUri"));
          // 这个需要另外导入依赖
          env.setStateBackend(new RocksDBStateBackend("checkpointDataUri"));
  
          // socket文本流
          DataStream<String> inputStream = env.socketTextStream("localhost", 7777);
  
          // 转换成SensorReading类型
          DataStream<SensorReading> dataStream = inputStream.map(line -> {
              String[] fields = line.split(",");
              return new SensorReading(fields[0], new Long(fields[1]), new Double(fields[2]));
          });
  
          dataStream.print();
          env.execute();
      }
  }
  ```

---

[返回总览](../尚硅谷Flink入门到实战-学习笔记) | [上一章：7. 时间语义和Watermark](./chapter-07) | [下一章：9. ProcessFunction API(底层API)](./chapter-09)
