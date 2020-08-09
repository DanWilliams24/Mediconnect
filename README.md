# Mediconnect
This serverside code is written with Node.js/Express and uses MongoDB as a database solution. It interfaces with the  Twilio SMS API via webhooks.
Problems will be documented here, and soon instructions on setup will also be here.

PROBLEM #1: SERVER UNABLE TO CONNECT TO MONGODB DUE TO NEW IP
Server unable to connect to MongoDB as it is no longer attached to the public IP: 108.48.150.169. 
Questions:
Where did this IP come from in the first place?
What changed since August 2nd(It was working a day ago)
Is the server connected to a front facing IP and if it is, what is it?

Solution:


PROBLEM #2: ERROR IN METHOD OF IDENTIFYING INBOUND MESSAGE  
Current database structure makes searching for specific phone numbers tedious, as multiple requests must be made to all tables in search of a match. Also, this method leads to problems in the case where a user has multi-group membership(ie is MEDIC but also asking for help)

SOLUTION: Change database structure from having two relations (Medics + Requests) to a more simplistic one relation model where a singular table called 'User' stores tuples with the primary key of Phone Number. Attributes will include booleans/Enums to establish membership to groups like the 'Medics' as well as a enum field indicating whether the user is in the process of completing a specific survey and which survey it is. One more field will represent a foreign key from another table storing all possible responses. Only one survey can be active at a time.



Problem #3: How should the server move between routes and how should data be sent between routes?
The seemingly best way to move between routes is to use redirects. However as for the second problem, the answer is not as straightforward. There are a few options: 
1) Context can be transferred across redirects through queries. This is a simple and quick mechanism that allows data to be sent to routes and requires little setup(just uses the 'url' core module) or other external dependencies to work. A possible downside to this method is the problem of security. Is it a good idea to send phone numbers and message body through URLs? In most cases probably not. However, I am unsure whether this is truly a concern as I believe this information is not accessible since these redirect requests are made within the webserver to other routes within the webserver. 

2) Sessions is the second way to achieve information persistence across redirects. This has a bit of setup involved and the use of the 'express-session' dependency to function. The method itself involves the storing data in the session (in key|value format) before a redirect and then using 'req.session' to retrieve the stored data in other routes. The only real issue with this approach is that this may be a larger solution than needed to address the problem. The data stored in a session are not only accessible between routes, but also between requests and responses. In short, long-lasting information may create more unexpected behavior than worth dealing with for this specific use case.

Solution: After research and consideration, I made the decision to go with queries for informational redirects. I heavily used 'https://stackoverflow.com/questions/19035373/how-do-i-redirect-in-expressjs-while-passing-some-context' as a aid when making this decision. 


Note 1: In order to address the problem of filtering false traffic from other sources outside a protest, one can make use of the geographic data twilio sends with requests. Twilio's geographic data provides the city, state/province, postal code(zipcode), and country attached to a specific phone number. 

