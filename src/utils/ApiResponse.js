class ApiResponse {
    constructor(statusCode,data,message="success")
    {
        this.statusCode=statusCode
        this.data=data
        this.message=statusCode
        this.success=statusCode<400
    }
}

export { ApiResponse }