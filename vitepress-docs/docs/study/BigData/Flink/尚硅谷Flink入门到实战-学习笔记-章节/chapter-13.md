> 文档：尚硅谷Flink入门到实战-学习笔记

[返回总览](../尚硅谷Flink入门到实战-学习笔记) | [上一章：12. 时间特性(Time Attributes)](./chapter-12) | [下一章：14. 基于flink的电商用户行为数据分析](./chapter-14)

# 13. 函数(Functions)

> [Flink-函数 | 用户自定义函数（UDF）标量函数 | 表函数 | 聚合函数 | 表聚合函数](https://blog.csdn.net/qq_40180229/article/details/106482550)

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200601214323293.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxXzQwMTgwMjI5,size_16,color_FFFFFF,t_70)

![在这里插入图片描述](https://img-blog.csdnimg.cn/2020060121433777.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxXzQwMTgwMjI5,size_16,color_FFFFFF,t_70)

## 13.1 用户自定义函数(UDF)

+ 用户定义函数（User-defined Functions，UDF）是一个重要的特性，它们显著地扩展了查询的表达能力

  *一些系统内置函数无法解决的需求，我们可以用UDF来自定义实现*

+ **在大多数情况下，用户定义的函数必须先注册，然后才能在查询中使用**

+ 函数通过调用 `registerFunction()` 方法在 TableEnvironment 中注册。当用户定义的函数被注册时，它被插入到 TableEnvironment 的函数目录中，这样Table API 或 SQL 解析器就可以识别并正确地解释它

### 13.1.1 标量函数(Scalar Functions)

**Scalar Funcion类似于map，一对一**

**Table Function类似flatMap，一对多**

---

+ 用户定义的标量函数，可以将0、1或多个标量值，映射到新的标量值

+ 为了定义标量函数，必须在 org.apache.flink.table.functions 中扩展基类Scalar Function，并实现（一个或多个）求值（eval）方法

+ **标量函数的行为由求值方法决定，求值方法必须public公开声明并命名为 eval**

  ```java
  public static class HashCode extends ScalarFunction {
  
    private int factor = 13;
  
    public HashCode(int factor) {
      this.factor = factor;
    }
  
    public int eval(String id) {
      return id.hashCode() * 13;
    }
  }
  ```

#### 测试代码

```java
package apitest.tableapi.udf;

import apitest.beans.SensorReading;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.table.api.Table;
import org.apache.flink.table.api.bridge.java.StreamTableEnvironment;
import org.apache.flink.table.functions.ScalarFunction;
import org.apache.flink.types.Row;

/**
 * @author : daodaocrazy email: daodaocrazy@outlook.com
 * @date : 2021/2/4 3:28 AM
 */
public class UdfTest1_ScalarFunction {
  public static void main(String[] args) throws Exception {
    // 创建执行环境
    StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
    // 并行度设置为1
    env.setParallelism(1);

    // 创建Table执行环境
    StreamTableEnvironment tableEnv = StreamTableEnvironment.create(env);

    // 1. 读取数据
    DataStream<String> inputStream = env.readTextFile("/tmp/Flink_Tutorial/src/main/resources/sensor.txt");

    // 2. 转换成POJO
    DataStream<SensorReading> dataStream = inputStream.map(line -> {
      String[] fields = line.split(",");
      return new SensorReading(fields[0], new Long(fields[1]), new Double(fields[2]));
    });

    // 3. 将流转换为表
    Table sensorTable = tableEnv.fromDataStream(dataStream, "id,timestamp as ts,temperature");

    // 4. 自定义标量函数，实现求id的hash值
    HashCode hashCode = new HashCode(23);
    // 注册UDF
    tableEnv.registerFunction("hashCode", hashCode);

    // 4.1 table API
    Table resultTable = sensorTable.select("id, ts, hashCode(id)");

    // 4.2 SQL
    tableEnv.createTemporaryView("sensor", sensorTable);
    Table resultSqlTable = tableEnv.sqlQuery("select id, ts, hashCode(id) from sensor");

    // 打印输出
    tableEnv.toAppendStream(resultTable, Row.class).print();
    tableEnv.toAppendStream(resultSqlTable, Row.class).print();

    env.execute();
  }

  public static class HashCode extends ScalarFunction {

    private int factor = 13;

    public HashCode(int factor) {
      this.factor = factor;
    }

    public int eval(String id) {
      return id.hashCode() * 13;
    }
  }
}
```

输出结果

```shell
sensor_1,1547718199,-772373508
sensor_1,1547718199,-772373508
sensor_6,1547718201,-772373443
sensor_6,1547718201,-772373443
sensor_7,1547718202,-772373430
sensor_7,1547718202,-772373430
sensor_10,1547718205,1826225652
sensor_10,1547718205,1826225652
sensor_1,1547718207,-772373508
sensor_1,1547718207,-772373508
sensor_1,1547718209,-772373508
sensor_1,1547718209,-772373508
sensor_1,1547718212,-772373508
sensor_1,1547718212,-772373508
```

### 13.1.2 表函数(Table Fcuntions)

**Scalar Funcion类似于map，一对一**

**Table Function类似flatMap，一对多**

---

+ 用户定义的表函数，也可以将0、1或多个标量值作为输入参数；**与标量函数不同的是，它可以返回任意数量的行作为输出，而不是单个值**

+ 为了定义一个表函数，必须扩展 org.apache.flink.table.functions 中的基类 TableFunction 并实现（一个或多个）求值方法

+ **表函数的行为由其求值方法决定，求值方法必须是 public 的，并命名为 eval**

  ```java
  public static class Split extends TableFunction<Tuple2<String, Integer>> {
  
    // 定义属性，分隔符
    private String separator = ",";
  
    public Split(String separator) {
      this.separator = separator;
    }
  
    public void eval(String str) {
      for (String s : str.split(separator)) {
        collect(new Tuple2<>(s, s.length()));
      }
    }
  }
  ```

#### 测试代码

```java
package apitest.tableapi.udf;

import apitest.beans.SensorReading;
import org.apache.flink.api.java.tuple.Tuple2;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.table.api.Table;
import org.apache.flink.table.api.bridge.java.StreamTableEnvironment;
import org.apache.flink.table.functions.TableFunction;
import org.apache.flink.types.Row;

/**
 * @author : daodaocrazy email: daodaocrazy@outlook.com
 * @date : 2021/2/4 3:58 AM
 */
public class UdfTest2_TableFunction {
  public static void main(String[] args) throws Exception {
    // 创建执行环境
    StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
    // 并行度设置为1
    env.setParallelism(1);

    // 创建Table执行环境
    StreamTableEnvironment tableEnv = StreamTableEnvironment.create(env);

    // 1. 读取数据
    DataStream<String> inputStream = env.readTextFile("/tmp/Flink_Tutorial/src/main/resources/sensor.txt");

    // 2. 转换成POJO
    DataStream<SensorReading> dataStream = inputStream.map(line -> {
      String[] fields = line.split(",");
      return new SensorReading(fields[0], new Long(fields[1]), new Double(fields[2]));
    });

    // 3. 将流转换为表
    Table sensorTable = tableEnv.fromDataStream(dataStream, "id,timestamp as ts,temperature");

    // 4. 自定义表函数，实现将id拆分，并输出（word, length）
    Split split = new Split("_");
    // 需要在环境中注册UDF
    tableEnv.registerFunction("split", split);

    // 4.1 table API
    Table resultTable = sensorTable
      .joinLateral("split(id) as (word, length)")
      .select("id, ts, word, length");

    // 4.2 SQL
    tableEnv.createTemporaryView("sensor", sensorTable);
    Table resultSqlTable = tableEnv.sqlQuery("select id, ts, word, length " +
                                             " from sensor, lateral table(split(id)) as splitid(word, length)");

    // 打印输出
    tableEnv.toAppendStream(resultTable, Row.class).print("result");
    tableEnv.toAppendStream(resultSqlTable, Row.class).print("sql");

    env.execute();
  }

  // 实现自定义 Table Function
  public static class Split extends TableFunction<Tuple2<String, Integer>> {

    // 定义属性，分隔符
    private String separator = ",";

    public Split(String separator) {
      this.separator = separator;
    }

    public void eval(String str) {
      for (String s : str.split(separator)) {
        collect(new Tuple2<>(s, s.length()));
      }
    }
  }
}
```

输出结果

```shell
result> sensor_1,1547718199,sensor,6
result> sensor_1,1547718199,1,1
sql> sensor_1,1547718199,sensor,6
sql> sensor_1,1547718199,1,1
result> sensor_6,1547718201,sensor,6
result> sensor_6,1547718201,6,1
sql> sensor_6,1547718201,sensor,6
sql> sensor_6,1547718201,6,1
result> sensor_7,1547718202,sensor,6
result> sensor_7,1547718202,7,1
sql> sensor_7,1547718202,sensor,6
sql> sensor_7,1547718202,7,1
result> sensor_10,1547718205,sensor,6
result> sensor_10,1547718205,10,2
sql> sensor_10,1547718205,sensor,6
sql> sensor_10,1547718205,10,2
result> sensor_1,1547718207,sensor,6
result> sensor_1,1547718207,1,1
sql> sensor_1,1547718207,sensor,6
sql> sensor_1,1547718207,1,1
result> sensor_1,1547718209,sensor,6
result> sensor_1,1547718209,1,1
sql> sensor_1,1547718209,sensor,6
sql> sensor_1,1547718209,1,1
result> sensor_1,1547718212,sensor,6
result> sensor_1,1547718212,1,1
sql> sensor_1,1547718212,sensor,6
sql> sensor_1,1547718212,1,1
```

### 13.1.3 聚合函数(Aggregate Functions)

**聚合，多对一，类似前面的窗口聚合**

---

+ 用户自定义聚合函数（User-Defined Aggregate Functions，UDAGGs）可以把一个表中的数据，聚合成一个标量值
+ 用户定义的聚合函数，是通过继承 AggregateFunction 抽象类实现的

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200601221643915.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxXzQwMTgwMjI5,size_16,color_FFFFFF,t_70)

