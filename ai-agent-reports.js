/* AI Agent 3D PEINTURES — تقارير وتحليلات محلية بلا API خارجي */
(function(){
  const safeArray=value=>Array.isArray(value)?value:[];
  const norm=value=>String(value||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f\u064B-\u065F]/g,"").replace(/\s+/g," ").trim();
  const amount=value=>Number(value)||0;
  const moneyValue=value=>`${amount(value).toFixed(2)}Dh`;
  const dateValue=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?null:d};
  const monthKey=value=>{const d=dateValue(value);return d?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`:"بدون تاريخ"};
  const monthLabel=key=>{if(key==="بدون تاريخ")return key;const [y,m]=String(key).split("-").map(Number);const d=new Date(y,m-1,1);return d.toLocaleDateString("fr-FR",{month:"long",year:"numeric"})};
  const line=(n,label,value)=>`${n}. ${label}: ${value}`;
  const paymentRows=()=>{
    const rows=[];
    safeArray(window.orders||orders).forEach(order=>{
      let history=[];try{history=typeof getPaymentHistory==="function"?getPaymentHistory(order):safeArray(order.payments)}catch(e){history=safeArray(order.payments)}
      history.forEach((payment,index)=>rows.push({order, payment, index, amount:amount(payment.amount??payment.value??payment.paid), date:payment.date||payment.createdAt||payment.timestamp||order.date}));
    });
    return rows;
  };
  const clientCity=client=>String(client?.city||client?.ville||client?.addressCity||"بدون مدينة").trim()||"بدون مدينة";
  const clientName=client=>String(client?.name||client?.company||client?.societe||"").trim();
  const clientIndex=()=>{
    const map=new Map();safeArray(window.clients||clients).forEach(client=>{const name=clientName(client);if(name)map.set(norm(name),client)});return map;
  };
  const orderState=order=>{try{if(typeof ensureOrderDeadline==="function")ensureOrderDeadline(order);if(typeof recalculateOrderPaymentState==="function")return recalculateOrderPaymentState(order)}catch(e){}return {paid:amount(order?.paid),due:Math.max(0,amount(order?.due??(amount(order?.total)-amount(order?.paid))))}};
  const orderCity=(order,index)=>{const direct=order?.city||order?.ville||order?.clientCity;if(direct)return String(direct).trim();const client=index.get(norm(order?.client||""));return client?clientCity(client):"بدون مدينة"};
  const rowsForProducts=()=>{
    const map=new Map();
    safeArray(window.orders||orders).forEach(order=>safeArray(order.items).forEach(item=>{
      const name=String(item.name||item.productName||item.code||item.id||"منتوج بدون اسم").trim();const key=norm(name)||"بدون اسم";
      const row=map.get(key)||{name,units:0,sales:0,orders:0};
      row.units+=amount(item.paidUnits??item.units??item.quantity??item.qty??item.boxes);
      row.sales+=amount(item.lineTotal??item.total??((amount(item.unitPrice)*amount(item.paidUnits??item.units??item.quantity??item.qty??item.boxes))));row.orders++;map.set(key,row);
    }));
    return [...map.values()].sort((a,b)=>b.sales-a.sales||b.units-a.units);
  };
  function reportPayments(){
    const rows=paymentRows(),groups=new Map();rows.forEach(row=>{const key=monthKey(row.date),g=groups.get(key)||{key,count:0,total:0};g.count++;g.total+=row.amount;groups.set(key,g)});
    const sorted=[...groups.values()].sort((a,b)=>a.key.localeCompare(b.key)),total=rows.reduce((s,r)=>s+r.amount,0);
    if(!rows.length)return "مازال ما تسجل حتى قسط. الرأي ديالي: منين تبدا تسجل الأقساط، غادي يبان لك التطور شهر بشهر والمتأخرات بوضوح.";
    const lines=sorted.map((g,i)=>line(i+1,monthLabel(g.key),`${g.count} قسط · ${moneyValue(g.total)}`));
    const best=sorted.slice().sort((a,b)=>b.total-a.total)[0];
    return `تقرير الأقساط شهر بشهر:\n${lines.join("\n")}\n\nالمجموع ديال الأقساط: ${moneyValue(total)} فـ ${rows.length} عملية.\nالرأي ديالي: أكثر شهر تجمع فيه الأقساط هو ${monthLabel(best.key)} بمجموع ${moneyValue(best.total)}؛ قارن هاد الرقم مع الشهور الأخرى باش تعرف واش التحصيل كيتحسن ولا كينقص.`;
  }
  function reportSales(){
    const groups=new Map();safeArray(window.orders||orders).forEach(order=>{const key=monthKey(order.date),g=groups.get(key)||{key,orders:0,sales:0,paid:0,due:0};const state=orderState(order);g.orders++;g.sales+=amount(order.total);g.paid+=amount(state.paid);g.due+=amount(state.due);groups.set(key,g)});
    const sorted=[...groups.values()].sort((a,b)=>a.key.localeCompare(b.key)),total=sorted.reduce((s,g)=>s+g.sales,0),best=sorted.slice().sort((a,b)=>b.sales-a.sales)[0];
    if(!sorted.length)return "مازال ما كايناش طلبيات باش نخرج إحصائيات البيع. الرأي ديالي: بدا بتسجيل الطلبيات كاملة باش التحليل الشهري يعطيك صورة صحيحة.";
    const lines=sorted.map((g,i)=>line(i+1,monthLabel(g.key),`${g.orders} طلبية · المبيعات ${moneyValue(g.sales)} · المخلص ${moneyValue(g.paid)} · الباقي ${moneyValue(g.due)}`));
    return `إحصائيات البيع شهر بشهر:\n${lines.join("\n")}\n\nالمبيعات الإجمالية: ${moneyValue(total)} فـ ${sorted.reduce((s,g)=>s+g.orders,0)} طلبية.\nالرأي ديالي: أحسن شهر هو ${monthLabel(best.key)} بمبيعات ${moneyValue(best.sales)}؛ ركز على العروض والمنتوجات اللي باعو فداك الشهر وحاول تعاود نفس الطريقة.`;
  }
  function reportProducts(){
    const rows=rowsForProducts(),available=safeArray(window.products||products).filter(p=>typeof isAvailable!=="function"||isAvailable(p));
    if(!rows.length)return "مازال ما كايناش تفاصيل ديال المنتوجات داخل الطلبيات. الرأي ديالي: تأكد أن كل كوموند فيها items باش نعرف شنو كيتباع وشنو ضعيف.";
    const top=rows[0],weak=rows[rows.length-1],lines=rows.slice(0,12).map((r,i)=>line(i+1,r.name,`${r.units} وحدة · ${moneyValue(r.sales)} · ${r.orders} طلبية`));
    return `إحصائيات المنتوجات:\n${lines.join("\n")}\n\nعدد المنتوجات المتوفرة فالكاطالوغ: ${available.length}.\nالأكثر مبيعاً: ${top.name} بمبيعات ${moneyValue(top.sales)}.\nالأقل طلباً من بين المسجلين: ${weak.name} بمبيعات ${moneyValue(weak.sales)}.\nالرأي ديالي: زيد وضّح عرض المنتوج الأكثر مبيعاً، وراجع ثمن أو صورة أو خصم المنتوج الضعيف قبل ما تحكم عليه نهائياً.`;
  }
  function reportCities(){
    const index=clientIndex(),groups=new Map();safeArray(window.orders||orders).forEach(order=>{const city=orderCity(order,index),key=norm(city)||"بدون مدينة",state=orderState(order),g=groups.get(key)||{city,orders:0,sales:0,paid:0,due:0};g.orders++;g.sales+=amount(order.total);g.paid+=amount(state.paid);g.due+=amount(state.due);groups.set(key,g)});
    const rows=[...groups.values()].sort((a,b)=>b.sales-a.sales);
    if(!rows.length)return "مازال ما كايناش طلبيات مرتبطة بالمدن. الرأي ديالي: عمر مدينة الزبون وخليها ثابتة باش نعرف فين كاينة أحسن حركة بيع.";
    const lines=rows.map((r,i)=>line(i+1,r.city,`${r.orders} طلبية · المبيعات ${moneyValue(r.sales)} · المخلص ${moneyValue(r.paid)} · الباقي ${moneyValue(r.due)}`));
    return `إحصائيات البيع حسب المدن:\n${lines.join("\n")}\n\nأحسن مدينة فالبيع هي ${rows[0].city} بمجموع ${moneyValue(rows[0].sales)}.\nالرأي ديالي: ركز التوزيع والعروض فـ ${rows[0].city}، وقارن المدن الضعيفة واش المشكل فقلة الزبناء ولا فقلة الطلبيات.`;
  }
  function reportClients(){
    const index=clientIndex(),map=new Map();safeArray(window.clients||clients).forEach(client=>{const name=clientName(client),key=norm(name);if(key)map.set(key,{name,city:clientCity(client),orders:0,sales:0,paid:0,due:0})});
    safeArray(window.orders||orders).forEach(order=>{const key=norm(order.client),client=map.get(key)||{name:order.client||"زبون غير مسجل",city:orderCity(order,index),orders:0,sales:0,paid:0,due:0};const state=orderState(order);client.orders++;client.sales+=amount(order.total);client.paid+=amount(state.paid);client.due+=amount(state.due);map.set(key,client)});
    const rows=[...map.values()],active=rows.filter(r=>r.orders>0).sort((a,b)=>b.sales-a.sales),inactive=rows.filter(r=>r.orders===0),due=rows.filter(r=>r.due>0).sort((a,b)=>b.due-a.due);
    const activeLines=active.slice(0,10).map((r,i)=>line(i+1,r.name,`${r.city} · ${r.orders} طلبية · ${moneyValue(r.sales)} · الباقي ${moneyValue(r.due)}`));
    const inactiveLines=inactive.slice(0,10).map((r,i)=>line(i+1,r.name,`${r.city} · ما عندوش طلبيات`));
    return `إحصائيات الكليان:\nمجموع الكليان: ${rows.length}. النشيطين: ${active.length}. اللي ما خدموش: ${inactive.length}.\n\nأكثر الكليان نشاطاً:\n${activeLines.length?activeLines.join("\n"):"مازال ما كاين حتى كليان نشيط."}\n\nالكليان اللي ما خدموش:\n${inactiveLines.length?inactiveLines.join("\n"):"ما كاين حتى كليان بلا طلبيات."}\n\nالباقي عند الكليان: ${moneyValue(due.reduce((s,r)=>s+r.due,0))}.\nالرأي ديالي: تواصل أولاً مع الكليان النشيطين اللي عليهم باقي، ومن بعد دير عرض أو رسالة خاصة للكليان اللي مازال ما داروش أول طلبية.`;
  }
  function reportGeneral(){
    const ordersList=safeArray(window.orders||orders),clientsList=safeArray(window.clients||clients),productsList=safeArray(window.products||products),states=ordersList.map(orderState),sales=ordersList.reduce((s,o)=>s+amount(o.total),0),paid=states.reduce((s,o)=>s+amount(o.paid),0),due=states.reduce((s,o)=>s+amount(o.due),0),payments=paymentRows().reduce((s,p)=>s+p.amount,0),cities=new Map();ordersList.forEach(order=>{const city=orderCity(order,clientIndex()),g=cities.get(norm(city))||{city,sales:0};g.sales+=amount(order.total);cities.set(norm(city),g)});const best=[...cities.values()].sort((a,b)=>b.sales-a.sales)[0];
    return `الإحصائيات العامة ديال الموقع:\n- المنتجات: ${productsList.length}.\n- الكليان: ${clientsList.length}.\n- الطلبيات: ${ordersList.length}.\n- المبيعات: ${moneyValue(sales)}.\n- المخلص: ${moneyValue(paid)}.\n- الباقي: ${moneyValue(due)}.\n- الأقساط المجموعة: ${moneyValue(payments)}.\n- المدن اللي فيها بيع: ${cities.size}.\n- أحسن مدينة: ${best?`${best.city} بـ ${moneyValue(best.sales)}`:"مازال ما كايناش بيانات"}.\n\nالرأي ديالي: الصورة العامة كتبيّن أن أهم مؤشرين خاصك تراقبهم هما المبيعات والباقي؛ المبيعات كتقول فين النشاط، والباقي كيقول فين خاص المتابعة والتحصيل.`;
  }
  function findClient(text){
    const q=norm(text),rows=safeArray(window.clients||clients),exact=rows.find(c=>{const n=norm(c.name||c.company||c.societe);return n&&q.includes(n)});if(exact)return exact;const tokens=q.split(" ").filter(t=>t.length>=3&&!/^(عطيني|بغيت|معلومات|على|ديال|الزبون|زبون|كليان|الفاتورة|الفواتير|الحساب|شنو|شحال|عندو|عليه|طلبية|طلبات)$/.test(t));return rows.find(c=>tokens.some(t=>norm(c.name||c.company||c.societe).includes(t)))||null;
  }
  function reportClient(text,client){
    const index=clientIndex(),name=clientName(client),ordersList=safeArray(window.orders||orders).filter(o=>norm(o.client)===norm(name)),states=ordersList.map(orderState),total=ordersList.reduce((s,o)=>s+amount(o.total),0),paid=states.reduce((s,o)=>s+amount(o.paid),0),due=states.reduce((s,o)=>s+amount(o.due),0),invoices=ordersList.map((o,i)=>`${i+1}. ${o.date?new Date(o.date).toLocaleDateString("fr-FR"):"بلا تاريخ"} · الفاتورة/الطلبية ${o.id||i+1} · الإجمالي ${moneyValue(o.total)} · المخلص ${moneyValue(orderState(o).paid)} · الباقي ${moneyValue(orderState(o).due)}`);
    return `المعلومات العامة ديال ${name}:\n- المدينة: ${clientCity(client)}.\n- الشركة: ${client.company||client.societe||"ما مسجلةش"}.\n- ICE: ${client.ice||"ما مسجلش"}.\n- الهاتف: ${client.phone||"ما مسجلش"}.\n- عدد الفواتير/الطلبيات: ${ordersList.length}.\n- مجموع الفواتير: ${moneyValue(total)}.\n- المخلص: ${moneyValue(paid)}.\n- الباقي: ${moneyValue(due)}.\n\nالفواتير والطلبيات:\n${invoices.length?invoices.join("\n"):"مازال ما كايناش فاتورة مسجلة لهاد الكليان."}\n\nالرأي ديالي: ${due>0?`خاص متابعة ${name} حيث باقي عليه ${moneyValue(due)}.`:"الحساب ديال هاد الكليان مسوى حسب المعطيات الحالية."}`;
  }
  function isReportQuestion(q){return /تقرير|احصائ|إحصائ|شهر بشهر|شهر بشهر|المبيعات|القساط|الأقساط|الاقساط|المنتوجات|المنتوج لي|المدن|الكليان|الزبناء|الفواتير|الفاتورة|عطيني|اعطيني|عطني|حلل|حلل ليا|شنو بعت|شحال جمعت/.test(q)}
  window.aiAgentReportAnswer=function(text){
    const q=norm(text);if(!q||!isReportQuestion(q))return null;
    const client=findClient(text);
    if(/فاتور|معلومات الزبون|ملف الزبون|الفاتور/.test(q)&&!client)return "كتب ليا اسم الكليان، وغادي نعطيك المعلومات العامة ديالو، الطلبيات، المخلص، الباقي، والفواتير ديالو.";
    if(client&&/(فاتور|معلومات|حساب|طلب|شحال|عطيني|اعطيني|عطني)/.test(q))return reportClient(text,client);
    if((/احصا(?:ي|ئ)|احصاء/.test(q)&&q.includes("عام"))||q.includes("تقرير عام")||q.includes("الوضعية العامة"))return reportGeneral();
    if(/القساط|الاقساط|التحصيل|جمعت|شهر بشهر/.test(q))return reportPayments();
    if(/منتوج|البيع ديال كل منتوج|شنو كيتباع|ما كيتباعش|مبغتش|ضعيف/.test(q))return reportProducts();
    if(/مدين|المدن|فين بعت|المدينة/.test(q))return reportCities();
    if(/كليان|زبناء|الزبناء|خدام|مخدام|نشيط|ما خدم/.test(q))return reportClients();
    if(/مبيعات|المبيعات|بيع|احصائ|إحصائ|تقرير عام|عام|الوضعية|المجموع/.test(q))return reportSales();
    return reportGeneral();
  };
})();
