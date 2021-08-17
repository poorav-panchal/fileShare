const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const flash = require('express-flash');
const passport = require('passport');
const mongoose = require('mongoose');

const Student = require('../models/student');
const Professor = require('../models/professor');

const Middleware = require('../middleware/index');

// For gfs
const mongoUri = 'mongodb://localhost/fileShare';
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



// ROUTES
// Register as Student
router.get('/stud/register', function(req, res){
    res.render('stud_register');
});

// Post info of Student
router.post('/stud/register', async (req, res) => {
    let {name, email, password, course, faculty, university, collegeStart, collegeEnd} = req.body;

    const hash = bcrypt.hashSync(password, 10);

    let newStudent = new Student({
        name: name,
        email: email,
        password: hash,
        course: course,
        faculty: faculty,
        university: university,
        collegeStart: collegeStart,
        collegeEnd: collegeEnd
    });

    newStudent.save((err, savedStudent) => {
        if(!err && savedStudent){
            req.flash("success", "Registered! Please login to continue");
            res.redirect('/stud/login');
        } else {
            req.flash("error", "Error registering your account");
            res.redirect('/stud/register');
        }
    });
})

// Login as a Student
router.get('/stud/login', function(req, res){
    res.render('stud_login');
});

router.post('/stud/login', passport.authenticate('student-local', {
    successRedirect: '/allnotes',
    failureRedirect: '/stud/login',
    failureFlash: 'Invalid email or password',
    failureMessage: 'Invalid'
}));


function escapeRegex(text){
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"); 
 };

router.get('/allnotes', function(req, res){
    console.log(`authenticated: ${req.isAuthenticated()}`);
    // console.log(`currentUser: ${currentUser}`);
    // console.log(req.user);
    if(req.query.search){
        Student.findById(req.user._id).exec(function(err, student){
            let files = false;
            if(err){
                console.log(err);
            } else {
                const regex = new RegExp(escapeRegex(req.query.search), 'gi');
                Professor.find({name: regex}, function(err, allProfessors){
                    if(err){
                        res.send(err);
                    } else {
                        if(allProfessors.length === 0){
                            req.flash("error", "No match found");
                            console.log("No file found");
                            return res.redirect('/allnotes');
                        }
                        res.render('stud_home', {student: student, files: files, professors: allProfessors});
                    }
                })
            }
        })
        
    } else {
        Student.findById(req.user._id).exec(function(err, student){
            if(err){
                res.send("No user found");
            } else {
                let allFiles = [];
                let allProfessors = false;
                student.subscribedTo.forEach(async (profId) => {
                    await Professor.find({_id: profId}, function(e, professor){
                        if(e){
                            res.send(e)
                        } else{                            
                            // console.log(`professor[0].notes: ${professor[0].notes}`);
                            professor[0].notes.forEach(async (note) => {
                                // console.log(`note: ${note}`);
                                await gfs.find({filename: note}).toArray((err, files) => {
                                    if(!files || files.length == 0){
                                        console.log(`No file found | err: ${err}`);
                                        return false
                                    } else {
                                        // console.log(`files[0]: ${JSON.stringify(files[0])}`);
                                        allFiles.push(files[0]);
                                        // console.log(`in gfs fn: ${JSON.stringify(allFiles)}`);
                                        return allFiles;
                                    }
                                })
                            })
                        }
                    })
                })
                console.log(`allFiles: ${allFiles}`);
                setTimeout(function(){
                    res.render('stud_home', {student: student, files: allFiles, professors: allProfessors});
                }, 1500);
                // res.render('stud_home', {student: student});
            }
        })
    }
});

router.get('/stud/:id', Middleware.isLoggedIn, function(req, res){
    console.log(`authenticated: ${req.isAuthenticated()}`);
    Student.findById(req.params.id).exec(function(err, student){
        if(err){
            req.flash("error", "An error occurred");
            res.redirect('back');
        } else {
            let allProfessors = [];
            student.subscribedTo.forEach((profId) => {
                // console.log(`profName: ${profName}`);
                Professor.find({_id: profId}, function(err, professor){
                    if(err){
                        console.log(err);
                    }
                    // console.log(professor);
                    allProfessors.push(professor[0]);
                })
            })
            // console.log(allProfessors);
            setTimeout(function(){
                res.render('stud_profile', {student: student, professors: allProfessors});
            }, 1500);
        }
    })
})


router.post('/stud/:stud_id/subscribe/:prof_id', function(req, res){
    Student.updateOne({_id: req.params.stud_id}, {$addToSet: {subscribedTo: req.params.prof_id}}, function(err, success){
        if(err){
            console.log(err);
            res.send('Error updating');
        } else {
            Professor.updateOne({_id: req.params.prof_id}, {$inc: {studentsNumber: 1}}, function(e, s){
                if(e){
                    console.log(e);
                    res.send('Error updating');
                } else {
                    res.redirect('back');
                }
            })
        }
    })
})

module.exports = router;