let message = document.getElementById("welcome-message");
let UI = document.getElementById("container");
let UIButtons = document.getElementById("UIContainer");

let navstack = [];
let currentGroupId = null;
let inRoot = null;
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

        drawFolders(ui, groups[i].root_folder_id);      
            
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
            ui.appendChild(createCard(data.documents[i].id, data.documents[i].title, () => { documentClicked(data.documents[i].id); }));
        }
    if (isRoot) {
        

        
        UIButtons.appendChild(createUICard("Invite Members", "Invite Members", () => { inviteMembers() }));
    }
        UIButtons.appendChild(createUICard("createFolder", "Create Folder", () => {
            createFolder(folder_id, "current folder");
        
        }));
        UIButtons.appendChild(createUICard("upload", "Upload Document", () => { drawUpload() }));
        UIButtons.appendChild(createUICard("back", "Back", () => { back(); }));
        
        
    });

}

function documentClicked(document_id) {
    console.log("Document clicked with id:", document_id);
    window.location.href = "/api/getdocument?document_id=" + document_id + "&userid=" + token.id;
}

function drawUpload() {
    clear();
    let title = document.createElement("h2");
    title.textContent = "Upload Document";
    UI.appendChild(title);
    let form = document.createElement("form");
    form.id = "uploadForm";
    let fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.id = "fileInput";
    form.appendChild(fileInput);
    let submitButton = document.createElement("button");
    submitButton.textContent = "Upload";
    form.appendChild(submitButton);
    UI.appendChild(form);
    UIButtons.appendChild(createUICard("back", "Back", () => { back(); }));

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const currentFolder = navstack[navstack.length - 1].id;
        const file = fileInput.files[0];
        const token = localStorage.getItem("token");
        console.log("Uploading file:", file, "to folder id:", currentFolder);
        let formToSend = new FormData();
        formToSend.append("file", file);
        formToSend.append("group_id", currentGroupId);
        formToSend.append("folder_id", currentFolder);
        
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

