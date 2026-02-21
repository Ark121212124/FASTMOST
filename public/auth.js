window.register = async function(){

 const name =
 document.getElementById("name").value;

 const email =
 document.getElementById("email").value;

 const password =
 document.getElementById("password").value;

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

 alert(await res.text());

};


window.verify = async function(){

 const email =
 document.getElementById("email").value;

 const code =
 document.getElementById("code").value;

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

 alert(await res.text());

};


window.login = async function(){

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

  alert(await res.text());
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

 location.href="/";

};
