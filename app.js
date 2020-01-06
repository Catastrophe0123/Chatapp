const app = require("express")();
const http = require("http").Server(app);
const mongoose = require("mongoose");
const io = require("socket.io")(http);
var sentimentAnalysis = require("sentiment-analysis");

const MongoClient = require("mongodb").MongoClient;
const uri =
   "mongodb+srv://newuser:newuser@cluster0-c1dqn.mongodb.net/test?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true });

let allSentiment = 0;

mongoose
   .connect(
      "mongodb+srv://newuser:newuser@cluster0-c1dqn.mongodb.net/test?retryWrites=true&w=majority",
      { dbName: "test" }
   )
   .then(val => console.log("connected to mongo atlas"))
   .catch(err => console.log(err));

const connection = mongoose.connection;
let dbdata = [];
connection.on("error", console.error.bind(console, "connection error:"));
connection.once("open", function() {
   connection.db.collection("employees", function(err, collection) {
      collection.find({}).toArray(function(err, data2) {
         //data from the array
         dbdata = data2.slice();

         console.log("dbdata : ", dbdata);
      });
   });
});

app.get("/", function(req, res) {
   res.sendfile("index.html");
});

users = [];
io.on("connection", function(socket) {
   socket.on("setUsername", function(data) {
      console.log("runnning : ", data);
      let flag = false;
      for (let i = 0; i < dbdata.length; i++) {
         if (dbdata[i].email === data[0] && dbdata[i].password === data[1]) {
            flag = true;
            break;
         }
      }

      //   let flag = false;
      //   for (let i = 0; i < dbdata.length; i++) {
      //      if (dbdata[i].email === data[0] && dbdata[i].password === data[1]) {
      //         flag = true;
      //         break;
      //      }
      //   }
      //verify user here to mongodb
      //   const connection1 = mongoose.connection;
      //   connection1.on("error", console.error.bind(console, "connection error:"));
      //   connection1.once("open", function() {
      //      connection1.db.collection("employees", function(err, collection) {
      //         collection
      //            .findOne({ email: data[0] })
      //            .toArray(function(err, data2) {
      //               //data from the array
      //               console.log("executing");
      //               console.log(data2); // it will print your collection data
      //            });
      //      });
      //   });

      //   if (users.indexOf(data) > -1) {
      //      socket.emit(
      //         "userExists",
      //         data + " username is taken! Try some other username."
      //      );
      if (flag === false || users.indexOf(data[0]) > -1) {
         socket.emit("userExists", "Already logged in or invalid credentials ");
      } else {
         users.push(data[0]);
         socket.emit("userSet", { username: data[0] });
      }
   });

   socket.on("msg", function(data) {
      //Send message to everyone
      io.sockets.emit("newmsg", data);
      allSentiment += sentimentAnalysis(data["message"]);
      console.log(allSentiment);
      console.log(data);
   });

   socket.on("quit", function(user) {
      console.log("i ran now");
      console.log("data : ", user);
      client.connect(err => {
         const collection = client.db("test").collection("employees");
         // perform actions on the collection object
         collection.findOneAndUpdate(
            { email: user.user },
            { $set: { sentiment: allSentiment.toString() } },
            function(err, result) {
               if (err) {
                  console.log("i ran");
                  console.log(err);
               } else {
                  console.log("updated");
               }
            }
         );
         client.close();
      });
      io.close();
   });
});

http.listen(3000, function() {
   console.log("listening on localhost:3000");
});
