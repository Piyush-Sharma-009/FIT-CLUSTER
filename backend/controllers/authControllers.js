const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


    // helper func to generate a signed jwt    
const generateToken = (userId) => {
    return jwt.sign({id: userId}, process.env.JWT_SECRET,   {
        expiresIn: '30d',       
    });
};

    // register a new user 
    // route -> POST /api/auth/register

exports.register = async (req, res) => {
    try{
        const {
        name, 
        email,
        password,
        age, 
        height,
        weight,
        fitnessGoals,
        workoutExperience,
        workoutMode,
        dietaryPreference,
        dailyBudget,
        targetCalories,
        targetProtein,
    } = req.body;

        // check for account exits

    const existingUser = await User.findOne({ email });
    if(existingUser) {
        return res.status(400).json({
            message: 'User already exists with this email address' });
        }

        //pass hashing with 10-round salt
        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(password, salt);


        // record persisting into mongodb

        const user = await User.create({
            name,
            email,
            password: hashedPass,
            age,
            height,
            weight,
            fitnessGoals,
            workoutExperience,
            workoutMode,
            dietaryPreference,
            dailyBudget,
            targetCalories,
            targetProtein,
        }
        );

        // generating signed auth. token

        const token = generateToken(user._id);

        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                fitnessGoals: user.fitnessGoals,
                dailyBudget: user.dailyBudget,
                dietaryPreference: user.dietaryPreference,
            },
        });
    } catch (err) {
        console.error("registration Error:", err );
        res.status(500).json({
            success: false,
            message: "server error during registration",
            err: err.message
        });
    }   
};

    // authenticate user & return JWT
    // route-> POST /api/auth/login

exports.login = async (req, res) => {
    try{
        const { email, password } = req.body;

            //validating payload 
        if(!email || !password) {
            return res.status(400).json({ message: 'please provide both email and password' });
        }

        //locate user and explicitly select password hash

        const user = await User.findOne({ email }).select('+password');
        if(!user){
            return res.status(401).json({ message: 'Invalid email or password' });
        }

                // verifying pass by using jwt.compare{puts out the algo version and salt from the hash and then hashing the user putted password and then compare both} 
        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid password or email"
            });
        }


        // generating the signed token
        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                fitnessGoals: user.fitnessGoals,
                dailyBudget: user.dailyBudget,
                dietaryPreference: user.dietaryPreference,
            },
        });
    } catch (err) {
        console.error('Login Error', err);
        res.status(500).json({
            success: false,
            message: "Server error during login",
            err: err.message
        });
    }
};