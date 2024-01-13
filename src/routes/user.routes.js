import { Router } from "express";
import {
  changePassword,
  getCurrentUser,
  getUserChannelDetails,
  getUserWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  subscribeToChannel,
  updateUserDetails,
  updateUserFile,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);
router.route("/login").post(loginUser);
router.route("/logout").post(authenticateUser, logoutUser);
router.route("/token").post(refreshAccessToken);
router.route("/get-current-user").get(authenticateUser, getCurrentUser);
router.route("/change-password").patch(authenticateUser, changePassword);
router.route("/update-user-details").patch(authenticateUser, updateUserDetails);
router
  .route("/update-user-files")
  .patch(upload.single("file"), authenticateUser, updateUserFile);

router
  .route("/get-user-channel-details/:username")
  .get(authenticateUser, getUserChannelDetails);

router.route("/subscribe").post(authenticateUser, subscribeToChannel);
router.route("/watch-history").get(authenticateUser, getUserWatchHistory);

export default router;
