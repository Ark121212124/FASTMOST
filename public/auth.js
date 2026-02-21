// REGISTER
async function register() {

  const name =
    document.getElementById("name").value;

  const email =
    document.getElementById("email").value;

  const password =
    document.getElementById("password").value;

  const res = await fetch("/api/register", {

    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      name,
      email,
      password
    })

  });

  const data = await res.json();

  if (data.error) {
    alert(data.error);
    return;
  }

  alert("Ваш код подтверждения: " + data.code);

}


// VERIFY
async function verify() {

  const email =
    document.getElementById("email").value;

  const code =
    document.getElementById("code").value;

  const res =
    await fetch("/api/verify", {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        email,
        code
      })

    });

  const data =
    await res.json();

  if (data.error) {
    alert(data.error);
    return;
  }

  localStorage.setItem("token", data.token);
  localStorage.setItem("username", data.name);

  location.href = "/index.html";

}


// LOGIN
async function login() {

  const email =
    document.getElementById("email").value;

  const password =
    document.getElementById("password").value;

  const res =
    await fetch("/api/login", {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        email,
        password
      })

    });

  const data =
    await res.json();

  if (data.error) {
    alert(data.error);
    return;
  }

  localStorage.setItem("token", data.token);
  localStorage.setItem("username", data.name);

  location.href = "/index.html";

}
