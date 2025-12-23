const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const dotenv = require('dotenv');
dotenv.config();

const seedRootAdmin = async () => {
  try {
    await mongoose.connect("mongodb+srv://devops:7EDeJe98eYPeI2Qu@cluster0.c9gv856.mongodb.net/jurisLPO?retryWrites=true&w=majority&appName=Cluster0");

    const rootExists = await Admin.findOne({ role: 'root' });
    if (rootExists) {
      console.log('Root admin already exists.');
      process.exit();
    }

    await Admin.create({
      fullName: 'System Root',
      email: 'root@legalapp.com',
      password: 'AdminPassword123!', // Change this immediately after login
      role: 'root'
    });

    console.log('Root Admin created successfully!');
    process.exit();
  } catch (error) {
    console.error('Error seeding root:', error);
    process.exit(1);
  }
};

seedRootAdmin();