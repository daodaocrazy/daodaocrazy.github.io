> 文档：尚硅谷Flink入门到实战-学习笔记

[返回总览](../尚硅谷Flink入门到实战-学习笔记) | [上一章：11. Table API和Flink SQL](./chapter-11) | [下一章：13. 函数(Functions)](./chapter-13)

# 12. 时间特性(Time Attributes)

## 12.1 概述

+ 基于时间的操作（比如 Table API 和 SQL 中窗口操作），需要定义相关的时间语义和时间数据来源的信息
+ Table 可以提供一个逻辑上的时间字段，用于在表处理程序中，指示时间和访问相应的时间戳
+ **时间属性，可以是每个表schema的一部分。一旦定义了时间属性，它就可以作为一个字段引用，并且可以在基于时间的操作中使用**
+ 时间属性的行为类似于常规时间戳，可以访问，并且进行计算

## 12.2 定义处理时间(Processing Time)

+ 处理时间语义下，允许表处理程序根据机器的本地时间生成结果。它是时间的最简单概念。它既不需要提取时间戳，也不需要生成 watermark

### 由DataStream转换成表时指定

+ 在定义 Table Schema 期间，可以使用`.proctime`，指定字段名定义处理时间字段

+ **这个proctime属性只能通过附加逻辑字段，来扩展物理schema。因此，只能在schema定义的末尾定义它**

  ```java
  Table sensorTable = tableEnv.fromDataStream(dataStream,
                                             "id, temperature, pt.proctime");
  ```

### 定义Table Schema时指定

```java
.withSchema(new Schema()
            .field("id", DataTypes.STRING())
            .field("timestamp",DataTypes.BIGINT())
            .field("temperature",DataTypes.DOUBLE())
            .field("pt",DataTypes.TIMESTAMP(3))
            .proctime()
           )
```

### 创建表的DDL中定义

```java
String sinkDDL = 
  "create table dataTable (" +
  " id varchar(20) not null, " +
  " ts bigint, " +
  " temperature double, " +
  " pt AS PROCTIME() " +
  " ) with (" +
  " 'connector.type' = 'filesystem', " +
  " 'connector.path' = '/sensor.txt', " +
  " 'format.type' = 'csv')";
tableEnv.sqlUpdate(sinkDDL);
```

### 测试代码

```java
package apitest.tableapi;

import apitest.beans.SensorReading;
import org.apache.flink.streaming.api.TimeCharacteristic;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor;
import org.apache.flink.streaming.api.windowing.time.Time;
import org.apache.flink.table.api.Over;
import org.apache.flink.table.api.Table;
import org.apache.flink.table.api.Tumble;
import org.apache.flink.table.api.bridge.java.StreamTableEnvironment;
import org.apache.flink.types.Row;

/**
 * @author : daodaocrazy email: daodaocrazy@outlook.com
 * @date : 2021/2/4 12:47 AM
 */
public class TableTest5_TimeAndWindow {
  public static void main(String[] args) throws Exception {
    // 1. 创建环境
    StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
    env.setParallelism(1);

    StreamTableEnvironment tableEnv = StreamTableEnvironment.create(env);

    // 2. 读入文件数据，得到DataStream
    DataStream<String> inputStream = env.readTextFile("/tmp/Flink_Tutorial/src/main/resources/sensor.txt");

    // 3. 转换成POJO
    DataStream<SensorReading> dataStream = inputStream.map(line -> {
      String[] fields = line.split(",");
      return new SensorReading(fields[0], new Long(fields[1]), new Double(fields[2]));
    });

    // 4. 将流转换成表，定义时间特性
    Table dataTable = tableEnv.fromDataStream(dataStream, "id, timestamp as ts, temperature as temp, pt.proctime");

    dataTable.printSchema();
    tableEnv.toAppendStream(dataTable, Row.class).print();

    env.execute();
  }
}
```

输出如下：

