/**
 * 通用浮点数类型系统
 * 支持任意符号位、指数位、尾数位的组合
 */

class FloatXX {
  constructor(signBits = 1, exponentBits = 8, mantissaBits = 23, totalBits = null) {
    this.signBits = signBits;
    this.exponentBits = exponentBits;
    this.mantissaBits = mantissaBits;
    this.totalBits = totalBits || (signBits + exponentBits + mantissaBits);

    // 验证参数
    if (this.totalBits !== signBits + exponentBits + mantissaBits) {
      throw new Error('总位数必须等于符号位+指数位+尾数位');
    }

    // 计算指数偏置
    this.exponentBias = (1 << (exponentBits - 1)) - 1;

    // 创建对应的 TypedArray
    this.byteLength = Math.ceil(this.totalBits / 8);
    this.arrayBuffer = new ArrayBuffer(this.byteLength);

    // 根据总位数选择合适的 TypedArray
    if (this.totalBits <= 8) {
      this.uintArray = new Uint8Array(this.arrayBuffer);
    } else if (this.totalBits <= 16) {
      this.uintArray = new Uint16Array(this.arrayBuffer);
    } else if (this.totalBits <= 32) {
      this.uintArray = new Uint32Array(this.arrayBuffer);
    } else if (this.totalBits <= 64) {
      this.uintArray = new BigUint64Array(this.arrayBuffer);
    } else {
      throw new Error('不支持超过64位的浮点数类型');
    }
  }

  /**
   * 从数值转换为位表示
   */
  fromNumber(value) {
    if (!Number.isFinite(value) && !Number.isNaN(value)) {
      throw new Error('不支持的值类型');
    }

    // 处理特殊值
    if (Number.isNaN(value)) {
      return this.createNaN();
    }

    if (value === Infinity) {
      return this.createInfinity(false);
    }

    if (value === -Infinity) {
      return this.createInfinity(true);
    }

    // 处理零
    if (value === 0) {
      return this.createZero(value < 0);
    }

    // 处理正常数值
    const sign = value < 0;
    const absValue = Math.abs(value);

    // 计算指数和尾数
    const log2 = Math.log2(absValue);
    let exponent = Math.floor(log2);
    let mantissa = absValue / Math.pow(2, exponent);

    // 调整到标准范围 [1, 2)
    if (mantissa >= 2) {
      mantissa /= 2;
      exponent += 1;
    }

    // 应用指数偏置
    const biasedExponent = exponent + this.exponentBias;

    // 检查指数范围
    if (biasedExponent < 0) {
      // 下溢，转换为非规格化数
      return this.createDenormal(sign, mantissa * Math.pow(2, exponent));
    }

    if (biasedExponent >= (1 << this.exponentBits)) {
      // 上溢，转换为无穷大
      return this.createInfinity(sign);
    }

    // 构建位表示
    return this.buildBits(sign, biasedExponent, mantissa - 1);
  }

  /**
   * 从位表示转换为数值
   */
  toNumber() {
    const bits = this.getBits();

    // 提取符号、指数、尾数
    const sign = this.extractSign(bits);
    const biasedExponent = this.extractExponent(bits);
    const mantissa = this.extractMantissa(bits);

    // 处理特殊值
    if (biasedExponent === 0) {
      if (mantissa === 0) {
        return sign ? -0 : 0;
      } else {
        // 非规格化数
        return (sign ? -1 : 1) * mantissa * Math.pow(2, -this.exponentBias + 1);
      }
    }

    if (biasedExponent === (1 << this.exponentBits) - 1) {
      if (mantissa === 0) {
        return sign ? -Infinity : Infinity;
      } else {
        return NaN;
      }
    }

    // 正常数
    const exponent = biasedExponent - this.exponentBias;
    const value = (1 + mantissa) * Math.pow(2, exponent);
    return sign ? -value : value;
  }

  /**
   * 获取位表示
   */
  getBits() {
    if (this.totalBits <= 32) {
      return this.uintArray[0];
    } else {
      return Number(this.uintArray[0]);
    }
  }

  /**
   * 设置位表示
   */
  setBits(bits) {
    if (this.totalBits <= 32) {
      this.uintArray[0] = bits;
    } else {
      this.uintArray[0] = BigInt(bits);
    }
  }

  /**
   * 提取符号位
   */
  extractSign(bits) {
    return (bits >> (this.totalBits - this.signBits)) & ((1 << this.signBits) - 1);
  }

  /**
   * 提取指数位
   */
  extractExponent(bits) {
    const shift = this.totalBits - this.signBits - this.exponentBits;
    return (bits >> shift) & ((1 << this.exponentBits) - 1);
  }

  /**
   * 提取尾数位
   */
  extractMantissa(bits) {
    const mantissaBits = this.totalBits - this.signBits - this.exponentBits;
    const mantissa = bits & ((1 << mantissaBits) - 1);
    return mantissa / Math.pow(2, mantissaBits);
  }

