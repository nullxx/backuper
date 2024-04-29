// import type { Body, Expires } from "@aws-sdk/clients/s3";
import { S3Client, ListObjectsV2Command, ListObjectsV2CommandOutput, GetObjectCommand, GetObjectCommandOutput, HeadObjectCommand, PutObjectCommand, PutObjectCommandInput, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { Readable } from "stream";

export function getProvider({
  endpoint,
  accessKeyId,
  secretAccessKey,
  disableHostPrefix,
  forcePathStyle,
}: {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  disableHostPrefix: boolean;
  forcePathStyle: boolean;
}): S3Client {
  const s3 = new S3Client({
    endpoint,
    disableHostPrefix,
    forcePathStyle,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    region: 'us-east-1'
  });

  return s3;
}

export class S3 {
  private s3: S3Client;
  constructor({
    endpoint,
    accessKeyId,
    secretAccessKey,
    disableHostPrefix,
    forcePathStyle,
  }: {
    endpoint: string;
    accessKeyId: string;
    secretAccessKey: string;
    disableHostPrefix: boolean;
    forcePathStyle: boolean;
  }) {
    this.s3 = getProvider({
      endpoint,
      accessKeyId,
      secretAccessKey,
      disableHostPrefix,
      forcePathStyle,
    });
  }

  async listObject(bucket: string) {
    const cmd = new ListObjectsV2Command({ Bucket: bucket });
    return this.s3.send(cmd);
  }

  async getObject(
    bucket: string,
    key: string,
  ) {
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
    return this.s3.send(cmd);
  }

  async getObjectStream(bucket: string, key: string) {
    // return this.s3.getObject({ Bucket: bucket, Key: key }).createReadStream();
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await this.s3.send(cmd);
    if (!response.Body || !(response.Body instanceof Readable)) {
      throw new Error(`Invalid response body: ${response.Body}`);
    }

    return Readable.from(response.Body);
  }

  async objectExists(bucket: string, key: string): Promise<boolean> {
    try {
      // const res = await this.s3
      //   .headObject({ Bucket: bucket, Key: key })
      //   .promise();
      // return res !== undefined;

      const cmd = new HeadObjectCommand({ Bucket: bucket, Key: key });
      const response = await this.s3.send(cmd);
      return response.$metadata.httpStatusCode === 200;

    } catch (error) {
      return false;
    }
  }
  async upload(
    bucket: string,
    key: string,
    data: PutObjectCommandInput['Body'],
  ) {
    // return this.s3
    //   .upload({ Bucket: bucket, Key: key, Body: data, Expires: expires })
    //   .promise();

    const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, Body: data });
    return this.s3.send(cmd);
  }

  async getPublicUrl(bucket: string, key: string, expireInS: number) {
    const signedUrl = await getSignedUrl(this.s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: expireInS });
    return signedUrl;
  }

  async deleteObject(
    bucket: string,
    key: string,
  ) {
    // return this.s3.deleteObject({ Bucket: bucket, Key: key }).promise();

    const cmd = new DeleteObjectCommand({ Bucket: bucket, Key: key });
    return this.s3.send(cmd);
  }
}
