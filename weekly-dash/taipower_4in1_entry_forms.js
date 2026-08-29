(function(){
  "use strict";
  const VERSION="2026-08-29";
  const STORE="taipower-4in1-entry-forms:v1";
  const statuses=["未開始","準備中","待台電格式","待用印","已送審","退補件","已核定","不適用"];
  const F=(id,label,type="text",wide=false,options=[])=>({kind:"field",id,label,type,wide,options});
  const Fields=(...items)=>({kind:"fields",items});
  const Col=(key,label,type="text",options=[])=>({key,label,type,options});
  const Table=(id,title,columns,rows=3)=>({kind:"table",id,title,columns,rows});
  const Checks=(id,title,items)=>({kind:"checks",id,title,items});
  const Note=(text,warning=false)=>({kind:"note",text,warning});
  const S=(title,...blocks)=>({title,blocks});
  const forms=[
    {id:"f01",group:"pre",source:"internal",title:"進場前送審文件總表／公文追蹤",timing:"進場前持續更新",owner:"文書管理人員",reviewer:"監造主任",description:"追蹤每一資料包的版次、發文、台電收文、退補件與核定，作為送審唯一總表。",sections:[
      S("案件與送審基本資料",Fields(F("project","案名"),F("planned_entry","預定進場日","date"),F("manager","彙整人"),F("reviewer","覆核人"),F("submission_note","本期送審說明","textarea",true))),
      S("送審與核可追蹤",Table("register","資料包追蹤",[Col("package","資料包"),Col("document","文件名稱"),Col("version","版次"),Col("sent","送出日","date"),Col("docno","發文字號"),Col("received","台電收文日","date"),Col("status","審查狀態","select",statuses),Col("approved","核定／備查日","date"),Col("comment","退補件及最新版")],11)),
      S("封關確認",Checks("close","送件前確認",["全部附件均有版次與日期","正式送件檔已用印","收文證明已歸檔","退補件保留原版本","核定日已回填KB及總控頁"]))
    ]},
    {id:"f02",group:"pre",source:"internal",title:"監造計畫審查意見回覆與版本管制表",timing:"審查中／退補件",owner:"計畫撰寫人",reviewer:"監造主任",description:"逐條關閉台電審查意見，避免只改文件卻沒有回覆頁碼、版次與核定證據。",sections:[
      S("版本資訊",Fields(F("plan_name","文件名稱"),F("version","本次版次"),F("sent_date","送出日","date"),F("doc_no","文號"),F("owner","撰寫人"),F("reviewer","覆核人"),F("scope","本版主要修正範圍","textarea",true))),
      S("逐條意見",Table("comments","審查意見回覆",[Col("no","編號"),Col("source","台電意見來源／日期"),Col("comment","審查意見"),Col("response","回覆與處理"),Col("page","修正頁碼／章節"),Col("owner","主責"),Col("status","狀態","select",["待處理","修正中","待覆核","已回覆","台電接受"]),Col("evidence","證據／備註")],6)),
      S("版本留痕",Note("保留原送版、審查意見、修正版、差異說明及核定函；不得覆蓋原檔。"))
    ]},
    {id:"f03",group:"pre",source:"internal",title:"人員資格送審封面及個人附件檢核表",timing:"人員送審／補件前",owner:"人資＋文書",reviewer:"管理人員／監造主任",description:"每位派駐人員一冊，確認職務、到職、投保、資格與回訓資料完整。",sections:[
      S("人員資料",Fields(F("name","姓名"),F("role","送審職務"),F("arrival","到職日","date"),F("dispatch","預定派駐日","date"),F("employee_no","員工編號"),F("phone","聯絡電話"),F("replacement","是否替換原送審人員","select",false,["否","是"]),F("reason","異動原因／說明","textarea",true))),
      S("附件檢核",Checks("attachments","個人附件",["公司正式派任文件","學經歷表","身分證明必要遮蔽版本","最高學歷證明","相關工作經歷證明","專業證照正反面","證照有效期限已核對","品管／職安回訓證明","到職與書面勞動契約資料","勞保／就保／健保／職災保險","勞退提繳資料","12小時監造職前訓練證明","一般安全衛生教育訓練證明","健康檢查適用性及紀錄","尿液採驗僅在台電另行書面要求時檢附","工作證／臨時工作證","個資文件未放入公開網頁"])),
      S("送審結果",Fields(F("sent_date","送出日","date"),F("doc_no","文號"),F("review_result","台電審查結果","select",false,["待送","審查中","退補件","核准"]),F("approved_date","核准日","date"),F("supplement","退補件內容","textarea",true)))
    ]},
    {id:"f04",group:"pre",source:"internal",title:"人員異動及新舊資格比較表",timing:"名單與原送審不一致時",owner:"人資／專案管理",reviewer:"管理人員",description:"呈現原人員、新人員與契約條件的等同或更優比較，取得台電同意後才派駐。",sections:[
      S("異動概況",Fields(F("role","異動職務"),F("effective","預定生效日","date"),F("reason","異動原因","textarea",true),F("impact","工作銜接及影響控制","textarea",true))),
      S("資格比較",Table("compare","新舊資格比較",[Col("item","比較項目"),Col("contract","契約／服務建議書要求"),Col("old","原人員"),Col("new","新任人員"),Col("result","比較結果","select",["待確認","相當","優於","不符"]),Col("evidence","證據附件")],6)),
      S("核准留痕",Fields(F("sent","送出日","date"),F("docno","文號"),F("approved","台電同意日","date"),F("handover","交接完成日","date"),F("note","備註","textarea",true)))
    ]},
    {id:"f05",group:"pre",source:"internal",title:"115年9月出勤配置計畫／每日排班表",timing:"進場前核可、每月更新",owner:"監造主任",reviewer:"甲方承辦",description:"按日期與職務列出實際派駐、代理與最低留守人力；核定版才是正式出勤依據。",sections:[
      S("計畫基本資料",Fields(F("month","配置月份","month"),F("site","工地／案別"),F("min_staff","最低留守人力"),F("attendance","簽到退方式"),F("compiler","編製人"),F("approval","台電核可文號／日期"))),
      S("每日配置",Table("schedule","排班與代理",[Col("date","日期","date"),Col("weekday","星期"),Col("shift","班別"),Col("role","職務"),Col("name","姓名"),Col("start","開始時間","time"),Col("end","結束時間","time"),Col("proxy","請假代理"),Col("work","主要工作／留守位置")],10)),
      S("計畫確認",Checks("confirm","送審前確認",["與台電核准人員名單一致","每一必要職務均有配置","請假代理資格相符","連續施工已另排24小時監造","簽到退與月請款勾稽方式已定","核定版與現場排班版一致"]))
    ]},
    {id:"f06",group:"pre",source:"internal",title:"名冊、資格、投保、配置、簽到五表勾稽表",timing:"D-1放行與每月請款前",owner:"文書管理人員",reviewer:"監造主任",description:"將同一人跨五套資料勾稽，任何姓名、職務或日期不一致都要先補正。",sections:[
      S("五表勾稽",Table("crosscheck","人員一致性",[Col("name","姓名"),Col("role","職務"),Col("labor","受僱勞工名冊","select",["未檢核","一致","不一致"]),Col("qualification","資格核准","select",["未檢核","一致","不一致"]),Col("insurance","投保資料","select",["未檢核","一致","不一致"]),Col("schedule","出勤配置","select",["未檢核","一致","不一致"]),Col("attendance","實際簽到","select",["未檢核","一致","不一致"]),Col("issue","差異與補正")],8)),
      S("總結",Fields(F("checked","勾稽日期","date"),F("checker","勾稽人"),F("reviewer","覆核人"),F("open_items","未結事項","textarea",true)),Note("任何一欄不一致者，不得直接列為正式派駐或請款人月。",true))
    ]},
    {id:"f07",group:"pre",source:"internal",title:"12小時職前訓練計畫及課程表",timing:"正式執勤前完成",owner:"訓練承辦",reviewer:"監造主任",description:"規劃全體監造人員12小時以上職前訓練，保留講師、教材、時數與參訓對象。",sections:[
      S("訓練計畫",Fields(F("course_name","訓練名稱"),F("site","地點／方式"),F("start","開始日期","date"),F("end","完成日期","date"),F("audience","參訓對象"),F("coordinator","承辦人"),F("objective","訓練目的","textarea",true))),
      S("課程表",Table("courses","12小時課程",[Col("date","日期","date"),Col("start","開始","time"),Col("end","結束","time"),Col("hours","時數","number"),Col("topic","課程主題"),Col("source","契約附件／教材"),Col("lecturer","講師"),Col("audience","參訓職務")],8)),
      S("計畫檢核",Checks("training_plan","完整性",["總時數達12小時以上","課程涵蓋契約與工作說明書","包含品質、工安、環保及防挖損","講師資格與教材已備","排定簽到退、照片及測驗","未完訓人員不得正式執勤"]))
    ]},
    {id:"f08",group:"pre",source:"internal",title:"職前訓練簽到退、照片、測驗及完訓紀錄",timing:"每堂課及完訓後",owner:"訓練承辦",reviewer:"監造主任",description:"形成每位監造人員完整的12小時證據鏈，不能只保留線上測驗分數。",sections:[
      S("班次資料",Fields(F("course","訓練名稱"),F("date","日期","date"),F("topic","課程主題"),F("lecturer","講師"),F("planned_hours","本堂時數","number"),F("location","地點"))),
      S("簽到退",Table("attendance","參訓紀錄",[Col("name","姓名"),Col("role","職務"),Col("in","簽到時間","time"),Col("out","簽退時間","time"),Col("hours","認列時數","number"),Col("signature","親簽／證據"),Col("score","測驗成績","number"),Col("result","結果","select",["待測驗","合格","補考","未完成"])],8)),
      S("照片與教材",Table("photos","照片／教材索引",[Col("no","編號"),Col("time","時間"),Col("content","內容"),Col("file","檔案位置"),Col("review","覆核")],4)),
      S("完訓",Fields(F("total_hours","累計時數","number"),F("certificate","完訓證明編號"),F("completed","完訓日","date"),F("note","缺課／補課說明","textarea",true)))
    ]},
    {id:"f09",group:"pre",source:"internal",title:"PPE領用與適用性紀錄表",timing:"進場前／汰換時",owner:"職安人員",reviewer:"監造主任",description:"記錄安全帽、安全鞋、反光背心、工作服、背負式安全帶及依危害增列的防護具。",sections:[
      S("領用紀錄",Table("ppe","個人防護具",[Col("name","姓名"),Col("role","職務"),Col("item","PPE項目"),Col("spec","規格／編號"),Col("qty","數量","number"),Col("date","領用日","date"),Col("inspection","適用／檢查結果"),Col("signature","領用簽認"),Col("replace","汰換日／原因")],8)),
      S("管理確認",Checks("ppe_check","進場前檢查",["安全帽","安全鞋","反光背心","工作服","背負式安全帶／安全帶","依危害提供護目具","依危害提供手套／呼吸防護","領用人已受使用及保管告知"]),Fields(F("checker","檢查人"),F("date","檢查日","date"),F("note","缺件與補正","textarea",true)))
    ]},
    {id:"f10",group:"pre",source:"internal",title:"車輛核備、保險及配置清冊",timing:"車輛使用前／每月核對",owner:"車輛管理人",reviewer:"監造主任",description:"證明車號、來源、保險、配置日及案別，並銜接後續車月請款。",sections:[
      S("車輛配置",Table("vehicles","工地車輛",[Col("plate","車號"),Col("model","廠牌／車型"),Col("year","年份"),Col("owner","所有人／租賃來源"),Col("driver","主要駕駛"),Col("site","配置案別"),Col("start","配置起日","date"),Col("insurance","保險有效期"),Col("inspection","定檢有效期"),Col("approval","台電核備／備註")],4)),
      S("附件",Checks("vehicle_docs","每車附件",["行車執照影本","強制險","第三人責任險或台電要求保險","自有／租賃／使用證明","定期檢驗資料","前後車牌及車身照片","使用管理及替代車程序","核備函或簽認清冊"]),Note("車輛資料含個資及識別資訊，只存受控檔案位置，不放入公開網頁。",true))
    ]},
    {id:"f11",group:"pre",source:"internal",title:"工務所設備點交及緊急聯絡網",timing:"9/1前上牆／設備進場時",owner:"文書＋職安",reviewer:"監造主任",description:"確認辦公設備、通訊、文件收發與緊急通報均可運作。",sections:[
      S("工務所設備",Table("equipment","設備點交",[Col("item","設備／設施"),Col("spec","規格"),Col("qty","數量","number"),Col("location","位置"),Col("date","點交日","date"),Col("condition","狀態","select",["待進場","正常","缺件","故障"]),Col("custodian","保管人"),Col("evidence","照片／證據")],8)),
      S("緊急聯絡網",Table("contacts","通報聯絡",[Col("role","單位／角色"),Col("name","姓名"),Col("phone","電話"),Col("backup","第二聯絡"),Col("trigger","通知條件"),Col("order","通報順序")],8)),
      S("啟用確認",Checks("office","啟用項目",["電腦及合法文書軟體","網路／電信","A3彩色事務機及耗材","文件收發及版次管理","緊急聯絡網上牆","事故1小時速報路徑","停電／斷網備援","個資與證照存放權限"]))
    ]},
    {id:"f12",group:"pre",source:"internal",title:"D-1正式派駐放行表",timing:"115/08/31",owner:"監造主任",reviewer:"管理人員",description:"在進場前一天做最後Go／No-Go判斷；正式派駐門檻未完成時，只能依有權代表書面指示執行限定前置工作，不能視為正式派駐。",sections:[
      S("放行會議",Fields(F("date","會議日期","date"),F("chair","主持人"),F("participants","參與人員"),F("decision","結論","select",false,["待確認","放行","限定前置進場（非正式派駐）","不放行"]))),
      S("門檻檢核",Table("gates","D-1檢核",[Col("item","檢核事項"),Col("result","結果","select",["未檢核","是","否","不適用"]),Col("evidence","證據／文號"),Col("owner","主責"),Col("deadline","補正期限","date"),Col("comment","限制／備註")],12)),
      S("決議",Fields(F("allowed","允許執行範圍","textarea",true),F("prohibited","禁止執行範圍","textarea",true),F("instruction","限定前置作業書面指示文號／有效期","textarea",true),F("sign","監造主任／管理人員簽認","textarea",true)))
    ]},
    {id:"f13",group:"day1",source:"internal",title:"9/1進場首日紀錄表",timing:"115/09/01當日",owner:"文書管理人員",reviewer:"監造主任",description:"記錄實到人員、工作內容、文件點交、照片與異常，建立正式履約起日證據。",sections:[
      S("首日基本資料",Fields(F("date","進場日期","date"),F("notice","台電開工／進場通知文號"),F("site","地點"),F("weather","天候"),F("start","開始時間","time"),F("end","結束時間","time"))),
      S("實到人員",Table("staff","首日人員",[Col("role","職務"),Col("name","姓名"),Col("in","簽到","time"),Col("out","簽退","time"),Col("approval","核准依據"),Col("work","工作內容"),Col("signature","簽認")],8)),
      S("工作與點交",Table("tasks","首日工作",[Col("time","時間"),Col("item","工作／點交項目"),Col("from","交付人／單位"),Col("to","接收人"),Col("result","結果"),Col("evidence","照片／文件位置")],7)),
      S("異常與結論",Fields(F("abnormal","異常、缺件及限制","textarea",true),F("action","處置與追蹤","textarea",true),F("photo_index","照片索引","textarea",true),F("review","監造主任簽認","textarea",true)))
    ]},
    {id:"f14",group:"pre",source:"internal",title:"正式派駐門檻未齊之限定前置作業書面指示紀錄",timing:"門檻未完成但台電要求先做前置工作時",owner:"管理人員",reviewer:"有權甲方人員",description:"清楚記錄代表權、工作範圍、禁止事項、有效期及計價方式；本表不能取代台電正式指示或免除契約義務。",sections:[
      S("待核定事項",Fields(F("pending","尚未核定／核可項目","textarea",true),F("instruction_source","台電指示人員／單位"),F("authority","代表權／授權依據"),F("date","指示日期","date"),F("docno","正式文號／會議紀錄"),F("valid","有效期限","date"))),
      S("前置作業界線",Fields(F("classification","性質是否明載為非正式派駐","select",false,["待確認","是","否"]),F("billing","計價方式","select",false,["待確認","明載不計價","明載可計價","另依契約核定"]),F("allowed","暫時允許工作","textarea",true),F("prohibited","不得執行、查驗、簽認及計價範圍","textarea",true),F("responsibility","責任與監造簽認界線","textarea",true),F("transition","正式核定後銜接／補正方式","textarea",true))),
      S("簽認",Table("signatures","簽認紀錄",[Col("unit","單位"),Col("role","職稱"),Col("name","姓名"),Col("date","日期","date"),Col("signature","簽名／文號")],4),Note("技術服務契約第8條要求先確認指示者有權且指示未逾越契約。未取得合格書面指示前，不得將任何現場活動認定為正式派駐或據以請款。",true))
    ]},
    {id:"c01",group:"day1",source:"contract",title:"附表1 監造組織人員差勤管制督導紀錄表",timing:"派駐後由甲方督導使用",owner:"甲方督導人員",reviewer:"監造主任／代理人",description:"依工作說明書附表1重製的參考預覽；正式使用以契約附件及甲方要求為準。",sections:[
      S("督導資料",Fields(F("date","機關督導日期","date"),F("time","時間","time"))),
      S("人員差勤",Table("attendance","督導紀錄",[Col("role","職稱"),Col("name","姓名"),Col("present","人員是否出勤","select",["是","否"]),Col("compliance","是否符合規定","select",["符合","不符合"]),Col("note","備註")],6)),
      S("簽認",Fields(F("supervisor_sign","監造主任（或代理人）簽認","textarea",true),F("owner_sign","甲方督導人員","textarea",true)),Note("契約正式表單預覽；欄位名稱不得任意刪減。"))
    ]},
    {id:"c02",group:"construction",source:"contract",title:"附表四 公共工程施工日誌（施工廠商填報）",timing:"施工正式開工後每日",owner:"施工廠商工地主任",reviewer:"監造單位審查",description:"契約附件正式表單的欄位預覽；9/1初期派駐尚未觸發，監造單位應先備妥審查流程。",sections:[
      S("工程基本資料",Fields(F("report_no","表報編號"),F("date","填報日期","date"),F("weather_am","上午天氣"),F("weather_pm","下午天氣"),F("project","工程名稱"),F("contractor","承攬廠商"),F("duration","核定／累計／剩餘工期"),F("progress","預定／實際進度"))),
      S("施工與材料",Table("work","施工項目與數量",[Col("item","施工項目"),Col("unit","單位"),Col("contract","契約數量"),Col("today","本日完成"),Col("total","累計完成"),Col("note","備註")],5),Table("materials","材料管理",[Col("material","材料名稱"),Col("unit","單位"),Col("contract","契約數量"),Col("today","本日使用"),Col("total","累計使用"),Col("note","備註")],4)),
      S("人員、機具及安全",Table("labor","工地人員及機具",[Col("trade","工別／機具"),Col("today","本日數量"),Col("total","累計數量"),Col("note","備註")],5),Fields(F("safety","施工前檢查、勤前教育、保險及PPE","textarea",true),F("sampling","施工取樣試驗紀錄","textarea",true),F("coordination","通知協力廠商事項","textarea",true),F("important","重要事項紀錄","textarea",true))),
      S("簽章",Fields(F("site_manager","工地主任／依法簽章人","textarea",true)),Note("正式格式、簽章責任及增列欄位以公共工程施工品質管理作業要點最新版與工程契約為準。"))
    ]},
    {id:"c03",group:"construction",source:"contract",title:"附表五 公共工程監造報表",timing:"施工正式開工後每日",owner:"監造單位",reviewer:"監造主任",description:"契約附件正式表單的欄位預覽；用於每日監造，不是監造技術服務的開工報告單。",sections:[
      S("工程基本資料",Fields(F("report_no","表報編號"),F("date","填報日期","date"),F("weather_am","上午天氣"),F("weather_pm","下午天氣"),F("project","工程名稱"),F("duration","契約工期／開完工日"),F("change","契約變更次數／展延天數"),F("amount","原契約／變更後金額"),F("progress","預定／實際進度"))),
      S("監造事項",Fields(F("progress_detail","一、工程進行情況","textarea",true),F("inspection","二、監督施工圖及檢驗停留點／抽查","textarea",true),F("quality","三、材料規格、品質及抽（試）驗","textarea",true),F("safety","四、職業安全衛生督導","textarea",true),F("other","五、其他約定監造事項","textarea",true))),
      S("簽章",Fields(F("signature","監造單位簽章","textarea",true)),Note("施工尚未正式開工時不得提前填報為已執行。"))
    ]},
    {id:"c04",group:"pre",source:"contract",title:"附表三 監造單位現場人員登錄表",timing:"施工標案開工前／人員異動／工程竣工",owner:"監造單位",reviewer:"甲方核定並上網登錄",description:"依公共工程施工品質管理作業要點附表三及工作說明書7.3.15.1建立；正式送件以原附件版面為準。",sections:[
      S("工程與機關資料",Fields(F("report_date","填報日期","date"),F("project","工程標案名稱"),F("project_no","工程標案電腦編號"),F("location","工程地點"),F("start_date","開工日期","date"),F("planned_finish","預計完工日期","date"),F("award_amount","決標金額（千元）","number"),F("supervision_fee","監造費用（千元）","number"),F("site_contact","工地聯絡人及電話"),F("owner","工程主辦機關"),F("owner_contact","承辦人姓名及電話"),F("supervisor_company","監造單位／廠商"))),
      S("受訓合格現場人員",Table("staff","人員登錄",[Col("name","姓名"),Col("specialty","專長"),Col("id_no","身分證號"),Col("training","受訓期別"),Col("entry_leave","進駐／解職日期"),Col("refresher","回訓期別")],5)),
      S("登錄性質與附件",Fields(F("type","登錄類型","select",false,["第一次登錄","異動","工程竣工"]),F("reason","異動原因")),Checks("attachments","第一次登錄／異動附件",["品管訓練結業證書或回訓證明影本","證書正本提出相驗","相關學經歷一覽表（含工作內容）","本登錄表","函請甲方核定及上網登錄"]),Note("本表含身分證號，不得將填寫資料發布至公開網頁；正式檔須存於受控卷宗。",true))
    ]},
    {id:"c05",group:"pre",source:"contract",title:"附表三 輸供系統承攬商工作人員工作證申請表",timing:"進入工地工作前",owner:"承攬商",reviewer:"甲方權責部門",description:"契約安全衛生附件已附正式申請表；本頁是欄位預覽，須另確認監造人員適用職類與最新版。",sections:[
      S("申請資料",Fields(F("vendor","廠商名稱"),F("apply_date","申請日期","date"),F("name","姓名"),F("birth","出生日期","date"),F("id_no","身分證號"),F("category","申請職類／顏色"),F("license_no","證照號碼"),F("photo","3個月內照片檔名／受控位置"))),
      S("檢覈項目",Checks("review","證明文件及相片",["合格證照或職類資格","身分證件／外籍人員合法工作文件","勞工保險投保資料","安全衛生教育訓練紀錄／臺灣職安卡","3個月內照片電子檔","個資告知暨同意書","雇主意外責任險","未遭停權查證","正本已由甲方當場核對","影本蓋與正本相符戳章及認章"])),
      S("審查與用印",Fields(F("vendor_stamp","廠商蓋章／經辦","textarea",true),F("owner_review","甲方經辦／課長／經理","textarea",true)),Note("身分證號、照片及保險資料屬個資；本預覽不能取代契約附件原表及甲方核發程序。",true))
    ]},
    {id:"c06",group:"pre",source:"contract",title:"附表一 輸變電工程處承攬商工作人員臨時工作證申請表",timing:"臨時短暫工作或等待正式工作證期間",owner:"承攬商",reviewer:"工程或勞務主辦部門",description:"臨時證每人原則限6工作日；營造工程必要時得展延1次，非營造工程不得展延。",sections:[
      S("申請資料",Fields(F("vendor","廠商名稱"),F("apply_date","申請日期","date"),F("start","預定使用起日","date"),F("end","預定使用末日","date"),F("work_type","工程／勞務及工作內容","textarea",true))),
      S("申請人員",Table("people","臨時工作證申請",[Col("name","姓名"),Col("birth","出生日期","date"),Col("id_no","身分證號"),Col("license","合格證照"),Col("identity","身分證件"),Col("insurance","勞保投保資料"),Col("training","安全衛生教育訓練"),Col("hazard","危害告知"),Col("result","審核結果")],4)),
      S("審查確認",Checks("temporary","送件前確認",["證明文件正本備供當場核對","影本蓋與正本相符戳章及認章","營造工程未逾6工作日或已有核准展延","非營造工程未逾6工作日且未申請展延","由工程或勞務主辦部門核發"]),Fields(F("owner_review","甲方經辦／課長／經理","textarea",true)),Note("臨時工作證有次數及期間限制，不得反覆使用取代正式工作證。",true))
    ]},
    {id:"t01",group:"taipower",source:"taipower",title:"本工作（監造技術服務）開工報告單－格式取得追蹤",timing:"9/1填寫、開工日起3日內送達",owner:"文書管理人員",reviewer:"監造主任",description:"不得以自製表取代台電制式開工報告單；本卡只追蹤格式、通知、預填、用印與核定。",sections:[
      S("取得與送審",Fields(F("request_date","向台電索取日期","date"),F("contact","台電窗口"),F("received_date","取得最新版日期","date"),F("version","表單版次／來源"),F("start_notice","開工通知文號／日期"),F("start_date","實際開工日","date"),F("deadline","最遲送達日","date"),F("sent","實際送出日","date"),F("docno","發文字號"),F("approved","台電核定日","date"))),
      S("追蹤檢核",Checks("opening","必要步驟",["取得台電制式空白表單","取得填寫範例及送審窗口","依9/1實況完成預填","監造主任覆核","公司用印","正式函送並取得收文證明","退補件保留版本","核定函歸檔"]),Note("此處不呈現仿製表單；未取得正式格式前狀態應維持『待台電格式』。",true))
    ]},
    {id:"t02",group:"taipower",source:"taipower",title:"工作證／臨時工作證適用類型與最新版確認",timing:"進入工地工作前",owner:"職安人員",reviewer:"監造主任",description:"契約附件已有C05、C06格式；本卡改為確認監造人員適用正式證或臨時證、甲方窗口、最新版與核發結果。",sections:[
      S("格式與窗口",Fields(F("type","證件類型","select",false,["待確認","輸供系統工作證","輸變電工程處臨時工作證","其他"]),F("contact","台電窗口"),F("request","索取日","date"),F("received","取得格式日","date"),F("version","版次／來源"),F("deadline","申請期限","date"))),
      S("申請人員",Table("people","證件追蹤",[Col("name","姓名"),Col("role","職務"),Col("training","安衛訓練紀錄"),Col("hazard","危害告知"),Col("photo","照片／附件"),Col("sent","申請日","date"),Col("issued","核發日","date"),Col("valid","有效期"),Col("note","備註")],8)),
      S("提醒",Note("工作證申請所附安全衛生教育訓練，不能取代契約要求的12小時監造職前訓練。",true))
    ]},
    {id:"t03",group:"taipower",source:"taipower",title:"監造人員／公共工程雲端登錄追蹤",timing:"施工標案開工前／異動／竣工",owner:"文書管理人員",reviewer:"監造主任",description:"正式紙本格式見C04；本卡追蹤甲方核定、雲端登錄時點、完成畫面與權責，不在公開頁保存帳密。",sections:[
      S("系統資料",Fields(F("system","系統名稱／網址"),F("contact","台電窗口"),F("required","要求文號／期限"),F("account_owner","公司帳號保管人"),F("note","不得記錄密碼；權限與操作說明","textarea",true))),
      S("人員登錄",Table("registration","登錄狀態",[Col("name","姓名"),Col("role","職務"),Col("approved","資格核准日","date"),Col("registered","登錄日","date"),Col("screenshot","完成畫面位置"),Col("result","狀態","select",["待核准","待登錄","已登錄","退補件"]),Col("note","備註")],8))
    ]},
    {id:"t04",group:"taipower",source:"taipower",title:"台電出勤配置計畫制式格式取得追蹤",timing:"每月出勤配置送審前",owner:"文書管理人員",reviewer:"監造主任",description:"如台電另有制式格式，應以台電版為正式送審文件；公司排班表僅作編製底稿。",sections:[
      S("格式確認",Fields(F("contact","台電窗口"),F("request","詢問日期","date"),F("reply","回覆日期","date"),F("has_template","是否有制式格式","select",false,["待確認","有","無，得自製"]),F("version","版次／來源"),F("deadline","每月送審期限"),F("approval","核可方式／文號"))),
      S("附件要求",Checks("attendance_format","確認項目",["組織架構","實際派駐人員","每日班表","職務分工","請假代理","最低留守人力","簽到退方式","24小時連續施工排程","編製／覆核／核可欄位"]))
    ]}
  ];
  const el=id=>document.getElementById(id);
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let state=load();const requestedForm=new URLSearchParams(location.search).get("form");let active=forms.some(form=>form.id===requestedForm)?requestedForm:forms[0].id;let filter="all";let search="";
  function load(){try{const x=JSON.parse(localStorage.getItem(STORE));if(x&&x.forms)return x}catch(e){}return {version:VERSION,forms:{}}}
  function persist(){state.version=VERSION;localStorage.setItem(STORE,JSON.stringify(state))}
  function formState(id){if(!state.forms[id]){const def=forms.find(form=>form.id===id);state.forms[id]={status:def?.source==="taipower"?"待台電格式":"未開始",values:{},tables:{},updatedAt:null}}return state.forms[id]}
  function ensureRows(def,block){const fs=formState(def.id);if(!fs.tables[block.id])fs.tables[block.id]=Array.from({length:block.rows},()=>({}));return fs.tables[block.id]}
  function sourceLabel(s){return s==="internal"?"公司自製管理表":s==="contract"?"契約正式表單預覽":"待台電提供格式"}
  function sourceClass(s){return s==="internal"?"internal":s==="contract"?"contract":"taipower"}
  function stageLabel(g){return g==="pre"?"進場前":g==="day1"?"9/1首日／派駐後":g==="construction"?"施工正式啟動後":"台電格式追蹤"}
  function statusClass(s){return ["已送審","已核定"].includes(s)?"done":["準備中","待用印","退補件"].includes(s)?"progress":""}
  function matches(def){const q=(def.title+def.description+def.timing+def.owner).toLowerCase();return (!search||q.includes(search))&&(filter==="all"||(filter==="taipower"?def.source==="taipower":def.group===filter))}
  function renderList(){const shown=forms.filter(matches);el("formList").innerHTML=shown.map(def=>{const fs=formState(def.id);return `<button class="form-item ${def.id===active?'active':''}" data-form="${def.id}" type="button"><strong>${esc(def.title)}</strong><small><span>${esc(stageLabel(def.group))}</span><span><i class="status-dot ${statusClass(fs.status)}"></i>${esc(fs.status)}</span></small></button>`}).join("")||`<div class="empty">沒有符合條件的表單。</div>`;el("formList").querySelectorAll("[data-form]").forEach(btn=>btn.addEventListener("click",()=>selectForm(btn.dataset.form)))}
  function inputHtml(def,field){const fs=formState(def.id),v=fs.values[field.id]??"",common=`data-field="${field.id}" aria-label="${esc(field.label)}"`;if(field.type==="textarea")return `<textarea ${common}>${esc(v)}</textarea>`;if(field.type==="select")return `<select ${common}><option value="">請選擇</option>${field.options.map(o=>`<option ${String(v)===o?'selected':''}>${esc(o)}</option>`).join("")}</select>`;return `<input ${common} type="${field.type}" value="${esc(v)}">`}
  function renderBlock(def,block){if(block.kind==="fields")return `<div class="field-grid">${block.items.map(f=>`<div class="field ${f.wide?'full':''}"><label>${esc(f.label)}</label>${inputHtml(def,f)}</div>`).join("")}</div>`;if(block.kind==="checks"){const fs=formState(def.id);return `<h4>${esc(block.title)}</h4><div class="check-grid">${block.items.map((item,i)=>{const key=`${block.id}__${i}`;return `<label class="check-item"><input type="checkbox" data-field="${key}" ${fs.values[key]?'checked':''}><span>${esc(item)}</span></label>`}).join("")}</div>`}if(block.kind==="note")return `<div class="guidance ${block.warning?'warning':''}">${esc(block.text)}</div>`;if(block.kind==="table"){const rows=ensureRows(def,block);return `<h4>${esc(block.title)}</h4><div class="table-wrap"><table class="form-table"><thead><tr>${block.columns.map(c=>`<th>${esc(c.label)}</th>`).join("")}<th class="row-actions no-print">刪除</th></tr></thead><tbody>${rows.map((row,ri)=>`<tr>${block.columns.map(c=>`<td>${tableInput(def,block,c,row[c.key]??"",ri)}</td>`).join("")}<td class="row-actions no-print"><button class="remove-row" data-remove-table="${block.id}" data-row="${ri}" type="button">×</button></td></tr>`).join("")}</tbody></table></div><div class="table-actions no-print"><button class="btn small" data-add-table="${block.id}" type="button">＋新增一列</button></div>`}return ""}
  function tableInput(def,block,col,value,row){const common=`data-table="${block.id}" data-row="${row}" data-col="${col.key}" aria-label="${esc(col.label)}"`;if(col.type==="select")return `<select ${common}><option value="">請選擇</option>${col.options.map(o=>`<option ${String(value)===o?'selected':''}>${esc(o)}</option>`).join("")}</select>`;if(col.type==="textarea")return `<textarea ${common}>${esc(value)}</textarea>`;return `<input ${common} type="${col.type}" value="${esc(value)}">`}
  function renderActive(){const def=forms.find(f=>f.id===active)||forms[0],fs=formState(def.id);el("activeTitle").textContent=def.title;el("activeDescription").textContent=def.description;el("activeMeta").innerHTML=`<span class="badge ${sourceClass(def.source)}">${sourceLabel(def.source)}</span><span class="badge stage">${stageLabel(def.group)}</span><span class="badge stage">使用：${esc(def.timing)}</span><span class="badge stage">填表：${esc(def.owner)}</span><span class="badge stage">覆核：${esc(def.reviewer)}</span>`;el("statusSelect").innerHTML=statuses.map(s=>`<option ${s===fs.status?'selected':''}>${s}</option>`).join("");el("formCanvas").innerHTML=`<div class="form-paper"><div class="paper-title"><h3>${esc(def.title)}</h3><p>${esc(sourceLabel(def.source))}｜${esc(def.timing)}｜版本 ${VERSION}</p></div>${def.sections.map(sec=>`<section class="form-section"><h4>${esc(sec.title)}</h4>${sec.blocks.map(b=>renderBlock(def,b)).join("")}</section>`).join("")}</div>`;bindCanvas();el("saveNote").textContent=fs.updatedAt?`最後保存：${new Date(fs.updatedAt).toLocaleString("zh-TW")}`:"尚未儲存";el("wordBtn").disabled=def.source==="taipower";renderMetrics()}
  function bindCanvas(){el("formCanvas").querySelectorAll("input,textarea,select").forEach(input=>input.addEventListener("input",onInput));el("formCanvas").querySelectorAll("[data-add-table]").forEach(btn=>btn.addEventListener("click",()=>{const def=forms.find(f=>f.id===active),fs=formState(active);fs.tables[btn.dataset.addTable].push({});touch();renderActive()}));el("formCanvas").querySelectorAll("[data-remove-table]").forEach(btn=>btn.addEventListener("click",()=>{const fs=formState(active),rows=fs.tables[btn.dataset.removeTable];if(rows.length<=1)return alert("至少保留一列。 ");rows.splice(Number(btn.dataset.row),1);touch();renderActive()}))}
  function onInput(e){const fs=formState(active);if(e.target.dataset.field){fs.values[e.target.dataset.field]=e.target.type==="checkbox"?e.target.checked:e.target.value}else if(e.target.dataset.table){fs.tables[e.target.dataset.table][Number(e.target.dataset.row)][e.target.dataset.col]=e.target.value}touch(false)}
  function touch(show=true){const fs=formState(active);fs.updatedAt=new Date().toISOString();persist();if(show)el("saveNote").textContent=`最後保存：${new Date(fs.updatedAt).toLocaleString("zh-TW")}`}
  function selectForm(id){active=id;renderList();renderActive();window.scrollTo({top:document.querySelector(".workspace").offsetTop-8,behavior:"smooth"})}
  function renderMetrics(){el("metricTotal").textContent=forms.length;el("metricInternal").textContent=forms.filter(f=>f.source==="internal").length;el("metricContract").textContent=forms.filter(f=>f.source==="contract").length;el("metricTaipower").textContent=forms.filter(f=>f.source==="taipower").length;el("metricDone").textContent=forms.filter(f=>["已送審","已核定"].includes(formState(f.id).status)).length}
  function resetActive(){const def=forms.find(f=>f.id===active);if(!confirm(`確定清除「${def.title}」的全部填寫內容？`))return;delete state.forms[active];persist();renderList();renderActive()}
  function download(name,type,content){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}
  function exportWord(){const def=forms.find(f=>f.id===active);if(def.source==="taipower")return;const clone=document.querySelector(".form-paper").cloneNode(true);clone.querySelectorAll(".no-print,.table-actions").forEach(n=>n.remove());clone.querySelectorAll("input,textarea,select").forEach(node=>{const span=document.createElement("span");span.style.cssText="display:block;min-height:24px;padding:3px 5px;white-space:pre-wrap";span.textContent=node.type==="checkbox"?(node.checked?"☑":"☐"):(node.tagName==="SELECT"?node.options[node.selectedIndex]?.text||"":node.value||"");node.replaceWith(span)});const html=`<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:'Microsoft JhengHei',sans-serif;color:#222}table{border-collapse:collapse;width:100%}th,td{border:1px solid #777;padding:5px}h3{text-align:center}.form-section{margin:14px 0}.field-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.field{border:1px solid #aaa;padding:5px}.check-item{display:block;margin:3px}</style></head><body>${clone.outerHTML}</body></html>`;download(`${safeName(def.title)}_${VERSION}.doc`,`application/msword;charset=utf-8`,`\ufeff${html}`)}
  function safeName(s){return s.replace(/[\\/:*?"<>|（）()]/g,"_")}
  function backup(){download(`觀音中大_進場表單備份_${VERSION}.json`,`application/json`,JSON.stringify({version:VERSION,exportedAt:new Date().toISOString(),state},null,2))}
  function restore(file){const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);const incoming=data.state||data;if(!incoming||typeof incoming.forms!=="object")throw new Error("備份格式不符");if(!confirm("匯入將覆蓋目前瀏覽器內的全部表單資料，確定繼續？"))return;state=incoming;persist();renderList();renderActive();alert("表單備份已匯入。") }catch(e){alert("匯入失敗："+e.message)}};reader.readAsText(file)}
  function init(){el("statusSelect").addEventListener("change",e=>{formState(active).status=e.target.value;touch();renderList();renderMetrics()});el("saveBtn").addEventListener("click",()=>{touch();alert("本表已保存在目前瀏覽器。")});el("resetBtn").addEventListener("click",resetActive);el("wordBtn").addEventListener("click",exportWord);el("printBtn").addEventListener("click",()=>window.print());el("backupBtn").addEventListener("click",backup);el("restoreFile").addEventListener("change",e=>{if(e.target.files[0])restore(e.target.files[0]);e.target.value=""});el("searchInput").addEventListener("input",e=>{search=e.target.value.trim().toLowerCase();renderList()});document.querySelectorAll(".filter").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".filter").forEach(b=>b.classList.remove("active"));btn.classList.add("active");filter=btn.dataset.filter;renderList()}));renderList();renderActive()}
  init();
})();
