const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const cursor = document.getElementById("cursor");


let width;
let height;


const image = new Image();
image.src = "images/wallcoverpage.jpg";


let fragments = [];
let dust = [];
let textParticles = [];
let portals = [];


let mouse = {

    x:-1000,
    y:-1000

};



const isMobile =
window.innerWidth < 768;



const COLS =
isMobile ? 35 : 65;


const ROWS =
isMobile ? 23 : 43;



const FORCE_RADIUS =
isMobile ? 170 : 180;



const DUST_COUNT =
isMobile ? 80 : 250;








function resize(){

width =
canvas.width =
window.innerWidth;


height =
canvas.height =
window.innerHeight;


}


window.addEventListener(
"resize",
resize
);


resize();









function placement(){


const scale =
Math.max(
width/image.width,
height/image.height
);



return {

scale,

x:
(width-image.width*scale)/2,

y:
(height-image.height*scale)/2

};


}









image.onload = ()=>{


createFragments();

createDust();

createTextParticles();

createPortals();


animate();


};









// =========================
// FRAGMENTS
// =========================


function createFragments(){


const p =
placement();



const fw =
image.width/COLS;


const fh =
image.height/ROWS;



const screenFW =
fw*p.scale;


const screenFH =
fh*p.scale;





for(let y=0;y<ROWS;y++){


for(let x=0;x<COLS;x++){



let personality =
Math.random();



let fragment = {


sx:x*fw,

sy:y*fh,


sw:fw,

sh:fh,



x:
p.x+x*screenFW,


y:
p.y+y*screenFH,



homeX:
p.x+x*screenFW,


homeY:
p.y+y*screenFH,



w:screenFW,

h:screenFH,



vx:0,

vy:0,



rotation:0,


rotationVelocity:0,



rotationDirection:
Math.random()<0.5 ? -1 : 1,



mass:1,

spring:0.018,


rotationResistance:0.90,


visualScale:1,


opacity:1


};





if(personality < 0.15){


fragment.mass=2.5;

fragment.spring=0.012;

fragment.rotationResistance=0.96;

fragment.visualScale=1.04;

fragment.opacity=1;


}


else if(personality < 0.75){


fragment.mass=1.2;

fragment.spring=0.018;

fragment.rotationResistance=0.90;

fragment.visualScale=1;

fragment.opacity=0.95;


}


else{


fragment.mass=0.5;

fragment.spring=0.026;

fragment.rotationResistance=0.82;

fragment.visualScale=0.98;

fragment.opacity=0.65;


}




fragments.push(fragment);



}

}


}









function drawBackground(){


const p =
placement();



ctx.globalAlpha=0.18;



ctx.drawImage(

image,

p.x,

p.y,

image.width*p.scale,

image.height*p.scale

);



ctx.globalAlpha=1;


}









function drawFragments(){


fragments.forEach(f=>{


let dx =
f.x-mouse.x;


let dy =
f.y-mouse.y;



let distance =
Math.sqrt(
dx*dx+
dy*dy
);




if(
distance<FORCE_RADIUS &&
distance>0
){


let influence =
1-(distance/FORCE_RADIUS);



influence*=influence;



let force =
(influence*2.8)
/
f.mass;



f.vx +=
(dx/distance)
*
force;



f.vy +=
(dy/distance)
*
force;



f.rotationVelocity +=

(
influence*
0.025/
f.mass
)
*
f.rotationDirection;


}






f.vx +=
(f.homeX-f.x)
*
f.spring;


f.vy +=
(f.homeY-f.y)
*
f.spring;




f.vx*=0.90;

f.vy*=0.90;



f.x+=f.vx;

f.y+=f.vy;



checkPortalReveal(f);



f.rotation +=
f.rotationVelocity;



f.rotationVelocity *=
f.rotationResistance;



f.rotation*=0.92;







ctx.save();



ctx.globalAlpha =
f.opacity;



ctx.translate(

f.x+f.w/2,

f.y+f.h/2

);



ctx.rotate(
f.rotation
);



ctx.drawImage(

image,

f.sx,

f.sy,

f.sw,

f.sh,


-f.w/2,

-f.h/2,


f.w*f.visualScale,

f.h*f.visualScale

);



ctx.restore();



ctx.globalAlpha=1;



});


}









// =========================
// PORTALS
// =========================


