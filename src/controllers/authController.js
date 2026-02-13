const prisma = require("../utils/prisma");
const bcrypt = require("bcrypt");

exports.showRegister = (req, res) => {
    res.render("register");
};

exports.register = async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);

  try {
    await prisma.user.create({
      data: { username, password: hash }
    });
    res.redirect("/auth/login");
  } catch (error) {
    if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
      return res.render("register", {
        error: "Пользователь с таким именем уже существует."
      });
    }
    console.error(error);
    res.status(500).send("Ошибка регистрации");
  }
};

exports.showLogin = (req, res) => {
  res.render("login");
};

exports.login = async (req, res) => {
  const { username, password } = req.body;

  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) {
    return res.render("login", {
      error: "Пользователь с таким именем не найдён. Проверьте имя или зарегистрируйтесь."
    });
  }

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    return res.render("login", {
      error: "Неверный пароль. Попробуйте ещё раз.",
      username: username // чтобы имя осталось в поле
    });
  }

  req.session.userId = user.id;
  res.redirect("/recipes");
};

exports.logout = (req, res) => {
    req.session.destroy();
    res.redirect("/");
};
