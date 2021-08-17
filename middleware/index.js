const Professor = require('../models/professor');
const Student = require('../models/student');

let middlewareObj = {}

middlewareObj.isLoggedIn = function(req, res, next){
    if(req.isAuthenticated()){
        return next();
    } else {
        req.flash("error", "You need to be logged in to do that");
        res.redirect('/');
    }
}

middlewareObj.isStudLoggedIn = function(req, res, next){
    console.log(`middleware: ${req.isAuthenticated()}`);
    if(req.isAuthenticated()){
        return next();
    } else {
        req.flash("error", "Login");
        res.redirect('/stud/login');
    }
}

middlewareObj.isProfLoggedIn = function(req, res, next){
    console.log(`middleware: ${req.isAuthenticated()}`);
    if(req.isAuthenticated()){
        return next();
    } else {
        req.flash("error", "Login");
        res.redirect('/prof/login');
    }
}

module.exports = middlewareObj