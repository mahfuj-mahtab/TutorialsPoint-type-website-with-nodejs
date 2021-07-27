const express = require("express");
const ejs = require("ejs");
require('dotenv').config();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const session = require("express-session");
const fileUpload = require("express-fileupload");
const uuid4 = require("uuid4");

const app = express();

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));
app.set("view engine","ejs");
app.use(session({
    secret : process.env.SECRET,
    resave: false,
    saveUninitialized: true,
}))
app.use(fileUpload());


// database
mongoose.connect("mongodb://localhost/CodingForBabyDB", {useNewUrlParser: true,
useUnifiedTopology: true,
useFindAndModify: false,
useCreateIndex: true});

const userSchema = new mongoose.Schema({
    fullName : String,
    user : String,
    email : String,
    img   : String,
    role : String,
    password : String,
    // date   : String,

})
const User = new mongoose.model("User", userSchema);
bcrypt.hash(process.env.PASSWORD,10,(err,hash)=>{
    if(err) console.log(err);
    var now = new Date();
    const admin = new User({
        fullName : process.env.FULLNAME,
        user : process.env.USER,
        email : process.env.EMAIL,
        password : hash,
        role : process.env.ROLE,
        // date : now.format("dd/MM/yyyy hh:mm TT"),
    });
    admin.save();
})

const categorySchema = new mongoose.Schema({
    catName : String,
    catLogo : String,
    catBanner : String,
    author : String,
    date : String,
    level : String,
})

const Category = new mongoose.model("Category",categorySchema);


const postSchema = new mongoose.Schema({
    title : String,
    body : String,
    catName : String,
    author : String,
    date : String,
})
const Post = new mongoose.model("Post", postSchema);



app.get("/",(req,res)=>{
    
    Category.find({},(err,result)=>{
       
        res.render("Home", {results : result});

    })
})
app.get("/course/:catName",(req,res)=>{
    console.log(req.params.catName.replace(/-/g, ' '));
    Post.find({catName : req.params.catName.replace(/-/g, ' ')},(err,result)=>{
        if(err) console.log(err);
        console.log(result.length);
        if(result.length === 0){
            res.redirect("/");
        }
        else{

            res.redirect(`/course/${req.params.catName}/${result[0].title.replace(/\s+/g, '-')}`);
        }
    })
    // res.render("course");
})
app.get("/course/:catName/:postTitle",(req,res)=>{
    Post.find({title : req.params.postTitle.replace(/-/g, ' ')},(err,singlePostResult)=>{
        if(err) console.log(err);
        // console.log(req.params.catName.replace(/-/g, ' '));
        // console.log(result[0].catName)
        // if(result[0].catName === req.params.catName.replace(/-/g, ' ')){
            // console.log(result[0].body);
            Post.find({catName : req.params.catName.replace(/-/g, ' ')},(err,allPostResult)=>{

                Category.find({catName : req.params.catName.replace(/-/g, ' ')},(err,catResult)=>{

                    res.render("course",{singlePostResults : singlePostResult[0], allPostResults : allPostResult, catResults : catResult[0]});
                })

            })
        // }
        // else{
        //     console.log("cat didnot match");
        // }
    })
})
app.get("/admin-panel",(req,res)=>{
    if(req.session.user){

        res.render("admin/Home");
    }
    else{
        res.redirect("/admin/login");
    }
})
app.get("/admin/addpost",(req,res)=>{
    if(req.session.user){
        Category.find({},(err,result)=>{
            if(err) console.log(err)
                res.render("admin/AddPost",{results : result});
        
    })
    }
    else{
        res.redirect("/admin/login");
    }
})
app.post("/addPost",(req,res)=>{
    var postTitle = req.body.postTitle;
    var postBody = req.body.postBody;
    var cat = req.body.catSelector;

    const newPost = new Post({
        title : postTitle,
        body  : postBody,
        catName : cat,
        author   : req.session.user,
        // date     : ,
    });
    newPost.save();
})
app.get("/admin/addcategory",(req,res)=>{
    if(req.session.user){
        Category.find({},(err,catResults)=>{
            if(err) console.log(err);
            else{

                res.render("admin/AddCategory",{catResults : catResults});
            }
        })
    }
    else{
        res.redirect("/admin/login");
    }
})

app.get("/admin/catdelete/:catId",(req,res)=>{
    Category.findOneAndDelete({_id : req.params.catId},(err)=>{
        if(err) console.log(err);
        else{
            console.log("delete successfull");
            res.redirect("/admin/AddCategory");
        }
    })
})


