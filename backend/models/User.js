const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'please provide a name'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'please provide an email'],
            unique: true,
            lowercase: true,
            trim: true,
            match:[/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
        },
        password: {
            type: String,
            required: [true, 'Please provide a password'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false,
        },
        height: {
            type: Number, // Measured in centimeters
            default: null,
        },
        weight: {
            type: Number, // Measured in kilograms
            default: null,
        },
        age: {
            type: Number,
            default: null,
        },
        fitnessGoals: {
            type: String,
            enum: ['weight_loss', 'muscle_gain', 'maintenance', 'endurance'],
            default: 'beginner',
        },
        workoutExperience: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced'],
            default: 'beginner',
        },
        workoutMode: {
            type: String,
            enum: ['home', 'gym'],
            default: 'gym',
        },

        dietaryPreference: {
            type: String,
            enum: ['vegetarian', 'non-vegetarian', 'vegan', 'eggetarian'],
            default: "vegetarian",
        },
        dailyBudget: {
            type: Number,
            default: 200,
        },
        targetCalories: {
            type: Number,
            default: 2000,
        },
        targetProtein: {
            type: Number,
            default: 120,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('User', userSchema );