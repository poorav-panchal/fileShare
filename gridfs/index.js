const dotenv = require('dotenv');
dotenv.config();
const {GridFsStorage} = require('multer-gridfs-storage');
const crypto = require('crypto');
const multer = require('multer');

const mongoUri = process.env.ATLAS_URI;

const storage = new GridFsStorage({
    url: mongoUri,
    options: {useUnifiedTopology: true, useNewUrlParser: true},
    file: (req, file) => {
        // console.log(`file: ${file}`)
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = `${buf.toString('hex')}_${file.originalname}`;
          const fileInfo = {
            filename: filename,
            bucketName: process.env.BUCKET_NAME
          };
          resolve(fileInfo);
          // console.log(`fileInfo: ${fileInfo}`)
        });
      });
    }
  });
  
module.exports =  multer({ storage });