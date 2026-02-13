const express = require("express");
const session = require("express-session");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const recipeRoutes = require("./routes/recipeRoutes");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static("public"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "supersecret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use("/auth", authRoutes);
app.use("/recipes", recipeRoutes);

app.get("/", (req, res) => {
  res.redirect("/recipes");
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});