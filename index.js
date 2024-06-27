const express = require('express');
const mySql   = require('mysql');
const cors    = require('cors');
const session = require('express-session');
const multer  = require('multer');
const path    = require('path');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const ftp = require('basic-ftp');

const app = express();

const corsOptions = {
  origin: 'https://ftp-cms-main.vercel.app', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());
const fs = require('fs');
app.use(session({
  secret: 'tmcKry',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false, // Set to true if using HTTPS
    httpOnly: true,
  },
}));

const con = mySql.createConnection({
    user: "u930769248_ftp_server",
    host: "srv919.hstgr.io",
    password: "FTP@nsctrade24",
    database: "u930769248_FTP",
});

// FTP Configuration
const ftpconfig = {
  host: 'ftp.tradeimex.in',
  user: 'u930769248.filefleet',
  password: 'Filefleettradeanu@123',
};

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     const clientId = req.body.clientId;
//     const uploadPath = path.join(__dirname, 'public_html', 'filefleet', 'ClientsFolder', clientId);

//     if (!fs.existsSync(uploadPath)) {
//       fs.mkdirSync(uploadPath, { recursive: true });
//     }
//     cb(null, uploadPath);
//   },
//   filename: function (req, file, cb) {
//     cb(null, file.originalname);
//   },
// });

const upload = multer({ 
  storage : multer.memoryStorage(),
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'niteshdkbp806@gmail.com',
      pass: 'Nitesh@dkbp',
    },
  });
// Assuming you're using Express for routing
// app.get('/admin-dashboard', (req, res) => {
//   if (!req.session.user) {
//       // User is not authenticated, redirect to login page
//       console.log('User is not logged in');
//       return res.redirect('/login');
//   }
//   // User is authenticated, render the dashboard
//   res.render('dashboard');
// });


app.post('/register', (req, res) => {

    const { fullname, email, password } = req.body;

    con.query(
        'SELECT * FROM admins WHERE email = ?',
        [email],
        (err, result) => {
            if (err) {
                console.error(err);
                res.status(500).send({ message: "Internal server error" });
            } else if (result.length > 0) {
                res.send({ message: 'User already exists please login' });
            } else {
                con.query(
                    'INSERT INTO admins (fullname,email, password) ' +
                    'VALUES (?, ?, ?)',
                    [fullname, email, password],
                    (err, result) => {
                        if (err) {
                            console.error(err);
                            res.status(500).send({ message: "Internal server error" });
                        } else {
                            res.send({ message: 'Registration successful',  redirect: '/login'});
                        }
                    }
                );
            }
        }
    );

});
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    con.query(
        "SELECT * FROM admins WHERE email = ? AND password = ?",
        [username, password],
        (err, result) => {
            if (err) {
                console.error(err);
                res.status(500).send({ message: "Internal server error",err });
            } else {
                if (result.length === 1) {
                  const user = result[0];
                  const { email, password } = user;
        
                  // Set user information in the session
                  req.session.user = { email, password };
                  res.send({email: req.session.user.email, password: req.session.user.password});
                  console.log('Session after Setting :', req.session.user ); 
                  console.log('User logged in successfully!');
                } else {
                  res.status(401).send({ message: "Invalid credentials" });
                }
            }
        }
    );
});

app.post('/client', (req, res) => {
    const { clientName, clientEmail, clientStatus,clientType, clientPassword } = req.body;
  
    // Generate a verification token
    // const verificationToken = uuidv4();
     
    con.query(
      'SELECT * FROM clients WHERE clientEmail = ?',
      [clientEmail],
      (err, result) => {
        if (err) {
          console.error(err);
          res.status(500).send({ message: 'Internal server error in client' });
        } else if (result.length > 0) {
          res.send({ message: 'Client already exists' });
        } else {
          const email = clientEmail.split('@');
          const emailPart = email[0].trim(); // Trim whitespace characters
          
          console.log('Email:', emailPart);
          const firstName = clientName.trim().split(' ')[0];
          const clientId = `TC_${firstName}_${emailPart}`;
          con.query(
            'INSERT INTO clients (clientName, clientId, clientEmail, clientStatus, clientType, clientPassword) ' +
              'VALUES (?, ?, ?, ?, ?,?)',
            [clientName, clientId, clientEmail, clientStatus,clientType, clientPassword],
            (dbErr, dbResult) => {
              if (dbErr) {
                console.error(dbErr);
                res.status(500).send({ message: 'Internal server error' });
              } else {
                res.send({ message: 'Client added successfully.' });
              }
            }
          );
          // Send verification email
          // const verificationLink = `http://192.168.1.10/:3002/verify/${verificationToken}`;
          // const mailOptions = {
          //   from: 'niteshdkbp806@gmail.com',
          //   to: clientEmail,
          //   subject: 'Email Verification',
          //   text: `Click the following link to verify your email:  ${verificationLink}`,
          // };
  
          // transporter.sendMail(mailOptions, (mailErr, info) => {
          //   if (mailErr) {
          //     console.error(mailErr);
          //     res.status(500).send({ message: 'Error sending verification email' });
          //   } else {
          //     // Save user data and verification token to the database

          //   }
          // });
        }
      }
    );
  });
