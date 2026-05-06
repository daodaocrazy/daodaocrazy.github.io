# LeetCode做题笔记

### 739. 每日温度

语言：java

思路：典型的单调栈，一看就是递减栈。如果遇到比栈顶大的数字，就循环出栈，每个出栈数字，计算下标差值。

代码（14ms，87.26%）：

```java
class Solution &#123;
    public int[] dailyTemperatures(int[] T)&#123;

        int len =T.length;
        int[] res = new int[len];

        LinkedList&lt;Integer> stack = new LinkedList&lt;>();
        for(int i = 0;i&lt;len;++i)&#123;
            while(!stack.isEmpty()&&T[stack.peekFirst()]&lt;T[i])&#123;
                int top = stack.pollFirst();
                res[top] = i - top;
            &#125;
            stack.addFirst(i);
        &#125;
        return res;
    &#125;
&#125;
```

参考代码1（3ms）：从后往前，外层for循环表示给每个res\[i]计算结果值，内层for循环表示寻找比res[i]大的值，运用了类似KMP算法的技巧，快速跳过绝对不可能出现匹配的位置。动态规划DP。

> [评论区](https://leetcode-cn.com/problems/daily-temperatures/comments/)

```java
/**
 * 根据题意，从最后一天推到第一天，这样会简单很多。因为最后一天显然不会再有升高的可能，结果直接为0。
 * 再看倒数第二天的温度，如果比倒数第一天低，那么答案显然为1，如果比倒数第一天高，又因为倒数第一天
 * 对应的结果为0，即表示之后不会再升高，所以倒数第二天的结果也应该为0。
 * 自此我们容易观察出规律，要求出第i天对应的结果，只需要知道第i+1天对应的结果就可以：
 * - 若T[i] &lt; T[i+1]，那么res[i]=1；
 * - 若T[i] > T[i+1]
 *   - res[i+1]=0，那么res[i]=0;
 *   - res[i+1]!=0，那就比较T[i]和T[i+1+res[i+1]]（即将第i天的温度与比第i+1天大的那天的温度进行比较）
 */
class Solution &#123;
    public int[] dailyTemperatures(int[] T) &#123;
        if (T.length == 0)
            return new int[0];
        int[] res = new int[T.length];
        for (int i = res.length - 2; i >= 0; i--) &#123;
            for (int j = i + 1; j &lt; res.length; j += res[j]) &#123;
                if (T[j] > T[i]) &#123;
                    res[i] = j - i;
                    break;
                &#125;
                if (res[j] == 0) &#123;
                    break;
                &#125;
            &#125;
        &#125;
        return res;
    &#125;
&#125;
```

### 71. 简化路径

语言：java

思路：简单粗暴地先将字符串以`/`分割成`List`，再用`Deque`模拟路径切换。

代码（6ms，72.88%）：

```java
class Solution &#123;
  public String simplifyPath(String path) &#123;
    List&lt;String> paths = Arrays.asList(path.split("/"));
    Deque&lt;String> res = new LinkedList&lt;>();
    for(int i = 1;i&lt;paths.size();++i)&#123;
      String tmp  = paths.get(i).trim();
      if(tmp.isEmpty()|| ".".equals(tmp))&#123;
        continue;
      &#125;else if("..".equals(tmp))&#123;
        if(!res.isEmpty()) &#123;
          res.removeLast();
        &#125;
      &#125;else&#123;
        res.add(tmp);
      &#125;
    &#125;
    StringBuilder sb = new StringBuilder();
    for(String s:res)&#123;
      sb.append("/").append(s);
    &#125;
    String s = sb.toString();
    return s.equals("")?"/":s;
  &#125;
&#125;
```

参考代码1（1ms，100%）：

直接逐字符判断（主要这个对判断条件的编写比较熟练）。

用空间换时间。（再者最开始故意在最后加个`/`，防止最后一次遇到`/..`时没有处理完）

```java
class Solution &#123;
  public String simplifyPath(String path) &#123;
    path += '/';
    char[] chs = path.toCharArray();
    int top = -1;
    for (char c : chs) &#123;
      if (top == -1 || c != '/') &#123;
        chs[++top] = c;
        continue;
      &#125;
      if (chs[top] == '/') &#123;
        continue;
      &#125;
      if (chs[top] == '.' && chs[top - 1] == '/') &#123;
        top--;
        continue;
      &#125;
      if (chs[top] == '.' && chs[top - 1] == '.' && chs[top - 2] == '/') &#123;
        top -= 2;
        while (top > 0 && chs[--top] != '/') ;
        continue;
      &#125;
      chs[++top] = c;
    &#125;
    if (top > 0 && chs[top] == '/') top--;
    return new String(chs, 0, top + 1);
  &#125;
&#125;
```

参考代码2（5ms，91.252%）：和我的思路是一样的。

```java
class Solution &#123;
  public String simplifyPath(String path) &#123;
    String[] paths = path.split("\\/");
    LinkedList&lt;String> stack = new LinkedList&lt;>();

    for(String p:paths)&#123;
      if(p.equals(".") || p.equals(""))&#123;
        continue;
      &#125; else if(p.equals(".."))&#123;
        stack.pollLast();
      &#125; else &#123;
        stack.offer(p);
      &#125;
    &#125;

    StringBuffer sb = new StringBuffer();
    if(stack.isEmpty())&#123;
      return "/";
    &#125;
    for(String s:stack)&#123;
      sb.append("/");
      sb.append(s);
    &#125;
    return sb.toString();
  &#125;
&#125;
```

参考代码3（9ms，31.30%）：

> [栈](https://leetcode-cn.com/problems/simplify-path/solution/zhan-by-powcai/)

这个其实和前面的双向队列一个意思。

```java
class Solution &#123;
    public String simplifyPath(String path) &#123;
        Deque&lt;String> stack = new LinkedList&lt;>();
        for (String item : path.split("/")) &#123;
            if (item.equals("..")) &#123;
                if (!stack.isEmpty()) stack.pop();
            &#125; else if (!item.isEmpty() && !item.equals(".")) stack.push(item);
        &#125;
        String res = "";
        for (String d : stack) res = "/" + d + res;
        return res.isEmpty() ? "/" : res;  
    &#125;
&#125;
```

###  93. 复原IP地址

语言：java

思路：超暴力for循环拆分ip，然后判断数值范围是否符合，符合的加入结果集。

代码（11ms，12.41%）：

```java
class Solution &#123;
  public List&lt;String> restoreIpAddresses(String s) &#123;
    List&lt;String> res = new LinkedList&lt;>();
    int len = s.length();
    if (len &lt; 4 || len > 12) &#123;
      return res;
    &#125;

    // a=3,b=6,c=9
    Integer part1;
    Integer part2;
    Integer part3;
    Integer part4;

    for (int a = 1; a &lt;= 3 && a &lt;= len - 3; ++a) &#123;
      part1 = Integer.parseInt(s.substring(0, a));
      if (part1 &lt;= 255&&(a==1||part1>=Math.pow(10,a-1))) &#123;
        for (int b = a+1; b &lt;= a + 3 && b &lt;= len - 2; ++b) &#123;
          part2 = Integer.parseInt(s.substring(a, b));
          if (part2 &lt;= 255&&(b == a+1||part2>=Math.pow(10,b-a-1))) &#123;
            for (int c = b+1; c &lt;= b + 3 && c &lt;= len - 1; ++c) &#123;
              part3 = Integer.parseInt(s.substring(b, c));
              if (part3 &lt;= 255&&(c == b+1||part3>=Math.pow(10,c-b-1))) &#123;
                if (c >= len - 3) &#123;
                  part4 = Integer.parseInt(s.substring(c, len));
                  if (part4 &lt;= 255&&(len == (c+1)||part4>=Math.pow(10,len-c-1))) &#123;
                    res.add(part1 + "." + part2 + "." + part3 + "." + part4);
                  &#125;
                &#125;
              &#125;
            &#125;
          &#125;
        &#125;
      &#125;
    &#125;
    return res;
  &#125;
&#125;
```

参考代码1（1ms）：DFS

> [复原IP地址--官方题解](https://leetcode-cn.com/problems/restore-ip-addresses/solution/fu-yuan-ipdi-zhi-by-leetcode-solution/)

```java
class Solution &#123;
    static final int SEG_COUNT = 4;
    List&lt;String> ans = new ArrayList&lt;String>();
    int[] segments = new int[SEG_COUNT];

    public List&lt;String> restoreIpAddresses(String s) &#123;
        segments = new int[SEG_COUNT];
        dfs(s, 0, 0);
        return ans;
    &#125;

    public void dfs(String s, int segId, int segStart) &#123;
        // 如果找到了 4 段 IP 地址并且遍历完了字符串，那么就是一种答案
        if (segId == SEG_COUNT) &#123;
            if (segStart == s.length()) &#123;
                StringBuffer ipAddr = new StringBuffer();
                for (int i = 0; i &lt; SEG_COUNT; ++i) &#123;
                    ipAddr.append(segments[i]);
                    if (i != SEG_COUNT - 1) &#123;
                        ipAddr.append('.');
                    &#125;
                &#125;
                ans.add(ipAddr.toString());
            &#125;
            return;
        &#125;

        // 如果还没有找到 4 段 IP 地址就已经遍历完了字符串，那么提前回溯
        if (segStart == s.length()) &#123;
            return;
        &#125;

        // 由于不能有前导零，如果当前数字为 0，那么这一段 IP 地址只能为 0
        if (s.charAt(segStart) == '0') &#123;
            segments[segId] = 0;
            dfs(s, segId + 1, segStart + 1);
        &#125;

        // 一般情况，枚举每一种可能性并递归
        int addr = 0;
        for (int segEnd = segStart; segEnd &lt; s.length(); ++segEnd) &#123;
            addr = addr * 10 + (s.charAt(segEnd) - '0');
            if (addr > 0 && addr &lt;= 0xFF) &#123;
                segments[segId] = addr;
                dfs(s, segId + 1, segEnd + 1);
            &#125; else &#123;
                break;
            &#125;
        &#125;
    &#125;
&#125;
```

参考代码2（3ms）：回溯剪枝

> [回溯算法（画图分析剪枝条件）](https://leetcode-cn.com/problems/restore-ip-addresses/solution/hui-su-suan-fa-hua-tu-fen-xi-jian-zhi-tiao-jian-by/)

```java
public class Solution &#123;

  public List&lt;String> restoreIpAddresses(String s) &#123;
    int len = s.length();
    List&lt;String> res = new ArrayList&lt;>();
    if (len > 12 || len &lt; 4) &#123;
      return res;
    &#125;

    Deque&lt;String> path = new ArrayDeque&lt;>(4);
    dfs(s, len, 0, 4, path, res);
    return res;
  &#125;

  // 需要一个变量记录剩余多少段还没被分割

  private void dfs(String s, int len, int begin, int residue, Deque&lt;String> path, List&lt;String> res) &#123;
    if (begin == len) &#123;
      if (residue == 0) &#123;
        res.add(String.join(".", path));
      &#125;
      return;
    &#125;

    for (int i = begin; i &lt; begin + 3; i++) &#123;
      if (i >= len) &#123;
        break;
      &#125;

      if (residue * 3 &lt; len - i) &#123;
        continue;
      &#125;

      if (judgeIpSegment(s, begin, i)) &#123;
        String currentIpSegment = s.substring(begin, i + 1);
        path.addLast(currentIpSegment);

        dfs(s, len, i + 1, residue - 1, path, res);
        path.removeLast();
      &#125;
    &#125;
  &#125;

  private boolean judgeIpSegment(String s, int left, int right) &#123;
    int len = right - left + 1;
    if (len > 1 && s.charAt(left) == '0') &#123;
      return false;
    &#125;

    int res = 0;
    while (left &lt;= right) &#123;
      res = res * 10 + s.charAt(left) - '0';
      left++;
    &#125;

    return res >= 0 && res &lt;= 255;
  &#125;
&#125;
```

参考1后重写（1ms，99.91%）：

惭愧，最近老久没写题了，第一反应这题就是DFS+剪枝，但是没写成，后面就还是老实暴力解法了。

这里DFS的注意点就是

+ 每次DFS判断一个部分（拆分IP为4部分）
+ 某部分开头是0，那么只能这部分为0，直接下一轮DFS。
+ 返回条件
  + 已经4部分（不管是否还有剩余，无剩余字符说明正常则添加到答案中，否则不添加就好了）
  + 已经遍历到字符串尾部（还没有4部分就没得判断了）

```java
class Solution00&#123;

  int[] segments = new int[4];
  List&lt;String> res = new LinkedList&lt;>();

  public List&lt;String> restoreIpAddresses(String s) &#123;
    dfs(s,0,0);
    return res;
  &#125;

  /**
         *
         * @param s 原字符串
         * @param segId 第X部分的IP地址（拆分IP为四部分）
         * @param start 第X部分从下标start开始
         */
  public void dfs(String s,int segId,int start)&#123;
    // 总共就4部分 0,1,2,3。
    if(segId==4)&#123;
      if(start==s.length())&#123;
        StringBuilder sb = new StringBuilder();
        sb.append(segments[0]);
        for(int i = 1 ;i&lt;4;++i)&#123;
          sb.append(".").append(segments[i]);
        &#125;
        res.add(sb.toString());
      &#125;
      return ;
    &#125;

    // 提前遍历完（不足4部分）
    if(start == s.length())&#123;
      return;
    &#125;

    // 首位0，那么只能是0，不允许 "023 => 23"的形式
    if(s.charAt(start)=='0')&#123;
      segments[segId] = 0;
      dfs(s,segId+1, start+1);
      return ;
    &#125;

    for(int i= start,sum = 0;i&lt;s.length();++i)&#123;
      sum *=10;
      sum += s.charAt(i) - '0';
      if(sum &lt;=255)&#123;
        segments[segId] = sum;
        dfs(s,segId+1,i+1);
      &#125;else&#123;
        break;
      &#125;
    &#125;
  &#125;
&#125;
```

### 695. 岛屿的最大面积

语言：java

思路：常见的岛屿问题。这里算面积，就把面积变量当作静态成员变量，然后其他代码和常见的岛屿问题一致。

代码（2ms，100%）：

```java
class Solution &#123;
  int area = 0;

  public int maxAreaOfIsland(int[][] grid) &#123;
    int res = 0;
    for (int i = 0, tmp; i &lt; grid.length; ++i) &#123;
      for (int j = 0; j &lt; grid[0].length; ++j) &#123;
        if (grid[i][j] == 1) &#123;
          dfs(grid, i, j);
          res = Math.max(res, area);
          area = 0;
        &#125;
      &#125;
    &#125;
    return res;
  &#125;


  public void dfs(int[][] grid, int x, int y) &#123;
    if(x&lt;0||x>=grid.length||y&lt;0||y>=grid[0].length||grid[x][y]!=1)&#123;
      return ;
    &#125;
    grid[x][y] = 0;
    ++area;
    dfs(grid,x-1,y); // 上
    dfs(grid,x+1,y); // 下
    dfs(grid,x,y-1); // 左
    dfs(grid,x,y+1); // 右
  &#125;
&#125;
```

### 75. 颜色分类

语言：java

思路：最右边都是2，左边要么是0，要么是1。

+ 数字2是最无歧义的，所以表示数字2所在的数组下标的指针用`twoIdx`表示，且初值为`nums.length-1`，即最后一个元素的位置。（就算没有2也无所谓，反正一定会遍历到最后一个位置）,另外数字0和数字1下标从0开始，这两个数字不确定有谁，都是从第一个元素开始遍历。
+ 最外层循环条件，即表示数字0或者数字1的指针下标`zeroIdx`和`oneIdx`要小于`twoIdx`。这个没啥歧义，不管到底输入数组中有没有数字2，`twoIdx`反正充当右边界一般的存在。
+ 我们主要操作的指针就是`oneIdx`,这个正好夹在0和2之间的数字1的下标。（个人感觉方便判断）
+ 循环内，注意先判断`nums[oneIdx]>1`的情况，后考虑`nums[oneIdx]&lt;1`的情况。
  + `nums[oneIdx]>1`时，和`nums[twoIdx]`对调后，此时`nums[oneIdx]`的数字是`&lt;=2`的，就算还是2，之后下一轮循环还是可以替换。（而且`oneIdx`和`twoIdx`两个指针一个从左到右，一个从右到左，互不影响）
  + `nuns[oneIdx]&lt;1`时，同理和`nums[zeroIdx]`对调，由于`zeroIdx`和`oneIdx`都是从左往右，之后需要考虑怎么移动`oneIdx`。
+ 题目要求"000...11..2222"这种形式，那么`oneIdx`应该尽可能让他一直指向数字1所在的位置。所以循环中每轮当`nums[oneIdx]&lt;=1`，就`++oneIdx`，如果原本`nums[oneIdx]==0`，那么也在前面的判断时和`nums[zeroIdx]`对调了。

代码（0ms，100%）：

```java
class Solution &#123;
  public void sortColors(int[] nums) &#123;
    int zeroIdx = 0,oneIdx = 0,twoIdx = nums.length-1;
    while(zeroIdx&lt;=twoIdx&&oneIdx&lt;=twoIdx)&#123;
      if(nums[oneIdx]>1)&#123;
        nums[oneIdx] = nums[twoIdx];
        nums[twoIdx--]=2;
      &#125;
      if(nums[oneIdx]&lt;1)&#123;
        nums[oneIdx] = nums[zeroIdx];
        nums[zeroIdx++] = 0;
      &#125;
      if(nums[oneIdx]&lt;=1)&#123;
        ++oneIdx;
      &#125;
    &#125;
  &#125;
&#125;
```

### 最小的K个数

> [面试题 17.14. 最小K个数](https://leetcode-cn.com/problems/smallest-k-lcci/)

语言：java

思路：最简单的就是堆排序（因为java有现成的PriorityQueue），其次就是需要手写的快速选择。

代码1（38ms，11%）：堆排序

```java
class Solution &#123;
  public int[] smallestK(int[] arr, int k) &#123;
    PriorityQueue&lt;Integer> maxStack = new PriorityQueue&lt;>((x, y) -> y - x);
    for (int num : arr) &#123;
      if (maxStack.size() &lt; k) &#123;
        maxStack.add(num);
      &#125; else if (maxStack.size()>0&&maxStack.peek() > num) &#123;
        maxStack.poll();
        maxStack.add(num);
      &#125;
    &#125;
    int[] res = new int[k];
    for (int i = 0; i &lt; k; ++i) &#123;
      res[i] = maxStack.poll();
    &#125;
    return res;
  &#125;
&#125;
```

代码2（2ms，99.277%）：快速选择

```java
class Solution &#123;
  public int[] smallestK(int[] arr, int k) &#123;
    int left = 0, right = arr.length - 1;
    while (left&lt;right) &#123;
      int pos = quickSelect(arr, left, right);
      if (pos == k - 1) &#123;
        break;
      &#125; else if (pos > k - 1) &#123;
        right = pos - 1;
      &#125; else &#123;
        left = pos + 1;
      &#125;
    &#125;
    int[] res =  new int[k];
    System.arraycopy(arr, 0, res, 0, k);
    return res;
  &#125;

  public int quickSelect(int[] arr, int left, int right) &#123;
    int pivot = arr[left];
    int start = left;
    while (true) &#123;
      while (left &lt; right && arr[right] >= pivot) &#123;
        --right;
      &#125;
      while (left &lt; right && arr[left] &lt;= pivot) &#123;
        ++left;
      &#125;
      if (left >= right) &#123;
        break;
      &#125;
      exchange(arr, left, right);
    &#125;
    exchange(arr, start, left);
    return left;
  &#125;

  public void exchange(int[] arr, int a, int b) &#123;
    int tmp = arr[a];
    arr[a] = arr[b];
    arr[b] = tmp;
  &#125;
&#125;
```

参考代码1（1ms，100%）：

```java
class Solution &#123;
  public int[] smallestK(int[] arr, int k) &#123;
    // 快排 分堆
    int low=0,hi=arr.length-1;
    while (low&lt;hi)&#123;
      int pos=partition(arr,low,hi);
      if(pos==k-1) break;
      else if(pos>k-1) hi=pos-1;
      else low=pos+1;
    &#125;
    int[] dest=new int[k];
    System.arraycopy(arr,0,dest,0,k);
    return dest;
  &#125;
  private int partition(int[] arr,int low,int hi)&#123;
    int v=arr[low];
    int i=low,j=hi+1;
    while (true)&#123;
      while (arr[++i]&lt;v) if(i==hi) break;
      while (arr[--j]>v) if(j==low) break;
      if(i>=j) break;
      exchange(arr,i,j);
    &#125;
    exchange(arr,low,j);
    return j;
  &#125;
  private void exchange(int[] arr,int i,int j)&#123;
    int temp=arr[i];
    arr[i]=arr[j];
    arr[j]=temp;
  &#125;
&#125;
```

###  518. 零钱兑换 II

> [518. 零钱兑换 II](https://leetcode-cn.com/problems/coin-change-2/)

语言：java

思路：动态规划。大的零钱兑换拆分成小的零钱兑换。

代码（3ms，82.22%）：

```java
class Solution &#123;
  public int change(int amount, int[] coins) &#123;
    int[] dp = new int[amount+1];
    dp[0] = 1;
    for(int coin:coins)&#123;
      for(int i = coin;i&lt;=amount;++i)&#123;
        dp[i] += dp[i-coin];
      &#125;
    &#125;
    return dp[amount];
  &#125;
&#125;
```

参考代码1（2ms，100%）：看着是一样的，但是莫名快1ms？

```java
class Solution &#123;
  public int change(int amount, int[] coins) &#123;
    int[] dp = new int[amount + 1];
    dp[0] = 1;
    for (int coin : coins) &#123;
      for (int i = coin; i &lt;= amount; i++) &#123;
        dp[i] += dp[i - coin];
      &#125;
    &#125;
    return dp[amount];
  &#125;
&#125;
```

### 416. 分割等和子集

> [416. 分割等和子集](https://leetcode-cn.com/problems/partition-equal-subset-sum/)
>
> [分割等和子集--官方题解](https://leetcode-cn.com/problems/partition-equal-subset-sum/solution/fen-ge-deng-he-zi-ji-by-leetcode-solution/)
>
> [动态规划（转换为 0-1 背包问题）](https://leetcode-cn.com/problems/partition-equal-subset-sum/solution/0-1-bei-bao-wen-ti-xiang-jie-zhen-dui-ben-ti-de-yo/)

语言：java

思路：这个动态规划不是很好想，建议直接看官方题解。

代码（88ms，5.00%）：慢到极致

```java
class Solution &#123;
  public boolean canPartition(int[] nums) &#123;

    // (1) 数组长度&lt;2，那么不可能拆分成两个非空数组
    if (nums.length &lt; 2) &#123;
      return false;
    &#125;

    // (2) 计算数组和
    int sum = 0, max = 0;
    for (int num : nums) &#123;
      sum += num;
      if (max &lt; num) &#123;
        max = num;
      &#125;
    &#125;
    // (3) 数组和为奇数，不可能拆分成两个等和数组
    if (sum%2 == 1) &#123;
      return false;
    &#125;

    // (4) 等下寻找数组和为一半的其中一个数组就好了 sum = sum / 2;
    sum /= 2;

    // (5) 如果 max大于 总和的一半，说明不可能拆分数组
    if (max > sum) &#123;
      return false;
    &#125;

    // (6) 动态规划， i 属于 [0 ～ length) , j 属于[0,sum]，dp[i][j]表示从[0，i]中拿任意个数字，且和为j
    boolean[][] dp = new boolean[nums.length][sum + 1];
    for (boolean[] bool : dp) &#123;
      bool[0] = true; // dp[i][0] = true
    &#125;
    dp[0][nums[0]] = true;

    // j >= num[i]时, dp[i][j] = dp[i-1][j] | dp[i][j-num[i]];
    // j &lt; num[i] 时, dp[i][j] = dp[i-1][j]
    for (int i = 1; i &lt; nums.length; ++i) &#123;
      for (int j = 1; j &lt;= sum; ++j) &#123;
        if (j >= nums[i]) &#123;
          dp[i][j] = dp[i - 1][j] | dp[i-1][j - nums[i]];
        &#125; else &#123;
          dp[i][j] = dp[i - 1][j];
        &#125;
      &#125;
    &#125;
    return dp[nums.length-1][sum];
  &#125;
&#125;
```

参考代码1（47ms，24.31%）：

> [分割等和子集--官方题解](https://leetcode-cn.com/problems/partition-equal-subset-sum/solution/fen-ge-deng-he-zi-ji-by-leetcode-solution/)

```java
class Solution &#123;
  public boolean canPartition(int[] nums) &#123;
    int n = nums.length;
    if (n &lt; 2) &#123;
      return false;
    &#125;
    int sum = 0, maxNum = 0;
    for (int num : nums) &#123;
      sum += num;
      maxNum = Math.max(maxNum, num);
    &#125;
    if (sum % 2 != 0) &#123;
      return false;
    &#125;
    int target = sum / 2;
    if (maxNum > target) &#123;
      return false;
    &#125;
    boolean[][] dp = new boolean[n][target + 1];
    for (int i = 0; i &lt; n; i++) &#123;
      dp[i][0] = true;
    &#125;
    dp[0][nums[0]] = true;
    for (int i = 1; i &lt; n; i++) &#123;
      int num = nums[i];
      for (int j = 1; j &lt;= target; j++) &#123;
        if (j >= num) &#123;
          dp[i][j] = dp[i - 1][j] | dp[i - 1][j - num];
        &#125; else &#123;
          dp[i][j] = dp[i - 1][j];
        &#125;
      &#125;
    &#125;
    return dp[n - 1][target];
  &#125;
&#125;
```

参考代码2（21ms，69.797%）：优化空间复杂度

> [分割等和子集--官方题解](https://leetcode-cn.com/problems/partition-equal-subset-sum/solution/fen-ge-deng-he-zi-ji-by-leetcode-solution/)

```java
class Solution &#123;
  public boolean canPartition(int[] nums) &#123;
    int n = nums.length;
    if (n &lt; 2) &#123;
      return false;
    &#125;
    int sum = 0, maxNum = 0;
    for (int num : nums) &#123;
      sum += num;
      maxNum = Math.max(maxNum, num);
    &#125;
    if (sum % 2 != 0) &#123;
      return false;
    &#125;
    int target = sum / 2;
    if (maxNum > target) &#123;
      return false;
    &#125;
    boolean[] dp = new boolean[target + 1];
    dp[0] = true;
    for (int i = 0; i &lt; n; i++) &#123;
      int num = nums[i];
      for (int j = target; j >= num; --j) &#123;
        dp[j] |= dp[j - num];
      &#125;
    &#125;
    return dp[target];
  &#125;
&#125;
```

参考2后重写（23ms，65.83%）：

```java
public class Solution &#123;

  public boolean canPartition(int[] nums) &#123;

    // (1) 数组长度&lt;2，那么不可能拆分成两个非空数组
    if (nums.length &lt; 2) &#123;
      return false;
    &#125;

    // (2) 计算数组和
    int sum = 0, max = 0;
    for (int num : nums) &#123;
      sum += num;
      if (max &lt; num) &#123;
        max = num;
      &#125;
    &#125;
    // (3) 数组和为奇数，不可能拆分成两个等和数组
    if ((sum & 1) == 1) &#123;
      return false;
    &#125;

    // (4) 等下寻找数组和为一半的其中一个数组就好了 sum = sum / 2;
    sum /= 2;

    // (5) 如果 max大于 总和的一半，说明不可能拆分数组
    if (max > sum) &#123;
      return false;
    &#125;

    // (6) 动态规划, j 属于[0,sum]，dp[j]表示从[0，i]中拿任意个数字，且和为j
    boolean[] dp = new boolean[sum + 1];
    dp[0] = true;

    // j == sum , return true
    // j &lt; num[i] 时, dp[i][j] = dp[i-1][j]
    for (int i = 0; i &lt; nums.length; ++i) &#123;
      for (int j = sum; j >= nums[i]; --j) &#123;
        dp[j] |= dp[j - nums[i]];
      &#125;
    &#125;
    return dp[sum];
  &#125;
&#125;
```

### 474. 一和零

> [474. 一和零](https://leetcode-cn.com/problems/ones-and-zeroes/)

语言：java

思路：参考该文章[动态规划（转换为 0-1 背包问题）](https://leetcode-cn.com/problems/partition-equal-subset-sum/solution/0-1-bei-bao-wen-ti-xiang-jie-zhen-dui-ben-ti-de-yo/)后，没想到一次写成。

类似0-1背包问题，这里把字符"0"和字符"1"当作消耗品，然后用来购买`strs`字符串。

状态转移方程：

`dp[j][k] = Math.max(dp[j][k],dp[j-strs[i].zeroCount][k-strs[i].oneCount]+1)`，其中j表示字符0的库存，k表示字符1的库存。这里逆序遍历j和k，因为j和k是消耗品，分别原库存是m和n。

`dp[j][k]`表示字符0和1的库存分别为j和k的情况下最多能换取的字符串数量。

代码（31ms，99.32%）：

```java
class Solution &#123;
  public int findMaxForm(String[] strs, int m, int n) &#123;
    int[][] dp = new int[m + 1][n + 1];
    //        int max = 0;
    //dp[i][j] = Math.max(dp[i-strs[i].zero][j-str[i].one]+1,dp[i][j]);
    for (int i = 0; i &lt; strs.length; ++i) &#123;
      int zeroCount = zeroCount(strs, i);
      int oneCount = oneCount(strs, i);
      for (int j = m; j >= zeroCount; --j) &#123;
        for (int k = n; k >= oneCount; --k) &#123;
          dp[j][k] = Math.max(dp[j][k], dp[j-zeroCount][k-oneCount]+1);
        &#125;
      &#125;
    &#125;
    return dp[m][n];
  &#125;

  public int zeroCount(String[] strs, int index) &#123;
    int count = 0;
    for (int i = 0; i &lt; strs[index].length(); ++i) &#123;
      if (strs[index].charAt(i) == '0') &#123;
        ++count;
      &#125;
    &#125;
    return count;
  &#125;

  public int oneCount(String[] strs, int index) &#123;
    int count = 0;
    for (int i = 0; i &lt; strs[index].length(); ++i) &#123;
      if (strs[index].charAt(i) == '1') &#123;
        ++count;
      &#125;
    &#125;
    return count;
  &#125;
&#125;
```

参考代码1（31ms，99.32%）：思路一样，就是记录0和1的数量的逻辑简化了。

```java
class Solution &#123;
  public int findMaxForm(String[] strs, int m, int n) &#123;
    int[][] dp = new int[m + 1][n + 1];
    int len = strs.length;
    int[][] matrix = new int[len][2];
    for(int i = 0; i &lt; len; i++)&#123;
      String str = strs[i];
      for(int j = 0; j &lt; str.length(); j++)&#123;
        if(str.charAt(j) == '0') matrix[i][0]++; 
        else matrix[i][1]++;
      &#125;
      int zero = matrix[i][0];
      int one = matrix[i][1];
      for(int x = m; x >= zero; x--)&#123;
        for(int y = n; y >= one; y--)&#123;
          dp[x][y] = Math.max(dp[x][y], 1 + dp[x - zero][y - one]);
        &#125;
      &#125;
    &#125;
    return dp[m][n];
  &#125;
&#125;
```

### 530. 二叉搜索树的最小绝对差

> [530. 二叉搜索树的最小绝对差](https://leetcode-cn.com/problems/minimum-absolute-difference-in-bst/)

语言：java

思路：先DFS前序遍历，用最小堆存储所有节点，然后再逐一计算差值。

代码（7ms，6.71%）：慢到极致

```java
/**
 * Definition for a binary tree node.
 * public class TreeNode &#123;
 *     int val;
 *     TreeNode left;
 *     TreeNode right;
 *     TreeNode(int x) &#123; val = x; &#125;
 * &#125;
 */
class Solution &#123;

  int res = Integer.MAX_VALUE;
  PriorityQueue&lt;Integer> queue = new PriorityQueue&lt;>();

  public int getMinimumDifference(TreeNode root) &#123;
    dfs(root);
    int first = queue.poll(),second;
    while(!queue.isEmpty())&#123;
      second = queue.poll();
      res = Math.min(res,Math.abs(first-second));
      first = second;
    &#125;
    return res;
  &#125;


  public void dfs(TreeNode cur) &#123;
    if (cur == null) &#123;
      return;
    &#125;
    queue.add(cur.val);
    dfs(cur.left);
    dfs(cur.right);
  &#125;

&#125;
```

参考代码1（0ms）：直接中序遍历，边计算差值。（这里我才反应起来，原来这个题目是二叉搜索树，那么中序遍历保证数值从小到大排序，这样只要遍历过程中计算差值即可）

```java
class Solution &#123;
  int ans = Integer.MAX_VALUE, prev = -1;
  public int getMinimumDifference(TreeNode root) &#123;
    getMinimumDifference0(root);
    return ans;
  &#125;
  private void getMinimumDifference0(TreeNode node) &#123;
    if (node != null) &#123;
      getMinimumDifference0(node.left);
      if (prev != -1) ans = Math.min(ans, node.val - prev);
      prev = node.val;
      getMinimumDifference0(node.right);
    &#125;
  &#125;
&#125;
```

### 977. 有序数组的平方

> [977. 有序数组的平方](https://leetcode-cn.com/problems/squares-of-a-sorted-array/)

语言：java

思路：偷懒的直接计算平方，然后调用库函数快排。

代码（4ms，15.68%）：

```java
class Solution &#123;
  public int[] sortedSquares(int[] A) &#123;
    int len = A.length, head = 0, tail = len - 1, index = 0;
    int[] res = new int[len];
    for (int i = 0; i &lt; len; ++i) &#123;
      res[i] = A[i] * A[i];
    &#125;
    Arrays.sort(res);
    return res;
  &#125;
&#125;
```

参考代码1（1ms，100%）：双指针，主要需要注意的是从尾部开始填充。因为题目保证非递减，所以从可能是最大值的两个边界同时向中间判断。比起所有遍历过的数字的最小值，最大值可以确定，所以从数组最后一个数字开始往前填充。

```java
class Solution &#123;
  public int[] sortedSquares(int[] A) &#123;
    int start = 0;
    int end = A.length-1;
    int i = end;
    int[] B = new int[A.length];
    while(i >= 0)&#123;
      B[i--] = A[start]*A[start] >= A[end]*A[end]? A[start]*A[start++]:A[end]*A[end--];
    &#125;
    return B;
  &#125;
&#125;
```

代码2（1ms，100%）：两边双指针，找平方后比较大的数字，往新数组的最右边存储。

```java
class Solution &#123;
  public int[] sortedSquares(int[] nums) &#123;
    int left = 0,right = nums.length -1,newNumsRight = right;
    int[] newNums = new int[nums.length];
    while(left &lt;= right) &#123;
      int leftNum = nums[left] * nums[left];
      int rightNum = nums[right] * nums[right];
      if(rightNum >= leftNum) &#123;
        newNums[newNumsRight--] = rightNum;
        --right;
      &#125; else &#123;
        newNums[newNumsRight--] = leftNum;
        ++left;
      &#125;
    &#125;
    return newNums;
  &#125;
&#125;
```

### 52. N皇后 II

>[52. N皇后 II](https://leetcode-cn.com/problems/n-queens-ii/)

语言：java

思路：DFS。原本我写了一个，让count计数器为static的时候，后台会误判！！！！这个我踩坑了。

代码（2ms，56.40%）：

```java
class Solution &#123;
  
  int count = 0;

  public int totalNQueens(int n) &#123;
    // (1) 地图 map[x] = y;
    int[] map = new int[n];

    // (2) 第一行每个位置都试一遍。
    for(int col = 0;col&lt;n;++col)&#123;
      map[0] = col;
      dfs(map,n,1);
    &#125;

    return count;
  &#125;

  public void dfs(int[] map, int n, int row) &#123;
    // 走到边界，return
    if (row == n) &#123;
      ++count;
      return;
    &#125;
    for(int col = 0;col&lt;n;++col)&#123;
      map[row] = col;
      if(canSet(map,row,col))&#123;
        dfs(map,n,row+1);
      &#125;
    &#125;
  &#125;

  public boolean canSet(int[] map,int row,int col)&#123;

    for(int i = 0;i&lt;row;++i)&#123;
      // 竖直方向 判断
      if(map[i]==col)&#123;
        return false;
      &#125;
      // 撇方向 判断
      if( i + map[i] ==row+col)&#123;
        return false;
      &#125;
      // 捺方向 判断
      if(i - map[i] == row-col)&#123;
        return false;
      &#125;
    &#125;
    return true;
  &#125;
&#125;
```

参考代码1（0ms）：

> [N皇后 II--官方题解](https://leetcode-cn.com/problems/n-queens-ii/solution/nhuang-hou-ii-by-leetcode-solution/)

```java
class Solution &#123;
  public int totalNQueens(int n) &#123;
    return solve(n, 0, 0, 0, 0);
  &#125;

  public int solve(int n, int row, int columns, int diagonals1, int diagonals2) &#123;
    if (row == n) &#123;
      return 1;
    &#125; else &#123;
      int count = 0;
      int availablePositions = ((1 &lt;&lt; n) - 1) & (~(columns | diagonals1 | diagonals2));
      while (availablePositions != 0) &#123;
        int position = availablePositions & (-availablePositions);
        availablePositions = availablePositions & (availablePositions - 1);
        count += solve(n, row + 1, columns | position, (diagonals1 | position) &lt;&lt; 1, (diagonals2 | position) >> 1);
      &#125;
      return count;
    &#125;
  &#125;
&#125;
```

参考代码2（2ms，56.40%）：我原本代码和这个差不多，就判断冲突的方法写的形式略不同

```java
class Solution &#123;
  int n;
  int[] res; //记录每种方案的皇后放置索引
  int count = 0; //总方案数
  public int totalNQueens(int n) &#123;
    this.n = n;
    this.res = new int[n];
    check(0); // 第0行开始放置
    return count;
  &#125;
  //放置第k行
  public void check(int k) &#123;
    if(k == n) &#123;
      count++;
      return;
    &#125;
    for(int i = 0; i &lt; n; i++) &#123;
      res[k] = i;  // 将位置i 放入索引数组第k个位置
      if(!judge(k)) &#123;
        check(k+1); //不冲突的话，回溯放置下一行
      &#125;
      //冲突的话试下一个位置
    &#125;
  &#125;
  //判断第k行的放置是否与之前位置冲突
  public boolean judge(int k) &#123;
    for(int i = 0; i &lt; k; i++) &#123;
      if(res[k] == res[i] || Math.abs(k-i) == Math.abs(res[k]-res[i])) &#123;
        return true;
      &#125;
    &#125;
    return false;
  &#125;
&#125;
```

### 844. 比较含退格的字符串

> [844. 比较含退格的字符串](https://leetcode-cn.com/problems/backspace-string-compare/)

语言：java

思路：双栈，先添加，后比较。

代码（2ms，74.87%）：

```java
class Solution &#123;
  public boolean backspaceCompare(String S, String T) &#123;
    Deque&lt;Character> sDeque = new LinkedList&lt;>();
    Deque&lt;Character> tDeque = new LinkedList&lt;>();

    for(char c : S.toCharArray())&#123;
      if(c=='#')&#123;
        if(!sDeque.isEmpty())&#123;
          sDeque.pollFirst();
        &#125;
      &#125;else&#123;
        sDeque.addFirst(c);
      &#125;
    &#125; 

    for(char c : T.toCharArray())&#123;
      if(c=='#')&#123;
        if(!tDeque.isEmpty())&#123;
          tDeque.pollFirst();
        &#125;
      &#125;else&#123;
        tDeque.addFirst(c);
      &#125;
    &#125;

    while(!sDeque.isEmpty() && !tDeque.isEmpty())&#123;
      if(!sDeque.pollFirst().equals(tDeque.pollFirst()))&#123;
        return false;
      &#125;
    &#125;
    return sDeque.isEmpty()&&tDeque.isEmpty();
  &#125;
&#125;
```

参考代码1（0ms）：用双指针，模拟栈操作。

```java
class Solution &#123;
  public boolean backspaceCompare(String S, String T) &#123;

    int s = S.length() - 1;
    int t = T.length() - 1;

    int sBack = 0;
    int tBack = 0;

    while (s >= 0 && t >= 0) &#123;
      while (s >= 0) &#123;
        if (S.charAt(s) == '#') &#123;
          sBack++;
          s--;
        &#125; else &#123;
          if (sBack == 0) &#123;
            break;
          &#125;
          sBack--;
          s--;
        &#125;
      &#125;
      while (t >= 0) &#123;
        if (T.charAt(t) == '#') &#123;
          tBack++;
          t--;
        &#125; else &#123;
          if (tBack == 0) &#123;
            break;
          &#125;
          tBack--;
          t--;
        &#125;
      &#125;

      //都到了真实字符
      if (s >= 0 && t >= 0 ) &#123;
        if (S.charAt(s) != T.charAt(t)) &#123;
          return false;
        &#125;
        s--;
        t--;
      &#125;

    &#125;
    //对于剩余的字符串，因为全部退格后可能为空字符串，所以继续处理
    while (s >= 0) &#123;
      if (S.charAt(s) == '#') &#123;
        sBack++;
        s--;
      &#125; else &#123;
        if (sBack == 0) &#123;
          break;
        &#125;
        sBack--;
        s--;
      &#125;
    &#125;
    while (t >= 0) &#123;
      if (T.charAt(t) == '#') &#123;
        tBack++;
        t--;
      &#125; else &#123;
        if (tBack == 0) &#123;
          break;
        &#125;
        tBack--;
        t--;
      &#125;
    &#125;
    //都到了末尾
    if (s &lt; 0 && t &lt; 0) &#123;
      return true;
    &#125;
    //只有一个到了末尾
    return false;

  &#125;
&#125;
```

代码2（0ms，100%）：两个指针遍历两个字符串。两个字符串都先根据规则遇到'#'从后往前删除字符，直到某一个位置起是有效的字符时再进行比较。

```java
class Solution &#123;
  public boolean backspaceCompare(String s, String t) &#123;
    int i = s.length()-1, j = t.length()-1;
    int sFlag = 0, tFlag = 0;
    while(i>= 0 || j >= 0) &#123;
      //根据 # 消除 s的 字符
      while(i>=0) &#123;
        if(s.charAt(i)== '#') &#123;
          --i;
          ++sFlag;
        &#125; else if (sFlag > 0) &#123;
          --i;
          --sFlag;
        &#125; else &#123;
          break;
        &#125;
      &#125; 
      //根据 # 消除 t的 字符
      while(j>=0) &#123;
        if(t.charAt(j)== '#') &#123;
          --j;
          ++tFlag;
        &#125; else if (tFlag > 0) &#123;
          --j;
          --tFlag;
        &#125; else &#123;
          break;
        &#125;
      &#125;
      // 消除后，如果不相等，返回false.相等则 同时跳过一个字符
      if(i>=0&&j>=0 ) &#123;
        if(s.charAt(i) != t.charAt(j)) &#123;
          return false;
        &#125;
        --i;
        --j;
        continue;
      &#125;
      // 如果 最后有一个没遍历完，说明还有剩余字符（比另一个字符串多字符）
      if(i!=j)&#123;
        return false;
      &#125;
    &#125;
    return true;
  &#125;
&#125;
```



### 143. 重排链表

> [143. 重排链表](https://leetcode-cn.com/problems/reorder-list/)

语言：java

思路：没想到比较巧的方法，根据官方题解二，说实际就是链表前半段和倒序后的链表后半段组合。这里尝试下。

代码（2ms，79.06%）：

```java
class Solution &#123;
  public void reorderList(ListNode head) &#123;
    if(head==null)&#123;
      return;
    &#125;
    // (1) 获取链表中点
    ListNode mid = mid(head);
    // (2) 颠倒后半段链表
    ListNode second = mid.next;
    mid.next = null;
    second = reverse(second);
    // (3) 组合前半段和倒序的后半段
    merge(head,second);
  &#125;

  public ListNode mid(ListNode head) &#123;
    ListNode slow = head,fast = head;
    while (fast.next != null && fast.next.next != null) &#123;
      slow = slow.next;
      fast = fast.next.next;
    &#125;
    return slow;
  &#125;

  public ListNode reverse(ListNode head) &#123;
    ListNode pre = null,cur = head,next;
    while (cur != null) &#123;
      next = cur.next;
      cur.next = pre;
      pre = cur;
      cur = next;
    &#125;
    return pre;
  &#125;

  public void merge(ListNode first, ListNode second) &#123;
    ListNode first_next,second_next;
    while (first != null && second != null) &#123;
      first_next = first.next;
      second_next = second.next;

      first.next = second;
      first = first_next;

      second.next = first;
      second = second_next;
    &#125;
  &#125;
&#125;
```

参考代码1（1ms，100%）：思路一样，写法略有差别

```java
class Solution &#123;
  public void reorderList(ListNode head) &#123;

    //找中点
    ListNode slow = head;
    ListNode lastSlow = head;
    ListNode quick = head;
    //特殊情况
    if(head == null || head.next == null)
      return;
    while(quick != null)&#123;
      if(quick.next == null)
        quick = quick.next;
      else
        quick = quick.next.next;

      lastSlow = slow;
      slow = slow.next;
    &#125;
    //将链表分成两半，前斩断前段
    lastSlow.next = null;
    //将后半段链表反转
    ListNode lastNode = null;
    while(slow != null)&#123;
      ListNode nexrTemp = slow.next;
      slow.next = lastNode;
      //移动
      lastNode = slow;
      slow = nexrTemp;
    &#125;

    ListNode head2 = lastNode;
    //将两分段链表拼接成一个
    ListNode dummy = new ListNode(Integer.MAX_VALUE);//哑节点
    ListNode cur = dummy;
    int count = 0;//插入节点计数
    while (head != null && head2 != null)&#123;
      count++;
      if(count % 2 == 1)&#123; //奇数
        cur.next = head;
        head = head.next;
        cur = cur.next;
      &#125;else &#123; //偶数
        cur.next = head2;
        head2 = head2.next;
        cur = cur.next;
      &#125;
    &#125;
    //拼接剩余
    while(head != null)&#123;
      cur.next = head;
      head = head.next;
      cur = cur.next;
    &#125;
    while(head2 != null)&#123;
      cur.next = head2;
      head2 = head2.next;
      cur = cur.next;
    &#125;

    head = dummy.next;
  &#125;
&#125;
```

### 925. 长按键入

语言：java

思路：两个字符串同时遍历，比较；党遍历到的位置字符不同时，考虑typed是否当前字符和之前的是重复的，是则认为是不小心重复输入了，跳过所有重复的字符。

代码（1ms，86.83%）：

```java
class Solution &#123;
  public boolean isLongPressedName(String name, String typed) &#123;
    int i = 0, j = 0;
    while (j &lt; typed.length()) &#123;
      if (i &lt; name.length() && name.charAt(i) == typed.charAt(j)) &#123;
        i++;
        j++;
      &#125; else if (j > 0 && typed.charAt(j) == typed.charAt(j - 1)) &#123;
        j++;
      &#125; else &#123;
        return false;
      &#125;
    &#125;
    return i == name.length();
  &#125;
&#125;
```

参考代码1（0ms）：和我原本的写法类似，思路是一样的。

```java
class Solution &#123;
  public boolean isLongPressedName(String name, String typed) &#123;
    char[] ch1 = name.toCharArray();
    char[] ch2 = typed.toCharArray();
    if(ch1.length > ch2.length) return false;
    int i = 0, j = 0;
    while(i &lt; ch1.length && j &lt; ch2.length)&#123;
      if(ch1[i] == ch2[j])&#123;
        i++;
        j++;
      &#125;else if(j > 0 && ch2[j - 1] == ch2[j])&#123;
        j++;
      &#125;else&#123;
        return false;
      &#125;
    &#125;
    while(j &lt; ch2.length)&#123;
      if(ch2[j] != ch2[j - 1])&#123;
        return false;
      &#125;
      j++;
    &#125;
    return i == ch1.length;
  &#125;
&#125;
```

### 763. 划分字母区间

> [763. 划分字母区间](https://leetcode-cn.com/problems/partition-labels/)

语言：java

思路：滑动窗口类题目。按照每个字母首次出现的位置进行排序，然后判断交集；无交集直接添加上一个到结果集中，有交集则修改滑动窗口右边界，继续往下判断。

代码（8ms，34.35%）：就是效率比较低，但是这个写法还是比较好理解的。

```java
class Solution &#123;
  public List&lt;Integer> partitionLabels(String S) &#123;

    // 初始化数组，最多26字母
    PartNode[] characters = new PartNode[26];
    for (int i = 0; i &lt; 26; ++i) &#123;
      characters[i] = new PartNode();
    &#125;
    for (int i = 0, len = S.length(), pos; i &lt; len; ++i) &#123;
      pos = S.charAt(i) - 'a';
      if (characters[pos].start == Integer.MAX_VALUE) &#123;
        characters[pos].start = i;
      &#125;
      characters[pos].end = i;
    &#125;

    // 根据 第一次出现的位置 从小到大 递增排序
    Arrays.sort(characters, (x, y) -> x.start - y.start);

    List&lt;Integer> res = new LinkedList&lt;>();

    //a b c d e f
    int start = 0, end = 0;
    for (int i = 0; i &lt; 26; ++i) &#123;

      // (1) 当前字母所在字符串和前面的 无重叠
      if (characters[i].start > end) &#123;
        // 最后的字母 ( 没出现过的字母，绝对排在最后 )
        if (characters[i].start == Integer.MAX_VALUE) &#123;
          res.add(end - start + 1);
          start = Integer.MAX_VALUE;
          break;
        &#125;

        // 添加上一个字母所在字符串的长度，并修改下次字符串的起点、终点
        res.add(end - start + 1);
        start = characters[i].start;
        end = characters[i].end;
      &#125; else&#123;
        // (2) 重叠,继续向下判断是否重叠
        end = Math.max(characters[i].end,end);
      &#125;

    &#125;
    // 最后一个出现的字母的所在字符串没被加入到res中
    if (start != Integer.MAX_VALUE) &#123;
      res.add(end - start + 1);
    &#125;

    return res;
  &#125;


  /**
     * 存储字母 第一次出现 和 最后一次出现 的位置。
     */
  class PartNode &#123;
    public Integer start;
    public Integer end;

    public PartNode() &#123;
      start = Integer.MAX_VALUE;
      end = Integer.MAX_VALUE;
    &#125;
  &#125;
&#125;
```

参考代码1（3ms，96.91%）：贪心算法 + 双指针。

这个思路也很清晰，就是只要存储每个字母最后出现的位置，然后重新遍历字符串，维护两个位置变量（可理解为窗口）：`start`、`end`，`end = Math.max(Math.max(last, lasts[chs[right] - 'a'))`表示每次都让右边界尽量大（这样子就直接考虑了字符串重叠的情况），当走出重叠区时`i == end`，直接把窗口的长度加入结果集，然后又更新窗口的左边界`start = end+1`

> [划分字母区间--官方题解](https://leetcode-cn.com/problems/partition-labels/solution/hua-fen-zi-mu-qu-jian-by-leetcode-solution/)
>
> 上述做法使用贪心的思想寻找每个片段可能的最小结束下标，因此可以保证每个片段的长度一定是符合要求的最短长度，如果取更短的片段，则一定会出现同一个字母出现在多个片段中的情况。由于每次取的片段都是符合要求的最短的片段，因此得到的片段数也是最多的。
>

```java
class Solution &#123;
  public List&lt;Integer> partitionLabels(String S) &#123;
    int[] last = new int[26];
    int length = S.length();
    for (int i = 0; i &lt; length; i++) &#123;
      last[S.charAt(i) - 'a'] = i;
    &#125;
    List&lt;Integer> partition = new ArrayList&lt;Integer>();
    int start = 0, end = 0;
    for (int i = 0; i &lt; length; i++) &#123;
      end = Math.max(end, last[S.charAt(i) - 'a']);
      if (i == end) &#123;
        partition.add(end - start + 1);
        start = end + 1;
      &#125;
    &#125;
    return partition;
  &#125;
&#125;
```

参考代码2（2ms，100%）：和官方题解大同小异，就是写法略不同而已。

```java
class Solution &#123;
  public List&lt;Integer> partitionLabels(String S) &#123;
    List&lt;Integer> ans = new ArrayList&lt;>();

    char[] chs = S.toCharArray();
    int[] lasts = new int[26];
    for (int i = 0; i &lt; chs.length; i++) &#123;
      lasts[chs[i] - 'a'] = i;
    &#125;

    int last = 0;
    int right = 0;
    do &#123;
      int left = right;

      do &#123;
        last = Math.max(last, lasts[chs[right] - 'a']);
        right++;
      &#125; while (right &lt;= last);

      ans.add(right - left);
    &#125; while (right &lt; chs.length);

    return ans;
  &#125;
&#125;
```

### 47. 全排列 II

> [47. 全排列 II](https://leetcode-cn.com/problems/permutations-ii/)

语言：java

思路：这个感觉还挺复杂的，一时间只想到用传统全排列写法，然后在去重，但是效率太低。建议直接看其他人讲解。

参考代码1（1ms，100%）：

> [47. 全排列 II:【彻底理解排列中的去重问题】详解](https://leetcode-cn.com/problems/permutations-ii/solution/47-quan-pai-lie-iiche-di-li-jie-pai-lie-zhong-de-q/)

```java
class Solution &#123;
    //存放结果
    List&lt;List&lt;Integer>> result = new ArrayList&lt;>();
    //暂存结果
    List&lt;Integer> path = new ArrayList&lt;>();

    public List&lt;List&lt;Integer>> permuteUnique(int[] nums) &#123;
        boolean[] used = new boolean[nums.length];
        Arrays.fill(used, false);
        Arrays.sort(nums);
        backTrack(nums, used);
        return result;
    &#125;

    private void backTrack(int[] nums, boolean[] used) &#123;
        if (path.size() == nums.length) &#123;
            result.add(new ArrayList&lt;>(path));
            return;
        &#125;
        for (int i = 0; i &lt; nums.length; i++) &#123;
            // used[i - 1] == true，说明同⼀树⽀nums[i - 1]使⽤过
            // used[i - 1] == false，说明同⼀树层nums[i - 1]使⽤过
            // 如果同⼀树层nums[i - 1]使⽤过则直接跳过
            if (i > 0 && nums[i] == nums[i - 1] && used[i - 1] == false) &#123;
                continue;
            &#125;
            //如果同⼀树⽀nums[i]没使⽤过开始处理
            if (used[i] == false) &#123;
                used[i] = true;//标记同⼀树⽀nums[i]使⽤过，防止同一树支重复使用
                path.add(nums[i]);
                backTrack(nums, used);
                path.remove(path.size() - 1);//回溯，说明同⼀树层nums[i]使⽤过，防止下一树层重复
                used[i] = false;//回溯
            &#125;
        &#125;
    &#125;
&#125;
```

参考后重写：

```java
class Solution &#123;
  public List&lt;List&lt;Integer>> permuteUnique(int[] nums) &#123;
    List&lt;List&lt;Integer>> res = new ArrayList&lt;>();
    Arrays.sort(nums);
    recall(nums, res, 0, nums.length, new ArrayList&lt;>(), new boolean[nums.length]);
    return res;
  &#125;

  public void recall(int[] nums, List&lt;List&lt;Integer>> res, int curDepth, int maxDepth, List&lt;Integer> road, boolean[] used) &#123;
    if (curDepth == maxDepth) &#123;
      res.add(new ArrayList&lt;>(road));
    &#125; else &#123;
      for (int i = 0; i &lt; nums.length; ++i) &#123;
        if (i > 0 && nums[i] == nums[i - 1] && !used[i - 1]) &#123;
          continue;
        &#125;
        if (!used[i]) &#123;
          road.add(nums[i]);
          used[i] = true;
          recall(nums, res, curDepth + 1, maxDepth, road, used);
          used[i] = false;
          road.remove(road.size() - 1);
        &#125;
      &#125;
    &#125;
  &#125;
&#125;
```

### 17. 电话号码的字母组合

> [17. 电话号码的字母组合](https://leetcode-cn.com/problems/letter-combinations-of-a-phone-number/)

语言：java

思路：类似全排列II，但是需要考虑的是，每个数字按键里面一次只能挑一个字母。全排列是排列问题，这里是组合问题。这里直接DFS大胆遍历所有情况即可。

代码（0ms，100%）：

```java
class Solution &#123;
  public List&lt;String> letterCombinations(String digits) &#123;
    char[][] maps = new char[][]&#123;&#123;&#125;, &#123;&#125;, &#123;'a', 'b', 'c'&#125;, &#123;'d', 'e', 'f'&#125;, &#123;'g', 'h', 'i'&#125;
                                 , &#123;'j', 'k', 'l'&#125;, &#123;'m', 'n', 'o'&#125;, &#123;'p', 'q', 'r', 's'&#125;, &#123;'t', 'u', 'v'&#125;, &#123;'w', 'x', 'y', 'z'&#125;&#125;;
    List&lt;String> res = new ArrayList&lt;>();
    int[] nums = new int[digits.length()];
    for (int i = 0; i &lt; digits.length(); ++i) &#123;
      nums[i] = digits.charAt(i) - '0';
    &#125;
    recall(0,digits.length(),nums,maps,new StringBuilder(), res);
    return res;
  &#125;

  public void recall(int curDepth,int maxDepth,int[] digits, char[][] maps,StringBuilder sb, List&lt;String> res) &#123;
    if(curDepth==maxDepth)&#123;
      //这个if是，输入”“的情况，res必须是[]
      if(sb.length()>0)&#123;
        res.add(sb.toString());
      &#125;
    &#125;else &#123;
      for(int i = 0;i&lt;maps[digits[curDepth]].length;++i)&#123;
        sb.append(maps[digits[curDepth]][i]);
        recall(curDepth+1,maxDepth,digits,maps,sb,res);
        sb.deleteCharAt(sb.length()-1);
      &#125;
    &#125;
  &#125;
&#125;
```

### 39. 组合总和

> [39. 组合总和](https://leetcode-cn.com/problems/combination-sum/)

语言：java

思路：还是按照类似全排列的思想去做题，但是这里同样是更暴力的DFS，遍历所有情况。

+ 需要排序
+ 暴力的DFS，但是需要用begin记录起始遍历位置=>避免回头路`1112`和`1121`。

代码（3ms，77.35%）：

```java
class Solution &#123;
  public List&lt;List&lt;Integer>> combinationSum(int[] candidates, int target) &#123;
    Arrays.sort(candidates);
    List&lt;List&lt;Integer>> res = new ArrayList&lt;>();
    recall(candidates, 0, candidates.length, target, new LinkedList&lt;>(), res);
    return res;
  &#125;

  public void recall(int[] candidates, int begin, int length, int target, Deque&lt;Integer> road, List&lt;List&lt;Integer>> res) &#123;
    if (target == 0) &#123;
      res.add(new ArrayList&lt;>(road));
    &#125; else &#123;
      // begin是避免走回头路，重复组合
      for (int i = begin; i &lt; length; ++i) &#123;
        // 如果当前元素大于目标值，没必要再往下DFS，因为再往后遍历的数字更大
        if (candidates[i] > target) &#123;
          break;
        &#125;
        road.addLast(candidates[i]);
        recall(candidates, i, length, target - candidates[i], road, res);
        road.removeLast();
      &#125;
    &#125;
  &#125;
&#125;
```

参考代码1（4ms，52.33%）：

> [组合总和--官方解答](https://leetcode-cn.com/problems/combination-sum/solution/zu-he-zong-he-by-leetcode-solution/)

```java
class Solution &#123;
  public List&lt;List&lt;Integer>> combinationSum(int[] candidates, int target) &#123;
    List&lt;List&lt;Integer>> ans = new ArrayList&lt;List&lt;Integer>>();
    List&lt;Integer> combine = new ArrayList&lt;Integer>();
    dfs(candidates, target, ans, combine, 0);
    return ans;
  &#125;

  public void dfs(int[] candidates, int target, List&lt;List&lt;Integer>> ans, List&lt;Integer> combine, int idx) &#123;
    if (idx == candidates.length) &#123;
      return;
    &#125;
    if (target == 0) &#123;
      ans.add(new ArrayList&lt;Integer>(combine));
      return;
    &#125;
    // 直接跳过
    dfs(candidates, target, ans, combine, idx + 1);
    // 选择当前数
    if (target - candidates[idx] >= 0) &#123;
      combine.add(candidates[idx]);
      dfs(candidates, target - candidates[idx], ans, combine, idx);
      combine.remove(combine.size() - 1);
    &#125;
  &#125;
&#125;
```

### 40. 组合总和 II

> [40. 组合总和 II](https://leetcode-cn.com/problems/combination-sum-ii/)

语言：java

思路：

+ 和[39. 组合总和](https://leetcode-cn.com/problems/combination-sum/)不同的是，每个数字只能使用一次。那这里就需要像全排列做题一样，用一个`boolean[]  used`来记录用过的元素。

+ 需要像[47. 全排列 II](https://leetcode-cn.com/problems/permutations-ii/)一样，避免DFS递归树同层出现相同数字的情况。

  ```java
  if(i>0&&candidates[i]==candidates[i-1]&&!used[i-1])&#123;
    continue;
  &#125;
  ```

代码（2ms，99.95%）：

```java
class Solution &#123;
  public List&lt;List&lt;Integer>> combinationSum2(int[] candidates, int target) &#123;
    List&lt;List&lt;Integer>> res = new ArrayList&lt;>();
    Arrays.sort(candidates);
    recall(candidates,0,candidates.length,target,new boolean[candidates.length],new LinkedList&lt;>(),res);
    return res;
  &#125;

  public void recall(int[] candidates,int begin,int len,int target, boolean[] used, Deque&lt;Integer> road,List&lt;List&lt;Integer>> res)&#123;
    if(target == 0)&#123;
      res.add(new ArrayList&lt;>(road));
    &#125;else&#123;
      for(int i = begin;i&lt;len;++i)&#123;
        if(candidates[i]> target)&#123;
          break;
        &#125;
        // eg: 避免数组里多个1时，会有重复情况
        if(i>0&&candidates[i]==candidates[i-1]&&!used[i-1])&#123;
          continue;
        &#125;
        if(!used[i])&#123;
          road.addLast(candidates[i]);
          used[i] = true;
          recall(candidates,i,len,target-candidates[i],used,road,res);
          used[i] = false;
          road.removeLast();
        &#125;
      &#125;
    &#125;
  &#125;
&#125;
```

参考代码1（3ms，82.41%）：

> [回溯算法 + 剪枝（Java、Python）](https://leetcode-cn.com/problems/combination-sum-ii/solution/hui-su-suan-fa-jian-zhi-python-dai-ma-java-dai-m-3/)

```java
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Deque;
import java.util.List;

public class Solution &#123;

  public List&lt;List&lt;Integer>> combinationSum2(int[] candidates, int target) &#123;
    int len = candidates.length;
    List&lt;List&lt;Integer>> res = new ArrayList&lt;>();
    if (len == 0) &#123;
      return res;
    &#125;

    // 关键步骤
    Arrays.sort(candidates);

    Deque&lt;Integer> path = new ArrayDeque&lt;>(len);
    dfs(candidates, len, 0, target, path, res);
    return res;
  &#125;

  /**
     * @param candidates 候选数组
     * @param len        冗余变量
     * @param begin      从候选数组的 begin 位置开始搜索
     * @param target     表示剩余，这个值一开始等于 target，基于题目中说明的"所有数字（包括目标数）都是正整数"这个条件
     * @param path       从根结点到叶子结点的路径
     * @param res
     */
  private void dfs(int[] candidates, int len, int begin, int target, Deque&lt;Integer> path, List&lt;List&lt;Integer>> res) &#123;
    if (target == 0) &#123;
      res.add(new ArrayList&lt;>(path));
      return;
    &#125;
    for (int i = begin; i &lt; len; i++) &#123;
      // 大剪枝：减去 candidates[i] 小于 0，减去后面的 candidates[i + 1]、candidates[i + 2] 肯定也小于 0，因此用 break
      if (target - candidates[i] &lt; 0) &#123;
        break;
      &#125;

      // 小剪枝：同一层相同数值的结点，从第 2 个开始，候选数更少，结果一定发生重复，因此跳过，用 continue
      if (i > begin && candidates[i] == candidates[i - 1]) &#123;
        continue;
      &#125;

      path.addLast(candidates[i]);
      // 调试语句 ①
      // System.out.println("递归之前 => " + path + "，剩余 = " + (target - candidates[i]));

      // 因为元素不可以重复使用，这里递归传递下去的是 i + 1 而不是 i
      dfs(candidates, len, i + 1, target - candidates[i], path, res);

      path.removeLast();
      // 调试语句 ②
      // System.out.println("递归之后 => " + path + "，剩余 = " + (target - candidates[i]));
    &#125;
  &#125;

  public static void main(String[] args) &#123;
    int[] candidates = new int[]&#123;10, 1, 2, 7, 6, 1, 5&#125;;
    int target = 8;
    Solution solution = new Solution();
    List&lt;List&lt;Integer>> res = solution.combinationSum2(candidates, target);
    System.out.println("输出 => " + res);
  &#125;
&#125;
```

### 51. N皇后

> [51. N 皇后](https://leetcode-cn.com/problems/n-queens/)

语言：java

思路：

+ 每次放棋子前，先考虑是否能放。
+ 因为每一行只用取一个值，所以用一维数组够了
+ Main方法里，需要指定第一行的棋子放哪里

代码（14ms，7.32%）：巨慢无比，我估计是打印结果的地方我写的不好。

```java
class Solution &#123;
  public List&lt;List&lt;String>> solveNQueens(int n) &#123;
    List&lt;List&lt;String>> res = new ArrayList&lt;>();
    int[] map = new int[n];
    for(int i = 0;i&lt;n;++i)&#123;
      map[0] = i;
      recall(map,1,n,res);
    &#125;
    return res;
  &#125;

  public void recall(int[] map,int curDepth,int maxDepth,List&lt;List&lt;String>> res)&#123;
    if(curDepth == maxDepth)&#123;
      List&lt;String> oneAnswer = new ArrayList&lt;>();
      for(int i = 0;i&lt;maxDepth;++i)&#123;
        int col = map[i];
        String line = String.join("", Collections.nCopies(col, ".")) + "Q" +
          String.join("", Collections.nCopies(maxDepth - col - 1, "."));
        oneAnswer.add(line);
      &#125;
      res.add(oneAnswer);
    &#125;else&#123;
      for(int i = 0;i&lt;maxDepth;++i)&#123;
        if(canSet(map,curDepth,i))&#123;
          map[curDepth] = i;
          recall(map,curDepth+1,maxDepth,res);
        &#125;
      &#125;
    &#125;
  &#125;

  public boolean canSet(int[] map,int row,int col)&#123;
    for(int i = 0;i&lt;row;++i)&#123;
      // 竖直方向
      if(map[i]==col)&#123;
        return false;
      &#125;
      // 撇方向
      if(map[i] - col == i - row)&#123;
        return false;
      &#125;
      // 捺方向
      if(map[i] - col == row - i)&#123;
        return false;
      &#125;
    &#125;
    return true;
  &#125;
&#125;
```

参考代码1（6ms，43.63%）:

>[N皇后--官方题解](https://leetcode-cn.com/problems/n-queens/solution/nhuang-hou-by-leetcode-solution/)

```java
class Solution &#123;
  public List&lt;List&lt;String>> solveNQueens(int n) &#123;
    List&lt;List&lt;String>> solutions = new ArrayList&lt;List&lt;String>>();
    int[] queens = new int[n];
    Arrays.fill(queens, -1);
    Set&lt;Integer> columns = new HashSet&lt;Integer>();
    Set&lt;Integer> diagonals1 = new HashSet&lt;Integer>();
    Set&lt;Integer> diagonals2 = new HashSet&lt;Integer>();
    backtrack(solutions, queens, n, 0, columns, diagonals1, diagonals2);
    return solutions;
  &#125;

  public void backtrack(List&lt;List&lt;String>> solutions, int[] queens, int n, int row, Set&lt;Integer> columns, Set&lt;Integer> diagonals1, Set&lt;Integer> diagonals2) &#123;
    if (row == n) &#123;
      List&lt;String> board = generateBoard(queens, n);
      solutions.add(board);
    &#125; else &#123;
      for (int i = 0; i &lt; n; i++) &#123;
        if (columns.contains(i)) &#123;
          continue;
        &#125;
        int diagonal1 = row - i;
        if (diagonals1.contains(diagonal1)) &#123;
          continue;
        &#125;
        int diagonal2 = row + i;
        if (diagonals2.contains(diagonal2)) &#123;
          continue;
        &#125;
        queens[row] = i;
        columns.add(i);
        diagonals1.add(diagonal1);
        diagonals2.add(diagonal2);
        backtrack(solutions, queens, n, row + 1, columns, diagonals1, diagonals2);
        queens[row] = -1;
        columns.remove(i);
        diagonals1.remove(diagonal1);
        diagonals2.remove(diagonal2);
      &#125;
    &#125;
  &#125;

  public List&lt;String> generateBoard(int[] queens, int n) &#123;
    List&lt;String> board = new ArrayList&lt;String>();
    for (int i = 0; i &lt; n; i++) &#123;
      char[] row = new char[n];
      Arrays.fill(row, '.');
      row[queens[i]] = 'Q';
      board.add(new String(row));
    &#125;
    return board;
  &#125;
&#125;
```

参考代码2（1ms，100.00%）：

> [N皇后--官方题解](https://leetcode-cn.com/problems/n-queens/solution/nhuang-hou-by-leetcode-solution/)

```java
class Solution &#123;
  public List&lt;List&lt;String>> solveNQueens(int n) &#123;
    int[] queens = new int[n];
    Arrays.fill(queens, -1);
    List&lt;List&lt;String>> solutions = new ArrayList&lt;List&lt;String>>();
    solve(solutions, queens, n, 0, 0, 0, 0);
    return solutions;
  &#125;

  public void solve(List&lt;List&lt;String>> solutions, int[] queens, int n, int row, int columns, int diagonals1, int diagonals2) &#123;
    if (row == n) &#123;
      List&lt;String> board = generateBoard(queens, n);
      solutions.add(board);
    &#125; else &#123;
      int availablePositions = ((1 &lt;&lt; n) - 1) & (~(columns | diagonals1 | diagonals2));
      while (availablePositions != 0) &#123;
        int position = availablePositions & (-availablePositions);
        availablePositions = availablePositions & (availablePositions - 1);
        int column = Integer.bitCount(position - 1);
        queens[row] = column;
        solve(solutions, queens, n, row + 1, columns | position, (diagonals1 | position) &lt;&lt; 1, (diagonals2 | position) >> 1);
        queens[row] = -1;
      &#125;
    &#125;
  &#125;

  public List&lt;String> generateBoard(int[] queens, int n) &#123;
    List&lt;String> board = new ArrayList&lt;String>();
    for (int i = 0; i &lt; n; i++) &#123;
      char[] row = new char[n];
      Arrays.fill(row, '.');
      row[queens[i]] = 'Q';
      board.add(new String(row));
    &#125;
    return board;
  &#125;
&#125;
```

### 416. 分割等和子集

> [416. 分割等和子集](https://leetcode-cn.com/problems/partition-equal-subset-sum/)

语言：java

思路：动态规划，用一维度数组`dp[target+1]`来保存，这里dp表示背包的容量，放进去的数字即是商品价值，同时也是商品重量。

代码（24ms，82.03%）：

```java
class Solution &#123;
  public boolean canPartition(int[] nums) &#123;
    int sum = 0;
    for (int num : nums) &#123;
      sum += num;
    &#125;
    // 奇数，本身不可能拆分成两个等和数组
    if ((sum & 1) == 1) &#123;
      return false;
    &#125;
    int target = sum / 2;
    int[] dp = new int[target + 1];
    // 遍历物品
    for (int item = 0; item &lt; nums.length; ++item) &#123;
      // 背包一开始是有足够容量的，之后拿了东西后就减小，所以倒序遍历
      // 因为有些容量可以直接浪费掉，所以每次capacity只-1就好了
      // 如果容量不够了，也不用再遍历了，所以 capacity>=nums[item]
      for (int capacity = target; capacity >= nums[item]; --capacity) &#123;
        // 当前背包 两种选择，要么不拿当前的商品，要么拿。
        dp[capacity] = Math.max(dp[capacity], dp[capacity - nums[item]] + nums[item]);
      &#125;
    &#125;
    // 判断 背包容量为target时，是不是正好装得下target
    // 之所以能这么判断，是因为如果能够划分数组，那么容量为target的背包能装的价值总量为target的可能有多种情况，但是一定不会超过target。
    // 毕竟这里 价值 == 重量
    return dp[target] == target;
  &#125;
&#125;
```

参考代码1（20ms，91.38%）：

> [动态规划（转换为 0-1 背包问题）](https://leetcode-cn.com/problems/partition-equal-subset-sum/solution/0-1-bei-bao-wen-ti-xiang-jie-zhen-dui-ben-ti-de-yo/)

```java
public class Solution &#123;

  public boolean canPartition(int[] nums) &#123;
    int len = nums.length;
    int sum = 0;
    for (int num : nums) &#123;
      sum += num;
    &#125;
    if ((sum & 1) == 1) &#123;
      return false;
    &#125;

    int target = sum / 2;
    boolean[] dp = new boolean[target + 1];
    dp[0] = true;

    if (nums[0] &lt;= target) &#123;
      dp[nums[0]] = true;
    &#125;
    for (int i = 1; i &lt; len; i++) &#123;
      for (int j = target; nums[i] &lt;= j; j--) &#123;
        if (dp[target]) &#123;
          return true;
        &#125;
        dp[j] = dp[j] || dp[j - nums[i]];
      &#125;
    &#125;
    return dp[target];
  &#125;
&#125;
```

### 474. 一和零

> [474. 一和零](https://leetcode-cn.com/problems/ones-and-zeroes/)

语言：java

思路：

+ 看上去可以暴力DFS，也可以动态规划的样子。这里试着用动态规划写写看。
+ `dp[m+1][n+1]`表示能装m个0和n个1的背包最多能放几个子集。
+ 状态转移方程：`dp[m][n] = Math.max(dp[m][n],dp[m-zeroArr[i]][n-oneArr[i]]+1);`
  + 即要么不把当前元素放到背包
  + 或者当前元素放背包，对应的剩余容量减小，然后子集数量+1
  + `dp[0][0] = 0`，因为题目里面所有字符串长度>0，所以`m=0 且 n=0`时，背包必定装不下任何元素

代码（61ms，35.89%）：超级慢，应该是三重for循环的原因

```java
class Solution &#123;
  public int findMaxForm(String[] strs, int m, int n) &#123;
    int strsLen = strs.length;
    int[] oneArr = new int[strsLen];
    int[] zeroArr = new int[strsLen];
    int[][] dp = new int[m+1][n+1];
    // 统计每个字符串里面的 0 和 1 的个数
    for(int i = 0;i&lt;strsLen;++i)&#123;
      char[] chars = strs[i].toCharArray();
      for(char c:chars)&#123;
        if(c=='1')&#123;
          ++oneArr[i];
        &#125;else&#123;
          ++zeroArr[i];
        &#125;
      &#125;
    &#125;
    // 动态规划 - 状态转移方程
    for(int item = 0;item&lt;strsLen;++item)&#123;
      for(int i = m;i>=0;--i)&#123;
        for(int j = n;j>=0;--j)&#123;
          if(i>=zeroArr[item]&&j>=oneArr[item])&#123;
            dp[i][j] = Math.max(dp[i][j],dp[i-zeroArr[item]][j-oneArr[item]]+1);
          &#125;
        &#125;
      &#125;
    &#125;
    return dp[m][n];
  &#125;
&#125;
```

参考代码1（41ms，54.92%）：

+ 主要是考虑到是**"有限背包"**，所以计算字符串的0和1的个数。可以在遍历字符串数组的时候临时统计，因为只遍历一次，不会重复放入同一个物品。=>而我多了一次for循环用来专门统计，亏时间了。

> [一和零--官方题解](https://leetcode-cn.com/problems/ones-and-zeroes/solution/yi-he-ling-by-leetcode/)
>
> **注意由于每个字符串只能使用一次（即有限背包**），因此在更新 `dp(i, j)` 时，`i` 和 `j` 都需要从大到小进行枚举。

```java
public class Solution &#123;
  public int findMaxForm(String[] strs, int m, int n) &#123;
    int[][] dp = new int[m + 1][n + 1];
    for (String s: strs) &#123;
      int[] count = countzeroesones(s);
      for (int zeroes = m; zeroes >= count[0]; zeroes--)
        for (int ones = n; ones >= count[1]; ones--)
          dp[zeroes][ones] = Math.max(1 + dp[zeroes - count[0]][ones - count[1]], dp[zeroes][ones]);
    &#125;
    return dp[m][n];
  &#125;
  public int[] countzeroesones(String s) &#123;
    int[] c = new int[2];
    for (int i = 0; i &lt; s.length(); i++) &#123;
      c[s.charAt(i)-'0']++;
    &#125;
    return c;
  &#125;
&#125;
```

参考代码2（40ms，57.51%）：

> [动态规划（转换为 0-1 背包问题）](https://leetcode-cn.com/problems/ones-and-zeroes/solution/dong-tai-gui-hua-zhuan-huan-wei-0-1-bei-bao-wen-ti/)
>
> 和官方题解其实差不多，没啥太大区别

```java
public class Solution &#123;

  public int findMaxForm(String[] strs, int m, int n) &#123;
    int[][] dp = new int[m + 1][n + 1];
    dp[0][0] = 0;
    for (String s : strs) &#123;
      int[] zeroAndOne = calcZeroAndOne(s);
      int zeros = zeroAndOne[0];
      int ones = zeroAndOne[1];
      for (int i = m; i >= zeros; i--) &#123;
        for (int j = n; j >= ones; j--) &#123;
          dp[i][j] = Math.max(dp[i][j], dp[i - zeros][j - ones] + 1);
        &#125;
      &#125;
    &#125;
    return dp[m][n];
  &#125;

  private int[] calcZeroAndOne(String str) &#123;
    int[] res = new int[2];
    for (char c : str.toCharArray()) &#123;
      res[c - '0']++;
    &#125;
    return res;
  &#125;
&#125;
```

过去提交过的代码（44ms，49.79%）：

+ 其实也差不多，主要主要时间差距的地方就是获取每个字符串的0和1个数的代码实现

```java
class Solution &#123;
  public int findMaxForm(String[] strs, int m, int n) &#123;
    int[][] dp = new int[m + 1][n + 1];
    //        int max = 0;
    //dp[i][j] = Math.max(dp[i-strs[i].zero][j-str[i].one]+1,dp[i][j]);
    for (int i = 0; i &lt; strs.length; ++i) &#123;
      int zeroCount = zeroCount(strs, i);
      int oneCount = oneCount(strs, i);
      for (int j = m; j >= zeroCount; --j) &#123;
        for (int k = n; k >= oneCount; --k) &#123;
          dp[j][k] = Math.max(dp[j][k], dp[j-zeroCount][k-oneCount]+1);
        &#125;
      &#125;
    &#125;
    return dp[m][n];
  &#125;

  public int zeroCount(String[] strs, int index) &#123;
    int count = 0;
    for (int i = 0; i &lt; strs[index].length(); ++i) &#123;
      if (strs[index].charAt(i) == '0') &#123;
        ++count;
      &#125;
    &#125;
    return count;
  &#125;

  public int oneCount(String[] strs, int index) &#123;
    int count = 0;
    for (int i = 0; i &lt; strs[index].length(); ++i) &#123;
      if (strs[index].charAt(i) == '1') &#123;
        ++count;
      &#125;
    &#125;
    return count;
  &#125;
&#125;
```

### 494. 目标和

> [494. 目标和](https://leetcode-cn.com/problems/target-sum/)

语言：java

思路：可以用暴力DFS，也可以用动态规划。这里尝试动态规划

+ 这个题目有个烦人点就是+-号问题。
+ 假设准备取正的集合和为Z，准备取负的集合和为F，目标值S，nums数组原本的和为sum
  + `Z-F = S` => `Z-F+F = S + F` => `Z + Z = S + Z + F` => `2Z = S + sum`
  + 所以到头来，我们只要考虑正数情况，不需要考虑负数
+ `dp[i]`表示目标和到i的方式有几种。
  + `dp[0]=1`，数组非空，全部元素都必须用上，即一定会用到`dp[0]`，每次用到`dp[0]`说明找到一种情况，+1。

代码（3ms，89.22%）：

```java
class Solution &#123;
  public int findTargetSumWays(int[] nums, int S) &#123;
    // `Z-F = S` => `Z-F+F = S + F` => `Z + Z = S + Z + F` => `2Z = S + sum`
    int sum = 0;
    for (int num : nums) &#123;
      sum += num;
    &#125;
    // S + sum 必须 == 2Z，即不能是奇数
    if (S > sum || ((S + sum) & 1) == 1) &#123;
      return 0;
    &#125;
    // 实际 target，我们只考虑 正数和 计算
    int target = (S + sum) / 2;
    int[] dp = new int[target + 1];
    dp[0] = 1;
    for (int num : nums) &#123;
      for (int j = target; j >= num; --j) &#123;
        dp[j] += dp[j - num];
      &#125;
    &#125;
    return dp[target];
  &#125;
&#125;
```

过去提交过的代码（可能是参考代码？2ms，99.98%）：整体差不多

```java
class Solution &#123;
  public int findTargetSumWays(int[] nums, int S) &#123;
    // S(p) - S(n) = S
    // 2 * S(p)  = S + sum

    int sum = 0;

    for(int num:nums)&#123;
      sum += num;
    &#125;

    if(sum&lt;S||(sum+S)%2==1)&#123;
      return 0;
    &#125;

    sum = (sum+S)/2;

    int[] dp = new int[sum+1];
    dp[0] = 1;

    for(int num:nums)&#123;
      for(int j = sum;j>=num;--j)&#123;
        dp[j] += dp[j-num];
      &#125;
    &#125;
    return dp[sum];
  &#125;
&#125;
```

### 1025. 除数博弈

> [1025. 除数博弈](https://leetcode-cn.com/problems/divisor-game/)

语言：java

思路：这里主要需要思考的是，"两个玩家都以最佳状态参与游戏"，怎么样是最佳。

+ 先找规律试试，根据题目的提示，可以得知，如果为2，直接就是true，为3则false。
+ 这里`N-x`替换原本的`N`，也算是一种提示，暗示可以用动态规划=>当前状态依赖过去的计算
+ `dp[i]`表示数字为i时，爱丽丝是否能赢
+ `dp[2] = true; d[3] = false` => 题目给出的
+ `dp[1] = false`，因为爱丽丝此时无法操作
+ 纸上发现规律，基本只要考虑-1，-2，-3的情况，而实际上只要是偶数就赢了

代码1（0ms，100%）：

```java
class Solution &#123;
  public boolean divisorGame(int N) &#123;
    return N%2==0;
  &#125;
&#125;
```

代码2（0ms，100%）：只考虑-1，-2，-3的情况

```java
class Solution &#123;
  public boolean divisorGame(int N) &#123;
    boolean[] dp = new boolean[N+2];
    dp[2] = true;
    for(int i = 4;i&lt;=N;++i)&#123;
      if(i%2==0)&#123;
        dp[i] = !dp[i-2];
      &#125;
      if(!dp[i] && i%3==0)&#123;
        dp[i] = !dp[i-3];
      &#125;
      if(!dp[i])&#123;
        dp[i] = !dp[i-1];
      &#125;
    &#125;
    return dp[N];
  &#125;
&#125;
```

### 112. 路径总和

> [112. 路径总和](https://leetcode-cn.com/problems/path-sum/)

语言：java

思路：暴力DFS，遍历所有情况

+ 必须是根到叶子结点，所以节点数量至少2个
+ **targetSum本来就可以是0**

代码（0ms，100%）：看着简单题，结果没想到还错了几次

```java
class Solution &#123;
  public boolean hasPathSum(TreeNode root, int targetSum) &#123;
    return root != null && recur(root, targetSum);
  &#125;

  public boolean recur(TreeNode root, int targetSum) &#123;
    if(root == null)&#123;
      return false;
    &#125;
    if(root.left==null&&root.right==null)&#123;
      return targetSum - root.val == 0;
    &#125;
    return recur(root.left, targetSum-root.val) || recur(root.right,targetSum-root.val);
  &#125;
&#125;
```

### 面试题 01.04. 回文排列

> [面试题 01.04. 回文排列](https://leetcode-cn.com/problems/palindrome-permutation-lcci/)

语言：java

思路：感觉这题就是脑经急转弯，字符串里的字母类别中，至多只有一个字母出现次数为单数即true。

+ 为方便计算同一个字母次数，先对s字符串里的字母排序

代码（0ms，100.00%）：

```java
class Solution &#123;
  public boolean canPermutePalindrome(String s) &#123;
    char[] chars = s.toCharArray();
    int len = chars.length;
    Arrays.sort(chars);
    int oddCount = 0;// 同一个字符个数为奇数的 字符类别总数
    for (int left = 0, right = 0; right &lt; len; ) &#123;
      while (right &lt; len && chars[left] == chars[right]) &#123;
        ++right;
      &#125;
      if ((right - left) % 2 == 1) &#123;
        ++oddCount;
      &#125;
      left = right;
    &#125;
    return oddCount &lt;= 1;
  &#125;
&#125;
```

### 647. 回文子串

> [647. 回文子串](https://leetcode-cn.com/problems/palindromic-substrings/)

语言：java

思路：暴力双层for循环，效率超级慢。直接每个子串都判断回文。

代码（582ms，5.02%）：感觉自己对"字符串处理"相关的题目不是很熟练。

```java
class Solution &#123;
  public int countSubstrings(String s) &#123;
    int count = 0;
    int len = s.length();
    for(int left = 0;left&lt;len;++left)&#123;
      for(int right = left;right&lt;len;++right)&#123;
        if(is(s,left,right))&#123;
          ++count;
        &#125;
      &#125;
    &#125;
    return count;
  &#125;

  public boolean is(String s ,int left,int right)&#123;
    while(left&lt;right)&#123;
      if(s.charAt(left)!=s.charAt(right))&#123;
        return false;
      &#125;
      ++left;
      --right;
    &#125;
    return true;
  &#125;
&#125;
```

参考代码1（4ms，78.15%）：

> [回文子串--官方题解](https://leetcode-cn.com/problems/palindromic-substrings/solution/hui-wen-zi-chuan-by-leetcode-solution/)
>
> 2*n，主要是为了统一长度为偶数和奇数的情况
>
> 需要纸上找规律， 把回文左右边界的计算规律总结出公式

```java
class Solution &#123;
  public int countSubstrings(String s) &#123;
    int n = s.length(), ans = 0;
    for (int i = 0; i &lt; 2 * n - 1; ++i) &#123;
      int l = i / 2, r = i / 2 + i % 2;
      while (l >= 0 && r &lt; n && s.charAt(l) == s.charAt(r)) &#123;
        --l;
        ++r;
        ++ans;
      &#125;
    &#125;
    return ans;
  &#125;
&#125;
```

参考代码2：

> [回文子串--官方题解](https://leetcode-cn.com/problems/palindromic-substrings/solution/hui-wen-zi-chuan-by-leetcode-solution/)
>
> Manacher 算法 => 有点复杂。

```java
class Solution &#123;
  public int countSubstrings(String s) &#123;
    int n = s.length();
    StringBuffer t = new StringBuffer("$#");
    for (int i = 0; i &lt; n; ++i) &#123;
      t.append(s.charAt(i));
      t.append('#');
    &#125;
    n = t.length();
    t.append('!');

    int[] f = new int[n];
    int iMax = 0, rMax = 0, ans = 0;
    for (int i = 1; i &lt; n; ++i) &#123;
      // 初始化 f[i]
      f[i] = i &lt;= rMax ? Math.min(rMax - i + 1, f[2 * iMax - i]) : 1;
      // 中心拓展
      while (t.charAt(i + f[i]) == t.charAt(i - f[i])) &#123;
        ++f[i];
      &#125;
      // 动态维护 iMax 和 rMax
      if (i + f[i] - 1 > rMax) &#123;
        iMax = i;
        rMax = i + f[i] - 1;
      &#125;
      // 统计答案, 当前贡献为 (f[i] - 1) / 2 上取整
      ans += f[i] / 2;
    &#125;

    return ans;
  &#125;
&#125;
```

### 1392. 最长快乐前缀

> [最长快乐前缀](https://leetcode-cn.com/problems/longest-happy-prefix/)

语言：java

思路：KMP算法，利用里面求next数组的思想，进行求解

代码（11ms，66.30%）：

```java
class Solution &#123;
  public String longestPrefix(String s) &#123;
    int n = s.length();
    int[] prefix = new int[n];
    int len = 0;
    for (int i = 1; i &lt; n;) &#123;
      if(s.charAt(i) == s.charAt(len))&#123;
        ++len;
        prefix[i] = len;
        ++i;
      &#125;else&#123;
        if(len > 0)&#123;
          len = prefix[len-1];
        &#125;else&#123;
          ++i;
        &#125;
      &#125;
    &#125;
    return s.substring(0, prefix[n-1]);
  &#125;
&#125;
```

参考代码1（6ms，100%）：

```java
class Solution &#123;
  public String longestPrefix(String s) &#123;
    if (s == null || s.length() &lt; 2) return "";
    char[] chs = s.toCharArray();
    int len = s.length();
    int[] next = new int[len + 1];
    next[0] = -1;
    // next[1] = 0;
    for (int l = 0, r = 1; r &lt; len;) &#123;
      if (chs[l] == chs[r]) &#123;
        next[++r] = ++l;
      &#125; else if (l > 0) &#123;
        l = next[l];
      &#125; else &#123;
        r++;
      &#125;
    &#125;
    return s.substring(0, next[len]);
  &#125;
&#125;
```

参考代码2（7ms，97.24%）：

> [利用KMP算法中的next数组求法解答，时间超100%](https://leetcode-cn.com/problems/longest-happy-prefix/solution/li-yong-kmpsuan-fa-zhong-de-nextshu-zu-q-57a7/)

```java
class Solution &#123;
  public String longestPrefix(String s) &#123;
    if (s == null || s.length() &lt; 2) return "";
    char[] sChars = s.toCharArray();
    int[] nexts = new int[s.length() + 1];
    nexts[0] = -1;
    nexts[1] = 0;
    int cur = 2;
    int preNext = 0;
    while (cur &lt; nexts.length) &#123;
      if (sChars[cur - 1] == sChars[preNext]) &#123;
        nexts[cur++] = ++preNext;
      &#125; else if (preNext > 0) &#123;
        preNext = nexts[preNext];
      &#125; else &#123;
        nexts[cur++] = 0;
      &#125;
    &#125;
    return s.substring(0, nexts[nexts.length - 1]);
  &#125;
&#125;
```

参考后重写（10ms，71.82%）：

```java
class Solution &#123;
  public String longestPrefix(String s) &#123;
    int len = s.length();
    // 这里len+1，之后使用的时候，从下标1开始使用
    int[] next = new int[len + 1];
    for (int left = 0, right = 1; right &lt; len; ) &#123;
      if (s.charAt(right) == s.charAt(left)) &#123;
        next[++right] = ++left;
      &#125; else if (left > 0) &#123;
        left = next[left];
      &#125; else &#123;
        ++right;
      &#125;
    &#125;
    return s.substring(0, next[len]);
  &#125;
&#125;
```

### 572. 另一个树的子树

> [572. 另一个树的子树](https://leetcode-cn.com/problems/subtree-of-another-tree/)

语言：java

思路：最容易想到的，感觉就是DFS判断了，这里试一下这种粗暴方法。

+ 判断当前节点是不是就是和子树一模一样；
+ 如果当前子树不是，那就判断左右子树是不是可能含有目标子树（用或||）

代码（13ms，6.77%）：巨慢。

```java
/**
 * Definition for a binary tree node.
 * public class TreeNode &#123;
 *     int val;
 *     TreeNode left;
 *     TreeNode right;
 *     TreeNode() &#123;&#125;
 *     TreeNode(int val) &#123; this.val = val; &#125;
 *     TreeNode(int val, TreeNode left, TreeNode right) &#123;
 *         this.val = val;
 *         this.left = left;
 *         this.right = right;
 *     &#125;
 * &#125;
 */
class Solution &#123;
  public boolean isSubtree(TreeNode s, TreeNode t) &#123;
    if (s == null && t == null) &#123;
      return true;
    &#125;
    if (s == null || t == null) &#123;
      return false;
    &#125;
    return dfs(s,t);
  &#125;

  public boolean dfs(TreeNode s,TreeNode t )&#123;
    if(s == null)&#123;
      return false;
    &#125;
    return judge(s,t) || dfs(s.left,t) || dfs(s.right,t);
  &#125;

  public boolean judge(TreeNode s, TreeNode t)&#123;
    if(s == null && t == null)&#123;
      return true;
    &#125;
    if(s == null || t == null || s.val != t.val)&#123;
      return false;
    &#125;
    return judge(s.left,t.left) && judge(s.right, t.right);
  &#125;
&#125;
```

参考代码1：同样也是DFS，但是却快了6ms

>[另一个树的子树--官方题解](https://leetcode-cn.com/problems/subtree-of-another-tree/solution/ling-yi-ge-shu-de-zi-shu-by-leetcode-solution/)

```java
class Solution &#123;
  public boolean isSubtree(TreeNode s, TreeNode t) &#123;
    return dfs(s, t);
  &#125;

  public boolean dfs(TreeNode s, TreeNode t) &#123;
    if (s == null) &#123;
      return false;
    &#125;
    return check(s, t) || dfs(s.left, t) || dfs(s.right, t);
  &#125;

  public boolean check(TreeNode s, TreeNode t) &#123;
    if (s == null && t == null) &#123;
      return true;
    &#125;
    if (s == null || t == null || s.val != t.val) &#123;
      return false;
    &#125;
    return check(s.left, t.left) && check(s.right, t.right);
  &#125;
&#125;
```

参考代码2（5ms，86.0%）：先序遍历+KMP判断，感觉很奇特的解法。

>[另一个树的子树--官方题解](https://leetcode-cn.com/problems/subtree-of-another-tree/solution/ling-yi-ge-shu-de-zi-shu-by-leetcode-solution/)

```java
class Solution &#123;
  List&lt;Integer> sOrder = new ArrayList&lt;Integer>();
  List&lt;Integer> tOrder = new ArrayList&lt;Integer>();
  int maxElement, lNull, rNull;

  public boolean isSubtree(TreeNode s, TreeNode t) &#123;
    maxElement = Integer.MIN_VALUE;
    getMaxElement(s);
    getMaxElement(t);
    lNull = maxElement + 1;
    rNull = maxElement + 2;

    getDfsOrder(s, sOrder);
    getDfsOrder(t, tOrder);

    return kmp();
  &#125;

  public void getMaxElement(TreeNode t) &#123;
    if (t == null) &#123;
      return;
    &#125;
    maxElement = Math.max(maxElement, t.val);
    getMaxElement(t.left);
    getMaxElement(t.right);
  &#125;

  public void getDfsOrder(TreeNode t, List&lt;Integer> tar) &#123;
    if (t == null) &#123;
      return;
    &#125;
    tar.add(t.val);
    if (t.left != null) &#123;
      getDfsOrder(t.left, tar);
    &#125; else &#123;
      tar.add(lNull);
    &#125;
    if (t.right != null) &#123;
      getDfsOrder(t.right, tar);
    &#125; else &#123;
      tar.add(rNull);
    &#125;
  &#125;

  public boolean kmp() &#123;
    int sLen = sOrder.size(), tLen = tOrder.size();
    int[] fail = new int[tOrder.size()];
    Arrays.fill(fail, -1);
    for (int i = 1, j = -1; i &lt; tLen; ++i) &#123;
      while (j != -1 && !(tOrder.get(i).equals(tOrder.get(j + 1)))) &#123;
        j = fail[j];
      &#125;
      if (tOrder.get(i).equals(tOrder.get(j + 1))) &#123;
        ++j;
      &#125;
      fail[i] = j;
    &#125;
    for (int i = 0, j = -1; i &lt; sLen; ++i) &#123;
      while (j != -1 && !(sOrder.get(i).equals(tOrder.get(j + 1)))) &#123;
        j = fail[j];
      &#125;
      if (sOrder.get(i).equals(tOrder.get(j + 1))) &#123;
        ++j;
      &#125;
      if (j == tLen - 1) &#123;
        return true;
      &#125;
    &#125;
    return false;
  &#125;
&#125;
```

参考KMP解法后，重写（6ms，82.05%）：

```java
/**
 * Definition for a binary tree node.
 * public class TreeNode &#123;
 *     int val;
 *     TreeNode left;
 *     TreeNode right;
 *     TreeNode() &#123;&#125;
 *     TreeNode(int val) &#123; this.val = val; &#125;
 *     TreeNode(int val, TreeNode left, TreeNode right) &#123;
 *         this.val = val;
 *         this.left = left;
 *         this.right = right;
 *     &#125;
 * &#125;
 */
class Solution &#123;
  List&lt;Integer> sPreList, tPreList;
  int maxNum = Integer.MIN_VALUE, leftNull, rightNull;

  public boolean isSubtree(TreeNode s, TreeNode t) &#123;
    sPreList = new ArrayList&lt;>();
    tPreList = new ArrayList&lt;>();
    getMaxNum(s);
    getMaxNum(t);
    leftNull = maxNum + 1;
    rightNull = maxNum + 2;
    preOrder(s, sPreList);
    preOrder(t, tPreList);
    return kmp(sPreList,tPreList);
  &#125;

  public void getMaxNum(TreeNode root) &#123;
    if (root == null) &#123;
      return;
    &#125;
    maxNum = Math.max(root.val, maxNum);
    getMaxNum(root.left);
    getMaxNum(root.right);
  &#125;

  public void preOrder(TreeNode root, List&lt;Integer> tree) &#123;
    if (root == null) &#123;
      return;
    &#125;
    tree.add(root.val);
    if (root.left == null) &#123;
      tree.add(leftNull);
    &#125;else&#123;
      preOrder(root.left, tree);
    &#125;
    if (root.right == null) &#123;
      tree.add(rightNull);
    &#125;else&#123;
      preOrder(root.right, tree);
    &#125;
  &#125;

  public boolean kmp(List&lt;Integer> s,List&lt;Integer> t)&#123;
    int sSize = s.size();
    int tSize = t.size();
    if(sSize&lt;tSize)&#123;
      return false;
    &#125;
    int[] next = new int[tSize+1];
    // 求next数组
    for(int i = 1,j=0;i&lt;tSize;)&#123;
      if(t.get(i).equals(t.get(j)))&#123;
        next[++i] = ++j;
      &#125;else if(j>0)&#123;
        j = next[j];
      &#125;else&#123;
        ++i;
      &#125;
    &#125;
    // kmp匹配
    for(int i = 0,j=0;i&lt;sSize;)&#123;
      if(s.get(i).equals(t.get(j)))&#123;
        ++i;
        ++j;
        if(j==tSize)&#123;
          return true;
        &#125;
      &#125;else if(j>0)&#123;
        j = next[j];
      &#125;else&#123;
        ++i;
      &#125;
    &#125;
    return false;
  &#125;
&#125;
```

### 1143. 最长公共子序列

> [1143. 最长公共子序列](https://leetcode-cn.com/problems/longest-common-subsequence/)

语言：java

思路：本来想暴力求解，但是发现暴力求解其实也不好写。

参考代码1（11ms，81.36%）：好吧，居然要动态规划。

> [最长公共子序列--官方题解](https://leetcode-cn.com/problems/longest-common-subsequence/solution/zui-chang-gong-gong-zi-xu-lie-by-leetcod-y7u0/)

```java
class Solution &#123;
  public int longestCommonSubsequence(String text1, String text2) &#123;
    int m = text1.length(), n = text2.length();
    int[][] dp = new int[m + 1][n + 1];
    for (int i = 1; i &lt;= m; i++) &#123;
      char c1 = text1.charAt(i - 1);
      for (int j = 1; j &lt;= n; j++) &#123;
        char c2 = text2.charAt(j - 1);
        if (c1 == c2) &#123;
          dp[i][j] = dp[i - 1][j - 1] + 1;
        &#125; else &#123;
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        &#125;
      &#125;
    &#125;
    return dp[m][n];
  &#125;
&#125;
```

参考后重写（12ms，78.55%）：我这个用的index，而不是len，写得好丑，再改一下。

```java
class Solution &#123;
  public int longestCommonSubsequence(String text1, String text2) &#123;
    int text1Len = text1.length();
    int text2Len = text2.length();
    int[][] dp = new int[text1Len][text2Len];
    for(int i = 0;i&lt;text1Len;++i)&#123;
      for(int j = 0;j&lt;text2Len;++j)&#123;
        if(text1.charAt(i) == text2.charAt(j))&#123;
          if(i==0||j==0)&#123;
            dp[i][j] = 1;
          &#125;else&#123;
            dp[i][j] = dp[i-1][j-1]+1;
          &#125;
        &#125;else&#123;
          if(i!=0&&j!=0)&#123;
            dp[i][j] = Math.max(dp[i-1][j],dp[i][j-1]);
          &#125;
          else if(i==0&&j==0)&#123;
            continue;
          &#125;
          else if(i==0)&#123;
            dp[i][j] = dp[i][j-1];
          &#125;else if(j==0)&#123;
            dp[i][j] = dp[i-1][j];
          &#125;
        &#125;
      &#125;
    &#125;
    return dp[text1Len-1][text2Len-1];
  &#125;
&#125;
```

重写（以len的形式，而不是用index，9ms，86.25%）：

```java
class Solution &#123;
  public int longestCommonSubsequence(String text1, String text2) &#123;
    int text1Len = text1.length();
    int text2Len = text2.length();
    int[][] dp = new int[text1Len+1][text2Len+1];
    for(int i = 1;i&lt;=text1Len;++i)&#123;
      char c1 = text1.charAt(i-1);
      for(int j = 1;j&lt;=text2Len;++j)&#123;
        char c2 = text2.charAt(j-1);
        if(c1==c2)&#123;
          dp[i][j] = dp[i-1][j-1] + 1;
        &#125;else&#123;
          dp[i][j] = Math.max(dp[i-1][j],dp[i][j-1]);
        &#125;
      &#125;
    &#125;
    return dp[text1Len][text2Len];
  &#125;
&#125;
```

### 剑指 Offer 48. 最长不含重复字符的子字符串

>[剑指 Offer 48. 最长不含重复字符的子字符串](https://leetcode-cn.com/problems/zui-chang-bu-han-zhong-fu-zi-fu-de-zi-zi-fu-chuan-lcof/)

语言：java

思路：一开始感觉可以用动态规划dp，dp[i\][j\]表示下标i到家的无重复字符串的最长子串。但是一看到s的长度可以到达5*10^4这个数量级，就感觉这样子不行。

后面想想可以维护一个大小变动的滑动窗口，然后HashMap记录用到的字符和对应的下标。

代码（7ms，79.40%）：

```java
class Solution &#123;
  public int lengthOfLongestSubstring(String s) &#123;
    char[] chars = s.toCharArray();
    int len = chars.length;
    int left = 0, right = 0;
    int max = 0;
    HashMap&lt;Character, Integer> map = new HashMap&lt;>();
    while (right &lt; len) &#123;
      char cur = chars[right];
      Integer last = map.get(cur);
      map.put(cur, right);
      if (last != null && last >= left) &#123;
        left = last + 1;
      &#125;else&#123;
        max = Math.max(max,right-left+1);
      &#125;
      ++right;
    &#125;
    return max;
  &#125;
&#125;
```

### 781. 森林中的兔子

>[781. 森林中的兔子](https://leetcode-cn.com/problems/rabbits-in-forest/)

语言：java

思路：

+ 每个兔子喊的数字n，最后能容纳n+1只。比如兔子喊2，那么最多和他一组的还有2个，也就是这个小组里最多3个兔子（2+1）。
+ 如果一个组满人了，出现同样大小的组，就等于另外开一个新的。每次加入一个，就把原本的key对应的value减一，如果到0，下次就是新建一个组。（HashMap存储）
+ 最后兔子总数 = 数组内元素 + 每个组最后剩余空间。

代码（3ms，68.18%）：

```java
class Solution &#123;
  public int numRabbits(int[] answers) &#123;
    int len = answers.length;
    // 至少有len只兔子
    int res = len;
    HashMap&lt;Integer, Integer> map = new HashMap&lt;>();
    for (int num : answers) &#123;
      Integer groupCount = map.get(num);
      if (groupCount != null) &#123;
        groupCount = groupCount > 0 ? groupCount - 1 : num;
        map.put(num,groupCount);
      &#125;else&#123;
        map.put(num,num);
      &#125;
    &#125;
    for(int num : map.values())&#123;
      res+=num;
    &#125;
    return res;
  &#125;
&#125;
```

参考代码1（3ms，68.18%）：

> [森林中的兔子--官方题解](https://leetcode-cn.com/problems/rabbits-in-forest/solution/sen-lin-zhong-de-tu-zi-by-leetcode-solut-kvla/)

```java
class Solution &#123;
  public int numRabbits(int[] answers) &#123;
    Map&lt;Integer, Integer> count = new HashMap&lt;Integer, Integer>();
    for (int y : answers) &#123;
      count.put(y, count.getOrDefault(y, 0) + 1);
    &#125;
    int ans = 0;
    for (Map.Entry&lt;Integer, Integer> entry : count.entrySet()) &#123;
      int y = entry.getKey(), x = entry.getValue();
      ans += (x + y) / (y + 1) * (y + 1);
    &#125;
    return ans;
  &#125;
&#125;
```

参考代码2（0ms）：思路其实没有什么太大区别，用的数组（主要题目有限定了出现的数字范围）

```java
class Solution &#123;
  public int numRabbits(int[] answers) &#123;
    int res = 0;
    int[] count = new int[1000];
    for(int temp:answers)&#123;
      if(count[temp]==0)&#123;
        res += (temp+1);
        count[temp] = temp;
      &#125;else&#123;
        count[temp] = count[temp]-1;
      &#125;
    &#125;
    return res;
  &#125;
&#125;
```

### 310. 最小高度树

>[310. 最小高度树](https://leetcode-cn.com/problems/minimum-height-trees/)

语言：java

思路：动态规划，A和B相连时，求A的高度，即B的高度+1，之后B再往下找与之相连的。（然而这样写了之后，代码运行不通过，虽然知道哪个步骤我的逻辑错了，但是一时间想不到怎么改好。）

参考代码1（13ms，90.51%）：

> [BFS 超级简单 注释超级详细](https://leetcode-cn.com/problems/minimum-height-trees/solution/zui-rong-yi-li-jie-de-bfsfen-xi-jian-dan-zhu-shi-x/)
>
> 类似拓扑排序。这个代码和另一个题解类似=>[通用图形BFS](https://leetcode-cn.com/problems/minimum-height-trees/solution/tong-yong-tu-xing-bfs-by-user8772/)
>
> 先找出所有度为1的节点，然后进行BFS，之后度为1的节点BFS中遇到的共同节点，即出于图中心位置的点，也就是我们要的答案。

```java
class Solution &#123;

  public List&lt;Integer> findMinHeightTrees(int n, int[][] edges) &#123;
    List&lt;Integer> res = new ArrayList&lt;>();
    /*如果只有一个节点，那么他就是最小高度树*/
    if (n == 1) &#123;
      res.add(0);
      return res;
    &#125;
    /*建立各个节点的出度表*/
    int[] degree = new int[n];
    /*建立图关系，在每个节点的list中存储相连节点*/
    List&lt;List&lt;Integer>> map = new ArrayList&lt;>();
    for (int i = 0; i &lt; n; i++) &#123;
      map.add(new ArrayList&lt;>());
    &#125;
    for (int[] edge : edges) &#123;
      degree[edge[0]]++;
      degree[edge[1]]++;/*出度++*/
      map.get(edge[0]).add(edge[1]);/*添加相邻节点*/
      map.get(edge[1]).add(edge[0]);
    &#125;
    /*建立队列*/
    Queue&lt;Integer> queue = new LinkedList&lt;>();
    /*把所有出度为1的节点，也就是叶子节点入队*/
    for (int i = 0; i &lt; n; i++) &#123;
      if (degree[i] == 1) queue.offer(i);
    &#125;
    /*循环条件当然是经典的不空判断*/
    while (!queue.isEmpty()) &#123;
      res = new ArrayList&lt;>();/*这个地方注意，我们每层循环都要new一个新的结果集合，
            这样最后保存的就是最终的最小高度树了*/
      int size = queue.size();/*这是每一层的节点的数量*/
      for (int i = 0; i &lt; size; i++) &#123;
        int cur = queue.poll();
        res.add(cur);/*把当前节点加入结果集，不要有疑问，为什么当前只是叶子节点为什么要加入结果集呢?
                因为我们每次循环都会新建一个list，所以最后保存的就是最后一个状态下的叶子节点，
                这也是很多题解里面所说的剪掉叶子节点的部分，你可以想象一下图，每层遍历完，
                都会把该层（也就是叶子节点层）这一层从队列中移除掉，
                不就相当于把原来的图给剪掉一圈叶子节点，形成一个缩小的新的图吗*/
        List&lt;Integer> neighbors = map.get(cur);
        /*这里就是经典的bfs了，把当前节点的相邻接点都拿出来，
                * 把它们的出度都减1，因为当前节点已经不存在了，所以，
                * 它的相邻节点们就有可能变成叶子节点*/
        for (int neighbor : neighbors) &#123;
          degree[neighbor]--;
          if (degree[neighbor] == 1) &#123;
            /*如果是叶子节点我们就入队*/
            queue.offer(neighbor);
          &#125;
        &#125;
      &#125;
    &#125;
    return res;/*返回最后一次保存的list*/
  &#125;
&#125;
```

参考后重写（373ms，5.98%）：??用了LinkedList就变成300+ms，将近400ms

```java
class Solution &#123;
  public List&lt;Integer> findMinHeightTrees(int n, int[][] edges) &#123;
    if(n==1)&#123;
      return Collections.singletonList(0);
    &#125;
    int[] degree = new int[n];
    List&lt;List&lt;Integer>> treeMap = new LinkedList&lt;>();
    List&lt;Integer> res = null;
    Queue&lt;Integer> queue = new LinkedList&lt;>();
    for(int i = 0;i&lt;n;++i)&#123;
      treeMap.add(new LinkedList&lt;>());
    &#125;
    for(int[] edge: edges)&#123;
      degree[edge[0]] ++;
      degree[edge[1]] ++;
      treeMap.get(edge[0]).add(edge[1]);
      treeMap.get(edge[1]).add(edge[0]);
    &#125;
    for(int i = 0;i&lt;n;++i)&#123;
      if(degree[i] == 1)&#123;
        queue.offer(i);
      &#125;
    &#125;
    while(!queue.isEmpty())&#123;
      int size = queue.size();
      res = new ArrayList&lt;>();
      for(int i = 0;i&lt;size;++i)&#123;
        int cur = queue.poll();
        res.add(cur);
        List&lt;Integer> nextEdges = treeMap.get(cur);
        for(int num : nextEdges)&#123;
          --degree[num];
          if(degree[num]==1)&#123;
            queue.offer(num);
          &#125;
        &#125;
      &#125;
    &#125;
    return res;
  &#125;
&#125;
```

重写改用ArrayList（13ms，90.51%）：使用ArrayList和使用LinkedList的时间差距居然这么大。

```java
class Solution &#123;
  public List&lt;Integer> findMinHeightTrees(int n, int[][] edges) &#123;
    List&lt;Integer> res = new ArrayList&lt;>();
    if(n==1)&#123;
      res.add(0);
      return res;
    &#125;
    int[] degree = new int[n];
    List&lt;List&lt;Integer>> treeMap = new ArrayList&lt;>();
    Queue&lt;Integer> queue = new LinkedList&lt;>();
    for(int i = 0;i&lt;n;++i)&#123;
      treeMap.add(new ArrayList&lt;>());
    &#125;
    for(int[] edge: edges)&#123;
      degree[edge[0]] ++;
      degree[edge[1]] ++;
      treeMap.get(edge[0]).add(edge[1]);
      treeMap.get(edge[1]).add(edge[0]);
    &#125;
    for(int i = 0;i&lt;n;++i)&#123;
      if(degree[i] == 1)&#123;
        queue.offer(i);
      &#125;
    &#125;
    while(!queue.isEmpty())&#123;
      int size = queue.size();
      res = new ArrayList&lt;>();
      for(int i = 0;i&lt;size;++i)&#123;
        int cur = queue.poll();
        res.add(cur);
        List&lt;Integer> nextEdges = treeMap.get(cur);
        for(int num : nextEdges)&#123;
          --degree[num];
          if(degree[num]==1)&#123;
            queue.offer(num);
          &#125;
        &#125;
      &#125;
    &#125;
    return res;
  &#125;
&#125;
```

### 264. 丑数 II

>[264. 丑数 II](https://leetcode-cn.com/problems/ugly-number-ii/)

语言：java

思路：遇到过类似的题目，但是还是错了，卑微。

参考代码1（65ms，19.33%）：每次从最小堆里面取最小的数据，然后再把取出来的值\*2，\*3，\*5，放入最小堆中。需要保证没有重复元素。

> [丑数 II--官方题解](https://leetcode-cn.com/problems/ugly-number-ii/solution/chou-shu-ii-by-leetcode-solution-uoqd/)

```java
class Solution &#123;
    public int nthUglyNumber(int n) &#123;
        int[] factors = &#123;2, 3, 5&#125;;
        Set&lt;Long> seen = new HashSet&lt;Long>();
        PriorityQueue&lt;Long> heap = new PriorityQueue&lt;Long>();
        seen.add(1L);
        heap.offer(1L);
        int ugly = 0;
        for (int i = 0; i &lt; n; i++) &#123;
            long curr = heap.poll();
            ugly = (int) curr;
            for (int factor : factors) &#123;
                long next = curr * factor;
                if (seen.add(next)) &#123;
                    heap.offer(next);
                &#125;
            &#125;
        &#125;
        return ugly;
    &#125;
&#125;
```

参考代码2（3ms，81.63%）：动态规划DP，dp[i\]表示第i个丑数

> [丑数 II--官方题解](https://leetcode-cn.com/problems/ugly-number-ii/solution/chou-shu-ii-by-leetcode-solution-uoqd/)

```java
class Solution &#123;
  public int nthUglyNumber(int n) &#123;
    int[] dp = new int[n + 1];
    dp[1] = 1;
    int p2 = 1, p3 = 1, p5 = 1;
    for (int i = 2; i &lt;= n; i++) &#123;
      int num2 = dp[p2] * 2, num3 = dp[p3] * 3, num5 = dp[p5] * 5;
      dp[i] = Math.min(Math.min(num2, num3), num5);
      if (dp[i] == num2) &#123;
        p2++;
      &#125;
      if (dp[i] == num3) &#123;
        p3++;
      &#125;
      if (dp[i] == num5) &#123;
        p5++;
      &#125;
    &#125;
    return dp[n];
  &#125;
&#125;
```

参考后重写（4ms，45.20%）：

主要就是乘2，乘3，乘5，必须是对上一次最小的数进行计算。而动态规划最擅长的就是依赖之前状态的值进行计算了。

这里用到3个指针，表明分别该用哪个数来乘2、乘3和乘5

```java
class Solution &#123;
  public int nthUglyNumber(int n) &#123;
    int index = 1, min = 1, twoIndex = 0, threeIndex = 0, fiveIndex = 0;
    int[] dp = new int[n];
    dp[0] = 1;
    while (index &lt; n) &#123;
      int twoNum = dp[twoIndex] * 2;
      int threeNum = dp[threeIndex] * 3;
      int fiveNum = dp[fiveIndex] * 5;
      dp[index] = Math.min(twoNum,Math.min(threeNum,fiveNum));
      if(dp[index] == twoNum)&#123;
        ++twoIndex;
      &#125;
      if(dp[index] == threeNum)&#123;
        ++threeIndex;
      &#125;
      if(dp[index] == fiveNum)&#123;
        ++fiveIndex;
      &#125;
      ++index;
    &#125;
    return dp[n-1];
  &#125;
&#125;
```

### 670. 最大交换

> [670. 最大交换 - 力扣（LeetCode）](https://leetcode.cn/problems/maximum-swap/)

语言：java

思路：许久没有做题了，脑子烂掉。

+ 最优情况即整个数字串就是从大到小排序好的，无需调换位置。例如9973
+ 坏一点的情况，例如9937，则是和最优情况差一点，&lt;u>右边某部分存在不是 从大到小排序好的&lt;/u>，则需要调换。

所以，先对原数字串从到小排序得到新数字串，然后左到右遍历新数字串，和原本数字串对比，找到第一个不一样的数字，这个数字需要被调换位置。接着为了让数字尽量大，从右边往左在原来的数字串中找到对应的数字，将这两个下标进行调换。

代码（1ms，38.17%）

```java
class Solution &#123;
  public int maximumSwap(int num) &#123;
    char[] rawArray = String.valueOf(num).toCharArray();
    char[] numberCharArray = String.valueOf(num).toCharArray();
    Arrays.sort(numberCharArray);
    int len = numberCharArray.length;
    for (int i = 0; i &lt; len - 1 - i; ++i) &#123;
      swap(numberCharArray, i, len - i - 1);
    &#125;
    int left = 0, right = len - 1;
    while (right > left) &#123;
      while (right > left && numberCharArray[left] == rawArray[left]) &#123;
        ++left;
      &#125;
      while (right > left && rawArray[right] != numberCharArray[left]) &#123;
        --right;
      &#125;
      if (right > left) &#123;
        swap(rawArray, left, right);
        break;
      &#125;
    &#125;
    int result = 0;
    for (int i = 0; i &lt; len; ++i) &#123;
      result *= 10;
      result += rawArray[i] - '0';
    &#125;
    return result;
  &#125;

  public void swap(char[] arr, int i, int j) &#123;
    char tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  &#125;
&#125;
```

参考代码1（0ms，100%）：

> [【爪哇缪斯】图解LeetCode - 最大交换 - 力扣（LeetCode）](https://leetcode.cn/problems/maximum-swap/solution/by-muse-77-hwnt/)

```java
class Solution &#123;
  public int maximumSwap(int num) &#123;
    char[] numArr = String.valueOf(num).toCharArray();        
    int[] maxIndexs = new int[numArr.length];

    int index = numArr.length - 1;
    for (int i = numArr.length - 1; i >= 0; i--) &#123;
      if (numArr[i] > numArr[index]) index = i;
      maxIndexs[i] = index;
    &#125;

    for (int i = 0; i &lt; numArr.length; i++) &#123;
      if (numArr[i] != numArr[maxIndexs[i]]) &#123;
        char temp = numArr[i];
        numArr[i] = numArr[maxIndexs[i]];
        numArr[maxIndexs[i]] = temp;
        break;
      &#125;
    &#125;

    return Integer.valueOf(new String(numArr));
  &#125;
&#125;
```

参考后重写：

（1）什么情况需要调换位置 => 某下标 右边部分 存在数字比自己当前数字大 => 如何表示 某下标右边的值比自己大 => 试图用当前下标表示右边比自己大的数字

（2）怎么调换位置最划算 => 同样是需要兑换位置的情况，左边的数字尽量靠近左边，右边的数字尽量靠近右边，且右边的数字尽量大

（3）最后怎么调换位置

解决（1）：`rightMaxIndex[i] = j` （i &lt;= j），表示 i 右边 比自己大的最大值数字对应的下标j

在（1）的前提下，思考（2），从右边往左遍历数字串，找到右边侧最大值，记录下标到rightMaxIndex[i]，并且下标只记录最大的下标值（即j尽量大）。

在（1）、（2）下思考（3），当`数字串[rightMaxIndex[i]]!=数字串[i]`时，表示某下标对应的数字其右边存在比自己大的数字（其右边部分比自己大的数字中下标最大的下标值是j），对换i和j对应位置的数字，最好替换左边的数字，所以从左到右遍历，找到第一个符合这个情况的，然后对换位置

```java
class Solution &#123;
  public int maximumSwap(int num) &#123;
    char[] rawArray = String.valueOf(num).toCharArray();
    int len = rawArray.length;
    int[] rightMaxIndex = new int[len];
    int max = -1;
    for (int i = len - 1, maxIndex = i; i >= 0; --i) &#123;
      if (rawArray[i] > rawArray[maxIndex]) &#123;
        maxIndex = i;
      &#125;
      rightMaxIndex[i] = maxIndex;
    &#125;
    for (int i = 0; i &lt; len; ++i) &#123;
      if (rawArray[i] != rawArray[rightMaxIndex[i]]) &#123;
        swap(rawArray, i, rightMaxIndex[i]);
        break;
      &#125;
    &#125;
    int result = 0;
    for (int i = 0; i &lt; len; ++i) &#123;
      result *= 10;
      result += rawArray[i] - '0';
    &#125;
    return result;
  &#125;
  // 2736 => 1133

  public void swap(char[] arr, int i, int j) &#123;
    char tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  &#125;
&#125;
```

### 27. 移除元素

语言：java

思路：

1. 最简单暴力的方法，就是一次for循环找到需要删除的数字，第二次for从后往前找不是要删除的数字，和预删除数字对换，然后整理len-1。如果从后往前都是要删除的数字，则只需要len-1。
2. 双指针法(学习)：一个指针用于寻找非删除的值，一个指针用于存储非删除的值。即把指针1找到的不用删除的数据，放到指针2所在位置中（指针2相当于一个新数组，只不过空间刚好和原来数组重叠）。

代码1（0ms，100%）：

```java
class Solution &#123;
  public int removeElement(int[] nums, int val) &#123;
    int len = nums.length;
    for(int i = 0; i &lt; len; ++i) &#123;
      if(nums[i] == val) &#123;
        for(int j = len -1; j >= i ; --j) &#123;
          // 后面的数字不需要删除，则和前面要删除的数字对换
          if(nums[j] != val) &#123;
            int tmp = nums[j];
            nums[j] = nums[i];
            nums[i] = tmp;
            // 删除一个数字后，len-1
            len = len - 1;
            break;
          &#125; 
          // 原本靠后的数字就==要删除的数字，所以直接len-1
          len = len - 1;
        &#125;
      &#125;
    &#125;
    return len;
  &#125;
&#125;
```

代码2（0ms，100%）：

```java
class Solution &#123;
  public int removeElement(int[] nums, int val) &#123;
    // i 用于寻找原数组中不用删除的元素，j用于存放不用删除的元素
    int j = 0;
    for(int i = 0,len = nums.length;i&lt; len; ++ i) &#123;
      if(nums[i] != val) &#123;
        nums[j] = nums[i];
        ++j;
      &#125;
    &#125;
    return j;
  &#125;
&#125;
```

代码3，双向指针（0ms，100%）：目标是用两个指针，实现把删除的元素挪到右边。这里需要注意的是边界什么时候可以取=号。

+ 最外层while（left &lt;=right）因为在[left,right]找数据，left可以=right
+ 中间left、right移动时，可取=号，因为[left，right]找数据
+ 只有left&lt;right才有替换的必要。替换后，left和right当前位置无意义，可以继续挪动指针

```java
class Solution &#123;
  public int removeElement(int[] nums, int val) &#123;
    int len = nums.length;
    int left = 0,right = len -1;
    while(left &lt;= right) &#123;
      // 左到右，寻找需要删除的数据
      while(left &lt;= right && nums[left] != val) &#123;
        ++left;
      &#125;
      // 右到左，寻找可以保留的数据
      while(right >= left && nums[right] == val) &#123;
        --right;
      &#125;
      if(left &lt; right) &#123;
        nums[left++] = nums[right--];
      &#125;
    &#125; 
    return left;
  &#125;
&#125;
```

### 26. 删除有序数组中的重复项

语言：java

思路：双指针，一个指针找不一样的数字，一个指针存储不重复的数字

代码（0ms，100%）：

```java
class Solution &#123;
  public int removeDuplicates(int[] nums) &#123;
    // 题目说 至少1个数字，那么从j从nums[1]开始，用于记录不重复的数字，而i找不重复的数字，找到则存到j中
    int j = 1;
    for(int i =1,len = nums.length;i &lt; len; ++i) &#123;
      if(nums[i] != nums[i-1]) &#123;
        nums[j++] = nums[i];
      &#125;
    &#125; // 223344
    return j;
  &#125;
&#125;
```

参考代码1（0ms，100%）：进行了局部判断的优化

> [【双指针】删除重复项-带优化思路 - 删除有序数组中的重复项 - 力扣（LeetCode）](https://leetcode.cn/problems/remove-duplicates-from-sorted-array/solution/shuang-zhi-zhen-shan-chu-zhong-fu-xiang-dai-you-hu/)
>
> 原题解p+1用于存储不重复的数字，如果完全没有数字重复，就会有多余的重复赋值的步骤。
>
> 而没有重复数字时，p和q只相差1，所以当p和q相差 > 1的时候才有必要显式赋值。

```java
public int removeDuplicates(int[] nums) &#123;
  if(nums == null || nums.length == 0) return 0;
  int p = 0;
  int q = 1;
  while(q &lt; nums.length)&#123;
    if(nums[p] != nums[q])&#123;
      if(q - p > 1)&#123;
        nums[p + 1] = nums[q];
      &#125;
      p++;
    &#125;
    q++;
  &#125;
  return p + 1;
&#125;
```

### 283. 移动零

语言：java

思路：相当于类似把0删除，即挪到数组最后面。最后在把后面位置填充0

代码（1ms，100%）：

```java
class Solution &#123;
  public void moveZeroes(int[] nums) &#123;
    int j =0,len = nums.length;
    for(int i = 0;i&lt; len ;++i) &#123;
      if(nums[i]!=0) &#123;
        nums[j++] = nums[i];
      &#125;
    &#125;
    while(j&lt;len) &#123;
      nums[j++] = 0;
    &#125;
  &#125;
&#125;
```

参考代码1： 

> [动画演示 283.移动零 - 移动零 - 力扣（LeetCode）](https://leetcode.cn/problems/move-zeroes/solution/dong-hua-yan-shi-283yi-dong-ling-by-wang_ni_ma/)
>
> 下方评论区

```java
public void moveZeroes(int[] nums)  &#123;
  int length;
  if (nums == null || (length = nums.length) == 0) &#123;
    return;
  &#125;
  int j = 0;
  for (int i = 0; i &lt; length; i++) &#123;
    if (nums[i] != 0) &#123;
      if (i > j) &#123;// 当i > j 时，只需要把 i 的值赋值给j，并把原位置的值置0。同时这里也把交换操作换成了赋值操作，减少了一条操作语句，理论上能更节省时间。
        nums[j] = nums[i];
        nums[i] = 0;
      &#125;
      j++;
    &#125;
  &#125;
&#125;
```

### 209. 长度最小的子数组

语言：java

思路：最外情况即包含整个数组。使用滑动窗口，先只移动右边界，直到第一个能够满足的情况。如果满足条件，则尝试移动左边界，直到不满足条件为止，再此挪动右边界。

代码（1ms，99.99%）：

```java
class Solution &#123;
  public int minSubArrayLen(int target, int[] nums) &#123;
    int min = Integer.MAX_VALUE;
    int left = 0,right = 0,sum = 0, len = nums.length;
    while(left &lt;= right) &#123; // 一开始 left = right，所以 可以 =
      if(sum>=target) &#123; // 如果 当前 和 >= target，可以尝试缩小左边界
        min = Math.min(min, right-left);
        sum-=nums[left];
        ++left;
      &#125;else if(right &lt; len)&#123; // 如果 right 可以继续挪动，则尝试移动右边界
        sum += nums[right];
        ++right;
      &#125; else &#123; // 如果到这里，说明 sum &lt; target并且右边界不能继续扩大了，sum只会越来越小，直接退出
        break;
      &#125;
    &#125;
    return min == Integer.MAX_VALUE ? 0 : min;
  &#125;
&#125;
```

参考代码1（1ms，99.99%）：

> [长度最小的子数组 - 长度最小的子数组 - 力扣（LeetCode）](https://leetcode.cn/problems/minimum-size-subarray-sum/solution/chang-du-zui-xiao-de-zi-shu-zu-by-leetcode-solutio/)
>
> 一样是滑动窗口，不过代码更简洁

```java
class Solution &#123;
    public int minSubArrayLen(int s, int[] nums) &#123;
        int n = nums.length;
        if (n == 0) &#123;
            return 0;
        &#125;
        int ans = Integer.MAX_VALUE;
        int start = 0, end = 0;
        int sum = 0;
        while (end &lt; n) &#123;
            sum += nums[end];
            while (sum >= s) &#123;
                ans = Math.min(ans, end - start + 1);
                sum -= nums[start];
                start++;
            &#125;
            end++;
        &#125;
        return ans == Integer.MAX_VALUE ? 0 : ans;
    &#125;
&#125;
```

### 904. 水果成篮

语言：java

思路：滑动窗口，默认先只移动有边界，直到达到2种果实的最大上限限制后，在移动左边界。这里和普通的滑动窗口不一样的是，如何判断滑动窗口内种类超过2种（这个我判断的方法写的不好，一直没过，蛋疼）。

参考代码（58ms，21.75%）：

> [水果成篮 - 水果成篮 - 力扣（LeetCode）](https://leetcode.cn/problems/fruit-into-baskets/solution/shui-guo-cheng-lan-by-leetcode/)

```java
class Solution &#123;
  public int totalFruit(int[] tree) &#123;
    int ans = 0, i = 0;
    Counter count = new Counter();
    for (int j = 0; j &lt; tree.length; ++j) &#123;
      count.add(tree[j], 1);
      while (count.size() >= 3) &#123;
        count.add(tree[i], -1);
        if (count.get(tree[i]) == 0)
          count.remove(tree[i]);
        i++;
      &#125;

      ans = Math.max(ans, j - i + 1);
    &#125;

    return ans;
  &#125;
&#125;

class Counter extends HashMap&lt;Integer, Integer> &#123;
  public int get(int k) &#123;
    return containsKey(k) ? super.get(k) : 0;
  &#125;

  public void add(int k, int v) &#123;
    put(k, get(k) + v);
  &#125;
&#125;
```

参考代码2（5ms，97.39%）：

> 评论区题解。我最早的写法类似这个，但是对2个篮子的记录处理写得不妥过不了。

```java
// 本题要求，选择一个最长只有两个元素的子序列
class Solution &#123;
  public int totalFruit(int[] fruits) &#123;
    if(fruits.length == 1 && fruits.length == 2) &#123;
      return fruits.length;
    &#125;
    int basket1 = -1, basket2 = -1; //记录当前篮子里的水果
    int sum = 0;
    int curFruit = -1, curFruitLoc = 0; //记录当前的水果，和当前水果的起始位置
    int subSum = 0;
    int j = 0; // 记录篮子起始位置
    for (int i = 0; i &lt; fruits.length; ++i) &#123;
      if (fruits[i] == basket1 || fruits[i] == basket2)
      &#123;
        if (fruits[i] != curFruit) &#123;// 记录在篮子里的连续最近，在更换篮子里水果的时候使用
          curFruit = fruits[i];
          curFruitLoc = i;
        &#125;
      &#125;
      else &#123;
        j = curFruitLoc;
        curFruitLoc = i;
        if (basket1 == curFruit) &#123; // 更新水果篮
          basket2 = fruits[i];
          curFruit = basket2;

        &#125;
        else &#123;
          basket1 = fruits[i];
          curFruit = basket1;
        &#125;
      &#125;
      subSum = (i - j + 1); // 计算最长子序列
      sum = sum > subSum ? sum : subSum;
    &#125;
    return sum;
  &#125;
&#125;
```

参考后重写（6ms，87%）：

```java
// 本题要求，选择一个最长只有两个元素的子序列
class Solution &#123;
  public int totalFruit(int[] fruits) &#123;
    int len = fruits.length;
    if(len &lt;= 2) &#123;
      return len;
    &#125;
    // [0,0,1,1]
    // [3,3,3,1,2,1,1,2,3,3,4]
    int right = 0 ,left = 0,basket1 = -1,basket2 = -1,lastFruit =-1,lastIndex = 0,max = 0;
    while(right &lt; len) &#123;
      // 当前遍历的果子 和 之前 框里 的一致
      if(fruits[right] == basket1 || fruits[right] == basket2) &#123;
        if(fruits[right]!=lastFruit) &#123; // 当right边界不是连续的果子时，记录边界点，比如2234的3,后面更换篮子用
          lastFruit = fruits[right];
          lastIndex = right;
        &#125;

      &#125;else &#123;
        // 如果和框里的不一致，说明出现第3种果子，替换掉果子种类最早的一种（left=前一次遇到的第二种果子）
        left = lastIndex;
        lastIndex = right;
        // 决定把本次遇到的不一样的果子放到哪个框里（二选一）
        if(lastFruit == basket1) &#123;
          basket2 = fruits[right];
          lastFruit = fruits[right];
        &#125; else &#123;
          basket1 = fruits[right];
          lastFruit = fruits[right];
        &#125;
      &#125;
      max = Math.max(max, right-left+1);
      ++right;
    &#125;
    return max;
  &#125;
&#125;
```

### 79. 最小覆盖子串

语言：java

思路：能看出来是滑动窗口，暴力的滑动窗口的话，需要至少2个Map，一个记录当前遍历的字符，一个记录要求匹配的字符。

参考代码（2ms，96.55%）：

> [最小覆盖子串 - 最小覆盖子串 - 力扣（LeetCode）](https://leetcode.cn/problems/minimum-window-substring/solution/zui-xiao-fu-gai-zi-chuan-by-leetcode-solution/)
> 评论区大神：

```java
// 常规思路是右指针一直右移，直到窗口中包含t，然后左指针一直右移，直到窗口中不包含t，此过程中要一直验证窗口中是否包含t，时间复杂度高
// 思想：滑动窗口（优化版） 面对窗口中是否包含某一字符串这一问题，可以用数组统计每个字符出现的次数的方式。在该题中，右指针是一直右移直到窗口包含t，此时左指针不一定移动，只有当左指针指向的字符在窗口出现的次数太多时，即抛弃该字符窗口内仍包含t，此时才移动左指针。
// 时间复杂度：O(N) 空间复杂度：O(C)
class Solution &#123;
  public String minWindow(String s, String t) &#123;
    char[] cs = s.toCharArray(), ct = t.toCharArray();

    // 将字符串t中每个字母出现的次数统计出来，这里--可以理解为有这么多的坑要填
    int[] count = new int[128];
    for(char c:ct) count[c]--;

    String res = "";
    for(int i=0,j=0,cnt=0; i&lt;cs.length; i++)&#123;
      // 利用字符cs[i]去填count数组的坑
      count[cs[i]]++;
      // 如果填完坑之后发现，坑没有满或者刚好满，那么这个填坑是有效的，否则如果坑本来就是满的，这次填坑是无效的
      // 注意其他非t中出现的字符，count数组的值是0，原来坑就是满的，那么填入count数组中，count[cs[i]]肯定大于0
      if(count[cs[i]]&lt;=0) cnt++;
      // 如果cnt等于ct.length，那么说明窗口内已经包含t了，这时就要考虑移动左指针了，只有当左指针指向的字符是冗余的情况下，即count[cs[j]]>0，才能保证去掉该字符后，窗口中仍然包含t
      // 注意cnt达到字符串t的长度后，它的值就不会再变化了，因为窗口内包含t之后，就会一直包含
      while(cnt==ct.length && count[cs[j]]>0)&#123;
        count[cs[j]]--;
        j++;
      &#125;
      // 当窗口内包含t后，计算此时窗口内字符串的长度，更新res
      if(cnt==ct.length)&#123;
        if(res.equals("") || res.length()>(i-j+1))
          res = s.substring(j, i+1);
      &#125;
    &#125;

    return res;
  &#125;
&#125;
```

### 19. 删除链表的倒数第 N 个结点

语言：java

思路：一般来说倒数，即需要从后往前数。但是从后往前数，这个动作不一定需要先遍历到最后一个节点再执行，提前数好倒数N个节点的窗口，然后挪动整个窗口，最后右边界在最后一个节点，我们就找到倒数第N个节点了。

代码（0ms，100%）：

```java
/**
 * Definition for singly-linked list.
 * public class ListNode &#123;
 *     int val;
 *     ListNode next;
 *     ListNode() &#123;&#125;
 *     ListNode(int val) &#123; this.val = val; &#125;
 *     ListNode(int val, ListNode next) &#123; this.val = val; this.next = next; &#125;
 * &#125;
 */
class Solution &#123;
  public ListNode removeNthFromEnd(ListNode head, int n) &#123;
    ListNode result = new ListNode();
    ListNode lastN = result;
    result.next = head;
    head = result;
    while(n-- > 0) &#123;
      head = head.next;
    &#125;
    while(head.next != null)&#123;
      head = head.next;
      lastN = lastN.next;
    &#125;
    lastN.next = lastN.next.next;
    return result.next;
  &#125;
&#125;
```

### 面试题02.07. 链表相交

语言：java

思路：以前做过，这个思路比较巧妙。两个链表长度可能不一致，如果要他们长度一致，那么就是两个链表各自遍历完自己的链表后，再遍历别人的链表。如果两个链表有交集，那么他们经过相同的路程长后（A链表+B链表），一定会相遇。

代码（1ms，97.42%）：

```java
/**
 * Definition for singly-linked list.
 * public class ListNode &#123;
 *     int val;
 *     ListNode next;
 *     ListNode(int x) &#123;
 *         val = x;
 *         next = null;
 *     &#125;
 * &#125;
 */
public class Solution &#123;
  public ListNode getIntersectionNode(ListNode headA, ListNode headB) &#123;
    ListNode aNode = headA,bNode = headB;
    while(aNode!= null || bNode != null) &#123;
      if(aNode == bNode) &#123;
        return aNode;
      &#125;
      aNode = aNode == null? headB : aNode.next;
      bNode = bNode == null? headA : bNode.next;
    &#125;
    return null;
  &#125;
&#125;
```

参考代码1（1ms，97.42%）：思路更加清晰，其实遍历的次数也一样，就是先统计两个链表的长度，然后较长的一个先移动（长度差）个节点，之后再两个链表节点挨个判断是否相交。

```java
public class Solution &#123;
  public ListNode getIntersectionNode(ListNode headA, ListNode headB) &#123;
    ListNode curA = headA;
    ListNode curB = headB;
    int lenA = 0, lenB = 0;
    while (curA != null) &#123; // 求链表A的长度
      lenA++;
      curA = curA.next;
    &#125;
    while (curB != null) &#123; // 求链表B的长度
      lenB++;
      curB = curB.next;
    &#125;
    curA = headA;
    curB = headB;
    // 让curA为最长链表的头，lenA为其长度
    if (lenB > lenA) &#123;
      //1. swap (lenA, lenB);
      int tmpLen = lenA;
      lenA = lenB;
      lenB = tmpLen;
      //2. swap (curA, curB);
      ListNode tmpNode = curA;
      curA = curB;
      curB = tmpNode;
    &#125;
    // 求长度差
    int gap = lenA - lenB;
    // 让curA和curB在同一起点上（末尾位置对齐）
    while (gap-- > 0) &#123;
      curA = curA.next;
    &#125;
    // 遍历curA 和 curB，遇到相同则直接返回
    while (curA != null) &#123;
      if (curA == curB) &#123;
        return curA;
      &#125;
      curA = curA.next;
      curB = curB.next;
    &#125;
    return null;
  &#125;

&#125;
```

