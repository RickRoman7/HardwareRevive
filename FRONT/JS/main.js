function scrollToSection(id){
  const el = document.getElementById(id);
  if(el) el.scrollIntoView({behavior:'smooth'});
}
document.addEventListener('DOMContentLoaded', ()=> {
  console.log('Página principal lista.');
});
