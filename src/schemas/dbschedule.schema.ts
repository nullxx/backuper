import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  sql
} from "@sequelize/core";
import { Attribute, Table, Default, PrimaryKey, NotNull } from '@sequelize/core/decorators-legacy';
import { DBScheduleTableName } from "./tableDefinition";
import type { Bucket } from "./bucket.schema";

export enum DBType {
  MARIADB = "mariadb",
  MYSQL = "mysql",
  POSTGRES = "postgres",
  MONGODB = "mongodb",
}

@Table({ tableName: DBScheduleTableName, timestamps: true, indexes: [] })
export class DBSchedule extends Model<
  InferAttributes<DBSchedule>,
  InferCreationAttributes<DBSchedule>
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
  declare dbURI: string;

  @Attribute(DataTypes.STRING)
  @NotNull
  declare dbType: DBType;

  @Attribute(DataTypes.INTEGER)
  @NotNull
  declare backupIntervalSeconds: number;
  
  @Attribute(DataTypes.INTEGER)
  @NotNull
  declare backupRetentionSeconds: number;

  @Attribute(DataTypes.UUID)
  @NotNull
  declare bucketId: ForeignKey<Bucket["id"]>;

  @Attribute(DataTypes.STRING)
  @NotNull
  declare bucketPath: string;

  @Attribute(DataTypes.DATE)
  declare createdAt: CreationOptional<Date>;

  @Attribute(DataTypes.DATE)
  declare updatedAt: CreationOptional<Date>;

  formatV1(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      dbURI: this.dbURI,
      dbType: this.dbType,
      backupIntervalSeconds: this.backupIntervalSeconds,
      backupRetentionSeconds: this.backupRetentionSeconds,
      bucketId: this.bucketId,
      bucketPath: this.bucketPath,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

