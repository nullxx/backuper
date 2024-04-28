import { Router, Request, Response, NextFunction } from 'express';
import { Bucket } from '../../schemas/bucket.schema';
import Logger from '../../lib/logger';
import { APIError } from '../error/APIError';

const router = Router();

const logger = Logger();

router.get("/new-bucket", (_req: Request, res: Response) => {
    res.render("bucket", { layout: "index" });
});

router.get(
    "/bucket/:id",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;

            const bucket = await Bucket.findByPk(id);
            if (!bucket) throw new APIError("Bucket not found", true);
            res.render("bucket", { layout: "index", bucket: bucket.formatV1() });
        } catch (error) {
            next(error);
        }
    },
);

router.post(
    "/bucket/:id",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const bucket = await Bucket.findByPk(id);
            if (!bucket) throw new APIError("Bucket not found", true);

            const {
                name,
                bucketName,
                endpoint,
                accessKey,
                secretKey,
                s3Endpoint = "false",
                publicBaseUrl
            } = req.body;
            logger.info("Bucket updated", {
                name,
                bucketName,
                endpoint,
                accessKey,
                secretKey,
                s3Endpoint,
            });

            bucket.name = name;
            bucket.bucketName = bucketName;
            bucket.endpoint = endpoint;
            bucket.accessKeyId = accessKey;
            bucket.secretAccessKey = secretKey;
            bucket.s3BucketEndpoint = s3Endpoint === "true";
            bucket.publicBaseUrl = publicBaseUrl;

            await bucket.save();
            res.redirect("/bucket/" + bucket.id);
        } catch (error) {
            next(error);
        }
    },
);

router.delete(
    "/bucket/:id",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const bucket = await Bucket.findByPk(req.params.id);
            if (!bucket) throw new APIError("Bucket not found", true);

            await bucket.destroy();

            res.redirect("/");
        } catch (error) {
            next(error);
        }
    },
);


router.post("/new-bucket", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            name,
            bucketName,
            endpoint,
            accessKey,
            secretKey,
            s3Endpoint = "false",
            publicBaseUrl
        } = req.body;
        logger.info("New bucket created", {
            name,
            endpoint,
            accessKey,
            secretKey,
            s3Endpoint,
        });
    
        const bucket = Bucket.build({
            name,
            bucketName,
            accessKeyId: accessKey,
            s3BucketEndpoint: s3Endpoint === "true",
            secretAccessKey: secretKey,
            endpoint,
            publicBaseUrl
        });
    
        await bucket.save();
    
        res.redirect("/bucket/" + bucket.id);
    } catch (error) {
        next(error);
    }
});

export default router;