+ AggregationFunction要求必须实现的方法
  + `createAccumulator()`
  + `accumulate()`
  + `getValue()`
+ AggregateFunction 的工作原理如下：
  + 首先，它需要一个累加器（Accumulator），用来保存聚合中间结果的数据结构；可以通过调用 `createAccumulator()` 方法创建空累加器
  + 随后，对每个输入行调用函数的 `accumulate()` 方法来更新累加器
  + 处理完所有行后，将调用函数的 `getValue()` 方法来计算并返回最终结果

#### 测试代码

```java
package apitest.tableapi.udf;

import apitest.beans.SensorReading;
import org.apache.flink.api.java.tuple.Tuple2;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.table.api.Table;
import org.apache.flink.table.api.bridge.java.StreamTableEnvironment;
import org.apache.flink.table.functions.AggregateFunction;
import org.apache.flink.types.Row;

/**
 * @author : daodaocrazy email: daodaocrazy@outlook.com
 * @date : 2021/2/4 4:24 AM
 */
public class UdfTest3_AggregateFunction {
  public static void main(String[] args) throws Exception {
    StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
    env.setParallelism(1);

    StreamTableEnvironment tableEnv = StreamTableEnvironment.create(env);

    // 1. 读取数据
    DataStream<String> inputStream = env.readTextFile("/tmp/Flink_Tutorial/src/main/resources/sensor.txt");

    // 2. 转换成POJO
    DataStream<SensorReading> dataStream = inputStream.map(line -> {
      String[] fields = line.split(",");
      return new SensorReading(fields[0], new Long(fields[1]), new Double(fields[2]));
    });

    // 3. 将流转换成表
    Table sensorTable = tableEnv.fromDataStream(dataStream, "id, timestamp as ts, temperature as temp");

    // 4. 自定义聚合函数，求当前传感器的平均温度值
    // 4.1 table API
    AvgTemp avgTemp = new AvgTemp();

    // 需要在环境中注册UDF
    tableEnv.registerFunction("avgTemp", avgTemp);
    Table resultTable = sensorTable
      .groupBy("id")
      .aggregate("avgTemp(temp) as avgtemp")
      .select("id, avgtemp");

    // 4.2 SQL
    tableEnv.createTemporaryView("sensor", sensorTable);
    Table resultSqlTable = tableEnv.sqlQuery("select id, avgTemp(temp) " +
                                             " from sensor group by id");

    // 打印输出
    tableEnv.toRetractStream(resultTable, Row.class).print("result");
    tableEnv.toRetractStream(resultSqlTable, Row.class).print("sql");

    env.execute();
  }

  // 实现自定义的AggregateFunction
  public static class AvgTemp extends AggregateFunction<Double, Tuple2<Double, Integer>> {
    @Override
    public Double getValue(Tuple2<Double, Integer> accumulator) {
      return accumulator.f0 / accumulator.f1;
    }

    @Override
    public Tuple2<Double, Integer> createAccumulator() {
      return new Tuple2<>(0.0, 0);
    }

    // 必须实现一个accumulate方法，来数据之后更新状态
    // 这里方法名必须是这个，且必须public。
    // 累加器参数，必须得是第一个参数；随后的才是我们自己传的入参
    public void accumulate(Tuple2<Double, Integer> accumulator, Double temp) {
      accumulator.f0 += temp;
      accumulator.f1 += 1;
    }
  }
}
```

