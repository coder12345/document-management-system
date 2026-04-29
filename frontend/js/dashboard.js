

let message = document.getElementById("welcome-message");
let UI = document.getElementById("container");
let UIButtons = document.getElementById("UIContainer");
let roles = [];
let navstack = [];

let inRoot = null;
let currentGroupId;
let currentRole;
const token = localStorage.getItem("token");
console.log("TOKEN:", token);


fetch("/api/getgroups", {
    method: "GET",
    headers: { 
        "Authorization": `Bearer ${token}`
    }
}).then(response => {
    if (!response.ok) {
        throw new Error('Failed to fetch groups');
    }
    return response.json();
}).then(data => {
    console.log("GROUPS:", data);
    groups = data.groups;
});

function clear() {
    UI.innerHTML = "";
    UIButtons.innerHTML = "";

}


function drawGroups(ui, root_folder_id) {
    clear()
   
    fetch("/api/getgroups", {
    method: "GET",
    headers: { 
        "Authorization": `Bearer ${token}`
    }
}).then(response => {
    if (!response.ok) {
        throw new Error('Failed to fetch groups');
    }
    return response.json();
}).then(data => {
    console.log("GROUPS:", data);
    groups = data.groups;

    for (let i=0; i<groups.length; i++) {
        ui.appendChild(createCard(groups[i].id, groups[i].name + " (" + groups[i].role + ")", () => {
            currentGroupId = groups[i].id; 
            navstack = [];

        navstack.push({ 
             type: 'group', 
            id: groups[i].id 
        });
        
        navstack.push({ 
            type: 'folder', 
            id: groups[i].root_folder_id,
        name: "root"
        });

        currentGroupId = groups[i].id;
        currentRole = groups[i].role;

        drawFolders(ui, groups[i].root_folder_id, groups[i].role);      
            
        }));
    }

    UIButtons.appendChild(createUICard("createGroup", "Create Group", () => {
        createGroup();
    }));
    UIButtons.appendChild(createUICard("joinGroup", "Join Group from Code", () => {
        joinGroup();
    }));

    UIButtons.appendChild(createUICard("logout", "Logout", () => {
        localStorage.removeItem("token");
        window.location.href = '/login';
    }));

});

}



function joinGroup() {
    clear();
    let title = document.createElement("h2");
    title.textContent = "Join Group with Invite Code";
    UI.appendChild(title);
    let form = document.createElement("form");  
    let codeInput = document.createElement("input");
    codeInput.placeholder = "Invite Code";
    form.appendChild(codeInput);
    let submitButton = document.createElement("button");
    submitButton.textContent = "Join Group";
    form.appendChild(submitButton);
    UI.appendChild(form);

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        let inviteCode = codeInput.value;
        console.log("Joining group with invite code:", inviteCode);
        fetch("/api/joingroup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                invite_code: inviteCode
            })
        }).then(response => {
            if (!response.ok) {
                throw new Error('Failed to join group');
            }
            return response.json();
        }).then(data => {
            console.log("Joined group:", data);
            drawGroups(UI); 
        }).catch(error => {
            console.error('Error joining group:', error);
        });
    });
}


function createGroup() {
    clear();
    let title = document.createElement("h2");
    title.textContent = "Create New Group";
    UI.appendChild(title);
    let form = document.createElement("form");
    let nameInput = document.createElement("input");
    nameInput.placeholder = "Group Name";
    form.appendChild(nameInput);
    let submitButton = document.createElement("button");
    submitButton.textContent = "Create Group";
    form.appendChild(submitButton);
    UI.appendChild(form);

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        let groupName = nameInput.value;
        console.log("Creating group with name:", groupName);
        fetch("/api/creategroup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                group_name: groupName
            })
        }).then(response => {
            if (!response.ok) {
                throw new Error('Failed to create group');
            }
            return response.json();
        }).then(data => {
            console.log("Group created:", data);
            drawGroups(UI); // Refresh the groups list
        });
    });
}

