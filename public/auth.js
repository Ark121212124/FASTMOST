// ======================
// FASTMOST AUTH SYSTEM
// ======================

async function register(){

 const name =
 document.getElementById("name").value;

 const email =
 document.getElementById("email").value;

 const password =
 document.getElementById("password").value;

 if(!name || !email || !password){

  alert("Заполни все поля");
  return;

 }

 const res =
 await fetch("/api/register",{

  method:"POST",

  headers:{
   "Content-Type":"application/json"
  },

  body:JSON.stringify({
   name,email,password
  })

 });

 const text =
 await res.text();

 if(res.ok){

  alert("Код отправлен на email");

 }else{

  alert(text);

 }

}



async function verify(){

 const email =
 document.getElementById("email").value;

 const code =
 document.getElementById("code").value;

 if(!code){

  alert("Введи код");
  return;

 }

 const res =
 await fetch("/api/verify",{

  method:"POST",

  headers:{
   "Content-Type":"application/json"
  },

  body:JSON.stringify({
   email,code
  })

 });

 if(res.ok){

  alert("Email подтвержден");

 }else{

  alert("Ошибка подтверждения");

 }

}



async function login(){

 const email =
 document.getElementById("email").value;

 const password =
 document.getElementById("password").value;

 const res =
 await fetch("/api/login",{

  method:"POST",

  headers:{
   "Content-Type":"application/json"
  },

  body:JSON.stringify({
   email,password
  })

 });

 if(!res.ok){

  alert("Ошибка входа");
  return;

 }

 const data =
 await res.json();

 localStorage.setItem(
  "token",
  data.token
 );

 localStorage.setItem(
  "username",
  data.name
 );

 localStorage.setItem(
  "avatar",
  data.avatar
 );

 location.href="/";

}
