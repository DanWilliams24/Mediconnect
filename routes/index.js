var express = require('express');
const { response } = require('../app');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  const phone = res.Body.From;
  //Check if user is from continued conversation or new conversation

  res.render('twiml', { title: 'Express' });
});



function respond(message){
  
}

module.exports = router;
