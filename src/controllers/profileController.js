const prisma = require("../prisma");
const uploadAvatar = require("../middleware/uploadAvatar");

exports.showProfile = async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/auth/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: req.session.userId },
    include: { recipes: { select: { id: true, title: true } } }
  });

  if (!user) return res.redirect("/auth/login");

  const social = user.social ? JSON.parse(user.social) : {};

  res.render("profile", {
    user,
    social,
    isOwner: true, // для отображения кнопки "Редактировать"
    message: req.query.message || null
  });
};

exports.showEditProfile = async (req, res) => {
  if (!req.session.userId) return res.redirect("/auth/login");

  const user = await prisma.user.findUnique({
    where: { id: req.session.userId }
  });

  const social = user.social ? JSON.parse(user.social) : {};

  res.render("editProfile", { user, social });
};

exports.updateProfile = async (req, res) => {
  if (!req.session.userId) return res.redirect("/auth/login");
  

  const { username, instagram, vk } = req.body;
  const updateData = {};

  if (username && username.trim() !== '') {
    updateData.username = username.trim();
  }

    const socialData = {
    instagram: req.body.instagram?.trim() || "",
    vk: req.body.vk?.trim() || "",
    youtube: req.body.youtube?.trim() || "",
    telegram: req.body.telegram?.trim() || ""
    };

    updateData.social = JSON.stringify(socialData);

  // Файл опционален
  if (req.file) {
    updateData.avatar = `/uploads/avatars/${req.file.filename}`;
  }

  try {
    await prisma.user.update({
      where: { id: req.session.userId },
      data: updateData
    });

    res.redirect("/profile?");
  } catch (err) {
    console.error("Ошибка обновления профиля:", err);
    res.render("editProfile", {
      user: { username: req.body.username || '' },
      social: socialData,
      error: err.code === 'P2002' ? "Имя пользователя уже занято" : "Ошибка сохранения"
    });
  }
};