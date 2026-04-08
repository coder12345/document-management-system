let message = document.getElementById("welcome-message");
let usertype = document.getElementById("usertype");

const token = localStorage.getItem("token");
console.log("TOKEN:", token);
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
    usertype.textContent = `User Type: ${data.usertype}`;
}).catch(error => {
    console.error('Error fetching dashboard data:', error);
});