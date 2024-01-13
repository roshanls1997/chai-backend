import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { ignoreFieldsInUser } from "../controllers/user.controller.js";

const authenticateUser = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) throw new ApiError(401, "unauthorized");

    const decodedJwt = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedJwt._id).select(ignoreFieldsInUser);

    if (!user) throw new ApiError(400, "invalid token");

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(500, error?.message || "failed to authenticate user");
  }
});

export { authenticateUser };
