// Editorial snapshot of the identified proposal. Not the operational PPP model.
const moment=(label,spoken,change)=>({label,spoken,change});
const scene=(id,label,topic,title,page,moments,caution,question,motion)=>({id,label,topic,title,page,moments,beats:moments.map(m=>m.label),narrativeRole:{problema:'Problema',solucion:'Solución',plan:'Plan',riesgo:'Riesgo que evitamos',resultado:'Resultado esperado',accion:'Acción'}[topic],caution,question,motion,diagram:id});
export const story={
 version:'YOD-AB02',stage:'presentation',production:'authorized_2026-10-19',title:'Distrito Abasto Sonora',subtitle:'Central de Abastos · del potencial a una decisión informada',
 source:{title:'Propuesta Integral · Distrito Abasto Sonora',date:'octubre de 2026',pages:5},
 paletteStatus:'El color expresa la función del mensaje. La forma y los rótulos identifican cada objeto.',
 palette:{problema:{name:'Problema',color:'#ad4c46'},solucion:{name:'Solución',color:'#806397'},plan:{name:'Plan',color:'#866143'},riesgo:{name:'Riesgo que evitamos',color:'#987419'},resultado:{name:'Resultado esperado',color:'#297e94'},accion:{name:'Acción',color:'#517a43'}},
 scenes:[
 scene('potencial','01 · El terreno','problema','El terreno real. La oportunidad concreta.','1–2',[
 moment('Hermosillo · salida sur','La base inicial se ubica en la salida sur de Hermosillo, junto al bulevar Manuel J. Clouthier, sobre el corredor de la carretera a Guaymas. Partimos de una ubicación y un terreno identificados.','El mapa real de OpenStreetMap sitúa el polígono frente al corredor MEX 15.'),
 moment('Dos polígonos · una base inicial','Los planos 5-5 y 5-6 declaran 37,830.45 y 110,546.80 metros cuadrados. Juntos integran la base inicial de 148,377.25 metros cuadrados. La colindancia 5-4 queda al norte como reserva del conjunto.','El mapa se acerca a los vértices de los planos; aparecen el límite compartido y las superficies.'),
 moment('Conservar la forma del terreno','La longitud, el frente y la forma del predio condicionan la circulación, los servicios y las etapas. Esta misma geometría se transforma en la base tridimensional del distrito.','El polígono gira y se eleva con Hairline, sin sustituirlo por un rectángulo.'),
 moment('El concepto se estudia sobre esa base','Sobre el terreno podemos organizar una primera hipótesis de comercio, almacenamiento y distribución. La demanda, los accesos, los servicios y la inversión determinarán el programa que convenga desarrollar.','Volúmenes conceptuales aparecen dentro del mismo perímetro; su implantación se definirá en los estudios.')
 ],'Contorno reconstruido de los cuadros de construcción. Ubicación interpretada en UTM 12N/WGS84; datum por confirmar. Superficies declaradas en planos. El lindero completo 5-4 no se representa. Los volúmenes son conceptuales.','¿Cómo convertimos esta ubicación y su geometría en una ventaja operativa?','El mismo suelo permanece para explicar el sistema de abasto.'),
 scene('operacion','02 · El distrito','solucion','Un sistema de abasto que debe funcionar.','1–2',[
 moment('Recibir producto','El distrito se entiende desde la operación: recibir mercancía, almacenarla o transferirla y acercarla a quien la necesita. La circulación debe servir a esos movimientos.','Un camión de carga llega por un recorrido esquemático a la nave.'),
 moment('Almacenar y transferir','Almacenamiento, distribución y logística controlada requieren espacios y servicios diferentes. La mezcla debe responder al producto y a los usuarios que podamos validar.','La nave abre su frente de andenes y aparece un módulo diferenciado de frío.'),
 moment('Acercar al comprador','El frente comercial conecta oferta y demanda. Los recorridos de abastecimiento, clientes y distribución local se estudian para que la actividad comercial y logística convivan.','Un vehículo de reparto y puestos comerciales completan un segundo recorrido.'),
 moment('Diseñar desde la demanda','El esquema explica relaciones de negocio. El estudio definirá capacidades, accesos, servicios y productos; la operación real determinará la implantación.','Los recorridos convergen en el distrito sin convertirse en un plano arquitectónico.')
 ],'Diagrama funcional interpretativo: no representa accesos autorizados, ubicación de edificios, dimensiones ni trayectorias de ingeniería.','¿Qué usuarios y operadores necesitamos escuchar primero?','Los productos quedan como objetos de una misma inversión; aparece el equipo que coordina su desarrollo.'),
 scene('equipo','03 · Un solo frente','solucion','El propietario decide. El equipo coordina.','1–3',[
 moment('El propietario dirige la inversión','La propuesta plantea que el propietario aporte el capital necesario y contrate a un equipo desarrollador que coordine el proceso completo. Cada compromiso se define por etapa.','Una figura de propietario y el capital se sitúan en un lado de la mesa de decisión.'),
 moment('Una coordinación integral','Puebla Arquitectos, Yo Desarrollo y Avermont articulan una ruta común: mercado, conceptualización, estructuración, ejecución y colocación comercial.','El equipo se reúne alrededor de la misma mesa, frente al expediente.'),
 moment('Especialidades con responsables','La coordinación integra a quienes estudian mercado, proyecto, finanzas, permisos, construcción y comercialización. Sus alcances y entregables se deben acordar expresamente.','Aparecen cuatro frentes de trabajo alrededor del núcleo; cada uno tiene un rótulo.'),
 moment('Decisiones con información','El propietario recibe avances, costos, riesgos y recomendaciones para autorizar el siguiente paso. Una sola coordinación permite revisar el proyecto como un conjunto.','El expediente vuelve al propietario; la mesa queda unida a una compuerta de autorización.')
 ],'La integración del equipo es propuesta. Capital, responsabilidades, facultades y contratos se precisan antes de su ejecución.','¿Quién revisa y quién autoriza cada entrega del proyecto?','La mesa se abre en tres alternativas de negocio que serán comparadas con la misma información.'),
 scene('alternativas','04 · Tres caminos','plan','Comparar venta, renta y una mezcla.','2, 4',[
 moment('Venta','La venta puede recuperar capital mediante la colocación de unidades. Se debe estudiar quién compra, a qué precio y con qué ritmo, junto con la inversión necesaria para entregar.','La nave se desplaza al carril Venta; aparece una entrega de propiedad y un flujo de recuperación.'),
 moment('Renta patrimonial','La renta permite conservar el activo y buscar flujo recurrente. Exige capital, ocupación, operación y tiempo; esos compromisos deben estar presentes en la comparación.','Una segunda nave permanece con su propietario y recibe una secuencia de flujos.'),
 moment('Esquema mixto','Una mezcla puede combinar colocación de ciertos productos con conservación de otros. La proporción se define con evidencia, no con un porcentaje elegido de antemano.','Un tercer carril separa las unidades a vender de las que se conservarían.'),
 moment('Elegir con el mismo modelo','Compararemos inversión, ingresos, capital requerido, calendario y riesgos bajo criterios comunes. La recomendación saldrá de los resultados comerciales y financieros.','Los tres carriles confluyen en una matriz comparativa con los mismos criterios.')
 ],'Son alternativas de estudio. No hay una mezcla, rendimiento, ocupación ni precio de salida aprobados en este guion.','¿Qué combinación equilibra mejor capital disponible, flujo y patrimonio?','La matriz se convierte en las preguntas concretas que resolverá la prefactibilidad.'),
 scene('validacion','05 · Qué estudiamos','plan','Seis entregables para decidir.','4',[
 moment('Mercado y producto','Primero estudiamos demanda potencial y validación comercial inicial. Con esa evidencia revisamos la mezcla de productos y el aprovechamiento del proyecto.','El expediente se abre en dos hojas: mercado y master plan conceptual.'),
 moment('Modelo y etapas','Construimos una comparación preliminar entre renta patrimonial, venta y esquema mixto, junto con una estrategia de comercialización anticipada y desarrollo por etapas.','Se incorporan modelo financiero y ruta de fases; los mismos productos permanecen como referencia.'),
 moment('Restricciones y estudios','Identificamos restricciones, factibilidades y estudios técnicos que deban contratarse. Su resultado puede cambiar el alcance, la secuencia o la inversión propuesta.','Una lupa recorre la base del proyecto y señala pendientes físicos y normativos.'),
 moment('Una recomendación ejecutiva','El informe final integra hallazgos, recomendaciones y ruta de implementación. El resultado útil es saber cómo avanzar, qué ajustar o qué condición resolver antes de continuar.','Las seis piezas se reúnen en un informe único que llega a la compuerta de decisión.')
 ],'El diagnóstico inicial identifica estudios adicionales; no sustituye levantamientos, dictámenes, permisos ni proyectos ejecutivos.','¿Qué evidencia debe contener el informe para autorizar la siguiente inversión?','El informe se coloca al inicio de una ruta con cuatro contrataciones progresivas.'),
 scene('etapas','06 · Capital por etapas','riesgo','Comprometer recursos de forma progresiva.','3, 5',[
 moment('Estudiar y conceptualizar','La primera contratación reúne mercado, prefactibilidad y planeación conceptual. Su función es reducir la incertidumbre relevante antes de una inversión mayor.','Se activa sólo el primer tramo de la ruta; el capital queda detrás de la primera compuerta.'),
 moment('Preparar la ejecución','Con resultados revisados, el propietario puede autorizar anteproyecto, presupuesto y estructuración de ejecución. Esa decisión requiere su propuesta económica específica.','El expediente cruza la primera compuerta y habilita un segundo tramo de preparación.'),
 moment('Desarrollar y colocar','La gerencia integral, el control del desarrollo y la comercialización se contratan para ejecutar y colocar el proyecto conforme al alcance aprobado.','Una grúa y los módulos construidos aparecen después de la segunda autorización.'),
 moment('Estabilizar, cuando corresponda','Si el propietario conserva activos en renta, puede acordarse continuidad para su estabilización y administración estratégica inicial. Cada fase tiene un punto claro de decisión.','La última compuerta conduce a un activo ocupado y a un seguimiento de operación.')
 ],'Las cuatro contrataciones sugeridas no son cuatro compromisos ya aceptados. El orden y alcance podrán ajustarse con autorización del propietario.','¿Qué condición libera capital en cada fase?','La ruta se acerca a la etapa de preparación para mostrar cómo se controla la ejecución.'),
 scene('ejecucion','07 · Preparar y controlar','plan','De concepto a ejecución coordinada.','2–3',[
 moment('Definir el proyecto','El concepto aprobado se convierte en anteproyecto operativo y alcances de trabajo. Los especialistas deben resolver los requisitos que condicionan el desarrollo.','La nave se relaciona con un plano esquemático y un expediente de requisitos.'),
 moment('Costear y programar','Presupuesto base, programa general, ruta crítica e ingeniería de valor permiten revisar costo, tiempo y prioridades antes de contratar la ejecución.','Aparecen una regla de costos y un calendario al lado de la nave.'),
 moment('Contratar y ejecutar','La preparación contractual y de licitación o contratación ordena quién entrega cada parte, bajo qué condiciones y con qué responsabilidades.','El contrato abre paso a la grúa; la nave conserva su posición al crecer.'),
 moment('Mantener el control','Durante el desarrollo, la gerencia integra reportes de avance, control de presupuesto, seguimiento de hitos y soporte a las decisiones clave del propietario.','El avance de obra vuelve al tablero de control y al propietario como reporte.')
 ],'El alcance ejecutivo, las especialidades y sus costos se contratan en etapas posteriores. Los estudios de terceros no están incluidos en la primera oferta.','¿Qué reportes y autorizaciones necesita el propietario durante la ejecución?','La nave permanece; el foco cambia de construir a colocar el producto correcto.'),
 scene('comercializacion','08 · Colocar y estabilizar','resultado','Vincular el desarrollo con sus usuarios.','2–4',[
 moment('Comercializar desde la estrategia','La propuesta incluye diseñar una estrategia comercial y anticipar la colocación. El mercado debe orientar el producto y la secuencia de desarrollo.','Usuarios potenciales se acercan a los productos todavía en preparación.'),
 moment('Convertir interés en acuerdos','Prospección, materiales y negociación buscan convertir interés en contratos de renta o venta. La lista de prospectos y el seguimiento hacen visible ese avance.','Cada contacto pasa de conversación a expediente; sólo los acuerdos confirmados llegan al contrato.'),
 moment('Acompañar el cierre','La colocación se coordina con entregas, requisitos y condiciones contractuales. El cierre comercial y la ejecución deben sostener el mismo compromiso.','Contrato y nave se unen en una entrega; el flujo económico aparece después.'),
 moment('Conservar valor en operación','Cuando el proyecto se conserve, la estabilización da seguimiento a ocupación, ajustes comerciales y mejoras. Es una etapa prevista, sujeta a resultados y contratación.','El activo pasa a una revisión de ocupación y operación, con un reporte de estabilización.')
 ],'El guion describe el servicio propuesto; no acredita usuarios comprometidos, contratos firmados ni absorción comercial.','¿Cómo comprobaremos demanda y colocación antes de ampliar una fase?','El flujo de un activo ocupado se compara con la inversión y los costos que lo hacen posible.'),
 scene('economia','09 · El negocio completo','riesgo','Revisar el flujo completo de la inversión.','4',[
 moment('Inversión y capital requerido','La evaluación debe reunir la inversión inicial y el capital necesario a lo largo del desarrollo. Una imagen atractiva todavía no responde cuánto habrá que aportar y cuándo.','El capital se ubica al inicio de una línea de tiempo; la nave aparece como destino de inversión.'),
 moment('Ingresos y operación','Los ingresos de renta o venta se estudian con el calendario de colocación, costos y necesidades operativas de cada producto. La logística especializada exige distinguir inmueble y operación.','La nave y el módulo de frío se separan visualmente; cada uno conserva su propia cuenta conceptual.'),
 moment('Tiempo y sensibilidad','Probamos qué cambia si los costos, precios, ocupación o ritmo comercial resultan distintos. Los escenarios ayudan a identificar qué supuestos sostienen la recomendación.','Cuatro controles conceptuales rodean el modelo; ninguno muestra una rentabilidad inventada.'),
 moment('Una recomendación sustentada','El informe debe relacionar capital, flujo, riesgo y patrimonio para orientar una decisión. No basta con un porcentaje aislado ni con un ingreso anual proyectado.','Las cuentas confluyen en un informe de decisión, sin promesa de retorno.')
 ],'Explicación del análisis a realizar, no cálculo financiero. No se publica TIR, VAN, rendimiento garantizado ni una valuación aprobada.','¿Qué supuesto tendría que confirmarse para que el escenario elegido sea viable?','Del flujo del proyecto se separan las retribuciones propuestas para el equipo.'),
 scene('retribuciones','10 · Reglas económicas','solucion','Cada retribución tiene su alcance.','3–5',[
 moment('Trabajo inicial y gerencia','La propuesta distingue honorarios de prefactibilidad y factibilidad de los honorarios de gerencia integral o Developer Fee. Se paga por alcances y etapas diferentes.','Dos documentos separados se vinculan con estudio y coordinación de desarrollo.'),
 moment('Colocación y administración','También contempla honorarios o comisiones por colocación de renta o venta y, cuando corresponda, administración estratégica inicial del activo conservado.','Contrato comercial y activo en operación reciben sus propios rótulos de servicio.'),
 moment('Participación variable','El Sponsor Promote se plantea como participación variable en excedentes de resultados, sujeta al esquema de distribución, umbrales y condiciones que acuerden las partes.','Un recipiente de resultados permanece cerrado hasta pasar una compuerta de condiciones pactadas.'),
 moment('Definir antes de contratar','Montos, porcentajes, bases de cálculo y condiciones posteriores se presentarán en una propuesta económica y contractual específica. Este guion no los da por acordados.','Los componentes se ordenan en un expediente único para revisión y acuerdo.')
 ],'No se fija un porcentaje ni un umbral de Sponsor Promote. No se equipara ingreso bruto, honorario y participación en excedentes.','¿Qué debe quedar explícito en la propuesta económica de cada etapa?','El expediente se concentra en la única oferta inicial cuantificada del documento.'),
 scene('oferta','11 · Primera contratación','accion','Prefactibilidad integral. Una decisión concreta.','4–5',[
 moment('Alcance inicial','Proponemos contratar la prefactibilidad integral: mercado, master plan y áreas, comparación financiera, comercialización y etapas, diagnóstico de restricciones e informe ejecutivo.','Un expediente de seis entregables queda al centro como objeto de la contratación inicial.'),
 moment('Honorarios y plazo propuestos','La propuesta inicial establece honorarios de novecientos cincuenta mil pesos más IVA y un plazo estimado de ocho a diez semanas. Son condiciones para revisar y acordar.','El expediente se acompaña del importe y una banda de tiempo estimada, sin asociarla a fechas de inicio aún no pactadas.'),
 moment('Pago contra hitos','La forma de pago propuesta es treinta por ciento a la contratación, cuarenta contra entrega y revisión del avance intermedio, y treinta a la entrega final y los entregables acordados.','Tres hitos de pago se alinean con contratación, revisión intermedia y entrega final.'),
 moment('Alcance y exclusiones claros','Levantamientos, hidrología, geotecnia, impacto vial, proyectos ejecutivos, derechos y otros especialistas se cotizan aparte y requieren autorización previa. Los resultados permitirán decidir la siguiente etapa.','Una línea delimita el expediente incluido y los estudios de terceros sujetos a autorización.')
 ],'Condiciones del PDF preliminar de octubre de 2026. No hay aceptación, anticipo ni inicio acreditados por esta presentación.','¿Acordamos el alcance, los responsables y los criterios de entrega de esta primera etapa?','El expediente queda frente al propietario y se ofrecen caminos sencillos para resolver la decisión.'),
 scene('decision','12 · Siguiente paso','accion','Acordar el estudio. Decidir con sus resultados.','5',[
 moment('Si el alcance hace sentido','El siguiente paso es revisar y formalizar la contratación inicial: entregables, responsables, información de entrada, calendario y condiciones de pago.','El expediente pasa al centro de una mesa de acuerdo, junto con el calendario.'),
 moment('Si falta una respuesta','Identifiquemos la duda concreta y la evidencia necesaria: alcance, costo, plazo, exclusiones o criterio de entrega. La aclaración debe resolver esa decisión.','Se abre una hoja de preguntas vinculada al mismo expediente.'),
 moment('Si debe revisarse con otros','Podemos acordar una revisión con los demás propietarios o asesores, conservando el mismo alcance y una lista explícita de pendientes.','La mesa incorpora a los decisores sin dar por aceptado el contrato.'),
 moment('Una ruta clara para avanzar','La meta de esta primera etapa es una recomendación sustentada: avanzar, ajustar o resolver condiciones antes de invertir más. El propietario conserva la decisión sobre lo que sigue.','El informe final vuelve al propietario y abre tres salidas: avanzar, ajustar o pausar.')
 ],'La revisión del guion no equivale a contratar. Ninguna opción envía mensajes, acepta términos ni compromete recursos automáticamente.','¿Qué necesitamos resolver para tomar la decisión sobre la primera contratación?','Cierre del guion: la corrección se registra con chinches sobre esta misma versión.')
 ]
};

