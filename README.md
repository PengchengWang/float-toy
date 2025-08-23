# Float Toy - 通用浮点数可视化工具

这是一个用于可视化各种浮点数格式的前端工具，支持任意位数的浮点数类型。

## 功能特性

### 预定义类型
- **fp16**: 16位半精度浮点 (1符号位 + 5指数位 + 10尾数位)
- **fp32**: 32位单精度浮点 (1符号位 + 8指数位 + 23尾数位)  
- **fp64**: 64位双精度浮点 (1符号位 + 11指数位 + 52尾数位)
- **bf16**: Brain Float 16 (1符号位 + 8指数位 + 7尾数位)
- **tf32**: Tensor Float 32 (1符号位 + 8指数位 + 10尾数位)
- **fp12**: 12位浮点 (1符号位 + 4指数位 + 7尾数位)
- **int32**: 32位整数 (1符号位 + 0指数位 + 31尾数位)

### 自定义类型
支持创建任意位数的浮点类型，只需指定：
- 符号位数
- 指数位数  
- 尾数位数

## 使用方法

### 基本操作
1. **点击位**: 点击任意位可以切换其值（0/1）
2. **拖拽**: 按住鼠标拖拽可以连续设置位值
3. **直接输入**: 在数值输入框中直接输入数字
4. **十六进制**: 在十六进制输入框中输入十六进制值

### 创建自定义类型
1. 在"自定义浮点类型"区域设置符号位、指数位、尾数位的数量
2. 点击"创建类型"按钮
3. 系统会自动创建对应的可视化界面

### 位字段说明
- **蓝色**: 符号位
- **绿色**: 指数位  
- **红色**: 尾数位

## 技术实现

### FloatXX 类
核心的通用浮点数类，支持：
- 任意位数的浮点格式
- 自动处理规格化/非规格化数
- 支持特殊值（NaN、无穷大、零）
- 十六进制和二进制表示

### 主要方法
```javascript
// 创建浮点类型
const floatType = new FloatXX(signBits, exponentBits, mantissaBits);

// 数值转换
const bits = floatType.fromNumber(3.14);
const value = floatType.toNumber();

// 十六进制操作
const hex = floatType.toHex();
floatType.fromHex("4048");

// 获取位字段信息
const fields = floatType.getBitFields();
```

### 预定义类型
```javascript
// 使用预定义类型
const bf16 = FloatTypes.bf16();
const tf32 = FloatTypes.tf32();
const custom = FloatTypes.custom(2, 6, 8); // 2符号位 + 6指数位 + 8尾数位
```

## 文件结构

- `index.html` - 主界面和交互逻辑
- `float16.js` - 原有的16位浮点实现（保留兼容性）
- `floatxx.js` - 新的通用浮点类型系统
- `README.md` - 说明文档

## 扩展新类型

### 添加预定义类型
在 `FloatTypes` 对象中添加新的类型定义：

```javascript
const FloatTypes = {
  // ... 现有类型
  newType: () => new FloatXX(1, 6, 9, 16), // 16位浮点
};
```

### 在界面中添加
在 HTML 中添加对应的界面元素，并在 JavaScript 中调用 `loadFloatXX()` 函数。

## 浏览器兼容性

- 支持所有现代浏览器
- 需要支持 ES6 类语法
- 64位以上类型需要支持 BigInt

## 学习资源

- [IEEE 754 浮点标准](https://en.wikipedia.org/wiki/IEEE_754)
- [半精度浮点格式](https://en.wikipedia.org/wiki/Half-precision_floating-point_format)
- [单精度浮点格式](https://en.wikipedia.org/wiki/Single-precision_floating-point_format)
- [双精度浮点格式](https://en.wikipedia.org/wiki/Double-precision_floating-point_format)

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个工具！

## 许可证

MIT License
