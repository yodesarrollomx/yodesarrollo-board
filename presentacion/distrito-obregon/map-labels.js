// Textos y anclas de rótulos del mapa de "El lugar" (SB07, #347). Datos puros: sin DOM ni red.
// Consumidor: territory.js. Fuente de cada cadena en comentario:
//   [S·n]   story.js, escena ubicacion, momento n (label / spoken / caution = [S·cau]).
//   [OSM id] nombre/ref en basemap.js (© OpenStreetMap contributors · ODbL).
//   [P]     parcel.js: neighbors.* se resuelve en ejecución; marcador {neighbors.west} / {neighbors.east}.
//   [C]     assets/concepto-fuente.webp · material complementario, sujeto a visto bueno de Dirección: encendido, optional:false.
// Convenciones:
//   beats: 0..3 = M1..M4 (momentos de la escena). Un rótulo se dibuja en los beats listados.
//   near:[X,Y]  metros locales del basemap (X este, Y abajo; origen UTM 12N 606550/3039500), punto REAL de la vía
//               (id o name) más cercano al objetivo; se ancla ahí y se rota según el segmento local, ángulo en [-90,90].
//   size: px del viewBox de desktop; sizeMobile (si existe) para el viewBox móvil.
//   offset:{px,toward}: desplazamiento perpendicular en px hacia el punto cardinal 'toward' (territory.js elige el signo).
//   fitOnly: se dibuja solo si cabe en la caja menos 8 px (regla de territory.js); `onlyIfHidden` en edges.* depende de ese key.
//   optional:false = encendido. Los de dirección (kind:'direction') son [C].
//   panel.*: columna de datos. dy = línea de base en px desde panel.origin.y; x = origin.x + (dx||0).
//     wrap:[...] líneas ya partidas (unidas con ' ' = text) para el ancho origin.w; wrap:'auto' = texto con marcador,
//     territory.js parte por palabras al ancho (se reservan 2 líneas); pitch de líneas = size*1.22.
//     needs:'neighbors.x' = omitir la línea si ese vecino viene vacío. altA = texto del caso A (KMZ) para status 'kmz'.
//     track = interletra en em; weight por defecto 400. color = relleno. Tamaño mínimo 12 (etiquetas en mayúsculas), 13 resto.
export const mapLabels={
  streets:[
    // [S·1 spoken "Federal 15"; OSM 288664426 trunk, ref MEX 15D] ancla en el tramo recto (-78,-288)->(101,-130), a ~200 m al N del punto documental; se evita el tramo NW más lejano porque chocaba con "← Hermosillo" en móvil
    {id:'288664426',name:'Carretera Los Mochis - Cd. Obregón (Cuota)',text:'Carretera Federal 15',near:[11.7,-208.7],beats:[0],size:14,sizeMobile:13},
    // [OSM 171476761 primary, name "Calle 300", ref SON 134]
    {id:'171476761',name:'Calle 300',text:'Calle 300',near:[100,1140.9],beats:[0],size:14,sizeMobile:13,key:'calle300-m1'},
    // [OSM 754959254 secondary]
    {id:'754959254',name:'Calzada Francisco Villanueva',text:'Calzada Francisco Villanueva',near:[500,-845.1],beats:[0],size:14,sizeMobile:13},
    // [OSM 210851855 tertiary]
    {id:'210851855',name:'Calle Paseo Miravalle',text:'Calle Paseo Miravalle',near:[-279.1,400],beats:[0],size:14,sizeMobile:13},
    // [OSM 210279237 tertiary; hay otra carril paralelo 210279238, mismo nombre]
    {id:'210279237',name:'Boulevard Circunvalación',text:'Boulevard Circunvalación',near:[1202.2,458.7],beats:[0],size:14,sizeMobile:13},
    // [C] assets/concepto-fuente.webp · material complementario, sujeto a visto bueno de Dirección; encendida, optional:false; extremo NW de la trunk 288664426 (arranca en (-767,-752))
    {id:'288664426',name:'Carretera Los Mochis - Cd. Obregón (Cuota)',text:'← Hermosillo',near:[-698.1,-708],beats:[0],size:13,sizeMobile:13,kind:'direction',optional:false},
    // [C] assets/concepto-fuente.webp · material complementario, sujeto a visto bueno de Dirección; encendida, optional:false; extremo SE de la trunk dentro de la caja M1 (la vía sigue hasta (2084,1599), fuera de ventana)
    {id:'288664426',name:'Carretera Los Mochis - Cd. Obregón (Cuota)',text:'Navojoa →',near:[1398.1,1002.9],beats:[0],size:13,sizeMobile:13,kind:'direction',optional:false},
    // [OSM 288664426 ref MEX 15D (autopista de cuota); S·1] junto al lado diagonal del contorno
    {id:'288664426',name:'Carretera Los Mochis - Cd. Obregón (Cuota)',text:'Carretera Federal 15 · cuota',near:[391.2,119.8],beats:[1,2],size:14,sizeMobile:13,offset:{px:9,toward:'NE'}},
    // [OSM 227359800 residential] colindancia poniente
    {id:'227359800',name:'Calle Valle Colorado',text:'Calle Valle Colorado',near:[-22.1,450],beats:[1,2],size:14,sizeMobile:13,offset:{px:10,toward:'W'}},
    // [OSM 210851855 tertiary]
    {id:'210851855',name:'Calle Paseo Miravalle',text:'Calle Paseo Miravalle',near:[-277.2,600],beats:[1,2],size:14,sizeMobile:13},
    // [OSM 171476761] solo si cabe en la caja (a ~1,140 m al sur queda fuera salvo que el contorno suba)
    {id:'171476761',name:'Calle 300',text:'Calle 300',near:[100,1140.9],beats:[1,2],size:14,sizeMobile:13,key:'calle300',fitOnly:true},
  ],
  // Flecha de borde cuando "Calle 300" no cabe en la caja de M2/M3 (paso 2): "Calle 300 ↓" en el borde sur.
  edges:[
    // [OSM 171476761 "Calle 300"] + flecha de borde
    {side:'south',text:'Calle 300 ↓',size:14,sizeMobile:13,beats:[1,2],onlyIfHidden:'calle300'},
  ],
  // Colindancias (paso 2): fuera del contorno; posición la da parcel.sides. Solo en el paso 2 (auditoría SB07: las chinchetas del paso 3 no las tapan).
  // inset:{px,toward:'interior'} (auditoría SB07): desplaza el rótulo px hacia el interior del contorno; lo debe leer territory.js (hoy ignora offset/inset en sides).
  sides:[
    // [Diseño del paso 2] mayúsculas; FRENTE queda entre contorno y autopista, se mete 21 px hacia el interior
    {side:'front',text:'FRENTE',size:12,color:'#866143',beats:[1],inset:{px:21,toward:'interior'}},
    {side:'west',text:'PONIENTE',size:12,color:'#866143',beats:[1]},
    {side:'south',text:'SUR',size:12,color:'#866143',beats:[1]},
    // ORIENTE: solo si parcel.js registra una calle con nombre fuera del contorno a ≤80 m (parcel.neighbors.east no vacío)
    {side:'east',text:'ORIENTE',size:12,color:'#866143',beats:[1],needs:'neighbors.east'},
  ],
  // Chinchetas numeradas de M3 (círculo r=13, borde #ad4c46, número de 14). at: punto medio del lado / centroide.
  pins:[
    // [Diseño del paso 3] ① en frente (punto medio del lado)
    {n:1,at:'front',beats:[2],r:13,size:14,color:'#ad4c46'},
    // [Diseño del paso 3] ② en poniente (punto medio del lado)
    {n:2,at:'west',beats:[2],r:13,size:14,color:'#ad4c46'},
    // [Diseño del paso 3] ③ en centroide
    {n:3,at:'centroid',beats:[2],r:13,size:14,color:'#ad4c46'},
    // [Diseño del paso 3] ④ en sur (punto medio del lado)
    {n:4,at:'south',beats:[2],r:13,size:14,color:'#ad4c46'},
  ],
  // Prohibido (paso 3): flechas de acceso, puntos de conexión o "acceso desde la autopista".
  panel:{
    origin:{desktop:{x:752,y:130,w:328,h:530},mobile:{x:16,y:515,w:448,h:190}},
    desktop:[
      [0,[
        // [S·1 label] mayúsculas
        {text:'CIUDAD OBREGÓN, SONORA',size:13,color:'#6b7972',dy:198,track:0.12},
        // [S·1 spoken: "sobre la carretera Federal 15"]
        {text:'Sobre la Carretera Federal 15',size:26,color:'#293e34',dy:235,weight:700,wrap:['Sobre la Carretera','Federal 15']},
        // [S·cau] coordenadas documentales
        {text:'27°28′30.0″N · 109°55′17.4″W',size:14,color:'#293e34',dy:302},
        // [S·cau: "Ubicación documental"]
        {text:'Ubicación documental',size:13,color:'#6b7972',dy:320},
      ]],
      [1,[
        // [S·2 spoken: "247,584 metros cuadrados"]
        {text:'247,584 m²',size:38,color:'#293e34',dy:128,weight:700},
        // [S·2 label]
        {text:'24.7584 hectáreas de referencia',size:17,color:'#293e34',dy:158},
        // [Diseño del paso 2] mayúsculas
        {text:'COLINDANCIAS · OPENSTREETMAP',size:12,color:'#6b7972',dy:196,track:0.1},
        // [OSM 288664426 / P.neighbors.front] MEX 15D, cuota
        {text:'Frente · Carretera Federal 15 (cuota)',size:17,color:'#293e34',dy:222},
        // [P.neighbors.west; según parcel.js; esperado "Calle Valle Colorado" OSM 227359800]
        {text:'Poniente · colonia, {neighbors.west}',size:17,color:'#293e34',dy:249,wrap:'auto',needs:'neighbors.west'},
        // [S·2 spoken: "El terreno adicional al sur queda fuera de esta base."]
        {text:'Sur · terreno adicional fuera de esta base',size:17,color:'#293e34',dy:297,wrap:['Sur · terreno adicional','fuera de esta base']},
        // [P.neighbors.east] solo si parcel.js registra calle con nombre a ≤80 m
        {text:'Oriente · {neighbors.east}',size:17,color:'#293e34',dy:345,wrap:'auto',needs:'neighbors.east'},
        // [Auditoría SB07 · caso conceptual: posición aproximada]; caso A (KMZ): "Contorno del KMZ del propietario · referencia, no deslinde"
        {text:'Forma conceptual a escala de la superficie · posición aproximada · no es levantamiento',size:13,color:'#ad4c46',dy:397,wrap:['Forma conceptual a escala de la superficie','· posición aproximada · no es levantamiento'],altA:'Contorno del KMZ del propietario · referencia, no deslinde'},
      ]],
      [2,[
        // [Diseño del paso 3] mayúsculas
        {text:'POR ESTUDIAR',size:13,color:'#ad4c46',dy:158,track:0.12},
        // [S·3 spoken: "Accesos de carga"]
        {text:'① Accesos de carga',size:20,color:'#293e34',dy:193},
        // [S·3 spoken: "servicios"]
        {text:'② Servicios',size:20,color:'#293e34',dy:226},
        // [S·3 spoken: "usos de suelo"]
        {text:'③ Uso de suelo',size:20,color:'#293e34',dy:259},
        // [S·3 spoken: "superficie útil"]
        {text:'④ Superficie útil',size:20,color:'#293e34',dy:292},
        // [S·3 spoken: "determinarán el plan maestro"]
        {text:'Determinarán el plan maestro.',size:16,color:'#293e34',dy:333},
        // [S·3 spoken]
        {text:'La ubicación por sí sola no define qué cabe.',size:14,color:'#6b7972',dy:360},
      ]],
      [3,[
        // [S·4 label]
        {text:'Una propiedad.',size:30,color:'#293e34',dy:192,weight:700},
        // [S·4 label]
        {text:'Dos estrategias de negocio:',size:19,color:'#293e34',dy:229},
        // [S·4 spoken: "conservar las naves industriales como patrimonio"]
        {text:'Conservar las naves industriales como patrimonio',size:17,color:'#297e94',dy:266,wrap:['Conservar las naves','industriales como patrimonio']},
        // [S·4 spoken: "asociarnos para desarrollar los productos complementarios"; paso 4]
        {text:'Asociarnos para desarrollar los complementarios',size:17,color:'#806397',dy:320,wrap:['Asociarnos para desarrollar','los complementarios']},
      ]],
    ],
    mobile:[
      [0,[
        // [S·1 label]
        {text:'CIUDAD OBREGÓN, SONORA',size:13,color:'#6b7972',dy:12,track:0.12},
        // [S·1 spoken]
        {text:'Sobre la Carretera Federal 15',size:22,color:'#293e34',dy:43,weight:700},
        // [S·cau]
        {text:'27°28′30.0″N · 109°55′17.4″W',size:14,color:'#293e34',dy:73},
      ]],
      [1,[
        // [S·2 spoken]
        {text:'247,584 m²',size:30,color:'#293e34',dy:29,weight:700},
        // [Diseño móvil: "24.7584 ha"; abrevia S·2 label]
        {text:'24.7584 ha',size:15,color:'#293e34',dy:54},
        // [OSM 288664426 / P.neighbors.front]
        {text:'Frente · Carretera Federal 15 (cuota)',size:15,color:'#293e34',dy:83},
        // [S·2 spoken]
        {text:'Sur · terreno adicional fuera de esta base',size:15,color:'#293e34',dy:105},
        // [Auditoría SB07 · caso conceptual: posición aproximada]; caso A: "Contorno del KMZ del propietario · referencia, no deslinde"
        {text:'Forma conceptual a escala de la superficie · posición aproximada · no es levantamiento',size:13,color:'#ad4c46',dy:130,wrap:['Forma conceptual a escala de la superficie','· posición aproximada · no es levantamiento'],altA:'Contorno del KMZ del propietario · referencia, no deslinde'},
      ]],
      [2,[
        // [S·3 spoken]
        {text:'① Accesos de carga',size:18,color:'#293e34',dy:28,dx:0},
        // [S·3 spoken]
        {text:'② Servicios',size:18,color:'#293e34',dy:28,dx:232},
        // [S·3 spoken]
        {text:'③ Uso de suelo',size:18,color:'#293e34',dy:72,dx:0},
        // [S·3 spoken]
        {text:'④ Superficie útil',size:18,color:'#293e34',dy:72,dx:232},
      ]],
      [3,[
        // [S·4 label]
        {text:'Una propiedad.',size:26,color:'#293e34',dy:25,weight:700},
        // [S·4 spoken]
        {text:'Conservar las naves industriales como patrimonio',size:15,color:'#297e94',dy:59},
        // [S·4 spoken]
        {text:'Asociarnos para desarrollar los complementarios',size:15,color:'#806397',dy:84},
      ]],
    ],
  },
};
