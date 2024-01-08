import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

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

export { registerUser };
