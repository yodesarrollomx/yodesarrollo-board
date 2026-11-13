(function(root){'use strict';
root.YOD_PUBLIC_COPY={url:'https://script.google.com/macros/s/AKfycbw3EB-6Q9Mq-ouDU-JvKMrRUaw4auYVeGkKja783yJ7_dEpCOW8xoMhs8IQMDojmlDB3A/exec?recurso=textos'};
root.YodPublicCopy=async function(fetcher=window.fetch.bind(window)){
 if(root.YOD_PRESENTATION_PINNED_SOURCE){const r=await fetcher(root.YOD_PRESENTATION_PINNED_SOURCE,{cache:'no-cache',credentials:'omit'});if(!r.ok)throw Error('No se pudo recuperar la versión publicada del recorrido.');return await r.json();}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000),transient=new Set([429,502,503,504]);
 try{
  for(let attempt=1;attempt<=3;attempt++){
   try{
    const url=new URL(root.YOD_PUBLIC_COPY.url);url.searchParams.set('t',String(Date.now()));
    const response=await fetcher(url.href,{method:'GET',cache:'no-store',credentials:'omit',signal:controller.signal});
    if(!response.ok){if(transient.has(response.status)&&attempt<3){await new Promise(resolve=>setTimeout(resolve,250));continue;}throw Error('No se pudo consultar el contenido.');}
    return await response.json();
   }catch(error){if(error.name==='TypeError'&&!controller.signal.aborted&&attempt<3){await new Promise(resolve=>setTimeout(resolve,250));continue;}throw error;}
  }
 }finally{clearTimeout(timer);}
};
})(typeof window==='undefined'?globalThis:window);
