import express from "express";
import http from "http";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import sqlite from "sqlite";
import sqlite3 from "sqlite3";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = await sqlite.open({
    filename: "chat.db",
    driver: sqlite3.Database
});

await db.exec("CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, client_offset TEXT UNIQUE, content TEXT)");


dotenv.config();
const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server);

io.on("connection", async (socket) => {


    socket.on("chat message", async (data) => {
        let result;
        try {
            result = await db.run("INSERT INTO messages (content) VALUES (?)", [data]);
        } catch (error) {
            console.error("Error inserting message:", error);
            return;
        }


        io.emit("chat message",data, result.lastInsertRowid);
    });

    if(!socket.recovered){
        try{
            await db.each("SELECT * FROM messages WHERE id > ?", [socket.auth.server_offset], (err, row) => {
                if(err){
                    console.error("Error retrieving messages:", err);
                    return;
                }
                socket.emit("chat message", row.content, row.id);
            });
        }catch(error){
            console.error("Error retrieving messages:", error);
        }
    }
    



});


// Serve index.html from the root directory (one level up from server folder)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../index.HTML"));
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});