app.get("/admin/catedit/:catId",(req,res)=>{
    Category.find({_id : req.params.catId},(err,result)=>{
        if(err) console.log(err)
        else{
            res.render("admin/catedit",{results : result[0]});
        }
    })
})
app.post("/admin/editcat/:catId",(req,res)=>{

    var catName = req.body.category.toLowerCase();
    var catLogo = req.files.catLogo;
    var catBanner = req.files.catBanner;
    var catLogoName = uuid4().toString() + catLogo.name;
    var catBannerName = uuid4().toString() + catBanner.name;
    
    logoUploadPath = __dirname + '/public/uploads/' + catLogoName;
    catLogo.mv(logoUploadPath, function(err) {
        if (err)
          console.log("error in upload");
    
        console.log("file uploaded");
      });

      
      bannerUploadPath = __dirname + '/public/uploads/' + catBannerName;

      catBanner.mv(bannerUploadPath, function(err) {
          if (err)
            // return res.status(500).send(err);
          console.log("error in upload");

      
          console.log("file uploaded");
        });

        Category.findOneAndUpdate({_id : req.params.catId},{
            catName : catName,
            catLogo  : catLogoName,
            catBanner : catBannerName,
            author  : req.session.user,
        },(err)=>{
            if(err) console.log(err)
            else{
                res.redirect("/admin/AddCategory");
            }
        })


})


app.get("/admin/showusers",(req,res)=>{
    if(req.session.user){
        res.render("admin/ShowUsers");
    }
    else{
        res.redirect("/admin/login");
    }
})

app.get("/admin/showposts",(req,res)=>{
    if(req.session.user){

        Post.find({},(err,result)=>{
            if(err) console.log(err);
            

            res.render("admin/ShowPosts",{results : result});
        })
    }
    else{
        res.redirect("/admin/login");
    }
})

app.get("/admin/login",(req,res)=>{
    res.render("admin/Login");
})

// post request 

app.post("/admin/login",(req,res)=>{
    var userName = req.body.userName;
    var password = req.body.password;
    User.find({user : userName},(err,result)=>{
        if(err) console.log(err)
        bcrypt.compare(password,result[0].password,(err,passResult)=>{
            if(passResult){
                req.session.user = userName;
                res.redirect("/admin-panel");
            }
            else{
                console.log("wrong password");
            }
        })
    })
})

app.post("/addCat",(req,res)=>{
    var catName = req.body.category.toLowerCase();
    var catLogo = req.files.catLogo;
    var catBanner = req.files.catBanner;
    var catLogoName = uuid4().toString() + catLogo.name;
    var catBannerName = uuid4().toString() + catBanner.name;
    
    logoUploadPath = __dirname + '/public/uploads/' + catLogoName;
    catLogo.mv(logoUploadPath, function(err) {
        if (err)
          console.log("error in upload");
    
        console.log("file uploaded");
      });

      
      bannerUploadPath = __dirname + '/public/uploads/' + catBannerName;

      catBanner.mv(bannerUploadPath, function(err) {
          if (err)
            // return res.status(500).send(err);
          console.log("error in upload");

      
          console.log("file uploaded");
        });
      
//     setTimeout(()=>{
        
         
        
//   },1000)
//   setTimeout(()=>{
    Category.find({catName : catName},(err,result)=>{
        if(err) console.log("err")
        if(result.length >= 1){
            console.log("category already exist");
        }
        else{
            const newCat = new Category({
                catName : catName.toLowerCase(),
                catLogo : catLogoName,
                catBanner : catBannerName,
                // author    : req.session.user,
        
        
            })
            newCat.save();
        }
    })
    
//   },3000)

    
    
    
    console.log(catLogoName)
    console.log();

})

app.get("/admin/postdelete/:postId",(req,res)=>{
    Post.findOneAndDelete({_id : req.params.postId},(err)=>{
        if(err) console.log(err);
        else{
            console.log("delete successfull");
            res.redirect("/admin/showposts");
        }
    })
})

app.get("/admin/postedit/:postId",(req,res)=>{
    if(req.session.user){

        Post.find({_id : req.params.postId}, (err,result)=>{
            if(err) console.log(err)
            else{
                console.log(result);
                Category.find({},(err,catResults)=>{
    
                    res.render("admin/editpost", {result : result[0], catResults : catResults});
                })
            }
        })
    }
    else{
        res.redirect("/admin/login");
    }
})
app.post("/editpost/:postId",(req,res)=>{
    var title = req.body.postTitle;
    var body = req.body.postBody;
    var cat = req.body.catSelector;

    Post.findOneAndUpdate({_id : req.params.postId},{
        title : title,
        body  : body,
        catName : cat,
        author  : req.session.user,
    },(err)=>{
        if(err) console.log(err)
        else{
            res.redirect("/admin/ShowPosts")
        }
    })
})


app.listen(3000,(req,res)=>{
    console.log("server is started .....")
})