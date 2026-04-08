

registerButton = document.getElementById("registerButton");
form = document.getElementById("registerForm");
loginButton = document.getElementById("loginButton");
statusMessage = document.getElementById("message");

loginButton.addEventListener("click", (event) => {
    event.preventDefault();
    window.location.href = '/login';
});
registerButton.addEventListener("click", async (event) => {
    event.preventDefault();
    let username = form.elements["username"].value;

    let password = form.elements["password"].value;
    let fname = form.elements["fname"].value;
    let lname = form.elements["lname"].value;
    let usertype = form.elements["usertype"].value;
    let confirmPassword = form.elements["confirmPassword"].value;

    if (password !== confirmPassword) {
        statusMessage.textContent = "Passwords do not match";
        return;
    }
    console.log(username, password, "registering");

    let body = JSON.stringify({
            username: username,
            password: password,
            fname: fname,
            lname: lname,
            usertype: usertype
        });
    console.log(body);
    let response = await fetch("/api/register", {

        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: body

    });
    let parsedresponse = await response.json();   
    console.log(parsedresponse);
    statusMessage.textContent = parsedresponse.message;
});