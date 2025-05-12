import { securityLogger } from '../logger';

// Define sensitive data types
export enum SensitiveDataType {
  SSN = 'ssn',
  PHONE = 'phone',
  EMAIL = 'email',
  ADDRESS = 'address',
  NAME = 'name',
  DOB = 'dob',
  MEDICAL_RECORD = 'medical_record',
  INSURANCE = 'insurance'
}

// Define masking patterns
const MASKING_PATTERNS = {
  [SensitiveDataType.SSN]: {
    pattern: /(\d{3})-(\d{2})-(\d{4})/,
    replacement: 'XXX-XX-$3'
  },
  [SensitiveDataType.PHONE]: {
    pattern: /(\d{3})-(\d{3})-(\d{4})/,
    replacement: '($1) XXX-$3'
  },
  [SensitiveDataType.EMAIL]: {
    pattern: /(.{3})(.*)(@.*)/,
    replacement: '$1***$3'
  },
  [SensitiveDataType.ADDRESS]: {
    pattern: /(\d+)\s+([A-Za-z\s]+)/,
    replacement: 'XXX $2'
  },
  [SensitiveDataType.NAME]: {
    pattern: /^(\w{1})\w*\s+(\w{1})\w*$/,
    replacement: '$1*** $2***'
  },
  [SensitiveDataType.DOB]: {
    pattern: /(\d{4})-(\d{2})-(\d{2})/,
    replacement: 'XXXX-XX-$3'
  },
  [SensitiveDataType.MEDICAL_RECORD]: {
    pattern: /(MRN|ID):\s*(\d+)/,
    replacement: '$1: XXX-$2'
  },
  [SensitiveDataType.INSURANCE]: {
    pattern: /(\d{4})-(\d{4})-(\d{4})/,
    replacement: 'XXXX-XXXX-$3'
  }
};

class DataMasking {
  private static instance: DataMasking;

  private constructor() {}

  public static getInstance(): DataMasking {
    if (!DataMasking.instance) {
      DataMasking.instance = new DataMasking();
    }
    return DataMasking.instance;
  }

  public maskData(data: string, type: SensitiveDataType): string {
    try {
      const pattern = MASKING_PATTERNS[type];
      if (!pattern) {
        throw new Error(`No masking pattern defined for type: ${type}`);
      }

      return data.replace(pattern.pattern, pattern.replacement);
    } catch (error) {
      securityLogger.log({
        type: 'privacy',
        severity: 'medium',
        message: 'Data masking failed',
        metadata: { type, error: error.message }
      });
      return data; // Return original data if masking fails
    }
  }

  public maskObject(obj: Record<string, any>, maskMap: Record<string, SensitiveDataType>): Record<string, any> {
    const maskedObj = { ...obj };

    for (const [key, type] of Object.entries(maskMap)) {
      if (maskedObj[key] && typeof maskedObj[key] === 'string') {
        maskedObj[key] = this.maskData(maskedObj[key], type);
      }
    }

    return maskedObj;
  }

  public maskArray(arr: any[], maskMap: Record<string, SensitiveDataType>): any[] {
    return arr.map(item => {
      if (typeof item === 'object' && item !== null) {
        return this.maskObject(item, maskMap);
      }
      return item;
    });
  }

  public maskNestedObject(
    obj: Record<string, any>,
    maskMap: Record<string, SensitiveDataType>
  ): Record<string, any> {
    const maskedObj = { ...obj };

    for (const [key, value] of Object.entries(maskedObj)) {
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          maskedObj[key] = this.maskArray(value, maskMap);
        } else {
          maskedObj[key] = this.maskNestedObject(value, maskMap);
        }
      } else if (typeof value === 'string' && maskMap[key]) {
        maskedObj[key] = this.maskData(value, maskMap[key]);
      }
    }

    return maskedObj;
  }
}

// Export singleton instance
export const dataMasking = DataMasking.getInstance(); 