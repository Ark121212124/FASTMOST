const u = document.getElementById("u");
const p = document.getElementById("p");

async function send(type) {
  if (!u.value || !p.value) {
    alert("Введите логин и пароль");
    return;
  }

  const r = await fetch("/" + type, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: u.value,
      password: p.value
    })
  });

  if (!r.ok) {
    alert("Ошибка авторизации");
    return;
  }

  const d = await r.json();
  localStorage.setItem("token", d.token);
  localStorage.setItem("username", d.username);
  localStorage.setItem("avatar", d.avatar);

  location.href = "/";
}

function login() {
  send("login");
}

function register() {
  send("register");
}
