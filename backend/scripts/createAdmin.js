
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const readline = require("readline");

const connectDB = require("../config/db");
const User = require("../models/User");

dotenv.config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const ask = (question) => {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
};

const createAdmin = async () => {
    try {
        await connectDB();

        console.log("\n===== ADMIN ACCOUNT SETUP =====\n");

        const name = (await ask("Enter admin name: ")).trim();
        const email = (await ask("Enter admin email: "))
            .trim()
            .toLowerCase();

        if (!name || !email || !email.includes("@")) {
            throw new Error("Please enter a valid name and email.");
        }

        let user = await User.findOne({ email });

        if (user) {
            user.role = "admin";
            await user.save();

            console.log("\nExisting account promoted to ADMIN!");
        } else {
            const password = await ask(
                "Create admin password (minimum 8 characters): "
            );

            if (password.length < 8) {
                throw new Error(
                    "Password must contain at least 8 characters."
                );
            }

            const hashedPassword = await bcrypt.hash(password, 12);

            user = await User.create({
                name,
                email,
                password: hashedPassword,
                role: "admin"
            });

            console.log("\nNew ADMIN account created successfully!");
        }

        console.log("Admin email:", user.email);
        console.log("Admin role:", user.role);

    } catch (error) {
        console.error("\nAdmin setup failed:", error.message);
    } finally {
        rl.close();
        process.exit();
    }
};

createAdmin();
