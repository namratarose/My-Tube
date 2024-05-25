import { ApiError } from "../utils/ApiError"
import { asyncHandler } from "../utils/asyncHandler"
import jwt from "jsonwebtoken"
import { User } from "../models/user.model"

export const verifyJWT = asyncHandler((req,_,next)=>{ //Since res is not used here so we use dash ( _ ) in place of res

    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
        
        // console.log(token)
        
        if(!token)
        {
            throw new ApiError(401,"Unauthorized access");
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = User.findById(decodedToken._id).select (" -password -refreshToken")
    
        if(!user){
            throw new ApiError(401,"Invalid Access Token")
        }
    
        req.user=user;
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }

})