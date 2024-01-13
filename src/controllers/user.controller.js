import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { cookieOptions } from "../constants.js";
import mongoose from "mongoose";

export const ignoreFieldsInUser = "-password -refreshToken";

const generateTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "failed to generate tokens");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullname, password } = req.body;
  //   fields not empty validation
  if (
    [username, email, fullname, password].some(
      (field) => field?.trim() === "" || field?.trim() == null
    )
  ) {
    throw new ApiError(422, "All fields are required!!");
  }
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  //   TODO: check console
  //   console.log(user);
  if (user) {
    throw new ApiError(409, "User already exists with email or username");
  }

  //   console.log(req.files);
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(422, "Avatar is required");
  }
  //   upload files to cloudinary
  const uploadAvatarResponse = await uploadToCloudinary(avatarLocalPath);
  const uploadCoverImageResponse =
    await uploadToCloudinary(coverImageLocalPath);

  if (!uploadAvatarResponse) {
    throw new ApiError(422, "Avatar is required");
  }

  //   create user
  const userResponse = await User.create({
    email,
    username: username.toLowerCase(),
    password,
    fullname,
    avatar: uploadAvatarResponse.url,
    coverImage: uploadCoverImageResponse?.url || "",
  });

  //   get the created user
  const createdUser = await User.findById(userResponse._id).select(
    ignoreFieldsInUser
  );
  if (!createdUser) {
    throw new ApiError(500, "failed to register user");
  }
  const apiResponse = new ApiResponse(
    201,
    createdUser,
    "user registered successfully"
  );
  return res.status(201).json(apiResponse);
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;
  //   check if email or username present
  if (!(email || username))
    throw new ApiError(400, "email or username required!");

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(404, "User not found!!");
  }

  //   validate password
  const isPasswordSame = await user.checkIfSamePassword(password);
  if (!isPasswordSame) {
    throw new ApiError(400, "invalid creds");
  }

  const { accessToken, refreshToken } = await generateTokens(user._id);

  const loggedInUser = await User.findById(user._id).select(ignoreFieldsInUser);

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(200, {
        user: loggedInUser,
        accessToken,
        refreshToken,
      })
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      // TODO: check why unset is used instead of setting null or undefined
      $unset: {
        refreshToken: 1,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .clearCookie("refreshToken", cookieOptions)
    .clearCookie("accessToken", cookieOptions)
    .json(new ApiResponse(200, {}, "user logged out"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, req.user, "user details"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  // NOTE: if you hit it through postman res.cookie will always be set
  // hence moved to order of taking token from request
  const token = req.body.refreshToken || req.cookies?.refreshToken;

  if (!token) {
    throw new ApiError(401, "unauthenticated");
  }

  try {
    const decodedToken = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "invalid refresh token");
    }

    if (user.refreshToken !== token) {
      throw new ApiError(401, "refresh token already used");
    }

    const { accessToken, refreshToken } = await generateTokens(user._id);

    res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, cookieOptions)
      .json(
        new ApiResponse(200, { accessToken, refreshToken }, "tokens refreshed")
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "invalid token");
  }
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!(currentPassword && newPassword)) {
    throw new ApiError(400, "passwords are required");
  }

  const user = await User.findById(req.user?._id);
  const isCurrentPasswordSame = await user.checkIfSamePassword(currentPassword);

  if (!isCurrentPasswordSame) {
    throw new ApiError(400, "current password is incorrect");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res.status(200).json(new ApiResponse(200, {}, "password changed"));
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;
  if (!(fullname && email)) {
    throw new ApiError(400, "fields are required");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email,
      },
    },
    { new: true }
  ).select(ignoreFieldsInUser);

  res.status(200).json(new ApiResponse(200, user, "user details updated"));
});

const updateUserFile = asyncHandler(async (req, res) => {
  const { type } = req.query;
  if (!type) {
    throw new ApiError(400, "file type is required");
  }

  const fileLocalPath = req.file?.path;

  if (!fileLocalPath) {
    throw new ApiError(400, "file is required");
  }

  const uploadedFile = await uploadToCloudinary(fileLocalPath);
  // TODO: delete old file once new file is uploaded

  if (!uploadedFile.url) {
    throw new ApiError(500, "failed to save " + type + " file");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        [type]: uploadedFile.url,
      },
    },
    { new: true }
  ).select(ignoreFieldsInUser);
  res.status(200).json(new ApiResponse(200, user, type + " uploaded"));
});

const getUserChannelDetails = asyncHandler(async (req, res) => {
  let { username } = req.params;
  username = username?.trim();
  if (!username) {
    throw new ApiError(400, "username required");
  }
  username = username.toLowerCase();
  const channelDetails = await User.aggregate([
    {
      $match: { username },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedChannel",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        subscribedChannelCount: {
          $size: "$subscribedChannel",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        email: 1,
        username: 1,
        avatar: 1,
        coverImage: 1,
        subscribedChannelCount: 1,
        subscribersCount: 1,
        isSubscribed: 1,
      },
    },
  ]);
  // TODO: is there any way to get 0th index after project

  if (!channelDetails?.length) {
    throw new ApiError(400, "channel does not exists");
  }

  res
    .status(200)
    .json(new ApiResponse(200, channelDetails[0], "channel details"));
});

const getUserWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(req.user?._id) },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "videosHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "videoOwner",
              // TODO: try to use this as a new pipeline instead of nested pipeline
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$videoOwner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].videosHistory,
        "watch history fetched succesfully"
      )
    );
});

// TODO: can be moved to subscriber modules
const subscribeToChannel = asyncHandler(async (req, res) => {
  let { channel } = req.body;
  channel = channel?.trim();
  if (!channel) {
    throw new ApiError(400, "channel not found");
  }

  const user = await User.findOne({ username: channel.toLowerCase() });
  if (!user) {
    throw new ApiError(400, "channel not found");
  }

  const subscription = await Subscription.create({
    subscriber: req.user?._id,
    channel: user._id,
  });

  res
    .status(201)
    .json(new ApiResponse(200, subscription, "subscribed successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  refreshAccessToken,
  changePassword,
  updateUserDetails,
  updateUserFile,
  getUserChannelDetails,
  subscribeToChannel,
  getUserWatchHistory,
};
