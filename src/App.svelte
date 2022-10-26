<script>
import { images } from './components/imageData';
import Gallery from './components/Gallery.svelte';


console.log(images)
for (let i = 0; i < images.length; i++) {
	console.log(images[i].contexto);
}

const categories = ["todas"]
let selected = "todas"

</script>

<main>
	<div class="main">

		<h1>Catálogo de Imagenes de Cargueros</h1>

	<Gallery>
		{#each images as {título, autor, fecha, técnica, fuente, src, keyword, contexto, procedencia, descripción}}
		{#if selected === "todas"}
		<div class="column {keyword} show">
			<div class="content">
			  <img src= {src} alt={título} style="width:100%">
			  <h3>{título}</h3>
			  <h3>{autor}</h3>
			  <p>
				{fecha}, 
				{técnica}.
				<br>
				Fuente: {fuente}
			  </p>
			</div>
		</div>
		{:else}
		<div class="column" {keyword} class:show={selected === keyword}>
			<div class="content">
			  <img src= {src} alt={título} style="width:100%">
			  <h3>{título}</h3>
			  <h3>{autor}</h3>
			  <p>
				{fecha}, 
				{técnica}.
				<br>
				Fuente: {fuente}
			  </p>
			</div>
		</div>
		{/if}
		{/each}
	</Gallery>	
</div>
	
</main>

<style>
* {
  background-color:white;
  color:#3fab9b ; 
  font-size: 30px;
}

/* Center website */
.main {
  max-width: 100vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

h1 {
  font-size: 60px;
  font-weight: 300;
  color: #d8b384;
  margin: 0 0 10px;
  padding-bottom: 100px;
  padding-top: 100px;
}
/* h2 {
	font-size: 40px;
	font-weight: 150;
} */

h3 {
 font-size: 30px;	
 margin: 0;
 font-weight: 400;
}

p {
 margin: 0 0 .5rem;
 position: relative;
}

/* Create three equal columns that floats next to each other */
.column {
  width: 33.33%;
  display: none; /* Hide all elements by default */
  justify-content: center;
  margin: 10px 0;

}

/* Clear floats after rows */ 


/* Content */
.content {
  background-color: white;
  margin: 5px;
  padding: 10px;
  width: 30vw;
  box-shadow: 1px 1px 5px blaCK;
  font-weight: 200;
}

img {
	min-height: 200px;
}

/* The "show" class is added to the filtered elements */
.show {
  display: flex;
}

/* Style the buttons */
.btn {
  width: 200px;
  font-weight: 200;
  letter-spacing: 1px;
  border: none;
  outline: none;
  margin: 5px;
  padding: 14px 16px 12px;
  background-color: #FF4E62;
  cursor: pointer;
  transition: .1s ease-in-out;
  color: #E0F4F5;
}

.btn:hover {
  background-color: #F8DF77;
  color:#3fab9b ;
}

.btn.active {
  background-color:  #F8DF77;
  color:#563256;
}

</style>