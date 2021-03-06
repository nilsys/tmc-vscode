import { Response, Router } from "express";

import db from "../db";

interface Token {
    access_token: string;
    token_type: "bearer";
    scope: "public";
    created_at: number;
}

const oauthRouter = Router();

oauthRouter.post("/token", (req, res: Response<Token>) => {
    const { username, password } = req.body;
    console.log("Username:" + username, "Password:", password);
    const user = db.users.find((u) => u.username === username && u.password === password);
    return user
        ? res.json({
              access_token: "1234",
              token_type: "bearer",
              scope: "public",
              created_at: 1234567890,
          })
        : res.status(401).end();
});

export default oauthRouter;
