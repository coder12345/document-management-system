//ENV stuff

require('dotenv').config();

const conString = process.env.DATABASE_URL;
const secret = process.env.JWT_SECRET;
const authenticateToken = require('./middleware/authMiddleware');

const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const app = express();

const pg = require('pg');
const bcrypt = require('bcrypt');

const multer = require('multer');
const cloudinary = require('./cloudinary');

const e = require('express');

const storage = multer.memoryStorage();
const upload = multer({ storage });








const client = new pg.Client({
  connectionString: conString,
  ssl: {
    rejectUnauthorized: false
  }
});

const uploadToCloudinary = async (fileBuffer, originalName) => {
                return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                {
                    resource_type: "auto",
                    folder: "uploads",
                    public_id: originalName.split(".")[0],
                },
                    (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );

            stream.end(fileBuffer);
            });
        };


client.connect();
app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, '../frontend')));
//upload page route
app.get('/upload', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/upload.html'));
});
//register page route
app.get('/register', (req, res) => { 
    res.sendFile(path.join(__dirname, '../frontend/pages/register.html'));
});
//login page route
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/login.html'));
});
// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/login.html'));
});

// Dashboard pageroute
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/dashboard.html'));
});

app.get('/api/dashboard', authenticateToken, (req, res) => {
    let id = req.user.id;

    client.query('SELECT * FROM users WHERE id = $1', [id], (err, result) => {
        if (err) {
            console.error('Error querying user:', err);
            res.status(500).json({ success: false, message: 'Error fetching user data' });
        } else if (result.rows.length === 0) {
            res.status(404).json({ success: false, message: 'User not found' });
        } else {
            let user = result.rows[0];
            let fname = user.fname;
            let lname = user.lname;
            console.log(fname, lname);
            res.json({
                success: true,
                fname: fname,
                lname: lname,
                
            });
        }
    });
});
//login route
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    console.log(username, password);

   client.query('SELECT * FROM users WHERE username = $1', [username], (err, result) => {
        if (err) { 
            console.error('Error querying user:', err);
            res.status(500).json({ success: false, message: 'Error logging in' });
        } else if (result.rows.length === 0) {
            res.status(401).json({ success: false, message: 'Invalid username or password' });
        } else {
            (async () => {
                console.log(result.rows);
                console.log(result.rows[0].password_hash);
                const isMatch = bcrypt.compareSync(password, result.rows[0].password_hash);
                if (isMatch) {
                    const token = jwt.sign({ id: result.rows[0].id }, secret, { expiresIn: '1h' });
                    res.json({ success: true, message: 'Login successful', token: token });
                    
                } else {
                    res.status(401).json({ success: false, message: 'Invalid username or password' });
                }
            })();
        }
    });
});
// register route
app.post('/api/register', (req, res) => {
    const { username, password, fname, lname } = req.body;
    let hashedpassword = bcrypt.hashSync(password, 10);
    console.log(username, hashedpassword, fname, lname);

    client.query('INSERT INTO users (username, password_hash, fname, lname) VALUES ($1, $2, $3, $4)', [username, hashedpassword, fname, lname], (err, result) => {
        if (err) {
            console.error('Error registering user:', err);
            res.status(500).json({ success: false, message: 'Error registering user' });
        } else {
            res.json({ success: true, message: 'User registered successfully' });
        }

    });
});

