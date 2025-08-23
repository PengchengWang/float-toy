# 快速启动指南

## 立即开始

1. **打开主页面**
   ```
   双击 index.html 文件
   ```

2. **查看预定义类型**
   - fp16 (16位半精度浮点)
   - fp32 (32位单精度浮点)  
   - fp64 (64位双精度浮点)
   - bf16 (Brain Float 16)
   - tf32 (Tensor Float 32)
   - fp12 (12位浮点)
   - int32 (32位整数)

3. **创建自定义类型**
   - 在"自定义浮点类型"区域设置位数
   - 点击"创建类型"按钮
   - 系统自动生成可视化界面

## 基本操作

### 交互方式
- **点击位**: 切换0/1值
- **拖拽**: 连续设置位值
- **数值输入**: 直接输入数字
- **十六进制输入**: 输入十六进制值

### 位字段颜色
- 🔵 **蓝色**: 符号位
- 🟢 **绿色**: 指数位
- 🔴 **红色**: 尾数位

## 代码示例

### 创建浮点类型
```javascript
// 预定义类型
const bf16 = FloatTypes.bf16();        // Brain Float 16
const tf32 = FloatTypes.tf32();        // Tensor Float 32

// 自定义类型
const custom = FloatTypes.custom(1, 4, 7);  // 1符号位 + 4指数位 + 7尾数位
```

### 数值操作
```javascript
// 设置值
custom.setBits(custom.fromNumber(3.14159));

// 获取值
const value = custom.toNumber();

// 十六进制
const hex = custom.toHex();
custom.fromHex("4048");
```

### 位字段分析
```javascript
const fields = custom.getBitFields();
console.log(fields.sign);        // 符号
console.log(fields.actualExponent);  // 实际指数
console.log(fields.mantissa);    // 尾数
```

## 常见用途

### 学习浮点格式
- 理解IEEE 754标准
- 观察精度损失
- 学习位操作

### 自定义数值类型
- 神经网络量化
- 特殊硬件支持
- 精度优化实验

### 教学演示
- 计算机组成原理
- 数值分析课程
- 硬件设计验证

## 故障排除

### 页面无法加载
- 确保所有文件在同一目录
- 检查浏览器控制台错误
- 使用现代浏览器（Chrome、Firefox、Edge）

### 自定义类型创建失败
- 总位数不能超过64位
- 检查输入值是否为正整数
- 查看浏览器控制台错误信息

### 数值显示异常
- 检查输入值是否在有效范围内
- 某些特殊值可能显示为NaN或无穷大
- 这是正常现象，符合IEEE 754标准

## 下一步

1. **阅读完整文档**: 查看 `README.md`
2. **运行示例**: 打开 `example.html` 学习代码用法
3. **实验自定义类型**: 尝试不同的位数组合
4. **理解浮点原理**: 观察不同格式的精度差异

## 获取帮助

- 查看浏览器控制台的错误信息
- 参考 `README.md` 中的详细说明
- 检查 `example.html` 中的代码示例
