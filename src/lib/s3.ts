import { Body, Expires } from "aws-sdk/clients/s3";
import AWS from "aws-sdk";
import { Readable } from "stream";

export function getProvider({
  endpoint,
  accessKeyId,
  secretAccessKey,
  s3BucketEndpoint,
}: {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  s3BucketEndpoint: boolean;
}): AWS.S3 {
  const s3 = new AWS.S3({
    signatureVersion: "v4",
    endpoint,
    accessKeyId,
    secretAccessKey,
    s3BucketEndpoint,
  });

  return s3;
}

export class S3 {
  private s3: AWS.S3;
  constructor({
    endpoint,
    accessKeyId,
    secretAccessKey,
    s3BucketEndpoint,
  }: {
    endpoint: string;
    accessKeyId: string;
    secretAccessKey: string;
    s3BucketEndpoint: boolean;
  }) {
    this.s3 = getProvider({
      endpoint,
      accessKeyId,
      secretAccessKey,
      s3BucketEndpoint,
    });
  }

  async listObject(bucket: string): Promise<AWS.S3.ListObjectsV2Output> {
    return this.s3.listObjectsV2({ Bucket: bucket }).promise();
  }

  async getObject(
    bucket: string,
    key: string,
  ): Promise<AWS.S3.GetObjectOutput> {
    return this.s3.getObject({ Bucket: bucket, Key: key }).promise();
  }

  async getObjectStream(bucket: string, key: string): Promise<Readable> {
    return this.s3.getObject({ Bucket: bucket, Key: key }).createReadStream();
  }

  async objectExists(bucket: string, key: string): Promise<boolean> {
    try {
      const res = await this.s3
        .headObject({ Bucket: bucket, Key: key })
        .promise();
      return res !== undefined;
    } catch (error) {
      return false;
    }
  }
  async upload(
    bucket: string,
    key: string,
    data: Body,
    expires?: Expires,
  ): Promise<AWS.S3.ManagedUpload.SendData> {
    return this.s3
      .upload({ Bucket: bucket, Key: key, Body: data, Expires: expires })
      .promise();
  }

  async deleteObject(
    bucket: string,
    key: string,
  ): Promise<AWS.S3.DeleteObjectOutput> {
    return this.s3.deleteObject({ Bucket: bucket, Key: key }).promise();
  }
}
