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
import { BackupTableName } from "./tableDefinition";
import type { DBSchedule } from "./dbschedule.schema";
import type { Bucket } from "./bucket.schema";

export enum BackupStatus {
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed",
}

@Table({ tableName: BackupTableName, timestamps: true, indexes: [] })
export class Backup extends Model<
  InferAttributes<Backup>,
  InferCreationAttributes<Backup>
> {
  @Attribute(DataTypes.UUID)
  @Default(sql.uuidV4)
  @PrimaryKey
  @NotNull
  declare id: CreationOptional<string>;

  @Attribute(DataTypes.UUID)
  @NotNull
  declare dbScheduleId: ForeignKey<DBSchedule["id"]>;

  @Attribute(DataTypes.UUID)
  @NotNull
  declare bucketId: ForeignKey<Bucket["id"]>;

  @Attribute(DataTypes.STRING)
  declare uri?: string;

  @Attribute(DataTypes.TEXT('medium'))
  declare publicUrl?: string;

  @Attribute(DataTypes.STRING)
  @NotNull
  declare status: BackupStatus;

  @Attribute(DataTypes.TEXT('long'))
  declare message?: string;

  @Attribute(DataTypes.DATE)
  declare doneAt: CreationOptional<Date>;

  @Attribute(DataTypes.DATE)
  declare deleteAt: CreationOptional<Date> | null;

  @Attribute(DataTypes.INTEGER)
  declare size?: number;

  @Attribute(DataTypes.DATE)
  declare createdAt: CreationOptional<Date>;

  @Attribute(DataTypes.DATE)
  declare updatedAt: CreationOptional<Date>;

  formatV1(): Record<string, unknown> {
    return {
      id: this.id,
      dbScheduleId: this.dbScheduleId,
      size: this.size,
      bucketId: this.bucketId,
      publicUrl: this.publicUrl,
      uri: this.uri,
      status: this.status,
      message: this.message,
      doneAt: this.doneAt,
      deleteAt: this.deleteAt,
      createdAt: this.createdAt, 
      updatedAt: this.updatedAt,
    };
  }
}
