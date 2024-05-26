import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"


const generateAccessAndRefreshToken = async(userId) =>  {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
    
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})

        return { accessToken,refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token")
    }
}

const registerUser = asyncHandler(async(req,res) => {

    // get user details from frontend
    const {fullName,username,email,password}=req.body;
    
    // validation - not empty
    if([fullName,username,email,password].some((field)=>field?.trim==="")){
        throw new ApiError(400,"All fields are required")
    }
    
    // check if user already exists: username, email
    const existedUser = await User.findOne({$or:[{ username },{ email }]})
    if(existedUser){
        throw new ApiError(409,"User with email or username already existed")
    }
    
    // check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0].path;
    // const coverImageLocalPath = req.files?.coverImage[0].path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0)
    {
        coverImageLocalPath = req.files?.coverImage[0].path;
    }

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

const loginUser = asyncHandler(async (req,res) => {

    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie

    const { username,email,password } = req.body
    
    if(!username && !email)
    {
        throw new ApiError(400,"username or email is required")
    }
    const user=await User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"user does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401,"Invalid Password")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)
    
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options={
        httpOnly:true,
        secure:true
    }

    res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user : loggedInUser,accessToken,refreshToken
            },
            "User logged in successfully"
        )
    )
})

const logoutUser = asyncHandler(async (req,res) => {

    User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )

    const options={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged out successfully"))

})

const refreshAccessToken = asyncHandler(async(req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized access")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if(incomingRefreshToken!==user.refreshToken)
        {
            throw new ApiError(401, "Refresh Token is expired")
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        const options = {
            httpOnly:true,
            secure:true
        }
    
        return res
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refressToken:newRefreshToken
                },
                "Access Token Refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
        
    }
})

const changeCurrentPassword = asyncHandler(async(req,res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body

    if(!(newPassword===confirmPassword))
    {
        throw new ApiError(401, "New password does not matched with confirm password")
    }

    const user  = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect)
    {
        throw new ApiError(400, "Invalid password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Password changed successfully"
        )
    )
})

const getCurrentUser = asyncHandler(async(req,res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "User fetched successfully"
    ))
})

const updateAccountDetails = asyncHandler(async(req,res) =>{
    const { fullName,email } = req.body

    if(!fullName || !email)
    {
        throw new ApiError(400, "Full Name and Email is required")
    }

    User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                fullName,
                email
            }
        },
        {
            new:true,
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        user,
        "Account updated successfully"
    ))

})

const updateUserAvatar = asyncHandler(async(req,res) => {
    const avatarLocalPath = req.file?.path
    
    if(!avatarLocalPath)
    {
        throw new ApiError(400, "Avatar file is missing")
    }

     //TODO: delete old image - assignment

    const avatar = await uploadCloudinary(avatarLocalPath)

    if(!avatar.url)
    {
        throw new Error(500, "Error while uploading the avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {
            new:true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar image uploaded successfully" ))

})
const updateUserCoverImage = asyncHandler(async(req,res) => {
    const coverImageLocalPath = req.file?.path
    
    if(!coverImageLocalPath)
    {
        throw new ApiError(400, "Cover Image file is missing")
    }

     //TODO: delete old image - assignment

    const coverImage = await uploadCloudinary(coverImageLocalPath)

    if(!coverImage.url)
    {
        throw new Error(500, "Error while uploading the Cover Image")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {
            new:true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image uploaded successfully" ))

})

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
 }