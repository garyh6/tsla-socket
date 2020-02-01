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

// mc.set("foo", "bar");
// mc.get("foo", function(err, value, key) {
//   console.log("************ err", err);
//   if (value != null) {
//     console.log(value.toString());
//   }
// });

io.on("connection", async function(socket) {
  console.log(
    `Vehicle ${socket.request._query.id} connected to Socket ${socket.id}.`
  );
  //   console.log("************ socket", socket.request._query.id);
  //   console.log("************ socket", typeof socket.request._query.id);
  // On connection save to memcache
  // First argument must be a string
  try {
    await mc.set(socket.request._query.id, socket.id, {
      expires: 0
    });
  } catch (err) {
    if (err) console.log("************ set mem err", err);
  }

  // Emits from controller
  socket.on("patch property from control", async (data, cb) => {
    console.log("got the patch", data.id);
    //save to memcache
    //emit to vehicle
    // get vehicle socket connection with vehicle ID
    try {
      const port = await mc.get(data.id);
      console.log("************ port1", port.value.toString());

      io.to(port.value.toString()).emit("patch property to vehicle", data);
      // how can i get acknowledgement from this (no callback)
      // this really messed me up
      cb(null, { msg: "delivered" });
    } catch (err) {
      if (err) console.log("************ patch from control err", err);
    }
  });

  socket.on("acknowledge update", async data => {
    try {
      //id needs to be passed from controller (all controllers need to be in same room) and broadcast to all
      const port = await mc.get("MAINCONTROLLEREREREERR");
      console.log("************ data.id", data.id);
      console.log("************ port2", port.value.toString());

      io.to(port.value.toString()).emit("acknowledge update to control", data);
    } catch (err) {
      if (err) console.log("************ acknowledge update err", err);
    }
  });

  // TEMPERATURE
  socket.on("temperature", res => {
    console.log("**********");
    console.log("temp", res);
  });

  socket.emit("add prop", { name: "speed", value: 100 }, ({ err, res }) => {
    console.log("************ err", err);
    if (err) return console.log(err);
    console.log("************ ressss", res);
  });
  socket.on("disconnect", () => {
    console.log(`Socket ${socket.id} disconnected.`);
    // on disconnect remove id
  });
});

http.listen(5000, () => {
  console.log("************ Listening on port: 5000");
});