//get groups route
app.get('/api/getgroups', authenticateToken, async (req, res) => {
    try {
        const user_id = req.user.id;
        console.log("Fetching groups for user_id:", user_id);
        const result = await client.query(
            'SELECT g.id, g.name, gm.role, f.id AS root_folder_id FROM groups g JOIN group_memberships gm ON g.id = gm.group_id JOIN folders f ON f.group_id = g.id AND f.is_root = true WHERE gm.user_id = $1;',
            [user_id]
        );
        console.log(result.rows);
        res.json({ success: true, groups: result.rows});

    } catch (error) {
        console.error('Error fetching groups:', error);
        res.status(500).json({ success: false, message: 'Error fetching groups' });
    }
});
//get folders route
app.get('/api/getfoldercontent', authenticateToken, async (req, res) => {
    try {
        const user_id = req.user.id;  
        const folder_id = req.query.folder_id;
        console.log("Fetching folders for user_id:", user_id, "and folder_id:", folder_id);
        const checkPerms = await client.query(
            'SELECT EXISTS (SELECT 1 from group_memberships gm JOIN folders f ON gm.group_id = f.group_id WHERE gm.user_id = $1 AND f.id = $2 AND gm.role IN (\'admin\', \'member\'))',
            [user_id, folder_id]
        );
        console.log(checkPerms.rows[0].exists);
        if (!checkPerms.rows[0].exists) {
            console.log("User does not have permission to view this folder");
            return res.status(403).json({ success: false, message: 'You do not have permission to view this folder' });
        }
        const folderresult = await client.query(
            'SELECT id, name FROM folders WHERE parent_folder_id = $1',
            [folder_id]
        );
        console.log(folderresult.rows);

        const documentresult = await client.query(
            'SELECT id, title, current_version_id, uploaded_by FROM documents WHERE folder_id = $1',
            [folder_id]
        );
        console.log(documentresult.rows);
        res.json({ success: true, folders: folderresult.rows, documents: documentresult.rows });
    } catch (error) {
        console.error('Error fetching folders:', error);
        res.status(500).json({ success: false, message: 'Error fetching folders' });
    }
});
app.post('/api/upload', authenticateToken, upload.single("file"), async (req, res) => {
    try {
        console.log("File uploading:", req.file);

        let user_id = req.user.id;
        let group_id = req.body.group_id;
        let folder_id = req.body.folder_id;
        let document_id = req.body.document_id;
        let update = false;
        let final_folder_id = null;
        console.log(user_id, group_id, folder_id, document_id);
        let group_membership = await client.query(
            "SELECT EXISTS (SELECT 1 FROM group_memberships WHERE user_id = $1 AND group_id = $2 AND role IN ('admin', 'member'))",
            [user_id, group_id]
        );

        
      
            if (group_membership.rows[0].exists) {
                // upload files
                
                // Validate data in the request body
                if (!req.file ) {
                    console.log("file is required");
                    return res.status(400).json({ success: false, message: 'File is required' });
                    
                }

                



            

                if (document_id && (document_id !== '')) {
                    // Check if document exists and belongs to the user, then do update instead of insert
                    let documentexists = await client.query("SELECT EXISTS (SELECT 1 FROM documents WHERE id = $1 AND group_id = $2)", [document_id, group_id]);
                    if (!documentexists.rows[0].exists) {
                        console.log("document does not exist or does not belong in this group, document_id:", document_id, "group_id:", group_id);
                        return res.status(400).json({ success: false, message: 'Document does not exist or does not belong in this group'});
                        
                    } else {
                        update = true
                    }
                } 

            // Validate folder id
            if (folder_id && (folder_id !== '')) {
                let folderexists = await client.query("SELECT EXISTS (SELECT 1 FROM folders where id = $1 AND group_id = $2)", [folder_id, group_id]);
                if (!folderexists.rows[0].exists) {
                    console.log("folder does not exist or does not belong in this group, folder_id:", folder_id, "group_id:", group_id);
                    return res.status(400).json({ success: false, message: 'Folder does not exist or does not belong in this group'});
                    
                } else {
                    final_folder_id = folder_id;
                }
            } else {
                
                let root_folder_id  = await client.query("SELECT id FROM folders WHERE group_id = $1 AND is_root = true", [group_id]);
                if (root_folder_id.rows.length === 0) {
                    console.log("root folder not found for this group, group_id:", group_id);
                    return res.status(400).json({ success: false, message: 'Root folder not found for this group'});
                    
                }
                final_folder_id = root_folder_id.rows[0].id;
            }

            



            } else {
                console.log("user does not have permission to upload to this group");
                console.log("user_id:", user_id, "group_id:", group_id);
                return res.status(403).json({ success: false, message: 'You do not have permission to upload to this group' });
                
            }
            
            const cloudResult = await uploadToCloudinary(
                req.file.buffer,
                req.file.originalname
                
            );

            if (update) {

                let versionquery = await client.query('INSERT INTO document_versions (document_id, cloud_public_id, version_number, uploaded_by, secure_url) VALUES ($1, $2, (SELECT COALESCE(MAX(version_number), 0) + 1 FROM document_versions WHERE document_id = $1), $3, $4) RETURNING id', [document_id, cloudResult.public_id, user_id, cloudResult.secure_url]);
                let version_id = versionquery.rows[0].id;
                let versionupdate = await client.query('UPDATE documents SET current_version_id = $1, title = $2 WHERE id = $3', [version_id, req.file.originalname, document_id]);
                return res.json({ success: true, message: 'File uploaded successfully', document_id: document_id });
            } else {

                let insertdocquery = await client.query("INSERT INTO documents (group_id, folder_id, title, status, uploaded_by) VALUES ($1, $2, $3, 'pending', $4) RETURNING id", [group_id, final_folder_id, req.file.originalname, user_id]);
                let new_document_id = insertdocquery.rows[0].id;
                let versionquery = await client.query('INSERT INTO document_versions (document_id, cloud_public_id, version_number, uploaded_by, secure_url) VALUES ($1, $2, 1, $3, $4) RETURNING id', [new_document_id, cloudResult.public_id, user_id, cloudResult.secure_url]);
                let version_id = versionquery.rows[0].id;
                let versionupdate = await client.query('UPDATE documents SET current_version_id = $1 WHERE id = $2', [version_id, new_document_id]);
                return res.json({ success: true, message: 'File uploaded successfully', document_id: new_document_id });
            }
        

    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ success: false, message: 'Error uploading file' });
    }
});