app.get('/clientdata',  (req, res,) => {

    con.query('SELECT * FROM clients', (err, result) => {
      if (err) {
        console.error('Error querying MySQL:', err);
        res.status(500).send({ message: 'Internal server error' });
        return;
      }
      // console.log(result);
      res.send(result);
    });
  });

// Route to handle file upload
app.post('/upload-file', upload.single('file'), async (req, res) => {
  const { clientId, clientName, fileType, fileMonth } = req.body;
  const file = req.file; // This contains the file data as a buffer

  if (!clientId || !clientName || !fileType || !fileMonth || !file) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const fileName = file.originalname;
  const uploadMonth = new Date().toLocaleString('en-US', { month: 'long' });
  const uploadYear = new Date().getFullYear();
  const uploadDate = new Date().toISOString().split('T')[0];
  const file_status = 'Sent';
  const file_name_with_month = `${fileName}`;

  try {
    // Dynamically create the table if it doesn't exist (ensure you handle SQL injection vulnerabilities)
    await con.query(`CREATE TABLE IF NOT EXISTS \`${clientId}\` (
      uid SERIAL PRIMARY KEY,
      filetype VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_month VARCHAR(255) NOT NULL,
      file_status VARCHAR(255) NOT NULL,
      upload_date DATE NOT NULL,
      upload_month VARCHAR(255) NOT NULL,
      download_status VARCHAR(255),
      upload_year INT NOT NULL
    )`);

    // Insert data into the dynamically created table
    const insertQuery = `INSERT INTO \`${clientId}\` (name, fileType, file_month, file_name, upload_date, upload_month, file_status, download_status, upload_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    await con.query(insertQuery, [clientName, fileType, fileMonth, file_name_with_month, uploadDate, uploadMonth, file_status, null, uploadYear]);

    // FTP upload logic
    const client = new ftp.Client();
    client.ftp.verbose = true;

    try {
      await client.access(ftpconfig);
      await client.ensureDir(`/public_html/filefleet/ClientsFolder/${clientId}`);
      // Upload the file from memory buffer to the FTP server
      await client.uploadFromMemory(fileName, file.buffer);
    } catch (ftpError) {
      console.error('FTP Error:', ftpError);
      res.status(500).json({ error: 'Failed to upload file to FTP server' });
      return;
    } finally {
      client.close();
    }

    res.status(200).json({ message: 'File uploaded successfully' });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
  app.get('/getFileData/:clientId', async (req, res) => {
    const clientId = req.params.clientId;
    const getFileSql = `SELECT * FROM \`${clientId}\``;
    con.query(getFileSql,[clientId], (err, result) => {
        if (err) {
          console.error('Error querying MySQL:', err);
          res.status(500).send({ message: 'Internal server error' });
          return;
        }else if(result >= 0){
          console.log(result);
          res.status(200).send(result);
        }else{
          res.status(404).send({ message: 'No data found' });
        }
      });

  });

  // Client Update
  app.post('/edit-client/:clientId', (req, res) => {
    const clientId = req.params.clientId;
    const { clientName, clientEmail, clientStatus, clientPassword,clientType } = req.body;
    
    // Use UPDATE statement to modify existing data in the client table
    const updateQuery = 'UPDATE clients SET clientName=?, clientEmail=?, clientStatus=?, clientPassword=?, clientType=?WHERE clientId=?';
    con.query(updateQuery, [clientName, clientEmail, clientStatus, clientPassword,clientType, clientId], (err, result) => {
      if (err) {
        res.status(500).send({ message: 'Internal server error' });
      } else {
        res.status(200).send({ message: 'Client ' + clientName + ' updated successfully' });
      }
    });
  });

  //profile update
  // app.post("/updateProfile", verifyToken,(
  
  // Delete Onclick of button
  app.post('/delete/:clientId/:file_name', (req, res) =>{
    const { clientId, file_name } = req.params;
    let sql = `DELETE FROM \`${clientId}\` WHERE file_name = ?`; // Use template literals for dynamic table name
    con
    console.log(file_name);
    con.query(sql, [file_name], function (err, result) {
      if (err) {
        console.error("Error deleting files:", err);
        res.status(500).send("Error deleting files");
      } else {
        console.log("Files deleted!");
        res.send("Deleted");
      }
    });
  });
  

  app.post('/admin-logout', (req, res) => {
    // Clear the session to log the admin out
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        res.status(500).send({ message: 'Logout failed' });
      } else {
        res.status(200).send({ message: 'Admin logout successful' });
      }
    });
  });
  // app.get('/success', (req, res) => {
  //   res.send('Running successfully');
  // });
  app.get('/test', (req, res) => {
    res.status(200).json('Welcome, your app is working well');
  })
app.listen(3005, '192.168.1.22', () => {
    console.log("Server is listening on port 3005. Ready for connections.");
});