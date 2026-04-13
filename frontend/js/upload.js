
const uploadForm = document.getElementById("uploadForm");

uploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fileInput = document.getElementById("fileInput");
    const file = fileInput.files[0];
    const token = localStorage.getItem("token");
    console.log("Uploading file:", file);
    let formToSend = new FormData();
    formToSend.append("file", file);
    formToSend.append("group_id", "2");
    //formToSend.append("folder_id", "");
    formToSend.append("document_id", "4");
    console.log("FormData prepared:", formToSend);
    fetch("/api/upload", {
        method: "POST",
        headers: { 
            authorization: `Bearer ${token}`
        },
        //test values for group_id, folder_id, and document_id are included in the body for now, but will need to be dynamically set based on user input in the future

        
        body: formToSend
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to upload file');
        } else {
            console.log("File uploaded successfully");
        }
        return response.json();
    })


});
const backButton = document.getElementById("backButton");

backButton.addEventListener("click", () => {
    window.location.href = '/dashboard';
});
 

