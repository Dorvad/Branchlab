export const runtime = 'edge'

export async function GET() {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
  if (!base) {
    return new Response('NEXT_PUBLIC_APP_URL is not configured', { status: 500 })
  }

  const script = `(function(){
  var BASE="${base}";
  if(typeof customElements!=="undefined"&&!customElements.get("branchlab-player")){
    customElements.define("branchlab-player",class extends HTMLElement{
      connectedCallback(){
        var slug=this.getAttribute("slug");
        if(!slug)return;
        var f=document.createElement("iframe");
        f.src=BASE+"/play/"+slug+"?embed=1";
        f.style.cssText="border:none;width:100%;height:100%;min-height:500px;display:block";
        f.allow="autoplay; fullscreen";
        this.style.cssText="display:block;width:100%;height:100%";
        this.appendChild(f);
      }
    });
  }
  function inject(el){
    var slug=el.getAttribute("data-branchlab");
    if(!slug||el.dataset.blInjected)return;
    el.dataset.blInjected="1";
    var f=document.createElement("iframe");
    f.src=BASE+"/play/"+slug+"?embed=1";
    f.style.cssText="border:none;width:100%;height:100%;min-height:500px;display:block";
    f.allow="autoplay; fullscreen";
    el.appendChild(f);
  }
  function run(){
    document.querySelectorAll("[data-branchlab]").forEach(inject);
  }
  if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",run);}else{run();}
})();`

  return new Response(script, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
