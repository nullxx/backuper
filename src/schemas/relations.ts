import { Backup } from "./backup.schema";
import { Bucket } from "./bucket.schema";
import { DBSchedule } from "./dbschedule.schema";

export function defineRelations() {
  DBSchedule.belongsTo(Bucket, {
    foreignKey: {
      name: "bucketId",
      onDelete: "CASCADE",
    },
  });
  
  Backup.belongsTo(DBSchedule, {
    foreignKey: {
      name: "dbScheduleId",
      onDelete: "CASCADE",
    },
  });
  
  Backup.belongsTo(Bucket, {
    foreignKey: {
      name: "bucketId",
      onDelete: "CASCADE",
    },
  });
}
