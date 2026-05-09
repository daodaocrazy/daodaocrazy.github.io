> 文档：尚硅谷Flink入门到实战-学习笔记

[返回总览](../尚硅谷Flink入门到实战-学习笔记) | [上一章：10. 容错机制](./chapter-10) | [下一章：12. 时间特性(Time Attributes)](./chapter-12)

# 11. Table API和Flink SQL

> [Flink-Table API 和 Flink SQL简介 | 新老版本Flink批流处理对比 | 读取文件和Kafka消费数据 | API 和 SQL查询表](https://blog.csdn.net/qq_40180229/article/details/106457648)
>
> [flink-Table&sql-碰到的几个问题记录](https://blog.csdn.net/weixin_41956627/article/details/110050094)

## 11.1 概述

+ Flink 对批处理和流处理，提供了统一的上层 API
+ Table API 是一套内嵌在 Java 和 Scala 语言中的查询API，它允许以非常直观的方式组合来自一些关系运算符的查询
+ Flink 的 SQL 支持基于实现了 SQL 标准的 Apache Calcite

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200531165328668.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxXzQwMTgwMjI5,size_16,color_FFFFFF,t_70)

###  使用样例

+ 导入pom依赖，1.11.X之后，推荐使用blink版本

  ```xml
  <!-- Table API 和 Flink SQL -->
  <dependency>
    <groupId>org.apache.flink</groupId>
    <artifactId>flink-table-planner-blink_${scala.binary.version}</artifactId>
    <version>${flink.version}</version>
  </dependency>
  ```

+ java样例代码

  ```java
  package apitest.tableapi;
  
  import apitest.beans.SensorReading;
  import org.apache.flink.streaming.api.datastream.DataStream;
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.table.api.Table;
  import org.apache.flink.table.api.bridge.java.StreamTableEnvironment;
  import org.apache.flink.types.Row;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/3 5:47 AM
   */
  public class TableTest1_Example {
    public static void main(String[] args) throws Exception {
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      env.setParallelism(1);
  
      // 1. 读取数据
      DataStream<String> inputStream = env.readTextFile("/tmp/Flink_Tutorial/src/main/resources/sensor.txt");
  
      // 2. 转换成POJO
      DataStream<SensorReading> dataStream = inputStream.map(line -> {
        String[] fields = line.split(",");
        return new SensorReading(fields[0], new Long(fields[1]), new Double(fields[2]));
      });
  
      // 3. 创建表环境
      StreamTableEnvironment tableEnv = StreamTableEnvironment.create(env);
  
      // 4. 基于流创建一张表
      Table dataTable = tableEnv.fromDataStream(dataStream);
  
      // 5. 调用table API进行转换操作
      Table resultTable = dataTable.select("id, temperature")
        .where("id = 'sensor_1'");
  
      // 6. 执行SQL
      tableEnv.createTemporaryView("sensor", dataTable);
      String sql = "select id, temperature from sensor where id = 'sensor_1'";
      Table resultSqlTable = tableEnv.sqlQuery(sql);
  
      tableEnv.toAppendStream(resultTable, Row.class).print("result");
      tableEnv.toAppendStream(resultSqlTable, Row.class).print("sql");
  
      env.execute();
    }
  }
  ```

+ Txt文件

  ```txt
  sensor_1,1547718199,35.8
  sensor_6,1547718201,15.4
  sensor_7,1547718202,6.7
  sensor_10,1547718205,38.1
  sensor_1,1547718207,36.3
  sensor_1,1547718209,32.8
  sensor_1,1547718212,37.1
  ```

+ 输出结果

  ```shell
  result> sensor_1,35.8
  sql> sensor_1,35.8
  result> sensor_1,36.3
  sql> sensor_1,36.3
  result> sensor_1,32.8
  sql> sensor_1,32.8
  result> sensor_1,37.1
  sql> sensor_1,37.1
  ```

## 11.2 基本程序结构

+ Table API和SQL的程序结构，与流式处理的程序结构十分类似

  ```java
  StreamTableEnvironment tableEnv = ... // 创建表的执行环境
  
  // 创建一张表，用于读取数据
  tableEnv.connect(...).createTemporaryTable("inputTable");
  
  // 注册一张表，用于把计算结果输出
  tableEnv.connect(...).createTemporaryTable("outputTable");
  
  // 通过 Table API 查询算子，得到一张结果表
  Table result = tableEnv.from("inputTable").select(...);
  
  // 通过SQL查询语句，得到一张结果表
  Table sqlResult = tableEnv.sqlQuery("SELECT ... FROM inputTable ...");
  
  // 将结果表写入输出表中
  result.insertInto("outputTable");
  ```

## 11.3 Table API批处理和流处理

新版本blink，真正把批处理、流处理都以DataStream实现。

### 创建环境-样例代码

```java
package apitest.tableapi;


import org.apache.flink.api.java.ExecutionEnvironment;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.table.api.EnvironmentSettings;
import org.apache.flink.table.api.TableEnvironment;
import org.apache.flink.table.api.bridge.java.BatchTableEnvironment;
import org.apache.flink.table.api.bridge.java.StreamTableEnvironment;
import org.apache.flink.table.api.internal.TableEnvironmentImpl;

/**
 * @author : daodaocrazy email: daodaocrazy@outlook.com
 * @date : 2021/2/3 3:56 PM
 */
public class TableTest2_CommonApi {
  public static void main(String[] args) {
    // 创建执行环境
    StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
    // 设置并行度为1
    env.setParallelism(1);

    StreamTableEnvironment tableEnv = StreamTableEnvironment.create(env);

    // 1.1 基于老版本planner的流处理
    EnvironmentSettings oldStreamSettings = EnvironmentSettings.newInstance()
      .useOldPlanner()
      .inStreamingMode()
      .build();
    StreamTableEnvironment oldStreamTableEnv = StreamTableEnvironment.create(env,oldStreamSettings);

    // 1.2 基于老版本planner的批处理
    ExecutionEnvironment batchEnv = ExecutionEnvironment.getExecutionEnvironment();
    BatchTableEnvironment oldBatchTableEnv = BatchTableEnvironment.create(batchEnv);

    // 1.3 基于Blink的流处理
    EnvironmentSettings blinkStreamSettings = EnvironmentSettings.newInstance()
      .useBlinkPlanner()
      .inStreamingMode()
      .build();
    StreamTableEnvironment blinkStreamTableEnv = StreamTableEnvironment.create(env,blinkStreamSettings);

    // 1.4 基于Blink的批处理
    EnvironmentSettings blinkBatchSettings = EnvironmentSettings.newInstance()
      .useBlinkPlanner()
      .inBatchMode()
      .build();
    TableEnvironment blinkBatchTableEnv = TableEnvironment.create(blinkBatchSettings);
  }
}
```

### 11.3.1  表(Table)

+ TableEnvironment可以注册目录Catalog，并可以基于Catalog注册表
+ **表(Table)是由一个"标示符"(identifier)来指定的，由3部分组成：Catalog名、数据库(database)名和对象名**
+ 表可以是常规的，也可以是虚拟的(视图，View)
+ 常规表(Table)一般可以用来描述外部数据，比如文件、数据库表或消息队列的数据，也可以直接从DataStream转换而来
+ 视图(View)可以从现有的表中创建，通常是table API或者SQL查询的一个结果集

### 11.3.2 创建表

+ TableEnvironment可以调用`connect()`方法，连接外部系统，并调用`.createTemporaryTable()`方法，在Catalog中注册表

  ```java
  tableEnv
    .connect(...)	//	定义表的数据来源，和外部系统建立连接
    .withFormat(...)	//	定义数据格式化方法
    .withSchema(...)	//	定义表结构
    .createTemporaryTable("MyTable");	//	创建临时表
  ```

### 11.3.3 创建TableEnvironment

+ 创建表的执行环境，需要将flink流处理的执行环境传入

  `StreamTableEnvironment tableEnv = StreamTableEnvironment.create(env);`

+ TableEnvironment是flink中集成Table API和SQL的核心概念，所有对表的操作都基于TableEnvironment

  + 注册Catalog
  + 在Catalog中注册表
  + 执行SQL查询
  + 注册用户自定义函数（UDF）

#### 测试代码

+ pom依赖

  ```xml
  <!-- Table API 和 Flink SQL -->
  <dependency>
    <groupId>org.apache.flink</groupId>
    <artifactId>flink-table-planner-blink_${scala.binary.version}</artifactId>
    <version>${flink.version}</version>
  </dependency>
  
  <!-- csv -->
  <dependency>
    <groupId>org.apache.flink</groupId>
    <artifactId>flink-csv</artifactId>
    <version>${flink.version}</version>
  </dependency>
  ```

+ java代码

  ```java
  package apitest.tableapi;
  
  
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.table.api.DataTypes;
  import org.apache.flink.table.api.Table;
  import org.apache.flink.table.api.bridge.java.StreamTableEnvironment;
  import org.apache.flink.table.descriptors.Csv;
  import org.apache.flink.table.descriptors.FileSystem;
  import org.apache.flink.table.descriptors.Schema;
  import org.apache.flink.types.Row;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/3 3:56 PM
   */
  public class TableTest2_CommonApi {
    public static void main(String[] args) throws Exception {
      // 创建执行环境
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      // 设置并行度为1
      env.setParallelism(1);
  
      StreamTableEnvironment tableEnv = StreamTableEnvironment.create(env);
  
      // 2. 表的创建：连接外部系统，读取数据
      // 2.1 读取文件
      String filePath = "/tmp/Flink_Tutorial/src/main/resources/sensor.txt";
  
      tableEnv.connect(new FileSystem().path(filePath)) // 定义到文件系统的连接
        .withFormat(new Csv()) // 定义以csv格式进行数据格式化
        .withSchema(new Schema()
                    .field("id", DataTypes.STRING())
                    .field("timestamp", DataTypes.BIGINT())
                    .field("temp", DataTypes.DOUBLE())
                   ) // 定义表结构
        .createTemporaryTable("inputTable"); // 创建临时表
  
      Table inputTable = tableEnv.from("inputTable");
      inputTable.printSchema();
      tableEnv.toAppendStream(inputTable, Row.class).print();
  
      env.execute();
    }
  }
  ```

+ 输入文件

  ```txt
  sensor_1,1547718199,35.8
  sensor_6,1547718201,15.4
  sensor_7,1547718202,6.7
  sensor_10,1547718205,38.1
  sensor_1,1547718207,36.3
  sensor_1,1547718209,32.8
  sensor_1,1547718212,37.1
  ```

+ 输出

  ```shell
  root
   |-- id: STRING
   |-- timestamp: BIGINT
   |-- temp: DOUBLE
   
  sensor_1,1547718199,35.8
  sensor_6,1547718201,15.4
  sensor_7,1547718202,6.7
  sensor_10,1547718205,38.1
  sensor_1,1547718207,36.3
  sensor_1,1547718209,32.8
  sensor_1,1547718212,37.1
  ```

### 11.3.4 表的查询

+ Table API是集成在Scala和Java语言内的查询API

+ Table API基于代表"表"的Table类，并提供一整套操作处理的方法API；这些方法会返回一个新的Table对象，表示对输入表应用转换操作的结果

+ 有些关系型转换操作，可以由多个方法调用组成，构成链式调用结构

  ```java
  Table sensorTable = tableEnv.from("inputTable");
  Table resultTable = sensorTable
    .select("id","temperature")
    .filter("id = 'sensor_1'");
  ```

#### 从文件获取数据

+ java代码

  ```java
  package apitest.tableapi;
  
  
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.table.api.DataTypes;
  import org.apache.flink.table.api.Table;
  import org.apache.flink.table.api.bridge.java.StreamTableEnvironment;
  import org.apache.flink.table.descriptors.Csv;
  import org.apache.flink.table.descriptors.FileSystem;
  import org.apache.flink.table.descriptors.Schema;
  import org.apache.flink.types.Row;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/3 3:56 PM
   */
  public class TableTest2_CommonApi {
    public static void main(String[] args) throws Exception {
      // 创建执行环境
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      // 设置并行度为1
      env.setParallelism(1);
  
      StreamTableEnvironment tableEnv = StreamTableEnvironment.create(env);
  
      // 2. 表的创建：连接外部系统，读取数据
      // 2.1 读取文件
      String filePath = "/tmp/Flink_Tutorial/src/main/resources/sensor.txt";
  
      tableEnv.connect(new FileSystem().path(filePath))
        .withFormat(new Csv())
        .withSchema(new Schema()
                    .field("id", DataTypes.STRING())
                    .field("timestamp", DataTypes.BIGINT())
                    .field("temp", DataTypes.DOUBLE())
                   )
        .createTemporaryTable("inputTable");
  
      Table inputTable = tableEnv.from("inputTable");
      //        inputTable.printSchema();
      //        tableEnv.toAppendStream(inputTable, Row.class).print();
  
      // 3. 查询转换
      // 3.1 Table API
      // 简单转换
      Table resultTable = inputTable.select("id, temp")
        .filter("id === 'sensor_6'");
  
      // 聚合统计
      Table aggTable = inputTable.groupBy("id")
        .select("id, id.count as count, temp.avg as avgTemp");
  
      // 3.2 SQL
      tableEnv.sqlQuery("select id, temp from inputTable where id = 'senosr_6'");
      Table sqlAggTable = tableEnv.sqlQuery("select id, count(id) as cnt, avg(temp) as avgTemp from inputTable group by id");
  
      // 打印输出
      tableEnv.toAppendStream(resultTable, Row.class).print("result");
      tableEnv.toRetractStream(aggTable, Row.class).print("agg");
      tableEnv.toRetractStream(sqlAggTable, Row.class).print("sqlagg");
  
      env.execute();
    }
  }
  ```

+ 输出结果

  *里面的false表示上一条保存的记录被删除，true则是新加入的数据*

  *所以Flink的Table API在更新数据时，实际是先删除原本的数据，再添加新数据。*

  ```shell
  result> sensor_6,15.4
  sqlagg> (true,sensor_1,1,35.8)
  sqlagg> (true,sensor_6,1,15.4)
  sqlagg> (true,sensor_7,1,6.7)
  sqlagg> (true,sensor_10,1,38.1)
  agg> (true,sensor_1,1,35.8)
  agg> (true,sensor_6,1,15.4)
  sqlagg> (false,sensor_1,1,35.8)
  sqlagg> (true,sensor_1,2,36.05)
  agg> (true,sensor_7,1,6.7)
  sqlagg> (false,sensor_1,2,36.05)
  sqlagg> (true,sensor_1,3,34.96666666666666)
  agg> (true,sensor_10,1,38.1)
  sqlagg> (false,sensor_1,3,34.96666666666666)
  sqlagg> (true,sensor_1,4,35.5)
  agg> (false,sensor_1,1,35.8)
  agg> (true,sensor_1,2,36.05)
  agg> (false,sensor_1,2,36.05)
  agg> (true,sensor_1,3,34.96666666666666)
  agg> (false,sensor_1,3,34.96666666666666)
  agg> (true,sensor_1,4,35.5)
  ```

#### 数据写入到文件

> [flink Sql 1.11 executeSql报No operators defined in streaming topology. Cannot generate StreamGraph.](https://blog.csdn.net/qq_26502245/article/details/107376528)

​	写入到文件有局限，只能是批处理，且只能是追加写，不能是更新式的随机写。

+ java代码

  ```java
  package apitest.tableapi;
  
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.table.api.DataTypes;
  import org.apache.flink.table.api.Table;
  import org.apache.flink.table.api.bridge.java.StreamTableEnvironment;
  import org.apache.flink.table.descriptors.Csv;
  import org.apache.flink.table.descriptors.FileSystem;
  import org.apache.flink.table.descriptors.Schema;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/3 5:53 PM
   */
  public class TableTest3_FileOutput {
    public static void main(String[] args) throws Exception {
      // 1. 创建环境
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      env.setParallelism(1);
  
      StreamTableEnvironment tableEnv = StreamTableEnvironment.create(env);
  
      // 2. 表的创建：连接外部系统，读取数据
      // 读取文件
      String filePath = "/tmp/Flink_Tutorial/src/main/resources/sensor.txt";
      tableEnv.connect(new FileSystem().path(filePath))
        .withFormat(new Csv())
        .withSchema(new Schema()
                    .field("id", DataTypes.STRING())
                    .field("timestamp", DataTypes.BIGINT())
                    .field("temp", DataTypes.DOUBLE())
                   )
        .createTemporaryTable("inputTable");
  
      Table inputTable = tableEnv.from("inputTable");
      //        inputTable.printSchema();
      //        tableEnv.toAppendStream(inputTable, Row.class).print();
  
      // 3. 查询转换
      // 3.1 Table API
      // 简单转换
      Table resultTable = inputTable.select("id, temp")
        .filter("id === 'sensor_6'");
  
      // 聚合统计
      Table aggTable = inputTable.groupBy("id")
        .select("id, id.count as count, temp.avg as avgTemp");
  
      // 3.2 SQL
      tableEnv.sqlQuery("select id, temp from inputTable where id = 'senosr_6'");
      Table sqlAggTable = tableEnv.sqlQuery("select id, count(id) as cnt, avg(temp) as avgTemp from inputTable group by id");
  
      // 4. 输出到文件
      // 连接外部文件注册输出表
      String outputPath = "/tmp/Flink_Tutorial/src/main/resources/out.txt";
      tableEnv.connect(new FileSystem().path(outputPath))
        .withFormat(new Csv())
        .withSchema(new Schema()
                    .field("id", DataTypes.STRING())
                    //                        配合 aggTable.insertInto("outputTable"); 才使用下面这条
                    //                        .field("cnt", DataTypes.BIGINT())
                    .field("temperature", DataTypes.DOUBLE())
                   )
        .createTemporaryTable("outputTable");
  
      resultTable.insertInto("outputTable");
      // 这条会报错(文件系统输出，不支持随机写，只支持附加写)
      // Exception in thread "main" org.apache.flink.table.api.TableException:
      // AppendStreamTableSink doesn't support consuming update changes which is produced by
      // node GroupAggregate(groupBy=[id], select=[id, COUNT(id) AS EXPR$0, AVG(temp) AS EXPR$1])
      //        aggTable.insertInto("outputTable");
  
      // 旧版可以用下面这条
      //        env.execute();
  
      // 新版需要用这条，上面那条会报错，报错如下
      // Exception in thread "main" java.lang.IllegalStateException:
      // No operators defined in streaming topology. Cannot execute.
      tableEnv.execute("");
    }
  }
  ```

+ 输出结果（输出到out.txt文件）

  ```txt
  sensor_6,15.4
  ```

+ 这个程序只能运行一次，再运行一次报错

  ```shell
  Exception in thread "main" org.apache.flink.runtime.client.JobExecutionException: Job execution failed.
  	at org.apache.flink.runtime.jobmaster.JobResult.toJobExecutionResult(JobResult.java:144)
  	at org.apache.flink.runtime.minicluster.MiniClusterJobClient.lambda$getJobExecutionResult$2(MiniClusterJobClient.java:117)
  	at java.util.concurrent.CompletableFuture.uniApply(CompletableFuture.java:616)
  	at java.util.concurrent.CompletableFuture$UniApply.tryFire(CompletableFuture.java:591)
  	at java.util.concurrent.CompletableFuture.postComplete(CompletableFuture.java:488)
  	at java.util.concurrent.CompletableFuture.complete(CompletableFuture.java:1975)
  	at org.apache.flink.runtime.rpc.akka.AkkaInvocationHandler.lambda$invokeRpc$0(AkkaInvocationHandler.java:238)
  	at java.util.concurrent.CompletableFuture.uniWhenComplete(CompletableFuture.java:774)
  	at java.util.concurrent.CompletableFuture$UniWhenComplete.tryFire(CompletableFuture.java:750)
  	at java.util.concurrent.CompletableFuture.postComplete(CompletableFuture.java:488)
  	at java.util.concurrent.CompletableFuture.complete(CompletableFuture.java:1975)
  	at org.apache.flink.runtime.concurrent.FutureUtils$1.onComplete(FutureUtils.java:1046)
  	at akka.dispatch.OnComplete.internal(Future.scala:264)
  	at akka.dispatch.OnComplete.internal(Future.scala:261)
  	at akka.dispatch.japi$CallbackBridge.apply(Future.scala:191)
  	at akka.dispatch.japi$CallbackBridge.apply(Future.scala:188)
  	at scala.concurrent.impl.CallbackRunnable.run$$$capture(Promise.scala:60)
  	at scala.concurrent.impl.CallbackRunnable.run(Promise.scala)
  	at org.apache.flink.runtime.concurrent.Executors$DirectExecutionContext.execute(Executors.java:73)
  	at scala.concurrent.impl.CallbackRunnable.executeWithValue(Promise.scala:68)
  	at scala.concurrent.impl.Promise$DefaultPromise.$anonfun$tryComplete$1(Promise.scala:284)
  	at scala.concurrent.impl.Promise$DefaultPromise.$anonfun$tryComplete$1$adapted(Promise.scala:284)
  	at scala.concurrent.impl.Promise$DefaultPromise.tryComplete(Promise.scala:284)
  	at akka.pattern.PromiseActorRef.$bang(AskSupport.scala:573)
  	at akka.pattern.PipeToSupport$PipeableFuture$$anonfun$pipeTo$1.applyOrElse(PipeToSupport.scala:22)
  	at akka.pattern.PipeToSupport$PipeableFuture$$anonfun$pipeTo$1.applyOrElse(PipeToSupport.scala:21)
  	at scala.concurrent.Future.$anonfun$andThen$1(Future.scala:532)
  	at scala.concurrent.impl.Promise.liftedTree1$1(Promise.scala:29)
  	at scala.concurrent.impl.Promise.$anonfun$transform$1(Promise.scala:29)
  	at scala.concurrent.impl.CallbackRunnable.run$$$capture(Promise.scala:60)
  	at scala.concurrent.impl.CallbackRunnable.run(Promise.scala)
  	at akka.dispatch.BatchingExecutor$AbstractBatch.processBatch(BatchingExecutor.scala:55)
  	at akka.dispatch.BatchingExecutor$BlockableBatch.$anonfun$run$1(BatchingExecutor.scala:91)
  	at scala.runtime.java8.JFunction0$mcV$sp.apply(JFunction0$mcV$sp.java:12)
  	at scala.concurrent.BlockContext$.withBlockContext(BlockContext.scala:81)
  	at akka.dispatch.BatchingExecutor$BlockableBatch.run(BatchingExecutor.scala:91)
  	at akka.dispatch.TaskInvocation.run(AbstractDispatcher.scala:40)
  	at akka.dispatch.ForkJoinExecutorConfigurator$AkkaForkJoinTask.exec(ForkJoinExecutorConfigurator.scala:44)
  	at akka.dispatch.forkjoin.ForkJoinTask.doExec(ForkJoinTask.java:260)
  	at akka.dispatch.forkjoin.ForkJoinPool$WorkQueue.runTask(ForkJoinPool.java:1339)
  	at akka.dispatch.forkjoin.ForkJoinPool.runWorker(ForkJoinPool.java:1979)
  	at akka.dispatch.forkjoin.ForkJoinWorkerThread.run(ForkJoinWorkerThread.java:107)
  Caused by: org.apache.flink.runtime.JobException: Recovery is suppressed by NoRestartBackoffTimeStrategy
  	at org.apache.flink.runtime.executiongraph.failover.flip1.ExecutionFailureHandler.handleFailure(ExecutionFailureHandler.java:118)
  	at org.apache.flink.runtime.executiongraph.failover.flip1.ExecutionFailureHandler.getFailureHandlingResult(ExecutionFailureHandler.java:80)
  	at org.apache.flink.runtime.scheduler.DefaultScheduler.handleTaskFailure(DefaultScheduler.java:233)
  	at org.apache.flink.runtime.scheduler.DefaultScheduler.maybeHandleTaskFailure(DefaultScheduler.java:224)
  	at org.apache.flink.runtime.scheduler.DefaultScheduler.updateTaskExecutionStateInternal(DefaultScheduler.java:215)
  	at org.apache.flink.runtime.scheduler.SchedulerBase.updateTaskExecutionState(SchedulerBase.java:665)
  	at org.apache.flink.runtime.scheduler.SchedulerNG.updateTaskExecutionState(SchedulerNG.java:89)
  	at org.apache.flink.runtime.jobmaster.JobMaster.updateTaskExecutionState(JobMaster.java:447)
  	at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
  	at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
  	at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
  	at java.lang.reflect.Method.invoke(Method.java:498)
  	at org.apache.flink.runtime.rpc.akka.AkkaRpcActor.handleRpcInvocation(AkkaRpcActor.java:306)
  	at org.apache.flink.runtime.rpc.akka.AkkaRpcActor.handleRpcMessage(AkkaRpcActor.java:213)
  	at org.apache.flink.runtime.rpc.akka.FencedAkkaRpcActor.handleRpcMessage(FencedAkkaRpcActor.java:77)
  	at org.apache.flink.runtime.rpc.akka.AkkaRpcActor.handleMessage(AkkaRpcActor.java:159)
  	at akka.japi.pf.UnitCaseStatement.apply(CaseStatements.scala:26)
  	at akka.japi.pf.UnitCaseStatement.apply(CaseStatements.scala:21)
  	at scala.PartialFunction.applyOrElse(PartialFunction.scala:123)
  	at scala.PartialFunction.applyOrElse$(PartialFunction.scala:122)
  	at akka.japi.pf.UnitCaseStatement.applyOrElse(CaseStatements.scala:21)
  	at scala.PartialFunction$OrElse.applyOrElse(PartialFunction.scala:171)
  	at scala.PartialFunction$OrElse.applyOrElse(PartialFunction.scala:172)
  	at scala.PartialFunction$OrElse.applyOrElse(PartialFunction.scala:172)
  	at akka.actor.Actor.aroundReceive(Actor.scala:517)
  	at akka.actor.Actor.aroundReceive$(Actor.scala:515)
  	at akka.actor.AbstractActor.aroundReceive(AbstractActor.scala:225)
  	at akka.actor.ActorCell.receiveMessage(ActorCell.scala:592)
  	at akka.actor.ActorCell.invoke(ActorCell.scala:561)
  	at akka.dispatch.Mailbox.processMailbox(Mailbox.scala:258)
  	at akka.dispatch.Mailbox.run(Mailbox.scala:225)
  	at akka.dispatch.Mailbox.exec(Mailbox.scala:235)
  	... 4 more
  Caused by: java.io.IOException: File or directory /Users/daodaocrazy/mydocs/docs/study/javadocument/javadocument/IDEA_project/Flink_Tutorial/src/main/resources/out.txt already exists. Existing files and directories are not overwritten in NO_OVERWRITE mode. Use OVERWRITE mode to overwrite existing files and directories.
  	at org.apache.flink.core.fs.FileSystem.initOutPathLocalFS(FileSystem.java:874)
  	at org.apache.flink.core.fs.SafetyNetWrapperFileSystem.initOutPathLocalFS(SafetyNetWrapperFileSystem.java:142)
  	at org.apache.flink.api.common.io.FileOutputFormat.open(FileOutputFormat.java:234)
  	at org.apache.flink.api.java.io.TextOutputFormat.open(TextOutputFormat.java:92)
  	at org.apache.flink.streaming.api.functions.sink.OutputFormatSinkFunction.open(OutputFormatSinkFunction.java:65)
  	at org.apache.flink.api.common.functions.util.FunctionUtils.openFunction(FunctionUtils.java:34)
  	at org.apache.flink.streaming.api.operators.AbstractUdfStreamOperator.open(AbstractUdfStreamOperator.java:102)
  	at org.apache.flink.streaming.api.operators.StreamSink.open(StreamSink.java:46)
  	at org.apache.flink.streaming.runtime.tasks.OperatorChain.initializeStateAndOpenOperators(OperatorChain.java:426)
  	at org.apache.flink.streaming.runtime.tasks.StreamTask.lambda$beforeInvoke$2(StreamTask.java:535)
  	at org.apache.flink.streaming.runtime.tasks.StreamTaskActionExecutor$1.runThrowing(StreamTaskActionExecutor.java:50)
  	at org.apache.flink.streaming.runtime.tasks.StreamTask.beforeInvoke(StreamTask.java:525)
  	at org.apache.flink.streaming.runtime.tasks.StreamTask.invoke(StreamTask.java:565)
  	at org.apache.flink.runtime.taskmanager.Task.doRun(Task.java:755)
  	at org.apache.flink.runtime.taskmanager.Task.run(Task.java:570)
  	at java.lang.Thread.run(Thread.java:748)
  	Suppressed: java.lang.NullPointerException
  		at org.apache.flink.streaming.api.functions.source.ContinuousFileReaderOperator.lambda$cleanUp$1(ContinuousFileReaderOperator.java:499)
  		at org.apache.flink.streaming.api.functions.source.ContinuousFileReaderOperator.cleanUp(ContinuousFileReaderOperator.java:512)
  		at org.apache.flink.streaming.api.functions.source.ContinuousFileReaderOperator.dispose(ContinuousFileReaderOperator.java:441)
  		at org.apache.flink.streaming.runtime.tasks.StreamTask.disposeAllOperators(StreamTask.java:783)
  		at org.apache.flink.streaming.runtime.tasks.StreamTask.runAndSuppressThrowable(StreamTask.java:762)
  		at org.apache.flink.streaming.runtime.tasks.StreamTask.cleanUpInvoke(StreamTask.java:681)
  		at org.apache.flink.streaming.runtime.tasks.StreamTask.invoke(StreamTask.java:585)
  		... 3 more
  ```

#### 读写Kafka

Kafka作为消息队列，和文件系统类似的，只能往里追加数据，不能修改数据。

+ 测试代码

  *（我用的新版Flink和新版kafka连接器，所以version指定"universal"）*

  ```java
  package apitest.tableapi;
  
  import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
  import org.apache.flink.table.api.DataTypes;
  import org.apache.flink.table.api.Table;
  import org.apache.flink.table.api.bridge.java.StreamTableEnvironment;
  import org.apache.flink.table.descriptors.Csv;
  import org.apache.flink.table.descriptors.Kafka;
  import org.apache.flink.table.descriptors.Schema;
  
  /**
   * @author : daodaocrazy email: daodaocrazy@outlook.com
   * @date : 2021/2/3 6:33 PM
   */
  public class TableTest4_KafkaPipeLine {
    public static void main(String[] args) throws Exception {
      // 1. 创建环境
      StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
      env.setParallelism(1);
  
      StreamTableEnvironment tableEnv = StreamTableEnvironment.create(env);
  
      // 2. 连接Kafka，读取数据
      tableEnv.connect(new Kafka()
                       .version("universal")
                       .topic("sensor")
                       .property("zookeeper.connect", "localhost:2181")
                       .property("bootstrap.servers", "localhost:9092")
                      )
        .withFormat(new Csv())
        .withSchema(new Schema()
                    .field("id", DataTypes.STRING())
                    .field("timestamp", DataTypes.BIGINT())
                    .field("temp", DataTypes.DOUBLE())
                   )
        .createTemporaryTable("inputTable");
  
      // 3. 查询转换
      // 简单转换
      Table sensorTable = tableEnv.from("inputTable");
      Table resultTable = sensorTable.select("id, temp")
        .filter("id === 'sensor_6'");
  
      // 聚合统计
      Table aggTable = sensorTable.groupBy("id")
        .select("id, id.count as count, temp.avg as avgTemp");
  
      // 4. 建立kafka连接，输出到不同的topic下
      tableEnv.connect(new Kafka()
                       .version("universal")
                       .topic("sinktest")
                       .property("zookeeper.connect", "localhost:2181")
                       .property("bootstrap.servers", "localhost:9092")
                      )
        .withFormat(new Csv())
        .withSchema(new Schema()
                    .field("id", DataTypes.STRING())
                    //                        .field("timestamp", DataTypes.BIGINT())
                    .field("temp", DataTypes.DOUBLE())
                   )
        .createTemporaryTable("outputTable");
  
      resultTable.insertInto("outputTable");
  
      tableEnv.execute("");
    }
  }
  ```

+ 启动kafka目录里自带的zookeeper

  ```shell
  $ bin/zookeeper-server-start.sh config/zookeeper.properties
  ```

+ 启动kafka服务

  ```shell
  $ bin/kafka-server-start.sh config/server.properties
  ```

+ 新建kafka生产者和消费者

  ```shell
  $ bin/kafka-console-producer.sh --broker-list localhost:9092  --topic sensor
  
  $ bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic sinktest
  ```

+ 启动Flink程序，在kafka生产者console中输入数据，查看输出

  + 输入（kafka-console-producer）

    ```shell
    >sensor_1,1547718199,35.8
    >sensor_6,1547718201,15.4
    >sensor_7,1547718202,6.7
    >sensor_10,1547718205,38.1
    >sensor_6,1547718209,34.5
    ```

  + 输出（kafka-console-consumer）

    代码中，只筛选id为`sensor_6`的，所以输出没有问题

    ```shell
    sensor_6,15.4           
    
    sensor_6,34.5
    
    
    ```

### 11.3.5 更新模式

+ 对于流式查询，需要声明如何在表和外部连接器之间执行转换
+ 与外部系统交换的消息类型，由更新模式（Uadate Mode）指定
+ 追加（Append）模式
  + 表只做插入操作，和外部连接器只交换插入（Insert）消息
+ 撤回（Retract）模式
  + 表和外部连接器交换添加（Add）和撤回（Retract）消息
  + 插入操作（Insert）编码为Add消息；删除（Delete）编码为Retract消息；**更新（Update）编码为上一条的Retract和下一条的Add消息**
+ 更新插入（Upsert）模式
  + 更新和插入都被编码为Upsert消息；删除编码为Delete消息

### 11.3.6 输出到ES

+ 可以创建Table来描述ES中的数据，作为输出的TableSink

  ```java
  tableEnv.connect(
    new Elasticsearch()
    .version("6")
    .host("localhost",9200,"http")
    .index("sensor")
    .documentType("temp")
  )
    .inUpsertMode()
    .withFormat(new Json())
    .withSchema(new Schema()
                .field("id",DataTypes.STRING())
                .field("count",DataTypes.BIGINT())
               )
    .createTemporaryTable("esOutputTable");
  aggResultTable.insertInto("esOutputTable");
  ```

### 11.3.7 输出到MySQL

+ 需要的pom依赖

  Flink专门为Table API的jdbc连接提供了flink-jdbc连接器，需要先引入依赖

  ```xml
  <!-- https://mvnrepository.com/artifact/org.apache.flink/flink-jdbc -->
  <dependency>
      <groupId>org.apache.flink</groupId>
      <artifactId>flink-jdbc_2.12</artifactId>
      <version>1.10.3</version>
      <scope>provided</scope>
  </dependency>
  ```

+ 可以创建Table来描述MySql中的数据，作为输入和输出

  ```java
  String sinkDDL = 
    "create table jdbcOutputTable (" +
    " id varchar(20) not null, " +
    " cnt bigint not null " +
    ") with (" +
    " 'connector.type' = 'jdbc', " +
    " 'connector.url' = 'jdbc:mysql://localhost:3306/test', " +
    " 'connector.table' = 'sensor_count', " +
    " 'connector.driver' = 'com.mysql.jdbc.Driver', " +
    " 'connector.username' = 'root', " +
    " 'connector.password' = '123456' )";
  tableEnv.sqlUpdate(sinkDDL);	// 执行DDL创建表
  aggResultSqlTable.insertInto("jdbcOutputTable");
  ```

## 11.4 表和流的转换

> [Flink- 将表转换成DataStream | 查看执行计划 | 流处理和关系代数的区别 | 动态表 | 流式持续查询的过程 | 将流转换成动态表 | 持续查询 | 将动态表转换成 DS](https://blog.csdn.net/qq_40180229/article/details/106479537)

### 11.4.1 将Table转换成DataStream

+ 表可以转换为 DataStream 或 DataSet ，这样自定义流处理或批处理程序就可以继续在 Table API 或 SQL 查询的结果上运行了

+ 将表转换为 DataStream 或 DataSet 时，需要指定生成的数据类型，即要将表的每一行转换成的数据类型

+ 表作为流式查询的结果，是动态更新的

+ 转换有两种转换模式：追加（Appende）模式和撤回（Retract）模式

+ 追加模式

  + 用于表只会被插入（Insert）操作更改的场景

  ```java
  DataStream<Row> resultStream = tableEnv.toAppendStream(resultTable,Row.class);
  ```

+ 撤回模式

  + 用于任何场景。有些类似于更新模式中Retract模式，它只有Insert和Delete两类操作。

  + **得到的数据会增加一个Boolean类型的标识位（返回的第一个字段），用它来表示到底是新增的数据（Insert），还是被删除的数据（Delete）**。

    *(更新数据，会先删除旧数据，再插入新数据)*

### 11.4.2 将DataStream转换成表

+ 对于一个DataStream，可以直接转换成Table，进而方便地调用Table API做转换操作

  ```java
  DataStream<SensorReading> dataStream = ...
  Table sensorTable = tableEnv.fromDataStream(dataStream);
  ```

+ 默认转换后的Table schema和DataStream中的字段定义一一对应，也可以单独指定出来

  ```java
  DataStream<SensorReading> dataStream = ...
  Table sensorTable = tableEnv.fromDataStream(dataStream,
                                             "id, timestamp as ts, temperature");
  ```

### 11.4.3 创建临时视图(Temporary View)

+ 基于DataStream创建临时视图

  ```java
  tableEnv.createTemporaryView("sensorView",dataStream);
  tableEnv.createTemporaryView("sensorView",
                              dataStream, "id, timestamp as ts, temperature");
  ```

+ 基于Table创建临时视图

  ```java
  tableEnv.createTemporaryView("sensorView", sensorTable);
  ```

## 11.5 查看执行计划

+ Table API 提供了一种机制来解释计算表的逻辑和优化查询计划

+ 查看执行计划，可以通过`TableEnvironment.explain(table)`方法或`TableEnvironment.explain()`方法完成，返回一个字符串，描述三个计划

  + 优化的逻辑查询计划
  + 优化后的逻辑查询计划
  + 实际执行计划

  ```java
  String explaination = tableEnv.explain(resultTable);
  System.out.println(explaination);
  ```

## 11.6 流处理和关系代数的区别

> [Flink- 将表转换成DataStream | 查看执行计划 | 流处理和关系代数的区别 | 动态表 | 流式持续查询的过程 | 将流转换成动态表 | 持续查询 | 将动态表转换成 DS](https://blog.csdn.net/qq_40180229/article/details/106479537)

​	Table API和SQL，本质上还是基于关系型表的操作方式；而关系型表、关系代数，以及SQL本身，一般是有界的，更适合批处理的场景。这就导致在进行流处理的过程中，理解会稍微复杂一些，需要引入一些特殊概念。

​	可以看到，其实**关系代数（主要就是指关系型数据库中的表）和SQL，主要就是针对批处理的，这和流处理有天生的隔阂。**

|                           | 关系代数(表)/SQL           | 流处理                                       |
| ------------------------- | -------------------------- | -------------------------------------------- |
| 处理的数据对象            | 字段元组的有界集合         | 字段元组的无限序列                           |
| 查询（Query）对数据的访问 | 可以访问到完整的数据输入   | 无法访问所有数据，必须持续"等待"流式输入     |
| 查询终止条件              | 生成固定大小的结果集后终止 | 永不停止，根据持续收到的数据不断更新查询结果 |

### 11.6.1 动态表(Dynamic Tables)

​	我们可以**随着新数据的到来，不停地在之前的基础上更新结果**。这样得到的表，在Flink Table API概念里，就叫做“动态表”（Dynamic Tables）。

+ 动态表是 Flink 对流数据的 Table API 和 SQL 支持的核心概念
+ 与表示批处理数据的静态表不同，动态表是随时间变化的
+ 持续查询(Continuous Query)
  + 动态表可以像静态的批处理表一样进行查询，查询一个动态表会产生**持续查询（Continuous Query）**
  + **连续查询永远不会终止，并会生成另一个动态表**
  + 查询（Query）会不断更新其动态结果表，以反映其动态输入表上的更改。

### 11.6.2 动态表和持续查询

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200601190927869.png)

流式表查询的处理过程：

1. 流被转换为动态表

2. 对动态表计算连续查询，生成新的动态表

3. 生成的动态表被转换回流

### 11.6.3 将流转换成动态表

+ 为了处理带有关系查询的流，必须先将其转换为表
+ 从概念上讲，流的每个数据记录，都被解释为对结果表的插入（Insert）修改操作

*本质上，我们其实是从一个、只有插入操作的changelog（更新日志）流，来构建一个表*

*来一条数据插入一条数据*

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200601191016684.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxXzQwMTgwMjI5,size_16,color_FFFFFF,t_70)

### 11.6.4 持续查询

+ 持续查询，会在动态表上做计算处理，并作为结果生成新的动态表。

  *与批处理查询不同，连续查询从不终止，并根据输入表上的更新更新其结果表。*

  *在任何时间点，连续查询的结果在语义上，等同于在输入表的快照上，以批处理模式执行的同一查询的结果。*

​	下图为一个点击事件流的持续查询，是一个分组聚合做count统计的查询。

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200601191112183.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxXzQwMTgwMjI5,size_16,color_FFFFFF,t_70)

### 11.6.4 将动态表转换成 DataStream

+ 与常规的数据库表一样，动态表可以通过插入（Insert）、更新（Update）和删除（Delete）更改，进行持续的修改
+ **将动态表转换为流或将其写入外部系统时，需要对这些更改进行编码**

---

+ 仅追加（Append-only）流

  + 仅通过插入（Insert）更改来修改的动态表，可以直接转换为仅追加流

+ 撤回（Retract）流

  + 撤回流是包含两类消息的流：添加（Add）消息和撤回（Retract）消息

    *动态表通过将INSERT 编码为add消息、DELETE 编码为retract消息、UPDATE编码为被更改行（前一行）的retract消息和更新后行（新行）的add消息，转换为retract流。*

+ Upsert（更新插入流）

  + Upsert流也包含两种类型的消息：Upsert消息和删除（Delete）消息

    *通过将INSERT和UPDATE更改编码为upsert消息，将DELETE更改编码为DELETE消息，就可以将具有唯一键（Unique Key）的动态表转换为流。*

### 11.6.5 将动态表转换成DataStream

![在这里插入图片描述](https://img-blog.csdnimg.cn/20200601191549610.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxXzQwMTgwMjI5,size_16,color_FFFFFF,t_70)

---

[返回总览](../尚硅谷Flink入门到实战-学习笔记) | [上一章：10. 容错机制](./chapter-10) | [下一章：12. 时间特性(Time Attributes)](./chapter-12)
