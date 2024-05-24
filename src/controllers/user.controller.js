import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js"
const registerUser = asyncHandler(async(req,res)=>{
    
    
    
    // return res


    // get user details from frontend
    const {fullName,username,email,password}=req.body;
    
    // validation - not empty
    if([fullName,username,email,password].some((field)=>field?.trim==="")){
        throw new ApiError(400,"All fields are required")
    }
    
    // check if user already exists: username, email
    const existedUser=User.findOne({$or:[{ username },{ email }]})
    if(existedUser){
        throw new ApiError(409,"User with email or username already existed")
    }
    
    // check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0].path;
    const coverImageLocalPath = req.files?.coverImage[0].path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required");
    }

    // upload them to cloudinary, avatar
    const avatar = await uploadCloudinary(avatarLocalPath)
    const coverImage = await uploadCloudinary(coverImageLocalPath)
    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }

    // create user object - create entry in db
    const user=await User.create({
        password,
        fullName,
        email,
        username : username.toLowerCase(),
        coverImage : coverImage?.url || "",
        avatar : avatar.url
    })
    
    // check for user creation and remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(" -password -refreshToken ")

    //return res
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

export { registerUser }