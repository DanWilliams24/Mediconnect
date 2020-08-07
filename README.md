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

SOLUTION: Change database structure from having two relations (Medics + Requests) to a more simplistic one relation model where a singular table called 'Messages' stores tuples with the primary key of Phone Number. Attributes will include booleans/Enums to establish membership to groups like the 'Medics' as well as a enum field indicating whether the user is in the process of completing a specific survey and which survey it is. One more field will represent with a foreign key from another table storing all possible responses. Only one survey can be active at a time.