app.post('/api/createfolder', authenticateToken, async (req, res) => {
    try {
        const user_id = req.user.id;
        const { group_id, parent_folder_id, folder_name } = req.body;
        console.log(user_id, group_id, parent_folder_id, folder_name);

        let groupmembership = await client.query(
            "SELECT EXISTS (SELECT 1 FROM group_memberships WHERE user_id = $1 AND group_id = $2 AND role IN ('admin', 'member'))",
            [user_id, group_id]
        );
        if (groupmembership.rows[0].exists) {
            if (parent_folder_id) {
                let folderexists = await client.query("SELECT EXISTS (SELECT 1 FROM folders where id = $1 AND group_id = $2)", [parent_folder_id, group_id]);
                if (!folderexists.rows[0].exists) {
                    console.log("parent folder does not exist or does not belong in this group, parent_folder_id:", parent_folder_id, "group_id:", group_id);
                    return res.status(400).json({ success: false, message: 'Parent folder does not exist or does not belong in this group'});
                } else {
                    let insertfolderquery = await client.query("INSERT INTO folders (group_id, parent_folder_id, name, created_by) VALUES ($1, $2, $3, $4) RETURNING id", [group_id, parent_folder_id, folder_name, user_id]);
                    return res.json({ success: true, message: 'Folder created successfully', folder_id: insertfolderquery.rows[0].id }); 
                }
            } 
        } else {
            return res.status(403).json({ success: false, message: 'You do not have permission to create folders in this group' });
        }
 
    } catch (error) {
        console.error('Error creating folder', error);
        res.status(500).json({ success: false, message: 'Error creating folder' });
    }
});