// Narrative function belongs to the spoken moment, not to a building or actor.
const roles=[
 ['contexto','contexto','plan','solucion'],['solucion','solucion','solucion','plan'],
 ['solucion','solucion','plan','resultado'],['contexto','contexto','solucion','plan'],
 ['plan','plan','riesgo','resultado'],['plan','plan','plan','riesgo'],
 ['plan','plan','plan','resultado'],['plan','plan','resultado','resultado'],
 ['contexto','riesgo','plan','resultado'],['plan','plan','riesgo','accion'],
 ['accion','contexto','plan','riesgo'],['accion','accion','accion','resultado']
];
const understand=[
 'La base inicial tiene ubicación, forma y dos superficies documentadas; el programa se valida sobre ese suelo.',
 'La mezcla inmobiliaria debe responder a cómo circulan el producto y sus usuarios.',
 'El equipo coordina el desarrollo y el propietario conserva las autorizaciones.',
 'Venta, renta y mezcla exigen compromisos distintos; se comparan con los mismos criterios.',
 'La prefactibilidad entrega seis piezas de evidencia y una recomendación integrada.',
 'Contratar el estudio no compromete las etapas posteriores.',
 'Proyecto, presupuesto, contratos y reportes deben sostener la misma ejecución.',
 'El interés de un prospecto debe convertirse en acuerdos comprobables y entregas coordinadas.',
 'La viabilidad depende del flujo completo, el tiempo y los supuestos de cada producto.',
 'Honorarios, comisiones y participación variable se pactan por alcances distintos.',
 'La primera oferta tiene entregables, plazo estimado, hitos de pago y exclusiones explícitos.',
 'La decisión inicial es contratar el estudio; su resultado orientará la siguiente inversión.'
];
story.scenes.forEach((s,i)=>{s.understand=understand[i];s.moments.forEach((m,j)=>m.role=roles[i][j])});
story.colorReview={criteria:{
 problema:'Expone una dificultad concreta del propietario: decidir la inversión sin suficiente evidencia. No exagera ni inventa una amenaza.',
 solucion:'Muestra cómo la propuesta responde a esa dificultad: operación coherente, alternativas o coordinación. Debe explicar el mecanismo.',
 plan:'Describe pasos, responsables, entregables o condiciones. Permite entender cómo se avanza y qué autoriza cada etapa.',
 riesgo:'Hace visible un compromiso que se busca evitar: capital inmovilizado, supuestos sin validar o mezcla de obligaciones. No lo presenta como un daño seguro.',
 resultado:'Explica qué podría obtener el propietario si las condiciones se cumplen: información, control, colocación o patrimonio. No promete rentabilidad.',
 accion:'Pide un siguiente paso concreto y proporcionado: revisar, aclarar o formalizar la primera contratación. No equivale a una aceptación automática.'
}};

story.scenes[0].source='Planos ACTUAL POLIGONO 5-5 y 5-6 · recibidos 14/10/2026; Plan Maestro · 17/10/2026. Cartografía © OpenStreetMap contributors, 19/10/2026.';
