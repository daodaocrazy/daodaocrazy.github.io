# 尚硅谷Flink入门到实战-学习笔记（下）

[返回上篇](./尚硅谷Flink入门到实战-学习笔记)

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

# 14. 基于flink的电商用户行为数据分析

> [Flink电商项目第一天-电商用户行为分析及完整图步骤解析-热门商品统计TopN的实现](https://blog.csdn.net/qq_40180229/article/details/106502286)

+ 批处理和流处理
+ 电商用户行为分析
+ 数据源解析
+ 项目模块划分

## 14.1 批处理和流处理

### 批处理

批处理主要操作大容量静态数据集，并在计算过程完成后返回结果。

可以认为，处理的是用一个固定时间间隔分组的数据点集合。

批处理模式中使用的数据集通常符合下列特征：

+ **有界：批处理数据集代表数据的有限集合**
+ **持久：数据通常始终存储在某种类型的持久存储位置中**
+ **大量：批处理操作通常是处理极为海量数据集的唯一方法**

### 流处理

流处理可以对随时进入系统的数据进行计算。

流处理方式无需针对整个数据集执行操作，而是对通过系统传输的每个数据项执行操作。

流处理中的数据集是“无边界”的，这就产生了几个重要的影响：

+ 可以处理几乎无限量的数据，但**同一时间只能处理一条数据，不同记录间只维持最少量的状态**

+ 处理工作是基于事件的，除非明确停止否则没有“尽头”

+ 处理结果立刻可用，并会随着新数据的抵达继续更新。

## 14.2 电商用户行为分析

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200602182834724.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxXzQwMTgwMjI5,size_16,color_FFFFFF,t_70)

+ 统计分析
  + 点击、浏览
  + 热门商品、近期热门商品、分类热门商品，流量统计
+ 偏好统计
  + 收藏、喜欢、评分、打标签
  + 用户画像，推荐列表（结合特征工程和机器学习算法）
+ 风险控制
  + 下订单、支付、登录
  + 刷单监控，订单失效监控，恶意登录（短时间内频繁登录失败）监控

### 项目模块设计

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200602183018421.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxXzQwMTgwMjI5,size_16,color_FFFFFF,t_70)

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200602183121950.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxXzQwMTgwMjI5,size_16,color_FFFFFF,t_70)

### 数据源

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200602183227549.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxXzQwMTgwMjI5,size_16,color_FFFFFF,t_70)

### 数据源-数据结构

**UserBehavior**

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200602183249723.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxXzQwMTgwMjI5,size_16,color_FFFFFF,t_70)

**ApacheLogEvent**

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200602183323920.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxXzQwMTgwMjI5,size_16,color_FFFFFF,t_70)

## 14.3 项目模块

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200602183434342.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxXzQwMTgwMjI5,size_16,color_FFFFFF,t_70)

### 14.3.1 热门实时商品统计

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200602183513841.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxXzQwMTgwMjI5,size_16,color_FFFFFF,t_70)

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200602183537531.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxXzQwMTgwMjI5,size_16,color_FFFFFF,t_70)

+ 按照商品id进行分区

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200602183613384.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxXzQwMTgwMjI5,size_16,color_FFFFFF,t_70)

+ 设置窗口时间

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200602183637249.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxXzQwMTgwMjI5,size_16,color_FFFFFF,t_70)

+ 时间窗口（timeWindow）区间为左闭右开
+ 同一份数据会被分发到不同的窗口

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200602183733756.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxXzQwMTgwMjI5,size_16,color_FFFFFF,t_70)

+ 窗口聚合

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200602183749122.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxXzQwMTgwMjI5,size_16,color_FFFFFF,t_70)

+ 窗口聚合策略——没出现一条记录就加一

+ 实现AggregateFunction接口

  `interface AggregateFunction<IN, ACC, OUT>`

+ 定义输出结构——`ItemViewCount(itemId,windowEnd,count)`

+ 实现WindowFunction接口

  + `interface WindowFunction<IN,OUT,KEY,W extends Window>`

    + IN：输入为累加器的类型，Long
    + OUT：窗口累加以后输出的类型为`ItemViewCount(itemId: Long,windowEnd: Long,count: Long)`，windowEnd为窗口的结束时间，也是窗口的唯一标识
    + KEY：Tuple泛型，在这里是itemId，窗口根据itemId聚合
    + W：聚合的窗口，`w.getEnd`就能拿到窗口的结束时间

    ```java
    public void apply(Tuple tuple, TimeWindow window,
                     Iterable<Long> input, Collector<ItemViewCount> out)throws Exception {
      Long itemId = tuple.getField(0);
      Long windowEnd - window.getEnd();
      Long count = input.iterator().next();
      out.collect(new ItemViewCount(itemId, windowEnd, count));
    }
    ```

+ 窗口聚合示例

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200602183856808.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxXzQwMTgwMjI5,size_16,color_FFFFFF,t_70)

+  **进行统计整理 —— keyBy(“windowEnd”)**

![在这里插入图片描述](https://img-blog.csdnimg.cn/2020060218391775.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxXzQwMTgwMjI5,size_16,color_FFFFFF,t_70)

+ 状态编程

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200602183935754.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxXzQwMTgwMjI5,size_16,color_FFFFFF,t_70)

+ **最终排序输出——keyedProcessFunction**

  + 针对有状态流的底层API
  + KeyedProcessFunction会对分区后的每一条子流进行处理
  + 以windowEnd作为key，保证分流以后每一条流的数据都在一个时间窗口内
  + 从ListState中读取当前流的状态，存储数据进行排序输出

  ---

  + 用ProcessFunction定义KeyedStream的处理逻辑
  + 分区之后，每个KeyedStream都有其自己的生命周期
    + open：初始化，在这里可以获取当前流的状态
    + processElement：处理流中每一个元素时调用
    + onTimer：定时调用，注册定时器Timer并触发之后的回调操作

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200602184003237.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxXzQwMTgwMjI5,size_16,color_FFFFFF,t_70)

#### POJO

需要生成get/set、无参/有参构造函数、toString

+ ItemViewCount

  ```java
  private Long itemId;
  private Long windowEnd;
  private Long count;
  ```

+ UserBehavior

  ```java
  private Long uerId;
  private Long itemId;
  private Integer categoryId;
  private String behavior;
  private Long timestamp;
  ```

#### 代码1-文件

