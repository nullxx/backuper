import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  sql
} from "@sequelize/core";
import { Attribute, Table, Default, PrimaryKey, NotNull } from '@sequelize/core/decorators-legacy';
import { BucketTableName } from "./tableDefinition";
import { EncryptedAttribute } from "../lib/helpers/encrypt-attribute";

if (!process.env.DB_ENCRYPT_ATTR_KEY || !process.env.DB_ENCRYPT_ATTR_IV) throw new Error('Missing environment variables: DB_ENCRYPT_ATTR_KEY, DB_ENCRYPT_ATTR_IV');

@Table({ tableName: BucketTableName, timestamps: true, indexes: [] })
export class Bucket extends Model<
  InferAttributes<Bucket>,
  InferCreationAttributes<Bucket>
> {
  @Attribute(DataTypes.UUID)
  @Default(sql.uuidV4)
  @PrimaryKey
  @NotNull
  declare id: CreationOptional<string>;

  @Attribute(DataTypes.STRING)
  @NotNull
  declare name: string;

  @Attribute(DataTypes.STRING)
  @NotNull
  declare bucketName: string;

  @Attribute(DataTypes.STRING)
  @NotNull
  declare endpoint: string;

  // @Attribute(DataTypes.STRING)
  // @NotNull
  @EncryptedAttribute(DataTypes.STRING, { key: process.env.DB_ENCRYPT_ATTR_KEY, iv: process.env.DB_ENCRYPT_ATTR_IV })
  declare accessKeyId: string;

  // @Attribute(DataTypes.STRING)
  // @NotNull
  @EncryptedAttribute(DataTypes.STRING, { key: process.env.DB_ENCRYPT_ATTR_KEY, iv: process.env.DB_ENCRYPT_ATTR_IV })
  declare secretAccessKey: string;

  @Attribute(DataTypes.BOOLEAN)
  @NotNull
  declare disableHostPrefix: boolean;

  @Attribute(DataTypes.BOOLEAN)
  @NotNull
  declare forcePathStyle: boolean;

  @Attribute(DataTypes.DATE)
  declare createdAt: CreationOptional<Date>;

  @Attribute(DataTypes.DATE)
  declare updatedAt: CreationOptional<Date>;

  formatV1(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      bucketName: this.bucketName,
      endpoint: this.endpoint,
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
      disableHostPrefix: this.disableHostPrefix,
      forcePathStyle: this.forcePathStyle,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
