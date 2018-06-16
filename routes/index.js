const routes = require('express').Router();
const { query, check, body, validationResult } = require('express-validator/check');
const Logins = require('../helperFunctions/Logins');
const logins = new Logins();
const checkEmailAndToken = require('../helperFunctions/checkEmailAndToken');
const users = require('../server/models/users').user;
// basic //
const passport = require('../auth/local');
const Mail = require('../helperFunctions/verification/MailSender');
// site //
const { createUser, insertOldEmailObject, verifyUser, addOneToFailedLogins, getOldPasswordObject, insertOldPasswordObject } = require('../server/models/users').user;
const changePassword = require('../server/models/users').changePassword;
const uuid = require('uuid/v1');
const _ = require('lodash');
const userRoutes = require('./userRoutes')


routes.use('/users/', userRoutes);  // all routes in here require authing

routes.get('/', (req, res) => {
  //get menu items from db maybe set this as some middleware
  const menuItems = [ 
    {href:"test me one", name:"item 1"},
    {href:"test me two", name:"item 2"}
  ]
  res.status(200).render('pages/public/index', {contentHomePages: "", menuItems: menuItems, messages: req.flash('info')}); //ejs example
});


routes.get('/about', (req, res) => {
  res.status(200).render('pages/public/about');
  return;
});

routes.get('/test', (req, res) => {
  res.status(200).render('pages/public/navigationpage');
  return;
});
// users //
///////////////   Login    //////////////////

routes.get('/login', (req, res) => {
  if (req.isAuthenticated()){
    res.redirect('./users/dashboard');
    return;
  }
  res.status(200).render('pages/public/login', { messages: req.flash('message')} );
  return;
});


const loginCheck = [
  check('email').isEmail().normalizeEmail(),
];

routes.post('/login', 
  loginCheck, 
  logins.failedLoginsCheck, 
  passport.authenticate('local', 
    { failureRedirect: '/login',
      failureFlash: true 
    }
  ), 
  function (req, res){
    req.session.email = req.body.email;
    res.status(200).redirect("/users/dashboard")
  return;
})


///////////////       Register User      //////////////////

//  This is the page the user has to enter a new password after clicking the activation link from their email

enterPasswordCheck = [
  query('token').exists().isUUID(),
  query('email').exists().isEmail().normalizeEmail()
];

routes.get('/enter-password', enterPasswordCheck, (req, res) => {
  let errors = validationResult(req);
  //console.log('req.query :', req.query);
  //console.log('errors :', errors.array());
  if (!errors.isEmpty()){
    req.flash('info', 'Invalid credentials. Please try again or contact your administrator');
    res.status(200).render('pages/public/enter-password.ejs', {messages : req.flash('info'), user : {activation_token : req.body.activation_token, email : req.body.email}});
    return;
  }
  res.status(200).render('pages/public/enter-password.ejs', {user : {activation_token : req.query.token, email : req.query.email}});
});

postEnterPasswordCheck = [
  body('activation_token').exists().isUUID(),
  body('email').exists().isEmail().normalizeEmail(),
  body("password", "invalid password")
  .isLength({ min: 8 })
  .custom((value,{req, loc, path}) => {
    if (value !== req.body.confirm_password) {
      throw new Error("Passwords don't match");
    } else {
      return value;
    }
  })
];

routes.post('/enter-password', postEnterPasswordCheck, (req, res) => {
  let errors = validationResult(req);
  if (!errors.isEmpty()){
    req.flash('info', 'Invalid credentials. Please try again or contact your administrator');
    res.status(200).render(`pages/public/enter-password.ejs`, {messages : req.flash('info'), user : {activation_token : req.body.token, email : req.body.email}});
    return;
  }
  const user = {
    email : req.body.email,
    activation_token : req.body.activation_token,
    password : req.body.password
  }
  console.log("gets here");
  users.verifyUser(user).then(response => {
    console.log('RESPONSE', response)
    if (!response) {
      req.flash("info", "There was an error creating user. Please try again or contact your administrator");
      res.status(200).render('pages/enter-password.ejs', {messages: req.flash("info"), user : {activation_token : req.query.token, email : req.query.email}});
      return;
    } else {
      req.flash("info", "User created. Please login using your new password");
      req.logOut();
      res.status(200).redirect('/login');
      return;
    }
  }).catch(e =>  res.status(500).send(e.stack))   //handle error here
});

 /////////////////  reset Password //////////////