function createPortals(){


portals = [


{

element:
document.getElementById("workPortal"),

x:
isMobile ? width*0.68 : width*0.70,

y:
isMobile ? height*0.32 : height*0.35,

radius:
isMobile ? 160 : 120,

strength:0,

revealedTimer:0

},



{

element:
document.getElementById("archivePortal"),

x:
isMobile ? width*0.68 : width*0.65,

y:
isMobile ? height*0.68 : height*0.70,

radius:
isMobile ? 160 : 120,

strength:0,

revealedTimer:0
    
},



{

element:
document.getElementById("aboutPortal"),

x:
isMobile ? width*0.32 : width*0.30,

y:
isMobile ? height*0.75 : height*0.75,

radius:
isMobile ? 160 : 120,

strength:0,

revealedTimer:0
    
},



{

element:
document.getElementById("contactPortal"),

x:
isMobile ? width*0.50 : width*0.55,

y:
isMobile ? height*0.22 : height*0.22,

radius:
isMobile ? 160 : 120,

strength:0,

revealedTimer:0
    
}


];



portals.forEach(p=>{


p.element.style.left =
p.x+"px";


p.element.style.top =
p.y+"px";


});


}








function checkPortalReveal(f){


let movement =
Math.sqrt(

Math.pow(
f.x-f.homeX,
2
)

+

Math.pow(
f.y-f.homeY,
2
)

);



if(movement < 8){

return;

}





portals.forEach(p=>{


let fragmentDistance =
Math.sqrt(

Math.pow(
f.homeX-p.x,
2
)

+

Math.pow(
f.homeY-p.y,
2
)

);



let cursorDistance =
Math.sqrt(

Math.pow(
mouse.x-p.x,
2
)

+

Math.pow(
mouse.y-p.y,
2
)

);





if(

fragmentDistance < p.radius &&

cursorDistance < FORCE_RADIUS

){


p.strength +=
movement *
(isMobile ? 0.004 : 0.0025);



if(p.strength > 0.30){


p.revealedTimer =
isMobile ? 240 : 120;


}


}


});







portals.forEach(p=>{


if(p.revealedTimer > 0){


p.revealedTimer--;


p.element.classList.add(
"revealed"
);


}

else{


p.strength *=
isMobile ? 0.995 : 0.985;



if(p.strength > 0.30){


p.element.classList.add(
"revealed"
);


}
else{


p.element.classList.remove(
"revealed"
);


}


}



});


}







// =========================
// DUST
// =========================


function createDust(){


for(let i=0;i<DUST_COUNT;i++){


dust.push({

x:
Math.random()*width,

y:
Math.random()*height,

size:
Math.random()*1.5,

speed:
Math.random()*0.12

});


}


}





function drawDust(){


dust.forEach(d=>{


d.y-=d.speed;



if(d.y<0){

d.y=height;

}



ctx.fillStyle=
"rgba(230,230,230,0.1)";



ctx.fillRect(

d.x,

d.y,

d.size,

d.size

);


});


}









// =========================
// TEXT
// =========================


function createTextParticles(){


const text =
document.getElementById("archiveText");


if(!text) return;



const nodes =
Array.from(text.childNodes);



text.innerHTML="";



nodes.forEach(node=>{


if(node.nodeType===3){


[...node.textContent]
.forEach(letter=>{


let span =
document.createElement("span");


span.className="char";

span.textContent=letter;


text.appendChild(span);



let rect =
span.getBoundingClientRect();



textParticles.push({

element:span,

x:rect.left,

y:rect.top,

homeX:rect.left,

homeY:rect.top,

vx:0,

vy:0,

mass:
0.5+Math.random()*1.5,

spring:0.06


});


});


}


else if(node.nodeName==="BR"){


text.appendChild(
document.createElement("br")
);


}


});


}









function drawTextPhysics(){


textParticles.forEach(t=>{


let dx=t.x-mouse.x;

let dy=t.y-mouse.y;


let distance =
Math.sqrt(
dx*dx+dy*dy
);



if(
distance<140 &&
distance>0
){


let force =
(140-distance)/140;



t.vx +=
(dx/distance)
*
force
*
2.5/
t.mass;



t.vy +=
(dy/distance)
*
force
*
2.5/
t.mass;


}




t.vx +=
(t.homeX-t.x)
*
t.spring;


t.vy +=
(t.homeY-t.y)
*
t.spring;



t.vx*=0.78;

t.vy*=0.78;



t.x+=t.vx;

t.y+=t.vy;



t.element.style.transform=

`
translate(
${t.x-t.homeX}px,
${t.y-t.homeY}px
)

`;



});


}









function animate(){


ctx.clearRect(
0,
0,
width,
height
);



drawBackground();

drawFragments();

drawDust();

drawTextPhysics();



requestAnimationFrame(
animate
);


}









// =========================
// INPUT
// =========================


window.addEventListener(
"mousemove",
e=>{


mouse.x=e.clientX;

mouse.y=e.clientY;



if(cursor){

cursor.style.left =
mouse.x+"px";


cursor.style.top =
mouse.y+"px";

}


});





window.addEventListener(
"touchmove",
e=>{


let touch =
e.touches[0];


mouse.x =
touch.clientX;


mouse.y =
touch.clientY;


},
{
passive:true
}
);

window.addEventListener(
"touchend",
()=>{

mouse.x = -10000;
mouse.y = -10000;

}
);
