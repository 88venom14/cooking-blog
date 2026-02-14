const router = require("express").Router();
const recipeController = require("../controllers/recipeController");
const prisma = require("../prisma");
const auth = require("../middleware/authMiddleware");
const uploadRecipeImage = require("../middleware/uploadRecipeImage");

router.get("/", async (req, res) => {  // ← добавь async
  let user = null;
  if (req.session.userId) {
    user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: { id: true, username: true, avatar: true }
    });
  }

  recipeController.getAll(req, res, "all", {  // ← передаём доп. параметры
    isAuthenticated: !!req.session.userId,
    user
  });
});

router.get("/create", auth, recipeController.showCreate);
router.post("/create",
  auth,
  uploadRecipeImage.single("image"),
  recipeController.create
);

router.get("/popular", async (req, res) => {
  const { difficulty, category, sort } = req.query;

  let where = {};

  if (difficulty) {
    where.difficulty = difficulty;
  }

  if (category) {
    where.categoryId = parseInt(category);
  }

  const recipes = await prisma.recipe.findMany({
    where,
    include: {
      author: true,
      category: true,
      _count: { select: { reactions: true } }
    },
    orderBy: {
      reactions: { _count: "desc" }
    }
  });

  const categories = await prisma.category.findMany();

  let user = null;
  if (req.session.userId) {
    user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: { id: true, username: true, avatar: true }
    });
  }

  res.render("recipes", {
    recipes,
    categories,
    pageTitle: "Популярные рецепты",
    currentPage: "popular",
    currentSort: sort || "date",
    currentDifficulty: difficulty || "",
    currentCategory: category || "",
    isAuthenticated: !!req.session.userId,
    basePath: "/recipes/popular",
    user
  });
});


// За месяц
router.get("/month", async (req, res) => {
  const { difficulty, category, sort } = req.query;

  const firstDay = new Date();
  firstDay.setDate(1);
  firstDay.setHours(0,0,0,0);

  let where = {
    createdAt: { gte: firstDay }
  };

  if (difficulty) {
    where.difficulty = difficulty;
  }

  if (category) {
    where.categoryId = parseInt(category);
  }

  const recipes = await prisma.recipe.findMany({
    where,
    include: {
      author: true,
      category: true,
      _count: { select: { reactions: true } }
    },
    orderBy: {
      reactions: { _count: "desc" }
    }
  });

  const categories = await prisma.category.findMany();

  let user = null;
  if (req.session.userId) {
    user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: { id: true, username: true, avatar: true }
    });
  }

  res.render("recipes", {
    recipes,
    categories,
    pageTitle: "Рецепты за месяц",
    currentPage: "month",
    currentSort: sort || "date",
    currentDifficulty: difficulty || "",
    currentCategory: category || "",
    isAuthenticated: !!req.session.userId,
    basePath: "/recipes/month",
    user
  });
});


// По сложности
router.get("/difficulty/:level", async (req, res) => {
  const level = req.params.level;

  const levelNames = {
    easy: "🕊️ Лёгкие рецепты",
    medium: "🕯️ Средняя сложность",
    hard: "⚗️ Сложные рецепты"
  };

  const recipes = await prisma.recipe.findMany({
    where: { difficulty: level },
    include: { author: true, category: true }
  });

  res.render("recipes", {
    recipes,
    pageTitle: levelNames[level] || "Рецепты",
    currentPage: "difficulty",
    currentSort: req.query.sort || "date",
    basePath: `/recipes/difficulty/${level}`,
    isAuthenticated: !!req.session.userId
  });
});

// Детальная страница рецепта
router.get("/:id", async (req, res) => {
  const recipe = await prisma.recipe.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      author: true,
      category: true,
      comments: { include: { author: true } },
      reactions: { select: { type: true, userId: true } }
    }
  });

  if (!recipe) return res.redirect("/recipes");

  const reactionCounts = { like: 0, heart: 0, fire: 0, dislike: 0, poop: 0 };
  recipe.reactions.forEach(r => {
    if (reactionCounts[r.type] !== undefined) reactionCounts[r.type]++;
  });

  let userReactionType = null;
  if (req.session.userId) {
    const myReaction = recipe.reactions.find(r => r.userId === req.session.userId);
    userReactionType = myReaction ? myReaction.type : null;
  }

  res.render("recipeDetails", {
    recipe,
    isAuthenticated: !!req.session.userId,
    userReactionType,
    reactionCounts
  });
});

module.exports = router;