const $ = s => document.querySelector(s);
const state = { data:null, era:null };

const AREA_COLORS = {
  1:{bg:"#dff4ff",border:"#83c7e8",text:"#145f86",accent:"#2187b8"},
  2:{bg:"#fff1b8",border:"#ddbd58",text:"#765500",accent:"#a97900"},
  3:{bg:"#dcf2e2",border:"#84c394",text:"#24663e",accent:"#2f8250"},
  4:{bg:"#ffe5ce",border:"#e5a66d",text:"#8b4310",accent:"#b45a15"},
  5:{bg:"#eadfff",border:"#b8a0e4",text:"#593a98",accent:"#7351b5"},
  6:{bg:"#ffe2eb",border:"#e7a5b8",text:"#82364f",accent:"#b25473"},
  7:{bg:"#d9f3f0",border:"#7fc7c0",text:"#205f5a",accent:"#2d857d"},
  8:{bg:"#e3e9ff",border:"#9cafe4",text:"#314f8f",accent:"#4b69b2"}
};

async function init(){
  if(window.__EMBED_DATA__){ state.data=window.__EMBED_DATA__; }
  else { const res=await fetch("./data.json"); state.data=await res.json(); }
  bindTabs();
  buildEraButtons();
  buildToukenFilters();
  $("#verifiedAt").textContent=`データ確認：${state.data.meta.verifiedAt}`;
}

function bindTabs(){
  document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  }));
}

const eraName=id=>state.data.eras.find(x=>x.id===id)?.name||"";
const toukenById=id=>state.data.touken.find(x=>x.id===id);
const bfById=id=>state.data.battlefields.find(x=>x.id===id);
const typeOrder=t=>["短刀","脇差","打刀","太刀","大太刀","槍","薙刀","剣"].indexOf(t);
const areaNo=id=>Number(String(id).split("-")[0]);
const areaClass=id=>`area-${areaNo(id)}`;

function optionStyle(area){
  const c=AREA_COLORS[area];
  return c ? `background:${c.bg};color:${c.text};` : "";
}

function applyBattlefieldSelectColor(id){
  const s=$("#battlefieldSelect");
  s.className="battlefield-select";
  if(id) s.classList.add(areaClass(id));
}

function buildEraButtons(){
  const host=$("#eraButtons");
  state.data.eras.forEach(e=>{
    const b=document.createElement("button");
    b.type="button";
    b.className=`era area-${e.id}`;
    b.textContent=`${e.id}. ${e.name}`;
    b.addEventListener("click",()=>selectEra(e.id,b));
    host.appendChild(b);
  });
}

function selectEra(id,btn){
  state.era=id;
  document.querySelectorAll(".era").forEach(x=>x.classList.remove("active"));
  btn.classList.add("active");

  const maps=state.data.battlefields.filter(x=>x.era===id);
  const s=$("#battlefieldSelect");
  s.disabled=false;
  s.className="battlefield-select";
  s.innerHTML='<option value="">合戦場を選択</option>'+
    maps.map(x=>`<option value="${x.id}" style="${optionStyle(x.era)}">${x.id} ${x.name}</option>`).join("");

  $("#battleType").disabled=true;
  $("#battleType").innerHTML='<option value="">すべての刀種</option>';
  $("#battleResult").innerHTML="";
}

$("#battlefieldSelect").addEventListener("change",()=>{
  const id=$("#battlefieldSelect").value;
  applyBattlefieldSelectColor(id);

  if(!id){
    $("#battleResult").innerHTML="";
    $("#battleType").disabled=true;
    return;
  }

  const ids=state.data.drops.filter(x=>x.battlefieldId===id).map(x=>x.toukenId);
  const types=[...new Set(ids.map(id=>toukenById(id).type))].sort((a,b)=>typeOrder(a)-typeOrder(b));
  $("#battleType").disabled=false;
  $("#battleType").innerHTML='<option value="">すべての刀種</option>'+types.map(x=>`<option>${x}</option>`).join("");
  renderBattle();
});

$("#battleType").addEventListener("change",renderBattle);

