/**
 * Created by beebe on 4/18/2017.
 */
const express = require(`express`);
const app = module.exports = express();
const axios = require(`axios`);
const session = require(`express-session`);
const bodyParser = require(`body-parser`);
const cors = require(`cors`);
const massive = require(`massive`);
const passport = require('passport');
const Auth0Strategy = require('passport-auth0');
const corsOptions = {origin: 'http://localhost:3001'};
const config = require(`./.config.js`);
const stripe = require(`stripe`)(config.stripe);
const http = require('http').Server(app);
const io = require('socket.io')(http);
const massiveInstance = massive.connectSync({connectionString: config.connectionString});


app.set("db", massiveInstance);
const db = app.get(`db`);
app.use(bodyParser.json());
app.use(cors(corsOptions));
app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: config.secret
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(`public`));


passport.use(new Auth0Strategy({
        domain: config.auth0.domain,
        clientID: config.auth0.clientID,
        clientSecret: config.auth0.clientSecret,
        callbackURL: '/auth/callback'
    },
    function (accessToken, refreshToken, extraParams, profile, done) {
        db.getUserByAuthId([profile.id], function (err, user) {
            user = user[0];
            if (!user) { //if there isn't one, we'll create one!
                db.createUserByAuth([profile.displayName, profile.id], function (err, user) {
                    return done(err, user[0]); // GOES TO SERIALIZE USER
                })
            } else { //when we find the user, return it
                console.log('FOUND USER');
                return done(err, user);
            }
        })
    }
));

//THIS IS INVOKED ONE TIME TO SET THINGS UP
passport.serializeUser(function (userA, done) {
    console.log('serializing');
    let userB = userA;
    //Things you might d here :
    //Serialize just the id, get other information to a+dd to session,
    done(null, userB); //PUTS 'USER' ON THE SESSION
});

//USER COMES FROM SESSION - THIS IS INVOKED FOR EVERY ENDPOINT
passport.deserializeUser(function (userB, done) {
    let userC = userB;
    //Things you might do here :
    // Query the database with the user id, get other information to put on req.user
    done(null, userC); //PUTS 'USER' ON REQ.USER
});


app.get('/auth', passport.authenticate('auth0'));


app.get('/auth/callback',
    passport.authenticate('auth0', {successRedirect: '/#!/loginView'}), function (req, res) {
        res.status(200).send(req.user);
    });

app.get('/auth/me', function (req, res) {
    if (!req.user) return res.sendStatus(404);
    //THIS IS WHATEVER VALUE WE GOT FROM userC variable above.
    res.status(200).send(req.user);
});

app.get('/auth/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

http.listen(3001, () => {
    console.log('Wow Listning on 3001!')
});

