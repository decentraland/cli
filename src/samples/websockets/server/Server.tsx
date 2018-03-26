import { static as serveStatic } from "express";
import { createServer } from "http";
import { Server as WebSocketServer } from "ws";
import { RemoteScene } from "./RemoteScene";
import { connectedClients } from "./ConnectedClients";
import { WebSocketTransport } from "dcl-sdk";

const app = require("express")();

app.use(require("cors")());
app.use(serveStatic("client"));

const server = createServer(app);

const wss = new WebSocketServer({ server });

wss.on("connection", function connection(ws, req) {
  const client = new RemoteScene(WebSocketTransport(ws));
  connectedClients.add(client);
  ws.on("close", () => connectedClients.delete(client));
  console.log("Client connected", client);
});

server.listen(6060, function listening() {
  console.log(`Listening on`, server.address());
});
