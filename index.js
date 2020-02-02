require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const memjs = require("memjs");

var mc = memjs.Client.create(process.env.MEMCACHIER_SERVERS, {
  username: process.env.MEMCACHE_USERNAME,
  password: process.env.MEMCACHE_PASSWORD
});

io.on("connection", async function(socket) {
  // console.log("************ socket", socket.request._query);
  console.log(
    `${socket.request._query.type} ${socket.request._query.id} connected to Socket ${socket.id}.`
  );

  if (socket.request._query.type === "Controller") {
    socket.join("controller-room");
  }

  //   console.log("************ socket", typeof socket.request._query.id);
  // On connection save to memcache
  try {
    await mc.set(socket.request._query.id, socket.id, {
      expires: 0
    });
  } catch (err) {
    if (err) console.log("************ set mem err", err);
  }

  // UPDATE PROPERTIES
  socket.on("patch property from control", async (data, cb) => {
    console.log("got the patch", data.id);
    //emit to vehicle
    // get vehicle socket connection with vehicle ID
    try {
      const port = await mc.get(data.id);
      // console.log("************ port1", port.value.toString());

      io.to(port.value.toString()).emit("patch property to vehicle", data);
      // how can i get acknowledgement from this (no callback)
      // this really messed me up
      cb(null, { msg: "delivered" });
    } catch (err) {
      if (err) console.log("************ patch from control err", err);
    }
    // emit update to all controllers
    socket.to("controller-room").emit("pending update from controller", data);
  });

  socket.on("acknowledge update", async data => {
    try {
      // console.log("************ acknowledge to controllers", data);

      socket.to("controller-room").emit("acknowledge update to control", data);
    } catch (err) {
      if (err) console.log("************ acknowledge update err", err);
    }
  });

  // DELETE PROPERTIES
  socket.on("delete property from control", async (data, cb) => {
    console.log("got delete", data.id);
    //emit to vehicle
    // get vehicle socket connection with vehicle ID
    try {
      const port = await mc.get(data.id);
      console.log("************ port3", port.value.toString());

      io.to(port.value.toString()).emit("delete property to vehicle", data);
      // how can i get acknowledgement from this (no callback)
      // this really messed me up
      cb(null, { msg: "delivered" });
    } catch (err) {
      if (err) console.log("************ patch from control err", err);
    }
    // emit update to all controllers
    socket.to("controller-room").emit("pending delete from controller", data);
  });

  socket.on("acknowledge delete", async data => {
    try {
      // console.log("************ acknowledge to controllers", data);

      socket.to("controller-room").emit("acknowledge delete to control", data);
    } catch (err) {
      if (err) console.log("************ acknowledge update err", err);
    }
  });

  // STREAMING
  socket.on("new vehicle data", data => {
    console.log("**********");
    console.log("new stream socket server", data);
    socket.to("controller-room").emit("new stream data from vehicle", data);
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    console.log(`Socket ${socket.id} disconnected.`);
    // on disconnect remove id from mem?
    socket.disconnect(true);
  });
});

http.listen(5000, () => {
  console.log("************ Listening on port: 5000");
});
