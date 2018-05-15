<<<<<<< HEAD
const request = require('supertest');
const app = require('../server');
const {pool} = require('../server/db/database');



beforeEach((done) =>{
     pool.connect()
     .then(client => {
     return  client.query(`DELETE FROM users`)
                   .then(() => {
                    client.release();
                    done();
                   })              
     }).catch(e => done(e))
 })
 



describe('test all /users POST request' , ()=>{
  
    it('should create a new user and return single row', (done) => {
          const entry = {
              email: 'me@me1.com',
              password: 'pass',
              first_Name : 'first',
              last_Name : 'last'
          }

          request(app)
             .post('/users')
             .send(entry)
             .expect(200)
             .expect(res => {
                 console.log(res.body)
                 expect(res.body.message).toBe('User created')
             })
             .end((err, res) =>{
                 if(err) {
                     return done(err) }
                     pool.connect()
                         .then(client => {
                         return  client.query(`SELECT COUNT(*) FROM users`)
                        .then((res) => {
                            expect(res.rows[0].count).toBe('1');
                            client.release();
                            done();
                        })
                      }).catch(e => {
                         console.log(e.message,e.stack);
                         done(e)
                      })
                 
                 
             })
    } )
})

=======
var request = require('supertest'),
   app     = require('../server',)
   expect = require('chai');

describe('Page requests' , function (){
    it('should load home page', function (done){
        request(app)
        .get('/')
        .expect(200)
        .expect(/home/, done)
    })
    it('should load about page', function (done){
        request(app)
        .get('/about')
        .expect(200)
        .expect(/about/, done)
    })
    it('should load admin page', function (done){
        request(app)
        .get('/admin')
        .expect(200)
        .expect(/admin/, done)
    })
    it('should load login page', function (done){
        request(app)
        .get('/login')
        .expect(200)
        .expect(/login/, done)
    })
    it('should load manage-users page', function (done){
        request(app)
        .get('/users/manage-users')
        .expect(200)
        .expect(/create and edit/, done)
    })
    it('should load forgot-password page', function (done){
        request(app)
        .get('/users/forgot-password')
        .expect(200)
        .expect(/forgotten password/, done)
    })
    it('should load manage content page', function (done){
        request(app)
        .get('/content/manage-page')
        .expect(200)
        .expect(/create content/, done)
    })
    it('should load manage all pages', function (done){
        request(app)
        .get('/content/manage-all-pages')
        .expect(200)
        .expect(/manage all content/, done)
    })
})
>>>>>>> develop
