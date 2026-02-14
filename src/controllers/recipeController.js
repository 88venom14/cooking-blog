const prisma = require("../prisma");

exports.getAll = async (req, res, currentPage = "all", extra = {}) => {
  const { sort, difficulty, category } = req.query;

  // СОРТИРОВКА
  let order = {};
  if (sort === "likes") {
    order = { reactions: { _count: "desc" } };
  } else {
    order = { createdAt: "desc" };
  }

  // ФИЛЬТРЫ
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
    orderBy: order
  });

  const categories = await prisma.category.findMany();

  res.render("recipes", {
    recipes,
    categories,
    pageTitle: "Все рецепты",
    currentPage,
    currentSort: sort || "date",
    currentDifficulty: difficulty || "",
    currentCategory: category || "",
    basePath: "/recipes",
    ...extra
  });
};


// ✅ Передаём категории
exports.showCreate = async (req, res) => {
  const categories = await prisma.category.findMany();
  res.render("createRecipe", { categories });
};

// ✅ Создание рецепта с существующей категорией
exports.create = async (req, res) => {
  const { title, content, difficulty, categoryId } = req.body;

  if (!title || !content || !difficulty || !categoryId) {
    return res.status(400).send("Заполните все обязательные поля");
  }

  const catId = parseInt(categoryId);
  if (isNaN(catId)) {
    return res.status(400).send("Неверная категория");
  }

  const data = {
    title,
    content,
    difficulty,
    category: { connect: { id: catId } },
    author: { connect: { id: req.session.userId } }
  };

  if (req.file) {
    data.imageUrl = `/uploads/recipes/${req.file.filename}`;
  }

  try {
    await prisma.recipe.create({ data });
    res.redirect("/recipes");
  } catch (error) {
    console.error(error);
    res.status(500).send("Не удалось создать рецепт");
  }
};


