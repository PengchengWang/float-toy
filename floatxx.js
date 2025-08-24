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

    // 调试配置
    this.debug = {
      enabled: false,
      level: 1, // 1: 基本信息, 2: 详细信息, 3: 完整调试
      log: function (message, level = 1) {
        if (this.enabled && level <= this.level) {
          console.log(`[FloatXX Debug] ${message}`);
        }
      }.bind(this)
    };

    // 验证参数
    if (this.totalBits !== signBits + exponentBits + mantissaBits) {
      throw new Error('总位数必须等于符号位+指数位+尾数位');
    }

    this.debug.log(`创建FloatXX: ${signBits}s + ${exponentBits}e + ${mantissaBits}m = ${this.totalBits}位`, 1);

    // 计算指数偏置
    this.exponentBias = (1 << (exponentBits - 1)) - 1;
    this.debug.log(`指数偏置: ${this.exponentBias}`, 2);

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

    this.debug.log(`使用TypedArray: ${this.uintArray.constructor.name}, 字节长度: ${this.byteLength}`, 2);

    // 对于非8的倍数的总位数，需要特殊处理
    if (this.totalBits % 8 !== 0) {
      this.debug.log(`警告: 总位数${this.totalBits}不是8的倍数，可能影响字节操作`, 1);
    }
  }

  /**
   * 启用/禁用调试
   */
  setDebug(enabled, level = 1) {
    this.debug.enabled = enabled;
    this.debug.level = level;
    this.debug.log(`调试${enabled ? '启用' : '禁用'}, 级别: ${level}`, 1);
  }

  /**
   * 从数值转换为位表示
   */
  fromNumber(value) {
    this.debug.log(`fromNumber: 输入值 ${value}`, 2);

    if (!Number.isFinite(value) && !Number.isNaN(value)) {
      throw new Error('不支持的值类型');
    }

    // 处理特殊值
    if (Number.isNaN(value)) {
      this.debug.log('fromNumber: 创建NaN', 2);
      return this.createNaN();
    }

    if (value === Infinity) {
      this.debug.log('fromNumber: 创建正无穷', 2);
      return this.createInfinity(false);
    }

    if (value === -Infinity) {
      this.debug.log('fromNumber: 创建负无穷', 2);
      return this.createInfinity(true);
    }

    // 处理零
    if (value === 0) {
      this.debug.log('fromNumber: 创建零', 2);
      return this.createZero(value < 0);
    }

    // 处理正常数值
    const sign = value < 0;
    const absValue = Math.abs(value);

    // 计算指数和尾数
    const log2 = Math.log2(absValue);
    let exponent = Math.floor(log2);
    let mantissa = absValue / Math.pow(2, exponent);

    this.debug.log(`fromNumber: log2=${log2}, 初始指数=${exponent}, 初始尾数=${mantissa}`, 3);

    // 调整到标准范围 [1, 2)
    if (mantissa >= 2) {
      mantissa /= 2;
      exponent += 1;
      this.debug.log(`fromNumber: 调整后指数=${exponent}, 尾数=${mantissa}`, 3);
    }

    // 应用指数偏置
    const biasedExponent = exponent + this.exponentBias;
    this.debug.log(`fromNumber: 偏置指数=${biasedExponent}`, 3);

    // 检查指数范围
    if (biasedExponent < 0) {
      // 下溢，转换为非规格化数
      this.debug.log(`fromNumber: 指数下溢，创建非规格化数`, 2);
      return this.createDenormal(sign, mantissa * Math.pow(2, exponent));
    }

    if (biasedExponent >= (1 << this.exponentBits)) {
      // 上溢，转换为无穷大
      this.debug.log(`fromNumber: 指数上溢，创建无穷大`, 2);
      return this.createInfinity(sign);
    }

    // 构建位表示
    const result = this.buildBits(sign, biasedExponent, mantissa - 1);
    this.debug.log(`fromNumber: 构建位表示 ${result.toString(2)}`, 3);
    return result;
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

    this.debug.log(`buildBits: 符号=${sign}, 偏置指数=${biasedExponent}, 尾数=${mantissa}`, 3);

    // 符号位
    if (sign) {
      bits |= (1 << (this.totalBits - this.signBits));
      this.debug.log(`buildBits: 设置符号位, 位置=${this.totalBits - this.signBits}`, 3);
    }

    // 指数位
    const exponentShift = this.totalBits - this.signBits - this.exponentBits;
    bits |= (biasedExponent << exponentShift);
    this.debug.log(`buildBits: 设置指数位, 位置=${exponentShift}, 值=${biasedExponent}`, 3);

    // 尾数位
    const mantissaBits = this.totalBits - this.signBits - this.exponentBits;
    const mantissaValue = Math.round(mantissa * Math.pow(2, mantissaBits));
    bits |= mantissaValue;
    this.debug.log(`buildBits: 设置尾数位, 位数=${mantissaBits}, 值=${mantissaValue}`, 3);

    this.debug.log(`buildBits: 最终位表示 ${bits.toString(2)}`, 3);
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
    // 小端序：从低位到高位
    return Array.from(bytes, byte =>
      ('0' + byte.toString(16).toUpperCase()).slice(-2)
    ).reverse().join('');
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

    // 小端序：反转字节顺序
    bytes.fill(0);
    bytes.set(hexBytes.reverse(), 0);
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
  tf32: () => {
    const tf32 = new FloatXX(1, 8, 10, 19); // Tensor Float 32
    // 启用tf32的调试，帮助排查问题
    tf32.setDebug(true, 2);
    return tf32;
  },
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
