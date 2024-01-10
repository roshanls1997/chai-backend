import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

const generateTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.save({ validateBeforeSave: false });

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

  console.log(req.files);
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
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "failed to register user");
  }
  const apiResponse = new ApiResponse(
    201,
    createdUser,
    "user registered successfully"
  );
  console.log(apiResponse, "apiresponse");
  //   console.log(userResponse, "userresponse");
  return res.status(201).json(apiResponse);
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;
  //   check if email or username present
  if (!email || !username)
    throw new ApiError(400, "email or username required!");

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(404, "User not found!!");
  }

  //   validate password
  const isPasswordSame = user.checkIfSamePassword(password);
  if (isPasswordSame) {
    throw new ApiError(400, "invalid creds");
  }

  const { accessToken, refreshToken } = await generateTokens(user._id);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const cookieOptions = {
    httpOnly: true,
    secure: true,
  };

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
      $set: {
        refreshToken: undefined,
      },
    },
    { new: true }
  );

  const cookieOptions = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("refreshToken", cookieOptions)
    .clearCookie("accessToken", cookieOptions)
    .json(new ApiResponse(200, {}, "user logged out"));
});

export { registerUser, loginUser, logoutUser };