function drawFolders(ui, folder_id) {
        console.log(currentRole);
    clear();
    let previous = navstack[navstack.length - 2];
    console.log("Previous:", previous.type);
    let isRoot = previous && previous.type === "group";
    fetch('/api/getfoldercontent?folder_id=' + folder_id, {
        method: 'GET',
        headers: {
            "Authorization": `Bearer ${token}`
        }
    }).then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch folders');
        }
        return response.json();
    }).then(data => {
        for (let i=0; i<data.folders.length; i++) {
            ui.appendChild(createCard(data.folders[i].id, data.folders[i].name, () => { navstack.push({ type: 'folder', id: data.folders[i].id, name: data.folders[i].name }); drawFolders(ui, data.folders[i].id) }));
            console.log(navstack);
        }
        for (let i=0; i<data.documents.length; i++) {
            ui.appendChild(createCard(data.documents[i].id, data.documents[i].title, () => { navstack.push({ type: 'folder', id: folder_id });
    documentClicked(data.documents[i].id); }));
        }
    if (isRoot) {
        

        if (currentRole === "admin") {
            UIButtons.appendChild(createUICard("Invite Members", "Invite Members", () => { inviteMembers() }));
             UIButtons.appendChild(
        createUICard("deleteGroup", "Delete Group", () => {
            const confirmDelete = confirm("Delete this group? This cannot be undone.");
            if (!confirmDelete) return;

            fetch("/api/delete/group", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    group_id: currentGroupId
                })
            }).then(() => {
                drawGroups(UI);
            });
        })
    );
        

        }
    } else {
        if (currentRole == "admin") {
         UIButtons.appendChild(
        createUICard("deleteFolder", "Delete Folder", () => {
            const confirmDelete = confirm("Delete this folder and ALL contents?");
            if (!confirmDelete) return;

            fetch("/api/delete/folder", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    folder_id: folder_id
                })
            }).then(() => {
                back();
            });
        })
    
    );
    }
    }
        UIButtons.appendChild(createUICard("createFolder", "Create Folder", () => {
            createFolder(folder_id, "current folder");
        
        }));
        UIButtons.appendChild(createUICard("upload", "Upload Document", () => { drawNewUpload() }));
        UIButtons.appendChild(createUICard("back", "Back", () => { back(); }));
        
        
    });

}


function deleteDocument(doc_id) {
    fetch("/api/deletedocument", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ doc_id })
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to delete document");
        return res.json();
    })
    .then(() => {
        const folder = navstack[navstack.length - 1].id;
        drawFolders(UI, folder);
    });
}



function documentClicked(document_id) {
    console.log("Document clicked with id:", document_id);
   fetch("/api/getdocument", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                doc_id: document_id
            })
        }).then(response => {
            if (!response.ok) {
                throw new Error('Document was not fetched');
            }
            return response.json();
        }).then(data => {
            //Document Logic
            console.log(data);
            drawDocumentViewer(data, document_id);

        });



}

function drawDocumentViewer(data, doc_id) {
    clear();

    let latestApproved = null;
    let latestPending = null;

    for (let v of data) {
        if (v.status === "approved") {
            if (!latestApproved || v.version_number > latestApproved.version_number) {
                latestApproved = v;
            }
        }

        if (v.status === "pending") {
            if (!latestPending || v.version_number > latestPending.version_number) {
                latestPending = v;
            }
        }
    }

    let current =
        latestApproved ||
        latestPending ||
        data.sort((a, b) => b.version_number - a.version_number)[0];

    UIButtons.appendChild(createUICard("versionUp", "Upload new version", () => {
        uploadVersion(doc_id);
    }));

    UIButtons.appendChild(createUICard("back", "Back", () => {
        back();
    }));

    if (currentRole === "admin") {
    UIButtons.appendChild(
        createUICard("deleteDoc", "Delete Document", () => {
            const confirmDelete = confirm("Delete this document permanently?");
            if (!confirmDelete) return;

            fetch("/api/delete/document", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    doc_id: doc_id
                })
            }).then(() => {
                back();
            });
        })
    );
}
   
    let viewport = document.createElement("div");
    viewport.classList.add("document_view");

    

    viewport.appendChild(renderFile(current.secure_url));
    

    UI.appendChild(viewport);

    let versionsDiv = document.createElement("div");
    versionsDiv.classList.add("doc_versions");
    UI.appendChild(versionsDiv);

    for (let version of data) {
        let highlight = null;

        if (latestApproved && version.id === latestApproved.id) {
            highlight = "approved-latest";
        } else if (latestPending && version.id === latestPending.id) {
            highlight = "pending-latest";
        }

        versionsDiv.appendChild(
            createVersionCard(
                version,
                current.id,
                () => {
                    console.log(version.id);

                    
                    viewport.innerHTML = "";
                    viewport.appendChild(renderFile(version.secure_url));
                },
                highlight
            )
        );
    }
}
    
