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

  @Attribute(DataTypes.STRING)
  @NotNull
  declare accessKeyId: string;

  @Attribute(DataTypes.STRING)
  @NotNull
  declare secretAccessKey: string;

  @Attribute(DataTypes.BOOLEAN)
  @NotNull
  declare s3BucketEndpoint: boolean;

  @Attribute(DataTypes.STRING)
  @NotNull
  declare publicBaseUrl: string;

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
      s3BucketEndpoint: this.s3BucketEndpoint,
      publicBaseUrl: this.publicBaseUrl,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
