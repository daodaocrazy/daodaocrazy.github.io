> 文档：尚硅谷Flink入门到实战-学习笔记

[返回总览](../尚硅谷Flink入门到实战-学习笔记) | [上一章：8. Flink状态管理](./chapter-08) | [下一章：10. 容错机制](./chapter-10)

# 9. ProcessFunction API(底层API)

​	我们之前学习的**转换算子**是无法访问事件的<u>时间戳信息和水位线信息</u>的。而这在一些应用场景下，极为重要。例如MapFunction这样的map转换算子就无法访问时间戳或者当前事件的事件时间。

​	基于此，DataStream API提供了一系列的Low-Level转换算子。可以**访问时间戳**、**watermark**以及**注册定时事件**。还可以输出**特定的一些事件**，例如超时事件等。<u>Process Function用来构建事件驱动的应用以及实现自定义的业务逻辑(使用之前的window函数和转换算子无法实现)。例如，FlinkSQL就是使用Process Function实现的</u>。

Flink提供了8个Process Function：

- ProcessFunction
- KeyedProcessFunction
- CoProcessFunction
- ProcessJoinFunction
- BroadcastProcessFunction
- KeyedBroadcastProcessFunction
- ProcessWindowFunction
- ProcessAllWindowFunction

## 9.1 KeyedProcessFunction

​	这个是相对比较常用的ProcessFunction，根据名字就可以知道是用在keyedStream上的。

​	KeyedProcessFunction用来操作KeyedStream。KeyedProcessFunction会处理流的每一个元素，输出为0个、1个或者多个元素。所有的Process Function都继承自RichFunction接口，所以都有`open()`、`close()`和`getRuntimeContext()`等方法。而`KeyedProcessFunction<K, I, O>`还额外提供了两个方法:

+ `processElement(I value, Context ctx, Collector<O> out)`，流中的每一个元素都会调用这个方法，调用结果将会放在Collector数据类型中输出。Context可以访问元素的时间戳，元素的 key ，以及TimerService 时间服务。 Context 还可以将结果输出到别的流(side outputs)。
+ `onTimer(long timestamp, OnTimerContext ctx, Collector<O> out)`，是一个回调函数。当之前注册的定时器触发时调用。参数timestamp 为定时器所设定的触发的时间戳。Collector 为输出结果的集合。OnTimerContext和processElement的Context 参数一样，提供了上下文的一些信息，例如定时器触发的时间信息(事件时间或者处理时间)。

### 测试代码

设置一个获取数据后第5s给出提示信息的定时器。

```java
package processfunction;

import apitest.beans.SensorReading;
import org.apache.flink.api.common.state.ValueState;
import org.apache.flink.api.common.state.ValueStateDescriptor;
import org.apache.flink.api.java.tuple.Tuple;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
import org.apache.flink.util.Collector;

/**
 * @author : daodaocrazy email: daodaocrazy@outlook.com
 * @date : 2021/2/3 12:30 AM
 */
public class ProcessTest1_KeyedProcessFunction {
  public static void main(String[] args) throws Exception{
    StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
    env.setParallelism(1);

    // socket文本流
    DataStream<String> inputStream = env.socketTextStream("localhost", 7777);

    // 转换成SensorReading类型
    DataStream<SensorReading> dataStream = inputStream.map(line -> {
      String[] fields = line.split(",");
      return new SensorReading(fields[0], new Long(fields[1]), new Double(fields[2]));
    });

    // 测试KeyedProcessFunction，先分组然后自定义处理
    dataStream.keyBy("id")
      .process( new MyProcess() )
      .print();

    env.execute();
  }

  // 实现自定义的处理函数
  public static class MyProcess extends KeyedProcessFunction<Tuple, SensorReading, Integer> {
    ValueState<Long> tsTimerState;

    @Override
    public void open(Configuration parameters) throws Exception {
      tsTimerState =  getRuntimeContext().getState(new ValueStateDescriptor<Long>("ts-timer", Long.class));
    }

    @Override
    public void processElement(SensorReading value, Context ctx, Collector<Integer> out) throws Exception {
      out.collect(value.getId().length());

      // context
      // Timestamp of the element currently being processed or timestamp of a firing timer.
      ctx.timestamp();
      // Get key of the element being processed.
      ctx.getCurrentKey();
      //            ctx.output();
      ctx.timerService().currentProcessingTime();
      ctx.timerService().currentWatermark();
      // 在5处理时间的5秒延迟后触发
      ctx.timerService().registerProcessingTimeTimer( ctx.timerService().currentProcessingTime() + 5000L);
      tsTimerState.update(ctx.timerService().currentProcessingTime() + 1000L);
      //            ctx.timerService().registerEventTimeTimer((value.getTimestamp() + 10) * 1000L);
      // 删除指定时间触发的定时器
      //            ctx.timerService().deleteProcessingTimeTimer(tsTimerState.value());
    }

    @Override
    public void onTimer(long timestamp, OnTimerContext ctx, Collector<Integer> out) throws Exception {
      System.out.println(timestamp + " 定时器触发");
      ctx.getCurrentKey();
      //            ctx.output();
      ctx.timeDomain();
    }

    @Override
    public void close() throws Exception {
      tsTimerState.clear();
    }
  }
}
```