app.post('/api/creategroup', authenticateToken, async (req, res) => {
    try {
        const user_id = req.user.id;    
        const { group_name } = req.body;
        console.log(user_id, group_name);
        let insertgroupquery = await client.query("INSERT INTO groups (name) VALUES ($1) RETURNING id", [group_name]);
        console.log("Group created with id:", insertgroupquery.rows[0].id);
        await client.query("INSERT INTO folders (group_id, name, is_root, created_by) VALUES ($1, 'root', true, $2) RETURNING id", [insertgroupquery.rows[0].id, user_id]);
        console.log("Root folder created for group with id:", insertgroupquery.rows[0].id);
        await client.query("INSERT INTO group_memberships (user_id, group_id, role) VALUES ($1, $2, 'admin')", [user_id, insertgroupquery.rows[0].id]);
        console.log("User added as admin to group with id:", insertgroupquery.rows[0].id);
        return res.json({ success: true, message: 'Group created successfully', group_id: insertgroupquery.rows[0].id });
    } catch (error) {
        console.error('Error creating group', error);
        res.status(500).json({ success: false, message: 'Error creating group' });
    }
});
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generateRandomPart(length) {
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

function generateInviteCode() {
    return "GRP-" + generateRandomPart(6);
}

app.post('/api/makeinvite', authenticateToken, async (req, res) => {
    try {
        const user_id = req.user.id;    
        const { group_id } = req.body;
        console.log(user_id, group_id);
        let groupmembership = await client.query(
            "SELECT EXISTS (SELECT 1 FROM group_memberships WHERE user_id = $1 AND group_id = $2 AND role = 'admin')",
            [user_id, group_id]
        );
        if (!groupmembership.rows[0].exists) {
            console.log("User does not have permission to generate invite code for this group, user_id:", user_id, "group_id:", group_id);
            return res.status(403).json({ success: false, message: 'You do not have permission to generate an invite code for this group' });
        } else {
            let invite_code = generateInviteCode();
            await client.query("INSERT INTO group_invites (group_id, code, created_by, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')", [group_id, invite_code, user_id]);
            return res.json({ success: true, message: 'Invite code generated successfully', invite_code: invite_code });
        }

    
    } catch (error) {
        console.error('Error generating invite code', error);
        res.status(500).json({ success: false, message: 'Error generating invite code' });
    }
});


app.post('/api/joingroup', authenticateToken, async (req, res) => {
    try {
        const user_id = req.user.id;
        const { invite_code } = req.body;
        console.log(user_id, invite_code);
        let invitequery = await client.query("SELECT group_id, expires_at FROM group_invites WHERE code = $1", [invite_code]);
        if (invitequery.rows.length === 0) {
            console.log("Invalid invite code:", invite_code);
            return res.status(400).json({ success: false, message: 'Invalid invite code' });
        } else {
            let group_id = invitequery.rows[0].group_id;
            let expires_at = invitequery.rows[0].expires_at;
            if (new Date() > expires_at) {
                console.log("Invite code has expired:", invite_code);
                return res.status(400).json({ success: false, message: 'Invite code has expired' });
            }
            let membershipcheck = await client.query("SELECT EXISTS (SELECT 1 FROM group_memberships WHERE user_id = $1 AND group_id = $2)", [user_id, group_id]);
            if (membershipcheck.rows[0].exists) {
                console.log("User is already a member of this group, user_id:", user_id, "group_id:", group_id);
                return res.status(400).json({ success: false, message: 'You are already a member of this group' });
            } else {
                await client.query("INSERT INTO group_memberships (user_id, group_id, role) VALUES ($1, $2, 'member')", [user_id, group_id]);
                console.log("User added to group successfully, user_id:", user_id, "group_id:", group_id);
                return res.json({ success: true, message: 'You have joined the group successfully' });
            }
        }
    } catch (error) {
        console.error('Error joining group', error);
        res.status(500).json({ success: false, message: 'Error joining group' });
    }
});


app.get('/api/getdocument', async (req, res) => {
    try {
        



        const document_id = req.query.document_id;
     
            let documentresult = await client.query(
                'SELECT dv.secure_url FROM documents d JOIN document_versions dv ON d.current_version_id = dv.id WHERE d.id = $1',
                [document_id]
            );
            console.log(documentresult.rows[0]);
            res.redirect(documentresult.rows[0].secure_url);
        
    }
    catch (error) {
        console.error('Error fetching document details', error);
        res.status(500).json({ success: false, message: 'Error fetching document details' });
    }
});
app.listen(3000, () => {
  console.log('Server running on port 3000');
  
});



