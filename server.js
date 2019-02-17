//Based on classed solved Activity 20-Scraping-With-Mongoose 
//Dependencies
var express     = require("express");
var exphbs      = require("express-handlebars");
var mongoose    = require("mongoose");
var cheerio     = require("cheerio");
var axios       = require("axios");
var logger      = require("morgan");
var path        = require("path");

// Requiring Note and Article models
var Note        = require("./models/Note.js");
var Article     = require("./models/Article.js");

var PORT        = 3000;

//Initializing the app
var app         = express();

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

//Setting handlebars
app.engine("handlebars", exphbs({
    defaultLayout: "main",
    partialsDir: path.join(__dirname, "/views/layouts/partials")
}));
app.set("view engine", "handlebars");

//Database
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

mongoose.connect(MONGODB_URI);

  //////////////////////////////////////////////////////////////////////////////////////////////////
 //                                     Start Of Routes                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////////////////////////
 //                        Start Get Request For Handlebars Pages                                //
//////////////////////////////////////////////////////////////////////////////////////////////////
//Home page
app.get("/", function (req, res) {
    Article.find({ "saved": false }, function (err, data) {
        var hbsObject = {
            article: data
        };
        console.log(hbsObject);
        res.render("index.handlebars", hbsObject);
    });
});
//Saved Page
app.get("/saved", function (req, res) {
    Article.find({ "saved": true })
        .populate("notes")
        .exec(function (err, articles) {
            var hbsObject = {
                article: articles
            };
            res.render("saved.handlebars", hbsObject);
        });
});
  //////////////////////////////////////////////////////////////////////////////////////////////////
 //                        End Get Request For Handlebars Pages                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////////////////////////
 //                        Start of get request for scraping NY Tiems site                       //
//////////////////////////////////////////////////////////////////////////////////////////////////
app.get("/scrape", function (req, res) {
    // Making a request via axios for NY times
    axios.get("https://www.nytimes.com/").then(function (response) {
        // Load the Response into cheerio and save it to a variable
        // '$' becomes a shorthand for cheerio's selector commands, much like jQuery's '$'
        var $ = cheerio.load(response.data);
        // Save an empty result object
        var result = {};
        // Add the title and summary of every link, and save them as properties of the result object
        result.title = $(this)
            .children("h2.css-bzeb53")
            .text();
        result.summary = $(this)
            .children("p.css-1pfq5u")
            .text();
        result.link = $(this)
            .children("h2")
            .children("a")
            .attr("href");

        // Create a new Article using the `result` object built from scraping
        Article.create(result)
            .then(function (dbArticle) {
                // View the added result in the console
                console.log(dbArticle);
            })
            .catch(function (err) {
                // If an error occurred, log it
                console.log(err);
            });
    });

    // Send a message to the client
    res.send("Scrape Complete");
});
  //////////////////////////////////////////////////////////////////////////////////////////////////
 //                        End of get request for scraping NY Tiems site                         //
//////////////////////////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////////////////////////
 //                        Start of grabbing scrapped artciles from mongoDb                      //
//////////////////////////////////////////////////////////////////////////////////////////////////
app.get("/articles", function (req, res) {
    // Grab every document in the Articles collection
    Article.find({})
        .then(function (dbArticle) {
            // If we were able to successfully find Articles, send them back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});
  //////////////////////////////////////////////////////////////////////////////////////////////////
 //                        End of grabbing scrapped artciles from mongoDb                        //
//////////////////////////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////////////////////////
 //                        Start of grabbing scrapped articles by objectid                       //
//////////////////////////////////////////////////////////////////////////////////////////////////
app.get("/articles/:id", function (req, res) {
    Article.findOne({ _id: req.param.id })
        .populate("note")
        .then(function (dbArticle) {
            // If we were able to successfully find an Article with the given id, send it back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});
  //////////////////////////////////////////////////////////////////////////////////////////////////
 //                        End of grabbing scrapped articles by objectid                         //
//////////////////////////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////////////////////////
 //                        Start of Saving Article                                               //
//////////////////////////////////////////////////////////////////////////////////////////////////
app.post("/articles/save/:id", function (req, res) {
    Article.findOneAndUpdate({ _id: req.param.id },
        { saved: true })
        .then(function (dbArticle) {
            // If we were able to successfully find an Article with the given id, send it back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
    res.send(doc);
});
  //////////////////////////////////////////////////////////////////////////////////////////////////
 //                        End of Saving Article                                                 //
//////////////////////////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////////////////////////
 //                        Start of delete article                                               //
//////////////////////////////////////////////////////////////////////////////////////////////////
app.post("/articles/save/:id", function (req, res) {
    Article.findOneAndUpdate({ _id: req.param.id },
        { saved: false })
        .then(function (dbArticle) {
            // If we were able to successfully find an Article with the given id, send it back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
    res.send(doc);
});
  //////////////////////////////////////////////////////////////////////////////////////////////////
 //                        End of delete Article                                                 //
//////////////////////////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////////////////////////
 //                        Start of new note                                                     //
//////////////////////////////////////////////////////////////////////////////////////////////////
app.post("/notes/save/:id", function (req, res) {
    //creating a new note
    var newNote = new Note({
        body: req.body.text,
        article: req.params.id
    });
    //console log it
    console.log(req.body)
    //save the note to db
    newNote.save(function (err, note) {
        if (err) {
            console.log(err);
        }
        else {
            //Use article id to find and update its notes
            Article.findOneAndUpdate({ _id: req.params.id },
                { $push: { "notes": note } })
                .then(function (dbArticle) {
                    // If we were able to successfully find an Article with the given id, send it back to the client
                    res.json(dbArticle);
                })
                .catch(function (err) {
                    // If an error occurred, send it to the client
                    res.json(err);
                });
            res.send(doc);
        }
    });
});
  //////////////////////////////////////////////////////////////////////////////////////////////////
 //                        End of new note                                                       //
//////////////////////////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////////////////////////
 //                        Start of delete note                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////
app.delete("/notes/delete/:note_id/:article_id", function (req, res) {
    // Use the note id to find and delete it
    Note.findOneAndRemove({ "_id": req.params.note_id }, function (err) {
        // Log any errors
        if (err) {
            console.log(err);
            res.send(err);
        }
        else {
            db.Article.findOneAndUpdate({ "_id": req.params.article_id },
                { $pull: { "notes": req.params.note_id } })
                .then(function (dbArticle) {
                    res.json(dbArticle);
                })
                .catch(function (err) {
                    res.json(err);
                })
            res.send("Note deleted")
        }
    });
});
  //////////////////////////////////////////////////////////////////////////////////////////////////
 //                                     End Of Delete Note                                       //
//////////////////////////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////////////////////////
 //                                     End Of Routes                                            //
//////////////////////////////////////////////////////////////////////////////////////////////////

// Start the server
app.listen(PORT, function () {
    console.log("App running on port " + PORT + "!");
});
