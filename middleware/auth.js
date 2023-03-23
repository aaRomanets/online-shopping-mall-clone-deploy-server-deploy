import jwt from "jsonwebtoken";

const auth = async (request, response, next) => {
    try
    {
        //get the token from authorization header
        const token = await (request.headers.authorization || '').replace(/Bearer\s?/,'');
    
        //check if the token matches the supposed origin
        const decodedToken = await jwt.verify(token , "RANDOM-TOKEN");

        //retrive the user details of the logged in user
        const user = await decodedToken;

        //pass the user down to the endpoints here
        request.user = user;

        //pass down functionality to te endpoint
        next();
    }
    catch (error)
    {
        response.status(401).json({
            error: new Error("Invalid request!")
        })
    }
}

export default auth;