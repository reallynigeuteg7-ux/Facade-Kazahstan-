// Source measurements from 24 reference sheets, received 29 Sep / 1 Oct 2026.
// These raster references are not certified CAD or validated cut files.
/** @type {Array<[number,number,string,[number,number,number,number|null],Record<string,number|string>,string[]?]>} */
const rows=[
 [12,22,'diagonal-bin',[350,600,350,null],{postSize:40,tubeWall:2,vesselWidth:330,vesselDepth:310,vesselBottomWidth:260,vesselBottomDepth:240,vesselHeight:520,vesselThickness:1.5,openingHeight:0,paint:'RAL 9005'},['Новый лист заменяет круглую урну прямоугольным ажурным корпусом.','Бак 330×310 не помещается в корпус 350×350 с профилем 40×40: просвет 270×270. В модели бак уменьшен с зазором 5 мм по сторонам; фактические размеры приведены в спецификации.','На общих видах бак заметно ниже отдельной детали с высотой 520 мм. Для сохранения вида модели принята высота 62% корпуса; согласовать размер бака.','Толщина ажурных панелей и бака, размеры монтажных пластин на листе не заданы; показаны предварительно.']],
 [16,23,'tree-slot-bin',[350,600,350,2],{postSize:40,tubeWall:2,vesselWidth:330,vesselDepth:310,vesselBottomWidth:260,vesselBottomDepth:240,vesselHeight:520,vesselThickness:1.5,openingHeight:100,paint:'RAL 9005'},['Бак 330×310 не помещается между профилями 40×40 корпуса 350×350. Бак подогнан под просвет с зазором 5 мм и опущен до нижней кромки бокового проёма.','Высота проёма 100 мм, толщина бака и монтажные узлы оценены по изображению. На разрезе высота бака расходится с отдельной деталью 520 мм; согласовать фактическую компоновку.']],
 [20,24,'fire-bowl',[740,300,740,3],{paint:'Чёрный, покрытие уточнить'},['Шестигранная чаша: на листе заданы только габариты 740×740×300 мм и толщина стали 3 мм. Низ чаши, основание, наклон стенок и вентиляционные прорези восстановлены по пропорциям изображения.','Размер 740 указан в двух направлениях; габариты сохранены, правильность шестигранника и развёртки согласовать.','Покрытие и сварные соединения для нагреваемой чаши необходимо уточнить у изготовителя.']],
 [1,2,'bench-angled',[1880,930,650,8],{seatHeight:450,seatDepth:600,woodWidth:120,woodThickness:30,backCount:3,panelHeight:150,angle:10,tubeA:40,tubeB:20,tubeWall:2,fastener:'M8×70',paint:'RAL 9016'}],
 [2,3,'bench-ornate',[1800,930,650,8],{seatHeight:450,seatDepth:600,woodWidth:120,woodThickness:30,backCount:3,panelHeight:150,angle:10,tubeA:40,tubeB:20,tubeWall:2,fastener:'M8×70',paint:'RAL 9016'},['На виде спереди три планки спинки, в спецификации пять. Количество и отверстия требуют сверки.','Название QAZALY сохраняется как образец, текст для конкретного заказа согласуется отдельно.']],
 [3,4,'bench-tree',[2000,850,650,4],{seatHeight:450,seatDepth:600,woodWidth:120,woodThickness:40,backCount:3,angle:10,tubeA:40,tubeB:40,tubeWall:2,fastener:'M8×70',paint:'RAL 9005'},['Виды и спецификация расходятся по числу планок и ширине: на виде 100 мм, в таблице 120 мм.']],
 [4,5,'bench-tube',[2000,800,600,null],{seatHeight:450,seatDepth:440,woodWidth:90,woodThickness:20,backCount:4,angle:15,tubeA:40,tubeB:40,tubeWall:2,fastener:'M6',paint:'RAL 9005'},['На фронтальном виде планки горизонтальные, на заднем и 3D вертикальные; ориентацию спинки должен выбрать специалист. Толщина деревянной планки на сечении нечёткая.']],
 [5,6,'bench-curved',[1800,850,620,15],{seatHeight:450,seatDepth:430,woodWidth:90,woodThickness:25,backCount:4,angle:15,tubeA:40,tubeB:40,tubeWall:2,fastener:'M8',paint:'RAL 9005'},['Указано пять планок шириной 90 мм при глубине сиденья 430 мм: 5×90=450 мм без зазоров. Компоновка предварительная.']],
 [6,7,'bench-ethno',[1800,850,620,15],{seatHeight:450,seatDepth:430,woodWidth:90,woodThickness:25,backCount:3,panelHeight:100,angle:15,tubeA:40,tubeB:40,tubeWall:2,fastener:'M8',paint:'RAL 9016'},['Согласовать расположение четырёх планок спинки относительно верхней декоративной панели.']],
 [7,9,'kit',[1800,850,620,null],{seatHeight:450,seatDepth:420,woodWidth:90,woodThickness:25,backCount:3,panelHeight:100,angle:15,tubeA:40,tubeB:40,tubeWall:2,paint:'RAL 9016',binWidth:500,binHeight:700,binDepth:500,columnWidth:120,columnHeight:1000,columnBase:200},['Толщина панелей и размеры узлов комплекта не указаны на выбранном листе.','W/H/D заказа относятся к скамейке; урна и столбик сохраняют собственные исходные габариты.']],
 [8,11,'bench-triangle',[1800,880,620,8],{seatHeight:430,seatDepth:430,woodWidth:90,woodThickness:30,backCount:4,angle:15,tubeA:40,tubeB:20,tubeWall:1.5,fastener:'M8×30',paint:'RAL 9005'},['В таблице девять планок сиденья и восемь спинки; это не согласуется с видами и глубиной 430 мм.']],
 [9,12,'bench-backless',[1800,450,450,4],{seatHeight:450,seatDepth:450,woodWidth:90,woodThickness:40,backCount:0,tubeA:40,tubeB:40,tubeWall:2,fastener:'M8×60',paint:'RAL 9005'}],
 [10,1,'ash-bin',[500,1050,300,1.5],{postSize:50,tubeWall:2,baseThickness:10,baseHole:12,vesselInsetW:100,vesselInsetD:50,vesselBottom:120,vesselTopInset:330,ashHeight:120,ashInsetW:100,ashInsetD:50,fastener:'M10',paint:'RAL 9005'},['На фронтальном виде повторяется размер 120 у нижнего бака; спецификация задаёт 600 мм. Нижняя компоновка требует сверки.']],
 [11,13,'cage-bin',[420,900,420,3],{postSize:40,tubeWall:2,vesselWidth:360,vesselDepth:360,vesselHeight:700,vesselThickness:1.5,fastener:'M6',paint:'RAL 9005'},['Задняя панель сплошная, декоративные панели — три. Точный контур звёзд и места креплений требуют сверки.']],
 [13,14,'arch-bin',[400,950,380,2],{openingHeight:250,radius:150,footHeight:30,woodWidth:60,woodThickness:20,vesselWidth:320,vesselDepth:300,vesselHeight:650,vesselThickness:.8,paint:'RAL 9005'},['Толщина внутреннего бака задана диапазоном 0,8–1 мм; в модели выбран нижний предел и нужна проверка.']],
 [14,15,'wood-bin',[450,950,400,2],{footHeight:200,woodWidth:30,woodGap:10,woodThickness:10,vesselWidth:360,vesselDepth:310,vesselHeight:600,vesselThickness:.8,paint:'RAL 7035'},['Таблица указывает ламель 30×10, деталь показывает ширину 30 и зазор 10. Проверить сечение и высоту ламелей.']],
 [15,16,'angled-bin',[380,640,380,3],{postA:40,postB:20,tubeWall:2,canopyHeight:30,vesselWidth:300,vesselDepth:300,vesselBottomWidth:200,vesselHeight:460,vesselThickness:2,fastener:'M10',paint:'RAL 9005'},['В таблице боковая стойка 640 по длине, а 640 — общая высота. Длину наклонной стойки пересчитывать по геометрии.']],
 [17,17,'basket',[560,560,350,2],{postSize:40,tubeWall:2,paint:'RAL — по заказу'},['Разрез одновременно помечает 350 как внутренний и наружный размер; толщины и внутренний просвет требуют сверки.']],
 [18,18,'light',[100,1100,100,null],{postSize:100,capHeight:30,baseHeight:30,decorHeight:700,baseHole:10,paint:'Белый',voltage:220,ip:'IP65'},['Толщина стенки металлического профиля не указана. Основание 100×100 с четырьмя отверстиями не содержит межосевых расстояний.']],
 [19,19,'grill',[1200,800,400,2],{fireDepth:300,fireHeight:150,footWidth:150,paint:'По заказу'},['На изображении указана толщина 2 мм, в исходном каталоге 3 мм. Используется присланный лист; толщину подтвердить специалисту.','Эскиз замковых соединений без точных координат пазов.']],
 [21,20,'swing',[2000,2200,1600,null],{tubeA:60,tubeB:40,tubeWall:2,braceSize:40,braceWall:2,seatWidth:1500,seatDepth:600,seatHeight:450,seatBackHeight:500,woodWidth:90,woodThickness:25,paint:'По заказу'},['Сечения досок, толщина профнастила, цепи и узел подвеса не заданы полностью. Указанное сечение деревянных элементов — визуальная оценка; не включать в подтверждённую спецификацию.']],
 [22,21,'pergola',[2500,2300,1400,null],{tubeA:60,tubeB:40,tubeWall:2,panelWidth:600,paint:'По заказу'},['Подвесные кресла и декоративные панели без толщины и точных контуров. Несущая конструкция и подвесы требуют проверки нагрузки.']],
];
export const blueprints=rows.map(([page,attachment,shape,base,fixed,issues=[]])=>({
 id:`blueprint-2026-p${page}-v2`,solidRevision:2,page,attachment,shape,
 image:`/drawing-templates/reference-${String(attachment).padStart(2,'0')}.png`,
 preview:`/drawing-templates/preview-${String(attachment).padStart(2,'0')}.webp`,
 base:{width:base[0],height:base[1],depth:base[2],thickness:base[3]},fixed,issues,
 status:'draft',dimensionScope:shape==='kit'?'bench':'product',
 source:'Чертёж заказчика · '+(attachment>=22?'01.10.2026':'29.09.2026')+' · изображение '+attachment,
}));
export const blueprintByPage=page=>blueprints.find(b=>b.page===page)||null;
export const blueprintById=id=>blueprints.find(b=>b.id===id)||null;
export function blueprintWarnings(model,dimensions){
 const b=model.blueprint;if(!b)return [];
 const warnings=[...b.issues];
 if(dimensions.thickness===null)warnings.push('Толщина основного листа не задана. В 3D показана условно; её нельзя использовать для расчёта материала или резки.');
 if(b.shape.startsWith('bench')||b.shape==='kit')warnings.push('Планки укладываются с неизменным сечением; количество пересчитывается по свободному месту. Согласовать зазоры и компоновку с исходником.');
 if(dimensions.thickness!==null&&b.base.thickness!==null&&dimensions.thickness!==b.base.thickness)warnings.push('Толщина клиента отличается от исходного шаблона. Другие сечения и толщины сохраняются; замену должен проверить специалист.');
 warnings.push('Исходник — изображение. Точные контуры резки, отверстия, допуски и нагрузки пока не подтверждены специалистом.');
 warnings.push(b.solidRevision?'Орнамент выполнен сквозными отверстиями. Контуры восстановлены из растрового листа: перед резкой проверить перемычки, допуски и крепления.':'Перенос в 3D предварительный: скрытые узлы и неуказанные детали показаны условно. Орнамент отображён на поверхности, не является готовым контуром резки.');
 return warnings;
}
export function validateBlueprintSize(model,dim){
 const b=model.blueprint;if(!b||!dim.width||!dim.height||!dim.depth)return;
 const f=b.fixed;
 const bench=b.shape.startsWith('bench')||b.shape==='kit';
 const minW=bench?400:b.shape==='swing'||b.shape==='pergola'?800:b.shape==='light'?80:200;
 const minD=bench?(f.woodWidth||90)+35+(b.shape==='bench-backless'?0:Math.max(0,dim.height-f.seatHeight)*Math.tan((f.angle||10)*Math.PI/180)):b.shape==='light'?80:b.shape==='swing'?800:150;
 const minH=bench&&b.shape!=='bench-backless'?(f.seatHeight||450)+(f.panelHeight||0)+(f.woodWidth||90)+12:b.shape==='ash-bin'?500:b.shape==='wood-bin'?350:b.shape==='arch-bin'?450:b.shape==='swing'?1200:b.shape==='pergola'?1500:b.shape==='light'?200:250;
 if(dim.width<minW||dim.depth<minD||dim.height<minH)throw Error(`Размеры не подходят шаблону: минимум W ${minW}, H ${minH}, D ${minD} мм. Сечения и толщины не растягиваются.`);
}