function getExtension(url) {
    try {
        const cleanUrl = url.split("?")[0]; 
        return cleanUrl.substring(cleanUrl.lastIndexOf(".")).toLowerCase();
    } catch {
        return "";
    }
}

function getFileType(url) {
    const ext = getExtension(url);

    if ([".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) {
        return "image";
    }

    if (ext === ".pdf") {
        return "pdf";
    }

    if ([".doc", ".docx"].includes(ext)) {
        return "doc";
    }

    if ([".xls", ".xlsx"].includes(ext)) {
        return "sheet";
    }

    return "unknown";
}

function showModal(text) {
    document.getElementById("modalText").textContent = text;
    document.getElementById("modal").classList.remove("hidden");
}

document.getElementById("modalClose").onclick = () => {
    document.getElementById("modal").classList.add("hidden");
};

function renderFile(url) {
    if (!url) {
        const err = document.createElement("p");
        err.textContent = "No file available";
        return err;
    }

    const lower = url.toLowerCase();

    
    if (
        lower.includes(".pdf") ||
        lower.includes("/raw/upload") ||
        lower.includes("application/pdf")
    ) {
        const iframe = document.createElement("iframe");
        iframe.src = url;

        iframe.style.width = "100%";
        iframe.style.height = "85vh";
        iframe.style.border = "none";

        return iframe;
    }

    
    if (
        lower.includes("/image/upload") ||
        /\.(png|jpg|jpeg|gif|webp)(\?|$)/.test(lower)
    ) {
        const img = document.createElement("img");
        img.src = url;

        img.style.width = "100%";
        img.style.height = "auto";
        img.style.objectFit = "contain";

        return img;
    }

    
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.textContent = "Open file";

    return a;
}

    
    
    





function uploadVersion(doc_id) {


    
    clear();
    let title = document.createElement("h2");
    title.textContent = "Upload New Version";
    UI.appendChild(title);
    let form = document.createElement("form");
    form.id = "uploadForm";
    let fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.id = "fileInput";
    let changeNote = document.createElement("textArea")
    changeNote.type = "text"
    changeNote.id = "changeNote"
    form.appendChild(fileInput);
    form.appendChild(changeNote)
    let submitButton = document.createElement("button");
    submitButton.textContent = "Upload";
    form.appendChild(submitButton);
    UI.appendChild(form);
    UIButtons.appendChild(createUICard("back", "Back", () => { back(); }));

    form.addEventListener("submit", async (event) => {
        event.preventDefault();


        
        if (changeNote.value.length > 200) {
            changeNotes = changeNote.value.substring(0, 200);
            console.log('flagged');
        }  else {
            changeNotes = changeNote;
        }
        const currentFolder = navstack[navstack.length - 1].id;
        const file = fileInput.files[0];
        const token = localStorage.getItem("token");
        
        console.log("Updating file:", file, "to folder id:", currentFolder);
        let formToSend = new FormData();
        formToSend.append("file", file);
        
        formToSend.append("name", null);
        formToSend.append("group_id", currentGroupId);
        formToSend.append("folder_id", currentFolder);
        formToSend.append("Change Notes", changeNotes)
        formToSend.append('update', true);
        formToSend.append('document_id', doc_id);
        
        fetch("/api/upload", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: formToSend
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to upload file');
            }
            console.log("File uploaded successfully");
            drawFolders(UI, currentFolder);
            return null;
        })
        .catch(error => {
            console.error('Error uploading file:', error);
        });





        });


    



}

function deleteGroup(group_id) {
    fetch("/api/deletegroup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ group_id })
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to delete group");
        return res.json();
    })
    .then(() => {
        drawGroups(UI);
    });
}

