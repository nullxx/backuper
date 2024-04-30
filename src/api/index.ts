import '../helpers/handlebars/helpers';

import session from "express-session";
import lusca from 'lusca';
import express, { NextFunction, Request, Response } from "express";
import * as Handlebars from "express-handlebars";
import path from "path";

import Logger from "../lib/logger";
import rouco from "./rouco/index";
import { APIError } from './error/APIError';
import { rateLimitMiddleware } from './middlewares/rate-limit';

const logger = Logger();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(function (req, res, next) {
  res.locals.path = req.path.slice(1);

  // prevent caching when navigating back
  res.setHeader('Cache-Control', 'no-cache, max-age=0, must-revalidate, no-store');
  next();
});

app.set("view engine", ".hbs");
app.set("views", path.join(__dirname, "views"));

app.engine(
  "hbs",
  Handlebars.engine({
    layoutsDir: path.join(app.get("views"), "layouts"),
    partialsDir: path.join(app.get("views"), "partials"),
    extname: ".hbs",
  }),
);

app.use(express.static(path.join(__dirname, "public")));

app.use(rateLimitMiddleware);

if (!process.env.API_SESSION_SECRET) throw new Error("API_SESSION_SECRET is required");
app.use(session({
  secret: process.env.API_SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === "production" }
}));

app.use(lusca.csrf());
app.use(lusca.xssProtection(true));
app.use(lusca.nosniff());
app.use(lusca.referrerPolicy("same-origin"));

app.use(rouco);

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(error);

  let newError = new Error("An error ocurred. Please check the logs");
  if (error instanceof APIError && (error as APIError).isExposable()) { // to prevent leaking sensitive information. APIError are manually thrown wihout internal information
    newError = error;
  } else {
    newError.stack = '';
  }

  res.status(500).render("error", { layout: "empty", error: newError });
});

export function startServer() {
  return new Promise<number>((resolve) => app.listen(PORT, () => resolve(PORT)));
}
