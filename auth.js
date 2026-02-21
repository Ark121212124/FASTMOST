async function register() {

 await fetch("/api/register", {

  method: "POST",

  body: JSON.stringify({

   name: name.value,
   email: email.value,
   password: password.value

  })

 });

 alert("Код отправлен на email");

}

async function verify() {

 await fetch("/api/verify", {

  method: "POST",

  body: JSON.stringify({

   email: email.value,
   code: code.value

  })

 });

 alert("Email подтвержден");

}

async function login() {

 const res = await fetch("/api/login", {

  method: "POST",

  body: JSON.stringify({

   email: email.value,
   password: password.value

  })

 });

 const data = await res.json();

 localStorage.setItem("token", data.token);
 localStorage.setItem("username", data.name);

 location.href = "/";

}
