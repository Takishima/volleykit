import{c as i,u as r}from"./index-AOUhpGSJ.js";import{j as e}from"./chunk-state-D9x0UI-Q.js";import{r as c,a as m}from"./chunk-router-BQypQwfi.js";const u=[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]],x=i("user",u);function p({isOpen:o,onClose:s,titleId:n,children:l}){c.useEffect(()=>{if(!o)return;const d=window.scrollY,t={overflow:document.body.style.overflow,position:document.body.style.position,top:document.body.style.top,width:document.body.style.width};return document.body.style.overflow="hidden",document.body.style.position="fixed",document.body.style.top=`-${d}px`,document.body.style.width="100%",()=>{document.body.style.overflow=t.overflow,document.body.style.position=t.position,document.body.style.top=t.top,document.body.style.width=t.width,window.scrollTo(0,d)}},[o]);const{handleBackdropClick:a}=r({isOpen:o,onClose:s});return o?m.createPortal(e.jsxs("div",{className:"fixed inset-0 z-[55]",children:[e.jsx("div",{className:"absolute inset-0 bg-black/50 transition-opacity","aria-hidden":"true",onClick:a}),e.jsx("div",{role:"dialog","aria-modal":"true","aria-labelledby":n,className:`
          fixed inset-x-0 bottom-0
          md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
          max-h-[80vh] md:max-h-[70vh] md:max-w-lg md:w-full
          bg-surface-card dark:bg-surface-card-dark rounded-t-xl md:rounded-lg
          shadow-xl flex flex-col
          animate-in slide-in-from-bottom md:slide-in-from-bottom-0 md:fade-in
          duration-200
        `,children:l})]}),document.body):null}export{p as R,x as U};
