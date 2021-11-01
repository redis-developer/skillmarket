import { User } from "./model";
import userController from './userController';
import { createUserIndex } from './redisearchClient';
import express = require("express");

const port = 8080; // default port to listen

const app = express();
app.use(express.json());

app.post('/users', async (req, res) => {
    const user: User = req.body;

    if (!user || !user.name || !user.expertises || !user.interests || user.location.latitude === undefined || user.location.longitude === undefined) {
        res.status(400).send('Missing required fields');
    } else {
        const userId = await userController.createUser(user);
        res.status(200).send(userId);
    }
});

app.get("/users/:userId", async (req, res) => {
    try {
        const user: User = await userController.findUserById(req.params.userId);
        res.status(200).send(user);
    } catch (e) {
        res.status(404).send();
    }
});

app.get("/users/:userId/matches", async (req, res) => {
    try {
        const radiusKm: number = Number(req.query.radiusKm) || 500;
        const user: User = await userController.findUserById(req.params.userId);
        const matches: User[] = await userController.findMatchesForUser(user, radiusKm);
        res.status(200).send(matches);
    } catch (e) {
        console.log(e)
        res.status(404).send();
    }
});

createUserIndex().then(() => {
    console.log('User index created');
});

// start the Express server
app.listen(port, () => {
    console.log(`server started at http://localhost:${port}`);
});

