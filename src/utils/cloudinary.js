import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});
    
const uploadCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null
        // upload file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{resource_type:"auto"})
        // file has been uploaded successfully
        // console.log("File is uploaded on cloudinary\n url is:",response.url)
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath)    //remove the locally saved temporary file as the upload is failed
        return null
    }
}

const deleteFromCloudinary = async(publicId) => {
    try {
        if (!publicId) return null
        const response = await cloudinary.uploader.destroy(publicId,{resource_type:"image"})
        console.log("File is deleted from cloudinary successfully")
    } catch (error) {
        console.log("file is unable to delete from cloudinary due to error: ",error)
    }
}

export { uploadCloudinary, deleteFromCloudinary }