  /**
   * 构建位表示
   */
  buildBits(sign, biasedExponent, mantissa) {
    let bits = 0;

    // 符号位
    if (sign) {
      bits |= (1 << (this.totalBits - this.signBits));
    }

    // 指数位
    const exponentShift = this.totalBits - this.signBits - this.exponentBits;
    bits |= (biasedExponent << exponentShift);

    // 尾数位
    const mantissaBits = this.totalBits - this.signBits - this.exponentBits;
    const mantissaValue = Math.round(mantissa * Math.pow(2, mantissaBits));
    bits |= mantissaValue;

    return bits;
  }

  /**
   * 创建NaN
   */
  createNaN() {
    const bits = (1 << (this.totalBits - this.signBits)) - 1; // 全1指数
    const mantissaBits = this.totalBits - this.signBits - this.exponentBits;
    bits |= (1 << (mantissaBits - 1)); // 设置尾数最高位
    return bits;
  }

  /**
   * 创建无穷大
   */
  createInfinity(sign) {
    let bits = (1 << (this.totalBits - this.signBits)) - 1; // 全1指数
    if (sign) {
      bits |= (1 << (this.totalBits - this.signBits));
    }
    return bits;
  }

  /**
   * 创建零
   */
  createZero(sign) {
    let bits = 0;
    if (sign) {
      bits |= (1 << (this.totalBits - this.signBits));
    }
    return bits;
  }

  /**
   * 创建非规格化数
   */
  createDenormal(sign, value) {
    let bits = 0;
    if (sign) {
      bits |= (1 << (this.totalBits - this.signBits));
    }

    const mantissaBits = this.totalBits - this.signBits - this.exponentBits;
    const mantissaValue = Math.round(value * Math.pow(2, this.exponentBias - 1 + mantissaBits));
    bits |= mantissaValue;

    return bits;
  }

  /**
 * 获取十六进制表示
 */
  toHex() {
    const bytes = new Uint8Array(this.arrayBuffer);
    // 修复字节顺序：从高位到低位，保持大端序
    return Array.from(bytes, byte =>
      ('0' + byte.toString(16).toUpperCase()).slice(-2)
    ).join('');
  }

  /**
 * 从十六进制设置
 */
  fromHex(hexString) {
    const bytes = new Uint8Array(this.arrayBuffer);
    const hexBytes = [];

    // 填充到偶数长度
    if (hexString.length % 2 === 1) {
      hexString = '0' + hexString;
    }

    // 解析十六进制
    for (let i = 0; i < hexString.length; i += 2) {
      hexBytes.push(parseInt(hexString.substr(i, 2), 16));
    }

    // 修复字节顺序：保持大端序，不反转
    bytes.fill(0);
    bytes.set(hexBytes, 0);
  }

  /**
   * 获取二进制表示
   */
  toBinary() {
    const bits = this.getBits();
    let binary = '';
    for (let i = this.totalBits - 1; i >= 0; i--) {
      binary += ((bits >> i) & 1) ? '1' : '0';
    }
    return binary;
  }

  /**
   * 获取位字段信息
   */
  getBitFields() {
    const bits = this.getBits();
    const sign = this.extractSign(bits);
    const biasedExponent = this.extractExponent(bits);
    const mantissa = this.extractMantissa(bits);

    return {
      sign: sign,
      biasedExponent: biasedExponent,
      actualExponent: biasedExponent - this.exponentBias,
      mantissa: mantissa,
      totalBits: this.totalBits,
      signBits: this.signBits,
      exponentBits: this.exponentBits,
      mantissaBits: this.totalBits - this.signBits - this.exponentBits
    };
  }
}

// 预定义的浮点数类型
const FloatTypes = {
  // 标准类型
  fp16: () => new FloatXX(1, 5, 10, 16),
  fp32: () => new FloatXX(1, 8, 23, 32),
  fp64: () => new FloatXX(1, 11, 52, 64),

  // 自定义类型
  bf16: () => new FloatXX(1, 8, 7, 16),  // Brain Float 16
  tf32: () => new FloatXX(1, 8, 10, 19), // Tensor Float 32
  fp12: () => new FloatXX(1, 4, 7, 12),  // 12位浮点

  // 整数类型
  int8: () => new FloatXX(1, 0, 7, 8),
  int16: () => new FloatXX(1, 0, 15, 16),
  int32: () => new FloatXX(1, 0, 31, 32),

  // 自定义位数的浮点类型
  custom: (signBits, exponentBits, mantissaBits) =>
    new FloatXX(signBits, exponentBits, mantissaBits)
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FloatXX, FloatTypes };
} else if (typeof window !== 'undefined') {
  window.FloatXX = FloatXX;
  window.FloatTypes = FloatTypes;
}