function confirmDelete(message, onConfirm) {
    const ok = confirm(message);
    if (ok) onConfirm();
}

function createVersionCard(data, currentVersionId, onClick, highlight) {
   
    let card = document.createElement("div");
    card.classList.add("doccard");
    let versionnum = document.createElement("p");
    versionnum.textContent = data.version_number;
    card.appendChild(versionnum);
    let uploader = document.createElement("p");
    uploader.textContent = data.uploaded_by;
    card.appendChild(uploader);
    let uploadedtime = document.createElement("p");
    uploadedtime.textContent = data.uploaded_at;
    card.appendChild(uploadedtime);
    
    if (data.change_note) {
    const noteBtn = document.createElement("button");
    noteBtn.textContent = "View Notes";

    noteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        showModal(data.change_note);
    });

    actions.appendChild(noteBtn);
}
    

    const actions = document.createElement("div");
    actions.classList.add("version-actions");

    
    const approveBtn = document.createElement("button");
    approveBtn.classList.add("icon-btn", "approve");
    approveBtn.innerHTML = `
    <svg viewBox="0 0 24 24">
        <path d="M9 16.2l-3.5-3.5L4 14.2 9 19l12-12-1.5-1.5z"/>
    </svg>
    `;

    approveBtn.addEventListener("click", (e) => {
        e.stopPropagation(); 
        fetch("/api/version/approve", {
            method: "POST",
            headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
         },
            body: JSON.stringify({ version_id: data.id })
        })
        statusBadge.textContent = "Approved";
        statusBadge.className = "status-badge status-approved";

        actions.innerHTML = "";
    
    });

    if (highlight === "approved-latest") {
        card.classList.add("highlight-approved");
    }

    if (highlight === "pending-latest") {
        card.classList.add("highlight-pending");
    }
    if (data.id === currentVersionId) {
        card.classList.add("current-version");

        const currentLabel = document.createElement("div");
        currentLabel.textContent = "Current";
        currentLabel.style.fontSize = "11px";
        currentLabel.style.color = "var(--accent)";
        currentLabel.style.fontWeight = "600";

    card.appendChild(currentLabel);
    }


    const rejectBtn = document.createElement("button");
    rejectBtn.classList.add("icon-btn", "reject");
    rejectBtn.innerHTML = `
    <svg viewBox="0 0 24 24">
        <path d="M18.3 5.7L12 12l6.3 6.3-1.3 1.3L10.7 13.3 4.4 19.6 3 18.3 9.3 12 3 5.7 4.4 4.4l6.3 6.3 6.3-6.3z"/>
    </svg>
    `;

    rejectBtn.addEventListener("click", (e) => {
       
        e.stopPropagation(); 
        fetch("/api/version/approve", {
            method: "POST",
            headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
         },
            body: JSON.stringify({ version_id: data.id })
        })
        statusBadge.textContent = "Rejected";
        statusBadge.className = "status-badge status-rejected";
        actions.innerHTML = "";
    
    });
    
   

    if (currentRole == "admin" && data.status == "pending") { 

        actions.appendChild(approveBtn);
        actions.appendChild(rejectBtn);
    }

    let statusBadge = document.createElement("div");
    statusBadge.classList.add("status-badge");

    if (data.status === "approved") {
        statusBadge.classList.add("status-approved");
        statusBadge.textContent = "Approved";
    } else if (data.status === "pending") {
        statusBadge.classList.add("status-pending");
        statusBadge.textContent = "Pending";
    } else if (data.status === "rejected") {
        statusBadge.classList.add("status-rejected");
        statusBadge.textContent = "Rejected";
    }

    card.appendChild(statusBadge);

    card.appendChild(actions);
    card.addEventListener("click", onClick);
    return card; 


}


