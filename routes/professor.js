const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const flash = require('express-flash');
const passport = require('passport');
const mongoose = require('mongoose');
const methodOverride = require("method-override");

const Professor = require('../models/professor');

const middleware = require('../middleware/index');

// For gfs
const mongoUri = process.env.MONGO_URI;
const conn = mongoose.createConnection(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
});
// Initialize gfs
let gfs;
conn.once('open', () => {
    // Initialize stream
    gfs = new mongoose.mongo.GridFSBucket(conn.db, {
      bucketName: process.env.BUCKET_NAME
    })
});


// Method Override
router.use(methodOverride("_method"));

// ROUTES
// Register as professor
router.get('/prof/register', function(req, res){
    res.render('prof_register');
});

// Post info of Professor
router.post('/prof/register', async (req, res) => {
    let {password, name, email, phone, subjects, faculty, university, degrees} = req.body;

    const hash = bcrypt.hashSync(password, 10);

    let newProf = new Professor({
        name: name,
        password: hash,
        email: email,
        phone: phone,
        subjects: subjects,
        faculty: faculty,
        university: university,
        degrees: degrees
    });

    newProf.save((err, savedProf) => {
        if(!err && savedProf){
            req.flash("success", "Registered! Please login to continue");
            res.redirect('/prof/login');
        } else {
            console.error("Error saving Professor");
            console.error(err);
            // res.render("register.ejs");
            res.send("error saving professor");
        }
    })    
})

// Login as a Professor
router.get('/prof/login', function(req, res){
    res.render("prof_login");
});

// Login POST route
router.post('/prof/login', passport.authenticate('professor-local', {
    failureRedirect: '/prof/login',
    failureFlash: 'Invalid Username or Password',
    failureMessage: 'Invalid'
}), function(req, res){
    res.redirect('/prof/' + req.user._id);
});

// Logout route
router.get('/logout', (req, res) => {
    req.logout();
    // console.log("logged out")
    req.flash("success", "Logged you out");
    res.redirect('/');
});

// Get professor profile
router.get('/prof/:id', middleware.isProfLoggedIn, function(req, res){
    console.log(`authenticated: ${req.isAuthenticated()}`);
    // console.log(req.user);
    Professor.findById(req.params.id).exec(async function(err, professor){
        if(err){
            req.flash("error", "An error occurred!");
            res.redirect('back');
        } else {
            let allFiles = [];
            let data = await professor.notes.forEach(async (note) => {
                await gfs.find({filename: note}).toArray((err, files) => {
                    if(!files || files.length === 0){
                        console.log('no file found');
                        return false
                    } else {
                        allFiles.push(files[0]);
                        return allFiles
                    }
                }) 
            })
            setTimeout(function(){
                res.render('prof_profile', {professor: professor, files:allFiles, reqUser: req.user});
            }, 1500);
        }
    })
});

router.delete('/prof/:prof_id/notes/:id', (req, res) => {
    gfs.delete(new mongoose.Types.ObjectId(req.params.id), (err, data) => {
        if(err){
            console.log(err);
            res.send("Error deleting file");
        } else {
            Professor.updateOne({_id: req.params.prof_id}, {$pull: {notes: req.body.filename}}, function(error, sucess){
                if(error){
                    console.log(error);
                    res.send("Error updaing the document");
                } else {
                    console.log('success');
                    req.flash("success", "File deleted successfully");
                    res.redirect('/prof/' + req.params.prof_id);
                }
            });
            
        }
    })
})

module.exports = router;