启动本地socket

```shell
nc -lk 7777
```

输入

```shell
sensor_1,1547718207,36.3
```

输出

```shell
8
1612283803911 定时器触发
```

## 9.2 TimerService和定时器(Timers)

​	Context 和OnTimerContext 所持有的TimerService 对象拥有以下方法：

+ `long currentProcessingTime()` 返回当前处理时间

+ `long currentWatermark()` 返回当前watermark 的时间戳

+ `void registerProcessingTimeTimer( long timestamp)` 会注册当前key的processing time的定时器。当processing time 到达定时时间时，触发timer。

+ **`void registerEventTimeTimer(long timestamp)` 会注册当前key 的event time 定时器。当Watermark水位线大于等于定时器注册的时间时，触发定时器执行回调函数。**

+ `void deleteProcessingTimeTimer(long timestamp)` 删除之前注册处理时间定时器。如果没有这个时间戳的定时器，则不执行。

+ `void deleteEventTimeTimer(long timestamp)` 删除之前注册的事件时间定时器，如果没有此时间戳的定时器，则不执行。

​	**当定时器timer 触发时，会执行回调函数onTimer()。注意定时器timer 只能在keyed streams 上面使用。**

### 测试代码

下面举个例子说明KeyedProcessFunction 如何操作KeyedStream。

需求：监控温度传感器的温度值，如果温度值在10 秒钟之内(processing time)连续上升，则报警。

+ java代码

  ```java
  package processfunction;
  
  import apitest.beans.SensorReading;
  import org.apache.flink.api.common.state.ValueState;
  import org.apache.flink.api.common.state.ValueStateDescriptor;
  import org.apache.flink.api.common.time.Time;
  import org.apache.flink.configuration.Configuration;
  import org.apache.flink.streaming.api.datastream.DataStream;
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
  import org.apache.flink.util.Collector;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/3 1:02 AM
   */
  public class ProcessTest2_ApplicationCase {
  
    public static void main(String[] args) throws Exception {
      // 创建执行环境
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      // 设置并行度为1
      env.setParallelism(1);
      // 从socket中获取数据
      DataStream<String> inputStream = env.socketTextStream("localhost", 7777);
      // 转换数据为SensorReading类型
      DataStream<SensorReading> sensorReadingStream = inputStream.map(line -> {
        String[] fields = line.split(",");
        return new SensorReading(fields[0], new Long(fields[1]), new Double(fields[2]));
      });
      // 如果存在连续10s内温度持续上升的情况，则报警
      sensorReadingStream.keyBy(SensorReading::getId)
        .process(new TempConsIncreWarning(Time.seconds(10).toMilliseconds()))
        .print();
      env.execute();
    }
  
    // 如果存在连续10s内温度持续上升的情况，则报警
    public static class TempConsIncreWarning extends KeyedProcessFunction<String, SensorReading, String> {
  
      public TempConsIncreWarning(Long interval) {
        this.interval = interval;
      }
  
      // 报警的时间间隔(如果在interval时间内温度持续上升，则报警)
      private Long interval;
  
      // 上一个温度值
      private ValueState<Double> lastTemperature;
      // 最近一次定时器的触发时间(报警时间)
      private ValueState<Long> recentTimerTimeStamp;
  
      @Override
      public void open(Configuration parameters) throws Exception {
        lastTemperature = getRuntimeContext().getState(new ValueStateDescriptor<Double>("lastTemperature", Double.class));
        recentTimerTimeStamp = getRuntimeContext().getState(new ValueStateDescriptor<Long>("recentTimerTimeStamp", Long.class));
      }
  
      @Override
      public void close() throws Exception {
        lastTemperature.clear();
        recentTimerTimeStamp.clear();
      }
  
      @Override
      public void processElement(SensorReading value, Context ctx, Collector<String> out) throws Exception {
        // 当前温度值
        double curTemp = value.getTemperature();
        // 上一次温度(没有则设置为当前温度)
        double lastTemp = lastTemperature.value() != null ? lastTemperature.value() : curTemp;
        // 计时器状态值(时间戳)
        Long timerTimestamp = recentTimerTimeStamp.value();
  
        // 如果 当前温度 > 上次温度 并且 没有设置报警计时器，则设置
        if (curTemp > lastTemp && null == timerTimestamp) {
          long warningTimestamp = ctx.timerService().currentProcessingTime() + interval;
          ctx.timerService().registerProcessingTimeTimer(warningTimestamp);
          recentTimerTimeStamp.update(warningTimestamp);
        }
        // 如果 当前温度 < 上次温度，且 设置了报警计时器，则清空计时器
        else if (curTemp <= lastTemp && timerTimestamp != null) {
          ctx.timerService().deleteProcessingTimeTimer(timerTimestamp);
          recentTimerTimeStamp.clear();
        }
        // 更新保存的温度值
        lastTemperature.update(curTemp);
      }
  
      // 定时器任务
      @Override
      public void onTimer(long timestamp, OnTimerContext ctx, Collector<String> out) throws Exception {
        // 触发报警，并且清除 定时器状态值
        out.collect("传感器" + ctx.getCurrentKey() + "温度值连续" + interval + "ms上升");
        recentTimerTimeStamp.clear();
      }
    }
  }
  ```

