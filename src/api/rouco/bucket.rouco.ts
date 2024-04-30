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
                disableHostPrefix = "false",
                forcePathStyle = "false",
            } = req.body;

            bucket.name = name;
            bucket.bucketName = bucketName;
            bucket.endpoint = endpoint;
            bucket.accessKeyId = accessKey;
            bucket.secretAccessKey = secretKey;
            bucket.disableHostPrefix = disableHostPrefix === "true";
            bucket.forcePathStyle = forcePathStyle === "true";

            await bucket.save();
            
            res.render("bucket", { layout: "index", bucket: bucket.formatV1() });
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

            res.send();
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
            disableHostPrefix = "false",
            forcePathStyle = "false",
        } = req.body;
    
        const bucket = Bucket.build({
            name,
            bucketName,
            accessKeyId: accessKey,
            disableHostPrefix: disableHostPrefix === "true",
            forcePathStyle: forcePathStyle === "true",
            secretAccessKey: secretKey,
            endpoint,
        });
    
        await bucket.save();
    
        res.render("bucket", { layout: "index", bucket: bucket.formatV1() });
    } catch (error) {
        next(error);
    }
});

export default router;