```shell
root
 |-- id: STRING
 |-- ts: BIGINT
 |-- temp: DOUBLE
 |-- pt: TIMESTAMP(3) *PROCTIME*

sensor_1,1547718199,35.8,2021-02-03T16:50:58.048
sensor_6,1547718201,15.4,2021-02-03T16:50:58.048
sensor_7,1547718202,6.7,2021-02-03T16:50:58.050
sensor_10,1547718205,38.1,2021-02-03T16:50:58.050
sensor_1,1547718207,36.3,2021-02-03T16:50:58.051
sensor_1,1547718209,32.8,2021-02-03T16:50:58.051
sensor_1,1547718212,37.1,2021-02-03T16:50:58.051
```

## 12.3 定义事件事件(Event Time)

+ 事件时间语义，允许表处理程序根据每个记录中包含的时间生成结果。这样即使在有乱序事件或者延迟事件时，也可以获得正确的结果。
+ **为了处理无序事件，并区分流中的准时和迟到事件；Flink需要从事件数据中，提取时间戳，并用来推送事件时间的进展**
+ 定义事件事件，同样有三种方法：
  + 由DataStream转换成表时指定
  + 定义Table Schema时指定
  + 在创建表的DDL中定义

### 由DataStream转换成表时指定

+ 由DataStream转换成表时指定（推荐）

+ 在DataStream转换成Table，使用`.rowtime`可以定义事件事件属性

  ```java
  // 将DataStream转换为Table，并指定时间字段
  Table sensorTable = tableEnv.fromDataStream(dataStream,
                                             "id, timestamp.rowtime, temperature");
  // 或者，直接追加时间字段
  Table sensorTable = tableEnv.fromDataStream(dataStream,
                                            "id, temperature, timestamp, rt.rowtime");
  ```

### 定义Table Schema时指定

```java
.withSchema(new Schema()
            .field("id", DataTypes.STRING())
            .field("timestamp",DataTypes.BIGINT())
            .rowtime(
              new Rowtime()
              .timestampsFromField("timestamp") // 从字段中提取时间戳
              .watermarksPeriodicBounded(1000) // watermark延迟1秒
            )
            .field("temperature",DataTypes.DOUBLE())
           )
```

### 创建表的DDL中定义

```java
String sinkDDL = 
  "create table dataTable (" +
  " id varchar(20) not null, " +
  " ts bigint, " +
  " temperature double, " +
  " rt AS TO_TIMESTAMP( FROM_UNIXTIME(ts) ), " +
  " watermark for rt as rt - interval '1' second"
  " ) with (" +
  " 'connector.type' = 'filesystem', " +
  " 'connector.path' = '/sensor.txt', " +
  " 'format.type' = 'csv')";
tableEnv.sqlUpdate(sinkDDL);
```

### 测试代码

```java
package apitest.tableapi;

import apitest.beans.SensorReading;
import org.apache.flink.streaming.api.TimeCharacteristic;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor;
import org.apache.flink.streaming.api.windowing.time.Time;
import org.apache.flink.table.api.Over;
import org.apache.flink.table.api.Table;
import org.apache.flink.table.api.Tumble;
import org.apache.flink.table.api.bridge.java.StreamTableEnvironment;
import org.apache.flink.types.Row;

/**
 * @author : daodaocrazy email: daodaocrazy@outlook.com
 * @date : 2021/2/4 12:47 AM
 */
public class TableTest5_TimeAndWindow {
  public static void main(String[] args) throws Exception {
    // 1. 创建环境
    StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
    env.setParallelism(1);

    StreamTableEnvironment tableEnv = StreamTableEnvironment.create(env);

    // 2. 读入文件数据，得到DataStream
    DataStream<String> inputStream = env.readTextFile("/tmp/Flink_Tutorial/src/main/resources/sensor.txt");

    // 3. 转换成POJO
    DataStream<SensorReading> dataStream = inputStream.map(line -> {
      String[] fields = line.split(",");
      return new SensorReading(fields[0], new Long(fields[1]), new Double(fields[2]));
    })
      .assignTimestampsAndWatermarks(new BoundedOutOfOrdernessTimestampExtractor<SensorReading>(Time.seconds(2)) {
        @Override
        public long extractTimestamp(SensorReading element) {
          return element.getTimestamp() * 1000L;
        }
      });

    // 4. 将流转换成表，定义时间特性
    //        Table dataTable = tableEnv.fromDataStream(dataStream, "id, timestamp as ts, temperature as temp, pt.proctime");
    Table dataTable = tableEnv.fromDataStream(dataStream, "id, timestamp as ts, temperature as temp, rt.rowtime");

    dataTable.printSchema();

    tableEnv.toAppendStream(dataTable,Row.class).print();

    env.execute();
  }
}
```

