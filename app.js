const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const flash = require('express-flash');
const bcrypt = require('bcrypt');
const passport = require('passport');
const localStrategy = require('passport-local').Strategy;
const session = require('express-session');
const grid = require('gridfs-stream');

const upload = require('./gridfs/index');

const Professor = require('./models/professor');
const Student = require('./models/student');

const middleware = require('./middleware/index');
// ROUTES IMPORT
const professorRoutes = require('./routes/professor');
const studentRoutes = require('./routes/student');

// DATABASE CONNECTION
const mongoUri = process.env.MONGO_URI;
const conn = mongoose.createConnection(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true
});

mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
})
    .then(() => console.log("Connected to fileShare DB"))
    .catch(error => console.error(error));

// INITIALIZE GFS
let gfs;
conn.once('open', () => {
    // Initialize stream
    gfs = new mongoose.mongo.GridFSBucket(conn.db, {
      bucketName: process.env.BUCKET_NAME
    })
});

app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(flash());
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true
}));
app.use(function(req, res, next){
  res.locals.currentUser = req.user;
  // res.locals.error = req.flash("error");
  // res.locals.success = req.flash("success");
  next();
})

// PASSPORT CONFIG
//-------------------------------------------------------------------
app.use(passport.initialize());
app.use(passport.session());

// PROFESSOR STRATEGY
passport.use('professor-local', new localStrategy({
  usernameField: 'email',
  passwordField: 'password'
},
  function(email, password, done){
      // console.log(email);
      Professor.findOne({email: email}, function(err, prof){
          // console.log(`email: ${email}`);
          if(err){
              console.log(err);
              return done(err);
          }
          else if(!prof){
              console.log(email);
              return done(null, false, { message: "Incorrect email" })
          }
          else{
              // console.log(`prof.password: ${prof.password}`);
              // console.log(`got pass: ${password}`);
              bcrypt.compare(password, prof.password)
                  .then(function(result){
                      if(result){
                          // console.log(result);
                          return done(null, prof);
                      } else {
                          // console.log(result);
                          return done(null, false, { message: "Incorrect Password" })
                      }
                  })
                  .catch(function(error){
                      console.log(error);
                      return done(null, false, { message: error })
                  })
          }
      })
  }
));

// STUDENT STRATEGY
passport.use('student-local', new localStrategy({
  usernameField: 'email',
  passwordField: 'password'
},
  function(email, password, done){
      Student.findOne({email: email}, function(err, stud){
          // console.log('student authentication');
          // console.log(email);
          if(err){
              console.log(err);
              return done(err);
          }
          else if(!stud){
              // console.log(email);
              return done(null, false, { message: "Incorrect email" })
          }
          else{
              // console.log(`stud.password: ${stud.password}`);
              // console.log(`got pass: ${password}`);
              bcrypt.compare(password, stud.password)
                  .then(function(result){
                      if(result){
                          console.log(`success ${result}`);
                          // console.log(Object.getPrototypeOf(stud));
                          return done(null, stud);
                      } else {
                          console.log(`failure ${result}`);
                          return done(null, false, { message: "Incorrect Password" })
                      }
                  })
                  .catch(function(error){
                      console.log(error);
                      return done(null, false, { message: error })
                  })
          }
      })
  }
));

passport.serializeUser(function(user, done){
  done(null, user.email);
});
passport.deserializeUser(function(email, done){
  Professor.findOne({email: email}, function(err, prof){
    if(err){
      return done(err);
    } else if(prof){
      return done(null, prof);
    } else {
      Student.findOne({email: email}, function(error, stud){
        done(error, stud);
      })
    }
  })
});
//-------------------------------------------------------------------


app.get('/', function(req, res){
    res.render('home');
});

app.post('/notes', upload.single('file'),function(req, res){
    if(req.file === undefined){
        req.flash("error", "Please select a file");
        res.redirect('/prof/' + req.body.prof_id);
    } else {
        // res.json({file: req.file});
        // console.log(req.body.prof_id);
        Professor.findByIdAndUpdate(req.body.prof_id, {$push: {notes: req.file.filename}}, function(err, success){
          if(err){
            console.log(err);
            res.redirect('/prof' + req.body.prof_id);
          } else {
            req.flash("success", "Upload successful!");
            res.redirect('/prof/' + req.body.prof_id);
          }
        }); 
    }
});


app.get('/notes/:filename', (req, res) => {
  gfs.find({filename: req.params.filename}).toArray((err, files) => {
    if(!files[0] || files.length === 0){
      res.send("No file found");
    }
    else if(files[0].contentType === 'image/jpeg'
            || files[0].contentType === 'image/png'
            || files[0].contentType === 'image/svg+xml'
            || files[0].contentType === 'application/pdf'){
              gfs.openDownloadStreamByName(req.params.filename).pipe(res);
    } else {
      res.send("Invalid Filetype");
    }
  })
});


app.use('/', professorRoutes);
app.use('/', studentRoutes);


//tell express to listen for requests
let port = process.env.PORT || 3000;
app.listen(port, function () {
    console.log("FileShare server has started!");
});