// carrusel.js
let slideActual = 0;
const slides = document.querySelectorAll('.carousel-slide');
const dots = document.querySelectorAll('.dot');

function mostrarSlide(index) {
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    slideActual = (index + slides.length) % slides.length;
    slides[slideActual].classList.add('active');
    dots[slideActual].classList.add('active');
}

function moverCarrusel(direccion) {
    mostrarSlide(slideActual + direccion);
    reiniciarIntervalo();
}

function irASlide(index) {
    mostrarSlide(index);
    reiniciarIntervalo();
}

let intervalo = setInterval(() => mostrarSlide(slideActual + 1), 4000);

function reiniciarIntervalo() {
    clearInterval(intervalo);
    intervalo = setInterval(() => mostrarSlide(slideActual + 1), 4000);
}