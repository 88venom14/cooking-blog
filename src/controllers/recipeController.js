const prisma = require("../utils/prisma");

exports.getAll = async (req, res) => {
  const recipes = await prisma.recipe.findMany({
    include: { author: true, category: true } // добавляем категорию для отображения
  });
  res.render("recipes", { recipes });
};

// ✅ Передаём категории
exports.showCreate = async (req, res) => {
  const categories = await prisma.category.findMany();
  res.render("createRecipe", { categories });
};

// ✅ Создание рецепта с существующей категорией
exports.create = async (req, res) => {
  const { title, content, difficulty, categoryId } = req.body;

  // 🔒 Обязательные поля
  if (!title || !content || !difficulty) {
    return res.status(400).send("Заполните все обязательные поля");
  }

  // 🔒 Проверка категории
  const catId = parseInt(categoryId);
  if (!catId || catId <= 0 || isNaN(catId)) {
    return res.status(400).send("Пожалуйста, выберите категорию");
  }

  try {
    await prisma.recipe.create({
      data: {
        title,
        content,
        difficulty,
        // подключаем существующую категорию
        category: { connect: { id: catId } },
        // подключаем автора через id из сессии
        author: { connect: { id: req.session.userId } }
      }
    });
    res.redirect("/recipes");
  } catch (error) {
    console.error("Ошибка создания рецепта:", error);
    res.status(500).send("Не удалось создать рецепт");
  }
};