输出结果：

```shell
result> (true,sensor_1,35.8)
result> (true,sensor_6,15.4)
result> (true,sensor_7,6.7)
result> (true,sensor_10,38.1)
result> (false,sensor_1,35.8)
result> (true,sensor_1,36.05)
sql> (true,sensor_1,35.8)
result> (false,sensor_1,36.05)
sql> (true,sensor_6,15.4)
result> (true,sensor_1,34.96666666666666)
sql> (true,sensor_7,6.7)
result> (false,sensor_1,34.96666666666666)
sql> (true,sensor_10,38.1)
result> (true,sensor_1,35.5)
sql> (false,sensor_1,35.8)
sql> (true,sensor_1,36.05)
sql> (false,sensor_1,36.05)
sql> (true,sensor_1,34.96666666666666)
sql> (false,sensor_1,34.96666666666666)
sql> (true,sensor_1,35.5)
```

### 13.1.4 表聚合函数

+ 用户定义的表聚合函数（User-Defined Table Aggregate Functions，UDTAGGs），可以把一个表中数据，聚合为具有多行和多列的结果表
+ 用户定义表聚合函数，是通过继承 TableAggregateFunction 抽象类来实现的

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200601223517314.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxXzQwMTgwMjI5,size_16,color_FFFFFF,t_70)

