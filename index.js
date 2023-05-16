// improt from packages

const express = require('express'); 
const mongoose = require('mongoose');

// import from other files
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const productRouter = require('./routes/product');
const userRouter = require('./routes/user');
const path = require('path')

//init
const port = 3000;
const databaseName = "EMNA"; // L'@ du serveur
const app = express();


app.use(express.urlencoded({extended: true, limit: '50mb'}));
app.use("/img",express.static("public"));

//middleware
app.use(express.json());
app.use(authRouter);
app.use(adminRouter);
app.use(productRouter);
app.use(userRouter);


const server = require("http").Server(app);
const { v4: uuidv4 } = require("uuid");
app.set("view engine", "ejs");
const io = require("socket.io")(server, {
  cors: {
    origin: '*'
  }
});
const { ExpressPeerServer } = require("peer");
const opinions = {
  debug: true,
}

app.use("/peerjs", ExpressPeerServer(server, opinions));
app.use(express.static("public"));

app.get("/joinLive", (req, res) => {
  res.redirect(`/${uuidv4()}`);
});

app.get("/:room", (req, res) => {
  
  var name = req.query.name
  console.log(name)
  if(name==''){
    var succes=false;
  }else{
    succes=true
  }
  res.render("room", { roomId: req.params.room , user:name , succes:succes});
});
const connectedUsers = {};
io.on("connection", (socket) => {
  let room;
  let idUser;
  socket.on("join-room", (roomId, userId, userName) => {
    if (usernameAlreadyExists(userName)) {
      console.log('exist')
      // User is already connected, prevent them from joining again
      socket.emit("user-not-allowed");
      return;
    }
    connectedUsers[userId] = userName;
    console.log(connectedUsers);
    room=roomId;
    idUser=userId;
    socket.join(roomId);
    setTimeout(()=>{
      socket.to(roomId).broadcast.emit("user-connected", userId);
    }, 1000)
    socket.on("message", (message) => {
      io.to(roomId).emit("createMessage", message, userName);
    });
  });

  socket.on("disconnect", () => {
    // Remove the user from the list of connected users when they disconnect
    for (const userId in connectedUsers) {
      if (connectedUsers.hasOwnProperty(userId) && userId === socket.id) {
        delete connectedUsers[userId];
        console.log(connectedUsers)
        break;
      }
    }
    // Notify other clients that the user has disconnected
    socket.to(room).broadcast.emit("user-disconnected", idUser);
    
    // Rest of the code to handle the video call
  });
});
function usernameAlreadyExists(username) {
  return Object.values(connectedUsers).includes(username);
}





mongoose.set("debug", true);
mongoose.Promise = global.Promise;

  mongoose
    .connect(`mongodb://127.0.0.1:27017/${databaseName}`)
    .then(() => {
      console.log(`connected to ${databaseName}`);
    })
    .catch((err) => {
      console.log(err);
    });


    /* Demarrer le serveur a l'ecoute des connexions */
    server.listen(port)
    /*
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});*/