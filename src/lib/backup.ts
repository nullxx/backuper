import { Backup, BackupStatus } from "../schemas/backup.schema";
import { Bucket } from "../schemas/bucket.schema";
import { DBSchedule, DBType } from "../schemas/dbschedule.schema";
import { doMongoBackupToFile } from "./mongodb";
import { doMySQLBackupToFile } from "./mysql";
import { S3 } from "./s3";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import Logger from "./logger";
import { doPostgreSQLBackupToFile } from "./postgres";

const logger = Logger();

export async function nextDateBackup(dbSchedule: DBSchedule) {
    const lastBackup = await Backup.findOne({
        where: {
            dbScheduleId: dbSchedule.id,
        },
        order: [["createdAt", "DESC"]],
    });

    if (!lastBackup) {
        return new Date();
    }

    const nextDate = new Date(lastBackup.doneAt || lastBackup.updatedAt);
    nextDate.setSeconds(nextDate.getSeconds() + Number(dbSchedule.backupIntervalSeconds));

    return nextDate;
}

export async function nextDateDeleteBackup(dbSchedule: DBSchedule) {
    const lastBackup = await Backup.findOne({
        where: {
            dbScheduleId: dbSchedule.id,
        },
        order: [["createdAt", "DESC"]],
    });

    if (!lastBackup) {
        return new Date();
    }

    const nextDate = new Date(lastBackup.doneAt || lastBackup.updatedAt);
    nextDate.setSeconds(nextDate.getSeconds() + Number(dbSchedule.backupRetentionSeconds));
    return nextDate;
}

export async function deleteBackup(backup: Backup) {
    const bucket = await Bucket.findByPk(backup.bucketId);
    if (!bucket) throw new Error("Bucket not found");

    const s3 = new S3({
        accessKeyId: bucket.accessKeyId,
        secretAccessKey: bucket.secretAccessKey,
        endpoint: bucket.endpoint,
        disableHostPrefix: bucket.disableHostPrefix,
        forcePathStyle: bucket.forcePathStyle,
    });


    if (backup.uri) {
        const obJExists = await s3.objectExists(bucket.bucketName, backup.uri);
        if (obJExists) {
            const deleteObjResult = await s3.deleteObject(bucket.bucketName, backup.uri);
            logger.debug(`Delete object in bucket (${bucket.id}) ${bucket.bucketName}/${backup.uri}: ${JSON.stringify(deleteObjResult)}`);
        } else {
            logger.warn(`Object at bucket id (${bucket.id}) with full uri ${bucket.bucketName}/${backup.uri} not found`);
        }
    } else {
        logger.warn(`Backup ${backup.id} uri is empty`);
    }

    await backup.destroy();
}

export async function createBackup(backup: Backup, dbSchedule: DBSchedule) {
    let outPath: string | null = null;
    const randomFileName = crypto.randomBytes(16).toString("hex");
    const filePath = path.join(os.tmpdir(), "/", randomFileName);

    try {
        if (dbSchedule.dbType === DBType.MONGODB) {
            outPath = await doMongoBackupToFile({
                uri: dbSchedule.dbURI,
                path: filePath,
            });
        } else if (dbSchedule.dbType === DBType.MYSQL || dbSchedule.dbType === DBType.MARIADB) {
            outPath = await doMySQLBackupToFile({ uri: dbSchedule.dbURI, path: filePath, compressFile: true });
        } else if (dbSchedule.dbType === DBType.POSTGRES) {
            outPath = await doPostgreSQLBackupToFile({ uri: dbSchedule.dbURI, path: filePath, compressFile: true });
        }

        if (!outPath) {
            throw new Error(`Unknown database type ${dbSchedule.dbType}`);
        }

        const bucket = await Bucket.findByPk(dbSchedule.bucketId);
        if (!bucket) throw new Error(`Bucket ${dbSchedule.bucketId} not found`);

        const s3 = new S3({
            accessKeyId: bucket.accessKeyId,
            secretAccessKey: bucket.secretAccessKey,
            endpoint: bucket.endpoint,
            disableHostPrefix: bucket.disableHostPrefix,
            forcePathStyle: bucket.forcePathStyle,
        });

        // generate an uri
        const fileExtension = path.extname(outPath);
        const dateText = new Date().toISOString().replace(/:/g, "-");
        const uri = `${dbSchedule.bucketPath}/${dateText}${fileExtension}`;

        await backup.save();

        const uploadResult = await s3.upload(
            bucket.bucketName,
            uri,
            fs.createReadStream(outPath),
        );
        
        logger.debug(`Upload result to ${bucket.bucketName}/${uri} ${JSON.stringify(uploadResult)}`);

        backup.status = BackupStatus.COMPLETED;
        backup.deleteAt = await nextDateDeleteBackup(dbSchedule);
        backup.size = fs.statSync(outPath).size;
        backup.doneAt = new Date();
        backup.uri = uri;

        // diff between now and deleteAt
        const publicUrlExpireIn = (backup.deleteAt.getTime() - new Date().getTime()) / 1000;
        backup.publicUrl = await s3.getPublicUrl(bucket.bucketName, uri, publicUrlExpireIn);
        await backup.save();
    } finally {
        if (outPath) fs.unlinkSync(outPath);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    }



}