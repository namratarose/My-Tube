// require('dotenv').config({path:'./env'})
import connectDB from "./db/index.js";
import dotenv from "dotenv";
import { app } from "./app.js";

dotenv.config({
    path:'./.env'
})

connectDB()
.then(()=>{
    app.on("error",(error)=>{
        console.log("ERRR:",error)
        throw error
    })
    
    const port=process.env.PORT || 8000
    app.listen(port,()=>{
        console.log(`Server is listening at port:${port}`)
    })
})
.catch((err)=>{
    console.log("MongoDb connection is failed",err)
})









/*
(async()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error",(error)=>{
            console.log("ERRR:",error)
            throw error
        })

        app.listen(process.env.PORT,()=>{
            console.log(`App is listening on port:,${process.env.PORT}`)
        })
    } catch (error) {
        console.error("ERRR",error);
        throw error
    }
})()
*/