+ 启动本地socket，之后输入数据

  ```shell
  nc -lk 7777
  ```

  + 输入

    ```shell
    sensor_1,1547718199,35.8
    sensor_1,1547718199,34.1
    sensor_1,1547718199,34.2
    sensor_1,1547718199,35.1
    sensor_6,1547718201,15.4
    sensor_7,1547718202,6.7
    sensor_10,1547718205,38.1
    sensor_10,1547718205,39  
    sensor_6,1547718201,18  
    sensor_7,1547718202,9.1
    ```

  + 输出

    ```shell
    传感器sensor_1温度值连续10000ms上升
    传感器sensor_10温度值连续10000ms上升
    传感器sensor_6温度值连续10000ms上升
    传感器sensor_7温度值连续10000ms上升
    ```

## 9.3 侧输出流（SideOutput）

+ **一个数据可以被多个window包含，只有其不被任何window包含的时候(包含该数据的所有window都关闭之后)，才会被丢到侧输出流。**
+ **简言之，如果一个数据被丢到侧输出流，那么所有包含该数据的window都由于已经超过了"允许的迟到时间"而关闭了，进而新来的迟到数据只能被丢到侧输出流！**

----

+ 大部分的DataStream API 的算子的输出是单一输出，也就是某种数据类型的流。除了split 算子，可以将一条流分成多条流，这些流的数据类型也都相同。

+ **processfunction 的side outputs 功能可以产生多条流，并且这些流的数据类型可以不一样。**

+ 一个side output 可以定义为OutputTag[X]对象，X 是输出流的数据类型。

+ processfunction 可以通过Context 对象发射一个事件到一个或者多个side outputs。

### 测试代码

场景：温度>=30放入高温流输出，反之放入低温流输出

+ java代码

  ```java
  package processfunction;
  
  import apitest.beans.SensorReading;
  import org.apache.flink.streaming.api.datastream.DataStream;
  import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.streaming.api.functions.ProcessFunction;
  import org.apache.flink.util.Collector;
  import org.apache.flink.util.OutputTag;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/3 2:07 AM
   */
  public class ProcessTest3_SideOuptCase {
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
  
      // 定义一个OutputTag，用来表示侧输出流低温流
      // An OutputTag must always be an anonymous inner class
      // so that Flink can derive a TypeInformation for the generic type parameter.
      OutputTag<SensorReading> lowTempTag = new OutputTag<SensorReading>("lowTemp"){};
  
      // 测试ProcessFunction，自定义侧输出流实现分流操作
      SingleOutputStreamOperator<SensorReading> highTempStream = dataStream.process(new ProcessFunction<SensorReading, SensorReading>() {
        @Override
        public void processElement(SensorReading value, Context ctx, Collector<SensorReading> out) throws Exception {
          // 判断温度，大于30度，高温流输出到主流；小于低温流输出到侧输出流
          if (value.getTemperature() > 30) {
            out.collect(value);
          } else {
            ctx.output(lowTempTag, value);
          }
        }
      });
  
      highTempStream.print("high-temp");
      highTempStream.getSideOutput(lowTempTag).print("low-temp");
  
      env.execute();
    }
  }
  ```

+ 本地启动socket

  + 输入

    ```shell
    sensor_1,1547718199,35.8
    sensor_6,1547718201,15.4
    sensor_7,1547718202,6.7
    sensor_10,1547718205,38.1
    ```

  + 输出

    ```shell
    high-temp> SensorReading{id='sensor_1', timestamp=1547718199, temperature=35.8}
    low-temp> SensorReading{id='sensor_6', timestamp=1547718201, temperature=15.4}
    low-temp> SensorReading{id='sensor_7', timestamp=1547718202, temperature=6.7}
    high-temp> SensorReading{id='sensor_10', timestamp=1547718205, temperature=38.1}
    ```

## 9.4 CoProcessFunction

+ 对于两条输入流，DataStream API 提供了CoProcessFunction 这样的low-level操作。CoProcessFunction 提供了操作每一个输入流的方法: `processElement1()`和`processElement2()`。

+ **类似于ProcessFunction，这两种方法都通过Context 对象来调用**。<u>这个Context对象可以访问事件数据，定时器时间戳，TimerService，以及side outputs</u>。
+ **CoProcessFunction 也提供了onTimer()回调函数**。

---

[返回总览](../尚硅谷Flink入门到实战-学习笔记) | [上一章：8. Flink状态管理](./chapter-08) | [下一章：10. 容错机制](./chapter-10)