function renderBattle(){
  const id=$("#battlefieldSelect").value;
  if(!id)return;

  const bf=bfById(id);
  const filter=$("#battleType").value;
  const cls=areaClass(id);

  let rows=state.data.drops
    .filter(x=>x.battlefieldId===id)
    .map(x=>({...x,t:toukenById(x.toukenId)}));

  if(filter) rows=rows.filter(x=>x.t.type===filter);
  rows.sort((a,b)=>a.t.album-b.t.album);

  const kebiishi=state.data.kebiishiToukenIds.map(toukenById).sort((a,b)=>a.album-b.album);

  $("#battleResult").innerHTML=`
    <div class="box area-panel ${cls}">
      <h2 class="result-title">
        <span class="battle-id ${cls}">${bf.id}</span>
        <span>${bf.name}</span>
      </h2>
      <div class="meta">
        <span class="pill">${eraName(bf.era)}</span>
        <span class="pill">${rows.length}振</span>
      </div>

      ${rows.length
        ? `<div class="cards">${rows.map(r=>dropCard(r,cls)).join("")}</div>`
        : `<div class="empty">該当する刀剣男士はいません</div>`}

      ${bf.kebiishiEligible?`
        <div class="kebiishi-box">
          <button class="kebiishi-toggle" type="button" aria-expanded="false">検非違使ドロップを見る</button>
          <div class="kebiishi-content">
            <p class="quick-note">検非違使戦では通常敵とは別の共通ドロップ候補が適用されます。</p>
            <div class="cards">
              ${kebiishi.map(t=>`
                <div class="card area-card ${cls}">
                  <div class="card-head">
                    <div class="name">${t.name}</div>
                    <div class="type">${t.type}・刀帳 ${t.album}</div>
                  </div>
                  <div class="tags"><span class="tag kebiishi">検非違使</span></div>
                </div>
              `).join("")}
            </div>
          </div>
        </div>`:""}
    </div>`;

  const toggle=$("#battleResult .kebiishi-toggle");
  const content=$("#battleResult .kebiishi-content");
  if(toggle&&content){
    toggle.addEventListener("click",()=>{
      const open=toggle.getAttribute("aria-expanded")==="true";
      toggle.setAttribute("aria-expanded",String(!open));
      content.classList.toggle("open",!open);
    });
  }
}

function dropCard(r,cls){
  return `
    <div class="card area-card ${cls}">
      <div class="card-head">
        <div class="name">${r.t.name}</div>
        <div class="type">${r.t.type}・刀帳 ${r.t.album}</div>
      </div>
      <div class="tags">
        ${r.normal?'<span class="tag normal">通常</span>':""}
        ${r.boss?'<span class="tag boss">ボス</span>':""}
      </div>
    </div>`;
}

function buildToukenFilters(){
  const types=[...new Set(state.data.touken.map(x=>x.type))].sort((a,b)=>typeOrder(a)-typeOrder(b));
  $("#toukenType").innerHTML='<option value="">すべての刀種</option>'+types.map(x=>`<option>${x}</option>`).join("");
  refreshToukenSelect();
  $("#toukenType").addEventListener("change",refreshToukenSelect);
  $("#toukenSelect").addEventListener("change",renderTouken);
}

function refreshToukenSelect(){
  const type=$("#toukenType").value;
  const list=state.data.touken
    .filter(x=>!type||x.type===type)
    .sort((a,b)=>a.album-b.album);

  $("#toukenSelect").innerHTML='<option value="">刀剣男士を選択</option>'+
    list.map(t=>`<option value="${t.id}">${t.name}</option>`).join("");
  $("#toukenResult").innerHTML="";
}

function renderTouken(){
  const id=$("#toukenSelect").value;
  if(!id){
    $("#toukenResult").innerHTML="";
    return;
  }

  const t=toukenById(id);
  const rows=state.data.drops
    .filter(x=>x.toukenId===id)
    .map(x=>({...x,b:bfById(x.battlefieldId)}))
    .sort((a,b)=>a.b.id.localeCompare(b.b.id,undefined,{numeric:true}));

  const isKebiishi=state.data.kebiishiToukenIds.includes(id);

  $("#toukenResult").innerHTML=`
    <div class="box">
      <h2 class="result-title">${t.name}</h2>
      <div class="meta">
        <span class="pill">${t.type}</span>
        <span class="pill">刀帳 ${t.album}</span>
      </div>

      ${isKebiishi
        ? '<div class="tags" style="margin:0 0 13px"><span class="tag kebiishi">検非違使</span></div>'
        : ""}

      ${rows.length
        ? `<div class="cards">
            ${rows.map(r=>{
              const cls=areaClass(r.b.id);
              return `
                <div class="card area-card ${cls}">
                  <div class="card-head">
                    <div class="location-title">
                      <span class="battle-id ${cls}">${r.b.id}</span>
                      <div class="location-name name">${r.b.name}</div>
                    </div>
                    <div class="type">${eraName(r.b.era)}</div>
                  </div>
                  <div class="tags">
                    ${r.normal?'<span class="tag normal">通常</span>':""}
                    ${r.boss?'<span class="tag boss">ボス</span>':""}
                  </div>
                </div>`;
            }).join("")}
          </div>`
        : `<div class="empty">該当する合戦場はありません</div>`}
    </div>`;
}

init().catch(err=>{
  console.error(err);
  document.body.insertAdjacentHTML(
    "afterbegin",
    '<div style="padding:12px;background:#fee;color:#900">データの読み込みに失敗しました。</div>'
  );
});
