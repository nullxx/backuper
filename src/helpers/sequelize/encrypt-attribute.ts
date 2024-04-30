import crypto, { CipherGCMTypes } from 'crypto';
import { DataTypeClassOrInstance, DataTypes, Model } from "@sequelize/core";
import { Attribute, BeforeSave, AfterFind, AllowNull, BeforeFindAfterOptions } from '@sequelize/core/decorators-legacy';
import stringify from 'fast-safe-stringify';

type CipherAlgorithm = CipherGCMTypes;

const defaultAlgorithm: CipherAlgorithm = 'aes-256-gcm';
const defaultAttributePrefix = '_encrypted_';
const defaultEncryptedStoreSize = 'long';

interface EncryptOptions {
    /**
     * Cipher algorithm to use for encryption. Defaults to 'aes-256-gcm'
     */
    algorithm?: CipherAlgorithm;

    /**
     * Cipher encryption key
     */
    key: string;

    /**
     * Cipher encryption iv
     */
    iv: string;
}

interface EncryptAttributeOptions extends EncryptOptions {
    /**
     * Prefix to use for the encrypted attribute. Defaults to '_encrypted_'
     */
    attributePrefix?: string;

    /**
     * Size of the BLOB to use for the encrypted store. Defaults to 'long'
     */
    encryptedStoreSize?: 'tiny' | 'medium' | 'long'; // import { BlobLength } from '@sequelize/core/_non-semver-use-at-your-own-risk_/abstract-dialect/data-types.js';
}

const supportedTypes: DataTypeClassOrInstance[] = [
    DataTypes.STRING,
    DataTypes.TEXT,
    DataTypes.UUID,
    DataTypes.UUIDV1,
    DataTypes.UUIDV4, DataTypes.CHAR,
    DataTypes.INET,
    DataTypes.CIDR,
    DataTypes.MACADDR,
    DataTypes.MACADDR8,
    DataTypes.ENUM,
    DataTypes.INTEGER,
    DataTypes.SMALLINT,
    DataTypes.TINYINT,
    DataTypes.MEDIUMINT,
    DataTypes.BIGINT,
    DataTypes.FLOAT,
    DataTypes.DOUBLE,
    DataTypes.DECIMAL,
    DataTypes.REAL,
    DataTypes.JSON,
    DataTypes.JSONB,
    DataTypes.DATE,
    DataTypes.DATEONLY,
    DataTypes.TIME,
    DataTypes.BOOLEAN,
    DataTypes.RANGE(DataTypes.DATE),
    DataTypes.RANGE(DataTypes.DATEONLY),
    DataTypes.BLOB,
];

function encrypt(data: Buffer, options: EncryptOptions) {
    const cipher = crypto.createCipheriv(options.algorithm || defaultAlgorithm, Buffer.from(options.key), Buffer.from(options.iv));
    let crypted = cipher.update(data);
    crypted = Buffer.concat([crypted, cipher.final(), cipher.getAuthTag()]);
    return crypted;
}

function decrypt(data: Buffer, options: EncryptOptions) {
    const authTag = data.subarray(data.length - 16);
    const decipher = crypto.createDecipheriv(options.algorithm || defaultAlgorithm, Buffer.from(options.key), Buffer.from(options.iv));
    decipher.setAuthTag(authTag);
    const dataWithoutAuthTag = data.subarray(0, data.length - 16);
    let dec = decipher.update(dataWithoutAuthTag);
    dec = Buffer.concat([dec, decipher.final()]);
    return dec;
}

function convertAnyToBuffer(data: any) {
    if (typeof data === 'string') {
        return Buffer.from(data);
    } else if (typeof data === 'number') {
        return Buffer.from(data.toString());
    } else if (typeof data === 'object') {
        return Buffer.from(stringify(data));
    } else {
        throw new Error('Invalid data type');
    }
}

