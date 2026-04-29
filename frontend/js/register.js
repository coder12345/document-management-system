

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
    
    let confirmPassword = form.elements["confirmPassword"].value;

    if (password !== confirmPassword) {
        statusMessage.style.color = "red"
        statusMessage.textContent = "Passwords do not match";
        return;
    }
    if (canSubmit !== true) {
        statusMessage.style.color = "red"
        statusMessage.textContent = "Password is not strong enough";
        return;

    }
    console.log(username, password, "registering");

    let body = JSON.stringify({
            username: username,
            password: password,
            fname: fname,
            lname: lname,
            
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

const bannedPasswords = [
    "password",
    "password123",
    "123456",
    "12345678",
    "123456789",
    "1234567890",
    "12345",
    "qwerty",
    "qwerty123",
    "abc123",
    "111111",
    "000000",
    "123123",
    "iloveyou",
    "letmein",
    "welcome",
    "monkey",
    "dragon",
    "football",
    "baseball",
    "sunshine",
    "master",
    "shadow",
    "ashley",
    "bailey",
    "passw0rd",
    "admin",
    "admin123",
    "login",
    "user",
    "test",
    "guest",
    "root",
    "default",
    "123qwe",
    "qwe123",
    "1q2w3e4r",
    "zaq12wsx",
    "trustno1",
    "hello",
    "freedom",
    "whatever",
    "qazwsx",
    "654321"
];
let canSubmit = false;
function validatePassword1() {
    let password1 = form.elements["password"].value
    
    
    if (password1.length < 5) {
        statusMessage.textContent = "Weak Password - Less than 5 characters";
        canSubmit = false;
        statusMessage.style.color = "red"
        return;
    } else if (password1.length < 8) {
        statusMessage.textContent = "Weak Password - Less than 10 characters";
        canSubmit = false;
        statusMessage.style.color = "yellow";
        return;
    }  else if (password1.length > 10) {
        statusMessage.textContent = "Strong Password";
        statusMessage.style.color = "green";
        
        if (bannedPasswords.includes(password1)) {
            statusMessage.textContent = "Password is too common";
            statusMessage.style.color = "red";
            canSubmit = false;
            return;
        }
        
        canSubmit = true;
    
    }

}

