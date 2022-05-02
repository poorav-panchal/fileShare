const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const flash = require('express-flash');
const passport = require('passport');
const mongoose = require('mongoose');
const Grid = require('gridfs-stream');

const Student = require('../models/student');
const Professor = require('../models/professor');
const Chat = require('../models/chat');

const Middleware = require('../middleware/index');

// For gfs
const mongoUri = process.env.ATLAS_URI;
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

    // Check if a Professor exists with the same email
    Professor.find({email:email}, function(e, found){
        if(e){
            console.log(e);
            res.redirect('/stud/register');
        } else if(found.length > 0){
            req.flash("error", "User with this email already exists!!!");
            console.log(found);
            res.redirect('/stud/register');
        } else {
            newStudent.save((err, savedStudent) => {
                if(!err && savedStudent){
                    req.flash("success", "Registered! Please login to continue");
                    res.redirect('/stud/login');
                } else {
                    req.flash("error", "Error registering your account");
                    res.redirect('/stud/register');
                }
            });
        }
    })
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
    //Get information of all Professors this Student has subscribed to
    let prof = [];

    // console.log(`currentUser: ${currentUser}`);
    // console.log(req.user);

    //Check if the Student has searched for a professor
    if(req.query.search){
        Student.findById(req.user._id).exec(function(err, student){
            console.log(`student: ${student}`);
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
                        res.render('stud_home', {student: student, files: files, professors: allProfessors, prof: prof});
                    }
                })
            }
        })
        
    } else {
        // Render the Student homepage
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
                                        // console.log(`typeof: ${Object.getOwnPropertyNames(files[0].uploadDate)}`)
                                        // console.log(`in gfs fn: ${JSON.stringify(allFiles)}`);
                                        return allFiles;
                                    }
                                })
                            })
                        }
                    })
                })

                
                // This array contains all the professors the student already has a chatroom with
                // let roomExists = [];
                student.subscribedTo.map(function(x){
                    Professor.findById(x, function(e, found){
                        if(e){
                            console.log(e);
                            res.redirect(back);
                        } else {
                            prof.push(found);
                            console.log('found');
                            console.log(prof);
                            // Chat.find({studId: student._id, profId: x._id}, function(error, room){
                            //     if(error){
                            //         console.log(error);
                            //         res.redirect('back');
                            //     } else {
                            //         console.log('in Chat.find');
                            //         roomExists.push(found);
                            //     }
                            // })
                        }
                    })
                })

                console.log(prof);

                // This array contains all the professors the student does not have a chatroom with
                
                // let noRoom = prof.filter( function( el ) {
                //     return !roomExists.includes( el );
                // } );
                
                setTimeout(function(){
                    res.render('stud_home', {student: student, files: allFiles, professors: allProfessors, prof: prof});
                }, 1500);
            }
        })
    }
});

// Student profile page
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

// Subscribe to a professor
router.post('/stud/:stud_id/subscribe/:prof_id', function(req, res){
    Student.updateOne({_id: req.params.stud_id}, {$addToSet: {subscribedTo: req.params.prof_id}}, function(err, success){
        if(err){
            console.log(err);
            res.send('Error updating');
        } else {
            Professor.updateOne({_id: req.params.prof_id}, {$inc: {studentsNumber: 1}, $addToSet: {studentsId: req.params.stud_id}}, function(e, s){
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