function isType(type1: DataTypeClassOrInstance, type2: DataTypeClassOrInstance) {
    if (type1 instanceof DataTypes.ABSTRACT) {
        return true;
    } else {
        return type1 === type2;
    }
}
function convertBufferToType(data: Buffer | null | undefined, ltype: DataTypeClassOrInstance) {
    if (data === null || data === undefined || data.length === 0) return null;

    if (isType(ltype, DataTypes.STRING) ||
        isType(ltype, DataTypes.TEXT) ||
        isType(ltype, DataTypes.UUID) ||
        isType(ltype, DataTypes.UUIDV1) ||
        isType(ltype, DataTypes.UUIDV4) ||
        isType(ltype, DataTypes.CHAR) ||
        isType(ltype, DataTypes.INET) ||
        isType(ltype, DataTypes.CIDR) ||
        isType(ltype, DataTypes.MACADDR) ||
        isType(ltype, DataTypes.MACADDR8) ||
        isType(ltype, DataTypes.ENUM)) {
        return data.toString();
    } else if (
        isType(ltype, DataTypes.INTEGER) ||
        isType(ltype, DataTypes.SMALLINT) ||
        isType(ltype, DataTypes.TINYINT) ||
        isType(ltype, DataTypes.MEDIUMINT) ||
        isType(ltype, DataTypes.BIGINT) ||
        isType(ltype, DataTypes.FLOAT) ||
        isType(ltype, DataTypes.DOUBLE) ||
        isType(ltype, DataTypes.DECIMAL) ||
        isType(ltype, DataTypes.REAL)
    ) {
        return Number(data.toString());
    } else if (
        isType(ltype, DataTypes.JSON) ||
        isType(ltype, DataTypes.JSONB)
    ) {
        return JSON.parse(data.toString());
    } else if (
        isType(ltype, DataTypes.DATE) ||
        isType(ltype, DataTypes.DATEONLY) ||
        isType(ltype, DataTypes.TIME)
    ) {
        return new Date(data.toString());
    } else if (isType(ltype, DataTypes.BOOLEAN)) {
        return data.toString().length === 1 ? data.toString() === '1' : data.toString() === 'true';
    } else if (
        isType(ltype, DataTypes.RANGE(DataTypes.DATE)) ||
        isType(ltype, DataTypes.RANGE(DataTypes.DATEONLY))
    ) {
        const range = data.toString();
        try {
            const parsedRange = JSON.parse(range);
            return parsedRange.map((r: any) => ({
                ...r,
                inclusive: r.inclusive === true || r.inclusive === 'true',
                value: new Date(r.value)
            }));
        } catch (e) {
            return null;
        }
    } else if (
        isType(ltype, DataTypes.BLOB) ||
        isType(ltype, DataTypes.BLOB('tiny')) ||
        isType(ltype, DataTypes.BLOB('medium')) ||
        isType(ltype, DataTypes.BLOB('long'))
    ) {
        return data;
    } else {
        return null;
    }
}

const toJSONFn = function(this: any) {
    const obj = this.get();
    const keys = Object.keys(obj);
    keys.forEach((key) => {
        if (key.startsWith(defaultAttributePrefix)) {
            delete obj[key];
        }
    });

    return obj;
}

function beforeSaveCallback(attributeName: string, propertyKey: string, options: EncryptAttributeOptions, obj: any) {
    let value = null;
    if (obj[propertyKey]) value = encrypt(convertAnyToBuffer(obj[propertyKey]), options);
    obj.setDataValue(attributeName, value);
}

function afterFindCallback(attributeName: string, propertyKey: string, options: EncryptAttributeOptions, type: DataTypeClassOrInstance, obj: Model | Model[] | null) {
    if (obj === null) return;

    let value = null;

    if (Array.isArray(obj)) {
        obj.forEach((element) => {
            afterFindCallback(attributeName, propertyKey, options, type, element);
        });
    } else {
        value = obj.getDataValue(attributeName);
        if (value) {
            const decryptedValue = decrypt(value, options);
            value = convertBufferToType(decryptedValue, type);
        }
        obj.setDataValue(propertyKey, value);
        obj.changed(propertyKey, false);
    }
}

function beforeFindCallback(attributeName: string, propertyKey: string, options: EncryptAttributeOptions, opts: any) {
    if (opts.where && opts.where[propertyKey]) {
        // find by encrypted value
        opts.where[attributeName] = encrypt(convertAnyToBuffer(opts.where[propertyKey]), options);
        // remove the original attribute from the where clause
        delete opts.where[propertyKey];
    }
}

/**
 * Decorator to encrypt an attribute in the model.
 * @description The attribute will be stored in the database as a BLOB and will be encrypted using the provided key and iv.
 * Note that find on this attribute will only work in equality conditions. e.g. { where: { attribute: 'value' } }
 * @see {@link supportedTypes} for the list of supported data types.
 * @param type {@link DataTypeClassOrInstance}
 * @param options {@link EncryptAttributeOptions}
 */
export function EncryptedAttribute(type: DataTypeClassOrInstance, options: EncryptAttributeOptions) {
    if (!supportedTypes.some(supportedType => isType(type, supportedType))) throw new Error(`Invalid data type ${type} for @EncryptedAttribute`);

    return function (target: any, propertyKey: keyof any) {
        target.constructor.prototype['toJSON'] = toJSONFn;

        function getAttributeName() {
            return options.attributePrefix || defaultAttributePrefix + propertyKey.toString();
        }

        /* we need to define a virtual attribute to store the decrypted value ##### */
        Attribute(DataTypes.VIRTUAL)(target, propertyKey as string);

        // we need to define a real attribute to store the encrypted value. BLOB long
        Attribute(DataTypes.BLOB(options.encryptedStoreSize || defaultEncryptedStoreSize))(target, getAttributeName());
        AllowNull(target, getAttributeName());

        /* ##### hooks callback definition ##### */
        target.constructor[beforeSaveCallback.name] = beforeSaveCallback.bind(null, getAttributeName(), propertyKey as string, options);
        target.constructor[afterFindCallback.name] = afterFindCallback.bind(null, getAttributeName(), propertyKey as string, options, type);
        target.constructor[beforeFindCallback.name] = beforeFindCallback.bind(null, getAttributeName(), propertyKey as string, options);


        /* ##### hooks registration to the model ##### */

        // to encrypt the attribute before saving
        BeforeSave(target.constructor, beforeSaveCallback.name);

        // to decrypt the attribute after finding
        AfterFind(target.constructor, afterFindCallback.name);

        // to encrypt the attribute before finding
        BeforeFindAfterOptions(target.constructor, beforeFindCallback.name);
    }
}
