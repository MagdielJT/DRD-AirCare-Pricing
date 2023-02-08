/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
/**
 * @name tkio_pricing_sl
 * @version 1.0
 * @author Ricardo López <ricardo.lopez@freebug.mx>
 * @summary Suitelet 
 * @copyright Tekiio México 2022
 * 
 * Last modification   -> 13/12/2022
 * Modified by         -> Ricardo López <ricardo.lopez@freebug.mx>
 * Script in NS        -> Registro en Netsuite <ID del registro>
 */
define(['N/log', 'N/search', 'N/ui/serverWidget', 'N/ui/message', 'N/file', 'N/record', 'N/runtime', './moment.min', 'N/format'],
    /**
     * @param{log} log
     * @param{search} search
     * @param{serverWidget} serverWidget
    */
    (log, search, serverWidget, message, file, record, runtime, moment, format) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
        */
        var params = null;
        let itemsList = [[], []];
        let itemsFiltrar = [];
        var arrID = '';
        const onRequest = (scriptContext) => {
            try {
                var user = runtime.getCurrentUser().name;
                var parameters = scriptContext.request.parameters;
                params = scriptContext.request.parameters;
                var form = creaPanel(scriptContext, params);
                switch (params.action) {
                    case "filtrar":
                        itemsList = searchItems(params);
                        log.audit({ title: 'itemsList', details: itemsList });
                        addItemsList(form, itemsList[0], itemsList[1]);
                        createFileObj(itemsFiltrar);
                        let info = infoSystem('filtrar', 'Se ha realizado una acción de filtrar en la pantalla de precios, en el periodo ' + params.periodo + ' con la clase ' + params.clase);
                        break;
                    case "marcarTodo":
                        if (params.periodo !== '' && params.clase !== '' && params.monedaUsd !== '' && params.monedaMxn !== '') {
                            log.debug({ title: 'params.flag', details: typeof params.flag });
                            if (params.flag === "true") {
                                getDataForFile(38449);
                            } else if (params.flag === "false") {
                                getDataForFile(38455);
                                form.addButton({ id: "custpage_tkio_guardar", label: "Guardar", functionName: 'guardar("' + user + '")' });
                            }
                            addItemsList(form, itemsList[0], itemsList[1]);
                            markAll(form, itemsList[0], itemsList[1], 'T');
                            var arrItems = form.addField({ id: "custpage_tkio_arritems", type: serverWidget.FieldType.TEXT, label: "Arreglo de id" });
                            arrItems.defaultValue = arrID;
                            arrItems.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
                            let info = infoSystem('marcar Todo', 'Se ha realizado una acción de marcar todos los artículos de la lista, dentro de la pantalla de precios.');
                        }
                        break;
                    case "desMarcarTodo":
                        if (params.periodo !== '' && params.clase !== '' && params.monedaUsd !== '' && params.monedaMxn !== '') {
                            if (params.flag === "true") {
                                getDataForFile(38449);
                            } else if (params.flag === "false") {
                                getDataForFile(38455);
                                form.addButton({ id: "custpage_tkio_guardar", label: "Guardar", functionName: 'guardar("' + user + '")' });
                            }
                            addItemsList(form, itemsList[0], itemsList[1]);
                            markAll(form, itemsList[0], itemsList[1], 'F');
                            let info = infoSystem('Desmarcar Todo', 'Se ha realizado una acción de desmarcar todos los artículos de la lista, dentro de la pantalla de precios.');
                            var arrItems = form.addField({ id: "custpage_tkio_arritems", type: serverWidget.FieldType.TEXT, label: "Arreglo de id" });
                            arrItems.defaultValue = '';
                            arrItems.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
                        }
                        break;
                    case "incrementar":
                        getDataForFile(38455);
                        addItemsList(form, itemsList[0], itemsList[1]);
                        form.addButton({ id: "custpage_tkio_exportar", label: "Exportar", functionName: 'exportar("' + user + '")' });
                        let informacion = infoSystem('Incrementar', 'Se ha realizado una acción de Incrementar artículos de la lista, dentro de la pantalla de precios.');
                        break;
                    case "exportar":
                        log.audit({title: 'Exportar', details: "Bandera"});
                        getDataForFile(38455);
                        addItemsList(form, itemsList[0], itemsList[1]);
                        form.addButton({ id: "custpage_tkio_exportar", label: "Exportar", functionName: 'exportar("' + user + '")' });
                        form.addButton({ id: "custpage_tkio_guardar", label: "Guardar", functionName: 'guardar("' + user + '")' });
                        let information = infoSystem('Incrementar', 'Se ha realizado una acción de Incrementar artículos de la lista, dentro de la pantalla de precios.');
                        break;
                }

                scriptContext.response.writePage({ pageObject: form });
            } catch (e) {
                log.error({ title: "error onRequest", details: e });
                var formerror = errForm(e);
                scriptContext.response.writePage({
                    pageObject: formerror
                })
            }
        }
        
        /**
         * 
         * @param {*} arreglos 
         * @summary {Función que servirá para crear un archivo TXT}
         */
        function createFileObj(arreglos) {
            try {
                var arreglo = { arrmxn: arreglos[0], arrusd: arreglos[1] }
                var fileObj = file.create({
                    name: 'precios_filtrar_JSON.txt',
                    fileType: file.Type.PLAINTEXT,
                    contents: JSON.stringify(arreglo),
                    encoding: file.Encoding.UTF8,
                    folder: 2660,
                    isOnline: true
                });
                var fileId = fileObj.save();
                estado = "incrementado"
            } catch (error) {
                log.audit({ title: 'Error createFileObj: ', details: error });
                estado = "error_file"
            }
        }
        /**
         * 
         * @param {*} accion 
         * @summary Función que servirá para registrar las acciones del sistema.
         */
        function infoSystem(accion, descripcion) {
            try {

                let guardarInfo = record.create({
                    type: 'customrecord_tkio_table_pricing',
                    isDinamic: true
                });
                var user = runtime.getCurrentUser().name;
                var date = new Date();
                var hourMexico = format.format({
                    value: date,
                    type: format.Type.DATETIME,
                    timezone: format.Timezone.AMERICA_MEXICO_CITY
                });

                var parseDate = format.parse({
                    value: hourMexico,
                    type: format.Type.DATETIME
                });
                guardarInfo.setValue({ fieldId: 'custrecord_tkio_date_pricing', value: parseDate });
                guardarInfo.setValue({ fieldId: 'custrecord_tkio_def_table_pricing', value: user });
                guardarInfo.setValue({ fieldId: 'custrecord_tkio_tipo_table_pricing', value: accion });
                guardarInfo.setValue({ fieldId: 'custrecord_tkio_desc_table_pricing', value: descripcion });

                guardarInfo.save();

            } catch (e) {
                log.error({ title: 'infoSystem: ', details: e });
            }
        }

        /**
         * @summary función que servirá para guardar la lista en un txt
         */
        function getDataForFile(idFile) {
            try {
                var fileObj = file.load({
                    id: idFile
                });
                var getArrayList = JSON.parse(fileObj.getContents());
                itemsList = [getArrayList.arrmxn, getArrayList.arrusd]
                log.audit({ title: 'Items For file: ', details: itemsList });
            } catch (error) {
                log.error({ title: 'Error getDataForFile: ', details: error });
            }
        }

        function creaPanel() {
            try {
                var clases = searchClass();
                var periodos = searchPeriodoContable();
                var form = serverWidget.createForm({ title: "Precios" });

                form.clientScriptModulePath = './tkio_pricing_cs.js';

                //=============================================Botones
                form.addButton({ id: "custpage_tkio_filtrar", label: "Filtrar", functionName: "filtrar" });
                form.addButton({ id: "custpage_tkio_incrementar", label: "Incrementar", functionName: "incrementar" });
                form.addButton({ id: "custpage_tkio_marcartodo", label: "Marcar todo", functionName: "markAll" });
                form.addButton({ id: "custpage_tkio_desmarcartodo", label: "Desmarcar todo", functionName: "dismarkAll" });

                //Campos
                var period = form.addField({ id: "custpage_tkio_periodocontable", type: serverWidget.FieldType.SELECT, label: "PERIODO CONTABLE" })
                var cambioUSD = form.addField({ id: "custpage_tkio_cambiopeso", type: serverWidget.FieldType.FLOAT, label: "TIPO DE CAMBIO PESO-DOLAR" })
                var classFilter = form.addField({ id: "custpage_tkio_clase", type: serverWidget.FieldType.SELECT, label: "CLASE" })

                classFilter.addSelectOption({ value: '', text: '' });
                for (var i = 0; i < clases.length; i++) {
                    classFilter.addSelectOption({ value: clases[i].value, text: clases[i].text });
                }
                var cambioMXN = form.addField({ id: "custpage_tkio_cambiodolar", type: serverWidget.FieldType.FLOAT, label: "TIPO DE CAMBIO DOLAR-PESO" })
                period.addSelectOption({ value: '', text: '' });
                for (var i = 0; i < periodos.length; i++) {
                    period.addSelectOption({ value: periodos[i].id, text: periodos[i].periodname });
                }

                if (params.periodo) { period.defaultValue = params.periodo; }
                if (params.clase) { classFilter.defaultValue = params.clase; }
                if (params.monedaMxn) { cambioMXN.defaultValue = params.monedaMxn; }
                if (params.monedaUsd) { cambioUSD.defaultValue = params.monedaUsd; }

                period.isMandatory = true;
                classFilter.isMandatory = true;
                cambioUSD.isMandatory = true;
                cambioMXN.isMandatory = true;

                //Creación de la tabla Precios MXN
                var sublistMXN = form.addSublist({ id: 'sublist_precios_mxn', type: serverWidget.SublistType.LIST, label: 'Precios MXN' });
                var idMXN = sublistMXN.addField({ id: 'sublist_valid_incrementar_mxn', type: serverWidget.FieldType.CHECKBOX, label: 'INCREMENTAR' });
                var id = sublistMXN.addField({ id: 'sublist_id_internal_item_mxn', type: serverWidget.FieldType.TEXT, label: 'Si ves esto, hola' });
                var itemMXN = sublistMXN.addField({ id: 'sublist_id_item_mxn', type: serverWidget.FieldType.TEXT, label: 'CODIGO ART' });
                var listPriceMXN = sublistMXN.addField({ id: 'sublist_list_price_mxn', type: serverWidget.FieldType.TEXT, label: 'PRECIO LISTA' });
                var listPriceMXNOr = sublistMXN.addField({ id: 'sublist_list_price_or_mxn', type: serverWidget.FieldType.TEXT, label: 'PRECIO LISTA ORIGINAL' });
                var piecesMXN = sublistMXN.addField({ id: 'sublist_pieces_mxn', type: serverWidget.FieldType.TEXT, label: 'VENTA PIEZAS' });
                var lastCostMXN = sublistMXN.addField({ id: 'sublist_last_cost_mxn', type: serverWidget.FieldType.TEXT, label: 'ULTIMO COSTO' });
                var salePriceMXN = sublistMXN.addField({ id: 'sublist_sale_price_mxn', type: serverWidget.FieldType.TEXT, label: 'PRECIO VENTA' });
                var averageCostMXN = sublistMXN.addField({ id: 'sublist_average_cost_mxn', type: serverWidget.FieldType.TEXT, label: 'COSTO PROMEDIO' });
                var margenTeoricoMXN = sublistMXN.addField({ id: 'sublist_theoretical_margin_mxn', type: serverWidget.FieldType.TEXT, label: 'MARGEN TEORICO' });
                var margenRealMXN = sublistMXN.addField({ id: 'sublist_real_margin_mxn', type: serverWidget.FieldType.TEXT, label: 'MARGEN REAL' });
                var margenMinimoMXN = sublistMXN.addField({ id: 'sublist_minimum_margin_mxn', type: serverWidget.FieldType.TEXT, label: 'MARGEN MINIMO' });
                var margenMaximoMXN = sublistMXN.addField({ id: 'sublist_maximum_margin_mxn', type: serverWidget.FieldType.TEXT, label: 'MARGEN MAXIMO' });
                var monedaMxn = sublistMXN.addField({ id: 'sublist_currency_mxn', type: serverWidget.FieldType.TEXT, label: 'MONEDA' });
                var incrementoSugeridoMXN = sublistMXN.addField({ id: 'sublist_suggested_increase_mxn', type: serverWidget.FieldType.TEXT, label: 'INCREMENTO SUGERIDO' });
                var incrementoSugeridoMXNOR = sublistMXN.addField({ id: 'sublist_suggested_increase_or_mxn', type: serverWidget.FieldType.TEXT, label: 'INCREMENTO SUGERIDO ORIGINAL' });

                id.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
                itemMXN.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                listPriceMXN.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                listPriceMXNOr.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
                piecesMXN.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                lastCostMXN.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                salePriceMXN.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                averageCostMXN.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                margenTeoricoMXN.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                margenRealMXN.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                margenMinimoMXN.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                margenMaximoMXN.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                monedaMxn.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
                incrementoSugeridoMXN.updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY });
                incrementoSugeridoMXNOR.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                //Creación de la tabla Precios USD
                var sublistUSD = form.addSublist({ id: 'sublist_precios_usd', type: serverWidget.SublistType.LIST, label: 'Precios USD' });
                var id = sublistUSD.addField({ id: 'sublist_id_internal_item_usd', type: serverWidget.FieldType.TEXT, label: 'Si ves esto, hola' });
                var idUSD = sublistUSD.addField({ id: 'sublist_valid_incrementar_usd', type: serverWidget.FieldType.CHECKBOX, label: 'INCREMENTAR' });
                var itemUSD = sublistUSD.addField({ id: 'sublist_id_item_usd', type: serverWidget.FieldType.TEXT, label: 'CODIGO ART' });
                var listPriceUSD = sublistUSD.addField({ id: 'sublist_list_price_usd', type: serverWidget.FieldType.TEXT, label: 'PRECIO LISTA' });
                var listPriceUSDOr = sublistUSD.addField({ id: 'sublist_list_price_or_usd', type: serverWidget.FieldType.TEXT, label: 'PRECIO LISTA ORIGINAL' });
                var piecesUSD = sublistUSD.addField({ id: 'sublist_pieces_usd', type: serverWidget.FieldType.TEXT, label: 'VENTA PIEZAS' });
                var lastCostUSD = sublistUSD.addField({ id: 'sublist_last_cost_usd', type: serverWidget.FieldType.TEXT, label: 'ULTIMO COSTO' });
                var salePriceUSD = sublistUSD.addField({ id: 'sublist_sale_price_usd', type: serverWidget.FieldType.TEXT, label: 'PRECIO VENTA' });
                var averageCostUSD = sublistUSD.addField({ id: 'sublist_average_cost_usd', type: serverWidget.FieldType.TEXT, label: 'COSTO PROMEDIO' });
                var margenTeoricoUSD = sublistUSD.addField({ id: 'sublist_theoretical_margin_usd', type: serverWidget.FieldType.TEXT, label: 'MARGEN TEORICO' });
                var margenRealUSD = sublistUSD.addField({ id: 'sublist_real_margin_usd', type: serverWidget.FieldType.TEXT, label: 'MARGEN REAL' });
                var margenMinimoUSD = sublistUSD.addField({ id: 'sublist_minimum_margin_usd', type: serverWidget.FieldType.TEXT, label: 'MARGEN MINIMO' });
                var margenMaximoUSD = sublistUSD.addField({ id: 'sublist_maximum_margin_usd', type: serverWidget.FieldType.TEXT, label: 'MARGEN MAXIMO' });
                var monedaUsd = sublistUSD.addField({ id: 'sublist_currency_usd', type: serverWidget.FieldType.TEXT, label: 'MONEDA' });
                var incrementoSugeridoUSD = sublistUSD.addField({ id: 'sublist_suggested_increase_usd', type: serverWidget.FieldType.TEXT, label: 'INCREMENTO SUGERIDO' });
                var incrementoSugeridoUSDOR = sublistUSD.addField({ id: 'sublist_suggested_increase_or_usd', type: serverWidget.FieldType.TEXT, label: 'INCREMENTO SUGERIDO ORIGINAL' });

                id.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
                itemUSD.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                listPriceUSD.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                listPriceUSDOr.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
                piecesUSD.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                lastCostUSD.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                salePriceUSD.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                averageCostUSD.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                margenTeoricoUSD.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                margenRealUSD.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                margenMinimoUSD.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                margenMaximoUSD.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
                monedaUsd.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
                incrementoSugeridoUSD.updateDisplayType({ displayType: serverWidget.FieldDisplayType.ENTRY });
                incrementoSugeridoUSDOR.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                //Modificamos la pagina
                return form;
            } catch (e) {
                log.error({ title: "error creaPanel", details: e });
            }
        }
        function searchClass() {
            try {
                var arrClassAux = []
                var classificationSearchObj = search.create({
                    type: "classification",
                    filters: [],
                    columns:
                        [
                            search.createColumn({ name: "name", sort: search.Sort.ASC, label: "Nombre" }),
                            search.createColumn({ name: "custrecord_tkio_max_margen", label: "Margen Máximo" }),
                            search.createColumn({ name: "custrecord_tkio_min_margen", label: "Margen Minimo" })
                        ]
                });
                var searchResult = classificationSearchObj.runPaged().count;
                classificationSearchObj.run().each(function (result) {
                    var id = result.id;
                    var name = result.getValue({ name: "name" });
                    var margenMax = parseFloat(result.getValue({ name: "custrecord_tkio_max_margen" })) || 0;
                    var margenMin = parseFloat(result.getValue({ name: "custrecord_tkio_min_margen" })) || 0;
                    arrClassAux.push({
                        text: name,
                        value: id,
                        margenMax: margenMax,
                        margenMin: margenMin,
                    })
                    return true;
                });
                return arrClassAux;
            } catch (e) {
                log.audit({ title: 'searchClassError', details: e });
                return [];
            }
        }
        function searchPeriodoContable() {
            try {
                let arrPeriodoAux = [];
                var accountingperiodSearchObj = search.create({
                    type: "accountingperiod",
                    filters:
                        [
                            ["closed", "is", "F"],
                            "AND",
                            ["isquarter", "is", "F"],
                            "AND",
                            ["isadjust", "is", "F"],
                            "AND",
                            ["isyear", "is", "F"]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "periodname", label: "Nombre" }),
                            search.createColumn({ name: "isinactive", label: "Inactivo" })
                        ]
                });
                accountingperiodSearchObj.run().each(function (result) {
                    var id = result.id;
                    var periodname = result.getValue({ name: "periodname" });
                    arrPeriodoAux.push({
                        id: id,
                        periodname: periodname
                    });
                    return true;
                });
                return arrPeriodoAux;
            } catch (e) {
                log.error({ title: 'Error', details: Error });
                return [];
            }
        }
        /**
         * 
         * @param {*} clase
         * Función para traer todos loa articulos de ensamblaje, 
         * de acuerdo al filtro de la clase 
         */
        function searchItemsEnsamble(clase, periodo, monedaMxn, monedaUsd) {
            try {
                var arrItemsAux = []; // arreglo de articulos de ensamblaje completado
                let idListMaterials = []; //id de la lista de materiales de cada articulo de ensamblaje
                let idItemsEnsamblaje = [];
                var assemblyitemSearchObj = search.create({
                    type: "assemblyitem",
                    filters:
                        [
                            ["type", "anyof", "Assembly"],
                            "AND",
                            ["class", "anyof", clase]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "itemid", summary: "GROUP", sort: search.Sort.ASC, label: "Nombre" }),
                            search.createColumn({ name: "displayname", summary: "GROUP", label: "Nombre para mostrar" }),
                            search.createColumn({ name: "salesdescription", summary: "GROUP", label: "Descripción" }),
                            // search.createColumn({ name: "baseprice", summary: "AVG", label: "Precio base" }),
                            search.createColumn({ name: "unitprice", join: "pricing", summary: "MAX", label: "Unit Price" }),
                            search.createColumn({ name: "custitem_tkio_max_margen_art", summary: "AVG", label: "Margen Máximo" }),
                            search.createColumn({ name: "custitem_tkio_min_margen_art", summary: "AVG", label: "Margen Minimo" }),
                            search.createColumn({ name: "class", summary: "GROUP", label: "Clase" }),
                            search.createColumn({ name: "averagecost", summary: "AVG", label: "Costo promedio" }),
                            search.createColumn({ name: "billofmaterialsid", join: "assemblyItemBillOfMaterials", summary: "GROUP", label: "Identificación de la lista de materiales" }),
                            search.createColumn({ name: "internalid", summary: "GROUP", label: "ID interno" }),
                            search.createColumn({ name: "currency", join: "pricing", summary: "GROUP", label: "Moneda" })
                        ]
                });
                var searchResultCount = assemblyitemSearchObj.runPaged().count;
                log.debug("assemblyitemSearchObj result count", searchResultCount);
                assemblyitemSearchObj.run().each(function (result) {
                    log.audit({ title: 'currencyItem', details: result });
                    // var id = result.id;
                    var id = result.getValue({ name: "internalid", summary: "GROUP" });
                    arrID += id + ','
                    var itemCode = result.getValue({ name: "itemid", summary: "GROUP" });
                    var idMaterialList = result.getValue({ name: "billofmaterialsid", join: "assemblyItemBillOfMaterials", summary: "GROUP" });
                    // var listPrice = parseFloat(result.getValue({ name: "baseprice", summary: "AVG" })) || 1;
                    var currencyItem = result.getValue({ name: "currency", join: "pricing", summary: "GROUP" });
                    var listPrice = 0.0;
                    if (currencyItem === "1") {
                        listPrice = parseFloat(result.getValue({ name: "unitprice", join: "pricing", summary: "MAX" })) || 1;
                    }
                    if (currencyItem === "2") {
                        listPrice = parseFloat(result.getValue({ name: "unitprice", join: "pricing", summary: "MAX" })) * monedaMxn || 1;
                    }
                    var min_margin = parseFloat(result.getValue({ name: "custitem_tkio_min_margen_art", summary: "AVG" }).replace('%', '')) || 0;
                    var max_margin = parseFloat(result.getValue({ name: "custitem_tkio_max_margen_art", summary: "AVG" }).replace('%', '')) || 0;
                    var averageCost = parseFloat(result.getValue({ name: "averagecost", summary: "AVG" })) || 0;
                    idItemsEnsamblaje.push(id);
                    idListMaterials.push(idMaterialList);
                    arrItemsAux.push({
                        id: id,
                        itemCode: itemCode,
                        listPrice: Number(listPrice.toFixed(3)),
                        listPriceOr: Number(listPrice.toFixed(3)),
                        pieces: 0,
                        lastCost: 0,
                        saleCost: 0,
                        currencyItem: currencyItem,
                        averageCost: averageCost,
                        min_margin: min_margin,
                        max_margin: max_margin,
                        clase: clase,
                        periodo: periodo,
                        monedaMxn: monedaMxn,
                        monedaUsd: monedaUsd,
                        real_margin: 0,
                        theoretical_margin: 0,
                        inc_suggest: 0,
                        amount: 0,
                        idMaterialList: idMaterialList,
                        materialList: [],
                    });
                    return true;
                });

                //Se obtiene la lista de manterial, lista de revision y con cada uno de los componentes que este tiene
                //en el articulo de encamblaje mediante el id de la lista de material
                let revision = getListRevision(idListMaterials);
                arrItemsAux.map(item => {
                    revision.forEach(rev => {
                        if (item.idMaterialList === rev.idMaterialList) {
                            item.materialList.push(rev);
                            item.averageCost = rev.averageCostListRev;
                        }
                    })
                });

                let datosSO = getDataSO(idItemsEnsamblaje);

                log.audit({ title: 'Articulo ensamblaje con lista de componentes', details: arrItemsAux });
                arrItemsAux.map(item => {
                    var ultimoCosto = 0.0;
                    var unitCostItem = 0.0;
                    item.materialList.forEach(rev => {
                        rev.listaMateriales.forEach(idItem => {
                            ultimoCosto += parseFloat(idItem.cost);
                            unitCostItem += idItem.listPrice * parseFloat(idItem.cantidad);
                            log.audit({ title: 'unitCostItem', details: unitCostItem });
                        });
                    });
                    datosSO.forEach(datos => {
                        if (item.id === datos.id) {
                            item.amount = datos.amount;
                            item.pieces = datos.quantity;
                            item.saleCost = Number(((datos.saleCost)).toFixed());
                            item.real_margin = (datos.saleCost - item.averageCost) / datos.saleCost;
                        }
                    })
                    log.audit({ title: 'Ultimo costo', details: { ultimoCosto: ultimoCosto, unitCostItem: unitCostItem } });
                    item.lastCost = Number(((ultimoCosto + unitCostItem)).toFixed(3));
                    item.theoretical_margin = Number((((item.listPrice - item.lastCost) / item.listPrice)).toFixed(3));
                    item.inc_suggest = item.theoretical_margin - item.max_margin
                });
                log.audit({ title: 'Articulo ensamblaje completo', details: arrItemsAux });
                return arrItemsAux;
            } catch (error) {
                log.error({ title: 'searchItemsEnsamble', details: error });
                return [];
            }
        }
        function getDataSO(idItemsEnsamblaje) {
            try {
                let itemsData = [];
                var salesorderSearchObj = search.create({
                    type: "salesorder",
                    filters:
                        [
                            ["type", "anyof", "SalesOrd"],
                            "AND",
                            ["item", "anyof", idItemsEnsamblaje]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "quantity", summary: "SUM", label: "Cantidad" }),
                            search.createColumn({ name: "amount", summary: "SUM", label: "Importe" }),
                            search.createColumn({ name: "internalid", join: "item", summary: "GROUP", label: "ID interno" })
                        ]
                });
                salesorderSearchObj.run().each(function (result) {
                    var id = result.getValue({ name: "internalid", join: "item", summary: "GROUP" });
                    var quantity = parseInt(result.getValue({ name: "quantity", summary: "SUM" }));
                    var amount = parseFloat(result.getValue({ name: "amount", summary: "SUM" }));
                    var saleCost = amount / quantity;
                    itemsData.push({
                        id: id,
                        quantity: quantity,
                        amount: amount,
                        saleCost: saleCost
                    })
                    return true;
                });
                return itemsData;
            } catch (error) {
                log.audit({ title: 'getDataSO', details: error });
                return [];
            }
        }
        /**
         * 
         * @param {*} idMaterials
         * Función para traer el id de las revisiones de cada artículo de ensamblaje 
         */
        function getListRevision(idMaterials) {
            try {
                let arrListRev = [];//la lista de revisiones de cada lista de materiales
                let idRevs = [];//la lista auxiliar de id de las revisiones
                var bomSearchObj = search.create({
                    type: "bom",
                    filters:
                        [
                            ["internalid", "anyof", idMaterials]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "name", label: "Nombre" }),
                            search.createColumn({ name: "internalid", join: "revision", label: "ID interno" }),
                            search.createColumn({ name: "billofmaterials", join: "revision", label: "Lista de materiales" }),
                            search.createColumn({ name: "name", join: "revision", label: "Nombre" })
                        ]
                });

                bomSearchObj.run().each(function (result) {
                    var idRevision = result.getValue({ name: "internalid", join: "revision" });
                    var idMaterialList = result.id;
                    idRevs.push(idRevision);
                    arrListRev.push({
                        idRevision: idRevision,
                        averageCostListRev: 0,
                        idMaterialList: idMaterialList,//para relacionar la lista de revision con sus respectivos articulos de ensamblaje
                        listaMateriales: []//lista de los componentes de las revisiones
                    });
                    return true;
                });

                let dataGetListComponent = getListComponents(idRevs);
                let listaMateriales = dataGetListComponent[1];
                let averageCostListRev = dataGetListComponent[0];
                //Relación entre la lista de materiales y la lista de revisión
                arrListRev.map(listaRevision => {
                    listaMateriales.forEach(listMaterial => {
                        if (listaRevision.idRevision === listMaterial.id) {
                            listaRevision.listaMateriales.push(listMaterial);
                            listaRevision.averageCostListRev = averageCostListRev;
                        }
                    })
                })
                log.audit({ title: 'Lista de revisiones', details: arrListRev });
                return arrListRev;
            } catch (error) {
                log.error({ title: 'getListRevision', details: error });
                return [];
            }
        }
        /**
         * 
         * @param {*} arrListRev
         * Función para traer el artículo de inventariable de cada lista de revision 
         */
        function getListComponents(idRev) {
            try {
                let arrListComponents = [];
                var averageCostListRev = 0;
                var idItemArt = [];
                var bomrevisionSearchObj = search.create({
                    type: "bomrevision",
                    filters:
                        [
                            ["internalid", "anyof", idRev]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "billofmaterials", label: "Lista de materiales" }),
                            search.createColumn({ name: "name", label: "Nombre" }),
                            search.createColumn({ name: "item", join: "component", label: "Artículo" }),
                            search.createColumn({ name: "quantity", join: "component", label: "Cantidad" })
                        ]
                });
                bomrevisionSearchObj.run().each(function (result) {
                    var id = result.id;
                    var idItemComponent = result.getValue({ name: "item", join: "component" });
                    var cantidad = result.getValue({ name: "quantity", join: "component" });
                    let dataItem = search.lookupFields({ type: search.Type.ITEM, id: idItemComponent, columns: ['baseprice', 'vendorpricecurrency', 'type', 'averagecost'] })
                    var listPrice = dataItem.baseprice;
                    var vendorpricecurrency = dataItem.vendorpricecurrency;
                    var averageCost = parseFloat(dataItem.averagecost) || 0;
                    if (dataItem.type[0].value.toUpperCase() === "INVTPART") {
                        idItemArt.push(idItemComponent);
                    }
                    arrListComponents.push({
                        id: id,
                        idItemComponent: idItemComponent,
                        cantidad: cantidad,
                        listPrice: listPrice,
                        averageCost: averageCost,
                        cost: 0,
                        vendorpricecurrency: vendorpricecurrency,
                        type: dataItem.type[0].value
                    });
                    return true;
                });

                //Se obtiene el costo promedio calculado de cada articulo de inventario, 
                //mediante una busqueda de un ajuste de inventario 
                var dataAI = getDataAI(idItemArt);
                // log.audit({title: 'dataAI', details: dataAI});
                arrListComponents.map(itemMod => {
                    dataAI.forEach(dataItem => {
                        if (itemMod.idItemComponent === dataItem.id) {
                            itemMod.averageCost = dataItem.averageCost;
                            averageCostListRev += dataItem.averageCost;
                        }
                    })
                })

                //Se obtiene el gasto de cada articulo de inventario, 
                //mediante una busqueda de las ordenes de compra 
                var dataPO = getDataPO(idItemArt, arrListComponents);
                log.audit({ title: 'dataPO', details: dataPO });
                return [averageCostListRev, arrListComponents];
            } catch (error) {
                log.error({ title: 'getListComponents', details: error });
                return [];
            }
        }
        /**
        * 
        * @param {*} idItemArt
        * Función para traer los promedios por articulo inventariable 
        */
        function getDataAI(idItemArt) {
            try {
                var arrAjustInventory = [];
                var date = new Date()
                date = date.setMonth(date.getMonth() - 12)
                var fechaArreglo = moment(date).locale('es-mx').format('DD/MM/YYYY').split('/');
                var fechaInicio = "1/1/" + fechaArreglo[2];
                var fechaFin = "12/31/" + fechaArreglo[2];
                var inventoryadjustmentSearchObj = search.create({
                    type: "inventoryadjustment",
                    filters:
                        [
                            ["type", "anyof", "InvAdjst"],
                            "AND",
                            ["item", "anyof", idItemArt],
                            "AND",
                            ["trandate", "within", fechaInicio, fechaFin]
                        ],
                    columns:
                        [
                            // search.createColumn({ name: "itemid", join: "item", summary: "GROUP", label: "Name" }),
                            search.createColumn({ name: "internalid", join: "item", summary: "GROUP", label: "ID interno" }),
                            search.createColumn({ name: "amount", summary: "SUM", label: "Amount" }),
                            search.createColumn({ name: "quantity", summary: "SUM", label: "Quantity" })
                        ]
                });
                inventoryadjustmentSearchObj.run().each(function (result) {
                    var id = result.getValue({ name: "internalid", join: "item", summary: "GROUP" });
                    var amount = result.getValue({ name: "amount", summary: "SUM" });
                    var quantity = result.getValue({ name: "quantity", summary: "SUM" });
                    var averageCost = amount / quantity;
                    arrAjustInventory.push({
                        id: id,
                        averageCost: averageCost
                    })
                    return true;
                });
                return arrAjustInventory;
            } catch (error) {
                log.error({ title: 'getDataAI', details: error });
                return [];
            }
        }
        /**
        * 
        * @param {*} idItemArt
        * Función para traer los gastos por articulo inventariable 
        */
        function getDataPO(idItemArt, arrListComponents) {
            try {
                let dataPOforItem = [];
                let idOpList = [];
                var date = new Date()
                date = date.setMonth(date.getMonth() - 12)
                var fechaArreglo = moment(date).locale('es-mx').format('DD/MM/YYYY').split('/');
                var fechaInicio = "1/1/" + fechaArreglo[2];
                var fechaFin = "12/31/" + fechaArreglo[2];
                log.audit({
                    title: "Fecha: ",
                    details: fechaArreglo
                })
                var purchaseorderSearchObj = search.create({
                    type: "purchaseorder",
                    filters:
                        [
                            ["type", "anyof", "PurchOrd"],
                            "AND",
                            ["mainline", "is", "F"],
                            "AND",
                            ["anylineitem", "anyof", idItemArt],
                            "AND",
                            ["shipping", "is", "F"],
                            "AND",
                            ["taxline", "is", "F"],
                            "AND",
                            ["cogs", "is", "F"],
                            "AND",
                            ["purchaseorder.status", "noneof", "PurchCon:R"],
                            "AND",
                            ["trandate", "within", fechaInicio, fechaFin]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "formulanumeric", formula: "{amount}+ABS({taxamount})", label: "Fórmula (numérica)" }),
                            search.createColumn({ name: "item", label: "Artículo" }),
                            search.createColumn({ name: "internalid", label: "ID interno" }),
                            search.createColumn({ name: "currency", label: "Currency" })
                        ]
                });
                var idOp = "i";
                purchaseorderSearchObj.run().each(function (result) {
                    var id = result.id;
                    var idItem = result.getValue({ name: "item" });
                    var gasto = result.getValue({ name: "formulanumeric", formula: "{amount}+ABS({taxamount})" });
                    var currency = result.getValue({ name: "currency" });
                    if (idOp === "i") {
                        idOp = id;
                        idOpList.push({
                            id: idOp,
                            listItemsCost: []
                        });
                        // log.audit({title: 'getDATAPO result', details: idOp });
                    }
                    if (idOp !== id) {
                        idOp = id;
                        idOpList.push({
                            id: idOp,
                            gasto: 0,
                            listItemsCost: []
                        });
                        // log.audit({title: 'getDATAPO result', details: idOp });
                    }
                    dataPOforItem.push({
                        id: id,
                        idItem: idItem,
                        gasto: gasto,
                        currency: currency
                    })
                    return true;
                });
                log.audit({ title: 'idOpList', details: idOpList });
                log.audit({ title: 'dataPOforItem', details: dataPOforItem });
                //idOpList  -> Servira para rellenar de ordenes de venta con cada uno de sus gastos incluyendo el del articulo inventariable a buscar

                //Se agrupa por orden de compra para hacer un filtro por articulo
                idOpList.map(op => {
                    dataPOforItem.forEach(itemsPO => {
                        if (op.id === itemsPO.id) {
                            for (var i = 0; i < idItemArt.length; i++) {
                                if (idItemArt[i] === itemsPO.idItem || itemsPO.idItem === '') {
                                    var gasto = 0.0;
                                    if (itemsPO.currency === 'USD') {
                                        gasto = parseFloat(param.monedaMxn) * parseFloat(itemsPO.gasto);
                                    }
                                    else if (itemsPO.currency === 'MXN') {
                                        gasto = parseFloat(itemsPO.gasto);
                                    }
                                    op.listItemsCost.push({
                                        id: itemsPO.idItem || '',
                                        gasto: itemsPO.gasto || ''
                                    });
                                    break;
                                }
                            }
                        }
                    });
                });

                arrListComponents.map(item => {
                    var costItem = 0.0;
                    log.audit({ title: 'item', details: item });
                    idOpList.forEach(po => {
                        var costItemPO = 0.0;
                        var bandera = false;
                        po.listItemsCost.forEach(cost => {
                            if (cost.id === '') {
                                costItemPO += parseFloat(cost.gasto);
                                // log.audit({title: 'costItemPO', details: {id:cost.id, costo:costItemPO}});
                            }
                            if (cost.id === item.idItemComponent) {
                                bandera = true;
                            }
                        });
                        // log.audit({title: 'costItem', details: costItem});
                        if (bandera) {
                            costItem += costItemPO;
                        }
                    });
                    item.cost = costItem;
                });
                // log.audit({title: 'arrListComponents', details: arrListComponents});
                // log.audit({ title: 'idOpList', details: idOpList });
                return dataPOforItem;
            } catch (error) {
                log.error({ title: 'getDataPO', details: error });
                return [];
            }
        }
        /**
         * 
         * @param {params} param
         * @returns arrItemsMXNAux, arrItemsUSDAux
         * funcion para buscar, agrupar y calcular los datos para los campos de la tabla.
         */
        function searchItems(params) {
            try {
                var periodoBuscar = params.periodo;
                var claseBuscar = params.clase;
                var cambioMXN = parseFloat(params.monedaMxn);
                var cambioUSD = parseFloat(params.monedaUsd);
                var arrItemsMx = [];
                // log.audit({ title: 'claseBuscar', details: claseBuscar });
                var arrItemsMXNAux = searchItemsEnsamble(claseBuscar, periodoBuscar, cambioMXN, cambioUSD);
                log.audit({ title: 'itemsEnsamblaje', details: arrItemsMXNAux });
                var arrItemsUSDAux = [];
                arrItemsMXNAux.forEach(idItem => {
                    if(parseInt(idItem.pieces) !== 0){
                        if (idItem.currencyItem === "1") {
                            arrItemsUSDAux.push({
                                id: idItem.id,
                                itemCode: idItem.itemCode,
                                listPrice: Number((idItem.listPrice / parseFloat(params.monedaUsd)).toFixed(3)),
                                listPriceOr: Number((idItem.listPrice / parseFloat(params.monedaUsd)).toFixed(3)),
                                pieces: idItem.pieces,
                                lastCost: Number((idItem.lastCost / parseFloat(params.monedaUsd)).toFixed(3)),
                                saleCost: Number((idItem.saleCost / parseFloat(params.monedaUsd)).toFixed(3)),
                                currencyItem: idItem.currencyItem,
                                averageCost: Number((idItem.averageCost / parseFloat(params.monedaUsd)).toFixed(3)),
                                min_margin: idItem.min_margin,
                                max_margin: idItem.max_margin,
                                real_margin: idItem.real_margin,
                                theoretical_margin: idItem.theoretical_margin,
                                inc_suggest: idItem.inc_suggest
                            })
                        }
                        if (idItem.currencyItem == "2") {
                            arrItemsUSDAux.push({
                                id: idItem.id,
                                itemCode: idItem.itemCode,
                                listPrice: Number((idItem.listPrice / parseFloat(params.monedaMxn)).toFixed(3)),
                                listPriceOr: Number((idItem.listPrice / parseFloat(params.monedaMxn)).toFixed(3)),
                                pieces: idItem.pieces,
                                lastCost: Number((idItem.lastCost / parseFloat(params.monedaMxn)).toFixed(3)),
                                saleCost: Number((idItem.saleCost / parseFloat(params.monedaMxn)).toFixed(3)),
                                currencyItem: idItem.currencyItem,
                                averageCost: Number((idItem.averageCost / parseFloat(params.monedaMxn)).toFixed(3)),
                                min_margin: idItem.min_margin,
                                max_margin: idItem.max_margin,
                                real_margin: idItem.real_margin,
                                theoretical_margin: idItem.theoretical_margin,
                                inc_suggest: idItem.inc_suggest
                            })
                        }
                        arrItemsMx.push({
                            id: idItem.id,
                            itemCode: idItem.itemCode,
                            listPrice: Number((idItem.listPrice)),
                            listPriceOr: Number((idItem.listPrice)),
                            pieces: idItem.pieces,
                            lastCost: Number((idItem.lastCost)),
                            saleCost: Number((idItem.saleCost)),
                            currencyItem: idItem.currencyItem,
                            averageCost: Number((idItem.averageCost)),
                            min_margin: idItem.min_margin,
                            max_margin: idItem.max_margin,
                            real_margin: idItem.real_margin,
                            theoretical_margin: idItem.theoretical_margin,
                            inc_suggest: idItem.inc_suggest
                        })
                    }
                })

                itemsFiltrar = [arrItemsMx, arrItemsUSDAux];
                return [arrItemsMx, arrItemsUSDAux];

            } catch (e) {
                log.error({ title: 'Error SearchItems: ', details: e });
                return [];
            }
        }
        function addItemsList(form, itemsListMXN, itemsListUSD) {
            try {
                // log.audit({ title: 'itemsListMXN', details: itemsListMXN });
                var sublist = form.getSublist({ id: 'sublist_precios_mxn' });
                for (var j = 0; j < itemsListMXN.length; j++) {
                    log.audit({ title: 'itemsList id:', details: itemsListMXN[j].id });
                    log.audit({ title: 'itemsList:', details: itemsListMXN[j] });
                    if (itemsListMXN[j].check) {
                        sublist.setSublistValue({ id: 'sublist_valid_incrementar_mxn', line: j, value: "T" });
                    }
                    sublist.setSublistValue({ id: 'sublist_id_internal_item_mxn', line: j, value: itemsListMXN[j].id });
                    sublist.setSublistValue({ id: 'sublist_id_item_mxn', line: j, value: itemsListMXN[j].itemCode });
                    sublist.setSublistValue({ id: 'sublist_list_price_mxn', line: j, value: itemsListMXN[j].listPrice });
                    sublist.setSublistValue({ id: 'sublist_list_price_or_mxn', line: j, value: itemsListMXN[j].listPriceOr });
                    sublist.setSublistValue({ id: 'sublist_pieces_mxn', line: j, value: itemsListMXN[j].pieces });
                    sublist.setSublistValue({ id: 'sublist_last_cost_mxn', line: j, value: itemsListMXN[j].lastCost });
                    sublist.setSublistValue({ id: 'sublist_sale_price_mxn', line: j, value: itemsListMXN[j].saleCost });
                    sublist.setSublistValue({ id: 'sublist_average_cost_mxn', line: j, value: itemsListMXN[j].averageCost });
                    sublist.setSublistValue({ id: 'sublist_minimum_margin_mxn', line: j, value: itemsListMXN[j].min_margin });
                    sublist.setSublistValue({ id: 'sublist_maximum_margin_mxn', line: j, value: itemsListMXN[j].max_margin });
                    sublist.setSublistValue({ id: 'sublist_real_margin_mxn', line: j, value: itemsListMXN[j].real_margin });
                    sublist.setSublistValue({ id: 'sublist_theoretical_margin_mxn', line: j, value: itemsListMXN[j].theoretical_margin });
                    sublist.setSublistValue({ id: 'sublist_suggested_increase_mxn', line: j, value: itemsListMXN[j].inc_suggest });
                    sublist.setSublistValue({ id: 'sublist_suggested_increase_or_mxn', line: j, value: itemsListMXN[j].inc_suggest });
                    sublist.setSublistValue({ id: 'sublist_currency_mxn', line: j, value: itemsListMXN[j].currencyItem });
                }
                var sublist2 = form.getSublist({ id: 'sublist_precios_usd' });
                log.debug({ title: 'itemListUSD.length', details: itemsListUSD.length });
                for (var j = 0; j < itemsListUSD.length; j++) {
                    log.audit({ title: 'itemsList id:', details: itemsListUSD[j].id });
                    log.audit({ title: 'itemsList USD:', details: itemsListUSD[j] });
                    if (itemsListUSD[j].check) {
                        sublist2.setSublistValue({ id: 'sublist_valid_incrementar_usd', line: j, value: "T" });
                    }
                    sublist2.setSublistValue({ id: 'sublist_id_internal_item_usd', line: j, value: itemsListUSD[j].id });
                    sublist2.setSublistValue({ id: 'sublist_id_item_usd', line: j, value: itemsListUSD[j].itemCode });
                    sublist2.setSublistValue({ id: 'sublist_list_price_usd', line: j, value: itemsListUSD[j].listPrice });
                    sublist2.setSublistValue({ id: 'sublist_list_price_or_usd', line: j, value: itemsListUSD[j].listPriceOr });
                    sublist2.setSublistValue({ id: 'sublist_pieces_usd', line: j, value: itemsListUSD[j].pieces });
                    sublist2.setSublistValue({ id: 'sublist_last_cost_usd', line: j, value: itemsListUSD[j].lastCost });
                    sublist2.setSublistValue({ id: 'sublist_sale_price_usd', line: j, value: itemsListUSD[j].saleCost });
                    sublist2.setSublistValue({ id: 'sublist_average_cost_usd', line: j, value: itemsListUSD[j].averageCost });
                    sublist2.setSublistValue({ id: 'sublist_minimum_margin_usd', line: j, value: itemsListUSD[j].min_margin });
                    sublist2.setSublistValue({ id: 'sublist_maximum_margin_usd', line: j, value: itemsListUSD[j].max_margin });
                    sublist2.setSublistValue({ id: 'sublist_real_margin_usd', line: j, value: itemsListUSD[j].real_margin });
                    sublist2.setSublistValue({ id: 'sublist_theoretical_margin_usd', line: j, value: itemsListUSD[j].theoretical_margin });
                    sublist2.setSublistValue({ id: 'sublist_suggested_increase_usd', line: j, value: itemsListUSD[j].inc_suggest });
                    sublist2.setSublistValue({ id: 'sublist_suggested_increase_or_usd', line: j, value: itemsListUSD[j].inc_suggest });
                    sublist2.setSublistValue({ id: 'sublist_currency_usd', line: j, value: itemsListUSD[j].currencyItem });
                }
            } catch (e) {
                log.error({ title: 'Error addItemList', details: e });
            }
        }

        function markAll(form, itemsListMXN, itemsListUSD, act) {
            var sublistMxn = form.getSublist({ id: 'sublist_precios_mxn' });
            log.debug({ title: 'sublistMxn', details: itemsListMXN });
            for (var i = 0; i < itemsListMXN.length; i++) {
                sublistMxn.setSublistValue({ id: 'sublist_valid_incrementar_mxn', line: i, value: act });
            }
            var sublistUsd = form.getSublist({ id: 'sublist_precios_usd' });
            log.debug({ title: 'sublistUSD', details: itemsListUSD });
            for (var i = 0; i < itemsListUSD.length; i++) {
                sublistUsd.setSublistValue({ id: 'sublist_valid_incrementar_usd', line: i, value: act });
            }
        }
        function errForm(details) {
            try {

                var form = serverWidget.createForm({
                    title: "Formulario de captura"
                });
                var htmlfld = form.addField({
                    id: "custpage_msg_error",
                    label: " ",
                    type: serverWidget.FieldType.INLINEHTML
                });
                htmlfld.defaultValue = '<b>HA OCURRIDO UN ERROR; CONTACTE A SUS ADMINISTRADORES.</b>' +
                    '<br>Detaller:</br>' + JSON.stringify(details);
                return form;
            } catch (e) {
                log.error({ title: "error onRequest", details: e });
            }
        }
        return { onRequest }

    });
