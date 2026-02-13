const router = require("express").Router();
const recipeController = require("../controllers/recipeController");
const auth = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

router.get("/", recipeController.getAll);

router.get("/create", auth, recipeController.showCreate);

router.post("/create", auth, upload.single("image"), recipeController.create);

module.exports = router;