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
        const isPDF = originalName.toLowerCase().endsWith(".pdf");

        const stream = cloudinary.uploader.upload_stream(
           {
            resource_type: isPDF ? "raw" : "auto",
            use_filename: true,
            unique_filename: false,
            filename_override: originalName
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
        let name = req.body.name;
        let update = req.body.update == "true"
        console.log("updating " + update);
        let changeNote = req.body.changeNote;
        let final_folder_id = null;
        console.log(user_id, group_id, folder_id, document_id, name);
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

                



            


            // Validate folder id
            if (!update) {
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
        }
            



            } else {
                console.log("user does not have permission to upload to this group");
                console.log("user_id:", user_id, "group_id:", group_id);
                return res.status(403).json({ success: false, message: 'You do not have permission to upload to this group' });
                
            }
            
            const cloudResult = await uploadToCloudinary(
                req.file.buffer,
                req.body.name
                
            );

            if (update) {
                console.log('updating..')
                let versionquery = await client.query('INSERT INTO document_versions (document_id, cloud_public_id, version_number, uploaded_by, secure_url, change_note, status) VALUES ($1, $2, (SELECT COALESCE(MAX(version_number), 0) + 1 FROM document_versions WHERE document_id = $1), $3, $4, $5, $6) RETURNING id', [document_id, cloudResult.public_id, user_id, cloudResult.secure_url, changeNote, "pending"]);
                let version_id = versionquery.rows[0].id;
                let versionupdate = await client.query('UPDATE documents SET current_version_id = $1 WHERE id = $2', [version_id, document_id]);
                return res.json({ success: true, message: 'File uploaded successfully', document_id: document_id });
            } else {
                console.log('no update')
                let insertdocquery = await client.query("INSERT INTO documents (group_id, folder_id, title, status, uploaded_by) VALUES ($1, $2, $3, 'pending', $4) RETURNING id", [group_id, final_folder_id, name, user_id]);
                let new_document_id = insertdocquery.rows[0].id;
                let versionquery = await client.query('INSERT INTO document_versions (document_id, cloud_public_id, version_number, uploaded_by, secure_url, status) VALUES ($1, $2, 1, $3, $4, $5) RETURNING id', [new_document_id, cloudResult.public_id, user_id, cloudResult.secure_url, 'pending']);
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


app.post('/api/getdocument', async (req, res) => {
   
    

    let doc_id = req.body.doc_id

    let documentQuery = await client.query("SELECT dv.id, dv.version_number, dv.secure_url, dv.cloud_public_id, dv.change_note, dv.created_at, dv.status, d.current_version_id, u.fname || ' ' || u.lname AS uploaded_by  FROM document_versions dv JOIN documents d ON dv.document_id = d.id  JOIN users u ON dv.uploaded_by = u.id WHERE dv.document_id = $1  ORDER BY dv.version_number DESC;", [doc_id]);
        if (documentQuery.rows.length === 0) {
            console.log("Document does not Exist");
            return res.status(400).json({ success: false, message: 'Docuemnt does not exist' });
        } else {

            return res.json(documentQuery.rows);
        }




});

app.get("/api/file/:id", authenticateToken, async (req, res) => {
    const result = await client.query(
        "SELECT cloud_public_id FROM document_versions WHERE id = $1",
        [req.params.id]
    );

    const url = cloudinary.url(result.rows[0].cloud_public_id, {
        resource_type: "raw",
        secure: true
    });
    console
    res.redirect(url);
});

app.post("/api/version/approve", authenticateToken, async (req, res) => {
    const { version_id } = req.body;

    const userId = req.user.id;

   
    

    
    await client.query("UPDATE document_versions SET status = 'approved' WHERE id = $1", [version_id]);

    
    await client.query("UPDATE documents SET current_version_id = $1 WHERE id = (SELECT document_id FROM document_versions WHERE id = $1)", [version_id]);

    res.json({ success: true });
});

app.post("/api/version/reject", authenticateToken, async (req, res) => {
    const { version_id } = req.body;

    const userId = req.user.id;

    

    await client.query("UPDATE document_versions SET status = 'rejected' WHERE id = $1", [version_id]);

    res.json({ success: true });
});

app.post("/api/delete/group", authenticateToken, async (req, res) => {
    const { group_id } = req.body;
    const user_id = req.user.id;

    const perm = await client.query(
        "SELECT role FROM group_memberships WHERE user_id=$1 AND group_id=$2",
        [user_id, group_id]
    );

    if (!perm.rows.length || perm.rows[0].role !== "admin") {
        return res.status(403).json({ error: "No permission" });
    }

    const versions = await client.query(
        "SELECT cloud_public_id FROM document_versions WHERE document_id IN (SELECT id FROM documents WHERE group_id=$1)",
        [group_id]
    );

    for (let v of versions.rows) {
        await cloudinary.uploader.destroy(v.cloud_public_id, { resource_type: "raw" });
    }

    await client.query("DELETE FROM groups WHERE id=$1", [group_id]);

    res.json({ success: true });
});

app.post("/api/delete/folder", authenticateToken, async (req, res) => {
    const { folder_id } = req.body;
    const user_id = req.user.id;

    const groupRes = await client.query(
        "SELECT group_id FROM folders WHERE id=$1",
        [folder_id]
    );

    if (!groupRes.rows.length) {
        return res.status(404).json({ error: "Folder not found" });
    }

    const group_id = groupRes.rows[0].group_id;

    const perm = await client.query(
        "SELECT role FROM group_memberships WHERE user_id=$1 AND group_id=$2",
        [user_id, group_id]
    );

    if (!perm.rows.length || perm.rows[0].role !== "admin") {
        return res.status(403).json({ error: "No permission" });
    }

    const versions = await client.query(
        `SELECT dv.cloud_public_id
         FROM document_versions dv
         JOIN documents d ON dv.document_id = d.id
         WHERE d.folder_id = $1`,
        [folder_id]
    );

    for (let v of versions.rows) {
        await cloudinary.uploader.destroy(v.cloud_public_id, { resource_type: "raw" });
    }

    await client.query("DELETE FROM folders WHERE id=$1", [folder_id]);

    res.json({ success: true });
});

app.post("/api/delete/document", authenticateToken, async (req, res) => {
    const { doc_id } = req.body;
    const user_id = req.user.id;

    const doc = await client.query(
        "SELECT group_id FROM documents WHERE id=$1",
        [doc_id]
    );

    if (!doc.rows.length) {
        return res.status(404).json({ error: "Document not found" });
    }

    const group_id = doc.rows[0].group_id;

    const perm = await client.query(
        "SELECT role FROM group_memberships WHERE user_id=$1 AND group_id=$2",
        [user_id, group_id]
    );

    if (!perm.rows.length || perm.rows[0].role !== "admin") {
        return res.status(403).json({ error: "No permission" });
    }

    const versions = await client.query(
        "SELECT cloud_public_id FROM document_versions WHERE document_id=$1",
        [doc_id]
    );

    for (let v of versions.rows) {
        await cloudinary.uploader.destroy(v.cloud_public_id, { resource_type: "raw" });
    }

    await client.query("DELETE FROM documents WHERE id=$1", [doc_id]);

    res.json({ success: true });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT);