+ 父pom依赖

  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <project xmlns="http://maven.apache.org/POM/4.0.0"
           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
           xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
  
    <groupId>org.example</groupId>
    <artifactId>UserBehaviorAnalysis</artifactId>
    <packaging>pom</packaging>
    <version>1.0-SNAPSHOT</version>
    <modules>
      <module>HotItemsAnalysis</module>
    </modules>
  
    <properties>
      <maven.compiler.source>8</maven.compiler.source>
      <maven.compiler.target>8</maven.compiler.target>
      <flink.version>1.12.1</flink.version>
      <scala.binary.version>2.12</scala.binary.version>
      <kafka.version>2.7.0</kafka.version>
      <mysql.version>8.0.19</mysql.version>
    </properties>
  
    <dependencies>
  
      <!-- flink -->
      <dependency>
        <groupId>org.apache.flink</groupId>
        <artifactId>flink-java</artifactId>
        <version>${flink.version}</version>
      </dependency>
      <dependency>
        <groupId>org.apache.flink</groupId>
        <artifactId>flink-streaming-java_${scala.binary.version}</artifactId>
        <version>${flink.version}</version>
      </dependency>
      <dependency>
        <groupId>org.apache.flink</groupId>
        <artifactId>flink-clients_${scala.binary.version}</artifactId>
        <version>${flink.version}</version>
      </dependency>
  
      <!-- kafka -->
      <dependency>
        <groupId>org.apache.kafka</groupId>
        <artifactId>kafka_${scala.binary.version}</artifactId>
        <version>${kafka.version}</version>
      </dependency>
      <dependency>
        <groupId>org.apache.flink</groupId>
        <artifactId>flink-connector-kafka_${scala.binary.version}</artifactId>
        <version>${flink.version}</version>
      </dependency>
    </dependencies>
  
    <build>
      <plugins>
        <plugin>
          <artifactId>maven-compiler-plugin</artifactId>
          <configuration>
            <source>1.8</source>
            <target>1.8</target>
            <encoding>UTF-8</encoding>
          </configuration>
        </plugin>
      </plugins>
    </build>
  
  </project>
  ```

+ java代码

  ```java
  import beans.ItemViewCount;
  import beans.UserBehavior;
  import org.apache.commons.compress.utils.Lists;
  import org.apache.flink.api.common.functions.AggregateFunction;
  import org.apache.flink.api.common.state.ListState;
  import org.apache.flink.api.common.state.ListStateDescriptor;
  import org.apache.flink.configuration.Configuration;
  import org.apache.flink.streaming.api.datastream.DataStream;
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
  import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor;
  import org.apache.flink.streaming.api.functions.windowing.WindowFunction;
  import org.apache.flink.streaming.api.windowing.assigners.SlidingEventTimeWindows;
  import org.apache.flink.streaming.api.windowing.assigners.SlidingProcessingTimeWindows;
  import org.apache.flink.streaming.api.windowing.time.Time;
  import org.apache.flink.streaming.api.windowing.windows.TimeWindow;
  import org.apache.flink.streaming.runtime.operators.util.AssignerWithPeriodicWatermarksAdapter;
  import org.apache.flink.util.Collector;
  
  import java.sql.Timestamp;
  import java.util.ArrayList;
  import java.util.concurrent.TimeUnit;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/4 6:07 PM
   */
  public class HotItems {
    public static void main(String[] args) throws Exception {
      // 1. 创建执行环境
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      // 设置并行度为1
      env.setParallelism(1);
  
      // 2. 从csv文件中获取数据
      DataStream<String> inputStream = env.readTextFile("/tmp/UserBehaviorAnalysis/HotItemsAnalysis/src/main/resources/UserBehavior.csv");
  
      // 3. 转换成POJO,分配时间戳和watermark
      DataStream<UserBehavior> userBehaviorDataStream = inputStream.map(line -> {
        String[] fields = line.split(",");
        return new UserBehavior(new Long(fields[0]), new Long(fields[1]), new Integer(fields[2]), fields[3], new Long(fields[4]));
      }).assignTimestampsAndWatermarks(new AssignerWithPeriodicWatermarksAdapter.Strategy<>(
        new BoundedOutOfOrdernessTimestampExtractor<UserBehavior>(Time.of(200, TimeUnit.MILLISECONDS)) {
          @Override
          public long extractTimestamp(UserBehavior element) {
            return element.getTimestamp() * 1000L;
          }
        }
      ));
  
      // 4. 分组开窗聚合，得到每个窗口内各个商品的count值
      //        DataStream<ItemViewCount> windowAggStream = userBehaviorDataStream
      DataStream<ItemViewCount> windowAggStream = userBehaviorDataStream
        // 过滤只保留pv行为
        .filter(userBehavior -> "pv".equals(userBehavior.getBehavior()))
        // 按照商品ID分组
        .keyBy(UserBehavior::getItemId)
        // 滑动窗口
        .window(SlidingEventTimeWindows.of(Time.hours(1), Time.minutes(5)))
        .aggregate(new ItemCountAgg(), new WindowItemCountResult());
  
      // 5. 收集同一窗口的所有商品的count数据，排序输出top n
      DataStream<String> resultStream = windowAggStream
        // 按照窗口分组
        .keyBy(ItemViewCount::getWindowEnd)
        // 用自定义处理函数排序取前5
        .process(new TopNHotItems(5));
  
      resultStream.print();
  
      env.execute("hot items analysis");
    }
  
    // 实现自定义增量聚合函数
    public static class ItemCountAgg implements AggregateFunction<UserBehavior, Long, Long> {
  
      @Override
      public Long createAccumulator() {
        return 0L;
      }
  
      @Override
      public Long add(UserBehavior value, Long accumulator) {
        return accumulator + 1;
      }
  
      @Override
      public Long getResult(Long accumulator) {
        return accumulator;
      }
  
      @Override
      public Long merge(Long a, Long b) {
        return a + b;
      }
    }
  
    // 自定义全窗口函数
    public static class WindowItemCountResult implements WindowFunction<Long, ItemViewCount, Long, TimeWindow> {
  
      @Override
      public void apply(Long itemId, TimeWindow window, Iterable<Long> input, Collector<ItemViewCount> out) throws Exception {
        Long windowEnd = window.getEnd();
        Long count = input.iterator().next();
        out.collect(new ItemViewCount(itemId, windowEnd, count));
      }
    }
  
    // 实现自定义KeyedProcessFunction
    public static class TopNHotItems extends KeyedProcessFunction<Long, ItemViewCount, String> {
  
      // 定义属性， TopN的大小
      private Integer topSize;
  
      // 定义状态列表，保存当前窗口内所有输出的ItemViewCount
      ListState<ItemViewCount> itemViewCountListState;
  
      @Override
      public void open(Configuration parameters) throws Exception {
        itemViewCountListState = getRuntimeContext().getListState(
          new ListStateDescriptor<ItemViewCount>("item-view-count-list", ItemViewCount.class));
      }
  
      //        @Override
      //        public void close() throws Exception {
      //            itemViewCountListState.clear();
      //        }
  
      public TopNHotItems(Integer topSize) {
        this.topSize = topSize;
      }
  
      @Override
      public void processElement(ItemViewCount value, Context ctx, Collector<String> out) throws Exception {
        // 每来一条数据，存入List中，并注册定时器
        itemViewCountListState.add(value);
        // 模拟等待，所以这里时间设的比较短(1ms)
        ctx.timerService().registerEventTimeTimer(value.getWindowEnd() + 1);
      }
  
      @Override
      public void onTimer(long timestamp, OnTimerContext ctx, Collector<String> out) throws Exception {
        // 定时器触发，当前已收集到所有数据，排序输出
        ArrayList<ItemViewCount> itemViewCounts = Lists.newArrayList(itemViewCountListState.get().iterator());
        // 从多到少(越热门越前面)
        itemViewCounts.sort((a, b) -> -Long.compare(a.getCount(), b.getCount()));
        StringBuilder resultBuilder = new StringBuilder();
        resultBuilder.append("============================").append(System.lineSeparator());
        resultBuilder.append("窗口结束时间：").append(new Timestamp(timestamp - 1)).append(System.lineSeparator());
  
        // 遍历列表，取top n输出
        for (int i = 0; i < Math.min(topSize, itemViewCounts.size()); i++) {
          ItemViewCount currentItemViewCount = itemViewCounts.get(i);
          resultBuilder.append("NO ").append(i + 1).append(":")
            .append(" 商品ID = ").append(currentItemViewCount.getItemId())
            .append(" 热门度 = ").append(currentItemViewCount.getCount())
            .append(System.lineSeparator());
        }
        resultBuilder.append("===============================").append(System.lineSeparator());
  
        // 控制输出频率
        Thread.sleep(1000L);
  
        out.collect(resultBuilder.toString());
      }
    }
  }
  ```

+ 输入文件如下：

  ```shell
  543462,1715,1464116,pv,1511658000
  662867,2244074,1575622,pv,1511658000
  561558,3611281,965809,pv,1511658000
  894923,3076029,1879194,pv,1511658000
  834377,4541270,3738615,pv,1511658000
  ...
  ```

+ 输出如下：

  ```shell
  ============================
  窗口结束时间：2017-11-26 10:10:00.0
  NO 1: 商品ID = 2338453 热门度 = 30
  NO 2: 商品ID = 812879 热门度 = 18
  NO 3: 商品ID = 2563440 热门度 = 14
  NO 4: 商品ID = 138964 热门度 = 12
  NO 5: 商品ID = 3244134 热门度 = 12
  ===============================
  
  ============================
  窗口结束时间：2017-11-26 10:15:00.0
  NO 1: 商品ID = 2338453 热门度 = 33
  NO 2: 商品ID = 812879 热门度 = 18
  NO 3: 商品ID = 3244134 热门度 = 13
  NO 4: 商品ID = 2563440 热门度 = 13
  NO 5: 商品ID = 2364679 热门度 = 13
  ===============================
  
  ============================
  窗口结束时间：2017-11-26 10:20:00.0
  NO 1: 商品ID = 2338453 热门度 = 32
  NO 2: 商品ID = 812879 热门度 = 18
  NO 3: 商品ID = 3244134 热门度 = 15
  NO 4: 商品ID = 4649427 热门度 = 13
  NO 5: 商品ID = 2364679 热门度 = 12
  ===============================
  
  ...
  ```

#### 代码2-kafka

+ java代码

  ```java
  // 仅修改 获取数据源的部分
  
  // 2. 从csv文件中获取数据
  //        DataStream<String> inputStream = env.readTextFile("/tmp/UserBehaviorAnalysis/HotItemsAnalysis/src/main/resources/UserBehavior.csv");
  
  Properties properties = new Properties();
  properties.setProperty("bootstrap.servers", "localhost:9092");
  properties.setProperty("group.id", "consumer");
  // 下面是一些次要参数
  properties.setProperty("key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
  properties.setProperty("value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
  properties.setProperty("auto.offset.reset", "latest");
  
  // 2. 从kafka消费数据
  DataStream<String> inputStream = env.addSource(new FlinkKafkaConsumer<>("hotitems", new SimpleStringSchema(), properties ));
  
  
  ```

+ 启动本地kafka里自带的zookeeper

  ```shell
  $ bin/zookeeper-server-start.sh config/zookeeper.properties
  ```

+ 启动kafka

  ```shell
  $ bin/kafka-server-start.sh config/server.properties
  ```

+ 启动kafka生产者console

  ```shell
  $ bin/kafka-console-producer.sh --broker-list localhost:9092  --topic hotitems
  ```

+ 运行Flink程序，输入数据（kafka-console-producer）

  ```shell
  $ bin/kafka-console-producer.sh --broker-list localhost:9092  --topic hotitems
  >543462,1715,1464116,pv,1511658000
  >662867,2244074,1575622,pv,1511658060
  >561558,3611281,965809,pv,1511658120
  >894923,1715,1879194,pv,1511658180
  >834377,2244074,3738615,pv,1511658240
  >625915,3611281,570735,pv,1511658300
  >625915,3611281,570735,pv,1511658301
  ```

+ 输出

  ```shell
  ============================
  窗口结束时间：2017-11-26 09:05:00.0
  NO 1: 商品ID = 1715 热门度 = 2
  NO 2: 商品ID = 2244074 热门度 = 2
  NO 3: 商品ID = 3611281 热门度 = 1
  ===============================
  ```

#### 代码3-kafka批量数据测试

+ java代码

  ```java
  import org.apache.kafka.clients.producer.KafkaProducer;
  import org.apache.kafka.clients.producer.ProducerRecord;
  
  import java.io.BufferedReader;
  import java.io.BufferedWriter;
  import java.io.FileReader;
  import java.util.Properties;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/4 11:53 PM
   */
  public class KafkaProducerUtil {
    public static void main(String[] args) throws Exception {
      writeToKafka("hotitems");
    }
  
    public static void writeToKafka(String topic)throws Exception{
      // Kafka配置
      Properties properties = new Properties();
      properties.setProperty("bootstrap.servers", "localhost:9092");
      properties.setProperty("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
      properties.setProperty("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");
  
      // 定义一个Kafka Producer
      KafkaProducer<String, String> kafkaProducer = new KafkaProducer<String, String>(properties);
  
      // 用缓冲方式来读取文本
      BufferedReader bufferedReader = new BufferedReader(new FileReader("/tmp/UserBehaviorAnalysis/HotItemsAnalysis/src/main/resources/UserBehavior.csv"));
      String line;
      while((line = bufferedReader.readLine())!=null){
        ProducerRecord<String,String> producerRecord = new ProducerRecord<>(topic,line );
        // 用producer发送数据
        kafkaProducer.send(producerRecord);
      }
      kafkaProducer.close();
    }
  }
  
  ```

+ 启动zookeeper

+ 启动kafka服务

+ 运行该java程序，之后就可以直接启动HotItems程序，读取本地已有的kafka数据了

#### 代码4-Flink-SQL实现

+ java代码

  **下面用最新的Expression写法实现<=新版本推荐的写法**

  ```java
  import beans.UserBehavior;
  import org.apache.flink.streaming.api.datastream.DataStream;
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor;
  import org.apache.flink.streaming.api.windowing.time.Time;
  import org.apache.flink.streaming.runtime.operators.util.AssignerWithPeriodicWatermarksAdapter;
  import org.apache.flink.table.api.EnvironmentSettings;
  import org.apache.flink.table.api.Slide;
  import org.apache.flink.table.api.Table;
  import org.apache.flink.table.api.bridge.java.StreamTableEnvironment;
  import org.apache.flink.types.Row;
  
  import java.util.concurrent.TimeUnit;
  
  import static org.apache.flink.table.api.Expressions.$;
  import static org.apache.flink.table.api.Expressions.lit;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/5 12:18 AM
   */
  public class HotItemsWithSql {
    public static void main(String[] args) throws Exception {
      // 1. 创建执行环境
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      env.setParallelism(1);
  
      // 2. 从csv文件中获取数据
      DataStream<String> inputStream = env.readTextFile("/tmp/UserBehaviorAnalysis/HotItemsAnalysis/src/main/resources/UserBehavior.csv");
  
      // 3. 转换成POJO,分配时间戳和watermark
      DataStream<UserBehavior> userBehaviorDataStream = inputStream.map(line -> {
        String[] fields = line.split(",");
        return new UserBehavior(new Long(fields[0]), new Long(fields[1]), new Integer(fields[2]), fields[3], new Long(fields[4]));
      }).assignTimestampsAndWatermarks(new AssignerWithPeriodicWatermarksAdapter.Strategy<>(
        new BoundedOutOfOrdernessTimestampExtractor<UserBehavior>(Time.of(200, TimeUnit.MILLISECONDS)) {
          @Override
          public long extractTimestamp(UserBehavior element) {
            return element.getTimestamp() * 1000L;
          }
        }
      ));
  
      // 4. 创建表执行环境,使用blink版本
      EnvironmentSettings settings = EnvironmentSettings.newInstance()
        .useBlinkPlanner()
        .inStreamingMode()
        .build();
      StreamTableEnvironment tableEnv = StreamTableEnvironment.create(env, settings);
  
      // 5. 将流转换成表
      Table dataTable = tableEnv.fromDataStream(userBehaviorDataStream,
                                                $("itemId"),
                                                $("behavior"),
                                                $("timestamp").rowtime().as("ts")
                                               );
  
      // 6. 分组开窗
      // Table API
      Table windowAggTable = dataTable
        .filter($("behavior").isEqual("pv"))
        .window(Slide.over(lit(1).hours()).every(lit(5).minutes()).on($("ts")).as("w"))
        .groupBy($("itemId"), $("w"))
        .select($("itemId"), $("w").end().as("windowEnd"), $("itemId").count().as("cnt"));
  
      // 7. 利用开创函数，对count值进行排序，并获取Row number，得到Top N
      // SQL
      DataStream<Row> aggStream = tableEnv.toAppendStream(windowAggTable, Row.class);
      tableEnv.createTemporaryView("agg", aggStream, $("itemId"), $("windowEnd"), $("cnt"));
  
      Table resultTable = tableEnv.sqlQuery("select * from " +
                                            "  ( select *, ROW_NUMBER() over (partition by windowEnd order by cnt desc) as row_num " +
                                            "  from agg) " +
                                            " where row_num <= 5 ");
  
      // 纯SQL实现
      tableEnv.createTemporaryView("data_table", userBehaviorDataStream, $("itemId"), $("behavior"), $("timestamp").rowtime().as("ts"));
      Table resultSqlTable = tableEnv.sqlQuery("select * from " +
                                               "  ( select *, ROW_NUMBER() over (partition by windowEnd order by cnt desc) as row_num " +
                                               "  from ( " +
                                               "    select itemId, count(itemId) as cnt, HOP_END(ts, interval '5' minute, interval '1' hour) as windowEnd " +
                                               "    from data_table " +
                                               "    where behavior = 'pv' " +
                                               "    group by itemId, HOP(ts, interval '5' minute, interval '1' hour)" +
                                               "    )" +
                                               "  ) " +
                                               " where row_num <= 5 ");
  
   //   tableEnv.toRetractStream(resultTable, Row.class).print();
      tableEnv.toRetractStream(resultSqlTable, Row.class).print();
  
      env.execute("hot items with sql job");
    }
  }
  ```

+ 输出

  ```shell
  ....
  (true,2288408,2017-11-26T03:00,15,4)
  (false,279675,2017-11-26T03:00,14,5)
  (true,291932,2017-11-26T03:00,15,5)
  (false,3715112,6,2017-11-26T03:05,1)
  (true,3244931,7,2017-11-26T03:05,1)
  (false,710777,6,2017-11-26T03:05,2)
  (true,3715112,6,2017-11-26T03:05,2)
  (false,724262,6,2017-11-26T03:05,3)
  (true,710777,6,2017-11-26T03:05,3)
  (false,1303734,5,2017-11-26T03:05,4)
  (true,724262,6,2017-11-26T03:05,4)
  (false,4622270,5,2017-11-26T03:05,5)
  (true,1303734,5,2017-11-26T03:05,5)
  (false,1303734,5,2017-11-26T03:05,5)
  ....
  ```

### 14.3.2 实时流量统计——热门页面

+ 基本需求
  + 从web服务器的日志中，统计实时的热门访问页面
  + 统计每分钟的ip访问量，取出访问量最大的5个地址，每5秒更新一次
+ 解决思路1
  + 将apache服务器日志中的时间，转换为时间戳，作为Event Time
  + 构建滑动窗口，窗口长度为1分钟，滑动距离为5秒

#### POJO

+ ApacheLogEvent

  ```java
  private String ip;
  private String userId;
  private Long timestamp;
  private String method;
  private String url;
  ```

+ PageViewCount

  ```java
  private String url;
  private Long windowEnd;
  private Long count;
  ```

#### 代码1-文件

+ Java代码

  ```java
  import beans.ApacheLogEvent;
  import beans.PageViewCount;
  import org.apache.commons.compress.utils.Lists;
  import org.apache.flink.api.common.functions.AggregateFunction;
  import org.apache.flink.api.common.state.ListState;
  import org.apache.flink.api.common.state.ListStateDescriptor;
  import org.apache.flink.configuration.Configuration;
  import org.apache.flink.streaming.api.datastream.DataStream;
  import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
  import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor;
  import org.apache.flink.streaming.api.functions.windowing.WindowFunction;
  import org.apache.flink.streaming.api.windowing.assigners.SlidingEventTimeWindows;
  import org.apache.flink.streaming.api.windowing.time.Time;
  import org.apache.flink.streaming.api.windowing.windows.TimeWindow;
  import org.apache.flink.streaming.runtime.operators.util.AssignerWithPeriodicWatermarksAdapter;
  import org.apache.flink.util.Collector;
  
  import java.net.URL;
  import java.sql.Timestamp;
  import java.text.SimpleDateFormat;
  import java.util.ArrayList;
  import java.util.concurrent.TimeUnit;
  import java.util.regex.Pattern;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/5 1:27 AM
   */
  public class HotPages {
    public static void main(String[] args) throws Exception {
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      env.setParallelism(1);
  
      // 读取文件，转换成POJO
      URL resource = HotPages.class.getResource("/apache.log");
      DataStream<String> inputStream = env.readTextFile(resource.getPath());
  
      DataStream<ApacheLogEvent> dataStream = inputStream
        .map(line -> {
          String[] fields = line.split(" ");
          SimpleDateFormat simpleDateFormat = new SimpleDateFormat("dd/MM/yyyy:HH:mm:ss");
          Long timestamp = simpleDateFormat.parse(fields[3]).getTime();
          return new ApacheLogEvent(fields[0], fields[1], timestamp, fields[5], fields[6]);
        })
        .assignTimestampsAndWatermarks(new AssignerWithPeriodicWatermarksAdapter.Strategy<>(
          new BoundedOutOfOrdernessTimestampExtractor<ApacheLogEvent>(Time.of(1, TimeUnit.SECONDS)) {
            @Override
            public long extractTimestamp(ApacheLogEvent element) {
              return element.getTimestamp();
            }
          }
        ));
  
      // 分组开窗聚合
      SingleOutputStreamOperator<PageViewCount> windowAggStream = dataStream
        // 过滤get请求
        .filter(data -> "GET".equals(data.getMethod()))
        .filter(data -> {
          String regex = "^((?!\\.(css|js|png|ico)$).)*$";
          return Pattern.matches(regex, data.getUrl());
        })
        // 按照url分组
        .keyBy(ApacheLogEvent::getUrl)
        .window(SlidingEventTimeWindows.of(Time.minutes(10), Time.seconds(5)))
        .aggregate(new PageCountAgg(), new PageCountResult());
  
  
      // 收集同一窗口count数据，排序输出
      DataStream<String> resultStream = windowAggStream
        .keyBy(PageViewCount::getWindowEnd)
        .process(new TopNHotPages(3));
  
      resultStream.print();
  
      env.execute("hot pages job");
    }
  
    // 自定义预聚合函数
    public static class PageCountAgg implements AggregateFunction<ApacheLogEvent, Long, Long> {
      @Override
      public Long createAccumulator() {
        return 0L;
      }
  
      @Override
      public Long add(ApacheLogEvent value, Long accumulator) {
        return accumulator + 1;
      }
  
      @Override
      public Long getResult(Long accumulator) {
        return accumulator;
      }
  
      @Override
      public Long merge(Long a, Long b) {
        return a + b;
      }
    }
  
    // 实现自定义的窗口函数
    public static class PageCountResult implements WindowFunction<Long, PageViewCount, String, TimeWindow> {
      @Override
      public void apply(String url, TimeWindow window, Iterable<Long> input, Collector<PageViewCount> out) throws Exception {
        out.collect(new PageViewCount(url, window.getEnd(), input.iterator().next()));
      }
    }
  
    // 实现自定义的处理函数
    public static class TopNHotPages extends KeyedProcessFunction<Long, PageViewCount, String> {
      private Integer topSize;
  
      public TopNHotPages(Integer topSize) {
        this.topSize = topSize;
      }
  
      // 定义状态，保存当前所有PageViewCount到list中
      ListState<PageViewCount> pageViewCountListState;
  
      @Override
      public void open(Configuration parameters) throws Exception {
        pageViewCountListState = getRuntimeContext().getListState(new ListStateDescriptor<PageViewCount>("page-count-list", PageViewCount.class));
      }
  
      @Override
      public void processElement(PageViewCount value, Context ctx, Collector<String> out) throws Exception {
        pageViewCountListState.add(value);
        ctx.timerService().registerEventTimeTimer(value.getWindowEnd() + 1);
      }
  
      @Override
      public void onTimer(long timestamp, OnTimerContext ctx, Collector<String> out) throws Exception {
        ArrayList<PageViewCount> pageViewCounts = Lists.newArrayList(pageViewCountListState.get().iterator());
  
        pageViewCounts.sort((a, b) -> -Long.compare(a.getCount(), b.getCount()));
  
        // 格式化成String输出
        StringBuilder resultBuilder = new StringBuilder();
        resultBuilder.append("============================").append(System.lineSeparator());
        resultBuilder.append("窗口结束时间：").append(new Timestamp(timestamp - 1)).append(System.lineSeparator());
  
        // 遍历列表，取top n输出
        for (int i = 0; i < Math.min(topSize, pageViewCounts.size()); i++) {
          PageViewCount pageViewCount = pageViewCounts.get(i);
          resultBuilder.append("NO ").append(i + 1).append(":")
            .append(" 页面URL = ").append(pageViewCount.getUrl())
            .append(" 浏览量 = ").append(pageViewCount.getCount())
            .append(System.lineSeparator());
        }
        resultBuilder.append("===============================").append(System.lineSeparator());
  
        // 控制输出频率
        Thread.sleep(1000L);
  
        out.collect(resultBuilder.toString());
      }
    }
  }
  ```

+ 输出结果

  ```shell
  ....
  
  ============================
  窗口结束时间：2015-05-17 10:05:25.0
  NO 1: 页面URL = /blog/tags/puppet?flav=rss20 浏览量 = 2
  NO 2: 页面URL = /blog/geekery/eventdb-ideas.html 浏览量 = 1
  NO 3: 页面URL = /blog/geekery/installing-windows-8-consumer-preview.html 浏览量 = 1
  ===============================
  
  ============================
  窗口结束时间：2015-05-17 10:05:30.0
  NO 1: 页面URL = /blog/tags/puppet?flav=rss20 浏览量 = 2
  NO 2: 页面URL = /blog/geekery/eventdb-ideas.html 浏览量 = 1
  NO 3: 页面URL = /blog/geekery/installing-windows-8-consumer-preview.html 浏览量 = 1
  ===============================
  
  ============================
  窗口结束时间：2015-05-17 10:05:35.0
  NO 1: 页面URL = /blog/tags/puppet?flav=rss20 浏览量 = 2
  NO 2: 页面URL = /blog/tags/firefox?flav=rss20 浏览量 = 2
  NO 3: 页面URL = /blog/geekery/eventdb-ideas.html 浏览量 = 1
  ===============================
  
  ....
  ```

#### 代码2-乱序数据测试

+ java代码

  ```java
  import beans.ApacheLogEvent;
  import beans.PageViewCount;
  import org.apache.commons.compress.utils.Lists;
  import org.apache.flink.api.common.functions.AggregateFunction;
  import org.apache.flink.api.common.state.ListState;
  import org.apache.flink.api.common.state.ListStateDescriptor;
  import org.apache.flink.configuration.Configuration;
  import org.apache.flink.streaming.api.datastream.DataStream;
  import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
  import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor;
  import org.apache.flink.streaming.api.functions.windowing.WindowFunction;
  import org.apache.flink.streaming.api.windowing.assigners.SlidingEventTimeWindows;
  import org.apache.flink.streaming.api.windowing.time.Time;
  import org.apache.flink.streaming.api.windowing.windows.TimeWindow;
  import org.apache.flink.streaming.runtime.operators.util.AssignerWithPeriodicWatermarksAdapter;
  import org.apache.flink.util.Collector;
  import org.apache.flink.util.OutputTag;
  
  import java.net.URL;
  import java.sql.Timestamp;
  import java.text.SimpleDateFormat;
  import java.util.ArrayList;
  import java.util.concurrent.TimeUnit;
  import java.util.regex.Pattern;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/5 1:27 AM
   */
  public class HotPages {
    public static void main(String[] args) throws Exception {
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      env.setParallelism(1);
  
      // 读取文件，转换成POJO
      //        URL resource = HotPages.class.getResource("/apache.log");
      //        DataStream<String> inputStream = env.readTextFile(resource.getPath());
  
      // 方便测试，使用本地Socket输入数据
      DataStream<String> inputStream = env.socketTextStream("localhost", 7777);
  
  
      DataStream<ApacheLogEvent> dataStream = inputStream
        .map(line -> {
          String[] fields = line.split(" ");
          SimpleDateFormat simpleDateFormat = new SimpleDateFormat("dd/MM/yyyy:HH:mm:ss");
          Long timestamp = simpleDateFormat.parse(fields[3]).getTime();
          return new ApacheLogEvent(fields[0], fields[1], timestamp, fields[5], fields[6]);
        })
        .assignTimestampsAndWatermarks(new AssignerWithPeriodicWatermarksAdapter.Strategy<>(
          new BoundedOutOfOrdernessTimestampExtractor<ApacheLogEvent>(Time.of(1, TimeUnit.SECONDS)) {
            @Override
            public long extractTimestamp(ApacheLogEvent element) {
              return element.getTimestamp();
            }
          }
        ));
  
      dataStream.print("data");
  
  
      // 定义一个侧输出流标签
      OutputTag<ApacheLogEvent> lateTag = new OutputTag<ApacheLogEvent>("late"){};
  
      // 分组开窗聚合
      SingleOutputStreamOperator<PageViewCount> windowAggStream = dataStream
        // 过滤get请求
        .filter(data -> "GET".equals(data.getMethod()))
        .filter(data -> {
          String regex = "^((?!\\.(css|js|png|ico)$).)*$";
          return Pattern.matches(regex, data.getUrl());
        })
        // 按照url分组
        .keyBy(ApacheLogEvent::getUrl)
        .window(SlidingEventTimeWindows.of(Time.minutes(10), Time.seconds(5)))
        .allowedLateness(Time.minutes(1))
        .sideOutputLateData(lateTag)
        .aggregate(new PageCountAgg(), new PageCountResult());
  
  
      windowAggStream.print("agg");
      windowAggStream.getSideOutput(lateTag).print("late");
  
  
      // 收集同一窗口count数据，排序输出
      DataStream<String> resultStream = windowAggStream
        .keyBy(PageViewCount::getWindowEnd)
        .process(new TopNHotPages(3));
  
      resultStream.print();
  
      env.execute("hot pages job");
    }
  
    // 自定义预聚合函数
    public static class PageCountAgg implements AggregateFunction<ApacheLogEvent, Long, Long> {
      @Override
      public Long createAccumulator() {
        return 0L;
      }
  
      @Override
      public Long add(ApacheLogEvent value, Long accumulator) {
        return accumulator + 1;
      }
  
      @Override
      public Long getResult(Long accumulator) {
        return accumulator;
      }
  
      @Override
      public Long merge(Long a, Long b) {
        return a + b;
      }
    }
  
    // 实现自定义的窗口函数
    public static class PageCountResult implements WindowFunction<Long, PageViewCount, String, TimeWindow> {
      @Override
      public void apply(String url, TimeWindow window, Iterable<Long> input, Collector<PageViewCount> out) throws Exception {
        out.collect(new PageViewCount(url, window.getEnd(), input.iterator().next()));
      }
    }
  
    // 实现自定义的处理函数
    public static class TopNHotPages extends KeyedProcessFunction<Long, PageViewCount, String> {
      private Integer topSize;
  
      public TopNHotPages(Integer topSize) {
        this.topSize = topSize;
      }
  
      // 定义状态，保存当前所有PageViewCount到list中
      ListState<PageViewCount> pageViewCountListState;
  
      @Override
      public void open(Configuration parameters) throws Exception {
        pageViewCountListState = getRuntimeContext().getListState(new ListStateDescriptor<PageViewCount>("page-count-list", PageViewCount.class));
      }
  
      @Override
      public void processElement(PageViewCount value, Context ctx, Collector<String> out) throws Exception {
        pageViewCountListState.add(value);
        ctx.timerService().registerEventTimeTimer(value.getWindowEnd() + 1);
      }
  
      @Override
      public void onTimer(long timestamp, OnTimerContext ctx, Collector<String> out) throws Exception {
        ArrayList<PageViewCount> pageViewCounts = Lists.newArrayList(pageViewCountListState.get().iterator());
  
        pageViewCounts.sort((a, b) -> -Long.compare(a.getCount(), b.getCount()));
  
        // 格式化成String输出
        StringBuilder resultBuilder = new StringBuilder();
        resultBuilder.append("============================").append(System.lineSeparator());
        resultBuilder.append("窗口结束时间：").append(new Timestamp(timestamp - 1)).append(System.lineSeparator());
  
        // 遍历列表，取top n输出
        for (int i = 0; i < Math.min(topSize, pageViewCounts.size()); i++) {
          PageViewCount pageViewCount = pageViewCounts.get(i);
          resultBuilder.append("NO ").append(i + 1).append(":")
            .append(" 页面URL = ").append(pageViewCount.getUrl())
            .append(" 浏览量 = ").append(pageViewCount.getCount())
            .append(System.lineSeparator());
        }
        resultBuilder.append("===============================").append(System.lineSeparator());
  
        // 控制输出频率
        Thread.sleep(1000L);
  
        out.collect(resultBuilder.toString());
  
        pageViewCountListState.clear();
      }
    }
  }
  ```

+ 启动本地socket

  ```shell
  nc -lk 7777
  ```

+ 在本地socket输入数据，查看输出

  + 输入

    ```shell
    83.149.9.216 - - 17/05/2015:10:25:49 +0000 GET /presentations/
    83.149.9.216 - - 17/05/2015:10:25:50 +0000 GET /presentations/
    83.149.9.216 - - 17/05/2015:10:25:51 +0000 GET /presentations/
    83.149.9.216 - - 17/05/2015:10:25:52 +0000 GET /presentations/
    83.149.9.216 - - 17/05/2015:10:25:55 +0000 GET /presentations/
    83.149.9.216 - - 17/05/2015:10:25:56 +0000 GET /presentations/
    83.149.9.216 - - 17/05/2015:10:25:56 +0000 GET /present
    83.149.9.216 - - 17/05/2015:10:25:57 +0000 GET /present
    83.149.9.216 - - 17/05/2015:10:26:01 +0000 GET /
    83.149.9.216 - - 17/05/2015:10:26:02 +0000 GET /pre
    83.149.9.216 - - 17/05/2015:10:25:46 +0000 GET /presentations/
    83.149.9.216 - - 17/05/2015:10:26:02 +0000 GET /pre
    83.149.9.216 - - 17/05/2015:10:26:03 +0000 GET /pre
    ```

  + 输出

    *由于`onTimer`简单粗暴直接`pageViewCountListState.clear();`导致前面几次排名信息中丢失第一名以外的数据 => 下面代码3-乱序数据代码改进 中解决问题*

    ```shell
    data> ApacheLogEvent{ip='83.149.9.216', userId='-', timestamp=1431829549000, method='GET', url='/presentations/'}
    data> ApacheLogEvent{ip='83.149.9.216', userId='-', timestamp=1431829550000, method='GET', url='/presentations/'}
    data> ApacheLogEvent{ip='83.149.9.216', userId='-', timestamp=1431829551000, method='GET', url='/presentations/'}
    data> ApacheLogEvent{ip='83.149.9.216', userId='-', timestamp=1431829552000, method='GET', url='/presentations/'}
    data> ApacheLogEvent{ip='83.149.9.216', userId='-', timestamp=1431829555000, method='GET', url='/presentations/'}
    data> ApacheLogEvent{ip='83.149.9.216', userId='-', timestamp=1431829556000, method='GET', url='/presentations/'}
    data> ApacheLogEvent{ip='83.149.9.216', userId='-', timestamp=1431829556000, method='GET', url='/present'}
    data> ApacheLogEvent{ip='83.149.9.216', userId='-', timestamp=1431829557000, method='GET', url='/present'}
    data> ApacheLogEvent{ip='83.149.9.216', userId='-', timestamp=1431829561000, method='GET', url='/'}
    data> ApacheLogEvent{ip='83.149.9.216', userId='-', timestamp=1431829562000, method='GET', url='/pre'}
    data> ApacheLogEvent{ip='83.149.9.216', userId='-', timestamp=1431829546000, method='GET', url='/presentations/'}
    data> ApacheLogEvent{ip='83.149.9.216', userId='-', timestamp=1431829562000, method='GET', url='/pre'}
    agg> PageViewCount{url='/presentations/', windowEnd=1431829550000, count=2}
    agg> PageViewCount{url='/presentations/', windowEnd=1431829555000, count=5}
    agg> PageViewCount{url='/presentations/', windowEnd=1431829560000, count=7}
    agg> PageViewCount{url='/present', windowEnd=1431829560000, count=2}
    ============================
    窗口结束时间：2015-05-17 10:25:50.0
    NO 1: 页面URL = /presentations/ 浏览量 = 2
    ===============================
    
    ============================
    窗口结束时间：2015-05-17 10:25:55.0
    NO 1: 页面URL = /presentations/ 浏览量 = 5
    ===============================
    
    ============================
    窗口结束时间：2015-05-17 10:26:00.0
    NO 1: 页面URL = /presentations/ 浏览量 = 7
    NO 2: 页面URL = /present 浏览量 = 2
    ===============================
    ```

#### 代码3-乱序数据-代码改进

**一个数据只有不属于任何窗口了，才会被丢进侧输出流！**

---

+ java代码

  ```java
  import beans.ApacheLogEvent;
  import beans.PageViewCount;
  import org.apache.commons.compress.utils.Lists;
  import org.apache.flink.api.common.functions.AggregateFunction;
  import org.apache.flink.api.common.state.MapState;
  import org.apache.flink.api.common.state.MapStateDescriptor;
  import org.apache.flink.configuration.Configuration;
  import org.apache.flink.streaming.api.datastream.DataStream;
  import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
  import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor;
  import org.apache.flink.streaming.api.functions.windowing.WindowFunction;
  import org.apache.flink.streaming.api.windowing.assigners.SlidingEventTimeWindows;
  import org.apache.flink.streaming.api.windowing.time.Time;
  import org.apache.flink.streaming.api.windowing.windows.TimeWindow;
  import org.apache.flink.streaming.runtime.operators.util.AssignerWithPeriodicWatermarksAdapter;
  import org.apache.flink.util.Collector;
  import org.apache.flink.util.OutputTag;
  
  import java.sql.Timestamp;
  import java.text.SimpleDateFormat;
  import java.util.ArrayList;
  import java.util.Map;
  import java.util.concurrent.TimeUnit;
  import java.util.regex.Pattern;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/5 1:27 AM
   */
  public class HotPages {
    public static void main(String[] args) throws Exception {
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      env.setParallelism(1);
  
      // 读取文件，转换成POJO
      //        URL resource = HotPages.class.getResource("/apache.log");
      //        DataStream<String> inputStream = env.readTextFile(resource.getPath());
  
      // 方便测试，使用本地Socket输入数据
      DataStream<String> inputStream = env.socketTextStream("localhost", 7777);
  
  
      DataStream<ApacheLogEvent> dataStream = inputStream
        .map(line -> {
          String[] fields = line.split(" ");
          SimpleDateFormat simpleDateFormat = new SimpleDateFormat("dd/MM/yyyy:HH:mm:ss");
          Long timestamp = simpleDateFormat.parse(fields[3]).getTime();
          return new ApacheLogEvent(fields[0], fields[1], timestamp, fields[5], fields[6]);
        })
        .assignTimestampsAndWatermarks(new AssignerWithPeriodicWatermarksAdapter.Strategy<>(
          new BoundedOutOfOrdernessTimestampExtractor<ApacheLogEvent>(Time.of(1, TimeUnit.SECONDS)) {
            @Override
            public long extractTimestamp(ApacheLogEvent element) {
              return element.getTimestamp();
            }
          }
        ));
  
      dataStream.print("data");
  
  
      // 定义一个侧输出流标签
      OutputTag<ApacheLogEvent> lateTag = new OutputTag<ApacheLogEvent>("late") {
      };
  
      // 分组开窗聚合
      SingleOutputStreamOperator<PageViewCount> windowAggStream = dataStream
        // 过滤get请求
        .filter(data -> "GET".equals(data.getMethod()))
        .filter(data -> {
          String regex = "^((?!\\.(css|js|png|ico)$).)*$";
          return Pattern.matches(regex, data.getUrl());
        })
        // 按照url分组
        .keyBy(ApacheLogEvent::getUrl)
        .window(SlidingEventTimeWindows.of(Time.minutes(10), Time.seconds(5)))
        .allowedLateness(Time.minutes(1))
        .sideOutputLateData(lateTag)
        .aggregate(new PageCountAgg(), new PageCountResult());
  
  
      windowAggStream.print("agg");
      windowAggStream.getSideOutput(lateTag).print("late");
  
  
      // 收集同一窗口count数据，排序输出
      DataStream<String> resultStream = windowAggStream
        .keyBy(PageViewCount::getWindowEnd)
        .process(new TopNHotPages(3));
  
      resultStream.print();
  
      env.execute("hot pages job");
    }
  
    // 自定义预聚合函数
    public static class PageCountAgg implements AggregateFunction<ApacheLogEvent, Long, Long> {
      @Override
      public Long createAccumulator() {
        return 0L;
      }
  
      @Override
      public Long add(ApacheLogEvent value, Long accumulator) {
        return accumulator + 1;
      }
  
      @Override
      public Long getResult(Long accumulator) {
        return accumulator;
      }
  
      @Override
      public Long merge(Long a, Long b) {
        return a + b;
      }
    }
  
    // 实现自定义的窗口函数
    public static class PageCountResult implements WindowFunction<Long, PageViewCount, String, TimeWindow> {
      @Override
      public void apply(String url, TimeWindow window, Iterable<Long> input, Collector<PageViewCount> out) throws Exception {
        out.collect(new PageViewCount(url, window.getEnd(), input.iterator().next()));
      }
    }
  
    // 实现自定义的处理函数
    public static class TopNHotPages extends KeyedProcessFunction<Long, PageViewCount, String> {
      private Integer topSize;
  
      public TopNHotPages(Integer topSize) {
        this.topSize = topSize;
      }
  
      // 定义状态，保存当前所有PageViewCount到Map中
      //        ListState<PageViewCount> pageViewCountListState;
      MapState<String, Long> pageViewCountMapState;
  
      @Override
      public void open(Configuration parameters) throws Exception {
        //            pageViewCountListState = getRuntimeContext().getListState(new ListStateDescriptor<PageViewCount>("page-count-list", PageViewCount.class));
        pageViewCountMapState = getRuntimeContext().getMapState(new MapStateDescriptor<String, Long>("page-count-map", String.class, Long.class));
      }
  
      @Override
      public void processElement(PageViewCount value, Context ctx, Collector<String> out) throws Exception {
        //            pageViewCountListState.add(value);
        pageViewCountMapState.put(value.getUrl(), value.getCount());
        ctx.timerService().registerEventTimeTimer(value.getWindowEnd() + 1);
        // 注册一个1分钟之后的定时器，用来清空状态
        ctx.timerService().registerEventTimeTimer(value.getWindowEnd() + 60 * 1000L);
      }
  
  
      @Override
      public void onTimer(long timestamp, OnTimerContext ctx, Collector<String> out) throws Exception {
        // 先判断是否到了窗口关闭清理时间，如果是，直接清空状态返回
        if (timestamp == ctx.getCurrentKey() + 60 * 1000L) {
          pageViewCountMapState.clear();
          return;
        }
  
  
        //            ArrayList<PageViewCount> pageViewCounts = Lists.newArrayList(pageViewCountListState.get().iterator());
        ArrayList<Map.Entry<String, Long>> pageViewCounts = Lists.newArrayList(pageViewCountMapState.entries().iterator());
  
        pageViewCounts.sort((a, b) -> -Long.compare(a.getValue(), b.getValue()));
  
        // 格式化成String输出
        StringBuilder resultBuilder = new StringBuilder();
        resultBuilder.append("============================").append(System.lineSeparator());
        resultBuilder.append("窗口结束时间：").append(new Timestamp(timestamp - 1)).append(System.lineSeparator());
  
        // 遍历列表，取top n输出
        for (int i = 0; i < Math.min(topSize, pageViewCounts.size()); i++) {
          //                PageViewCount pageViewCount = pageViewCounts.get(i);
          Map.Entry<String, Long> pageViewCount = pageViewCounts.get(i);
          resultBuilder.append("NO ").append(i + 1).append(":")
            .append(" 页面URL = ").append(pageViewCount.getKey())
            .append(" 浏览量 = ").append(pageViewCount.getValue())
            .append(System.lineSeparator());
        }
        resultBuilder.append("===============================").append(System.lineSeparator());
  
        // 控制输出频率
        Thread.sleep(1000L);
  
        out.collect(resultBuilder.toString());
  
  
        //            pageViewCountListState.clear();
      }
    }
  }
  
  ```

+ 输入

  ```shell
  83.149.9.216 - - 17/05/2015:10:25:49 +0000 GET /presentations/
  83.149.9.216 - - 17/05/2015:10:25:50 +0000 GET /presentations/
  83.149.9.216 - - 17/05/2015:10:25:51 +0000 GET /presentations/
  83.149.9.216 - - 17/05/2015:10:25:52 +0000 GET /presentations/
  83.149.9.216 - - 17/05/2015:10:25:55 +0000 GET /presentations/
  83.149.9.216 - - 17/05/2015:10:25:56 +0000 GET /presentations/
  83.149.9.216 - - 17/05/2015:10:25:56 +0000 GET /present
  83.149.9.216 - - 17/05/2015:10:25:57 +0000 GET /present
  83.149.9.216 - - 17/05/2015:10:26:01 +0000 GET /
  83.149.9.216 - - 17/05/2015:10:26:02 +0000 GET /pre
  83.149.9.216 - - 17/05/2015:10:25:46 +0000 GET /presentations/
  83.149.9.216 - - 17/05/2015:10:26:03 +0000 GET /pre
  ```

+ 输出

  ```shell
  data> ApacheLogEvent{ip='83.149.9.216', userId='-', timestamp=1431829549000, method='GET', url='/presentations/'}
  data> ApacheLogEvent{ip='83.149.9.216', userId='-', timestamp=1431829550000, method='GET', url='/presentations/'}
  data> ApacheLogEvent{ip='83.149.9.216', userId='-', timestamp=1431829551000, method='GET', url='/presentations/'}
  data> ApacheLogEvent{ip='83.149.9.216', userId='-', timestamp=1431829552000, method='GET', url='/presentations/'}
  data> ApacheLogEvent{ip='83.149.9.216', userId='-', timestamp=1431829555000, method='GET', url='/presentations/'}
  data> ApacheLogEvent{ip='83.149.9.216', userId='-', timestamp=1431829556000, method='GET', url='/presentations/'}
  data> ApacheLogEvent{ip='83.149.9.216', userId='-', timestamp=1431829556000, method='GET', url='/present'}
  data> ApacheLogEvent{ip='83.149.9.216', userId='-', timestamp=1431829557000, method='GET', url='/present'}
  data> ApacheLogEvent{ip='83.149.9.216', userId='-', timestamp=1431829561000, method='GET', url='/'}
  data> ApacheLogEvent{ip='83.149.9.216', userId='-', timestamp=1431829562000, method='GET', url='/pre'}
  data> ApacheLogEvent{ip='83.149.9.216', userId='-', timestamp=1431829546000, method='GET', url='/presentations/'}
  agg> PageViewCount{url='/presentations/', windowEnd=1431829550000, count=2}
  agg> PageViewCount{url='/presentations/', windowEnd=1431829555000, count=5}
  agg> PageViewCount{url='/presentations/', windowEnd=1431829560000, count=7}
  agg> PageViewCount{url='/present', windowEnd=1431829560000, count=2}
  data> ApacheLogEvent{ip='83.149.9.216', userId='-', timestamp=1431829563000, method='GET', url='/pre'}
  ============================
  窗口结束时间：2015-05-17 10:25:50.0
  NO 1: 页面URL = /presentations/ 浏览量 = 2
  ===============================
  
  ============================
  窗口结束时间：2015-05-17 10:25:55.0
  NO 1: 页面URL = /presentations/ 浏览量 = 5
  ===============================
  
  ============================
  窗口结束时间：2015-05-17 10:26:00.0
  NO 1: 页面URL = /presentations/ 浏览量 = 7
  NO 2: 页面URL = /present 浏览量 = 2
  ===============================
  ```

### 14.3.3 实时流量统计——PV和UV

+ 基本需求
  + 从埋点日志中，统计实时的PV和UV
  + 统计每小时的访问量（PV），并且对用户进行去重（UV）
+ 解决思路
  + 统计埋点日志中的pv行为，利用Set数据结构进行去重
  + **对于超大规模的数据，可以考虑用布隆过滤器进行去重**

#### 代码1-PV统计-基本实现

+ java代码

  ```java
  
  import beans.UserBehavior;
  import org.apache.flink.api.common.functions.MapFunction;
  import org.apache.flink.api.java.tuple.Tuple2;
  import org.apache.flink.streaming.api.datastream.DataStream;
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor;
  import org.apache.flink.streaming.api.windowing.assigners.TumblingEventTimeWindows;
  import org.apache.flink.streaming.api.windowing.time.Time;
  import org.apache.flink.streaming.runtime.operators.util.AssignerWithPeriodicWatermarksAdapter;
  
  import java.net.URL;
  import java.util.concurrent.TimeUnit;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/5 3:11 AM
   */
  public class PageView {
    public static void main(String[] args) throws Exception {
      // 1. 创建执行环境
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      // 设置并行度为1
      env.setParallelism(1);
  
      // 2. 从csv文件中获取数据
      URL resource = PageView.class.getResource("/UserBehavior.csv");
      DataStream<String> inputStream = env.readTextFile(resource.getPath());
  
      // 3. 转换成POJO,分配时间戳和watermark
      DataStream<UserBehavior> userBehaviorDataStream = inputStream.map(line -> {
        String[] fields = line.split(",");
        return new UserBehavior(new Long(fields[0]), new Long(fields[1]), new Integer(fields[2]), fields[3], new Long(fields[4]));
      }).assignTimestampsAndWatermarks(new AssignerWithPeriodicWatermarksAdapter.Strategy<>(
        new BoundedOutOfOrdernessTimestampExtractor<UserBehavior>(Time.of(200, TimeUnit.MILLISECONDS)) {
          @Override
          public long extractTimestamp(UserBehavior element) {
            return element.getTimestamp() * 1000L;
          }
        }
      ));
  
      // 4. 分组开窗聚合，得到每个窗口内各个商品的count值
      DataStream<Tuple2<String, Long>> pvResultStream = userBehaviorDataStream
        // 过滤只保留pv行为
        .filter(userBehavior -> "pv".equals(userBehavior.getBehavior()))
        .map(new MapFunction<UserBehavior, Tuple2<String, Long>>() {
          @Override
          public Tuple2<String, Long> map(UserBehavior value) throws Exception {
            return new Tuple2<>("pv", 1L);
          }
        })
        // 按照商品ID分组
        .keyBy(item -> item.f0)
        // 1小时滚动窗口
        .window(TumblingEventTimeWindows.of(Time.hours(1)))
        .sum(1);
  
  
      pvResultStream.print();
  
      env.execute("pv count job");
    }
  }
  
  ```

+ 输出

  ```shell
  (pv,41890)
  (pv,48022)
  (pv,47298)
  (pv,44499)
  (pv,48649)
  (pv,50838)
  (pv,52296)
  (pv,52552)
  (pv,48292)
  (pv,13)
  ```

#### 代码2 PV统计-并行和数据倾斜优化

+ java代码

  ```java
  
  import beans.PageViewCount;
  import beans.UserBehavior;
  import org.apache.flink.api.common.functions.AggregateFunction;
  import org.apache.flink.api.common.functions.MapFunction;
  import org.apache.flink.api.common.state.ValueState;
  import org.apache.flink.api.common.state.ValueStateDescriptor;
  import org.apache.flink.api.java.tuple.Tuple2;
  import org.apache.flink.configuration.Configuration;
  import org.apache.flink.streaming.api.datastream.DataStream;
  import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
  import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor;
  import org.apache.flink.streaming.api.functions.windowing.WindowFunction;
  import org.apache.flink.streaming.api.windowing.assigners.TumblingEventTimeWindows;
  import org.apache.flink.streaming.api.windowing.time.Time;
  import org.apache.flink.streaming.api.windowing.windows.TimeWindow;
  import org.apache.flink.streaming.runtime.operators.util.AssignerWithPeriodicWatermarksAdapter;
  
  import org.apache.flink.util.Collector;
  
  import java.net.URL;
  import java.util.Random;
  import java.util.concurrent.TimeUnit;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/5 3:11 AM
   */
  public class PageView {
    public static void main(String[] args) throws Exception {
      // 1. 创建执行环境
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      // 设置并行度为4
      env.setParallelism(4);
  
      // 2. 从csv文件中获取数据
      URL resource = PageView.class.getResource("/UserBehavior.csv");
      DataStream<String> inputStream = env.readTextFile(resource.getPath());
  
      // 3. 转换成POJO,分配时间戳和watermark
      DataStream<UserBehavior> userBehaviorDataStream = inputStream.map(line -> {
        String[] fields = line.split(",");
        return new UserBehavior(new Long(fields[0]), new Long(fields[1]), new Integer(fields[2]), fields[3], new Long(fields[4]));
      }).assignTimestampsAndWatermarks(new AssignerWithPeriodicWatermarksAdapter.Strategy<>(
        new BoundedOutOfOrdernessTimestampExtractor<UserBehavior>(Time.of(200, TimeUnit.MILLISECONDS)) {
          @Override
          public long extractTimestamp(UserBehavior element) {
            return element.getTimestamp() * 1000L;
          }
        }
      ));
  
      // 4. 分组开窗聚合，得到每个窗口内各个商品的count值
      DataStream<Tuple2<String, Long>> pvResultStream0 = userBehaviorDataStream
        // 过滤只保留pv行为
        .filter(userBehavior -> "pv".equals(userBehavior.getBehavior()))
        .map(new MapFunction<UserBehavior, Tuple2<String, Long>>() {
          @Override
          public Tuple2<String, Long> map(UserBehavior value) throws Exception {
            return new Tuple2<>("pv", 1L);
          }
        })
        // 按照商品ID分组
        .keyBy(item -> item.f0)
        // 1小时滚动窗口
        .window(TumblingEventTimeWindows.of(Time.hours(1)))
        .sum(1);
  
      //  并行任务改进，设计随机key，解决数据倾斜问题
      SingleOutputStreamOperator<PageViewCount> pvStream = userBehaviorDataStream.filter(data -> "pv".equals(data.getBehavior()))
        .map(new MapFunction<UserBehavior, Tuple2<Integer, Long>>() {
          @Override
          public Tuple2<Integer, Long> map(UserBehavior value) throws Exception {
            Random random = new Random();
            return new Tuple2<>(random.nextInt(10), 1L);
          }
        })
        .keyBy(data -> data.f0)
        .window(TumblingEventTimeWindows.of(Time.hours(1)))
        .aggregate(new PvCountAgg(), new PvCountResult());
  
      // 将各分区数据汇总起来
      DataStream<PageViewCount> pvResultStream = pvStream
        .keyBy(PageViewCount::getWindowEnd)
        .process(new TotalPvCount());
      //                .sum("count");
  
      pvResultStream.print();
  
      env.execute("pv count job");
    }
  
    // 实现自定义预聚合函数
    public static class PvCountAgg implements AggregateFunction<Tuple2<Integer, Long>, Long, Long> {
      @Override
      public Long createAccumulator() {
        return 0L;
      }
  
      @Override
      public Long add(Tuple2<Integer, Long> value, Long accumulator) {
        return accumulator + 1;
      }
  
      @Override
      public Long getResult(Long accumulator) {
        return accumulator;
      }
  
      @Override
      public Long merge(Long a, Long b) {
        return a + b;
      }
    }
  
    // 实现自定义窗口
    public static class PvCountResult implements WindowFunction<Long, PageViewCount, Integer, TimeWindow> {
      @Override
      public void apply(Integer integer, TimeWindow window, Iterable<Long> input, Collector<PageViewCount> out) throws Exception {
        out.collect( new PageViewCount(integer.toString(), window.getEnd(), input.iterator().next()) );
      }
    }
  
    // 实现自定义处理函数，把相同窗口分组统计的count值叠加
    public static class TotalPvCount extends KeyedProcessFunction<Long, PageViewCount, PageViewCount> {
      // 定义状态，保存当前的总count值
      ValueState<Long> totalCountState;
  
      @Override
      public void open(Configuration parameters) throws Exception {
        totalCountState = getRuntimeContext().getState(new ValueStateDescriptor<Long>("total-count", Long.class));
      }
  
      @Override
      public void processElement(PageViewCount value, Context ctx, Collector<PageViewCount> out) throws Exception {
        Long totalCount = totalCountState.value();
        if(null == totalCount){
          totalCount = 0L;
          totalCountState.update(totalCount);
        }
        totalCountState.update( totalCount + value.getCount() );
        ctx.timerService().registerEventTimeTimer(value.getWindowEnd() + 1);
      }
  
      @Override
      public void onTimer(long timestamp, OnTimerContext ctx, Collector<PageViewCount> out) throws Exception {
        // 定时器触发，所有分组count值都到齐，直接输出当前的总count数量
        Long totalCount = totalCountState.value();
        out.collect(new PageViewCount("pv", ctx.getCurrentKey(), totalCount));
        // 清空状态
        totalCountState.clear();
      }
    }
  }
  
  ```

+ 输出

  ```shell
  2> PageViewCount{url='pv', windowEnd=1511661600000, count=41890}
  2> PageViewCount{url='pv', windowEnd=1511679600000, count=50838}
  1> PageViewCount{url='pv', windowEnd=1511676000000, count=48649}
  4> PageViewCount{url='pv', windowEnd=1511668800000, count=47298}
  2> PageViewCount{url='pv', windowEnd=1511686800000, count=52552}
  4> PageViewCount{url='pv', windowEnd=1511672400000, count=44499}
  3> PageViewCount{url='pv', windowEnd=1511665200000, count=48022}
  4> PageViewCount{url='pv', windowEnd=1511683200000, count=52296}
  2> PageViewCount{url='pv', windowEnd=1511690400000, count=48292}
  3> PageViewCount{url='pv', windowEnd=1511694000000, count=13}
  ```

#### 代码3-UV统计-Set去重

+ java代码

  ```java
  import beans.PageViewCount;
  import beans.UserBehavior;
  import org.apache.flink.streaming.api.datastream.DataStream;
  import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor;
  import org.apache.flink.streaming.api.functions.windowing.AllWindowFunction;
  import org.apache.flink.streaming.api.windowing.time.Time;
  import org.apache.flink.streaming.api.windowing.windows.TimeWindow;
  import org.apache.flink.streaming.runtime.operators.util.AssignerWithPeriodicWatermarksAdapter;
  import org.apache.flink.util.Collector;
  
  import java.net.URL;
  import java.util.HashSet;
  import java.util.concurrent.TimeUnit;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/5 3:51 AM
   */
  public class UniqueVisitor {
    public static void main(String[] args) throws Exception {
      // 1. 创建执行环境
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      // 设置并行度为1
      env.setParallelism(1);
  
      // 2. 从csv文件中获取数据
      URL resource = UniqueVisitor.class.getResource("/UserBehavior.csv");
      DataStream<String> inputStream = env.readTextFile(resource.getPath());
  
      // 3. 转换成POJO,分配时间戳和watermark
      DataStream<UserBehavior> dataStream = inputStream.map(line -> {
        String[] fields = line.split(",");
        return new UserBehavior(new Long(fields[0]), new Long(fields[1]), new Integer(fields[2]), fields[3], new Long(fields[4]));
      }).assignTimestampsAndWatermarks(new AssignerWithPeriodicWatermarksAdapter.Strategy<>(
        new BoundedOutOfOrdernessTimestampExtractor<UserBehavior>(Time.of(200, TimeUnit.MILLISECONDS)) {
          @Override
          public long extractTimestamp(UserBehavior element) {
            return element.getTimestamp() * 1000L;
          }
        }
      ));
  
      // 开窗统计uv值
      SingleOutputStreamOperator<PageViewCount> uvStream = dataStream.filter(data -> "pv".equals(data.getBehavior()))
        .timeWindowAll(Time.hours(1))
        .apply(new UvCountResult());
  
      uvStream.print();
  
  
      env.execute("uv count job");
    }
  
    // 实现自定义全窗口函数
    public static class UvCountResult implements AllWindowFunction<UserBehavior, PageViewCount, TimeWindow> {
      @Override
      public void apply(TimeWindow window, Iterable<UserBehavior> values, Collector<PageViewCount> out) throws Exception {
        // 定义一个Set结构，保存窗口中的所有userId，自动去重
        HashSet<Long> uidSet = new HashSet<>();
        for (UserBehavior ub : values) {
          uidSet.add(ub.getUerId());
        }
        out.collect(new PageViewCount("uv", window.getEnd(), (long) uidSet.size()));
      }
    }
  }
  ```

+ 输出

  ```shell
  PageViewCount{url='uv', windowEnd=1511661600000, count=28196}
  PageViewCount{url='uv', windowEnd=1511665200000, count=32160}
  PageViewCount{url='uv', windowEnd=1511668800000, count=32233}
  PageViewCount{url='uv', windowEnd=1511672400000, count=30615}
  PageViewCount{url='uv', windowEnd=1511676000000, count=32747}
  PageViewCount{url='uv', windowEnd=1511679600000, count=33898}
  PageViewCount{url='uv', windowEnd=1511683200000, count=34631}
  PageViewCount{url='uv', windowEnd=1511686800000, count=34746}
  PageViewCount{url='uv', windowEnd=1511690400000, count=32356}
  PageViewCount{url='uv', windowEnd=1511694000000, count=13}
  ```

#### 代码4-UV统计-布隆过滤器

+ pom依赖

  ```xml
  <dependencies>
    <dependency>
      <groupId>redis.clients</groupId>
      <artifactId>jedis</artifactId>
      <version>3.5.1</version>
    </dependency>
  </dependencies>
  ```

+ java代码

  ```java
  import beans.PageViewCount;
  import beans.UserBehavior;
  import org.apache.flink.configuration.Configuration;
  import org.apache.flink.streaming.api.datastream.DataStream;
  import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor;
  import org.apache.flink.streaming.api.functions.windowing.ProcessAllWindowFunction;
  import org.apache.flink.streaming.api.windowing.time.Time;
  import org.apache.flink.streaming.api.windowing.triggers.Trigger;
  import org.apache.flink.streaming.api.windowing.triggers.TriggerResult;
  import org.apache.flink.streaming.api.windowing.windows.TimeWindow;
  import org.apache.flink.streaming.runtime.operators.util.AssignerWithPeriodicWatermarksAdapter;
  import org.apache.flink.util.Collector;
  import redis.clients.jedis.Jedis;
  
  import java.net.URL;
  import java.util.concurrent.TimeUnit;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/5 4:03 AM
   */
  public class UvWithBloomFilter {
    public static void main(String[] args) throws Exception {
      // 1. 创建执行环境
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      // 设置并行度为1
      env.setParallelism(1);
  
      // 2. 从csv文件中获取数据
      URL resource = UniqueVisitor.class.getResource("/UserBehavior.csv");
      DataStream<String> inputStream = env.readTextFile(resource.getPath());
  
      // 3. 转换成POJO,分配时间戳和watermark
      DataStream<UserBehavior> dataStream = inputStream.map(line -> {
        String[] fields = line.split(",");
        return new UserBehavior(new Long(fields[0]), new Long(fields[1]), new Integer(fields[2]), fields[3], new Long(fields[4]));
      }).assignTimestampsAndWatermarks(new AssignerWithPeriodicWatermarksAdapter.Strategy<>(
        new BoundedOutOfOrdernessTimestampExtractor<UserBehavior>(Time.of(200, TimeUnit.MILLISECONDS)) {
          @Override
          public long extractTimestamp(UserBehavior element) {
            return element.getTimestamp() * 1000L;
          }
        }
      ));
  
      // 开窗统计uv值
      SingleOutputStreamOperator<PageViewCount> uvStream = dataStream
        .filter(data -> "pv".equals(data.getBehavior()))
        .timeWindowAll(Time.hours(1))
        .trigger(new MyTrigger())
        .process(new UvCountResultWithBloomFliter());
  
  
      uvStream.print();
  
      env.execute("uv count with bloom filter job");
    }
  
    // 自定义触发器
    public static class MyTrigger extends Trigger<UserBehavior, TimeWindow> {
      @Override
      public TriggerResult onElement(UserBehavior element, long timestamp, TimeWindow window, TriggerContext ctx) throws Exception {
        // 每一条数据来到，直接触发窗口计算，并且直接清空窗口
        return TriggerResult.FIRE_AND_PURGE;
      }
  
      @Override
      public TriggerResult onProcessingTime(long time, TimeWindow window, TriggerContext ctx) throws Exception {
        return TriggerResult.CONTINUE;
      }
  
      @Override
      public TriggerResult onEventTime(long time, TimeWindow window, TriggerContext ctx) throws Exception {
        return TriggerResult.CONTINUE;
      }
  
      @Override
      public void clear(TimeWindow window, TriggerContext ctx) throws Exception {
      }
    }
  
    // 自定义一个布隆过滤器
    public static class MyBloomFilter {
      // 定义位图的大小，一般需要定义为2的整次幂
      private Integer cap;
  
      public MyBloomFilter(Integer cap) {
        this.cap = cap;
      }
  
      // 实现一个hash函数
      public Long hashCode(String value, Integer seed) {
        Long result = 0L;
        for (int i = 0; i < value.length(); i++) {
          result = result * seed + value.charAt(i);
        }
        return result & (cap - 1);
      }
    }
  
    // 实现自定义的处理函数
    public static class UvCountResultWithBloomFliter extends ProcessAllWindowFunction<UserBehavior, PageViewCount, TimeWindow> {
      // 定义jedis连接和布隆过滤器
      Jedis jedis;
      MyBloomFilter myBloomFilter;
  
      @Override
      public void open(Configuration parameters) throws Exception {
        jedis = new Jedis("localhost", 6379);
        myBloomFilter = new MyBloomFilter(1 << 29);    // 要处理1亿个数据，用64MB大小的位图
      }
  
      @Override
      public void process(Context context, Iterable<UserBehavior> elements, Collector<PageViewCount> out) throws Exception {
        // 将位图和窗口count值全部存入redis，用windowEnd作为key
        Long windowEnd = context.window().getEnd();
        String bitmapKey = windowEnd.toString();
        // 把count值存成一张hash表
        String countHashName = "uv_count";
        String countKey = windowEnd.toString();
  
        // 1. 取当前的userId
        Long userId = elements.iterator().next().getUerId();
  
        // 2. 计算位图中的offset
        Long offset = myBloomFilter.hashCode(userId.toString(), 61);
  
        // 3. 用redis的getbit命令，判断对应位置的值
        Boolean isExist = jedis.getbit(bitmapKey, offset);
  
        if (!isExist) {
          // 如果不存在，对应位图位置置1
          jedis.setbit(bitmapKey, offset, true);
  
          // 更新redis中保存的count值
          Long uvCount = 0L;    // 初始count值
          String uvCountString = jedis.hget(countHashName, countKey);
          if (uvCountString != null && !"".equals(uvCountString)) {
            uvCount = Long.valueOf(uvCountString);
          }
          jedis.hset(countHashName, countKey, String.valueOf(uvCount + 1));
  
          out.collect(new PageViewCount("uv", windowEnd, uvCount + 1));
        }
      }
  
      @Override
      public void close() throws Exception {
        jedis.close();
      }
    }
  }
  
  ```

+ 输出

  ```shell
  ....
  PageViewCount{url='uv', windowEnd=1511661600000, count=7469}
  PageViewCount{url='uv', windowEnd=1511661600000, count=7470}
  PageViewCount{url='uv', windowEnd=1511661600000, count=7471}
  PageViewCount{url='uv', windowEnd=1511661600000, count=7472}
  PageViewCount{url='uv', windowEnd=1511661600000, count=7473}
  PageViewCount{url='uv', windowEnd=1511661600000, count=7474}
  ...
  ```

### 14.3.4 市场营销分析——APP市场推广统计

+ 基本需求
  + 从埋点日志中，统计APP市场推广的数据指标
  + 按照不同的推广渠道，分别统计数据
+ 解决思路
  + 通过过滤日志中的用户行为，按照不同的渠道进行统计
  + 可以用process function处理，得到自定义的输出数据信息

#### POJO

+ MarketingUserBehavior

  ```java
  private Long userId;
  private String behavior;
  private String channel;
  private Long timestamp;
  ```

+ ChannelPromotionCount

  ```java
  private String channel;
  private String behavior;
  private String windowEnd;
  private Long count;
  ```

#### 代码1-自定义测试数据源

+ java代码

  ```java
  import beans.MarketingUserBehavior;
  import org.apache.flink.streaming.api.datastream.DataStream;
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.streaming.api.functions.source.SourceFunction;
  
  import java.util.Arrays;
  import java.util.List;
  import java.util.Random;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/5 5:32 AM
   */
  public class AppMarketingByChannel {
    public static void main(String[] args) throws Exception {
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      env.setParallelism(1);
  
      // 1. 从自定义数据源中读取数据
      DataStream<MarketingUserBehavior> dataStream = env.addSource(new SimulatedMarketingUserBehaviorSource());
  
    }
  
    // 实现自定义的模拟市场用户行为数据源
    public static class SimulatedMarketingUserBehaviorSource implements SourceFunction<MarketingUserBehavior> {
      // 控制是否正常运行的标识位
      Boolean running = true;
  
      // 定义用户行为和渠道的范围
      List<String> behaviorList = Arrays.asList("CLICK", "DOWNLOAD", "INSTALL", "UNINSTALL");
      List<String> channelList = Arrays.asList("app store", "wechat", "weibo");
  
      Random random = new Random();
  
      @Override
      public void run(SourceContext<MarketingUserBehavior> ctx) throws Exception {
        while (running) {
          // 随机生成所有字段
          Long id = random.nextLong();
          String behavior = behaviorList.get(random.nextInt(behaviorList.size()));
          String channel = channelList.get(random.nextInt(channelList.size()));
          Long timestamp = System.currentTimeMillis();
  
          // 发出数据
          ctx.collect(new MarketingUserBehavior(id, behavior, channel, timestamp));
  
          Thread.sleep(100L);
        }
      }
  
      @Override
      public void cancel() {
        running = false;
      }
    }
  }
  ```


#### 代码2-具体实现

+ java代码

  ```java
  import beans.ChannelPromotionCount;
  import beans.MarketingUserBehavior;
  import org.apache.flink.api.common.functions.AggregateFunction;
  import org.apache.flink.api.java.functions.KeySelector;
  import org.apache.flink.api.java.tuple.Tuple2;
  import org.apache.flink.streaming.api.datastream.DataStream;
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.streaming.api.functions.source.SourceFunction;
  import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor;
  import org.apache.flink.streaming.api.functions.windowing.ProcessWindowFunction;
  import org.apache.flink.streaming.api.windowing.assigners.SlidingEventTimeWindows;
  import org.apache.flink.streaming.api.windowing.assigners.TumblingEventTimeWindows;
  import org.apache.flink.streaming.api.windowing.assigners.TumblingProcessingTimeWindows;
  import org.apache.flink.streaming.api.windowing.time.Time;
  import org.apache.flink.streaming.api.windowing.windows.TimeWindow;
  import org.apache.flink.streaming.runtime.operators.util.AssignerWithPeriodicWatermarksAdapter;
  import org.apache.flink.util.Collector;
  
  import java.sql.Timestamp;
  import java.util.Arrays;
  import java.util.List;
  import java.util.Random;
  import java.util.concurrent.TimeUnit;
  
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/5 5:32 AM
   */
  public class AppMarketingByChannel {
    public static void main(String[] args) throws Exception {
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      env.setParallelism(1);
  
      // 1. 从自定义数据源中读取数据
      DataStream<MarketingUserBehavior> dataStream = env.addSource(new SimulatedMarketingUserBehaviorSource())
        .assignTimestampsAndWatermarks(new AssignerWithPeriodicWatermarksAdapter.Strategy<>(
          new BoundedOutOfOrdernessTimestampExtractor<MarketingUserBehavior>(Time.of(200, TimeUnit.MILLISECONDS)) {
            @Override
            public long extractTimestamp(MarketingUserBehavior element) {
              return element.getTimestamp();
            }
          }
        ));
  
      // 2. 分渠道开窗统计
      DataStream<ChannelPromotionCount> resultStream = dataStream
        .filter(data -> !"UNINSTALL".equals(data.getBehavior()))
        .keyBy(new KeySelector<MarketingUserBehavior, Tuple2<String, String>>() {
          @Override
          public Tuple2<String, String> getKey(MarketingUserBehavior value) throws Exception {
            return new Tuple2<>(value.getChannel(), value.getBehavior());
          }
        })
        // 定义滑窗
        .window(SlidingEventTimeWindows.of(Time.hours(1), Time.seconds(5)))
        .aggregate(new MarketingCountAgg(), new MarketingCountResult());
  
      resultStream.print();
  
      env.execute("app marketing by channel job");
  
    }
  
    // 实现自定义的模拟市场用户行为数据源
    public static class SimulatedMarketingUserBehaviorSource implements SourceFunction<MarketingUserBehavior> {
      // 控制是否正常运行的标识位
      Boolean running = true;
  
      // 定义用户行为和渠道的范围
      List<String> behaviorList = Arrays.asList("CLICK", "DOWNLOAD", "INSTALL", "UNINSTALL");
      List<String> channelList = Arrays.asList("app store", "wechat", "weibo");
  
      Random random = new Random();
  
      @Override
      public void run(SourceContext<MarketingUserBehavior> ctx) throws Exception {
        while (running) {
          // 随机生成所有字段
          Long id = random.nextLong();
          String behavior = behaviorList.get(random.nextInt(behaviorList.size()));
          String channel = channelList.get(random.nextInt(channelList.size()));
          Long timestamp = System.currentTimeMillis();
  
          // 发出数据
          ctx.collect(new MarketingUserBehavior(id, behavior, channel, timestamp));
  
          Thread.sleep(100L);
        }
      }
  
      @Override
      public void cancel() {
        running = false;
      }
    }
  
    // 实现自定义的增量聚合函数
    public static class MarketingCountAgg implements AggregateFunction<MarketingUserBehavior, Long, Long> {
  
      @Override
      public Long createAccumulator() {
        return 0L;
      }
  
      @Override
      public Long add(MarketingUserBehavior value, Long accumulator) {
        return accumulator + 1;
      }
  
      @Override
      public Long getResult(Long accumulator) {
        return accumulator;
      }
  
      @Override
      public Long merge(Long a, Long b) {
        return a + b;
      }
    }
  
    // 实现自定义的全窗口函数
    public static class MarketingCountResult extends ProcessWindowFunction<Long, ChannelPromotionCount, Tuple2<String, String>, TimeWindow> {
  
      @Override
      public void process(Tuple2<String, String> stringStringTuple2, Context context, Iterable<Long> elements, Collector<ChannelPromotionCount> out) throws Exception {
        String channel = stringStringTuple2.f0;
        String behavior = stringStringTuple2.f1;
        String windowEnd = new Timestamp(context.window().getEnd()).toString();
        Long count = elements.iterator().next();
        out.collect(new ChannelPromotionCount(channel, behavior, windowEnd, count));
      }
    }
  }
  
  ```

+ 输出

  ```shell
  beans.ChannelPromotionCount{channel='app store', behavior='CLICK', windowEnd='2021-02-05 17:54:40.0', count=4}
  beans.ChannelPromotionCount{channel='weibo', behavior='DOWNLOAD', windowEnd='2021-02-05 17:54:40.0', count=1}
  beans.ChannelPromotionCount{channel='weibo', behavior='INSTALL', windowEnd='2021-02-05 17:54:40.0', count=1}
  beans.ChannelPromotionCount{channel='wechat', behavior='DOWNLOAD', windowEnd='2021-02-05 17:54:40.0', count=1}
  beans.ChannelPromotionCount{channel='wechat', behavior='INSTALL', windowEnd='2021-02-05 17:54:40.0', count=1}
  beans.ChannelPromotionCount{channel='weibo', behavior='INSTALL', windowEnd='2021-02-05 17:54:45.0', count=1}
  beans.ChannelPromotionCount{channel='app store', behavior='DOWNLOAD', windowEnd='2021-02-05 17:54:45.0', count=10}
  beans.ChannelPromotionCount{channel='weibo', behavior='CLICK', windowEnd='2021-02-05 17:54:45.0', count=2}
  beans.ChannelPromotionCount{channel='app store', behavior='CLICK', windowEnd='2021-02-05 17:54:45.0', count=9}
  .....
  ```

#### 代码3-不分渠道代码实现

+ java代码

  ```java
  import beans.ChannelPromotionCount;
  import beans.MarketingUserBehavior;
  import org.apache.flink.api.common.functions.AggregateFunction;
  import org.apache.flink.api.common.functions.MapFunction;
  import org.apache.flink.api.java.tuple.Tuple2;
  import org.apache.flink.streaming.api.datastream.DataStream;
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.streaming.api.functions.source.SourceFunction;
  import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor;
  import org.apache.flink.streaming.api.functions.windowing.WindowFunction;
  import org.apache.flink.streaming.api.windowing.assigners.SlidingEventTimeWindows;
  import org.apache.flink.streaming.api.windowing.time.Time;
  import org.apache.flink.streaming.api.windowing.windows.TimeWindow;
  import org.apache.flink.streaming.runtime.operators.util.AssignerWithPeriodicWatermarksAdapter;
  import org.apache.flink.util.Collector;
  
  import java.sql.Timestamp;
  import java.util.Arrays;
  import java.util.List;
  import java.util.Random;
  import java.util.concurrent.TimeUnit;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/5 6:19 PM
   */
  public class AppMarketingStatistics {
    public static void main(String[] args) throws Exception {
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      env.setParallelism(1);
  
      // 1. 从自定义数据源中读取数据
      DataStream<MarketingUserBehavior> dataStream = env.addSource(new AppMarketingByChannel.SimulatedMarketingUserBehaviorSource())
        .assignTimestampsAndWatermarks(new AssignerWithPeriodicWatermarksAdapter.Strategy<>(
          new BoundedOutOfOrdernessTimestampExtractor<MarketingUserBehavior>(Time.of(200, TimeUnit.MILLISECONDS)) {
            @Override
            public long extractTimestamp(MarketingUserBehavior element) {
              return element.getTimestamp();
            }
          }
        ));
  
      // 2. 开窗统计总量
      DataStream<ChannelPromotionCount> resultStream = dataStream
        .filter(data -> !"UNINSTALL".equals(data.getBehavior()))
        .map(new MapFunction<MarketingUserBehavior, Tuple2<String, Long>>() {
          @Override
          public Tuple2<String, Long> map(MarketingUserBehavior value) throws Exception {
            return new Tuple2<>("total", 1L);
          }
        })
        .keyBy(tuple2 -> tuple2.f0)
        // 定义滑窗
        .window(SlidingEventTimeWindows.of(Time.hours(1), Time.seconds(5)))
        .aggregate(new MarketingStatisticsAgg(), new MarketingStatisticsResult());
  
      resultStream.print();
  
      env.execute("app marketing by channel job");
  
    }
  
    // 实现自定义的模拟市场用户行为数据源
    public static class SimulatedMarketingUserBehaviorSource implements SourceFunction<MarketingUserBehavior> {
      // 控制是否正常运行的标识位
      Boolean running = true;
  
      // 定义用户行为和渠道的范围
      List<String> behaviorList = Arrays.asList("CLICK", "DOWNLOAD", "INSTALL", "UNINSTALL");
      List<String> channelList = Arrays.asList("app store", "wechat", "weibo");
  
      Random random = new Random();
  
      @Override
      public void run(SourceContext<MarketingUserBehavior> ctx) throws Exception {
        while (running) {
          // 随机生成所有字段
          Long id = random.nextLong();
          String behavior = behaviorList.get(random.nextInt(behaviorList.size()));
          String channel = channelList.get(random.nextInt(channelList.size()));
          Long timestamp = System.currentTimeMillis();
  
          // 发出数据
          ctx.collect(new MarketingUserBehavior(id, behavior, channel, timestamp));
  
          Thread.sleep(100L);
        }
      }
  
      @Override
      public void cancel() {
        running = false;
      }
    }
  
    // 实现自定义的增量聚合函数
    public static class MarketingStatisticsAgg implements AggregateFunction<Tuple2<String, Long>, Long, Long> {
  
      @Override
      public Long createAccumulator() {
        return 0L;
      }
  
      @Override
      public Long add(Tuple2<String, Long> value, Long accumulator) {
        return accumulator + 1;
      }
  
      @Override
      public Long getResult(Long accumulator) {
        return accumulator;
      }
  
      @Override
      public Long merge(Long a, Long b) {
        return a + b;
      }
    }
  
    // 实现自定义的全窗口函数
    public static class MarketingStatisticsResult implements WindowFunction<Long, ChannelPromotionCount, String, TimeWindow> {
  
      @Override
      public void apply(String s, TimeWindow window, Iterable<Long> input, Collector<ChannelPromotionCount> out) throws Exception {
        String windowEnd = new Timestamp(window.getEnd()).toString();
        Long count = input.iterator().next();
        out.collect(new ChannelPromotionCount("total", "total", windowEnd, count));
      }
    }
  }
  ```

+ 输出

  ```java
  beans.ChannelPromotionCount{channel='total', behavior='total', windowEnd='2021-02-05 18:34:15.0', count=40}
  beans.ChannelPromotionCount{channel='total', behavior='total', windowEnd='2021-02-05 18:34:20.0', count=75}
  beans.ChannelPromotionCount{channel='total', behavior='total', windowEnd='2021-02-05 18:34:25.0', count=109}
  ....
  ```

### 14.3.5 市场营销分析——页面广告统计

+ 基本需求
  + 从埋点日志中，统计每小时页面广告的点击量，5秒刷新一次，并按照不同省份进行划分
  + 对于"刷单"式的频繁点击行为进行过滤，并将该用户加入黑名单
+ 解决思路
  + 根据省份进行分组，创建长度为1小时、滑动距离为5秒的时间窗口进行统计
  + 可以用`process function`进行黑名单过滤，检测用户对同一广告的点击量，如果超过上限则将用户信息以侧输出流输出到黑名单中

#### POJO

+ AdClickEvent

  ```java
  private Long userId;
  private Long adId;
  private String province;
  private String city;
  private Long timestamp;
  ```

+ BlackListUserWarning

  ```java
  private Long userId;
  private Long adId;
  private String warningMsg;
  ```

#### 代码1-基本实现

+ java代码

  ```java
  import beans.AdClickEvent;
  import beans.AdCountViewByProvince;
  import org.apache.flink.api.common.functions.AggregateFunction;
  import org.apache.flink.streaming.api.datastream.DataStream;
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor;
  import org.apache.flink.streaming.api.functions.windowing.WindowFunction;
  import org.apache.flink.streaming.api.windowing.assigners.SlidingEventTimeWindows;
  import org.apache.flink.streaming.api.windowing.time.Time;
  import org.apache.flink.streaming.api.windowing.windows.TimeWindow;
  import org.apache.flink.streaming.runtime.operators.util.AssignerWithPeriodicWatermarksAdapter;
  import org.apache.flink.util.Collector;
  
  
  import java.net.URL;
  import java.sql.Timestamp;
  import java.util.concurrent.TimeUnit;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/5 6:41 PM
   */
  public class AdStatisticsByProvince {
  
    public static void main(String[] args) throws Exception {
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      env.setParallelism(1);
  
      // 1. 从文件中读取数据
      URL resource = AdStatisticsByProvince.class.getResource("/AdClickLog.csv");
      DataStream<AdClickEvent> adClickEventDataStream = env.readTextFile(resource.getPath())
        .map(line -> {
          String[] fields = line.split(",");
          return new AdClickEvent(new Long(fields[0]), new Long(fields[1]), fields[2], fields[3], new Long(fields[4]));
        })
        .assignTimestampsAndWatermarks(new AssignerWithPeriodicWatermarksAdapter.Strategy<>(
          new BoundedOutOfOrdernessTimestampExtractor<AdClickEvent>(Time.of(200, TimeUnit.MILLISECONDS)) {
            @Override
            public long extractTimestamp(AdClickEvent element) {
              return element.getTimestamp() * 1000L;
            }
          }
        ));
  
      // 2. 基于省份分组，开窗聚合
      DataStream<AdCountViewByProvince> adCountStream = adClickEventDataStream
        .keyBy(AdClickEvent::getProvince)
        // 定义滑窗,5min输出一次
        .window(SlidingEventTimeWindows.of(Time.hours(1), Time.minutes(5)))
        .aggregate(new AdCountAgg(), new AdCountResult());
  
  
      adCountStream.print();
  
      env.execute("ad count by province job");
    }
  
    public static class AdCountAgg implements AggregateFunction<AdClickEvent, Long, Long> {
  
      @Override
      public Long createAccumulator() {
        return 0L;
      }
  
      @Override
      public Long add(AdClickEvent value, Long accumulator) {
        return accumulator + 1;
      }
  
      @Override
      public Long getResult(Long accumulator) {
        return accumulator;
      }
  
      @Override
      public Long merge(Long a, Long b) {
        return a + b;
      }
    }
  
    public static class AdCountResult implements WindowFunction<Long, AdCountViewByProvince, String, TimeWindow> {
  
      @Override
      public void apply(String province, TimeWindow window, Iterable<Long> input, Collector<AdCountViewByProvince> out) throws Exception {
        String windowEnd = new Timestamp(window.getEnd()).toString();
        Long count = input.iterator().next();
        out.collect(new AdCountViewByProvince(province, windowEnd, count));
      }
    }
  }
  
  ```

+ 输出

  ```shell
  beans.AdCountViewByProvince{province='beijing', windowEnd='2017-11-26 09:05:00.0', count=2}
  beans.AdCountViewByProvince{province='shanghai', windowEnd='2017-11-26 09:05:00.0', count=1}
  beans.AdCountViewByProvince{province='guangdong', windowEnd='2017-11-26 09:05:00.0', count=2}
  beans.AdCountViewByProvince{province='guangdong', windowEnd='2017-11-26 09:10:00.0', count=4}
  beans.AdCountViewByProvince{province='shanghai', windowEnd='2017-11-26 09:10:00.0', count=2}
  beans.AdCountViewByProvince{province='beijing', windowEnd='2017-11-26 09:10:00.0', count=2}
  beans.AdCountViewByProvince{province='shanghai', windowEnd='2017-11-26 09:15:00.0', count=2}
  beans.AdCountViewByProvince{province='beijing', windowEnd='2017-11-26 09:15:00.0', count=2}
  beans.AdCountViewByProvince{province='guangdong', windowEnd='2017-11-26 09:15:00.0', count=5}
  beans.AdCountViewByProvince{province='shanghai', windowEnd='2017-11-26 09:20:00.0', count=2}
  ....
  ```

#### 代码2-点击异常行为黑名单过滤

+ java代码

  ```java
  import beans.AdClickEvent;
  import beans.AdCountViewByProvince;
  import beans.BlackListUserWarning;
  import org.apache.commons.lang3.time.DateUtils;
  import org.apache.flink.api.common.functions.AggregateFunction;
  import org.apache.flink.api.common.state.ValueState;
  import org.apache.flink.api.common.state.ValueStateDescriptor;
  import org.apache.flink.api.java.functions.KeySelector;
  import org.apache.flink.api.java.tuple.Tuple2;
  import org.apache.flink.configuration.Configuration;
  import org.apache.flink.streaming.api.datastream.DataStream;
  import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
  import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor;
  import org.apache.flink.streaming.api.functions.windowing.WindowFunction;
  import org.apache.flink.streaming.api.windowing.assigners.SlidingEventTimeWindows;
  import org.apache.flink.streaming.api.windowing.time.Time;
  import org.apache.flink.streaming.api.windowing.windows.TimeWindow;
  import org.apache.flink.streaming.runtime.operators.util.AssignerWithPeriodicWatermarksAdapter;
  import org.apache.flink.util.Collector;
  import org.apache.flink.util.OutputTag;
  
  import java.net.URL;
  import java.sql.Timestamp;
  import java.util.Date;
  import java.util.concurrent.TimeUnit;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/5 6:41 PM
   */
  public class AdStatisticsByProvince {
  
    public static void main(String[] args) throws Exception {
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      env.setParallelism(1);
  
      // 1. 从文件中读取数据
      URL resource = AdStatisticsByProvince.class.getResource("/AdClickLog.csv");
      DataStream<AdClickEvent> adClickEventDataStream = env.readTextFile(resource.getPath())
        .map(line -> {
          String[] fields = line.split(",");
          return new AdClickEvent(new Long(fields[0]), new Long(fields[1]), fields[2], fields[3], new Long(fields[4]));
        })
        .assignTimestampsAndWatermarks(new AssignerWithPeriodicWatermarksAdapter.Strategy<>(
          new BoundedOutOfOrdernessTimestampExtractor<AdClickEvent>(Time.of(200, TimeUnit.MILLISECONDS)) {
            @Override
            public long extractTimestamp(AdClickEvent element) {
              return element.getTimestamp() * 1000L;
            }
          }
        ));
  
      // 2. 对同一个用户点击同一个广告的行为进行检测报警
      SingleOutputStreamOperator<AdClickEvent> filterAdClickStream = adClickEventDataStream
        .keyBy(new KeySelector<AdClickEvent, Tuple2<Long, Long>>() {
          @Override
          public Tuple2<Long, Long> getKey(AdClickEvent value) throws Exception {
            return new Tuple2<>(value.getUserId(), value.getAdId());
          }
        })
        .process(new FilterBlackListUser(100));
  
      // 3. 基于省份分组，开窗聚合
      DataStream<AdCountViewByProvince> adCountResultStream = filterAdClickStream
        .keyBy(AdClickEvent::getProvince)
        // 定义滑窗,5min输出一次
        .window(SlidingEventTimeWindows.of(Time.hours(1), Time.minutes(5)))
        .aggregate(new AdCountAgg(), new AdCountResult());
  
  
      adCountResultStream.print();
      filterAdClickStream
        .getSideOutput(new OutputTag<BlackListUserWarning>("blacklist"){})
        .print("blacklist-user");
  
      env.execute("ad count by province job");
    }
  
    public static class AdCountAgg implements AggregateFunction<AdClickEvent, Long, Long> {
  
      @Override
      public Long createAccumulator() {
        return 0L;
      }
  
      @Override
      public Long add(AdClickEvent value, Long accumulator) {
        return accumulator + 1;
      }
  
      @Override
      public Long getResult(Long accumulator) {
        return accumulator;
      }
  
      @Override
      public Long merge(Long a, Long b) {
        return a + b;
      }
    }
  
    public static class AdCountResult implements WindowFunction<Long, AdCountViewByProvince, String, TimeWindow> {
  
      @Override
      public void apply(String province, TimeWindow window, Iterable<Long> input, Collector<AdCountViewByProvince> out) throws Exception {
        String windowEnd = new Timestamp(window.getEnd()).toString();
        Long count = input.iterator().next();
        out.collect(new AdCountViewByProvince(province, windowEnd, count));
      }
    }
  
    // 实现自定义处理函数
    public static class FilterBlackListUser extends KeyedProcessFunction<Tuple2<Long, Long>, AdClickEvent, AdClickEvent> {
  
      // 定义属性：点击次数上线
      private Integer countUpperBound;
  
      public FilterBlackListUser(Integer countUpperBound) {
        this.countUpperBound = countUpperBound;
      }
  
      // 定义状态，保存当前用户对某一广告的点击次数
      ValueState<Long> countState;
      // 定义一个标志状态，保存当前用户是否已经被发送到了黑名单里
      ValueState<Boolean> isSentState;
  
      @Override
      public void open(Configuration parameters) throws Exception {
        countState = getRuntimeContext().getState(new ValueStateDescriptor<Long>("ad-count", Long.class));
        isSentState = getRuntimeContext().getState(new ValueStateDescriptor<Boolean>("is-sent", Boolean.class));
      }
  
      @Override
      public void onTimer(long timestamp, OnTimerContext ctx, Collector<AdClickEvent> out) throws Exception {
        // 清空所有状态
        countState.clear();
        isSentState.clear();
      }
  
      @Override
      public void processElement(AdClickEvent value, Context ctx, Collector<AdClickEvent> out) throws Exception {
        // 判断当前用户对同一广告的点击次数，如果不够上限，该count加1正常输出；
        // 如果到达上限，直接过滤掉，并侧输出流输出黑名单报警
  
        // 首先获取当前count值
        Long curCount = countState.value();
  
        Boolean isSent = isSentState.value();
  
        if(null == curCount){
          curCount = 0L;
        }
  
        if(null == isSent){
          isSent = false;
        }
  
        // 1. 判断是否是第一个数据，如果是的话，注册一个第二天0点的定时器
        if (curCount == 0) {
          long ts = ctx.timerService().currentProcessingTime();
          long fixedTime = DateUtils.addDays(new Date(ts), 1).getTime();
          ctx.timerService().registerProcessingTimeTimer(fixedTime);
        }
  
        // 2. 判断是否报警
        if (curCount >= countUpperBound) {
          // 判断是否输出到黑名单过，如果没有的话就输出到侧输出流
          if (!isSent) {
            isSentState.update(true);
            ctx.output(new OutputTag<BlackListUserWarning>("blacklist"){},
                       new BlackListUserWarning(value.getUserId(), value.getAdId(), "click over " + countUpperBound + "times."));
          }
          // 不再进行下面操作
          return;
        }
  
        // 如果没有返回，点击次数加1，更新状态，正常输出当前数据到主流
        countState.update(curCount + 1);
        out.collect(value);
      }
  
    }
  }
  ```

+ 输出

  ```java
  blacklist-user> beans.BlackListUserWarning{userId=937166, adId=1715, warningMsg='click over 100times.'}
  beans.AdCountViewByProvince{province='beijing', windowEnd='2017-11-26 09:05:00.0', count=2}
  beans.AdCountViewByProvince{province='shanghai', windowEnd='2017-11-26 09:05:00.0', count=1}
  beans.AdCountViewByProvince{province='guangdong', windowEnd='2017-11-26 09:05:00.0', count=2}
  beans.AdCountViewByProvince{province='guangdong', windowEnd='2017-11-26 09:10:00.0', count=4}
  beans.AdCountViewByProvince{province='shanghai', windowEnd='2017-11-26 09:10:00.0', count=2}
  beans.AdCountViewByProvince{province='beijing', windowEnd='2017-11-26 09:10:00.0', count=2}
  beans.AdCountViewByProvince{province='shanghai', windowEnd='2017-11-26 09:15:00.0', count=2}
  beans.AdCountViewByProvince{province='beijing', windowEnd='2017-11-26 09:15:00.0', count=2}
  beans.AdCountViewByProvince{province='guangdong', windowEnd='2017-11-26 09:15:00.0', count=5}
  beans.AdCountViewByProvince{province='shanghai', windowEnd='2017-11-26 09:20:00.0', count=2}
  beans.AdCountViewByProvince{province='guangdong', windowEnd='2017-11-26 09:20:00.0', count=5}
  ....
  ```

### 14.3.6 恶意登录监控

+ 基本需求
  + 用户在短时间内频繁登录失败，有程序恶意攻击的可能
  + 同一用户（可以是不同IP）在2秒内连续两次登录失败，需要报警
+ 解决思路
  + 将用户的登录失败行为存入ListState，设定定时器2秒后出发，查看ListState中有几次失败登录
  + 更加精确的检测，可以使用CEP库实现事件流的模式匹配

#### POJO

+ LoginEvent

  ```java
  private Long userId;
  private String ip;
  private String loginState;
  private Long timestamp;
  ```

+ LoginFailWarning

  ```java
  private Long userId;
  private Long firstFailTime;
  private Long lastFailTime;
  private String warningMsg;
  ```

#### 代码1-简单代码实现

+ java代码

  ```java
  import beans.LoginEvent;
  import beans.LoginFailWarning;
  import org.apache.commons.compress.utils.Lists;
  import org.apache.flink.api.common.state.ListState;
  import org.apache.flink.api.common.state.ListStateDescriptor;
  import org.apache.flink.api.common.state.ValueState;
  import org.apache.flink.api.common.state.ValueStateDescriptor;
  import org.apache.flink.configuration.Configuration;
  import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
  import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor;
  import org.apache.flink.streaming.api.windowing.time.Time;
  import org.apache.flink.streaming.runtime.operators.util.AssignerWithPeriodicWatermarksAdapter;
  import org.apache.flink.util.Collector;
  
  import java.net.URL;
  import java.util.ArrayList;
  import java.util.concurrent.TimeUnit;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/6 1:49 AM
   */
  public class LoginFail {
    public static void main(String[] args) throws Exception {
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      env.setParallelism(1);
  
      // 1. 从文件中读取数据
      URL resource = LoginFail.class.getResource("/LoginLog.csv");
      SingleOutputStreamOperator<LoginEvent> loginEventStream = env.readTextFile(resource.getPath())
        .map(line -> {
          String[] fields = line.split(",");
          return new LoginEvent(new Long(fields[0]), fields[1], fields[2], new Long(fields[3]));
        }).assignTimestampsAndWatermarks(new AssignerWithPeriodicWatermarksAdapter.Strategy<>(
        new BoundedOutOfOrdernessTimestampExtractor<LoginEvent>(Time.of(3, TimeUnit.SECONDS)) {
          @Override
          public long extractTimestamp(LoginEvent element) {
            return element.getTimestamp() * 1000L;
          }
        }
      ));
      // 自定义处理函数检测连续登录失败事件
      SingleOutputStreamOperator<LoginFailWarning> warningStream = loginEventStream
        .keyBy(LoginEvent::getUserId)
        .process(new LoginFailDetectWarning(1));
  
      warningStream.print();
  
      env.execute("login fail detect job");
    }
  
    // 实现自定义KeyedProcessFunction
    public static class LoginFailDetectWarning extends KeyedProcessFunction<Long, LoginEvent, LoginFailWarning> {
      // 定义属性，最大连续登录失败次数
      private Integer maxFailTimes;
  
      // 定义状态：保存2秒内所有的登录失败事件
      ListState<LoginEvent> loginFailEventListState;
      // 定义状态：保存注册的定时器时间戳
      ValueState<Long> timerTsState;
  
      public LoginFailDetectWarning(Integer maxFailTimes) {
        this.maxFailTimes = maxFailTimes;
      }
  
      @Override
      public void open(Configuration parameters) throws Exception {
        loginFailEventListState = getRuntimeContext().getListState(new ListStateDescriptor<LoginEvent>("login-fail-list", LoginEvent.class));
        timerTsState = getRuntimeContext().getState(new ValueStateDescriptor<Long>("timer-ts", Long.class));
      }
  
      @Override
      public void onTimer(long timestamp, OnTimerContext ctx, Collector<LoginFailWarning> out) throws Exception {
        // 定时器触发，说明2秒内没有登录成功，判读ListState中失败的个数
        ArrayList<LoginEvent> loginFailEvents = Lists.newArrayList(loginFailEventListState.get().iterator());
        int failTimes = loginFailEvents.size();
  
        if (failTimes >= maxFailTimes) {
          // 如果超出设定的最大失败次数，输出报警
          out.collect(new LoginFailWarning(ctx.getCurrentKey(),
                                           loginFailEvents.get(0).getTimestamp(),
                                           loginFailEvents.get(failTimes - 1).getTimestamp(),
                                           "login fail in 2s for " + failTimes + " times"));
        }
  
        // 清空状态
        loginFailEventListState.clear();
        timerTsState.clear();
      }
  
      @Override
      public void processElement(LoginEvent value, Context ctx, Collector<LoginFailWarning> out) throws Exception {
        // 判断当前登录事件类型
        if ("fail".equals(value.getLoginState())) {
          // 1. 如果是失败事件，添加到表状态中
          loginFailEventListState.add(value);
          // 如果没有定时器，注册一个2秒之后的定时器
          if (null == timerTsState.value()) {
            long ts = (value.getTimestamp() + 2) * 1000L;
            ctx.timerService().registerEventTimeTimer(ts);
            timerTsState.update(ts);
          } else {
            // 2. 如果是登录成功，删除定时器，清空状态，重新开始
            if (null != timerTsState.value()) {
              ctx.timerService().deleteEventTimeTimer(timerTsState.value());
            }
            loginFailEventListState.clear();
            timerTsState.clear();
          }
        }
      }
    }
  }
  ```

+ 输出

  ```shell
  LoginFailWarning{userId=23064, firstFailTime=1558430826, lastFailTime=1558430826, warningMsg='login fail in 2s for 1 times'}
  LoginFailWarning{userId=5692, firstFailTime=1558430833, lastFailTime=1558430833, warningMsg='login fail in 2s for 1 times'}
  LoginFailWarning{userId=1035, firstFailTime=1558430844, lastFailTime=1558430844, warningMsg='login fail in 2s for 1 times'}
  LoginFailWarning{userId=76456, firstFailTime=1558430859, lastFailTime=1558430859, warningMsg='login fail in 2s for 1 times'}
  LoginFailWarning{userId=23565, firstFailTime=1558430862, lastFailTime=1558430862, warningMsg='login fail in 2s for 1 times'}
  ```

#### 代码2-代码实效性改进

+ java代码

  ```java
  import beans.LoginEvent;
  import beans.LoginFailWarning;
  import org.apache.commons.compress.utils.Lists;
  import org.apache.flink.api.common.state.ListState;
  import org.apache.flink.api.common.state.ListStateDescriptor;
  import org.apache.flink.api.common.state.ValueState;
  import org.apache.flink.api.common.state.ValueStateDescriptor;
  import org.apache.flink.configuration.Configuration;
  import org.apache.flink.streaming.api.datastream.DataStream;
  import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
  import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor;
  import org.apache.flink.streaming.api.windowing.time.Time;
  import org.apache.flink.streaming.runtime.operators.util.AssignerWithPeriodicWatermarksAdapter;
  import org.apache.flink.util.Collector;
  
  import java.net.URL;
  import java.util.ArrayList;
  import java.util.Iterator;
  import java.util.concurrent.TimeUnit;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/6 1:49 AM
   */
  public class LoginFail {
    public static void main(String[] args) throws Exception{
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      env.setParallelism(1);
  
      // 1. 从文件中读取数据
      URL resource = LoginFail.class.getResource("/LoginLog.csv");
      DataStream<LoginEvent> loginEventStream = env.readTextFile(resource.getPath())
        .map(line -> {
          String[] fields = line.split(",");
          return new LoginEvent(new Long(fields[0]), fields[1], fields[2], new Long(fields[3]));
        })
        .assignTimestampsAndWatermarks(new AssignerWithPeriodicWatermarksAdapter.Strategy<>(
          new BoundedOutOfOrdernessTimestampExtractor<LoginEvent>(Time.of(200, TimeUnit.MILLISECONDS)) {
            @Override
            public long extractTimestamp(LoginEvent element) {
              return element.getTimestamp() * 1000L;
            }
          }
        ));
  
      // 自定义处理函数检测连续登录失败事件
      SingleOutputStreamOperator<LoginFailWarning> warningStream = loginEventStream
        .keyBy(LoginEvent::getUserId)
        .process(new LoginFailDetectWarning(2));
  
      warningStream.print();
  
      env.execute("login fail detect job");
    }
  
    // 实现自定义KeyedProcessFunction
    public static class LoginFailDetectWarning0 extends KeyedProcessFunction<Long, LoginEvent, LoginFailWarning>{
      // 定义属性，最大连续登录失败次数
      private Integer maxFailTimes;
  
      public LoginFailDetectWarning0(Integer maxFailTimes) {
        this.maxFailTimes = maxFailTimes;
      }
  
      // 定义状态：保存2秒内所有的登录失败事件
      ListState<LoginEvent> loginFailEventListState;
      // 定义状态：保存注册的定时器时间戳
      ValueState<Long> timerTsState;
  
      @Override
      public void open(Configuration parameters) throws Exception {
        loginFailEventListState = getRuntimeContext().getListState(new ListStateDescriptor<LoginEvent>("login-fail-list", LoginEvent.class));
        timerTsState = getRuntimeContext().getState(new ValueStateDescriptor<Long>("timer-ts", Long.class));
      }
  
      @Override
      public void processElement(LoginEvent value, Context ctx, Collector<LoginFailWarning> out) throws Exception {
        // 判断当前登录事件类型
        if( "fail".equals(value.getLoginState()) ){
          // 1. 如果是失败事件，添加到列表状态中
          loginFailEventListState.add(value);
          // 如果没有定时器，注册一个2秒之后的定时器
          if( timerTsState.value() == null ){
            Long ts = (value.getTimestamp() + 2) * 1000L;
            ctx.timerService().registerEventTimeTimer(ts);
            timerTsState.update(ts);
          }
        } else {
          // 2. 如果是登录成功，删除定时器，清空状态，重新开始
          if( timerTsState.value() != null )
            ctx.timerService().deleteEventTimeTimer(timerTsState.value());
          loginFailEventListState.clear();
          timerTsState.clear();
        }
      }
  
      @Override
      public void onTimer(long timestamp, OnTimerContext ctx, Collector<LoginFailWarning> out) throws Exception {
        // 定时器触发，说明2秒内没有登录成功来，判断ListState中失败的个数
        ArrayList<LoginEvent> loginFailEvents = Lists.newArrayList(loginFailEventListState.get().iterator());
        Integer failTimes = loginFailEvents.size();
  
        if( failTimes >= maxFailTimes ){
          // 如果超出设定的最大失败次数，输出报警
          out.collect( new LoginFailWarning(ctx.getCurrentKey(),
                                            loginFailEvents.get(0).getTimestamp(),
                                            loginFailEvents.get(failTimes - 1).getTimestamp(),
                                            "login fail in 2s for " + failTimes + " times") );
        }
  
        // 清空状态
        loginFailEventListState.clear();
        timerTsState.clear();
      }
    }
  
    // 实现自定义KeyedProcessFunction
    public static class LoginFailDetectWarning extends KeyedProcessFunction<Long, LoginEvent, LoginFailWarning> {
      // 定义属性，最大连续登录失败次数
      private Integer maxFailTimes;
  
      public LoginFailDetectWarning(Integer maxFailTimes) {
        this.maxFailTimes = maxFailTimes;
      }
  
      // 定义状态：保存2秒内所有的登录失败事件
      ListState<LoginEvent> loginFailEventListState;
  
      @Override
      public void open(Configuration parameters) throws Exception {
        loginFailEventListState = getRuntimeContext().getListState(new ListStateDescriptor<LoginEvent>("login-fail-list", LoginEvent.class));
      }
  
      // 以登录事件作为判断报警的触发条件，不再注册定时器
      @Override
      public void processElement(LoginEvent value, Context ctx, Collector<LoginFailWarning> out) throws Exception {
        // 判断当前事件登录状态
        if( "fail".equals(value.getLoginState()) ){
          // 1. 如果是登录失败，获取状态中之前的登录失败事件，继续判断是否已有失败事件
          Iterator<LoginEvent> iterator = loginFailEventListState.get().iterator();
          if( iterator.hasNext() ){
            // 1.1 如果已经有登录失败事件，继续判断时间戳是否在2秒之内
            // 获取已有的登录失败事件
            LoginEvent firstFailEvent = iterator.next();
            if( value.getTimestamp() - firstFailEvent.getTimestamp() <= 2 ){
              // 1.1.1 如果在2秒之内，输出报警
              out.collect( new LoginFailWarning(value.getUserId(), firstFailEvent.getTimestamp(), value.getTimestamp(), "login fail 2 times in 2s") );
            }
  
            // 不管报不报警，这次都已处理完毕，直接更新状态
            loginFailEventListState.clear();
            loginFailEventListState.add(value);
          } else {
            // 1.2 如果没有登录失败，直接将当前事件存入ListState
            loginFailEventListState.add(value);
          }
        } else {
          // 2. 如果是登录成功，直接清空状态
          loginFailEventListState.clear();
        }
      }
    }
  }
  ```

+ 输出

  ```shell
  LoginFailWarning{userId=1035, firstFailTime=1558430842, lastFailTime=1558430843, warningMsg='login fail 2 times in 2s'}
  LoginFailWarning{userId=1035, firstFailTime=1558430843, lastFailTime=1558430844, warningMsg='login fail 2 times in 2s'}
  ```

#### 代码3-CEP代码实现

+ pom依赖

  CEP编程

  ```xml
  <dependencies>
    <dependency>
      <groupId>org.apache.flink</groupId>
      <artifactId>flink-cep_${scala.binary.version}</artifactId>
      <version>${flink.version}</version>
    </dependency>
  </dependencies>
  ```

+ java代码

  ```java
  import beans.LoginEvent;
  import beans.LoginFailWarning;
  import org.apache.flink.cep.CEP;
  import org.apache.flink.cep.PatternSelectFunction;
  import org.apache.flink.cep.PatternStream;
  import org.apache.flink.cep.pattern.Pattern;
  import org.apache.flink.cep.pattern.conditions.SimpleCondition;
  import org.apache.flink.streaming.api.datastream.DataStream;
  import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor;
  import org.apache.flink.streaming.api.windowing.time.Time;
  import org.apache.flink.streaming.runtime.operators.util.AssignerWithPeriodicWatermarksAdapter;
  
  import java.net.URL;
  import java.util.List;
  import java.util.Map;
  import java.util.concurrent.TimeUnit;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/6 3:41 AM
   */
  public class LoginFailWithCep {
  
    public static void main(String[] args) throws Exception {
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      env.setParallelism(1);
  
      // 1. 从文件中读取数据
      URL resource = LoginFail.class.getResource("/LoginLog.csv");
      DataStream<LoginEvent> loginEventStream = env.readTextFile(resource.getPath())
        .map(line -> {
          String[] fields = line.split(",");
          return new LoginEvent(new Long(fields[0]), fields[1], fields[2], new Long(fields[3]));
        })
        .assignTimestampsAndWatermarks(new AssignerWithPeriodicWatermarksAdapter.Strategy<>(
          new BoundedOutOfOrdernessTimestampExtractor<LoginEvent>(Time.of(200, TimeUnit.MILLISECONDS)) {
            @Override
            public long extractTimestamp(LoginEvent element) {
              return element.getTimestamp() * 1000L;
            }
          }
        ));
  
      // 1. 定义一个匹配模式
      // firstFail -> secondFail, within 2s
      Pattern<LoginEvent, LoginEvent> loginFailPattern = Pattern
        .<LoginEvent>begin("firstFail").where(new SimpleCondition<LoginEvent>() {
        @Override
        public boolean filter(LoginEvent value) throws Exception {
          return "fail".equals(value.getLoginState());
        }
      })
        .next("secondFail").where(new SimpleCondition<LoginEvent>() {
        @Override
        public boolean filter(LoginEvent value) throws Exception {
          return "fail".equals(value.getLoginState());
        }
      })
        .within(Time.seconds(2));
  
      // 2. 将匹配模式应用到数据流上，得到一个pattern stream
      PatternStream<LoginEvent> patternStream = CEP.pattern(loginEventStream.keyBy(LoginEvent::getUserId), loginFailPattern);
  
      // 3. 检出符合匹配条件的复杂事件，进行转换处理，得到报警信息
      SingleOutputStreamOperator<LoginFailWarning> warningStream = patternStream.select(new LoginFailMatchDetectWarning());
  
      warningStream.print();
  
      env.execute("login fail detect with cep job");
    }
  
    // 实现自定义的PatternSelectFunction
    public static class LoginFailMatchDetectWarning implements PatternSelectFunction<LoginEvent, LoginFailWarning> {
      @Override
      public LoginFailWarning select(Map<String, List<LoginEvent>> pattern) throws Exception {
        LoginEvent firstFailEvent = pattern.get("firstFail").iterator().next();
        LoginEvent lastFailEvent = pattern.get("secondFail").get(0);
        return new LoginFailWarning(firstFailEvent.getUserId(), firstFailEvent.getTimestamp(), lastFailEvent.getTimestamp(), "login fail 2 times");
      }
    }
  }
  
  ```

+ 输出

  ```java
  LoginFailWarning{userId=1035, firstFailTime=1558430842, lastFailTime=1558430843, warningMsg='login fail 2 times'}
  LoginFailWarning{userId=1035, firstFailTime=1558430843, lastFailTime=1558430844, warningMsg='login fail 2 times'}
  ```

#### 代码4-CEP利用循环模式优化

+ java代码

  ```java
  import beans.LoginEvent;
  import beans.LoginFailWarning;
  import org.apache.flink.cep.CEP;
  import org.apache.flink.cep.PatternSelectFunction;
  import org.apache.flink.cep.PatternStream;
  import org.apache.flink.cep.pattern.Pattern;
  import org.apache.flink.cep.pattern.conditions.SimpleCondition;
  import org.apache.flink.streaming.api.datastream.DataStream;
  import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor;
  import org.apache.flink.streaming.api.windowing.time.Time;
  import org.apache.flink.streaming.runtime.operators.util.AssignerWithPeriodicWatermarksAdapter;
  
  import java.net.URL;
  import java.util.List;
  import java.util.Map;
  import java.util.concurrent.TimeUnit;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/6 3:41 AM
   */
  public class LoginFailWithCep {
  
    public static void main(String[] args) throws Exception {
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      env.setParallelism(1);
  
      // 1. 从文件中读取数据
      URL resource = LoginFail.class.getResource("/LoginLog.csv");
      DataStream<LoginEvent> loginEventStream = env.readTextFile(resource.getPath())
        .map(line -> {
          String[] fields = line.split(",");
          return new LoginEvent(new Long(fields[0]), fields[1], fields[2], new Long(fields[3]));
        })
        .assignTimestampsAndWatermarks(new AssignerWithPeriodicWatermarksAdapter.Strategy<>(
          new BoundedOutOfOrdernessTimestampExtractor<LoginEvent>(Time.of(200, TimeUnit.MILLISECONDS)) {
            @Override
            public long extractTimestamp(LoginEvent element) {
              return element.getTimestamp() * 1000L;
            }
          }
        ));
  
      // 1. 定义一个匹配模式
      // firstFail -> secondFail, within 2s
      Pattern<LoginEvent, LoginEvent> loginFailPattern = Pattern
        .<LoginEvent>begin("failEvents").where(new SimpleCondition<LoginEvent>() {
        @Override
        public boolean filter(LoginEvent value) throws Exception {
          return "fail".equals(value.getLoginState());
        }
      }).times(3).consecutive()
        .within(Time.seconds(5));
  
      // 2. 将匹配模式应用到数据流上，得到一个pattern stream
      PatternStream<LoginEvent> patternStream = CEP.pattern(loginEventStream.keyBy(LoginEvent::getUserId), loginFailPattern);
  
      // 3. 检出符合匹配条件的复杂事件，进行转换处理，得到报警信息
      SingleOutputStreamOperator<LoginFailWarning> warningStream = patternStream.select(new LoginFailMatchDetectWarning());
  
      warningStream.print();
  
      env.execute("login fail detect with cep job");
    }
  
    // 实现自定义的PatternSelectFunction
    public static class LoginFailMatchDetectWarning implements PatternSelectFunction<LoginEvent, LoginFailWarning> {
      @Override
      public LoginFailWarning select(Map<String, List<LoginEvent>> pattern) throws Exception {
        LoginEvent firstFailEvent = pattern.get("failEvents").get(0);
        LoginEvent lastFailEvent = pattern.get("failEvents").get(pattern.get("failEvents").size() - 1);
        return new LoginFailWarning(firstFailEvent.getUserId(), firstFailEvent.getTimestamp(), lastFailEvent.getTimestamp(), "login fail " + pattern.get("failEvents").size() + " times");
      }
    }
  }
  ```

+ 输出

  ```shell
  LoginFailWarning{userId=1035, firstFailTime=1558430842, lastFailTime=1558430844, warningMsg='login fail 3 times'}
  ```

### 14.3.7 订单支付实时监控

+ 基本需求
  + 用户下单之后，应设置订单失效事件，以提高用户支付的意愿，并降低系统风险
  + 用户下单后15分钟未支付，则输出监控信息
+ 解决思路
  + 利用CEP库进行事件流的模式匹配，并设定匹配的时间间隔
  + 也可以利用状态编程，用process function实现处理逻辑

#### POJO

+ OrderEvent

  ```java
  private Long orderId;
  private String eventType;
  private String txId;
  private Long timestamp;
  ```

+ OrderResult

  ```java
  private Long orderId;
  private String resultState;
  ```

+ ReceiptEvent

  ```java
  private String txId;
  private String payChannel;
  private Long timestamp;
  ```

#### 代码1-CEP代码实现

+ pom依赖

  ```java
  <dependencies>
    <dependency>
  <groupId>org.apache.flink</groupId>
    <artifactId>flink-cep_${scala.binary.version}</artifactId>
    <version>${flink.version}</version>
    </dependency>
    </dependencies>
  ```
  
+ java代码

  （实际如果处理超时订单，应该修改对应的数据库数据，好让下次用户再次操作超时订单时失效）

  ```java
  import beans.OrderEvent;
  import beans.OrderResult;
  import org.apache.flink.cep.CEP;
  import org.apache.flink.cep.PatternSelectFunction;
  import org.apache.flink.cep.PatternStream;
  import org.apache.flink.cep.PatternTimeoutFunction;
  import org.apache.flink.cep.pattern.Pattern;
  import org.apache.flink.cep.pattern.conditions.SimpleCondition;
  import org.apache.flink.streaming.api.datastream.DataStream;
  import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor;
  import org.apache.flink.streaming.api.windowing.time.Time;
  import org.apache.flink.streaming.runtime.operators.util.AssignerWithPeriodicWatermarksAdapter;
  import org.apache.flink.util.OutputTag;
  
  import java.net.URL;
  import java.util.List;
  import java.util.Map;
  import java.util.concurrent.TimeUnit;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/6 5:50 AM
   */
  public class OrderPayTimeout {
    public static void main(String[] args) throws Exception {
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      env.setParallelism(1);
  
      // 读取数据并转换成POJO类型
      URL resource = OrderPayTimeout.class.getResource("/OrderLog.csv");
      DataStream<OrderEvent> orderEventDataStream = env.readTextFile(resource.getPath())
        .map(line -> {
          String[] fields = line.split(",");
          return new OrderEvent(new Long(fields[0]), fields[1], fields[2], new Long(fields[3]));
        }).assignTimestampsAndWatermarks(new AssignerWithPeriodicWatermarksAdapter.Strategy<>(
        new BoundedOutOfOrdernessTimestampExtractor<OrderEvent>(Time.of(200, TimeUnit.MILLISECONDS)) {
          @Override
          public long extractTimestamp(OrderEvent element) {
            return element.getTimestamp() * 1000L;
          }
        }
      ));
  
      // 1. 定义一个待时间限制的模式
      Pattern<OrderEvent, OrderEvent> orderPayPattern = Pattern.<OrderEvent>begin("create").where(new SimpleCondition<OrderEvent>() {
        @Override
        public boolean filter(OrderEvent value) throws Exception {
          return "create".equals(value.getEventType());
        }
      })
        .followedBy("pay").where(new SimpleCondition<OrderEvent>() {
        @Override
        public boolean filter(OrderEvent value) throws Exception {
          return "pay".equals(value.getEventType());
        }
      })
        .within(Time.minutes(5));
  
      // 2. 定义侧输出流标签，用来表示超时事件
      OutputTag<OrderResult> orderTimeoutTag = new OutputTag<OrderResult>("order-timeout") {
      };
  
      // 3. 将pattern应用到输入数据上，得到pattern stream
      PatternStream<OrderEvent> patternStream = CEP.pattern(orderEventDataStream.keyBy(OrderEvent::getOrderId), orderPayPattern);
  
      // 4. 调用select方法，实现对匹配复杂事件和超时复杂事件的提取和处理
      SingleOutputStreamOperator<OrderResult> resultStream = patternStream
        .select(orderTimeoutTag, new OrderTimeoutSelect(), new OrderPaySelect());
  
      resultStream.print("payed normally");
      resultStream.getSideOutput(orderTimeoutTag).print("timeout");
  
      env.execute("order timeout detect job");
  
    }
  
    // 实现自定义的超时事件处理函数
    public static class OrderTimeoutSelect implements PatternTimeoutFunction<OrderEvent, OrderResult> {
  
      @Override
      public OrderResult timeout(Map<String, List<OrderEvent>> pattern, long timeoutTimestamp) throws Exception {
        Long timeoutOrderId = pattern.get("create").iterator().next().getOrderId();
        return new OrderResult(timeoutOrderId, "timeout " + timeoutTimestamp);
      }
    }
  
    // 实现自定义的正常匹配事件处理函数
    public static class OrderPaySelect implements PatternSelectFunction<OrderEvent, OrderResult> {
      @Override
      public OrderResult select(Map<String, List<OrderEvent>> pattern) throws Exception {
        Long payedOrderId = pattern.get("pay").iterator().next().getOrderId();
        return new OrderResult(payedOrderId, "payed");
      }
    }
  }
  ```

+ 输出

  ```shell
  payed normally> OrderResult{orderId=34729, resultState='payed'}
  timeout> OrderResult{orderId=34767, resultState='timeout 1558431249000'}
  payed normally> OrderResult{orderId=34766, resultState='payed'}
  payed normally> OrderResult{orderId=34765, resultState='payed'}
  payed normally> OrderResult{orderId=34764, resultState='payed'}
  payed normally> OrderResult{orderId=34763, resultState='payed'}
  payed normally> OrderResult{orderId=34762, resultState='payed'}
  payed normally> OrderResult{orderId=34761, resultState='payed'}
  payed normally> OrderResult{orderId=34760, resultState='payed'}
  payed normally> OrderResult{orderId=34759, resultState='payed'}
  payed normally> OrderResult{orderId=34758, resultState='payed'}
  payed normally> OrderResult{orderId=34757, resultState='payed'}
  timeout> OrderResult{orderId=34756, resultState='timeout 1558431213000'}
  payed normally> OrderResult{orderId=34755, resultState='payed'}
  payed normally> OrderResult{orderId=34754, resultState='payed'}
  payed normally> OrderResult{orderId=34753, resultState='payed'}
  payed normally> OrderResult{orderId=34752, resultState='payed'}
  payed normally> OrderResult{orderId=34751, resultState='payed'}
  payed normally> OrderResult{orderId=34750, resultState='payed'}
  payed normally> OrderResult{orderId=34749, resultState='payed'}
  payed normally> OrderResult{orderId=34748, resultState='payed'}
  payed normally> OrderResult{orderId=34747, resultState='payed'}
  payed normally> OrderResult{orderId=34746, resultState='payed'}
  payed normally> OrderResult{orderId=34745, resultState='payed'}
  payed normally> OrderResult{orderId=34744, resultState='payed'}
  payed normally> OrderResult{orderId=34743, resultState='payed'}
  payed normally> OrderResult{orderId=34742, resultState='payed'}
  payed normally> OrderResult{orderId=34741, resultState='payed'}
  payed normally> OrderResult{orderId=34740, resultState='payed'}
  payed normally> OrderResult{orderId=34739, resultState='payed'}
  payed normally> OrderResult{orderId=34738, resultState='payed'}
  payed normally> OrderResult{orderId=34737, resultState='payed'}
  payed normally> OrderResult{orderId=34736, resultState='payed'}
  payed normally> OrderResult{orderId=34735, resultState='payed'}
  payed normally> OrderResult{orderId=34734, resultState='payed'}
  payed normally> OrderResult{orderId=34733, resultState='payed'}
  payed normally> OrderResult{orderId=34732, resultState='payed'}
  payed normally> OrderResult{orderId=34731, resultState='payed'}
  payed normally> OrderResult{orderId=34730, resultState='payed'}
  ```

#### 代码2-ProcessFunction实现

CEP虽然更加简洁，但是ProcessFunction能控制的细节操作更多。

CEP还是比较适合事件之间有复杂联系的场景；

ProcessFunction用来处理每个独立且靠状态就能联系的事件，灵活性更高。

+ java代码

  ```java
  import beans.OrderEvent;
  import beans.OrderResult;
  import org.apache.flink.api.common.state.ValueState;
  import org.apache.flink.api.common.state.ValueStateDescriptor;
  import org.apache.flink.configuration.Configuration;
  import org.apache.flink.streaming.api.datastream.DataStream;
  import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
  import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor;
  import org.apache.flink.streaming.api.windowing.time.Time;
  import org.apache.flink.streaming.runtime.operators.util.AssignerWithPeriodicWatermarksAdapter;
  import org.apache.flink.util.Collector;
  import org.apache.flink.util.OutputTag;
  
  import java.net.URL;
  import java.util.concurrent.TimeUnit;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/6 4:59 PM
   */
  public class OrderTimeoutWithoutCep {
  
    // 定义超时事件的侧输出流标签
    private final static OutputTag<OrderResult> orderTimeoutTag = new OutputTag<OrderResult>("order-timeout") {
    };
  
    public static void main(String[] args) throws Exception {
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      env.setParallelism(1);
  
      // 读取数据并转换成POJO类型
      URL resource = OrderPayTimeout.class.getResource("/OrderLog.csv");
      DataStream<OrderEvent> orderEventDataStream = env.readTextFile(resource.getPath())
        .map(line -> {
          String[] fields = line.split(",");
          return new OrderEvent(new Long(fields[0]), fields[1], fields[2], new Long(fields[3]));
        }).assignTimestampsAndWatermarks(new AssignerWithPeriodicWatermarksAdapter.Strategy<>(
        new BoundedOutOfOrdernessTimestampExtractor<OrderEvent>(Time.of(200, TimeUnit.MILLISECONDS)) {
          @Override
          public long extractTimestamp(OrderEvent element) {
            return element.getTimestamp() * 1000L;
          }
        }
      ));
  
      // 定义自定义处理函数，主流输出正常匹配订单事件，侧输出流输出超时报警事件
      SingleOutputStreamOperator<OrderResult> resultStream = orderEventDataStream.keyBy(OrderEvent::getOrderId)
        .process(new OrderPayMatchDetect());
  
      resultStream.print("pay normally");
      resultStream.getSideOutput(orderTimeoutTag).print("timeout");
  
      env.execute("order timeout detect without cep job");
    }
  
    public static class OrderPayMatchDetect extends KeyedProcessFunction<Long, OrderEvent, OrderResult> {
      // 定义状态，保存之前点单是否已经来过create、pay的事件
      ValueState<Boolean> isPayedState;
      ValueState<Boolean> isCreatedState;
      // 定义状态，保存定时器时间戳
      ValueState<Long> timerTsState;
  
      @Override
      public void open(Configuration parameters) throws Exception {
        isPayedState = getRuntimeContext().getState(new ValueStateDescriptor<Boolean>("is-payed", Boolean.class, false));
        isCreatedState = getRuntimeContext().getState(new ValueStateDescriptor<Boolean>("is-created", Boolean.class, false));
        timerTsState = getRuntimeContext().getState(new ValueStateDescriptor<Long>("timer-ts", Long.class));
      }
  
      @Override
      public void processElement(OrderEvent value, Context ctx, Collector<OrderResult> out) throws Exception {
        // 先获取当前状态
        Boolean isPayed = isPayedState.value();
        Boolean isCreated = isCreatedState.value();
        Long timerTs = timerTsState.value();
  
        // 判断当前事件类型
        if ("create".equals(value.getEventType())) {
          // 1. 如果来的是create，要判断是否支付过
          if (isPayed) {
            // 1.1 如果已经正常支付，输出正常匹配结果
            out.collect(new OrderResult(value.getOrderId(), "payed successfully"));
            // 清空状态，删除定时器
            isCreatedState.clear();
            isPayedState.clear();
            timerTsState.clear();
            ctx.timerService().deleteEventTimeTimer(timerTs);
          } else {
            // 1.2 如果没有支付过，注册15分钟后的定时器，开始等待支付事件
            Long ts = (value.getTimestamp() + 15 * 60) * 1000L;
            ctx.timerService().registerEventTimeTimer(ts);
            // 更新状态
            timerTsState.update(ts);
            isCreatedState.update(true);
          }
        } else if ("pay".equals(value.getEventType())) {
          // 2. 如果来的是pay，要判断是否有下单事件来过
          if (isCreated) {
            // 2.1 已经有过下单事件，要继续判断支付的时间戳是否超过15分钟
            if (value.getTimestamp() * 1000L < timerTs) {
              // 2.1.1 在15分钟内，没有超时，正常匹配输出
              out.collect(new OrderResult(value.getOrderId(), "payed successfully"));
            } else {
              // 2.1.2 已经超时，输出侧输出流报警
              ctx.output(orderTimeoutTag, new OrderResult(value.getOrderId(), "payed but already timeout"));
            }
            // 统一清空状态
            isCreatedState.clear();
            isPayedState.clear();
            timerTsState.clear();
            ctx.timerService().deleteEventTimeTimer(timerTs);
          } else {
            // 2.2 没有下单事件，乱序，注册一个定时器，等待下单事件
            ctx.timerService().registerEventTimeTimer(value.getTimestamp() * 1000L);
            // 更新状态
            timerTsState.update(value.getTimestamp() * 1000L);
            isPayedState.update(true);
          }
        }
      }
  
      @Override
      public void onTimer(long timestamp, OnTimerContext ctx, Collector<OrderResult> out) throws Exception {
        // 定时器触发，说明一定有一个事件没来
        if (isPayedState.value()) {
          // 如果pay来了，说明create没来
          ctx.output(orderTimeoutTag, new OrderResult(ctx.getCurrentKey(), "payed but not found created log"));
        } else {
          // 如果pay没来，支付超时
          ctx.output(orderTimeoutTag, new OrderResult(ctx.getCurrentKey(), "timeout"));
        }
        // 清空状态
        isCreatedState.clear();
        isPayedState.clear();
        timerTsState.clear();
      }
    }
  }
  
  ```

+ 输出

  ```shell
  pay normally> OrderResult{orderId=34729, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34730, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34731, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34732, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34734, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34733, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34735, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34736, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34746, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34738, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34745, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34741, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34747, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34743, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34737, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34744, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34742, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34739, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34740, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34753, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34749, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34755, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34752, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34748, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34751, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34750, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34761, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34759, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34754, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34758, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34760, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34757, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34762, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34763, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34764, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34765, resultState='payed successfully'}
  pay normally> OrderResult{orderId=34766, resultState='payed successfully'}
  timeout> OrderResult{orderId=34767, resultState='payed but already timeout'}
  timeout> OrderResult{orderId=34768, resultState='payed but not found created log'}
  timeout> OrderResult{orderId=34756, resultState='timeout'}
  ```

### 14.3.8 订单支付实时对帐

+ 基本需求
  + 用户下单并支付之后，应查询到账信息，进行实时对帐
  + 如果有不匹配的支付信息或者到账信息，输出提示信息
+ 解决思路
  + 从两条流中分别读取订单支付信息和到账信息，合并处理
  + 用connect连接合并两条流，用coProcessFunction做匹配处理

#### POJO

+ ReceiptEvent

  ```java
  private String txId;
  private String payChannel;
  private Long timestamp;
  ```

#### 代码1-具体实现

+ java代码实现

  ```java
  import beans.OrderEvent;
  import beans.ReceiptEvent;
  import org.apache.flink.api.common.state.ValueState;
  import org.apache.flink.api.common.state.ValueStateDescriptor;
  import org.apache.flink.api.java.tuple.Tuple2;
  import org.apache.flink.configuration.Configuration;
  import org.apache.flink.streaming.api.datastream.DataStream;
  import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.streaming.api.functions.co.CoProcessFunction;
  import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor;
  import org.apache.flink.streaming.api.windowing.time.Time;
  import org.apache.flink.streaming.runtime.operators.util.AssignerWithPeriodicWatermarksAdapter;
  import org.apache.flink.util.Collector;
  import org.apache.flink.util.OutputTag;
  
  import java.net.URL;
  import java.util.concurrent.TimeUnit;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/6 5:34 PM
   */
  public class TxPayMatch {
  
    // 定义侧输出流标签
    private final static OutputTag<OrderEvent> unmatchedPays = new OutputTag<OrderEvent>("unmatched-pays"){};
    private final static OutputTag<ReceiptEvent> unmatchedReceipts = new OutputTag<ReceiptEvent>("unmatched-receipts"){};
  
    public static void main(String[] args) throws Exception {
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      env.setParallelism(1);
  
      // 读取数据并转换成POJO类型
      // 读取订单支付事件数据
      URL orderResource = TxPayMatch.class.getResource("/OrderLog.csv");
      DataStream<OrderEvent> orderEventStream = env.readTextFile(orderResource.getPath())
        .map(line -> {
          String[] fields = line.split(",");
          return new OrderEvent(new Long(fields[0]), fields[1], fields[2], new Long(fields[3]));
        })
        .assignTimestampsAndWatermarks(new AssignerWithPeriodicWatermarksAdapter.Strategy<>(
          new BoundedOutOfOrdernessTimestampExtractor<OrderEvent>(Time.of(200, TimeUnit.MILLISECONDS)) {
            @Override
            public long extractTimestamp(OrderEvent element) {
              return element.getTimestamp() * 1000L;
            }
          }
        ))
        // 交易id不为空，必须是pay事件
        .filter(data -> !"".equals(data.getTxId()));
  
      // 读取到账事件数据
      URL receiptResource = TxPayMatch.class.getResource("/ReceiptLog.csv");
      SingleOutputStreamOperator<ReceiptEvent> receiptEventStream = env.readTextFile(receiptResource.getPath())
        .map(line -> {
          String[] fields = line.split(",");
          return new ReceiptEvent(fields[0], fields[1], new Long(fields[2]));
        })
        .assignTimestampsAndWatermarks(new AssignerWithPeriodicWatermarksAdapter.Strategy<>(
          new BoundedOutOfOrdernessTimestampExtractor<ReceiptEvent>(Time.of(200, TimeUnit.MILLISECONDS)) {
            @Override
            public long extractTimestamp(ReceiptEvent element) {
              return element.getTimestamp() * 1000L;
            }
          }
        ));
  
      // 将两条流进行连接合并，进行匹配处理，不匹配的事件输出到侧输出流
      SingleOutputStreamOperator<Tuple2<OrderEvent, ReceiptEvent>> resultStream = orderEventStream.keyBy(OrderEvent::getTxId)
        .connect(receiptEventStream.keyBy(ReceiptEvent::getTxId))
        .process(new TxPayMatchDetect());
  
      resultStream.print("matched-pays");
      resultStream.getSideOutput(unmatchedPays).print("unmatched-pays");
      resultStream.getSideOutput(unmatchedReceipts).print("unmatched-receipts");
  
      env.execute("tx match detect job");
    }
  
    // 实现自定义CoProcessFunction
    public static class TxPayMatchDetect extends CoProcessFunction<OrderEvent, ReceiptEvent, Tuple2<OrderEvent, ReceiptEvent>> {
      // 定义状态，保存当前已经到来的订单支付事件和到账时间
      ValueState<OrderEvent> payState;
      ValueState<ReceiptEvent> receiptState;
  
      @Override
      public void open(Configuration parameters) throws Exception {
        payState = getRuntimeContext().getState(new ValueStateDescriptor<OrderEvent>("pay", OrderEvent.class));
        receiptState = getRuntimeContext().getState(new ValueStateDescriptor<ReceiptEvent>("receipt", ReceiptEvent.class));
      }
  
      @Override
      public void processElement1(OrderEvent pay, Context ctx, Collector<Tuple2<OrderEvent, ReceiptEvent>> out) throws Exception {
        // 订单支付事件来了，判断是否已经有对应的到账事件
        ReceiptEvent receipt = receiptState.value();
        if( receipt != null ){
          // 如果receipt不为空，说明到账事件已经来过，输出匹配事件，清空状态
          out.collect( new Tuple2<>(pay, receipt) );
          payState.clear();
          receiptState.clear();
        } else {
          // 如果receipt没来，注册一个定时器，开始等待
          ctx.timerService().registerEventTimeTimer( (pay.getTimestamp() + 5) * 1000L );    // 等待5秒钟，具体要看数据
          // 更新状态
          payState.update(pay);
        }
      }
  
      @Override
      public void processElement2(ReceiptEvent receipt, Context ctx, Collector<Tuple2<OrderEvent, ReceiptEvent>> out) throws Exception {
        // 到账事件来了，判断是否已经有对应的支付事件
        OrderEvent pay = payState.value();
        if( pay != null ){
          // 如果pay不为空，说明支付事件已经来过，输出匹配事件，清空状态
          out.collect( new Tuple2<>(pay, receipt) );
          payState.clear();
          receiptState.clear();
        } else {
          // 如果pay没来，注册一个定时器，开始等待
          ctx.timerService().registerEventTimeTimer( (receipt.getTimestamp() + 3) * 1000L );    // 等待3秒钟，具体要看数据
          // 更新状态
          receiptState.update(receipt);
        }
      }
  
      @Override
      public void onTimer(long timestamp, OnTimerContext ctx, Collector<Tuple2<OrderEvent, ReceiptEvent>> out) throws Exception {
        // 定时器触发，有可能是有一个事件没来，不匹配，也有可能是都来过了，已经输出并清空状态
        // 判断哪个不为空，那么另一个就没来
        if( payState.value() != null ){
          ctx.output(unmatchedPays, payState.value());
        }
        if( receiptState.value() != null ){
          ctx.output(unmatchedReceipts, receiptState.value());
        }
        // 清空状态
        payState.clear();
        receiptState.clear();
      }
    }
  }
  ```

+ 输出

  ```shell
  matched-pays> (OrderEvent{orderId=34729, eventType='pay', txId='sd76f87d6', timestamp=1558430844},ReceiptEvent{txId='sd76f87d6', payChannel='wechat', timestamp=1558430847})
  matched-pays> (OrderEvent{orderId=34730, eventType='pay', txId='3hu3k2432', timestamp=1558430845},ReceiptEvent{txId='3hu3k2432', payChannel='alipay', timestamp=1558430848})
  matched-pays> (OrderEvent{orderId=34732, eventType='pay', txId='32h3h4b4t', timestamp=1558430861},ReceiptEvent{txId='32h3h4b4t', payChannel='wechat', timestamp=1558430852})
  matched-pays> (OrderEvent{orderId=34733, eventType='pay', txId='766lk5nk4', timestamp=1558430864},ReceiptEvent{txId='766lk5nk4', payChannel='wechat', timestamp=1558430855})
  matched-pays> (OrderEvent{orderId=34734, eventType='pay', txId='435kjb45d', timestamp=1558430863},ReceiptEvent{txId='435kjb45d', payChannel='alipay', timestamp=1558430859})
  matched-pays> (OrderEvent{orderId=34735, eventType='pay', txId='5k432k4n', timestamp=1558430869},ReceiptEvent{txId='5k432k4n', payChannel='wechat', timestamp=1558430862})
  matched-pays> (OrderEvent{orderId=34736, eventType='pay', txId='435kjb45s', timestamp=1558430875},ReceiptEvent{txId='435kjb45s', payChannel='wechat', timestamp=1558430866})
  matched-pays> (OrderEvent{orderId=34738, eventType='pay', txId='43jhin3k4', timestamp=1558430896},ReceiptEvent{txId='43jhin3k4', payChannel='wechat', timestamp=1558430871})
  matched-pays> (OrderEvent{orderId=34741, eventType='pay', txId='88df0wn92', timestamp=1558430896},ReceiptEvent{txId='88df0wn92', payChannel='alipay', timestamp=1558430882})
  matched-pays> (OrderEvent{orderId=34737, eventType='pay', txId='324jnd45s', timestamp=1558430902},ReceiptEvent{txId='324jnd45s', payChannel='wechat', timestamp=1558430868})
  matched-pays> (OrderEvent{orderId=34743, eventType='pay', txId='3hefw8jf', timestamp=1558430900},ReceiptEvent{txId='3hefw8jf', payChannel='alipay', timestamp=1558430885})
  matched-pays> (OrderEvent{orderId=34744, eventType='pay', txId='499dfano2', timestamp=1558430903},ReceiptEvent{txId='499dfano2', payChannel='wechat', timestamp=1558430886})
  matched-pays> (OrderEvent{orderId=34742, eventType='pay', txId='435kjb4432', timestamp=1558430906},ReceiptEvent{txId='435kjb4432', payChannel='alipay', timestamp=1558430884})
  matched-pays> (OrderEvent{orderId=34745, eventType='pay', txId='8xz09ddsaf', timestamp=1558430896},ReceiptEvent{txId='8xz09ddsaf', payChannel='wechat', timestamp=1558430889})
  matched-pays> (OrderEvent{orderId=34739, eventType='pay', txId='98x0f8asd', timestamp=1558430907},ReceiptEvent{txId='98x0f8asd', payChannel='alipay', timestamp=1558430874})
  matched-pays> (OrderEvent{orderId=34746, eventType='pay', txId='3243hr9h9', timestamp=1558430895},ReceiptEvent{txId='3243hr9h9', payChannel='wechat', timestamp=1558430892})
  matched-pays> (OrderEvent{orderId=34740, eventType='pay', txId='392094j32', timestamp=1558430913},ReceiptEvent{txId='392094j32', payChannel='wechat', timestamp=1558430877})
  matched-pays> (OrderEvent{orderId=34747, eventType='pay', txId='329d09f9f', timestamp=1558430893},ReceiptEvent{txId='329d09f9f', payChannel='alipay', timestamp=1558430893})
  matched-pays> (OrderEvent{orderId=34749, eventType='pay', txId='324n0239', timestamp=1558430916},ReceiptEvent{txId='324n0239', payChannel='wechat', timestamp=1558430899})
  matched-pays> (OrderEvent{orderId=34748, eventType='pay', txId='809saf0ff', timestamp=1558430934},ReceiptEvent{txId='809saf0ff', payChannel='wechat', timestamp=1558430895})
  matched-pays> (OrderEvent{orderId=34752, eventType='pay', txId='rnp435rk', timestamp=1558430925},ReceiptEvent{txId='rnp435rk', payChannel='wechat', timestamp=1558430905})
  matched-pays> (OrderEvent{orderId=34751, eventType='pay', txId='24309dsf', timestamp=1558430941},ReceiptEvent{txId='24309dsf', payChannel='alipay', timestamp=1558430902})
  matched-pays> (OrderEvent{orderId=34753, eventType='pay', txId='8c6vs8dd', timestamp=1558430913},ReceiptEvent{txId='8c6vs8dd', payChannel='wechat', timestamp=1558430906})
  matched-pays> (OrderEvent{orderId=34750, eventType='pay', txId='sad90df3', timestamp=1558430941},ReceiptEvent{txId='sad90df3', payChannel='alipay', timestamp=1558430901})
  matched-pays> (OrderEvent{orderId=34755, eventType='pay', txId='8x0zvy8w3', timestamp=1558430918},ReceiptEvent{txId='8x0zvy8w3', payChannel='alipay', timestamp=1558430911})
  matched-pays> (OrderEvent{orderId=34754, eventType='pay', txId='3245nbo7', timestamp=1558430950},ReceiptEvent{txId='3245nbo7', payChannel='alipay', timestamp=1558430908})
  matched-pays> (OrderEvent{orderId=34758, eventType='pay', txId='32499fd9w', timestamp=1558430950},ReceiptEvent{txId='32499fd9w', payChannel='alipay', timestamp=1558430921})
  matched-pays> (OrderEvent{orderId=34759, eventType='pay', txId='9203kmfn', timestamp=1558430950},ReceiptEvent{txId='9203kmfn', payChannel='alipay', timestamp=1558430922})
  matched-pays> (OrderEvent{orderId=34760, eventType='pay', txId='390mf2398', timestamp=1558430960},ReceiptEvent{txId='390mf2398', payChannel='alipay', timestamp=1558430926})
  matched-pays> (OrderEvent{orderId=34757, eventType='pay', txId='d8938034', timestamp=1558430962},ReceiptEvent{txId='d8938034', payChannel='wechat', timestamp=1558430915})
  matched-pays> (OrderEvent{orderId=34761, eventType='pay', txId='902dsqw45', timestamp=1558430943},ReceiptEvent{txId='902dsqw45', payChannel='wechat', timestamp=1558430927})
  matched-pays> (OrderEvent{orderId=34762, eventType='pay', txId='84309dw31r', timestamp=1558430983},ReceiptEvent{txId='84309dw31r', payChannel='alipay', timestamp=1558430933})
  matched-pays> (OrderEvent{orderId=34763, eventType='pay', txId='sddf9809ew', timestamp=1558431068},ReceiptEvent{txId='sddf9809ew', payChannel='alipay', timestamp=1558430936})
  matched-pays> (OrderEvent{orderId=34764, eventType='pay', txId='832jksmd9', timestamp=1558431079},ReceiptEvent{txId='832jksmd9', payChannel='wechat', timestamp=1558430938})
  matched-pays> (OrderEvent{orderId=34765, eventType='pay', txId='m23sare32e', timestamp=1558431082},ReceiptEvent{txId='m23sare32e', payChannel='wechat', timestamp=1558430940})
  matched-pays> (OrderEvent{orderId=34766, eventType='pay', txId='92nr903msa', timestamp=1558431095},ReceiptEvent{txId='92nr903msa', payChannel='wechat', timestamp=1558430944})
  matched-pays> (OrderEvent{orderId=34767, eventType='pay', txId='sdafen9932', timestamp=1558432021},ReceiptEvent{txId='sdafen9932', payChannel='alipay', timestamp=1558430949})
  unmatched-receipts> ReceiptEvent{txId='ewr342as4', payChannel='wechat', timestamp=1558430845}
  unmatched-receipts> ReceiptEvent{txId='8fdsfae83', payChannel='alipay', timestamp=1558430850}
  unmatched-pays> OrderEvent{orderId=34731, eventType='pay', txId='35jue34we', timestamp=1558430849}
  unmatched-receipts> ReceiptEvent{txId='9032n4fd2', payChannel='wechat', timestamp=1558430913}
  unmatched-pays> OrderEvent{orderId=34768, eventType='pay', txId='88snrn932', timestamp=1558430950}
  ```

#### 代码2-Join实现

**这种方法的缺陷，只能获得正常匹配的结果，不能获得未匹配成功的记录。**

+ java代码

  ```java
  import beans.OrderEvent;
  import beans.ReceiptEvent;
  import org.apache.flink.api.java.tuple.Tuple2;
  import org.apache.flink.streaming.api.TimeCharacteristic;
  import org.apache.flink.streaming.api.datastream.DataStream;
  import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.streaming.api.functions.co.ProcessJoinFunction;
  import org.apache.flink.streaming.api.functions.timestamps.AscendingTimestampExtractor;
  import org.apache.flink.streaming.api.functions.timestamps.BoundedOutOfOrdernessTimestampExtractor;
  import org.apache.flink.streaming.api.windowing.time.Time;
  import org.apache.flink.streaming.runtime.operators.util.AssignerWithPeriodicWatermarksAdapter;
  import org.apache.flink.util.Collector;
  
  import java.net.URL;
  import java.util.concurrent.TimeUnit;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/6 7:55 PM
   */
  public class TxPayMatchByJoin {
  
    public static void main(String[] args) throws Exception {
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      env.setStreamTimeCharacteristic(TimeCharacteristic.EventTime);
      env.setParallelism(1);
  
      // 读取数据并转换成POJO类型
      // 读取订单支付事件数据
      URL orderResource = TxPayMatch.class.getResource("/OrderLog.csv");
      DataStream<OrderEvent> orderEventStream = env.readTextFile(orderResource.getPath())
        .map(line -> {
          String[] fields = line.split(",");
          return new OrderEvent(new Long(fields[0]), fields[1], fields[2], new Long(fields[3]));
        })
        .assignTimestampsAndWatermarks(new AssignerWithPeriodicWatermarksAdapter.Strategy<>(
          new BoundedOutOfOrdernessTimestampExtractor<OrderEvent>(Time.of(200, TimeUnit.MILLISECONDS)) {
            @Override
            public long extractTimestamp(OrderEvent element) {
              return element.getTimestamp() * 1000L;
            }
          }
        ))
        // 交易id不为空，必须是pay事件
        .filter(data -> !"".equals(data.getTxId()));
  
      // 读取到账事件数据
      URL receiptResource = TxPayMatch.class.getResource("/ReceiptLog.csv");
      SingleOutputStreamOperator<ReceiptEvent> receiptEventStream = env.readTextFile(receiptResource.getPath())
        .map(line -> {
          String[] fields = line.split(",");
          return new ReceiptEvent(fields[0], fields[1], new Long(fields[2]));
        })
        .assignTimestampsAndWatermarks(new AssignerWithPeriodicWatermarksAdapter.Strategy<>(
          new BoundedOutOfOrdernessTimestampExtractor<ReceiptEvent>(Time.of(200, TimeUnit.MILLISECONDS)) {
            @Override
            public long extractTimestamp(ReceiptEvent element) {
              return element.getTimestamp() * 1000L;
            }
          }
        ));
  
      // 区间连接两条流，得到匹配的数据
      SingleOutputStreamOperator<Tuple2<OrderEvent, ReceiptEvent>> resultStream = orderEventStream
        .keyBy(OrderEvent::getTxId)
        .intervalJoin(receiptEventStream.keyBy(ReceiptEvent::getTxId))
        .between(Time.seconds(-3), Time.seconds(5))    // -3，5 区间范围
        .process(new TxPayMatchDetectByJoin());
  
      resultStream.print();
  
      env.execute("tx pay match by join job");
    }
  
    // 实现自定义ProcessJoinFunction
    public static class TxPayMatchDetectByJoin extends ProcessJoinFunction<OrderEvent, ReceiptEvent, Tuple2<OrderEvent, ReceiptEvent>> {
      @Override
      public void processElement(OrderEvent left, ReceiptEvent right, Context ctx, Collector<Tuple2<OrderEvent, ReceiptEvent>> out) throws Exception {
        out.collect(new Tuple2<>(left, right));
      }
    }
  }
  
  ```

+ 输出

  ```shell
  (OrderEvent{orderId=34729, eventType='pay', txId='sd76f87d6', timestamp=1558430844},ReceiptEvent{txId='sd76f87d6', payChannel='wechat', timestamp=1558430847})
  (OrderEvent{orderId=34730, eventType='pay', txId='3hu3k2432', timestamp=1558430845},ReceiptEvent{txId='3hu3k2432', payChannel='alipay', timestamp=1558430848})
  (OrderEvent{orderId=34746, eventType='pay', txId='3243hr9h9', timestamp=1558430895},ReceiptEvent{txId='3243hr9h9', payChannel='wechat', timestamp=1558430892})
  (OrderEvent{orderId=34747, eventType='pay', txId='329d09f9f', timestamp=1558430893},ReceiptEvent{txId='329d09f9f', payChannel='alipay', timestamp=1558430893})
  ```

# 15. CEP

> [Flink-复杂事件（CEP）](https://zhuanlan.zhihu.com/p/43448829)
>
> [Flink之CEP(复杂时间处理)](https://blog.csdn.net/qq_37135484/article/details/106327567)

## 15.1 基本概念

### 15.1.1 什么是CEP

+ 复杂事件处理（Complex Event Processing，CEP）
+ Flink CEP是在Flink中实现的复杂事件处理（CEP）库
+ CEP允许在**无休止的事件流**中检测事件模式，让我们有机会掌握数据中重要的部分

+ **一个或多个由简单事件构成的事件流通过一定的规则匹配，然后输出用户想得到的数据——满足规则的复杂事件**

### 15.1.2 CEP特点

![img](https://pic1.zhimg.com/80/v2-1c7057bda8a3ba077a3b8059f35d9bc4_1440w.jpg)

+ 目标：从有序的简单事件流中发现一些高阶特征

- 输入：一个或多个由简单事件构成的事件流

- 处理：识别简单事件之间的内在联系，多个符合一定规则的简单事件构成复杂事件

- 输出：满足规则的复杂事件

## 15.2 Pattern API

+ 处理事件的规则，被叫做"模式"（Pattern）

+ Flink CEP提供了Pattern API，用于对输入流数据进行复杂事件规则定义，用来提取符合规则的时间序列

  ```java
  DataStream<Event> input = ...
  // 定义一个Pattern
  Pattern<Event, Event> pattern = Pattern.<Event>begin("start").where(...)
    .next("middle").subtype(SubEvent.class).where(...)
    .followedBy("end").where(...);
  // 将创建好的Pattern应用到输入事件流上
  PatternStream<Event> patternStream = CEP.pattern(input,pattern);
  // 检出匹配事件序列，处理得到结果
  DataStream<Alert> result = patternStream.select(...);
  ```

### 个体模式(Individual Patterns)

+ 组成复杂规则的每一个单独的模式定义,就是"个体模式"

  ```java
  start.times(3).where(new SimpleCondition<Event>() {...})
  ```

+ 个体模式可以包括"单例(singleton)模式"和"循环(looping)模式"
+ 单例模式只接收一个事件，而循环模式可以接收多个

---

+ 量词（Quantifier）

  可以在一个个体模式后追加量词，也就是指定循环次数

  ```java
  //匹配出现4次
  start.times(4)
  //匹配出现2/3/4次
  start.time(2,4).greedy
  //匹配出现0或者4次
  start.times(4).optional
  //匹配出现1次或者多次
  start.oneOrMore
  //匹配出现2,3,4次
  start.times(2,4)
  //匹配出现0次,2次或者多次,并且尽可能多的重复匹配
  start.timesOrMore(2),optional.greedy
  ```

+ 条件（Condition）

  + **每个模式都需要指定触发条件**，作为模式是否接受事件进入的判断依据

  + CEP中的个体模式主要通过调用`.where()`，`.or()`和`.until()`来指定条件

  + 按不同的调用方式，可以分成以下几类

    + 简单条件（Simple Condition）

      通过`.where()`方法对事件中的字段进行判断筛选，决定是否接受该事件

      ```java
      start.where(new SimpleCondition<Event>){
        @Override
        public boolean filter(Event value) throws Exception{
          return value.getName.startsWith("foo");
        }
      }
      ```

    + 组合条件（Combining Condition）

      将简单条件进行合并；`.or()`方法表示或逻辑相连，where的直接组合就是AND

      `pattern.where(event => ... /* some condition */).or(event => ... /* or condition */)`

    + 终止条件（Stop Condition）

      如果使用了`oneOrMore`或者`oneOrMore.optional`，建议使用`.until()`作为终止条件，以便清理状态

    + 迭代条件（Iterative Condition）

      能够对模式之前所有接收的事件进行处理

      可以调用`ctx.getEventsForPattern("name")`

      ```java
      .where(new IterativeCondition<Event>(){...})
      ```

### 组合模式(Combining Patterns)

组合模式(Combining Patterns)也叫模式序列。

+ 很多个体模式组合起来，就形成了整个的模式序列

+ 模式序列必须以一个"初始模式"开始

  ```java
  Pattern<Event, Event> start = Pattern.<Event>begin("start")
  ```

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200526221919332.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxXzM3MTM1NDg0,size_16,color_FFFFFF,t_70)

+ 严格近邻(Strict Contiguity)
  + **所有事件按照严格的顺序出现**，中间没有任何不匹配的事件，由`.next()`指定
  + 例如对于模式"a next b",事件序列[a,c,b1,b2]没有匹配
+ 宽松近邻(Relaxed Contiguity)
  + 允许中间出现不匹配的事件,由`.followedBy()`指定
  + 例如对于模式"a followedBy b",事件序列[a,c,b1,b2]匹配为[a,b1]

+ 非确定性宽松近邻(Non-Deterministic Relaxed Contiguity)

  + 进一步放宽条件,之前已经匹配过的事件也可以再次使用，由`.followByAny()`指定
  + 例如对于模式"a followedAny b",事件序列[a,c,b1,b2]匹配为{a,b1},{a,b2}

+ 除了以上模式序列外,还可以定义"不希望出现某种近邻关系":

  + `.notNext()` 不严格近邻

  + `.notFollowedBy()`不在两个事件之间发生

    （eg，a not FollowedBy c，a Followed By b，a希望之后出现b，且不希望ab之间出现c）

+ 需要注意：

  +  **所有模式序列必须以`.begin()`开始**

  +  **模式序列不能以`.notFollowedBy()`结束**

  +  **"not "类型的模式不能被optional 所修饰**

  +  此外,还可以为模式指定事件约束，用来<u>要求在多长时间内匹配有效</u>: 

    `next.within(Time.seconds(10))`

### 模式组(Groups of patterns)

+ 将一个模式序列作为条件嵌套在个体模式里，成为一组模式

## 15.3 模式的检测

- 指定要查找的模式序列后，就可以将其应用于输入流以检测潜在匹配

- 调用`CEP.pattern()`，给定输入流和模式，就能得到一个PatternStream

  ```java
  DataStream<Event> input = ...
  Pattern<Event, Event> pattern = Pattern.<Event>begin("start").where(...)...
  
  PatternStream<Event> patternStream = CEP.pattern(input, pattern);
  ```

## 15.4 匹配事件的提取

- 创建PatternStrean之后，就可以应用select或者flatselect方法，从检测到的事件序列中提取事件了

- `select()`方法需要输入一个select function作为参数,每个成功匹配的事件序列都会调用它

- `select()` 以一个Map<String，List<IN]>> 来接收匹配到的事件序列，其中Key就是每个模式的名称，而value就是所有接收到的事件的List类型

  ```java
  public OUT select(Map<String, List<IN>> pattern) throws Exception {
    IN startEvent = pattern.get("start").get(0);
    IN endEvent = pattern.get("end").get(0);
    return new OUT(startEvent, endEvent);
  }
  ```

## 15.4 超时事件的提取

+ **当一个模式通过within关键字定义了检测窗口时间时，部分事件序列可能因为超过窗口长度而被丢弃；为了能够处理这些超时的部分匹配，select和flatSelect API调用允许指定超时处理程序**

+ **超时处理程序会接收到目前为止由模式匹配到的所有事件，由一个OutputTag定义接收到的超时事件序列**

  ```java
  PatternStream<Event> patternStream = CEP.pattern(input, pattern);
  OutputTag<String> outputTag = new OutputTag<String>("side-output"){};
  
  SingleOutputStreamOperator<ComplexEvent> flatResult = 
    patternStream.flatSelect(
    outputTag,
    new PatternFlatTimeoutFunction<Event, TimeoutEvent>() {...},
    new PatternFlatSelectFunction<Event, ComplexEvent>() {...}
  );
  DataStream<TimeoutEvent> timeoutFlatResult = 
    flatResult.getSideOutput(outputTag);
  ```

---

[返回上篇](./尚硅谷Flink入门到实战-学习笔记)
