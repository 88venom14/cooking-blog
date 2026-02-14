const express = require("express");
const session = require("express-session");
const path = require("path");

const prisma = require("./prisma");

const authRoutes = require("./routes/authRoutes");
const recipeRoutes = require("./routes/recipeRoutes");

const app = express();
const auth = require("./middleware/authMiddleware");
const uploadAvatar = require("./middleware/uploadAvatar");
const profileController = require("./controllers/profileController");
//const upload = require('multer')();



app.use(session({
  secret: 'supersecret',           // поменяй на свой длинный секрет
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 1000 * 60 * 60 * 24,   // 1 день
    httpOnly: true,
    secure: false,                 // ← важно: false для localhost (http)
    sameSite: 'lax'
  }
}));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/auth", authRoutes);
app.use("/recipes", recipeRoutes)

app.get("/profile", profileController.showProfile);
app.get("/profile/edit", auth, profileController.showEditProfile);
app.post("/profile/edit", auth, uploadAvatar.single("avatar"), profileController.updateProfile);

app.get("/", (req, res) => {
  res.redirect("/recipes");
});

app.get('/profile', async (req, res) => {
  if (!req.session.userId) return res.redirect('/auth/login');

  const user = await prisma.user.findUnique({
    where: { id: req.session.userId },
    include: { recipes: true }
  });

  if (!user) return res.redirect('/auth/login');

  const social = user.social ? JSON.parse(user.social) : {};

  res.render('profile', {
    user,
    social,
    isOwner: true
  });
});

// Чужой профиль (с id)
app.get('/profile/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).send('Неверный ID');

  const user = await prisma.user.findUnique({
    where: { id },
    include: { recipes: true }
  });

  if (!user) return res.status(404).send('Пользователь не найден');

  const social = user.social ? JSON.parse(user.social) : {};

  const isOwner = req.session.userId === id;

  res.render('profile', {
    user,
    social,
    isOwner
  });
});



app.post('/profile/social', async (req, res) => {
  const { instagram, vk } = req.body

  const socialData = {
    instagram,
    vk
  }

  await prisma.user.update({
    where: { id: req.session.user.id },
    data: {
      social: JSON.stringify(socialData)
    }
  })

  res.redirect('/profile/' + req.session.user.id)
})

app.post('/recipes/:id/comment', async (req, res) => {
  const { text, anonymous } = req.body;
  const recipeId = Number(req.params.id);

  if (anonymous !== 'on' && !req.session.userId) {
    return res.redirect('/auth/login');
  }

  await prisma.comment.create({
    data: {
      text,
      recipeId,
      isAnonymous: anonymous === 'on',
      authorId: anonymous === 'on' ? null : req.session.userId
    }
  });

  res.redirect('/recipes/' + recipeId);
});

app.post('/recipes/:id/react', async (req, res) => {
  if (!req.session.userId) return res.redirect('/auth/login');

  const recipeId = Number(req.params.id);
  const userId = req.session.userId;
  const { type } = req.body;                     // like / heart / fire

  // Ищем, есть ли уже такая реакция
  const existing = await prisma.reaction.findUnique({
    where: { userId_recipeId: { userId, recipeId } }
  });

  if (existing && existing.type === type) {
    // Клик по той же кнопке → убираем реакцию
    await prisma.reaction.delete({
      where: { userId_recipeId: { userId, recipeId } }
    });
  } else {
    // Меняем или ставим новую
    await prisma.reaction.upsert({
      where: { userId_recipeId: { userId, recipeId } },
      update: { type },
      create: { userId, recipeId, type }
    });
  }

  res.redirect('/recipes/' + recipeId);
});


app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