function drawNewUpload() {
    clear();
    let title = document.createElement("h2");
    title.textContent = "Upload Document";
    UI.appendChild(title);
    let form = document.createElement("form");
    form.id = "uploadForm";
    let fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.id = "fileInput";
    let fileName = document.createElement('input');
    fileName.type = 'text'
    form.appendChild(fileName);
    form.appendChild(fileInput);
    let submitButton = document.createElement("button");
    submitButton.textContent = "Upload";
    form.appendChild(submitButton);
    UI.appendChild(form);
    UIButtons.appendChild(createUICard("back", "Back", () => { back(); }));

    form.addEventListener("submit", async (event) => {
        event.preventDefault();


        let name = null;
        if (fileName.value.length > 29) {
            name = fileName.value.substring(0, 29)
            console.log('flagged')
        }  else {
            name = fileName.value;
        }
        const currentFolder = navstack[navstack.length - 1].id;
        const file = fileInput.files[0];
        const token = localStorage.getItem("token");
        console.log("Uploading file:", file, "to folder id:", currentFolder);
        let formToSend = new FormData();
        formToSend.append("file", file);
        console.log(fileName.value.length)
        console.log(fileName.value.substring(0, 29));
        formToSend.append("name", name);
        formToSend.append("group_id", currentGroupId);
        formToSend.append("folder_id", currentFolder);
        formToSend.append('update', false);
        formToSend.append('document_id', null);
        
        
        fetch("/api/upload", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: formToSend
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to upload file');
            }
            console.log("File uploaded successfully");
            drawFolders(UI, currentFolder);
            return null;
        })
        .catch(error => {
            console.error('Error uploading file:', error);
        });





        });
}
function inviteMembers() {
    console.log("Inviting members to group id:", currentGroupId);
    fetch("/api/makeinvite", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
            group_id: currentGroupId
        })
    }).then(response => {
        if (!response.ok) {
            throw new Error('Failed to generate invite code');
        }
        return response.json();
    }).then(data => {
        console.log("Invite code generated:", data);
        alert("Invite code: " + data.invite_code);
    });
}

function back() {
    navstack.pop();

    let previous = navstack[navstack.length - 1];
    


    if (!previous) {
        drawGroups(UI);
    return;
    }

    if (previous.type === "folder") {
        drawFolders(UI, previous.id);
    } 

    

    if (previous.type === "group") {
        drawGroups(UI, previous.root_folder_id);
    }
    
}








function createCard(id, name, onClick) {
    let card = document.createElement("div");
    card.classList.add("card");
    let title = document.createElement("p");
    title.textContent = name;
    card.appendChild(title);
    card.addEventListener("click", onClick);
    return card;
    
}

function createUICard(id, name, onClick) {
    let card = document.createElement("div");
    card.classList.add("uicard");
    let title = document.createElement("p");
    title.textContent = name;
    card.appendChild(title);
    card.addEventListener("click", onClick);
    return card;

}

function createFolder(parent_folder_id, parent_folder_name) {
    console.log(navstack);
    
    clear();
    let title = document.createElement("h2");
    title.textContent = "Creating new folder in " + parent_folder_name;
    UI.appendChild(title);
    let form = document.createElement("form");
    let nameInput = document.createElement("input");
    nameInput.placeholder = "Folder Name";
    form.appendChild(nameInput);
    let submitButton = document.createElement("button");
    submitButton.textContent = "Create Folder";
    form.appendChild(submitButton);
    UI.appendChild(form);

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        let folderName = nameInput.value;
        console.log("Creating folder with name:", folderName, "in parent folder id:", parent_folder_id, "in group id:", currentGroupId);
        fetch("/api/createfolder", {
            method: "POST",
            headers: {
                "Content-Type": "application/json", 
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                group_id: currentGroupId,
                parent_folder_id: parent_folder_id,
                folder_name: folderName
            })
        }).then(response => {
            if (!response.ok) {
                throw new Error('Failed to create folder');
            }
            return response.json();
        }).then(data => {
            console.log("Folder created:", data);
            if (parent_folder_name === "root") {
                drawGroups(UI);
            } else {
                drawFolders(UI, parent_folder_id);
            }
        }).catch(error => {
            console.error('Error creating folder:', error);
        })


    })
}




drawGroups(UI, null);




fetch("/api/dashboard", {
    method: "GET",
    headers: {
        "Authorization": `Bearer ${token}`
    }
}).then(response => {
    if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
    }
    return response.json();
}).then(data => {
    console.log("DATA:", data);
    message.textContent = `Welcome, ${data.fname} ${data.lname}!`;
}).catch(error => {
    console.error('Error fetching dashboard data:', error);
});

