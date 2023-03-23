import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import routerUsers from "./routes/users.js";
import routerProduct from "./routes/product.js";

const app = express();
app.use(cors());

//подключаем базу данных MongoDb
import mongoose from "mongoose";
mongoose.connect(
  process.env.DB_URL,
  {
      //these are options to ensure that the connection is done properly
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
  }
)
.then(() => 
{
   console.log("Successfully connected to MongoDB!")        
})
.catch((error) => 
{
  console.log("Unable to connect to MongoDB!");
  console.error(error);
})   

//вводим преобразователь выходных данных в json-формат
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

//включаем маршрутизаторы запросов
app.use('/api/users', routerUsers);
app.use('/api/product', routerProduct);

//use this to show the image you have in node js server to client (react js)
//https://stackoverflow.com/questions/48914987/send-image-path-from-node-js-express-server-to-react-client
app.use('/uploads', express.static('uploads'));

// Serve static assets if in production
if (process.env.NODE_ENV === "production") {

  // Set static folder
  app.use(express.static("client/build"));

  // index.html for all page routes
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
  });
}

//запускаем сервер
const port = process.env.PORT || 3001

app.listen(port, () => {
  console.log(`Server Running at ${port}`)
});