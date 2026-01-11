var an=Object.defineProperty;var xs=s=>{throw TypeError(s)};var on=(s,e,t)=>e in s?an(s,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):s[e]=t;var Ft=(s,e,t)=>on(s,typeof e!="symbol"?e+"":e,t),$t=(s,e,t)=>e.has(s)||xs("Cannot "+t);var i=(s,e,t)=>($t(s,e,"read from private field"),t?t.call(s):e.get(s)),p=(s,e,t)=>e.has(s)?xs("Cannot add the same private member more than once"):e instanceof WeakSet?e.add(s):e.set(s,t),u=(s,e,t,n)=>($t(s,e,"write to private field"),n?n.call(s,t):e.set(s,t),t),l=(s,e,t)=>($t(s,e,"access private method"),t);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const a of r)if(a.type==="childList")for(const o of a.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function t(r){const a={};return r.integrity&&(a.integrity=r.integrity),r.referrerPolicy&&(a.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?a.credentials="include":r.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function n(r){if(r.ep)return;r.ep=!0;const a=t(r);fetch(r.href,a)}})();const Ks=4/5,Js=7/5,Qs=23/20,Ss=24,cn=.7,ln=.85;var Ue,ge,tt,P,Y,ei,ti,si,st,jt;class un{constructor({container:e,sheetType:t="electronic",captureMode:n}){p(this,Y);p(this,Ue);p(this,ge);p(this,tt);p(this,P,null);p(this,st,()=>{l(this,Y,jt).call(this)});u(this,Ue,e),u(this,ge,l(this,Y,ei).call(this,t,n)),u(this,tt,l(this,Y,ti).call(this,t,n)),l(this,Y,si).call(this),l(this,Y,jt).call(this),window.addEventListener("resize",i(this,st))}getAspectRatio(){return i(this,ge)}setVisible(e){i(this,P)&&(i(this,P).style.display=e?"block":"none")}destroy(){window.removeEventListener("resize",i(this,st)),i(this,P)&&(i(this,P).remove(),u(this,P,null))}}Ue=new WeakMap,ge=new WeakMap,tt=new WeakMap,P=new WeakMap,Y=new WeakSet,ei=function(e,t){return e==="manuscript"?t==="roster-only"?Qs:Js:Ks},ti=function(e,t){return e==="manuscript"?t==="roster-only"?"Align roster area here":"Align full scoresheet here":"Align player list here"},si=function(){u(this,P,document.createElement("div")),i(this,P).className="camera-guide",i(this,P).innerHTML=`
      <div class="camera-guide__overlay">
        <div class="camera-guide__frame">
          <div class="camera-guide__table-lines"></div>
          <div class="camera-guide__label">
            <span></span>
          </div>
        </div>
      </div>
    `;const e=i(this,P).querySelector(".camera-guide__label span");e&&(e.textContent=i(this,tt)),i(this,Ue).appendChild(i(this,P))},st=new WeakMap,jt=function(){var d;const e=(d=i(this,P))==null?void 0:d.querySelector(".camera-guide__frame");if(!e||!(e instanceof HTMLElement))return;const t=i(this,Ue).getBoundingClientRect(),n=t.width,r=t.height,a=n-Ss*2,o=r-Ss*2;let c,h;a/o>i(this,ge)?(h=o*cn,c=h*i(this,ge)):(c=a*ln,h=c/i(this,ge)),e.style.width=`${c}px`,e.style.height=`${h}px`};const Ht=.1,ws=4,Ns=.1,hn=.92,Ts=24,Ms=40,Rs=.85;var $,Ot,Te,it,nt,I,ye,B,j,X,ne,re,ae,Me,O,Z,V,y,ii,ni,ri,ai,Xt,Gt,we,oi,rt,ci,li,ui,Yt,hi,di,Zt,pi,mi;class dn{constructor({container:e,imageBlob:t,sheetType:n="electronic",captureMode:r,onConfirm:a,onCancel:o}){p(this,y);p(this,$);p(this,Ot);p(this,Te);p(this,it);p(this,nt);p(this,I,null);p(this,ye,null);p(this,B,1);p(this,j,0);p(this,X,0);p(this,ne,!1);p(this,re,0);p(this,ae,0);p(this,Me,0);p(this,O,{width:0,height:0});p(this,Z,{width:0,height:0});p(this,V,{width:0,height:0});p(this,rt,()=>{l(this,y,Xt).call(this),l(this,y,Gt).call(this),l(this,y,we).call(this)});u(this,$,e),u(this,Ot,t),u(this,Te,l(this,y,ii).call(this,n,r)),u(this,it,a),u(this,nt,o),u(this,ye,URL.createObjectURL(t)),l(this,y,ni).call(this),l(this,y,ai).call(this),window.addEventListener("resize",i(this,rt))}destroy(){window.removeEventListener("resize",i(this,rt)),i(this,ye)&&(URL.revokeObjectURL(i(this,ye)),u(this,ye,null)),i(this,$).innerHTML=""}}$=new WeakMap,Ot=new WeakMap,Te=new WeakMap,it=new WeakMap,nt=new WeakMap,I=new WeakMap,ye=new WeakMap,B=new WeakMap,j=new WeakMap,X=new WeakMap,ne=new WeakMap,re=new WeakMap,ae=new WeakMap,Me=new WeakMap,O=new WeakMap,Z=new WeakMap,V=new WeakMap,y=new WeakSet,ii=function(e,t){return e==="manuscript"?t==="roster-only"?Qs:Js:Ks},ni=function(){i(this,$).innerHTML=`
      <div class="image-editor" role="dialog" aria-modal="true" aria-label="Image editor">
        <div class="image-editor__viewport" id="editor-viewport">
          <img
            class="image-editor__image"
            id="editor-image"
            alt="Image to crop"
            draggable="false"
          />
          <div class="image-editor__frame-overlay">
            <div class="image-editor__frame" id="editor-frame">
              <div class="image-editor__corner image-editor__corner--tl"></div>
              <div class="image-editor__corner image-editor__corner--tr"></div>
              <div class="image-editor__corner image-editor__corner--bl"></div>
              <div class="image-editor__corner image-editor__corner--br"></div>
            </div>
          </div>
        </div>
        <div class="image-editor__hint">
          <span>Pinch to zoom, drag to position</span>
        </div>
        <div class="image-editor__controls">
          <button
            type="button"
            class="btn btn-secondary image-editor__btn"
            id="btn-editor-cancel"
            aria-label="Cancel editing"
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary image-editor__btn"
            id="btn-editor-confirm"
            aria-label="Confirm crop"
          >
            Crop & Continue
          </button>
        </div>
      </div>
    `,l(this,y,ri).call(this)},ri=function(){const e=i(this,$).querySelector("#editor-viewport"),t=i(this,$).querySelector("#btn-editor-cancel"),n=i(this,$).querySelector("#btn-editor-confirm");e==null||e.addEventListener("touchstart",r=>l(this,y,ci).call(this,r),{passive:!1}),e==null||e.addEventListener("touchmove",r=>l(this,y,li).call(this,r),{passive:!1}),e==null||e.addEventListener("touchend",r=>l(this,y,ui).call(this,r)),e==null||e.addEventListener("mousedown",r=>l(this,y,hi).call(this,r)),e==null||e.addEventListener("mousemove",r=>l(this,y,di).call(this,r)),e==null||e.addEventListener("mouseup",()=>l(this,y,Zt).call(this)),e==null||e.addEventListener("mouseleave",()=>l(this,y,Zt).call(this)),e==null||e.addEventListener("wheel",r=>l(this,y,pi).call(this,r),{passive:!1}),t==null||t.addEventListener("click",()=>i(this,nt).call(this)),n==null||n.addEventListener("click",()=>l(this,y,mi).call(this))},ai=async function(){u(this,I,i(this,$).querySelector("#editor-image")),i(this,I)&&(i(this,I).src=i(this,ye),i(this,I).complete||await new Promise(e=>{var t;(t=i(this,I))==null||t.addEventListener("load",e,{once:!0})}),u(this,V,{width:i(this,I).naturalWidth,height:i(this,I).naturalHeight}),l(this,y,Xt).call(this),l(this,y,Gt).call(this),l(this,y,we).call(this))},Xt=function(){const e=i(this,$).querySelector("#editor-viewport");if(!e)return;const t=e.getBoundingClientRect();u(this,Z,{width:t.width,height:t.height});const n=i(this,Z).width-Ts*2,r=i(this,Z).height-Ts*2;n/r>i(this,Te)?(i(this,O).height=r*Rs,i(this,O).width=i(this,O).height*i(this,Te)):(i(this,O).width=n*Rs,i(this,O).height=i(this,O).width/i(this,Te));const a=i(this,$).querySelector("#editor-frame");a instanceof HTMLElement&&(a.style.width=`${i(this,O).width}px`,a.style.height=`${i(this,O).height}px`)},Gt=function(){if(!i(this,I))return;const e=i(this,Z).width-Ms*2,t=i(this,Z).height-Ms*2,n=e/i(this,V).width,r=t/i(this,V).height;u(this,B,Math.max(Ht,Math.min(n,r))),u(this,j,0),u(this,X,0)},we=function(){i(this,I)&&(l(this,y,oi).call(this),i(this,I).style.transform=`translate(calc(-50% + ${i(this,j)}px), calc(-50% + ${i(this,X)}px)) scale(${i(this,B)})`)},oi=function(){const e=i(this,V).width*i(this,B),t=i(this,V).height*i(this,B);if(e>=i(this,Z).width){const n=(e-i(this,O).width)/2;u(this,j,Math.max(-n,Math.min(n,i(this,j))))}else u(this,j,0);if(t>=i(this,Z).height){const n=(t-i(this,O).height)/2;u(this,X,Math.max(-n,Math.min(n,i(this,X))))}else u(this,X,0)},rt=new WeakMap,ci=function(e){e.preventDefault(),e.touches.length===1?(u(this,ne,!0),u(this,re,e.touches[0].clientX),u(this,ae,e.touches[0].clientY)):e.touches.length===2&&u(this,Me,l(this,y,Yt).call(this,e.touches))},li=function(e){if(e.preventDefault(),e.touches.length===1&&i(this,ne)){const t=e.touches[0].clientX-i(this,re),n=e.touches[0].clientY-i(this,ae);u(this,j,i(this,j)+t),u(this,X,i(this,X)+n),u(this,re,e.touches[0].clientX),u(this,ae,e.touches[0].clientY),l(this,y,we).call(this)}else if(e.touches.length===2){const t=l(this,y,Yt).call(this,e.touches),n=t/i(this,Me),r=i(this,B)*n;u(this,B,Math.max(Ht,Math.min(ws,r))),u(this,Me,t),l(this,y,we).call(this)}},ui=function(e){u(this,ne,!1),u(this,Me,0)},Yt=function(e){const t=e[0].clientX-e[1].clientX,n=e[0].clientY-e[1].clientY;return Math.sqrt(t*t+n*n)},hi=function(e){u(this,ne,!0),u(this,re,e.clientX),u(this,ae,e.clientY)},di=function(e){if(!i(this,ne))return;const t=e.clientX-i(this,re),n=e.clientY-i(this,ae);u(this,j,i(this,j)+t),u(this,X,i(this,X)+n),u(this,re,e.clientX),u(this,ae,e.clientY),l(this,y,we).call(this)},Zt=function(){u(this,ne,!1)},pi=function(e){e.preventDefault();const t=e.deltaY>0?-Ns:Ns,n=i(this,B)+t;u(this,B,Math.max(Ht,Math.min(ws,n))),l(this,y,we).call(this)},mi=async function(){if(!i(this,I))return;const e=i(this,V).width*i(this,B),t=i(this,V).height*i(this,B),n=(e-i(this,O).width)/2-i(this,j),r=(t-i(this,O).height)/2-i(this,X),a=n/i(this,B),o=r/i(this,B),c=i(this,O).width/i(this,B),h=i(this,O).height/i(this,B),d=document.createElement("canvas");d.width=c,d.height=h;const m=d.getContext("2d");if(!m){console.error("Could not get canvas context");return}m.drawImage(i(this,I),a,o,c,h,0,0,c,h),d.toBlob(g=>{g&&i(this,it).call(this,g)},"image/jpeg",hn)};const pn=5e3,mn=.92;var x,Re,Le,qe,We,oe,G,je,at,K,Be,E,fi,gi,yi,bi,_i,Ai,Qe,Et,Ei,vi,Ci,xi,vt;const It=class It{constructor({container:e,sheetType:t,captureMode:n,onCapture:r,onBack:a}){p(this,E);p(this,x);p(this,Re);p(this,Le);p(this,qe);p(this,We);p(this,oe,null);p(this,G,null);p(this,je,!1);p(this,at,!1);p(this,K,null);p(this,Be,null);u(this,x,e),u(this,Re,t),u(this,Le,n),u(this,qe,r),u(this,We,a),l(this,E,gi).call(this)}destroy(){l(this,E,Et).call(this),l(this,E,vt).call(this),i(this,K)&&(i(this,K).destroy(),u(this,K,null)),i(this,x).innerHTML=""}};x=new WeakMap,Re=new WeakMap,Le=new WeakMap,qe=new WeakMap,We=new WeakMap,oe=new WeakMap,G=new WeakMap,je=new WeakMap,at=new WeakMap,K=new WeakMap,Be=new WeakMap,E=new WeakSet,fi=function(){return i(this,Re)==="manuscript"?i(this,Le)==="roster-only"?"Capture the roster area in landscape":"Capture the full scoresheet in landscape":"Capture the player list table"},gi=function(){const e=l(this,E,fi).call(this);i(this,x).innerHTML=`
      <div class="image-capture">
        <div class="image-capture__header">
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            id="btn-back"
            aria-label="Go back to type selection"
          >
            ← Back
          </button>
          <span class="image-capture__hint"></span>
        </div>

        <div class="image-capture__buttons">
          <button
            type="button"
            class="btn btn-primary btn-lg image-capture__btn"
            id="btn-camera"
            aria-label="Open camera to capture image"
          >
            <svg class="image-capture__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <span>Use Camera</span>
          </button>
          <button
            type="button"
            class="btn btn-secondary btn-lg image-capture__btn"
            id="btn-upload"
            aria-label="Upload image from device"
          >
            <svg class="image-capture__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span>Upload Image</span>
          </button>
        </div>

        <input
          type="file"
          id="file-input"
          class="image-capture__file-input"
          accept="image/*"
          aria-hidden="true"
        />

        <div id="camera-container" class="image-capture__camera" role="dialog" aria-modal="true" aria-label="Camera capture" hidden>
          <div class="image-capture__video-wrapper">
            <video
              id="camera-preview"
              class="image-capture__video"
              autoplay
              playsinline
              muted
            ></video>
            <div id="camera-guide-container"></div>
          </div>
          <div class="image-capture__camera-controls">
            <button
              type="button"
              class="btn btn-secondary image-capture__btn"
              id="btn-cancel-camera"
              aria-label="Cancel camera capture"
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-primary image-capture__capture-btn"
              id="btn-take-photo"
              aria-label="Take photo"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </button>
            <div class="image-capture__spacer"></div>
          </div>
        </div>

        <div id="permission-message" class="image-capture__message" hidden>
          <svg class="image-capture__message-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>Camera access was denied. Please use the upload button to select an image instead.</p>
        </div>

        <div id="editor-container" class="image-capture__editor" hidden></div>
      </div>
    `;const t=i(this,x).querySelector(".image-capture__hint");t&&(t.textContent=e),l(this,E,yi).call(this)},yi=function(){const e=i(this,x).querySelector("#btn-back"),t=i(this,x).querySelector("#btn-camera"),n=i(this,x).querySelector("#btn-upload"),r=i(this,x).querySelector("#file-input"),a=i(this,x).querySelector("#btn-cancel-camera"),o=i(this,x).querySelector("#btn-take-photo");e==null||e.addEventListener("click",()=>l(this,E,bi).call(this)),t==null||t.addEventListener("click",()=>l(this,E,_i).call(this)),n==null||n.addEventListener("click",()=>r==null?void 0:r.click()),r==null||r.addEventListener("change",c=>l(this,E,vi).call(this,c)),a==null||a.addEventListener("click",()=>l(this,E,Et).call(this)),o==null||o.addEventListener("click",()=>l(this,E,Ei).call(this))},bi=function(){i(this,We)&&i(this,We).call(this)},_i=async function(){if(i(this,at)){l(this,E,Qe).call(this);return}try{u(this,oe,await navigator.mediaDevices.getUserMedia({video:It.VIDEO_CONSTRAINTS,audio:!1}));const e=i(this,x).querySelector("#camera-container"),t=i(this,x).querySelector(".image-capture__buttons"),n=i(this,x).querySelector(".image-capture__header"),r=i(this,x).querySelector("#camera-guide-container");u(this,G,i(this,x).querySelector("#camera-preview")),i(this,G)&&i(this,oe)&&(i(this,G).srcObject=i(this,oe),await i(this,G).play()),r&&u(this,K,new un({container:r,sheetType:i(this,Re),captureMode:i(this,Le)})),t==null||t.setAttribute("hidden",""),n==null||n.setAttribute("hidden",""),e==null||e.removeAttribute("hidden"),u(this,je,!0)}catch(e){console.error("Camera access error:",e),l(this,E,Ai).call(this,e)}},Ai=function(e){e.name==="NotAllowedError"||e.name==="PermissionDeniedError"?(u(this,at,!0),l(this,E,Qe).call(this)):e.name==="NotFoundError"?l(this,E,Qe).call(this):l(this,E,Qe).call(this)},Qe=function(){const e=i(this,x).querySelector("#permission-message");e==null||e.removeAttribute("hidden"),setTimeout(()=>{e==null||e.setAttribute("hidden","")},pn)},Et=function(){i(this,oe)&&(i(this,oe).getTracks().forEach(r=>r.stop()),u(this,oe,null)),i(this,G)&&(i(this,G).srcObject=null),i(this,K)&&(i(this,K).destroy(),u(this,K,null));const e=i(this,x).querySelector("#camera-container"),t=i(this,x).querySelector(".image-capture__buttons"),n=i(this,x).querySelector(".image-capture__header");e==null||e.setAttribute("hidden",""),t==null||t.removeAttribute("hidden"),n==null||n.removeAttribute("hidden"),u(this,je,!1)},Ei=async function(){if(!i(this,G)||!i(this,je))return;const e=i(this,G),t=document.createElement("canvas");t.width=e.videoWidth,t.height=e.videoHeight;const n=t.getContext("2d");if(!n){console.error("Could not get canvas context");return}n.drawImage(e,0,0,t.width,t.height),t.toBlob(r=>{r&&(l(this,E,Et).call(this),i(this,qe).call(this,r))},"image/jpeg",mn)},vi=function(e){var r;const t=e.target;if(!(t instanceof HTMLInputElement)||!((r=t.files)!=null&&r.length))return;const n=t.files[0];if(!n.type.startsWith("image/")){console.error("Selected file is not an image");return}t.value="",l(this,E,Ci).call(this,n)},Ci=function(e){const t=i(this,x).querySelector("#editor-container"),n=i(this,x).querySelector(".image-capture__buttons"),r=i(this,x).querySelector(".image-capture__header");t&&(u(this,Be,new dn({container:t,imageBlob:e,sheetType:i(this,Re),captureMode:i(this,Le),onConfirm:a=>l(this,E,xi).call(this,a),onCancel:()=>l(this,E,vt).call(this)})),n==null||n.setAttribute("hidden",""),r==null||r.setAttribute("hidden",""),t.removeAttribute("hidden"))},xi=function(e){l(this,E,vt).call(this),i(this,qe).call(this,e)},vt=function(){i(this,Be)&&(i(this,Be).destroy(),u(this,Be,null));const e=i(this,x).querySelector("#editor-container"),t=i(this,x).querySelector(".image-capture__buttons"),n=i(this,x).querySelector(".image-capture__header");e==null||e.setAttribute("hidden",""),t==null||t.removeAttribute("hidden"),n==null||n.removeAttribute("hidden")},Ft(It,"VIDEO_CONSTRAINTS",{facingMode:"environment",width:{ideal:1920},height:{ideal:1080}});let Vt=It;var be,ot,he,Si,wi,Kt;class fn{constructor({container:e,onSelect:t}){p(this,he);p(this,be);p(this,ot);u(this,be,e),u(this,ot,t),l(this,he,Si).call(this)}destroy(){i(this,be).innerHTML=""}}be=new WeakMap,ot=new WeakMap,he=new WeakSet,Si=function(){i(this,be).innerHTML=`
      <div class="sheet-type-selector">
        <div class="sheet-type-selector__options">
          <button
            type="button"
            class="sheet-type-selector__option"
            id="btn-electronic"
            aria-describedby="desc-electronic"
          >
            <span class="sheet-type-selector__option-icon" aria-hidden="true">📱</span>
            <span class="sheet-type-selector__option-label">Electronic</span>
            <span class="sheet-type-selector__option-desc" id="desc-electronic">
              Screenshots or printed forms with typed text
            </span>
          </button>

          <button
            type="button"
            class="sheet-type-selector__option"
            id="btn-manuscript"
            aria-describedby="desc-manuscript"
          >
            <span class="sheet-type-selector__option-icon" aria-hidden="true">📝</span>
            <span class="sheet-type-selector__option-label">Manuscript</span>
            <span class="sheet-type-selector__option-desc" id="desc-manuscript">
              Physical paper forms filled in by hand
            </span>
          </button>
        </div>
      </div>
    `,l(this,he,wi).call(this)},wi=function(){const e=i(this,be).querySelector("#btn-electronic"),t=i(this,be).querySelector("#btn-manuscript");e==null||e.addEventListener("click",()=>l(this,he,Kt).call(this,"electronic")),t==null||t.addEventListener("click",()=>l(this,he,Kt).call(this,"manuscript"))},Kt=function(e){i(this,ot).call(this,e)};var H,Oe,ct,Ie,Ke,Ni,Ti;class gn{constructor({container:e,onCancel:t}){p(this,Ke);p(this,H);p(this,Oe);p(this,ct,"Initializing...");p(this,Ie,0);u(this,H,e),u(this,Oe,t),l(this,Ke,Ni).call(this)}updateProgress({status:e,progress:t}){u(this,ct,e),u(this,Ie,t);const n=i(this,H).querySelector("#ocr-status"),r=i(this,H).querySelector("#ocr-progress-bar"),a=i(this,H).querySelector("#ocr-percentage");n&&(n.textContent=e),r&&(r.style.width=`${t}%`,r.setAttribute("aria-valuenow",String(t))),a&&(a.textContent=`${t}%`)}showError(e){const t=i(this,H).querySelector(".ocr-progress__spinner");t&&(t.innerHTML=`
        <svg class="ocr-progress__error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      `);const n=i(this,H).querySelector("#ocr-status");n&&(n.textContent=e,n.classList.add("ocr-progress__status--error"))}destroy(){i(this,H).innerHTML=""}}H=new WeakMap,Oe=new WeakMap,ct=new WeakMap,Ie=new WeakMap,Ke=new WeakSet,Ni=function(){i(this,H).innerHTML=`
      <div class="ocr-progress">
        <div class="ocr-progress__spinner" aria-hidden="true">
          <svg class="ocr-progress__spinner-svg" viewBox="0 0 50 50">
            <circle
              class="ocr-progress__spinner-circle"
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke-width="4"
            />
          </svg>
        </div>

        <div class="ocr-progress__content">
          <p class="ocr-progress__status" id="ocr-status" role="status" aria-live="polite">
            ${i(this,ct)}
          </p>

          <div class="ocr-progress__bar-container">
            <div
              class="ocr-progress__bar"
              id="ocr-progress-bar"
              role="progressbar"
              aria-valuenow="${i(this,Ie)}"
              aria-valuemin="0"
              aria-valuemax="100"
              style="width: ${i(this,Ie)}%"
            ></div>
          </div>

          <p class="ocr-progress__percentage" id="ocr-percentage">
            ${i(this,Ie)}%
          </p>
        </div>

        ${i(this,Oe)?`
          <button
            type="button"
            class="btn btn-secondary ocr-progress__cancel"
            id="btn-cancel-ocr"
            aria-label="Cancel OCR processing"
          >
            Cancel
          </button>
        `:""}
      </div>
    `,l(this,Ke,Ti).call(this)},Ti=function(){if(i(this,Oe)){const e=i(this,H).querySelector("#btn-cancel-ocr");e==null||e.addEventListener("click",()=>{var t;return(t=i(this,Oe))==null?void 0:t.call(this)})}};const yn="https://volleykit-proxy.takishima.workers.dev/ocr",Ls=95,Bs=50,bn=8,_n=20;var Xe,_e,Ge,ce,L,fe,Mi,Ri,Li,Bi;class Os{constructor(e,t=yn){p(this,L);p(this,Xe);p(this,_e,!1);p(this,Ge);p(this,ce,null);u(this,Xe,e),u(this,Ge,t)}async initialize(){if(!i(this,_e)){l(this,L,fe).call(this,"Initializing Mistral OCR...",0);try{if(!(await fetch(i(this,Ge).replace("/ocr","/health"),{method:"GET"})).ok)throw new Error("OCR service health check failed");l(this,L,fe).call(this,"Mistral OCR ready",10),u(this,_e,!0)}catch(e){console.warn("OCR service health check failed, will attempt OCR anyway:",e),l(this,L,fe).call(this,"Mistral OCR ready (health check skipped)",10),u(this,_e,!0)}}}async recognize(e){if(!i(this,_e))throw new Error("MistralOCR not initialized. Call initialize() first.");l(this,L,fe).call(this,"Uploading image...",20),u(this,ce,new AbortController);try{const t=new FormData;t.append("image",e,"scoresheet.jpg"),l(this,L,fe).call(this,"Processing with Mistral OCR...",40);const n=await fetch(i(this,Ge),{method:"POST",body:t,signal:i(this,ce).signal});if(l(this,L,fe).call(this,"Receiving results...",80),!n.ok){const a=await n.json().catch(()=>({}));throw new Error(a.error||`OCR request failed: ${n.status}`)}const r=await n.json();return l(this,L,fe).call(this,"Processing complete",100),l(this,L,Bi).call(this,r)}catch(t){throw t instanceof Error&&t.name==="AbortError"?new Error("OCR cancelled"):t}finally{u(this,ce,null)}}async terminate(){i(this,ce)&&(i(this,ce).abort(),u(this,ce,null)),u(this,_e,!1)}}Xe=new WeakMap,_e=new WeakMap,Ge=new WeakMap,ce=new WeakMap,L=new WeakSet,fe=function(e,t){i(this,Xe)&&i(this,Xe).call(this,{status:e,progress:t})},Mi=function(e){const r=new DOMParser().parseFromString(e,"text/html").querySelector("table");if(!r)return[e];const a=[],o=r.querySelectorAll("tr");for(const c of o){const h=c.querySelectorAll("th, td"),d=Array.from(h).map(m=>{var g;return((g=m.textContent)==null?void 0:g.trim())||""}).filter(m=>m.length>0);d.length>0&&a.push(d.join("	"))}return a},Ri=function(e){return typeof e=="string"?e:typeof e=="object"&&e!==null&&typeof e.content=="string"?e.content:(console.warn("Unexpected table format:",e),"")},Li=function(e,t){if(!t||t.length===0)return e;let n=e;for(let r=0;r<t.length;r++){const a=`[tbl-${r}.html](tbl-${r}.html)`,o=l(this,L,Ri).call(this,t[r]),h=l(this,L,Mi).call(this,o).join(`
`);n=n.replace(a,h)}return n},Bi=function(e){const t=e.pages.map(o=>l(this,L,Li).call(this,o.markdown,o.tables||[])).join(`

--- Page Break ---

`).trim(),r=t.split(`
`).map(o=>{const h=o.split(/\s+/).filter(d=>d.length>0).map((d,m)=>({text:d,confidence:Ls,bbox:{x0:m*Bs,y0:0,x1:m*Bs+d.length*bn,y1:_n}}));return{text:o,confidence:Ls,words:h}}),a=r.flatMap(o=>o.words);return{fullText:t,lines:r,words:a}};const An=1500,Jt={fullText:`[Stub OCR] External OCR service not configured.

This is placeholder text returned by the stub OCR service.
Integrate Google Vision, AWS Textract, or PaddleOCR to enable real text extraction.`,lines:[{text:"[Stub OCR] External OCR service not configured.",confidence:100,words:[{text:"[Stub",confidence:100,bbox:{x0:0,y0:0,x1:50,y1:20}},{text:"OCR]",confidence:100,bbox:{x0:55,y0:0,x1:100,y1:20}},{text:"External",confidence:100,bbox:{x0:105,y0:0,x1:170,y1:20}},{text:"OCR",confidence:100,bbox:{x0:175,y0:0,x1:210,y1:20}},{text:"service",confidence:100,bbox:{x0:215,y0:0,x1:270,y1:20}},{text:"not",confidence:100,bbox:{x0:275,y0:0,x1:300,y1:20}},{text:"configured.",confidence:100,bbox:{x0:305,y0:0,x1:380,y1:20}}]},{text:"",confidence:100,words:[]},{text:"This is placeholder text returned by the stub OCR service.",confidence:100,words:[{text:"This",confidence:100,bbox:{x0:0,y0:40,x1:40,y1:60}},{text:"is",confidence:100,bbox:{x0:45,y0:40,x1:60,y1:60}},{text:"placeholder",confidence:100,bbox:{x0:65,y0:40,x1:150,y1:60}},{text:"text",confidence:100,bbox:{x0:155,y0:40,x1:185,y1:60}},{text:"returned",confidence:100,bbox:{x0:190,y0:40,x1:255,y1:60}},{text:"by",confidence:100,bbox:{x0:260,y0:40,x1:280,y1:60}},{text:"the",confidence:100,bbox:{x0:285,y0:40,x1:310,y1:60}},{text:"stub",confidence:100,bbox:{x0:315,y0:40,x1:350,y1:60}},{text:"OCR",confidence:100,bbox:{x0:355,y0:40,x1:385,y1:60}},{text:"service.",confidence:100,bbox:{x0:390,y0:40,x1:445,y1:60}}]},{text:"Integrate Google Vision, AWS Textract, or PaddleOCR to enable real text extraction.",confidence:100,words:[{text:"Integrate",confidence:100,bbox:{x0:0,y0:60,x1:70,y1:80}},{text:"Google",confidence:100,bbox:{x0:75,y0:60,x1:125,y1:80}},{text:"Vision,",confidence:100,bbox:{x0:130,y0:60,x1:180,y1:80}},{text:"AWS",confidence:100,bbox:{x0:185,y0:60,x1:220,y1:80}},{text:"Textract,",confidence:100,bbox:{x0:225,y0:60,x1:290,y1:80}},{text:"or",confidence:100,bbox:{x0:295,y0:60,x1:310,y1:80}},{text:"PaddleOCR",confidence:100,bbox:{x0:315,y0:60,x1:395,y1:80}},{text:"to",confidence:100,bbox:{x0:400,y0:60,x1:415,y1:80}},{text:"enable",confidence:100,bbox:{x0:420,y0:60,x1:470,y1:80}},{text:"real",confidence:100,bbox:{x0:475,y0:60,x1:505,y1:80}},{text:"text",confidence:100,bbox:{x0:510,y0:60,x1:540,y1:80}},{text:"extraction.",confidence:100,bbox:{x0:545,y0:60,x1:620,y1:80}}]}],words:[]};Jt.words=Jt.lines.flatMap(s=>s.words);var Ye,De,Ae,Fe;class En{constructor(e){p(this,Ae);p(this,Ye);p(this,De,!1);u(this,Ye,e)}async initialize(){i(this,De)||(l(this,Ae,Fe).call(this,"Initializing stub OCR...",0),await new Promise(e=>setTimeout(e,200)),l(this,Ae,Fe).call(this,"Stub OCR ready",50),u(this,De,!0))}async recognize(e){if(!i(this,De))throw new Error("StubOCR not initialized. Call initialize() first.");return l(this,Ae,Fe).call(this,"Processing image...",60),await new Promise(t=>setTimeout(t,An)),l(this,Ae,Fe).call(this,"Extracting text...",90),await new Promise(t=>setTimeout(t,300)),l(this,Ae,Fe).call(this,"Complete",100),Jt}async terminate(){u(this,De,!1)}}Ye=new WeakMap,De=new WeakMap,Ae=new WeakSet,Fe=function(e,t){i(this,Ye)&&i(this,Ye).call(this,{status:e,progress:t})};const vn=3e3;async function Cn(s){try{return(await fetch(s.replace("/ocr","/health"),{method:"GET",signal:AbortSignal.timeout(vn)})).ok}catch{return!1}}const zt=typeof import.meta<"u"?"https://volleykit-proxy.ngn-damien.workers.dev/ocr":"https://volleykit-proxy.takishima.workers.dev/ocr",xn={create(s,e){return new Os(e,zt)},async createWithFallback(s,e){return await Cn(zt)?new Os(e,zt):(console.warn("OCR proxy not available, falling back to stub implementation"),new En(e))}},Oi=99,Ii=2,Is=3,Sn=.6,Qt=new Set(["C","AC","AC2","AC3","AC4","M"]),wn={O:"0",o:"0",Q:"0",D:"0",I:"1",l:"1",i:"1","|":"1",Z:"2",z:"2",E:"3",A:"4",S:"5",s:"5",G:"6",b:"6",T:"7",B:"8",g:"9",q:"9"},Nn={0:"O",1:"I","|":"I",5:"S",8:"B","@":"A","&":"A","€":"E","£":"L","¢":"C"};function Tn(s){return s.split("").map(e=>wn[e]??e).join("")}function Mn(s){return s.split("").map(e=>Nn[e]??e).join("")}function Rn(s){if(!s)return null;const e=s.trim(),t=Tn(e),n=/^(\d{1,2})$/.exec(t);if(n){const r=parseInt(n[1],10);if(r>=1&&r<=Oi)return r}return null}function $e(s){return s?Mn(s).toLowerCase().split(/[\s-]+/).map(t=>t.charAt(0).toUpperCase()+t.slice(1)).join(" "):""}function fs(s){if(!s||typeof s!="string")return{lastName:"",firstName:"",displayName:""};const t=s.trim().split(/\s+/).filter(o=>o.length>0);if(t.length===0)return{lastName:"",firstName:"",displayName:""};if(t.length===1){const o=$e(t[0]);return{lastName:o,firstName:"",displayName:o}}const n=$e(t[0]),r=t.slice(1).map($e).join(" "),a=`${r} ${n}`;return{lastName:n,firstName:r,displayName:a}}function es(s){if(!s||typeof s!="string")return{lastName:"",firstName:"",displayName:""};const t=s.trim().split(/\s+/).filter(o=>o.length>0);if(t.length===0)return{lastName:"",firstName:"",displayName:""};if(t.length===1){const o=$e(t[0]);return{lastName:o,firstName:"",displayName:o}}const n=$e(t[t.length-1]),r=t.slice(0,-1).map($e).join(" "),a=`${r} ${n}`;return{lastName:n,firstName:r,displayName:a}}const Ln=3,gs=[/punkte.*points.*punti/i,/lizenz.*licence.*licenza/i,/spieler.*joueur.*giocatore/i,/name.*nom.*nome/i,/mannschaft.*equipe.*squadra/i,/offizielle.*officiels.*ufficiali/i,/kapitän.*capitaine.*capitano/i,/trainer.*entraîneur.*allenatore/i,/aader\/ou\/o/i],Bn=10,On=[/^[\d\s.]+$/,/^["T:\s]+$/i,/^\d+$/];function In(s){const e=s.trim();return e.length<2||e.length>=Bn&&/^[\d\s]+$/.test(e)?!0:On.some(t=>t.test(e))}function Dn(s){const e=s.split(`
`),t=e.some(o=>gs.some(c=>c.test(o))),r=e.filter(o=>o.includes("	")).length>=Ln,a=/[A-Z]\.\s*[A-Za-zÀ-ÿ]+[A-Z]\.\s*[A-Za-zÀ-ÿ]+/.test(s);return t&&(r||a)}function Pn(s){if(!s||s.trim().length===0)return[];const e=[],t=/([a-zà-ÿ])([A-Z]\.)/g,a=s.replace(t,"$1|||$2").replace(/([a-zà-ÿ])([A-Z][a-zà-ÿ])/g,"$1|||$2").split("|||").filter(o=>o.trim().length>0);for(const o of a){const c=o.trim();c.length>=2&&e.push(c)}return e}function kn(s){if(!s||s.trim().length===0)return[];const e=[];let t=s;for(;t.length>0;){const n=t.match(/^(\d{1,2})\.(\d{1,2})\.((?:19|20)\d{2})/);if(n){e.push(n[0]),t=t.substring(n[0].length);continue}const r=t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2})/);if(r){e.push(r[0]),t=t.substring(r[0].length);continue}t=t.substring(1)}return e}const Di=["VTV","TV","VBC","BC","VC","SC","FC","STV","TSV","USC","US"],Fn=3;function $n(s){return s.replace(/aader\/ou\/o\s*B?\s*/gi," ").replace(/punkte[\s\S]*?punti\s*/i," ").replace(/\s+/g," ").trim()}function Hn(s){const t=s.trim().split(/\s+/);for(;t.length>1&&/^\d+$/.test(t[t.length-1]);)t.pop();return t.join(" ")}function zn(s,e,t){const n=s.substring(e+t.length).trim();let r=n.length;for(const o of Di){const c=n.toUpperCase().indexOf(` ${o} `);c>=0&&c<r&&(r=c)}const a=n.substring(0,r).trim();return Hn(`${t} ${a}`)}function Un(s,e,t){const n=e===0||/\s/.test(s[e-1]),r=e+t,a=r>=s.length||/\s/.test(s[r]);return n&&a}function qn(s){const e=$n(s),t=e.toUpperCase();for(const n of Di){const r=t.indexOf(n);if(r<0||!Un(e,r,n.length))continue;const a=zn(e,r,n);if(a.length>Fn)return a}return null}function Wn(s){return s.every(e=>gs.some(t=>t.test(e)))}function jn(s){const e=s.split(`
`);for(const t of e){if(!t.includes("	"))continue;const n=t.split("	").map(a=>a.trim());if(Wn(n))continue;const r=[];for(const a of n){const o=qn(a);o&&!r.includes(o)&&r.push(o)}if(r.length>=2)return{teamA:r[0],teamB:r[1]};if(r.length===1)return{teamA:r[0],teamB:""}}return{teamA:"",teamB:""}}const Xn=14,Gn=14,Yn=3,Zn=/^\d{1,2}\.\d{1,2}\.\d{2,4}$/,Vn=/^[A-Za-zÀ-ÿ]/,Pi=/^\d{1,2}$/;function Ds(s,e){let t=e,n="",r=null,a="";if(t<s.length&&Zn.test(s[t])&&(n=s[t],t++),t<s.length&&Pi.test(s[t])&&(r=parseInt(s[t],10),r>Oi&&(r=null),t++),t<s.length&&Vn.test(s[t])&&(a=s[t],t++),!a)return{player:null,nextIndex:t};const o=fs(a);return{player:{shirtNumber:r,lastName:o.lastName,firstName:o.firstName,displayName:o.displayName,rawName:a,licenseStatus:"",birthDate:n||void 0},nextIndex:t}}function Kn(s){const e=s.split("	").map(a=>a.trim()).filter(a=>a.length>0);if(e.length<Yn)return{teamA:null,teamB:null};let t=0;Pi.test(e[0])&&parseInt(e[0],10)<=Gn&&(t=1);const n=Ds(e,t);t=n.nextIndex;const r=Ds(e,t);return{teamA:n.player,teamB:r.player}}function Jn(s){const e=s.split("	").map(a=>a.trim()).filter(a=>a.length>0);let t=null,n=null,r=0;if(r<e.length){const a=e[r].toUpperCase();if(Qt.has(a)&&(r++,r<e.length&&/^[A-Za-zÀ-ÿ]/.test(e[r]))){const o=e[r],c=es(o);t={role:a,lastName:c.lastName,firstName:c.firstName,displayName:c.displayName,rawName:o},r++}}if(r<e.length){const a=e[r].toUpperCase();if(Qt.has(a)&&(r++,r<e.length&&/^[A-Za-zÀ-ÿ]/.test(e[r]))){const o=e[r],c=es(o);n={role:a,lastName:c.lastName,firstName:c.firstName,displayName:c.displayName,rawName:o},r++}}return{teamA:t,teamB:n}}const Qn=/[A-Z]\.\s*[A-Za-zÀ-ÿ]+[A-Z]\.\s*[A-Za-zÀ-ÿ]+/,er=/\d{1,2}\.\d{1,2}\.\d{2,4}.*\d{1,2}\.\d{1,2}\.\d{2,4}/,tr=/^[CA]C?\d?\t/i;function sr(s,e){const t=fs(s);return{shirtNumber:null,lastName:t.lastName,firstName:t.firstName,displayName:t.displayName,rawName:s,licenseStatus:"",birthDate:e}}function ir(s){const e=[],t=[],n=[],r=[],a=Math.ceil(s.length/2);for(let o=0;o<s.length;o++){const c=s[o],h=o<a;if(Qn.test(c)){const d=Pn(c);h?e.push(...d):t.push(...d)}if(er.test(c)){const d=kn(c);h?n.push(...d):r.push(...d)}}return{firstHalfNames:e,secondHalfNames:t,firstHalfDates:n,secondHalfDates:r}}function Ps(s,e,t){for(let n=0;n<e.length&&!(s.players.length>=Xn);n++){const r=sr(e[n],t[n]);s.players.push(r)}}function nr(s,e,t,n,r){if(e||tr.test(s)){const a=Jn(s);return a.teamA&&n.officials.push(a.teamA),a.teamB&&r.officials.push(a.teamB),!0}if(t){const a=Kn(s);return a.teamA&&n.players.push(a.teamA),a.teamB&&r.players.push(a.teamB),!0}return!1}function rr(s){return!!(In(s)||gs.some(e=>e.test(s))&&!s.includes("	"))}function ar(s){return ys(s)?"libero":bs(s)?"officials":_s(s)?"end":null}function or(s,e){const t=[];return s.players.length===0&&t.push("No players found for Team A"),e.players.length===0&&t.push("No players found for Team B"),s.officials.length===0&&e.officials.length===0&&t.push("No officials (coaches) found - the OFFICIAL MEMBERS section may not have been recognized"),t}function cr(s){const e=s.split(`
`).map(h=>h.trim()),t=jn(s),n={name:t.teamA,players:[],officials:[]},r={name:t.teamB,players:[],officials:[]};let a=!1,o=!1;for(const h of e){if(rr(h))continue;const d=ar(h);if(d==="end")break;if(d==="libero"){a=!0,o=!1;continue}if(d==="officials"){o=!0,a=!1;continue}if(!h.includes("	")||nr(h,o,a,n,r))continue;const m=h.split("	"),g=ir(m);Ps(n,g.firstHalfNames,g.firstHalfDates),Ps(r,g.secondHalfNames,g.secondHalfDates)}const c=or(n,r);return{teamA:n,teamB:r,warnings:c}}const ki=/^(\d{1,2})[\s.:_-]+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]*)/,Fi=/^([0-9OoIlZzSsGgBb]{1,2})[\s.:_-]+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]*)/,lr=/^(C|AC\d?)[\s.:_-]+([a-zà-ÿ][a-zà-ÿ\s]*)/i;function ur(s){const e=s.toUpperCase();return e.includes("TEAM A")||e.includes("TEAM B")||e.includes("ÉQUIPE A")||e.includes("ÉQUIPE B")||e.includes("MANNSCHAFT A")||e.includes("MANNSCHAFT B")||e.includes("HOME")||e.includes("AWAY")||e.includes("HEIM")||e.includes("GAST")}function ys(s){return s.toUpperCase().includes("LIBERO")}function bs(s){const e=s.toUpperCase();return e.includes("OFFICIAL")||e.startsWith("COACH")||/^TRAINER\b/.test(e)}function _s(s){const e=s.toUpperCase();return e.includes("SIGNATURE")||e.includes("CAPTAIN")||e.includes("REFEREE")||e.includes("ARBITRE")}function hr(s){let e=ki.exec(s);if(e||(e=Fi.exec(s)),!e)return null;const t=e[1],n=e[2].trim(),r=Rn(t);if(n.length<Ii)return null;const a=fs(n);return{shirtNumber:r,lastName:a.lastName,firstName:a.firstName,displayName:a.displayName,rawName:n,licenseStatus:""}}function ks(s){const e=lr.exec(s);if(!e)return null;const t=e[1].toUpperCase(),n=e[2].trim();if(!Qt.has(t)||n.length<Ii)return null;const r=es(n);return{role:t,lastName:r.lastName,firstName:r.firstName,displayName:r.displayName,rawName:n}}function $i(s){const e=s.trim();if(e.length<Is||ki.test(e)||Fi.test(e)||ys(e)||bs(e)||_s(e))return null;const t=(e.match(/[A-Za-zÀ-ÿ]/g)??[]).length;return t>=Is&&t/e.length>Sn?e:null}const dr=["TEAM A","ÉQUIPE A","MANNSCHAFT A","HOME","HEIM"],pr=["TEAM B","ÉQUIPE B","MANNSCHAFT B","AWAY","GAST"],mr=/TEAM\s*A|ÉQUIPE\s*A|MANNSCHAFT\s*A|HOME|HEIM/i,fr=/TEAM\s*B|ÉQUIPE\s*B|MANNSCHAFT\s*B|AWAY|GAST/i;function gr(s){return dr.some(e=>s.includes(e))}function yr(s){return pr.some(e=>s.includes(e))}function Fs(s,e){const t=s.replace(e,"").trim();return $i(t)??""}function br(s,e){const t=s.toUpperCase();if(gr(t)){const n=Fs(s,mr);return n&&(e.teamAName=n),{team:"A",isTeamA:!0}}if(yr(t)){const n=Fs(s,fr);return n&&(e.teamBName=n),{team:"B",isTeamA:!1}}return null}function _r(s){const e={teamALines:[],teamBLines:[],teamAName:"",teamBName:""};let t=null,n=!1;for(const r of s){const a=r.trim();if(a){if(ur(a)){const o=br(a,e);if(o){t=o.team,o.isTeamA&&(n=!0);continue}}if(!n&&!e.teamAName){const o=$i(a);if(o){e.teamAName=o,t="A";continue}}t===null&&(t="A"),t==="A"?e.teamALines.push(a):e.teamBLines.push(a)}}return e}function $s(s,e){const t={name:e,players:[],officials:[]},n=[];let r=!1;for(const a of s){if(bs(a)){r=!0;continue}if(_s(a))break;if(!ys(a))if(r){const o=ks(a);o&&t.officials.push(o)}else{const o=hr(a);if(o){t.players.push(o);continue}const c=ks(a);c&&t.officials.push(c)}}return{team:t,warnings:n}}function Ar(s){const e=[],t={name:"",players:[],officials:[]};if(!s||typeof s!="string")return e.push("No OCR text provided"),{teamA:{...t},teamB:{...t},warnings:e};const n=s.split(`
`).map(c=>c.trim()).filter(c=>c.length>0);if(n.length===0)return e.push("OCR text contains no lines"),{teamA:{...t},teamB:{...t},warnings:e};if(Dn(s))return cr(s);const r=_r(n),a=$s(r.teamALines,r.teamAName),o=$s(r.teamBLines,r.teamBName);return e.push(...a.warnings),e.push(...o.warnings),a.team.players.length===0&&e.push("No players found for Team A"),o.team.players.length===0&&r.teamBLines.length>0&&e.push("No players found for Team B"),{teamA:a.team,teamB:o.team,warnings:e}}const Lt=3,Hi=6,Er=2,vr=4,Cr=0,xr=1,Sr=2,wr=3,Nr=4,Tr=5,Mr=2,Rr=3,Lr=3,Br=3,ts=3,ss=99,Hs=new Set(["NOT","LFP","OK","NE","PEN"]),Or=5;function Ir(s){if(!s||s.includes("	"))return null;const t=s.trim().split(/\s+/);if(t.length<Or)return null;const n=t[0];if(!/^\d{1,2}$/.test(n))return null;const r=parseInt(n,10);if(r<1||r>ss)return null;let a=-1;for(let C=2;C<t.length-2;C++)if(Hs.has(t[C].toUpperCase())){a=C;break}if(a===-1)return null;const o=t[a],c=t.slice(1,a);if(c.length===0)return null;const h=t[a+1];if(!h||!/^\d{1,2}$/.test(h))return null;const d=parseInt(h,10);if(d<1||d>ss)return null;const m=t.slice(a+2);if(m.length===0)return null;const g=m[m.length-1];let A="",v=m;return Hs.has(g.toUpperCase())&&(A=g,v=m.slice(0,-1)),v.length===0?null:{teamAParts:[n,c.join(" "),o],teamBParts:[h,v.join(" "),A]}}function As(s){if(!s||s.includes("	"))return null;const e=s.trim(),t=e.search(/\s{3,}/);if(t===-1)return null;const n=e.slice(t).search(/\S/);if(n===-1)return null;const r=e.slice(0,t),a=e.slice(t+n),o=r.replace(/^[AB]\s+/,"").trim(),c=a.replace(/^[AB]\s+/,"").trim();return o.length>=ts&&c.length>=ts?[o,c]:null}function He(s){return s?s.toLowerCase().split(/[\s-]+/).map(e=>e.charAt(0).toUpperCase()+e.slice(1)).join(" "):""}function is(s){if(!s||typeof s!="string")return{lastName:"",firstName:"",displayName:""};const t=s.trim().split(/\s+/).filter(o=>o.length>0);if(t.length===0)return{lastName:"",firstName:"",displayName:""};if(t.length===1){const o=He(t[0]);return{lastName:o,firstName:"",displayName:o}}const n=He(t[0]),r=t.slice(1).map(He).join(" "),a=`${r} ${n}`;return{lastName:n,firstName:r,displayName:a}}function Dr(s){if(!s||typeof s!="string")return{lastName:"",firstName:"",displayName:""};const t=s.trim().split(/\s+/).filter(o=>o.length>0);if(t.length===0)return{lastName:"",firstName:"",displayName:""};if(t.length===1){const o=He(t[0]);return{lastName:o,firstName:"",displayName:o}}const n=He(t[t.length-1]),r=t.slice(0,-1).map(He).join(" "),a=`${r} ${n}`;return{lastName:n,firstName:r,displayName:a}}function Pr(s){if(!s||typeof s!="string")return null;const e=s.trim(),t=/^L\d?\s+(\d{1,2})$/.exec(e);return t?parseInt(t[1],10):null}function kr(s){if(!s||typeof s!="string")return{number:null,name:""};const e=s.trim(),t=/^(\d{1,2})\s+(\S[\s\S]*?)$/.exec(e);return t?{number:parseInt(t[1],10),name:t[2].trim()}:{number:null,name:e}}function Fr(s){const e=s.toUpperCase();return e.includes("OFFICIAL MEMBERS")||e.includes("ADMITTED ON THE BENCH")}function $r(s){const e=s.toUpperCase();return e.includes("SIGNATURES")||e.includes("TEAM CAPTAIN")}function Hr(s,e){return s.toUpperCase().includes("LIBERO")&&e.length<=2}const zr=new Set(["C","AC","AC2","AC3","AC4","M"]);function Ur(s){return zr.has(s.toUpperCase().trim())}function zs(s){const e=s.toUpperCase();return e.includes("LIBERO")||e.includes("N.")||e.includes("NAME OF THE PLAYER")}function qr(s){const e=/[a-zA-Z]{3,}/;return s.some(t=>e.test(t))}function Wr(s,e){const t=Math.max(0,e-Br);for(let n=e-1;n>=t;n--){const r=s[n];if(!r)continue;const a=r.split("	").filter(c=>c.trim().length>0);if(a.length>=2&&qr(a)||As(r))return n}return-1}function jr(s){const e=s.split("	");if(e.length<Lt)return!1;const t=e[0].trim();if(!/^\d{1,2}$/.test(t))return!1;const n=parseInt(t,10);if(n<1||n>ss)return!1;const r=e[1].trim();return/^[A-Z\s]+$/.test(r)&&r.length>ts}function Xr(s){for(let e=0;e<s.length;e++){const t=s[e];if(!t)continue;const n=t.toUpperCase();if(n.includes("NAME OF THE PLAYER")||n.includes("N.")&&n.includes("NAME"))return{startIndex:e+1,teamNamesIndex:Wr(s,e)}}for(let e=0;e<s.length;e++){const t=s[e];if(t&&jr(t))return{startIndex:e,teamNamesIndex:e-1}}return{startIndex:0,teamNamesIndex:-1}}function ze(s){return s.replace(/^[AB]\s+/,"").trim()}function Gr(s,e){if(e<0||e>=s.length)return{teamAName:"",teamBName:""};const t=s[e];if(!t)return{teamAName:"",teamBName:""};const n=t.split("	").map(a=>a.trim()).filter(a=>a.length>0);if(n.length>=2)return{teamAName:ze(n[0]),teamBName:ze(n[1])};const r=As(t);return r?{teamAName:r[0],teamBName:r[1]}:n.length===1?{teamAName:ze(n[0]),teamBName:""}:{teamAName:"",teamBName:""}}function Je(s,e){const t=s[e],n=s[e+1],r=s[e+2];if(!t||!n)return null;const a=parseInt(t,10);if(isNaN(a))return null;const o=is(n);return{shirtNumber:a,lastName:o.lastName,firstName:o.firstName,displayName:o.displayName,rawName:n,licenseStatus:r||""}}function Ut(s,e,t,n){const r=s[e],a=s[t];if(!r||!a)return null;const o=Pr(r);if(o===null){const h=kr(a);if(h.name){const d=is(h.name);return{shirtNumber:h.number,lastName:d.lastName,firstName:d.firstName,displayName:d.displayName,rawName:h.name,licenseStatus:s[n]||""}}return null}const c=is(a);return{shirtNumber:o,lastName:c.lastName,firstName:c.firstName,displayName:c.displayName,rawName:a,licenseStatus:s[n]||""}}function qt(s,e,t){const n=s[e],r=s[t];if(!n||!Ur(n)||!r)return null;const a=Dr(r);return{role:n.toUpperCase(),lastName:a.lastName,firstName:a.firstName,displayName:a.displayName,rawName:r}}function Es(s){return s.teamAColumnEnded||s.seenTwoColumnPlayers}function Yr(s,e,t){if(t.headerRowsParsed===0&&!zs(e)){if(s.length>=2)t.teamA.name=ze(s[0]),t.teamB.name=ze(s[1]);else if(s.length===1){const n=As(e);n?(t.teamA.name=n[0],t.teamB.name=n[1]):t.teamA.name=ze(s[0])}return t.headerRowsParsed++,"header"}return zs(e)?"players":(t.headerRowsParsed++,t.headerRowsParsed>Lr?"players":"header")}function Zr(s,e,t){if(s.length<Lt){const r=Ir(e);if(r){t.seenTwoColumnPlayers=!0;const a=Je(r.teamAParts,0);a&&t.teamA.players.push(a);const o=Je(r.teamBParts,0);o&&t.teamB.players.push(o)}return}if(s.length>=Hi){t.seenTwoColumnPlayers=!0;const r=Je(s,0);r&&t.teamA.players.push(r);const a=Je(s,Lt);a&&t.teamB.players.push(a)}else{const r=Je(s,0);r&&(Es(t)?(t.teamAColumnEnded=!0,t.teamB.players.push(r)):t.teamA.players.push(r))}}function Vr(s,e){if(s.length<Lt)return;if(s.length>=Hi){const n=Ut(s,Cr,xr,Sr);n&&e.teamA.players.push(n);const r=Ut(s,wr,Nr,Tr);r&&e.teamB.players.push(r)}else{const n=Ut(s,0,1,2);n&&(Es(e)?e.teamB.players.push(n):e.teamA.players.push(n))}}function Kr(s,e){if(s.length<Er)return;if(s.length>=vr){const n=qt(s,0,1);n&&e.teamA.officials.push(n);const r=qt(s,Mr,Rr);r&&e.teamB.officials.push(r)}else{const n=qt(s,0,1);n&&(Es(e)?e.teamB.officials.push(n):e.teamA.officials.push(n))}}function Jr(s,e){if($r(s)){e.section="done";return}if(e.section==="done")return;if(Fr(s)){e.section="officials";return}const t=s.split("	").map(n=>n.trim());if(Hr(s,t)){e.section="libero";return}switch(e.section){case"header":e.section=Yr(t,s,e);break;case"players":Zr(t,s,e);break;case"libero":Vr(t,e);break;case"officials":Kr(t,e);break}}function Qr(s){const e=[],t={section:"header",headerRowsParsed:0,teamA:{name:"",players:[],officials:[]},teamB:{name:"",players:[],officials:[]},seenTwoColumnPlayers:!1,teamAColumnEnded:!1};if(!s||typeof s!="string")return e.push("No OCR text provided"),{teamA:t.teamA,teamB:t.teamB,warnings:e};const n=s.split(`
`).map(m=>m.trim()).filter(m=>m.length>0),{startIndex:r,teamNamesIndex:a}=Xr(n);r>0&&e.push(`Skipped ${r} lines of non-player data (score/set information)`);const{teamAName:o,teamBName:c}=Gr(n,a);t.teamA.name=o,t.teamB.name=c;const h=o.length>0||c.length>0;t.section=h?"players":"header";const d=n.slice(r);if(d.length===0)return e.push("OCR text contains no lines"),{teamA:t.teamA,teamB:t.teamB,warnings:e};for(const m of d)Jr(m,t);return t.teamA.players.length===0&&e.push("No players found for Team A"),t.teamB.players.length===0&&e.push("No players found for Team B"),t.teamA.officials.length===0&&t.teamB.officials.length===0&&e.push("No officials (coaches) found - the OFFICIAL MEMBERS section may not have been recognized"),{teamA:t.teamA,teamB:t.teamB,warnings:e}}function ns(s){return s.players}function rs(s){return s.officials}function ea(s,e){return((e==null?void 0:e.type)??"electronic")==="manuscript"?Ar(s):ta(s)}const ta=Qr;function sa(s){return Array.isArray?Array.isArray(s):zi(s)==="[object Array]"}function ia(s){if(typeof s=="string")return s;let e=s+"";return e=="0"&&1/s==-1/0?"-0":e}function na(s){return s==null?"":ia(s)}function Us(s){return typeof s=="string"}function ra(s){return typeof s=="number"}function aa(s){return s===!0||s===!1||ca(s)&&zi(s)=="[object Boolean]"}function oa(s){return typeof s=="object"}function ca(s){return oa(s)&&s!==null}function qs(s){return s!=null}function zi(s){return s==null?s===void 0?"[object Undefined]":"[object Null]":Object.prototype.toString.call(s)}const la=s=>`Pattern length exceeds max of ${s}.`;function ua(s,e){let t=[],n=!1;const r=(a,o,c)=>{if(qs(a))if(!o[c])t.push(a);else{let h=o[c];const d=a[h];if(!qs(d))return;if(c===o.length-1&&(Us(d)||ra(d)||aa(d)))t.push(na(d));else if(sa(d)){n=!0;for(let m=0,g=d.length;m<g;m+=1)r(d[m],o,c+1)}else o.length&&r(d,o,c+1)}};return r(s,Us(e)?e.split("."):e,0),n?t:t[0]}const ha={includeMatches:!1,findAllMatches:!1,minMatchCharLength:1},da={isCaseSensitive:!1,ignoreDiacritics:!1,includeScore:!1,keys:[],shouldSort:!0,sortFn:(s,e)=>s.score===e.score?s.idx<e.idx?-1:1:s.score<e.score?-1:1},pa={location:0,threshold:.6,distance:100},ma={useExtendedSearch:!1,getFn:ua,ignoreLocation:!1,ignoreFieldNorm:!1,fieldNormWeight:1};var _={...da,...ha,...pa,...ma};function bt(s,{errors:e=0,currentLocation:t=0,expectedLocation:n=0,distance:r=_.distance,ignoreLocation:a=_.ignoreLocation}={}){const o=e/s.length;if(a)return o;const c=Math.abs(n-t);return r?o+c/r:c?1:o}function fa(s=[],e=_.minMatchCharLength){let t=[],n=-1,r=-1,a=0;for(let o=s.length;a<o;a+=1){let c=s[a];c&&n===-1?n=a:!c&&n!==-1&&(r=a-1,r-n+1>=e&&t.push([n,r]),n=-1)}return s[a-1]&&a-n>=e&&t.push([n,a-1]),t}const Ne=32;function ga(s,e,t,{location:n=_.location,distance:r=_.distance,threshold:a=_.threshold,findAllMatches:o=_.findAllMatches,minMatchCharLength:c=_.minMatchCharLength,includeMatches:h=_.includeMatches,ignoreLocation:d=_.ignoreLocation}={}){if(e.length>Ne)throw new Error(la(Ne));const m=e.length,g=s.length,A=Math.max(0,Math.min(n,g));let v=a,C=A;const w=c>1||h,U=w?Array(g):[];let de;for(;(de=s.indexOf(e,C))>-1;){let F=bt(e,{currentLocation:de,expectedLocation:A,distance:r,ignoreLocation:d});if(v=Math.min(F,v),C=de+m,w){let pe=0;for(;pe<m;)U[de+pe]=1,pe+=1}}C=-1;let ie=[],Pe=1,Se=m+g;const rn=1<<m-1;for(let F=0;F<m;F+=1){let pe=0,me=Se;for(;pe<me;)bt(e,{errors:F,currentLocation:A+me,expectedLocation:A,distance:r,ignoreLocation:d})<=v?pe=me:Se=me,me=Math.floor((Se-pe)/2+pe);Se=me;let vs=Math.max(1,A-me+1),kt=o?g:Math.min(A+me,g)+m,ke=Array(kt+2);ke[kt+1]=(1<<F)-1;for(let q=kt;q>=vs;q-=1){let yt=q-1,Cs=t[s.charAt(yt)];if(w&&(U[yt]=+!!Cs),ke[q]=(ke[q+1]<<1|1)&Cs,F&&(ke[q]|=(ie[q+1]|ie[q])<<1|1|ie[q+1]),ke[q]&rn&&(Pe=bt(e,{errors:F,currentLocation:yt,expectedLocation:A,distance:r,ignoreLocation:d}),Pe<=v)){if(v=Pe,C=yt,C<=A)break;vs=Math.max(1,2*A-C)}}if(bt(e,{errors:F+1,currentLocation:A,expectedLocation:A,distance:r,ignoreLocation:d})>v)break;ie=ke}const Pt={isMatch:C>=0,score:Math.max(.001,Pe)};if(w){const F=fa(U,c);F.length?h&&(Pt.indices=F):Pt.isMatch=!1}return Pt}function ya(s){let e={};for(let t=0,n=s.length;t<n;t+=1){const r=s.charAt(t);e[r]=(e[r]||0)|1<<n-t-1}return e}const Bt=String.prototype.normalize?(s=>s.normalize("NFD").replace(/[\u0300-\u036F\u0483-\u0489\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0711\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F3\u07FD\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u08D3-\u08E1\u08E3-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u09FE\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A70\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0AFA-\u0AFF\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B62\u0B63\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0C00-\u0C04\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C81-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0D00-\u0D03\u0D3B\u0D3C\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D82\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EB9\u0EBB\u0EBC\u0EC8-\u0ECD\u0F18\u0F19\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109D\u135D-\u135F\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u180B-\u180D\u1885\u1886\u18A9\u1920-\u192B\u1930-\u193B\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F\u1AB0-\u1ABE\u1B00-\u1B04\u1B34-\u1B44\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BE6-\u1BF3\u1C24-\u1C37\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF2-\u1CF4\u1CF7-\u1CF9\u1DC0-\u1DF9\u1DFB-\u1DFF\u20D0-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\uA66F-\uA672\uA674-\uA67D\uA69E\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA880\uA881\uA8B4-\uA8C5\uA8E0-\uA8F1\uA8FF\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uA9E5\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uFB1E\uFE00-\uFE0F\uFE20-\uFE2F]/g,"")):(s=>s);class ba{constructor(e,{location:t=_.location,threshold:n=_.threshold,distance:r=_.distance,includeMatches:a=_.includeMatches,findAllMatches:o=_.findAllMatches,minMatchCharLength:c=_.minMatchCharLength,isCaseSensitive:h=_.isCaseSensitive,ignoreDiacritics:d=_.ignoreDiacritics,ignoreLocation:m=_.ignoreLocation}={}){if(this.options={location:t,threshold:n,distance:r,includeMatches:a,findAllMatches:o,minMatchCharLength:c,isCaseSensitive:h,ignoreDiacritics:d,ignoreLocation:m},e=h?e:e.toLowerCase(),e=d?Bt(e):e,this.pattern=e,this.chunks=[],!this.pattern.length)return;const g=(v,C)=>{this.chunks.push({pattern:v,alphabet:ya(v),startIndex:C})},A=this.pattern.length;if(A>Ne){let v=0;const C=A%Ne,w=A-C;for(;v<w;)g(this.pattern.substr(v,Ne),v),v+=Ne;if(C){const U=A-Ne;g(this.pattern.substr(U),U)}}else g(this.pattern,0)}searchIn(e){const{isCaseSensitive:t,ignoreDiacritics:n,includeMatches:r}=this.options;if(e=t?e:e.toLowerCase(),e=n?Bt(e):e,this.pattern===e){let w={isMatch:!0,score:0};return r&&(w.indices=[[0,e.length-1]]),w}const{location:a,distance:o,threshold:c,findAllMatches:h,minMatchCharLength:d,ignoreLocation:m}=this.options;let g=[],A=0,v=!1;this.chunks.forEach(({pattern:w,alphabet:U,startIndex:de})=>{const{isMatch:ie,score:Pe,indices:Se}=ga(e,w,U,{location:a+de,distance:o,threshold:c,findAllMatches:h,minMatchCharLength:d,includeMatches:r,ignoreLocation:m});ie&&(v=!0),A+=Pe,ie&&Se&&(g=[...g,...Se])});let C={isMatch:v,score:v?A/this.chunks.length:1};return v&&r&&(C.indices=g),C}}class xe{constructor(e){this.pattern=e}static isMultiMatch(e){return Ws(e,this.multiRegex)}static isSingleMatch(e){return Ws(e,this.singleRegex)}search(){}}function Ws(s,e){const t=s.match(e);return t?t[1]:null}class _a extends xe{constructor(e){super(e)}static get type(){return"exact"}static get multiRegex(){return/^="(.*)"$/}static get singleRegex(){return/^=(.*)$/}search(e){const t=e===this.pattern;return{isMatch:t,score:t?0:1,indices:[0,this.pattern.length-1]}}}class Aa extends xe{constructor(e){super(e)}static get type(){return"inverse-exact"}static get multiRegex(){return/^!"(.*)"$/}static get singleRegex(){return/^!(.*)$/}search(e){const n=e.indexOf(this.pattern)===-1;return{isMatch:n,score:n?0:1,indices:[0,e.length-1]}}}class Ea extends xe{constructor(e){super(e)}static get type(){return"prefix-exact"}static get multiRegex(){return/^\^"(.*)"$/}static get singleRegex(){return/^\^(.*)$/}search(e){const t=e.startsWith(this.pattern);return{isMatch:t,score:t?0:1,indices:[0,this.pattern.length-1]}}}class va extends xe{constructor(e){super(e)}static get type(){return"inverse-prefix-exact"}static get multiRegex(){return/^!\^"(.*)"$/}static get singleRegex(){return/^!\^(.*)$/}search(e){const t=!e.startsWith(this.pattern);return{isMatch:t,score:t?0:1,indices:[0,e.length-1]}}}class Ca extends xe{constructor(e){super(e)}static get type(){return"suffix-exact"}static get multiRegex(){return/^"(.*)"\$$/}static get singleRegex(){return/^(.*)\$$/}search(e){const t=e.endsWith(this.pattern);return{isMatch:t,score:t?0:1,indices:[e.length-this.pattern.length,e.length-1]}}}class xa extends xe{constructor(e){super(e)}static get type(){return"inverse-suffix-exact"}static get multiRegex(){return/^!"(.*)"\$$/}static get singleRegex(){return/^!(.*)\$$/}search(e){const t=!e.endsWith(this.pattern);return{isMatch:t,score:t?0:1,indices:[0,e.length-1]}}}class Ui extends xe{constructor(e,{location:t=_.location,threshold:n=_.threshold,distance:r=_.distance,includeMatches:a=_.includeMatches,findAllMatches:o=_.findAllMatches,minMatchCharLength:c=_.minMatchCharLength,isCaseSensitive:h=_.isCaseSensitive,ignoreDiacritics:d=_.ignoreDiacritics,ignoreLocation:m=_.ignoreLocation}={}){super(e),this._bitapSearch=new ba(e,{location:t,threshold:n,distance:r,includeMatches:a,findAllMatches:o,minMatchCharLength:c,isCaseSensitive:h,ignoreDiacritics:d,ignoreLocation:m})}static get type(){return"fuzzy"}static get multiRegex(){return/^"(.*)"$/}static get singleRegex(){return/^(.*)$/}search(e){return this._bitapSearch.searchIn(e)}}class qi extends xe{constructor(e){super(e)}static get type(){return"include"}static get multiRegex(){return/^'"(.*)"$/}static get singleRegex(){return/^'(.*)$/}search(e){let t=0,n;const r=[],a=this.pattern.length;for(;(n=e.indexOf(this.pattern,t))>-1;)t=n+a,r.push([n,t-1]);const o=!!r.length;return{isMatch:o,score:o?0:1,indices:r}}}const as=[_a,qi,Ea,va,xa,Ca,Aa,Ui],js=as.length,Sa=/ +(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/,wa="|";function Na(s,e={}){return s.split(wa).map(t=>{let n=t.trim().split(Sa).filter(a=>a&&!!a.trim()),r=[];for(let a=0,o=n.length;a<o;a+=1){const c=n[a];let h=!1,d=-1;for(;!h&&++d<js;){const m=as[d];let g=m.isMultiMatch(c);g&&(r.push(new m(g,e)),h=!0)}if(!h)for(d=-1;++d<js;){const m=as[d];let g=m.isSingleMatch(c);if(g){r.push(new m(g,e));break}}}return r})}const Ta=new Set([Ui.type,qi.type]);class Ma{constructor(e,{isCaseSensitive:t=_.isCaseSensitive,ignoreDiacritics:n=_.ignoreDiacritics,includeMatches:r=_.includeMatches,minMatchCharLength:a=_.minMatchCharLength,ignoreLocation:o=_.ignoreLocation,findAllMatches:c=_.findAllMatches,location:h=_.location,threshold:d=_.threshold,distance:m=_.distance}={}){this.query=null,this.options={isCaseSensitive:t,ignoreDiacritics:n,includeMatches:r,minMatchCharLength:a,findAllMatches:c,ignoreLocation:o,location:h,threshold:d,distance:m},e=t?e:e.toLowerCase(),e=n?Bt(e):e,this.pattern=e,this.query=Na(this.pattern,this.options)}static condition(e,t){return t.useExtendedSearch}searchIn(e){const t=this.query;if(!t)return{isMatch:!1,score:1};const{includeMatches:n,isCaseSensitive:r,ignoreDiacritics:a}=this.options;e=r?e:e.toLowerCase(),e=a?Bt(e):e;let o=0,c=[],h=0;for(let d=0,m=t.length;d<m;d+=1){const g=t[d];c.length=0,o=0;for(let A=0,v=g.length;A<v;A+=1){const C=g[A],{isMatch:w,indices:U,score:de}=C.search(e);if(w){if(o+=1,h+=de,n){const ie=C.constructor.type;Ta.has(ie)?c=[...c,...U]:c.push(U)}}else{h=0,o=0,c.length=0;break}}if(o){let A={isMatch:!0,score:h/o};return n&&(A.indices=c),A}}return{isMatch:!1,score:1}}}const Ra=[];function La(...s){Ra.push(...s)}La(Ma);function Ba(s,e){return ea(s,e)}function se(s){const e=document.createElement("div");return e.textContent=s,e.innerHTML}const Xs={C:"Coach",AC:"Asst. Coach",AC2:"Asst. Coach 2",AC3:"Asst. Coach 3",AC4:"Asst. Coach 4",M:"Manager"};function Gs(s,e=!1){const t=s.shirtNumber!==null?`<span class="roster-display__number">${se(String(s.shirtNumber))}</span>`:'<span class="roster-display__number roster-display__number--missing">?</span>',n=e?'<span class="roster-display__libero-tag">L</span>':"",r=s.licenseStatus&&s.licenseStatus!=="OK"?`<span class="roster-display__license roster-display__license--${s.licenseStatus.toLowerCase()}">${se(s.licenseStatus)}</span>`:"";return`
    <div class="roster-display__row">
      ${t}
      ${n}
      <span class="roster-display__name">${se(s.displayName)}</span>
      ${r}
    </div>
  `}function Oa(s){const e=s.role?`<span class="roster-display__role-badge">${se(s.role)}</span>`:"",t=s.role&&Xs[s.role]?`<span class="roster-display__role-name">${se(Xs[s.role])}</span>`:"";return`
    <div class="roster-display__row roster-display__row--official">
      ${e}
      <span class="roster-display__name">${se(s.displayName)}</span>
      ${t}
    </div>
  `}function Ys({team:s,label:e,playersExpanded:t,officialsExpanded:n,panelId:r}){const a=ns(s),o=rs(s),c=s.players||[],h=s.liberos||[],d=c.map(C=>Gs(C,!1)).join(""),m=h.map(C=>Gs(C,!0)).join(""),g=o.map(C=>Oa(C)).join(""),A=o.length>0,v=s.name||"Unknown Team";return`
    <div class="roster-display__panel" data-panel-id="${r}">
      <div class="roster-display__panel-header">
        <h3 class="roster-display__panel-title">${se(e)}</h3>
        <div class="roster-display__team-name">${se(v)}</div>
      </div>

      <!-- Players Section -->
      <div class="roster-display__section">
        <button
          type="button"
          class="roster-display__section-header"
          aria-expanded="${t}"
          aria-controls="${r}-players"
          data-section="players"
        >
          <span class="roster-display__section-toggle">${t?"▼":"▶"}</span>
          <span class="roster-display__section-title">Players</span>
          <span class="roster-display__section-count">${a.length} players</span>
        </button>
        <div
          id="${r}-players"
          class="roster-display__section-content"
          ${t?"":"hidden"}
        >
          ${a.length>0?`
            <div class="roster-display__list">
              ${d}
              ${m}
            </div>
          `:`
            <div class="roster-display__empty">No players detected</div>
          `}
        </div>
      </div>

      <!-- Officials Section -->
      ${A?`
        <div class="roster-display__section">
          <button
            type="button"
            class="roster-display__section-header"
            aria-expanded="${n}"
            aria-controls="${r}-officials"
            data-section="officials"
          >
            <span class="roster-display__section-toggle">${n?"▼":"▶"}</span>
            <span class="roster-display__section-title">Officials</span>
            <span class="roster-display__section-count">${o.length} officials</span>
          </button>
          <div
            id="${r}-officials"
            class="roster-display__section-content"
            ${n?"":"hidden"}
          >
            <div class="roster-display__list">
              ${g}
            </div>
          </div>
        </div>
      `:""}
    </div>
  `}const Wi=2e3;async function Ia(s){try{return await navigator.clipboard.writeText(s),!0}catch{return!1}}async function Wt(s,e,t){await Ia(e)&&(s.textContent="✓ Copied!",setTimeout(()=>{s.textContent=t},Wi))}class Da{constructor({container:e,ocrText:t,ocrResult:n=null,sheetType:r="electronic",isManuscript:a=!1,onBack:o}){this.container=e,this.ocrText=t,this.ocrResult=n,this.sheetType=r,this.isManuscript=a,this.onBack=o,this.parsed=null,this.expandedState={playersA:!0,officialsA:!1,playersB:!0,officialsB:!1},this.initialize()}initialize(){const e=this.isManuscript?"manuscript":"electronic";this.parsed=Ba(this.ocrText,{type:e}),this.render(),this.bindEvents()}render(){if(!this.parsed){this.container.innerHTML=`
        <div class="roster-display__error">
          <p>Failed to parse scoresheet</p>
        </div>
      `;return}const e=this.parsed.warnings.length>0?`
        <div class="roster-display__warnings">
          ${this.parsed.warnings.map(h=>`<p class="roster-display__warning">⚠ ${se(h)}</p>`).join("")}
        </div>
      `:"",t=ns(this.parsed.teamA),n=ns(this.parsed.teamB),r=rs(this.parsed.teamA),a=rs(this.parsed.teamB),o=t.length+n.length,c=r.length+a.length;this.container.innerHTML=`
      <div class="roster-display">
        <div class="roster-display__intro">
          <p class="text-muted">
            OCR parsed roster data. Use this to debug recognition issues.
            ${this.isManuscript?"<br><em>Manuscript parser with OCR error correction enabled.</em>":""}
          </p>
        </div>

        <!-- Summary stats -->
        <div class="roster-display__summary">
          <div class="roster-display__stat">
            <span class="roster-display__stat-value">${o}</span>
            <span class="roster-display__stat-label">Players</span>
          </div>
          <div class="roster-display__stat">
            <span class="roster-display__stat-value">${c}</span>
            <span class="roster-display__stat-label">Officials</span>
          </div>
        </div>

        ${e}

        <div class="roster-display__panels">
          ${Ys({team:this.parsed.teamA,label:"Team A (Left Column)",playersExpanded:this.expandedState.playersA,officialsExpanded:this.expandedState.officialsA,panelId:"team-a"})}
          ${Ys({team:this.parsed.teamB,label:"Team B (Right Column)",playersExpanded:this.expandedState.playersB,officialsExpanded:this.expandedState.officialsB,panelId:"team-b"})}
        </div>

        <!-- Debug Data Export Panel -->
        <details class="roster-display__debug-panel">
          <summary class="roster-display__debug-summary">📊 Debug Data Export</summary>
          <div class="roster-display__debug-content">
            <div class="flex flex-col gap-sm">
              <button class="btn btn-outline btn-block" id="btn-copy-parsed-json" aria-label="Copy parsed roster JSON to clipboard">
                Copy Parsed Roster (JSON)
              </button>
              <button class="btn btn-outline btn-block" id="btn-copy-ocr-text" aria-label="Copy raw OCR text to clipboard">
                Copy Raw OCR Text
              </button>
              ${this.ocrResult?`
                <button class="btn btn-outline btn-block" id="btn-copy-full-json" aria-label="Copy full OCR result JSON to clipboard">
                  Copy Full OCR Result (JSON)
                </button>
              `:""}
              <button class="btn btn-outline btn-block" id="btn-log-to-console" aria-label="Log all data to browser console">
                Log to Console
              </button>
            </div>
            <details class="roster-display__raw-text-panel mt-md">
              <summary class="roster-display__debug-summary">View Raw OCR Text</summary>
              <pre class="roster-display__raw-text">${se(this.ocrText)}</pre>
            </details>
          </div>
        </details>

        ${this.onBack?`
          <button class="btn btn-secondary btn-block mt-lg" id="btn-back-to-results">
            Back to OCR Results
          </button>
        `:""}
      </div>
    `}bindEvents(){if(this.onBack){const a=this.container.querySelector("#btn-back-to-results");a==null||a.addEventListener("click",()=>{var o;return(o=this.onBack)==null?void 0:o.call(this)})}const e=this.container.querySelector("#btn-copy-parsed-json");e==null||e.addEventListener("click",async()=>{const a=JSON.stringify(this.parsed,null,2);await Wt(e,a,"Copy Parsed Roster (JSON)")});const t=this.container.querySelector("#btn-copy-ocr-text");t==null||t.addEventListener("click",async()=>{await Wt(t,this.ocrText,"Copy Raw OCR Text")});const n=this.container.querySelector("#btn-copy-full-json");n==null||n.addEventListener("click",async()=>{if(this.ocrResult){const a=JSON.stringify(this.ocrResult,null,2);await Wt(n,a,"Copy Full OCR Result (JSON)")}});const r=this.container.querySelector("#btn-log-to-console");r==null||r.addEventListener("click",()=>{console.log("=== OCR Debug Data ==="),console.log("Sheet Type:",this.sheetType),console.log("Is Manuscript:",this.isManuscript),console.log(""),console.log("--- Raw OCR Text ---"),console.log(this.ocrText),console.log(""),console.log("--- Parsed Roster ---"),console.log(this.parsed),this.ocrResult&&(console.log(""),console.log("--- Full OCR Result ---"),console.log(this.ocrResult)),console.log("=== End OCR Debug Data ==="),r.textContent="✓ Logged!",setTimeout(()=>{r.textContent="Log to Console"},Wi)}),this.container.querySelectorAll(".roster-display__section-header").forEach(a=>{a.addEventListener("click",o=>{const c=o.currentTarget,h=c.dataset.section,d=c.closest(".roster-display__panel"),m=d==null?void 0:d.dataset.panelId,g=c.getAttribute("aria-controls"),A=this.container.querySelector(`#${g}`),v=c.querySelector(".roster-display__section-toggle");if(!A||!v)return;const w=!(c.getAttribute("aria-expanded")==="true");m==="team-a"&&h==="players"?this.expandedState.playersA=w:m==="team-a"&&h==="officials"?this.expandedState.officialsA=w:m==="team-b"&&h==="players"?this.expandedState.playersB=w:m==="team-b"&&h==="officials"&&(this.expandedState.officialsB=w),c.setAttribute("aria-expanded",String(w)),v.textContent=w?"▼":"▶",w?A.removeAttribute("hidden"):A.setAttribute("hidden","")})})}destroy(){this.container.innerHTML=""}}const Pa=.92,ka=100,_t=10,At=10,Fa={both:{x:.5,y:.55,width:.48,height:.42,label:"Both Teams",aspectRatio:1.15},teamA:{x:.5,y:.55,width:.48,height:.2,label:"Team A (Home)",aspectRatio:2.4},teamB:{x:.5,y:.76,width:.48,height:.2,label:"Team B (Away)",aspectRatio:2.4}};var N,Dt,le,lt,ut,k,Ee,J,z,T,R,b,ve,ue,Ze,M,Ce,Q,Ve,f,ji,Xi,Gi,cs,Yi,Ct,Zi,ls,xt,us,hs,ds,ht,dt,ps,Vi,pt,mt,ft,Ki,St,ms,Ji,gt,Qi;const et=class et{constructor({container:e,imageBlob:t,initialPreset:n="both",onConfirm:r,onCancel:a}){p(this,f);p(this,N);p(this,Dt);p(this,le);p(this,lt);p(this,ut);p(this,k,null);p(this,Ee,null);p(this,J,{width:0,height:0});p(this,z,{width:0,height:0});p(this,T,{x:0,y:0});p(this,R,{width:0,height:0});p(this,b,{x:0,y:0,width:0,height:0});p(this,ve,!1);p(this,ue,null);p(this,Ze,{x:0,y:0});p(this,M,{x:0,y:0,width:0,height:0});p(this,Ce,!1);p(this,Q,null);p(this,Ve,null);p(this,ht,e=>{i(this,ve)&&l(this,f,ps).call(this,e.clientX,e.clientY)});p(this,dt,e=>{i(this,ve)&&e.touches.length===1&&(e.preventDefault(),l(this,f,ps).call(this,e.touches[0].clientX,e.touches[0].clientY))});p(this,pt,()=>{u(this,ve,!1),u(this,ue,null)});p(this,mt,()=>{u(this,ve,!1),u(this,ue,null)});p(this,ft,()=>{i(this,Q)!==null&&clearTimeout(i(this,Q)),u(this,Q,window.setTimeout(()=>{u(this,Q,null),i(this,Ce)||(l(this,f,cs).call(this),l(this,f,Ct).call(this,i(this,le)))},ka))});p(this,gt,e=>{if(e.key!=="Tab")return;const t=l(this,f,ms).call(this);if(t.length===0)return;const n=t[0],r=t[t.length-1];e.shiftKey?document.activeElement===n&&(e.preventDefault(),r.focus()):document.activeElement===r&&(e.preventDefault(),n.focus())});u(this,N,e),u(this,Dt,t),u(this,le,n),u(this,lt,r),u(this,ut,a),u(this,Ve,document.activeElement),u(this,Ee,URL.createObjectURL(t)),l(this,f,ji).call(this),l(this,f,Gi).call(this),l(this,f,Ji).call(this),window.addEventListener("resize",i(this,ft))}destroy(){u(this,Ce,!0),i(this,Q)!==null&&(clearTimeout(i(this,Q)),u(this,Q,null));const e=i(this,N).querySelector(".roster-crop-editor");e&&e.removeEventListener("keydown",i(this,gt)),i(this,Ve)instanceof HTMLElement&&i(this,Ve).focus(),window.removeEventListener("resize",i(this,ft)),document.removeEventListener("mousemove",i(this,ht)),document.removeEventListener("mouseup",i(this,pt)),document.removeEventListener("touchmove",i(this,dt)),document.removeEventListener("touchend",i(this,mt)),i(this,Ee)&&(URL.revokeObjectURL(i(this,Ee)),u(this,Ee,null)),i(this,N).innerHTML=""}};N=new WeakMap,Dt=new WeakMap,le=new WeakMap,lt=new WeakMap,ut=new WeakMap,k=new WeakMap,Ee=new WeakMap,J=new WeakMap,z=new WeakMap,T=new WeakMap,R=new WeakMap,b=new WeakMap,ve=new WeakMap,ue=new WeakMap,Ze=new WeakMap,M=new WeakMap,Ce=new WeakMap,Q=new WeakMap,Ve=new WeakMap,f=new WeakSet,ji=function(){i(this,N).innerHTML=`
      <div class="roster-crop-editor" role="dialog" aria-modal="true" aria-label="Roster crop editor">
        <div class="roster-crop-editor__header">
          <h3 class="roster-crop-editor__title">Select Roster Area</h3>
          <p class="roster-crop-editor__hint">Adjust the selection to include only the player roster</p>
        </div>

        <div class="roster-crop-editor__presets" role="tablist" aria-label="Roster preset selection">
          <button
            type="button"
            class="roster-crop-editor__preset-btn"
            data-preset="both"
            role="tab"
            aria-selected="true"
          >
            Both Teams
          </button>
          <button
            type="button"
            class="roster-crop-editor__preset-btn"
            data-preset="teamA"
            role="tab"
            aria-selected="false"
          >
            Team A
          </button>
          <button
            type="button"
            class="roster-crop-editor__preset-btn"
            data-preset="teamB"
            role="tab"
            aria-selected="false"
          >
            Team B
          </button>
        </div>

        <div class="roster-crop-editor__viewport" id="crop-viewport">
          <img
            class="roster-crop-editor__image"
            id="crop-image"
            alt="Scoresheet to crop"
            draggable="false"
          />
          <div class="roster-crop-editor__overlay">
            <div
              class="roster-crop-editor__crop-area"
              id="crop-area"
              tabindex="0"
              role="application"
              aria-label="Crop area. Use arrow keys to move, Shift+arrow keys to resize."
            >
              <div class="roster-crop-editor__handle roster-crop-editor__handle--tl" data-handle="resize-tl"></div>
              <div class="roster-crop-editor__handle roster-crop-editor__handle--tr" data-handle="resize-tr"></div>
              <div class="roster-crop-editor__handle roster-crop-editor__handle--bl" data-handle="resize-bl"></div>
              <div class="roster-crop-editor__handle roster-crop-editor__handle--br" data-handle="resize-br"></div>
            </div>
          </div>
        </div>

        <div class="roster-crop-editor__controls">
          <button
            type="button"
            class="btn btn-secondary roster-crop-editor__btn"
            id="btn-crop-cancel"
            aria-label="Cancel cropping"
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary roster-crop-editor__btn"
            id="btn-crop-confirm"
            aria-label="Confirm crop and continue to OCR"
          >
            Crop & Run OCR
          </button>
        </div>
      </div>
    `,l(this,f,Xi).call(this),l(this,f,ls).call(this)},Xi=function(){const e=i(this,N).querySelector("#crop-area"),t=i(this,N).querySelector("#btn-crop-cancel"),n=i(this,N).querySelector("#btn-crop-confirm");i(this,N).querySelectorAll(".roster-crop-editor__preset-btn").forEach(o=>{o.addEventListener("click",()=>{const c=o.getAttribute("data-preset");c&&l(this,f,Zi).call(this,c)})}),e==null||e.addEventListener("mousedown",o=>l(this,f,us).call(this,o,"move")),e==null||e.addEventListener("touchstart",o=>l(this,f,hs).call(this,o,"move"),{passive:!1}),e==null||e.addEventListener("keydown",o=>l(this,f,Ki).call(this,o)),i(this,N).querySelectorAll(".roster-crop-editor__handle").forEach(o=>{const c=o.getAttribute("data-handle");o.addEventListener("mousedown",h=>{h.stopPropagation(),l(this,f,us).call(this,h,c)}),o.addEventListener("touchstart",h=>{h.stopPropagation(),l(this,f,hs).call(this,h,c)},{passive:!1})}),document.addEventListener("mousemove",i(this,ht)),document.addEventListener("mouseup",i(this,pt)),document.addEventListener("touchmove",i(this,dt),{passive:!1}),document.addEventListener("touchend",i(this,mt)),t==null||t.addEventListener("click",()=>i(this,ut).call(this)),n==null||n.addEventListener("click",()=>l(this,f,Qi).call(this))},Gi=async function(){u(this,k,i(this,N).querySelector("#crop-image")),i(this,k)&&(i(this,k).src=i(this,Ee)||"",i(this,k).complete||await new Promise((e,t)=>{var a,o;if(i(this,Ce)){t(new Error("Component destroyed before image loaded"));return}const n=()=>{i(this,Ce)||e(void 0)},r=()=>{t(new Error("Failed to load image"))};(a=i(this,k))==null||a.addEventListener("load",n,{once:!0}),(o=i(this,k))==null||o.addEventListener("error",r,{once:!0})}).catch(e=>{console.warn("Image load aborted:",e.message)}),!(i(this,Ce)||!i(this,k))&&(u(this,J,{width:i(this,k).naturalWidth,height:i(this,k).naturalHeight}),l(this,f,cs).call(this),l(this,f,Ct).call(this,i(this,le))))},cs=function(){const e=i(this,N).querySelector("#crop-viewport");if(!e)return;const t=e.getBoundingClientRect();if(u(this,z,{width:t.width,height:t.height}),i(this,J).width>0&&i(this,J).height>0){const n=i(this,z).width/i(this,z).height,r=i(this,J).width/i(this,J).height;r>n?(i(this,R).width=i(this,z).width,i(this,R).height=i(this,z).width/r,i(this,T).x=0,i(this,T).y=(i(this,z).height-i(this,R).height)/2):(i(this,R).height=i(this,z).height,i(this,R).width=i(this,z).height*r,i(this,T).x=(i(this,z).width-i(this,R).width)/2,i(this,T).y=0)}},Yi=function(){return i(this,J).width===0?1:i(this,R).width/i(this,J).width},Ct=function(e){const t=Fa[e];u(this,b,{x:i(this,T).x+t.x*i(this,R).width,y:i(this,T).y+t.y*i(this,R).height,width:t.width*i(this,R).width,height:t.height*i(this,R).height}),l(this,f,xt).call(this)},Zi=function(e){u(this,le,e),l(this,f,ls).call(this),l(this,f,Ct).call(this,e)},ls=function(){i(this,N).querySelectorAll(".roster-crop-editor__preset-btn").forEach(t=>{const r=t.getAttribute("data-preset")===i(this,le);t.classList.toggle("roster-crop-editor__preset-btn--active",r),t.setAttribute("aria-selected",String(r))})},xt=function(){const e=i(this,N).querySelector("#crop-area");e instanceof HTMLElement&&(e.style.left=`${i(this,b).x}px`,e.style.top=`${i(this,b).y}px`,e.style.width=`${i(this,b).width}px`,e.style.height=`${i(this,b).height}px`)},us=function(e,t){e.preventDefault(),l(this,f,ds).call(this,e.clientX,e.clientY,t)},hs=function(e,t){e.preventDefault(),e.touches.length===1&&l(this,f,ds).call(this,e.touches[0].clientX,e.touches[0].clientY,t)},ds=function(e,t,n){u(this,ve,!0),u(this,ue,n),u(this,Ze,{x:e,y:t}),u(this,M,{...i(this,b)})},ht=new WeakMap,dt=new WeakMap,ps=function(e,t){const n=e-i(this,Ze).x,r=t-i(this,Ze).y,a=i(this,T).x,o=i(this,T).y,c=i(this,T).x+i(this,R).width,h=i(this,T).y+i(this,R).height;if(i(this,ue)==="move"){let d=i(this,M).x+n,m=i(this,M).y+r;d=Math.max(a,Math.min(c-i(this,b).width,d)),m=Math.max(o,Math.min(h-i(this,b).height,m)),i(this,b).x=d,i(this,b).y=m}else i(this,ue)&&l(this,f,Vi).call(this,n,r,a,o,c,h);l(this,f,xt).call(this)},Vi=function(e,t,n,r,a,o){const c=et.MIN_CROP_SIZE;let{x:h,y:d,width:m,height:g}=i(this,M);switch(i(this,ue)){case"resize-tl":h=Math.max(n,Math.min(h+m-c,h+e)),d=Math.max(r,Math.min(d+g-c,d+t)),m=i(this,M).x+i(this,M).width-h,g=i(this,M).y+i(this,M).height-d;break;case"resize-tr":d=Math.max(r,Math.min(d+g-c,d+t)),m=Math.max(c,Math.min(a-h,i(this,M).width+e)),g=i(this,M).y+i(this,M).height-d;break;case"resize-bl":h=Math.max(n,Math.min(h+m-c,h+e)),m=i(this,M).x+i(this,M).width-h,g=Math.max(c,Math.min(o-d,i(this,M).height+t));break;case"resize-br":m=Math.max(c,Math.min(a-h,i(this,M).width+e)),g=Math.max(c,Math.min(o-d,i(this,M).height+t));break}u(this,b,{x:h,y:d,width:m,height:g})},pt=new WeakMap,mt=new WeakMap,ft=new WeakMap,Ki=function(e){const t=i(this,T).x,n=i(this,T).y,r=i(this,T).x+i(this,R).width,a=i(this,T).y+i(this,R).height,o=et.MIN_CROP_SIZE;let c=!1;if(e.shiftKey)switch(e.key){case"ArrowLeft":i(this,b).width=Math.max(o,i(this,b).width-At),c=!0;break;case"ArrowRight":i(this,b).width=Math.min(r-i(this,b).x,i(this,b).width+At),c=!0;break;case"ArrowUp":i(this,b).height=Math.max(o,i(this,b).height-At),c=!0;break;case"ArrowDown":i(this,b).height=Math.min(a-i(this,b).y,i(this,b).height+At),c=!0;break}else switch(e.key){case"ArrowLeft":i(this,b).x=Math.max(t,i(this,b).x-_t),c=!0;break;case"ArrowRight":i(this,b).x=Math.min(r-i(this,b).width,i(this,b).x+_t),c=!0;break;case"ArrowUp":i(this,b).y=Math.max(n,i(this,b).y-_t),c=!0;break;case"ArrowDown":i(this,b).y=Math.min(a-i(this,b).height,i(this,b).y+_t),c=!0;break}c&&(e.preventDefault(),l(this,f,xt).call(this))},St=function(e){const t=i(this,N).querySelector(".roster-crop-editor__hint");t&&(t.textContent=e,t.style.color="var(--color-danger-500)")},ms=function(){const e=i(this,N).querySelector(".roster-crop-editor");if(!e)return[];const t=["button:not([disabled])",'[tabindex]:not([tabindex="-1"])',"input:not([disabled])","select:not([disabled])","textarea:not([disabled])","a[href]"].join(", ");return Array.from(e.querySelectorAll(t))},Ji=function(){const e=i(this,N).querySelector(".roster-crop-editor");if(!e)return;const t=l(this,f,ms).call(this)[0];t&&setTimeout(()=>t.focus(),0),e.addEventListener("keydown",i(this,gt))},gt=new WeakMap,Qi=async function(){if(!i(this,k)){l(this,f,St).call(this,"Image not loaded. Please try again.");return}const e=l(this,f,Yi).call(this),t=(i(this,b).x-i(this,T).x)/e,n=(i(this,b).y-i(this,T).y)/e,r=i(this,b).width/e,a=i(this,b).height/e,o=document.createElement("canvas");o.width=r,o.height=a;const c=o.getContext("2d");if(!c){console.error("Could not get canvas context"),l(this,f,St).call(this,"Failed to create crop canvas. Please try again.");return}c.drawImage(i(this,k),t,n,r,a,0,0,r,a),o.toBlob(h=>{h?i(this,lt).call(this,h,i(this,le)):(console.error("Failed to create image blob from canvas"),l(this,f,St).call(this,"Failed to crop image. Please try again."))},"image/jpeg",Pa)},Ft(et,"MIN_CROP_SIZE",50);let os=et;const S={state:"select-type",capturedImage:null,sheetType:null,captureMode:null,ocrResult:null};let wt=null,Nt=null,ee=null,W=null,te=null,Tt=!1,Mt=null,Rt=null;function D(s,e={}){const t=S.state;Object.assign(S,e,{state:s}),console.log(`State transition: ${t} → ${s}`,S),en(t),tn(s)}function en(s){switch(s){case"select-type":Nt&&(Nt.destroy(),Nt=null);break;case"capture":wt&&(wt.destroy(),wt=null);break;case"processing":ee&&(ee.destroy(),ee=null);break;case"results":te&&(URL.revokeObjectURL(te),te=null);break;case"roster-display":Mt&&(Mt.destroy(),Mt=null);break;case"roster-crop":Rt&&(Rt.destroy(),Rt=null);break;case"manuscript-complete":te&&(URL.revokeObjectURL(te),te=null);break}}function tn(s){const e=document.getElementById("content-container");if(!e){console.error("Content container not found, cannot render state:",s);return}switch(s){case"select-type":Ha(e);break;case"manuscript-options":za(e);break;case"capture":$a(e);break;case"processing":Ua(e);break;case"results":ja(e);break;case"roster-display":Xa(e);break;case"roster-crop":Ga(e);break;case"manuscript-complete":Ya(e);break}}function $a(s){s.innerHTML=`
    <div id="image-capture-container"></div>
  `;const e=document.getElementById("image-capture-container");if(e&&S.sheetType){const t=S.sheetType==="manuscript"?Ja:sn;wt=new Vt({container:e,sheetType:S.sheetType,captureMode:S.captureMode,onCapture:Va,onBack:t})}}function Ha(s){s.innerHTML=`
    <div class="main-content">
      <div class="container">
        <div class="card">
          <h2 class="text-center mb-md">What type of scoresheet?</h2>
          <div id="sheet-type-container"></div>
        </div>
      </div>
    </div>
  `;const e=document.getElementById("sheet-type-container");e&&(Nt=new fn({container:e,onSelect:Ka}))}function za(s){s.innerHTML=`
    <div class="main-content">
      <div class="container">
        <div class="card">
          <h2 class="text-center mb-md">How would you like to capture?</h2>
          <p class="text-muted text-center mb-lg">
            Choose how to capture the handwritten roster
          </p>

          <div class="sheet-type-selector__options">
            <button
              type="button"
              class="sheet-type-selector__option"
              id="btn-capture-roster"
              aria-label="Capture roster area only"
            >
              <span class="sheet-type-selector__option-icon">📋</span>
              <span class="sheet-type-selector__option-label">Roster Only</span>
              <span class="sheet-type-selector__option-desc">
                Take a photo of just the player list area
              </span>
            </button>

            <button
              type="button"
              class="sheet-type-selector__option"
              id="btn-capture-full"
              aria-label="Capture full scoresheet"
            >
              <span class="sheet-type-selector__option-icon">📄</span>
              <span class="sheet-type-selector__option-label">Full Scoresheet</span>
              <span class="sheet-type-selector__option-desc">
                Take a photo of the entire sheet, then crop to roster
              </span>
            </button>
          </div>

          <button
            type="button"
            class="btn btn-secondary btn-block mt-lg"
            id="btn-back-to-type"
            aria-label="Go back to type selection"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  `;const e=document.getElementById("btn-capture-roster"),t=document.getElementById("btn-capture-full"),n=document.getElementById("btn-back-to-type");e==null||e.addEventListener("click",()=>Zs("roster-only")),t==null||t.addEventListener("click",()=>Zs("full")),n==null||n.addEventListener("click",sn)}function Ua(s){s.innerHTML=`
    <div class="main-content">
      <div class="container">
        <div class="card">
          <h2 class="text-center mb-md">Processing Scoresheet</h2>
          <p class="text-muted text-center mb-lg">
            Extracting text using print recognition...
          </p>
          <div id="ocr-progress-container"></div>
        </div>
      </div>
    </div>
  `;const e=document.getElementById("ocr-progress-container");e&&(ee=new gn({container:e,onCancel:to}),Wa())}function qa(s){return s instanceof Error?s.message:typeof s=="string"?s:"Unknown error occurred"}async function Wa(){if(Tt){console.warn("OCR already running, ignoring duplicate request");return}if(!S.capturedImage||!S.sheetType){console.error("Missing image or sheet type for OCR");return}Tt=!0;try{W=xn.create(S.sheetType,e=>{ee==null||ee.updateProgress(e)}),await W.initialize();const s=await W.recognize(S.capturedImage);console.log("=== OCR Results ==="),console.log("Full text:",s.fullText),console.log("Lines:",s.lines.length),console.log("Words:",s.words.length),console.log("Detailed results:",s),await W.terminate(),W=null,D("results",{ocrResult:s})}catch(s){console.error("OCR Error:",s),ee==null||ee.showError(`OCR failed: ${qa(s)}`),W&&(await W.terminate(),W=null)}finally{Tt=!1}}function ja(s){const e=S.ocrResult,t=(e==null?void 0:e.words.length)||0,n=(e==null?void 0:e.lines.length)||0,r=t>0?Math.round(e.words.reduce((h,d)=>h+d.confidence,0)/t):0;s.innerHTML=`
    <div class="main-content">
      <div class="container">
        <div class="card">
          <h2 class="text-center mb-md">OCR Complete</h2>

          <div class="ocr-results__stats mb-lg">
            <div class="ocr-results__stat">
              <span class="ocr-results__stat-value">${n}</span>
              <span class="ocr-results__stat-label">Lines</span>
            </div>
            <div class="ocr-results__stat">
              <span class="ocr-results__stat-value">${t}</span>
              <span class="ocr-results__stat-label">Words</span>
            </div>
            <div class="ocr-results__stat">
              <span class="ocr-results__stat-value">${r}%</span>
              <span class="ocr-results__stat-label">Confidence</span>
            </div>
          </div>

          <div class="sheet-type-selector__preview mb-md">
            <img
              id="result-preview"
              class="sheet-type-selector__thumbnail"
              alt="Processed scoresheet"
            />
          </div>

          <details class="ocr-results__details mb-lg">
            <summary class="ocr-results__summary">View Extracted Text</summary>
            <pre class="ocr-results__text">${Za((e==null?void 0:e.fullText)||"No text extracted")}</pre>
          </details>

          <div class="flex flex-col gap-md">
            <button class="btn btn-primary btn-block" id="btn-view-roster">
              View Parsed Roster
            </button>
            <button class="btn btn-secondary btn-block" id="btn-new-scan">
              Scan Another Sheet
            </button>
          </div>
        </div>
      </div>
    </div>
  `;const a=document.getElementById("result-preview");a&&S.capturedImage&&(te=URL.createObjectURL(S.capturedImage),a.src=te);const o=document.getElementById("btn-view-roster");o==null||o.addEventListener("click",Qa);const c=document.getElementById("btn-new-scan");c==null||c.addEventListener("click",nn)}function Xa(s){s.innerHTML=`
    <div class="main-content">
      <div class="container">
        <div class="card">
          <h2 class="text-center mb-md">Parsed Roster</h2>
          <div id="roster-display-container"></div>
        </div>
      </div>
    </div>
  `;const e=document.getElementById("roster-display-container");e&&S.ocrResult&&(Mt=new Da({container:e,ocrText:S.ocrResult.fullText,ocrResult:S.ocrResult,sheetType:S.sheetType||"electronic",isManuscript:S.sheetType==="manuscript",onBack:eo}))}function Ga(s){s.innerHTML=`
    <div id="roster-crop-container"></div>
  `;const e=document.getElementById("roster-crop-container");e&&S.capturedImage&&(Rt=new os({container:e,imageBlob:S.capturedImage,initialPreset:"both",onConfirm:so,onCancel:io}))}function Ya(s){s.innerHTML=`
    <div class="main-content">
      <div class="container">
        <div class="card">
          <h2 class="text-center mb-md">Image Captured</h2>
          <p class="text-muted text-center mb-lg">
            Manuscript scoresheet captured successfully. OCR for manuscript scoresheets is not yet available.
          </p>

          <div class="sheet-type-selector__preview mb-lg">
            <img
              id="manuscript-preview"
              class="sheet-type-selector__thumbnail"
              alt="Captured manuscript scoresheet"
            />
          </div>

          <div class="flex flex-col gap-md">
            <button class="btn btn-primary btn-block" id="btn-new-scan">
              Scan Another Sheet
            </button>
          </div>
        </div>
      </div>
    </div>
  `;const e=document.getElementById("manuscript-preview");e&&S.capturedImage&&(te=URL.createObjectURL(S.capturedImage),e.src=te);const t=document.getElementById("btn-new-scan");t==null||t.addEventListener("click",nn)}function Za(s){const e=document.createElement("div");return e.textContent=s,e.innerHTML}function Va(s){console.log("Image captured:",s),console.log("  Type:",s.type),console.log("  Size:",(s.size/1024).toFixed(2),"KB"),S.sheetType==="manuscript"?S.captureMode==="roster-only"?D("processing",{capturedImage:s}):D("roster-crop",{capturedImage:s}):D("processing",{capturedImage:s})}function Ka(s){console.log("Sheet type selected:",s),s==="manuscript"?D("manuscript-options",{sheetType:s}):D("capture",{sheetType:s})}function Zs(s){console.log("Manuscript capture mode selected:",s),D("capture",{captureMode:s})}function sn(){D("select-type",{sheetType:null,capturedImage:null,captureMode:null})}function Ja(){D("manuscript-options",{capturedImage:null,captureMode:null})}function nn(){D("select-type",{capturedImage:null,sheetType:null,captureMode:null,ocrResult:null})}function Qa(){D("roster-display")}function eo(){D("results")}async function to(){W&&(await W.terminate(),W=null),Tt=!1,D("capture",{capturedImage:null,sheetType:null,ocrResult:null})}function so(s,e){console.log("Roster cropped:",e),console.log("  Size:",(s.size/1024).toFixed(2),"KB"),D("processing",{capturedImage:s})}function io(){D("capture",{capturedImage:null})}function Vs(){const s=document.getElementById("app");if(!s){console.error("App container not found");return}s.innerHTML=`
    <div id="content-container"></div>
  `,tn(S.state)}function no(){en(S.state)}window.addEventListener("pagehide",no);document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Vs):Vs();