输出如下：

*注：这里最后一列rt里显示的是EventTime，而不是Processing Time*

```shell
root
 |-- id: STRING
 |-- ts: BIGINT
 |-- temp: DOUBLE
 |-- rt: TIMESTAMP(3) *ROWTIME*

sensor_1,1547718199,35.8,2019-01-17T09:43:19
sensor_6,1547718201,15.4,2019-01-17T09:43:21
sensor_7,1547718202,6.7,2019-01-17T09:43:22
sensor_10,1547718205,38.1,2019-01-17T09:43:25
sensor_1,1547718207,36.3,2019-01-17T09:43:27
sensor_1,1547718209,32.8,2019-01-17T09:43:29
sensor_1,1547718212,37.1,2019-01-17T09:43:32
```

## 12.4 窗口

> [Flink-分组窗口 | Over Windows | SQL 中的 Group Windows | SQL 中的 Over Windows](https://blog.csdn.net/qq_40180229/article/details/106482095)

+ 时间语义，要配合窗口操作才能发挥作用。
+ 在Table API和SQL中，主要有两种窗口
  + Group Windows（分组窗口）
    + **根据时间戳或行计数间隔，将行聚合到有限的组（Group）中，并对每个组的数据执行一次聚合函数**
  + Over Windows
    + 针对每个输入行，计算相邻行范围内的聚合

### 12.4.1 Group Windows

+ Group Windows 是使用 window（w:GroupWindow）子句定义的，并且**必须由as子句指定一个别名**。

+ 为了按窗口对表进行分组，窗口的别名必须在 group by 子句中，像常规的分组字段一样引用

  ```scala
  Table table = input
  .window([w:GroupWindow] as "w") // 定义窗口，别名为w
  .groupBy("w, a") // 按照字段 a和窗口 w分组
  .select("a,b.sum"); // 聚合
  ```

+ Table API 提供了一组具有特定语义的预定义 Window 类，这些类会被转换为底层 DataStream 或 DataSet 的窗口操作

+ 分组窗口分为三种：

  + 滚动窗口
  + 滑动窗口
  + 会话窗口

#### 滚动窗口(Tumbling windows)

+ 滚动窗口（Tumbling windows）要用Tumble类来定义

```java
// Tumbling Event-time Window（事件时间字段rowtime）
.window(Tumble.over("10.minutes").on("rowtime").as("w"))

// Tumbling Processing-time Window（处理时间字段proctime）
.window(Tumble.over("10.minutes").on("proctime").as("w"))

// Tumbling Row-count Window (类似于计数窗口，按处理时间排序，10行一组)
.window(Tumble.over("10.rows").on("proctime").as("w"))
```

+ over：定义窗口长度
+ on：用来分组（按时间间隔）或者排序（按行数）的时间字段
+ as：别名，必须出现在后面的groupBy中

#### 滑动窗口(Sliding windows)

+ 滑动窗口（Sliding windows）要用Slide类来定义

```java
// Sliding Event-time Window
.window(Slide.over("10.minutes").every("5.minutes").on("rowtime").as("w"))

// Sliding Processing-time window 
.window(Slide.over("10.minutes").every("5.minutes").on("proctime").as("w"))

// Sliding Row-count window
.window(Slide.over("10.rows").every("5.rows").on("proctime").as("w"))
```

+ over：定义窗口长度
+ every：定义滑动步长
+ on：用来分组（按时间间隔）或者排序（按行数）的时间字段
+ as：别名，必须出现在后面的groupBy中

#### 会话窗口(Session windows)

+ 会话窗口（Session windows）要用Session类来定义

```java
// Session Event-time Window
.window(Session.withGap("10.minutes").on("rowtime").as("w"))

// Session Processing-time Window 
.window(Session.withGap("10.minutes").on("proctime").as("w"))
```

+ withGap：会话时间间隔
+ on：用来分组（按时间间隔）或者排序（按行数）的时间字段
+ as：别名，必须出现在后面的groupBy中

### 12.4.2 SQL中的Group Windows

Group Windows定义在SQL查询的Group By子句中

+ TUMBLE(time_attr, interval)
  + 定义一个滚动窗口，每一个参数是时间字段，第二个参数是窗口长度
+ HOP(time_attr，interval，interval)
  + 定义一个滑动窗口，第一个参数是时间字段，**第二个参数是窗口滑动步长，第三个是窗口长度**
+ SESSION(time_attr，interval)
  + 定义一个绘画窗口，第一个参数是时间字段，第二个参数是窗口间隔

#### 测试代码

```java
package apitest.tableapi;

import apitest.beans.SensorReading;
import org.apache.flink.streaming.api.TimeCharacteristic;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor;
import org.apache.flink.streaming.api.windowing.time.Time;
import org.apache.flink.table.api.Over;
import org.apache.flink.table.api.Table;
import org.apache.flink.table.api.Tumble;
import org.apache.flink.table.api.bridge.java.StreamTableEnvironment;
import org.apache.flink.types.Row;

/**
 * @author : daodaocrazy email: daodaocrazy@outlook.com
 * @date : 2021/2/4 12:47 AM
 */
public class TableTest5_TimeAndWindow {
  public static void main(String[] args) throws Exception {
    // 1. 创建环境
    StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
    env.setParallelism(1);

    StreamTableEnvironment tableEnv = StreamTableEnvironment.create(env);

    // 2. 读入文件数据，得到DataStream
    DataStream<String> inputStream = env.readTextFile("/tmp/Flink_Tutorial/src/main/resources/sensor.txt");

    // 3. 转换成POJO
    DataStream<SensorReading> dataStream = inputStream.map(line -> {
      String[] fields = line.split(",");
      return new SensorReading(fields[0], new Long(fields[1]), new Double(fields[2]));
    })
      .assignTimestampsAndWatermarks(new BoundedOutOfOrdernessTimestampExtractor<SensorReading>(Time.seconds(2)) {
        @Override
        public long extractTimestamp(SensorReading element) {
          return element.getTimestamp() * 1000L;
        }
      });

    // 4. 将流转换成表，定义时间特性
    //        Table dataTable = tableEnv.fromDataStream(dataStream, "id, timestamp as ts, temperature as temp, pt.proctime");
    Table dataTable = tableEnv.fromDataStream(dataStream, "id, timestamp as ts, temperature as temp, rt.rowtime");

    //        dataTable.printSchema();
    //
    //        tableEnv.toAppendStream(dataTable,Row.class).print();

    tableEnv.createTemporaryView("sensor", dataTable);

    // 5. 窗口操作
    // 5.1 Group Window
    // table API
    Table resultTable = dataTable.window(Tumble.over("10.seconds").on("rt").as("tw"))
      .groupBy("id, tw")
      .select("id, id.count, temp.avg, tw.end");

    // SQL
    Table resultSqlTable = tableEnv.sqlQuery("select id, count(id) as cnt, avg(temp) as avgTemp, tumble_end(rt, interval '10' second) " +
                                             "from sensor group by id, tumble(rt, interval '10' second)");

    dataTable.printSchema();
    tableEnv.toAppendStream(resultTable, Row.class).print("result");
    tableEnv.toRetractStream(resultSqlTable, Row.class).print("sql");

    env.execute();
  }
}
```

输出：

```java
root
 |-- id: STRING
 |-- ts: BIGINT
 |-- temp: DOUBLE
 |-- rt: TIMESTAMP(3) *ROWTIME*

result> sensor_1,1,35.8,2019-01-17T09:43:20
result> sensor_6,1,15.4,2019-01-17T09:43:30
result> sensor_1,2,34.55,2019-01-17T09:43:30
result> sensor_10,1,38.1,2019-01-17T09:43:30
result> sensor_7,1,6.7,2019-01-17T09:43:30
sql> (true,sensor_1,1,35.8,2019-01-17T09:43:20)
result> sensor_1,1,37.1,2019-01-17T09:43:40
sql> (true,sensor_6,1,15.4,2019-01-17T09:43:30)
sql> (true,sensor_1,2,34.55,2019-01-17T09:43:30)
sql> (true,sensor_10,1,38.1,2019-01-17T09:43:30)
sql> (true,sensor_7,1,6.7,2019-01-17T09:43:30)
sql> (true,sensor_1,1,37.1,2019-01-17T09:43:40)
```

### 12.4.3 Over Windows

> [SQL中over的用法](https://blog.csdn.net/liuyuehui110/article/details/42736667)
>
> [sql over的作用及用法](https://www.cnblogs.com/xiayang/articles/1886372.html)

+ **Over window 聚合是标准 SQL 中已有的（over 子句），可以在查询的 SELECT 子句中定义**

+ Over window 聚合，会**针对每个输入行**，计算相邻行范围内的聚合

+ Over windows 使用 window（w:overwindows*）子句定义，并在 select（）方法中通过**别名**来引用

  ```scala
  Table table = input
  .window([w: OverWindow] as "w")
  .select("a, b.sum over w, c.min over w");
  ```

+ Table API 提供了 Over 类，来配置 Over 窗口的属性

#### 无界Over Windows

+ 可以在事件时间或处理时间，以及指定为时间间隔、或行计数的范围内，定义 Over windows
+ 无界的 over window 是使用常量指定的

```java
// 无界的事件时间over window (时间字段 "rowtime")
.window(Over.partitionBy("a").orderBy("rowtime").preceding(UNBOUNDED_RANGE).as("w"))

//无界的处理时间over window (时间字段"proctime")
.window(Over.partitionBy("a").orderBy("proctime").preceding(UNBOUNDED_RANGE).as("w"))

// 无界的事件时间Row-count over window (时间字段 "rowtime")
.window(Over.partitionBy("a").orderBy("rowtime").preceding(UNBOUNDED_ROW).as("w"))

//无界的处理时间Row-count over window (时间字段 "rowtime")
.window(Over.partitionBy("a").orderBy("proctime").preceding(UNBOUNDED_ROW).as("w"))
```

*partitionBy是可选项*

#### 有界Over Windows

+ 有界的over window是用间隔的大小指定的

```java
// 有界的事件时间over window (时间字段 "rowtime"，之前1分钟)
.window(Over.partitionBy("a").orderBy("rowtime").preceding("1.minutes").as("w"))

// 有界的处理时间over window (时间字段 "rowtime"，之前1分钟)
.window(Over.partitionBy("a").orderBy("porctime").preceding("1.minutes").as("w"))

// 有界的事件时间Row-count over window (时间字段 "rowtime"，之前10行)
.window(Over.partitionBy("a").orderBy("rowtime").preceding("10.rows").as("w"))

// 有界的处理时间Row-count over window (时间字段 "rowtime"，之前10行)
.window(Over.partitionBy("a").orderBy("proctime").preceding("10.rows").as("w"))
```

### 12.4.4 SQL中的Over Windows

+ 用 Over 做窗口聚合时，所有聚合必须在同一窗口上定义，也就是说必须是相同的分区、排序和范围
+ 目前仅支持在当前行范围之前的窗口
+ ORDER BY 必须在单一的时间属性上指定

```sql
SELECT COUNT(amount) OVER (
  PARTITION BY user
  ORDER BY proctime
  ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)
FROM Orders

// 也可以做多个聚合
SELECT COUNT(amount) OVER w, SUM(amount) OVER w
FROM Orders
WINDOW w AS (
  PARTITION BY user
  ORDER BY proctime
  ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)
```

#### 测试代码

java代码

```java
package apitest.tableapi;

import apitest.beans.SensorReading;
import org.apache.flink.streaming.api.TimeCharacteristic;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor;
import org.apache.flink.streaming.api.windowing.time.Time;
import org.apache.flink.table.api.Over;
import org.apache.flink.table.api.Table;
import org.apache.flink.table.api.Tumble;
import org.apache.flink.table.api.bridge.java.StreamTableEnvironment;
import org.apache.flink.types.Row;

/**
 * @author : daodaocrazy email: daodaocrazy@outlook.com
 * @date : 2021/2/4 12:47 AM
 */
public class TableTest5_TimeAndWindow {
  public static void main(String[] args) throws Exception {
    // 1. 创建环境
    StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
    env.setParallelism(1);

    StreamTableEnvironment tableEnv = StreamTableEnvironment.create(env);

    // 2. 读入文件数据，得到DataStream
    DataStream<String> inputStream = env.readTextFile("/tmp/Flink_Tutorial/src/main/resources/sensor.txt");

    // 3. 转换成POJO
    DataStream<SensorReading> dataStream = inputStream.map(line -> {
      String[] fields = line.split(",");
      return new SensorReading(fields[0], new Long(fields[1]), new Double(fields[2]));
    })
      .assignTimestampsAndWatermarks(new BoundedOutOfOrdernessTimestampExtractor<SensorReading>(Time.seconds(2)) {
        @Override
        public long extractTimestamp(SensorReading element) {
          return element.getTimestamp() * 1000L;
        }
      });

    // 4. 将流转换成表，定义时间特性
    //        Table dataTable = tableEnv.fromDataStream(dataStream, "id, timestamp as ts, temperature as temp, pt.proctime");
    Table dataTable = tableEnv.fromDataStream(dataStream, "id, timestamp as ts, temperature as temp, rt.rowtime");

    //        dataTable.printSchema();
    //
    //        tableEnv.toAppendStream(dataTable,Row.class).print();

    tableEnv.createTemporaryView("sensor", dataTable);

    // 5. 窗口操作
    // 5.1 Group Window
    // table API
    Table resultTable = dataTable.window(Tumble.over("10.seconds").on("rt").as("tw"))
      .groupBy("id, tw")
      .select("id, id.count, temp.avg, tw.end");

    // SQL
    Table resultSqlTable = tableEnv.sqlQuery("select id, count(id) as cnt, avg(temp) as avgTemp, tumble_end(rt, interval '10' second) " +
                                             "from sensor group by id, tumble(rt, interval '10' second)");

    // 5.2 Over Window
    // table API
    Table overResult = dataTable.window(Over.partitionBy("id").orderBy("rt").preceding("2.rows").as("ow"))
      .select("id, rt, id.count over ow, temp.avg over ow");

    // SQL
    Table overSqlResult = tableEnv.sqlQuery("select id, rt, count(id) over ow, avg(temp) over ow " +
                                            " from sensor " +
                                            " window ow as (partition by id order by rt rows between 2 preceding and current row)");

    //        dataTable.printSchema();
    //        tableEnv.toAppendStream(resultTable, Row.class).print("result");
    //        tableEnv.toRetractStream(resultSqlTable, Row.class).print("sql");
    tableEnv.toAppendStream(overResult, Row.class).print("result");
    tableEnv.toRetractStream(overSqlResult, Row.class).print("sql");

    env.execute();
  }
}
```

输出:

*因为`partition by id order by rt rows between 2 preceding and current row`，所以最后2次关于`sensor_1`的输出的`count(id)`都是3,但是计算出来的平均值不一样。（前者计算倒数3条sensor_1的数据，后者计算最后最新的3条sensor_1数据的平均值）*

```shell
result> sensor_1,2019-01-17T09:43:19,1,35.8
sql> (true,sensor_1,2019-01-17T09:43:19,1,35.8)
result> sensor_6,2019-01-17T09:43:21,1,15.4
sql> (true,sensor_6,2019-01-17T09:43:21,1,15.4)
result> sensor_7,2019-01-17T09:43:22,1,6.7
sql> (true,sensor_7,2019-01-17T09:43:22,1,6.7)
result> sensor_10,2019-01-17T09:43:25,1,38.1
sql> (true,sensor_10,2019-01-17T09:43:25,1,38.1)
result> sensor_1,2019-01-17T09:43:27,2,36.05
sql> (true,sensor_1,2019-01-17T09:43:27,2,36.05)
sql> (true,sensor_1,2019-01-17T09:43:29,3,34.96666666666666)
result> sensor_1,2019-01-17T09:43:29,3,34.96666666666666
result> sensor_1,2019-01-17T09:43:32,3,35.4
sql> (true,sensor_1,2019-01-17T09:43:32,3,35.4)
```

---

[返回总览](../尚硅谷Flink入门到实战-学习笔记) | [上一章：11. Table API和Flink SQL](./chapter-11) | [下一章：13. 函数(Functions)](./chapter-13)