/// This is the page where a user who has forgotten their password and is not logged in can ask for a reset link.

routes.get('/reset-password-request', (req, res) => {
  // **create a page with two fields to enter email addresses
  // **ensure that emails both match before being able to post
  res.status(200).render('pages/public/reset-password-request', {messages : req.flash('info')});
});  


requestResetPasswordCheck = [
  body('confirm_email').isEmail().trim().normalizeEmail(),
  body("email").isLength({min: 8})
  .isEmail().trim().normalizeEmail()
  .custom((value,{req, loc, path}) => {
    if (value !== req.body.confirm_email) {
      throw new Error("Emails don't match");
    } else {
      return value;
    }
  })
]

routes.post('/reset-password-request', requestResetPasswordCheck, (req, res) => {
  errors = validationResult(req)
  
  if (!errors.isEmpty()) {
    console.log('first req.body :', req.body, errors.array());
    req.flash("info","Invalid email");
    res.status(200).render('pages/public/reset-password-request', {messages : req.flash('info')});
    return;
  }
  const user = {
    forgot_password_token : uuid(),
    email : req.body.email
  }
  console.log('req.body :', req.body);
  insertOldPasswordObject(user)
  .then(data => {
    if (!data) {
      req.flash("info","Further instructions have now been sent to the email address provided");
      res.status(200).render('pages/public/index.ejs', {messages : req.flash('info')});
      return;
    } 
    else {
      let mail = new Mail();
      mail.sendPasswordReset(user);
      req.flash("info","Further instructions have now been sent to your email");
      res.status(200).redirect('/');
      return;
    }
  });
})

/////////   Change password with reset link //////////////////////

checkQueryResetPassword = [
  query('forgot_password_token').isUUID(),
  query('email').isEmail().normalizeEmail()
];



routes.get('/reset-password', checkQueryResetPassword, (req, res) => {
  console.log('req.query :', req.query);
  console.log('req.body',req.body)
  // user = {
  //   forgot_password_token : req.query.forgot_password_token,
  //   email : req.query.email
  // }
  user = {
    forgot_password_token : req.body.forgot_password_token,
    email : req.body.email
  }
  insertOldPasswordObject(user).then(response =>{
    res.status(200).render('pages/public/reset-password', {messages : req.flash('info'), user : user});
  }).catch(e => res.status(500).send(e.stack))
  
});  

resetPasswordCheck = [
  body('email').isLength({min: 8}),
  body('forgot_password_token').isUUID(),
  body("password", "invalid password")
  .isLength({ min: 8 })
  .custom((value,{req, loc, path}) => {
    if (value !== req.body.confirm_password) {
      throw new Error("Passwords don't match");
    } else {
      return value;
    }
  })
]

routes.post('/reset-password', resetPasswordCheck, (req, res) => {
  errors = validationResult(req)
  if (!errors.isEmpty()) {
    console.log('errors :', errors.array());
    req.flash("info","Invalid credentials");
    res.status(200).render('pages/public/reset-password', {messages : req.flash('info'), user : { email : req.body.email, forgot_password_token : req.body.forgot_password_token}});
    return;
  }
  const user = {
    email : req.body.email,
    new_password: req.body.password,
    forgot_password_token : req.body.forgot_password_token
  }
  getOldPasswordObject(user)
  .then(data => {
  //  console.log('data from getoldpasswordobject :', data);
    if (data.time_diff_bool) {
      console.log('expired')
      req.flash('info', 'Link expired');
      res.status(200).redirect('/reset-password-request')
      return;
    }
    changePassword(user)
    .then(() => {
      console.log('UPDATED')
      req.flash('info', 'Your password has been changed. Please login');
        res.status(200).redirect('/login');
        return;
    }).catch(e => res.status(500).send(e.stack) )
  });
})
  
  
 /// Change email ////////////

 verifyEmailCheckQuery = [
   query('old_email').isEmail().normalizeEmail(),
  query('email_change_token').isUUID(),
  query('new_email').isEmail().normalizeEmail()
];

