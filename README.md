# streaming
streaming tools for monitoring and troubleshooting live streams
Note: these scripts should be placed behind a user/password protected website!


## Monitor.php
-----
This tool allows for a user to push websites to be viewed on a monitor wall.  It works in 3 parts.

*the form:* a user enters the urls for each monitor to display.
*the client:* the client is determined by adding a query string (eg ?m=1) to determine its monitor id.  The client then checks for changes every few seconds for updates to its url it should display.
*The data:* this is synced with a simple JSON file.

TODO:
- use database instead of JSON file
- use htaccess to use pretty urls instead of query strings
- break out styles and javascripts
- clean up code
