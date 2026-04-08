

loginButton = document.getElementById("loginButton");
registerButton = document.getElementById("registerButton");
statusMessage = document.getElementById("message");

loginButton.addEventListener("click", async (event) => {
    event.preventDefault();
    let username = document.getElementById("username").value;
    let password = document.getElementById("password").value;
    console.log(username, password, "logging in");

   

    let response = await fetch("/api/login", {

        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username,
            password: password
        }
    ),
    });
    let parsedresponse = await response.json();   
    console.log(parsedresponse);
    localStorage.setItem("token", parsedresponse.token);
    statusMessage.textContent = parsedresponse.message;
    window.location.href = '/dashboard';
});
registerButton.addEventListener("click", (event) => {
    event.preventDefault();
    console.log("navigating to register page");
    window.location.href = '/register';
});



