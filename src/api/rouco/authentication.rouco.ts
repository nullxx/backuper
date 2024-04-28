import { Router, Request, Response, NextFunction } from 'express';
import { User } from '../../schemas';
import { hashPassword } from '../../lib/crypto';
import { requireAuth } from '../middlewares/auth';
import { APIError } from '../error/APIError';

const router = Router();

router.get(
    "/register",
    async (_req: Request, res: Response, next: NextFunction) => {
        try {
            // only allow registration for 1st user
            const usersCount = await User.count();

            if (usersCount > 0) {
                return res.redirect("/login");
            }

            res.render("register", { layout: "empty" });
        } catch (error) {
            next(error);
        }
    },
);

router.post(
    "/register",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (await User.count() > 0) throw new APIError("Registration is disabled", true);

            const { username, password } = req.body;
            if (!username || !password) throw new APIError("username and password are required", true);

            const user = await User.build({
                username,
                passwordHash: hashPassword(password),
            }).save();

            req.session.user = user;
            res.redirect("/");
        } catch (error) {
            next(error);
        }
    }
);

router.get(
    "/login",
    async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const usersCount = await User.count();
            res.render("login", { layout: "empty", userExist: usersCount > 0 });
        } catch (error) {
            next(error);
        }
    },
);

router.post(
    "/login",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { username, password } = req.body;
            if (!username || !password) throw new APIError("username and password are required", true);

            const user = await User.findOne({
                where: {
                    username,
                    passwordHash: hashPassword(password),
                },
            });

            if (!user) throw new APIError("Invalid username or password", true);

            req.session.user = user;
            res.redirect("/");
        } catch (error) {
            next(error);
        }
    }
);

router.get(
    "/modify-user",
    requireAuth,
    async (req: Request, res: Response, _next: NextFunction) => {
        res.render("modify-user", { layout: "index", user: req.session.user});
    },
);

router.post(
    "/modify-user",
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { username, password } = req.body;
            if (!username || !password) throw new APIError("username and password are required", true);

            const user = await User.findOne({
                where: {
                    username,
                },
            });

            if (!user) throw new APIError("Invalid username", true);

            user.passwordHash = hashPassword(password);
            await user.save();

            // expire session
            req.session.destroy(() => {
                res.redirect("/login");
            });
        } catch (error) {
            next(error);
        }
    }
);

router.get(
    "/logout",
    requireAuth,
    async (req: Request, res: Response, _next: NextFunction) => {
        req.session.destroy(() => {
            res.redirect("/login");
        });
    },
);

export default router;