routes.get('/verify-change-email', verifyEmailCheckQuery, (req, res) => { 
  errors = validationResult(req)
  console.log('req.query :', req.query);
  const user = {old_email : req.query.old_email, new_email : req.query.new_email, email_change_token : req.query.email_change_token}
  if (!errors.isEmpty()) {
    req.flash("info","Invalid credentials. Please recheck authorisation link or contact your administrator");
    res.status(200).render('pages/public/verify-change-email', {messages : req.flash('info'), user : user});
    return;
  }
  res.status(200).render('pages/public/verify-change-email.ejs', {messages : req.flash('info'), user : {email_change_token: req.query.email_change_token, old_email: req.query.old_email, new_email : req.query.new_email || "", email_change_token : req.query.email_change_token || ""}});
});
  
verifyEmailCheckBody = [
  body('email_change_token').isUUID(), // hidden
  body('new_email').isEmail().normalizeEmail(),  // hidden
  body('old_email').isEmail().normalizeEmail(),  // hidden
  body('password').isLength({min:8})
];

routes.post('/verify-change-email', verifyEmailCheckBody, (req, res) => {
  errors = validationResult(req)
  console.log('errors.array() :', errors.array());
  if (!errors.isEmpty()) {
    req.flash("info","Invalid email");
    res.status(200).render('pages/public/verify-change-email.ejs', { messages : req.flash('info'), user : { old_email : req.body.old_email, new_email : req.body.new_email, email_change_token : req.body.email_change_token }});
    return;
  } 
  
  user = {
    new_email : req.body.email,
    old_email : req.body.old_email,
    password : req.body.password,
    change_token : req.body.email_change_token
  }
  insertOldEmailObject(user)
  .then(data => {
    if (!data) {
      req.flash("info","Invalid credentials. Please try again.");
      res.status(200).render('pages/public/verify-change_email.ejs', { messages : req.flash('info'), user : { new_email : req.body.new_email, email_change_token : req.body.email_change_token }});
      return;
    }
    logins.sendToOldEmail(user);
    logins.sendEmailChangeConfirmation(user);
    req.logOut();
    req.flash('info', 'Please now login with your new email');
    res.status(200).redirect('./login');
  })
});


// pages // move to pages/content routes

routes.get('/content/manage-page', (req, res) => {
  res.status(200).render('pages/content/create-edit-page');
  return;
});

routes.get('/content/manage-all-pages', (req, res) => { //accessible by authed admin
  res.status(200).render('pages/content/manage-all-pages.ejs');
  return;
});

// unknown //

//// for creating users for test purposes only /// remove on production 

routes.get('/create-user', (req, res) => { //accessible by authed admin
  res.status(200).render('pages/users/create-user.ejs', messages);
});

const createUserCheck = [
  body('email').isEmail().normalizeEmail(),
  body('first_name').trim().isAlphanumeric(),
  body('last_name').trim().isAlphanumeric()
];


routes.post('/create-user', createUserCheck, (req, res) => { //accessible by authed admin
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('ERROR',errors)
    const userTemp = {email : req.body.email || "", firstName : req.body.first_name || "", lastName: req.body.last_name || ""}
    req.flash("info","Invalid user data", process.env.NODE_ENV === 'development' ? errors.array() : ""); //error.array() for development only
    res.status(200).render('pages/users/create-user.ejs', {messages : req.flash('info'), userTemp});
    return;
  }

  const user = {
    email : req.body.email,
    last_failed_login: "",
    first_name : req.body.first_name,
    last_name : req.body.last_name,
    failed_login_attempts : 0,
    activation_token :  uuid()
  };

  createUser(user).then(function(userCreated){ // returns user created true or false
    if (userCreated) {
      let mail = new Mail;
      mail.sendVerificationLink(user);
      req.flash('info', 'user created and email sent');  // email not currently being sent
      res.redirect('/users/admin'); 
      return;
    }
    else {
      console.log("There was a create user error", err)
      req.flash('info', 'There was an error creating this user. Please try again. If you already have please contact support.')
      res.status(200).render('pages/users/create-user.ejs', {messages : req.flash('info'), user});
      return;
    }
  }).catch(function(err){
    const userExistsCode = "23505";
    if (err.code === userExistsCode) {
      req.flash("info", "User already exists");
    }
    else {
      console.log("There was a system error", err)
      req.flash('info', 'There was an system error. Please notify support.')
    }
    res.status(200).render('pages/users/create-user.ejs', {messages : req.flash('info'), user});
  })
  return;
});



routes.all('*', (req, res) => {
  res.status(200).render('pages/public/unknown.ejs', { url: req.url });
  return;
});


module.exports = routes;