+ AggregationFunction 要求必须实现的方法：
  + `createAccumulator()`
  + `accumulate()`
  + `emitValue()`
+ TableAggregateFunction 的工作原理如下：
  + 首先，它同样需要一个累加器（Accumulator），它是保存聚合中间结果的数据结构。通过调用 `createAccumulator()` 方法可以创建空累加器。
  + 随后，对每个输入行调用函数的 `accumulate()` 方法来更新累加器。
  + 处理完所有行后，将调用函数的 `emitValue()` 方法来计算并返回最终结果。

#### 测试代码

> [Flink-函数 | 用户自定义函数（UDF）标量函数 | 表函数 | 聚合函数 | 表聚合函数](https://blog.csdn.net/qq_40180229/article/details/106482550)

```scala
import com.atguigu.bean.SensorReading
import org.apache.flink.streaming.api.TimeCharacteristic
import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor
import org.apache.flink.streaming.api.scala._
import org.apache.flink.streaming.api.windowing.time.Time
import org.apache.flink.table.api.Table
import org.apache.flink.table.api.scala._
import org.apache.flink.table.functions.TableAggregateFunction
import org.apache.flink.types.Row
import org.apache.flink.util.Collector

object TableAggregateFunctionTest {
  def main(args: Array[String]): Unit = {

    val env: StreamExecutionEnvironment = StreamExecutionEnvironment.getExecutionEnvironment
    env.setParallelism(1)

    // 开启事件时间语义
    env.setStreamTimeCharacteristic(TimeCharacteristic.EventTime)

    // 创建表环境
    val tableEnv: StreamTableEnvironment = StreamTableEnvironment.create(env)

    val inputDStream: DataStream[String] = env.readTextFile("D:\\MyWork\\WorkSpaceIDEA\\flink-tutorial\\src\\main\\resources\\SensorReading.txt")

    val dataDStream: DataStream[SensorReading] = inputDStream.map(
      data => {
        val dataArray: Array[String] = data.split(",")
        SensorReading(dataArray(0), dataArray(1).toLong, dataArray(2).toDouble)
      })
    .assignTimestampsAndWatermarks( new BoundedOutOfOrdernessTimestampExtractor[SensorReading]
                                   ( Time.seconds(1) ) {
                                     override def extractTimestamp(element: SensorReading): Long = element.timestamp * 1000L
                                   } )

    // 用proctime定义处理时间
    val dataTable: Table = tableEnv
    .fromDataStream(dataDStream, 'id, 'temperature, 'timestamp.rowtime as 'ts)

    // 使用自定义的hash函数，求id的哈希值
    val myAggTabTemp = MyAggTabTemp()

    // 查询 Table API 方式
    val resultTable: Table = dataTable
    .groupBy('id)
    .flatAggregate( myAggTabTemp('temperature) as ('temp, 'rank) )
    .select('id, 'temp, 'rank)


    // SQL调用方式，首先要注册表
    tableEnv.createTemporaryView("dataTable", dataTable)
    // 注册函数
    tableEnv.registerFunction("myAggTabTemp", myAggTabTemp)

    /*
    val resultSqlTable: Table = tableEnv.sqlQuery(
      """
        |select id, temp, `rank`
        |from dataTable, lateral table(myAggTabTemp(temperature)) as aggtab(temp, `rank`)
        |group by id
        |""".stripMargin)
*/


    // 测试输出
    resultTable.toRetractStream[ Row ].print( "scalar" )
    //resultSqlTable.toAppendStream[ Row ].print( "scalar_sql" )
    // 查看表结构
    dataTable.printSchema()

    env.execute(" table ProcessingTime test job")
  }
}

// 自定义状态类
case class AggTabTempAcc() {
  var highestTemp: Double = Double.MinValue
  var secondHighestTemp: Double = Double.MinValue
}

case class MyAggTabTemp() extends TableAggregateFunction[(Double, Int), AggTabTempAcc]{
  // 初始化状态
  override def createAccumulator(): AggTabTempAcc = new AggTabTempAcc()

  // 每来一个数据后，聚合计算的操作
  def accumulate( acc: AggTabTempAcc, temp: Double ): Unit ={
    // 将当前温度值，跟状态中的最高温和第二高温比较，如果大的话就替换
    if( temp > acc.highestTemp ){
      // 如果比最高温还高，就排第一，其它温度依次后移
      acc.secondHighestTemp = acc.highestTemp
      acc.highestTemp = temp
    } else if( temp > acc.secondHighestTemp ){
      acc.secondHighestTemp = temp
    }
  }

  // 实现一个输出数据的方法，写入结果表中
  def emitValue( acc: AggTabTempAcc, out: Collector[(Double, Int)] ): Unit ={
    out.collect((acc.highestTemp, 1))
    out.collect((acc.secondHighestTemp, 2))
  }
}
```

---

[返回总览](../尚硅谷Flink入门到实战-学习笔记) | [上一章：12. 时间特性(Time Attributes)](./chapter-12) | [下一章：14. 基于flink的电商用户行为数据分析](./chapter-14)
